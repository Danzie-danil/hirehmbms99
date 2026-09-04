import { supabase } from '../supabase.js';
import { showToast, showLoader, hideLoader } from '../utils.js';
import { promptStepUpReauth } from './stepUpModal.js';
import { renderAdminSubnav } from './dashboard.js';
import { showLocalPushNotification, requestPushPermissionAndSubscribe, getPushPermissionStatus } from '../pushNotifications.js';

let broadcastsList = [];
let bannersList = [];
let popupsList = [];
let adminProfiles = [];
let adminDrafts = [];
let pushNotificationsList = [];
let pushTemplatesList = [];
let currentPushDraft = null;
let pushAutosaveTimeout = null;
let pushOverview = {
    total_devices: 0,
    owner_devices: 0,
    branch_devices: 0,
    sysadmin_devices: 0,
    total_broadcasts: 0,
    total_delivered: 0
};
let activeCommTab = 'push';
let newsletterAutosaveTimeout = null;
let adminCronSettings = {
    branch_shift_open: true,
    branch_tasks_check: true,
    branch_midday_restock: true,
    branch_shift_close: true,
    branch_daily_report: true,
    unclosed_shift_check: true,
    owner_morning: true,
    owner_credit_followup: true,
    owner_midday: true,
    owner_transfers_check: true,
    owner_evening: true,
    low_stock_sentinel: true
};

window.switchAdminCommTab = function(tab) {
    activeCommTab = tab;
    renderAdminCommunications(tab);
};

export async function renderAdminCommunications(subTab = activeCommTab) {
    activeCommTab = subTab;
    const container = document.getElementById('mainContent');
    if (!container) return;

    showLoader('Loading Communications Hub...');
    await loadCommunicationsData();
    hideLoader();

    const subnavHtml = renderAdminSubnav(subTab, [
        { id: 'push', label: 'Push Notifications', icon: 'bell', badge: pushOverview.total_devices ? `${pushOverview.total_devices} devices` : null },
        { id: 'crons', label: 'Scheduled Crons', icon: 'clock', badge: `${Object.values(adminCronSettings).filter(v => v !== false).length} Active` },
        { id: 'newsletters', label: 'Broadcasts & Campaigns', icon: 'send', badge: adminDrafts.length ? `${adminDrafts.length} drafts` : null },
        { id: 'broadcasts', label: 'In-App History & Alerts', icon: 'radio', badge: broadcastsList.length },
        { id: 'subscribers', label: 'Subscriber List', icon: 'users', badge: adminProfiles.filter(p => p.newsletter_subscribed !== false).length },
        { id: 'logs', label: 'Delivery Receipts', icon: 'scroll-text' }
    ], 'window.switchAdminCommTab');

    let tabContentHtml = '';

    if (subTab === 'push') {
        tabContentHtml = renderPushNotificationsTab();
    } else if (subTab === 'crons') {
        tabContentHtml = renderScheduledCronsTab();
    } else if (subTab === 'newsletters') {
        tabContentHtml = renderNewslettersTab();
    } else if (subTab === 'broadcasts') {
        tabContentHtml = renderBroadcastsTab();
    } else if (subTab === 'subscribers') {
        tabContentHtml = renderSubscribersTab();
    } else if (subTab === 'logs') {
        tabContentHtml = renderLogsTab();
    }

    container.innerHTML = `
    <div class="space-y-3 sm:space-y-5 slide-in w-full pb-4">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 border-b border-gray-100 dark:border-gray-800 pb-2 sm:pb-3.5">
            <div>
                <h1 class="text-lg sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2 sm:gap-2.5">
                    <span class="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm sm:text-base shrink-0">
                        <i data-lucide="bell" class="w-4 h-4"></i>
                    </span>
                    Communications & Marketing
                </h1>
                <p class="hidden sm:block text-[10px] sm:text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-0.5">Server-Powered Multi-Channel Messaging & Push Broadcast Engine</p>
            </div>
            <div class="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <button onclick="loadCommunicationsData().then(() => renderAdminCommunications(activeCommTab))" class="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 text-gray-700 dark:text-gray-300 flex items-center gap-1.5 cursor-pointer">
                    <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Refresh
                </button>
                <button onclick="window.switchAdminCommTab('push')" class="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                    <i data-lucide="send" class="w-3.5 h-3.5"></i> Push Notification
                </button>
            </div>
        </div>
        <!-- Subnav Tabs -->
        ${subnavHtml}

        <!-- Tab Content View -->
        ${tabContentHtml}
    </div>
    `;

    if (window.lucide) lucide.createIcons();
    if (subTab === 'push') {
        window.onPushComposerInput();
    } else if (subTab === 'newsletters') {
        updateEstimatedRecipients();
        const targetSelect = document.getElementById('bTargetSelect');
        if (targetSelect) targetSelect.onchange = updateEstimatedRecipients;
    }
}

function renderPushNotificationsTab() {
    const permStatus = getPushPermissionStatus();
    const draft = currentPushDraft || {};
    const initialTitle = draft.title || '';
    const initialBody = draft.body || '';
    const initialAudience = draft.target_audience || 'all';
    const initialUrl = draft.target_url || '/app/#view=overview';
    
    // Sanitize image URL to prevent browser autofilled emails from appearing
    let initialImg = draft.image_url || '';
    if (initialImg && (initialImg.includes('@') || (!initialImg.startsWith('http://') && !initialImg.startsWith('https://') && !initialImg.startsWith('/')))) {
        initialImg = '';
    }

    // Generate template options from Supabase
    const templateOptionsHtml = pushTemplatesList.length > 0
        ? pushTemplatesList.map(t => `<option value="${t.id}">${escapeHtml(t.template_name || t.title)}</option>`).join('')
        : `
            <option value="maintenance">Scheduled System Maintenance</option>
            <option value="security">Security & Account Protection</option>
            <option value="sales">Daily Revenue Milestone</option>
            <option value="inventory">Stock Reconciliation & Audit</option>
            <option value="announcement">New Feature Release</option>
            <option value="billing">Subscription & Tier Notice</option>
        `;

    return `
    <div class="space-y-6">
        <!-- Metric Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div class="bg-white dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs border border-gray-100 dark:border-gray-700/60 flex items-center gap-4 sm:gap-5">
                <div class="w-11 h-11 sm:w-12 sm:h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                    <i data-lucide="smartphone" class="w-5 h-5 sm:w-6 sm:h-6"></i>
                </div>
                <div class="min-w-0">
                    <h3 class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-tight truncate">${pushOverview.total_devices || 0}</h3>
                    <p class="text-xs text-gray-400 dark:text-gray-500 font-medium">Active Push Devices</p>
                </div>
            </div>

            <div class="bg-white dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs border border-gray-100 dark:border-gray-700/60 flex items-center gap-4 sm:gap-5">
                <div class="w-11 h-11 sm:w-12 sm:h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <i data-lucide="briefcase" class="w-5 h-5 sm:w-6 sm:h-6"></i>
                </div>
                <div class="min-w-0">
                    <h3 class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-tight truncate">${pushOverview.owner_devices || 0}</h3>
                    <p class="text-xs text-gray-400 dark:text-gray-500 font-medium">Business Owner Devices</p>
                </div>
            </div>

            <div class="bg-white dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs border border-gray-100 dark:border-gray-700/60 flex items-center gap-4 sm:gap-5">
                <div class="w-11 h-11 sm:w-12 sm:h-12 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                    <i data-lucide="store" class="w-5 h-5 sm:w-6 sm:h-6"></i>
                </div>
                <div class="min-w-0">
                    <h3 class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-tight truncate">${pushOverview.branch_devices || 0}</h3>
                    <p class="text-xs text-gray-400 dark:text-gray-500 font-medium">Branch Manager Devices</p>
                </div>
            </div>

            <div class="bg-white dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs border border-gray-100 dark:border-gray-700/60 flex items-center gap-4 sm:gap-5">
                <div class="w-11 h-11 sm:w-12 sm:h-12 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                    <i data-lucide="send" class="w-5 h-5 sm:w-6 sm:h-6"></i>
                </div>
                <div class="min-w-0">
                    <h3 class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-tight truncate">${pushOverview.total_broadcasts || pushNotificationsList.length || 0}</h3>
                    <p class="text-xs text-gray-400 dark:text-gray-500 font-medium">Push Broadcasts Sent</p>
                </div>
            </div>
        </div>

        <!-- Composer & Live Preview Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <!-- Section: Push Notification Composer (7 Cols) -->
            <div class="lg:col-span-7 bg-white dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs border border-gray-100 dark:border-gray-700/60 space-y-4">
                <div class="border-b border-gray-100 dark:border-gray-700/50 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                        <h3 class="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                            <i data-lucide="radio" class="w-4 h-4 text-indigo-600 dark:text-indigo-400"></i>
                            Push Broadcast Composer
                        </h3>
                        <p class="text-xs text-gray-400 dark:text-gray-500">Dispatch instant notifications directly to user lock-screens & browser push listeners</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <div id="pushAutosaveBadge" class="text-[11px] font-bold text-gray-400 dark:text-gray-500 flex items-center gap-1">
                            <i data-lucide="cloud" class="w-3.5 h-3.5"></i>
                            <span>Autosaved in Supabase</span>
                        </div>
                        ${permStatus === 'granted' ? `
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                                <i data-lucide="check-circle-2" class="w-3 h-3"></i> Push Enabled
                            </span>
                        ` : `
                            <button onclick="window.enableDevicePushForAdmin()" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 transition-colors cursor-pointer">
                                <i data-lucide="bell-ring" class="w-3 h-3"></i> Enable On Device
                            </button>
                        `}
                    </div>
                </div>

                <!-- Template Selector Bar -->
                <div class="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-xl p-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                    <div class="flex items-center gap-1.5 text-xs font-bold text-indigo-900 dark:text-indigo-300">
                        <i data-lucide="sparkles" class="w-4 h-4 text-indigo-600 dark:text-indigo-400"></i>
                        <span>Load Template Preset:</span>
                    </div>
                    <div class="flex items-center gap-2 flex-1 sm:max-w-xs">
                        <select id="pushTemplateSelect" onchange="window.applyPushTemplate(this.value)" class="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="">-- Select a Supabase Preset --</option>
                            ${templateOptionsHtml}
                        </select>
                    </div>
                </div>

                <div class="space-y-3.5">
                    <div>
                        <div class="flex items-center justify-between mb-1">
                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300">Notification Title *</label>
                            <span id="pushTitleCharCount" class="text-[10px] text-gray-400 font-bold">0 / 60</span>
                        </div>
                        <input type="text" id="pushTitle" maxlength="60" value="${escapeHtml(initialTitle)}" oninput="window.onPushComposerInput()" placeholder="e.g. Important System Maintenance Tonight" class="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-xs sm:text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    </div>

                    <div>
                        <div class="flex items-center justify-between mb-1">
                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300">Message Body *</label>
                            <span id="pushBodyCharCount" class="text-[10px] text-gray-400 font-bold">0 / 180</span>
                        </div>
                        <textarea id="pushBody" rows="3" maxlength="180" oninput="window.onPushComposerInput()" placeholder="Enter the push message text that will appear on devices..." class="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-xs sm:text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">${escapeHtml(initialBody)}</textarea>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Target Audience</label>
                            <select id="pushAudienceSelect" onchange="window.onPushComposerInput()" class="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                <option value="all" ${initialAudience === 'all' ? 'selected' : ''}>All Registered Devices (${pushOverview.total_devices || 0})</option>
                                <option value="owners" ${initialAudience === 'owners' ? 'selected' : ''}>Business Owners Only (${pushOverview.owner_devices || 0})</option>
                                <option value="managers" ${initialAudience === 'managers' ? 'selected' : ''}>Branch Managers Only (${pushOverview.branch_devices || 0})</option>
                                <option value="sysadmins" ${initialAudience === 'sysadmins' ? 'selected' : ''}>System Admins Only (${pushOverview.sysadmin_devices || 0})</option>
                            </select>
                        </div>

                        <div>
                            <div class="flex items-center justify-between mb-1">
                                <label class="block text-xs font-bold text-gray-700 dark:text-gray-300">Action URL (Destination on click)</label>
                            </div>
                            <input type="text" id="pushTargetUrl" value="${escapeHtml(initialUrl)}" oninput="window.onPushComposerInput()" placeholder="/app/#view=overview" class="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-xs font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            
                            <!-- Preset Destination Quick Pills -->
                            <div class="flex items-center gap-1.5 flex-wrap mt-1.5">
                                <span class="text-[10px] text-gray-400 font-bold">Presets:</span>
                                <button type="button" onclick="window.setPushTargetPreset('/app/#view=overview')" class="px-2 py-0.5 rounded-md bg-gray-100 hover:bg-indigo-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 text-[10px] font-bold transition-colors cursor-pointer">Overview</button>
                                <button type="button" onclick="window.setPushTargetPreset('/app/#view=sales')" class="px-2 py-0.5 rounded-md bg-gray-100 hover:bg-indigo-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 text-[10px] font-bold transition-colors cursor-pointer">Sales</button>
                                <button type="button" onclick="window.setPushTargetPreset('/app/#view=inventory')" class="px-2 py-0.5 rounded-md bg-gray-100 hover:bg-indigo-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 text-[10px] font-bold transition-colors cursor-pointer">Inventory</button>
                                <button type="button" onclick="window.setPushTargetPreset('/app/#view=stock-movements')" class="px-2 py-0.5 rounded-md bg-gray-100 hover:bg-indigo-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 text-[10px] font-bold transition-colors cursor-pointer">Transfers</button>
                                <button type="button" onclick="window.setPushTargetPreset('/app/#view=reports')" class="px-2 py-0.5 rounded-md bg-gray-100 hover:bg-indigo-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 text-[10px] font-bold transition-colors cursor-pointer">Reports</button>
                                <button type="button" onclick="window.setPushTargetPreset('/app/#view=settings')" class="px-2 py-0.5 rounded-md bg-gray-100 hover:bg-indigo-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 text-[10px] font-bold transition-colors cursor-pointer">Settings</button>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Hero Image URL (Optional)</label>
                        <input type="text" id="pushImageUrl" name="bms_push_hero_image_asset_field" autocomplete="new-password" data-lpignore="true" data-1p-ignore="true" data-bwignore="true" data-form-type="other" value="${escapeHtml(initialImg)}" oninput="window.onPushComposerInput()" placeholder="https://... (Optional hero image)" class="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-xs font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    </div>
                </div>

                <div class="pt-2 border-t border-gray-100 dark:border-gray-700/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button onclick="window.testLocalAdminPush()" type="button" class="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                        <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                        <span>Test on My Device</span>
                    </button>

                    <button onclick="window.dispatchAdminPushBroadcast()" type="button" class="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 active:scale-95 text-white text-xs font-black shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer">
                        <i data-lucide="send" class="w-4 h-4"></i>
                        <span>Send Push Broadcast</span>
                    </button>
                </div>
            </div>

            <!-- Section: Live Device Notification Preview (5 Cols) -->
            <div class="lg:col-span-5 space-y-4">
                <div class="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl sm:rounded-3xl p-5 shadow-lg border border-indigo-900/50 space-y-4">
                    <div class="flex items-center justify-between border-b border-white/10 pb-3">
                        <div class="flex items-center gap-2">
                            <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                            <h4 class="text-xs font-black tracking-wider uppercase text-indigo-300">Live Device Preview</h4>
                        </div>
                        <span class="text-[10px] font-bold text-gray-400">Lock-Screen Mockup</span>
                    </div>

                    <!-- Mock Mobile Lock Screen Card -->
                    <div class="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 shadow-xl space-y-2">
                        <div class="flex items-center justify-between text-[11px] text-gray-300">
                            <div class="flex items-center gap-1.5 font-bold">
                                <img src="/bmtzofficiallogo.png" class="w-4 h-4 rounded-full object-cover" onerror="this.src='/logo.jpg'">
                                <span>BMS Official</span>
                            </div>
                            <span class="text-[10px] text-gray-400">now</span>
                        </div>

                        <div>
                            <h5 id="previewPushTitle" class="text-xs sm:text-sm font-extrabold text-white leading-snug">
                                Important System Maintenance Tonight
                            </h5>
                            <p id="previewPushBody" class="text-[11px] sm:text-xs text-gray-200 font-medium leading-relaxed mt-0.5">
                                Enter the push message text that will appear on devices...
                            </p>
                        </div>

                        <div id="previewPushImageContainer" class="hidden pt-1">
                            <img id="previewPushImage" src="" class="w-full h-28 sm:h-32 object-cover rounded-xl border border-white/20">
                        </div>
                    </div>

                    <!-- Target Audience Summary Badge -->
                    <div class="bg-white/5 rounded-xl p-3 border border-white/10 flex items-center justify-between text-[11px]">
                        <span class="text-gray-400 font-medium">Estimated Audience:</span>
                        <span id="previewPushAudience" class="font-bold text-indigo-300">All Devices (${pushOverview.total_devices || 0})</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Push Broadcasts History Ledger -->
        <div class="bg-white dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xs border border-gray-100 dark:border-gray-700/60 overflow-hidden">
            <div class="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                    <h2 class="text-base sm:text-lg font-black text-gray-900 dark:text-white">Push Broadcasts History</h2>
                    <p class="text-xs text-gray-400 dark:text-gray-500">Live ledger of push notifications dispatched from the System Admin console</p>
                </div>
                <button onclick="loadCommunicationsData().then(() => renderAdminCommunications('push'))" class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer">
                    <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Refresh Ledger
                </button>
            </div>

            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse min-w-[640px]">
                    <thead>
                        <tr class="bg-gray-50/70 dark:bg-white/5 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-700/50">
                            <th class="py-3.5 sm:py-4 px-5 sm:px-6">Notification Title & Message</th>
                            <th class="py-3.5 sm:py-4 px-5 sm:px-6">Target Audience</th>
                            <th class="py-3.5 sm:py-4 px-5 sm:px-6">Destination URL</th>
                            <th class="py-3.5 sm:py-4 px-5 sm:px-6">Recipients</th>
                            <th class="py-3.5 sm:py-4 px-5 sm:px-6">Status</th>
                            <th class="py-3.5 sm:py-4 px-5 sm:px-6">Sent At</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 dark:divide-gray-700/40 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                        ${renderPushHistoryRows()}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    `;
}

function renderPushHistoryRows() {
    if (!pushNotificationsList.length) {
        return `<tr><td colspan="6" class="py-12 text-center text-gray-400 italic">No push notifications broadcasted yet.</td></tr>`;
    }

    return pushNotificationsList.map(item => `
        <tr class="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
            <td class="py-4 px-6">
                <div class="font-bold text-gray-900 dark:text-white leading-snug">${escapeHtml(item.title)}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400 font-normal truncate max-w-xs mt-0.5">${escapeHtml(item.body)}</div>
            </td>
            <td class="py-4 px-6">
                <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    item.target_audience === 'owners' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40' :
                    item.target_audience === 'managers' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40' :
                    'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40'
                }">
                    ${item.target_audience || 'All'}
                </span>
            </td>
            <td class="py-4 px-6 text-xs text-gray-600 dark:text-gray-400 font-mono">${escapeHtml(item.target_url || '/app/')}</td>
            <td class="py-4 px-6 font-bold text-gray-900 dark:text-white">${item.sent_count || item.estimated_recipients || 0}</td>
            <td class="py-4 px-6">
                <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${item.status === 'sent' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-gray-100 text-gray-600'}">
                    ${item.status || 'sent'}
                </span>
            </td>
            <td class="py-4 px-6 text-xs text-gray-400">${new Date(item.created_at).toLocaleString()}</td>
        </tr>
    `).join('');
}

window.applyPushTemplate = function(templateId) {
    if (!templateId) return;

    let tpl = pushTemplatesList.find(t => t.id === templateId);
    if (!tpl) {
        // Built-in fallbacks if database table is not yet seeded
        const fallbacks = {
            maintenance: {
                title: 'Scheduled Maintenance Window Tonight',
                body: 'BMS will undergo scheduled performance optimization tonight between 01:00 AM - 02:00 AM. Services will resume seamlessly.',
                target_audience: 'all',
                target_url: '/app/#view=overview'
            },
            security: {
                title: 'Security Alert: Review Your Security Settings',
                body: 'We have updated enhanced security protocols for all business accounts. Please review your active login sessions.',
                target_audience: 'owners',
                target_url: '/app/#view=settings'
            },
            sales: {
                title: 'Outstanding Performance! Daily Goal Achieved',
                body: 'Your business branches have surpassed their daily sales targets. Tap to inspect today\'s revenue reports.',
                target_audience: 'owners',
                target_url: '/app/#view=reports'
            },
            inventory: {
                title: 'Stock Audit Reminder: Central Inventory Updated',
                body: 'New inventory shipments and transfers have been posted. Please review and reconcile pending stock batches.',
                target_audience: 'managers',
                target_url: '/app/#view=stock-movements'
            },
            announcement: {
                title: 'New Platform Features & Improvements Live',
                body: 'Exciting new features and performance enhancements have arrived in BMS. Tap to explore what\'s new.',
                target_audience: 'all',
                target_url: '/app/#view=overview'
            },
            billing: {
                title: 'Subscription Notice: Tier Status Verified',
                body: 'Your subscription tier has been verified. Access all premium multi-branch management features uninterrupted.',
                target_audience: 'owners',
                target_url: '/app/#view=settings'
            }
        };
        tpl = fallbacks[templateId];
    }

    if (!tpl) return;

    const titleEl = document.getElementById('pushTitle');
    const bodyEl = document.getElementById('pushBody');
    const audienceEl = document.getElementById('pushAudienceSelect');
    const targetUrlEl = document.getElementById('pushTargetUrl');
    const imgEl = document.getElementById('pushImageUrl');

    if (titleEl) titleEl.value = tpl.title || '';
    if (bodyEl) bodyEl.value = tpl.body || '';
    if (audienceEl && tpl.target_audience) audienceEl.value = tpl.target_audience;
    if (targetUrlEl && tpl.target_url) targetUrlEl.value = tpl.target_url;
    if (imgEl) imgEl.value = tpl.image_url || '';

    window.onPushComposerInput();
    window.savePushDraftToServer();
    showToast(`Template "${tpl.template_name || tpl.title}" applied!`, 'info');
};

window.setPushTargetPreset = function(url) {
    const targetUrlEl = document.getElementById('pushTargetUrl');
    if (targetUrlEl) {
        targetUrlEl.value = url;
        window.onPushComposerInput();
        window.savePushDraftToServer();
    }
};

window.savePushDraftToServer = async function() {
    const title = document.getElementById('pushTitle')?.value || '';
    const body = document.getElementById('pushBody')?.value || '';
    const audience = document.getElementById('pushAudienceSelect')?.value || 'all';
    const targetUrl = document.getElementById('pushTargetUrl')?.value || '/app/#view=overview';
    let imageUrl = document.getElementById('pushImageUrl')?.value || '';
    if (imageUrl && (imageUrl.includes('@') || (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://') && !imageUrl.startsWith('/')))) {
        imageUrl = '';
    }

    const badge = document.getElementById('pushAutosaveBadge');
    if (badge) {
        badge.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin text-indigo-500"></i><span>Saving to Supabase...</span>`;
        if (window.lucide) lucide.createIcons();
    }

    try {
        currentPushDraft = {
            title,
            body,
            target_audience: audience,
            target_url: targetUrl,
            image_url: imageUrl
        };

        // Cache locally as immediate fallback
        localStorage.setItem('bms_admin_push_draft_local', JSON.stringify(currentPushDraft));

        const { error } = await supabase.rpc('save_admin_push_draft', {
            p_title: title,
            p_body: body,
            p_target_audience: audience,
            p_target_url: targetUrl,
            p_image_url: imageUrl
        });

        if (error) {
            if (badge) {
                badge.innerHTML = `<i data-lucide="cloud-off" class="w-3.5 h-3.5 text-amber-500"></i><span class="text-amber-600 dark:text-amber-400">Cached Locally</span>`;
                if (window.lucide) lucide.createIcons();
            }
            return;
        }

        if (badge) {
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            badge.innerHTML = `<i data-lucide="cloud" class="w-3.5 h-3.5 text-emerald-500"></i><span class="text-emerald-600 dark:text-emerald-400">Autosaved (${timeStr})</span>`;
            if (window.lucide) lucide.createIcons();
        }
    } catch (e) {
        if (badge) {
            badge.innerHTML = `<i data-lucide="cloud-off" class="w-3.5 h-3.5 text-amber-500"></i><span class="text-amber-600 dark:text-amber-400">Cached Locally</span>`;
            if (window.lucide) lucide.createIcons();
        }
    }
};

window.onPushComposerInput = function() {
    const titleInput = document.getElementById('pushTitle');
    const bodyInput = document.getElementById('pushBody');
    const imgInput = document.getElementById('pushImageUrl');
    const audienceSelect = document.getElementById('pushAudienceSelect');

    // Auto-detect and wipe any browser autofilled email addresses
    if (imgInput && imgInput.value && (imgInput.value.includes('@') || imgInput.value.includes('gmail.com'))) {
        imgInput.value = '';
    }

    const previewTitle = document.getElementById('previewPushTitle');
    const previewBody = document.getElementById('previewPushBody');
    const previewImg = document.getElementById('previewPushImage');
    const previewImgCont = document.getElementById('previewPushImageContainer');
    const previewAudience = document.getElementById('previewPushAudience');

    const titleCount = document.getElementById('pushTitleCharCount');
    const bodyCount = document.getElementById('pushBodyCharCount');

    if (titleInput && titleCount) titleCount.textContent = `${titleInput.value.length} / 60`;
    if (bodyInput && bodyCount) bodyCount.textContent = `${bodyInput.value.length} / 180`;

    if (previewTitle && titleInput) {
        previewTitle.textContent = titleInput.value.trim() || 'Notification Title';
    }
    if (previewBody && bodyInput) {
        previewBody.textContent = bodyInput.value.trim() || 'Enter the push message text that will appear on devices...';
    }

    if (imgInput && previewImg && previewImgCont) {
        const url = imgInput.value.trim();
        if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) && !url.includes('@')) {
            previewImg.src = url;
            previewImgCont.classList.remove('hidden');
        } else {
            previewImgCont.classList.add('hidden');
        }
    }

    if (audienceSelect && previewAudience) {
        const selectedText = audienceSelect.options[audienceSelect.selectedIndex]?.text || 'All Devices';
        previewAudience.textContent = selectedText;
    }

    // Debounce server autosave
    if (pushAutosaveTimeout) clearTimeout(pushAutosaveTimeout);
    pushAutosaveTimeout = setTimeout(() => {
        window.savePushDraftToServer();
    }, 1200);
};

window.testLocalAdminPush = async function() {
    const title = document.getElementById('pushTitle')?.value.trim() || 'Test Push Notification';
    const body = document.getElementById('pushBody')?.value.trim() || 'This is a test notification verifying your push device configuration.';
    const image_url = document.getElementById('pushImageUrl')?.value.trim() || null;
    const target_url = document.getElementById('pushTargetUrl')?.value.trim() || '/app/#view=overview';

    const status = getPushPermissionStatus();
    if (status !== 'granted') {
        const result = await requestPushPermissionAndSubscribe();
        if (!result.success) {
            showToast('Please allow notification permission in your browser to test push notifications.', 'warning');
            return;
        }
    }

    const success = await showLocalPushNotification(title, { body, image_url, target_url });
    if (success) {
        showToast('Test notification sent to your device!', 'success');
    } else {
        showToast('Unable to display notification. Check browser permission.', 'error');
    }
};

window.enableDevicePushForAdmin = async function() {
    showLoader('Subscribing device for push notifications...');
    const result = await requestPushPermissionAndSubscribe();
    hideLoader();

    if (result.success) {
        showToast('Device registered for push notifications successfully!', 'success');
        await loadCommunicationsData();
        renderAdminCommunications('push');
    } else {
        showToast('Failed to enable push notifications: ' + (result.reason || 'permission denied'), 'warning');
    }
};

window.dispatchAdminPushBroadcast = async function() {
    const title = document.getElementById('pushTitle')?.value.trim();
    const body = document.getElementById('pushBody')?.value.trim();
    const audience = document.getElementById('pushAudienceSelect')?.value || 'all';
    const targetUrl = document.getElementById('pushTargetUrl')?.value.trim() || '/app/#view=overview';
    const imageUrl = document.getElementById('pushImageUrl')?.value.trim() || null;

    if (!title || !body) {
        showToast('Please provide both a Title and Message Body for the push notification.', 'warning');
        return;
    }

    const audienceLabel = audience === 'owners' ? 'Business Owners' : audience === 'managers' ? 'Branch Managers' : 'All Devices';
    const confirmed = await promptStepUpReauth(`Broadcast Push Notification to ${audienceLabel}?`);
    if (!confirmed) return;

    showLoader('Broadcasting Push Notification via Supabase...');
    try {
        const { data, error } = await supabase.rpc('sysadmin_dispatch_push_broadcast', {
            p_title: title,
            p_body: body,
            p_target_audience: audience,
            p_target_url: targetUrl,
            p_image_url: imageUrl
        });

        if (error) throw error;

        // 1. Instantly trigger real-time broadcast to all connected devices via unified bms-live channel
        if (window.broadcastSystemEvent) {
            await window.broadcastSystemEvent('sys_toast_broadcast', {
                message: `${title}: ${body}`,
                type: 'info',
                duration: 9000
            });

            await window.broadcastSystemEvent('sys_push_broadcast', {
                title,
                body,
                target_audience: audience,
                target_url: targetUrl,
                image_url: imageUrl,
                icon: '/bmtzofficiallogo.png',
                badge: '/bmtzofficiallogo.png'
            });
        }

        // 2. Dispatch native WebPush serverless API to deliver to all background OS endpoints
        try {
            const session = (await supabase.auth.getSession())?.data?.session;
            if (session && session.access_token) {
                fetch('/api/push/broadcast', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({
                        title,
                        body,
                        target_audience: audience,
                        target_url: targetUrl,
                        image_url: imageUrl
                    })
                }).catch(() => {});
            }
        } catch (apiErr) {
            console.warn('[Communications] /api/push/broadcast error:', apiErr);
        }

        hideLoader();
        showToast(`Push notification successfully broadcasted to ${data?.estimated_recipients || 0} recipient device(s)!`, 'success');

        // Retain autosaved details in Supabase and memory as requested
        await window.savePushDraftToServer();
        await loadCommunicationsData();
        renderAdminCommunications('push');
    } catch (err) {
        hideLoader();
        showToast('Error dispatching push broadcast: ' + (err.message || err), 'error');
    }
};

function renderBroadcastsTab() {
    return `
    <div class="space-y-6">
        <!-- Metric Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div class="bg-white dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs border border-gray-100 dark:border-gray-700/60 flex items-center gap-4 sm:gap-5">
                <div class="w-11 h-11 sm:w-12 sm:h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                    <i data-lucide="radio" class="w-5 h-5 sm:w-6 sm:h-6"></i>
                </div>
                <div class="min-w-0">
                    <h3 class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-tight truncate">${broadcastsList.length}</h3>
                    <p class="text-xs text-gray-400 dark:text-gray-500 font-medium">Total Broadcasts</p>
                </div>
            </div>

            <div class="bg-white dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs border border-gray-100 dark:border-gray-700/60 flex items-center gap-4 sm:gap-5">
                <div class="w-11 h-11 sm:w-12 sm:h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <i data-lucide="check-circle" class="w-5 h-5 sm:w-6 sm:h-6"></i>
                </div>
                <div class="min-w-0">
                    <h3 class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-tight truncate">${calculateTotalDelivered()}</h3>
                    <p class="text-xs text-gray-400 dark:text-gray-500 font-medium">Delivered Messages</p>
                </div>
            </div>

            <div class="bg-white dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs border border-gray-100 dark:border-gray-700/60 flex items-center gap-4 sm:gap-5">
                <div class="w-11 h-11 sm:w-12 sm:h-12 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                    <i data-lucide="flag" class="w-5 h-5 sm:w-6 sm:h-6"></i>
                </div>
                <div class="min-w-0">
                    <h3 class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-tight truncate">${bannersList.filter(b => b.active).length}</h3>
                    <p class="text-xs text-gray-400 dark:text-gray-500 font-medium">Active Banners</p>
                </div>
            </div>

            <div class="bg-white dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs border border-gray-100 dark:border-gray-700/60 flex items-center gap-4 sm:gap-5">
                <div class="w-11 h-11 sm:w-12 sm:h-12 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                    <i data-lucide="layers" class="w-5 h-5 sm:w-6 sm:h-6"></i>
                </div>
                <div class="min-w-0">
                    <h3 class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-tight truncate">${popupsList.length}</h3>
                    <p class="text-xs text-gray-400 dark:text-gray-500 font-medium">Modal Popups</p>
                </div>
            </div>
        </div>

        <!-- Recent Broadcasts Table -->
        <div class="bg-white dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xs border border-gray-100 dark:border-gray-700/60 overflow-hidden">
            <div class="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
                <div>
                    <h2 class="text-base sm:text-lg font-black text-gray-900 dark:text-white">Recent In-App Broadcasts</h2>
                    <p class="text-xs text-gray-400 dark:text-gray-500">Live multi-tenant broadcast audit ledger</p>
                </div>
            </div>

            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse min-w-[640px]">
                    <thead>
                        <tr class="bg-gray-50/70 dark:bg-white/5 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-700/50">
                            <th class="py-3.5 sm:py-4 px-5 sm:px-6">Broadcast Title</th>
                            <th class="py-3.5 sm:py-4 px-5 sm:px-6">Type & Priority</th>
                            <th class="py-3.5 sm:py-4 px-5 sm:px-6">Target Audience</th>
                            <th class="py-3.5 sm:py-4 px-5 sm:px-6">Delivered</th>
                            <th class="py-3.5 sm:py-4 px-5 sm:px-6">Status</th>
                            <th class="py-3.5 sm:py-4 px-5 sm:px-6">Created At</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 dark:divide-gray-700/40 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                        ${renderBroadcastRows()}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    `;
}

function renderNewslettersTab() {
    return `
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
        <!-- Section: Unified Composer (First on Mobile) -->
        <div id="unifiedComposerCard" class="order-1 lg:order-1 bg-white dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-4 sm:p-5 shadow-xs border border-gray-100 dark:border-gray-700/60 flex flex-col justify-between">
            <div class="space-y-2.5">
                <div class="border-b border-gray-100 dark:border-gray-700/50 pb-2 flex items-center justify-between">
                    <div>
                        <h3 class="text-sm sm:text-base font-black text-gray-900 dark:text-white">Broadcast & Campaign Composer</h3>
                        <p class="text-[11px] text-gray-400 dark:text-gray-500">Publish in-app announcements & email newsletters</p>
                    </div>
                    <div id="newsletterAutosaveBadge" class="text-[11px] font-bold text-gray-400 flex items-center gap-1">
                        <i data-lucide="cloud" class="w-3.5 h-3.5"></i>
                        <span>Autosave (3s)</span>
                    </div>
                </div>

                <input type="hidden" id="newsletterDraftId" value="">
                
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                        <label class="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-0.5">Subject / Title</label>
                        <input type="text" id="newsletterSubject" oninput="window.onNewsletterComposerInput()" placeholder="e.g. System Update / Feature Release..." class="w-full px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-xs font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    </div>
                    <div>
                        <label class="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-0.5">Banner Image URL (Optional)</label>
                        <input type="url" id="newsletterBanner" oninput="window.onNewsletterComposerInput()" placeholder="https://..." class="w-full px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-xs font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    </div>
                </div>

                <!-- Integrated Broadcast Configuration (Message Type, Audience & Channels) using Premium Drop Select -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                        <label class="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">Message Type</label>
                        ${window.renderPremiumSelect ? window.renderPremiumSelect({
                            id: 'bTypeSelect',
                            selectedValue: 'announcement',
                            options: [
                                { value: 'announcement', label: 'Announcement', icon: 'bell' },
                                { value: 'system', label: 'System Notice', icon: 'info' },
                                { value: 'security', label: 'Security Alert', icon: 'shield-alert' },
                                { value: 'maintenance', label: 'Maintenance', icon: 'wrench' },
                                { value: 'promotion', label: 'Promotion', icon: 'tag' },
                                { value: 'newsletter', label: 'Newsletter', icon: 'mail' }
                            ],
                            searchable: false,
                            classes: 'w-full !py-2 !text-xs !bg-gray-50 dark:!bg-gray-700/50 !border-gray-200 dark:!border-gray-600'
                        }) : ''}
                    </div>

                    <div>
                        <label class="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">Target Audience</label>
                        ${window.renderPremiumSelect ? window.renderPremiumSelect({
                            id: 'bTargetSelect',
                            selectedValue: 'all',
                            options: [
                                { value: 'all', label: 'All Platform Users', icon: 'globe' },
                                { value: 'owners', label: 'Business Owners Only', icon: 'briefcase' },
                                { value: 'managers', label: 'Branch Managers Only', icon: 'store' },
                                { value: 'subscribers', label: 'Subscribers Only', icon: 'users' }
                            ],
                            onChange: 'window.updateEstimatedRecipients()',
                            searchable: false,
                            classes: 'w-full !py-2 !text-xs !bg-gray-50 dark:!bg-gray-700/50 !border-gray-200 dark:!border-gray-600'
                        }) : ''}
                    </div>

                    <div>
                        <label class="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">Delivery Channel</label>
                        ${window.renderPremiumSelect ? window.renderPremiumSelect({
                            id: 'bChannelSelect',
                            selectedValue: 'both',
                            options: [
                                { value: 'both', label: 'Both (Email & In-App)', icon: 'send' },
                                { value: 'email', label: 'Email Broadcast Only', icon: 'mail' },
                                { value: 'in_app', label: 'In-App Alert Only', icon: 'radio' }
                            ],
                            searchable: false,
                            classes: 'w-full !py-2 !text-xs !bg-gray-50 dark:!bg-gray-700/50 !border-gray-200 dark:!border-gray-600'
                        }) : ''}
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-2.5">
                    <div>
                        <label class="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-0.5">CTA Button (Optional)</label>
                        <input type="text" id="newsletterCtaText" oninput="window.onNewsletterComposerInput()" placeholder="e.g. Explore Now" class="w-full px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-xs font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    </div>
                    <div>
                        <label class="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-0.5">CTA Link URL (Optional)</label>
                        <input type="url" id="newsletterCtaLink" oninput="window.onNewsletterComposerInput()" placeholder="https://..." class="w-full px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-xs font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    </div>
                </div>

                <div>
                    <label class="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-0.5">Message Body (Markdown Supported)</label>
                    <textarea id="newsletterBody" oninput="window.onNewsletterComposerInput()" rows="4" placeholder="Compose message content here..." class="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-xs font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"></textarea>
                </div>

                <!-- Live Audience Estimate Visual Pill -->
                <div class="p-2.5 bg-indigo-50/80 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-between text-xs">
                    <span class="font-medium">Estimated Recipient Audience:</span>
                    <strong id="estimatedCountDisplay" class="font-black text-xs">Calculating...</strong>
                </div>
            </div>

            <div class="pt-3 border-t border-gray-100 dark:border-gray-700/50 mt-3 flex gap-2.5">
                <button onclick="saveNewsletterDraft()" class="w-1/3 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-xl transition-all flex items-center justify-center gap-1.5">
                    <i data-lucide="save" class="w-3.5 h-3.5"></i> Save Draft
                </button>
                <button onclick="sendPlatformNewsletter()" class="w-2/3 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5">
                    <i data-lucide="send" class="w-3.5 h-3.5"></i> Dispatch Broadcast
                </button>
            </div>
        </div>

        <!-- Section: Drafts & Templates (Second on Mobile) -->
        <div class="order-2 lg:order-2 bg-white dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-4 sm:p-5 shadow-xs border border-gray-100 dark:border-gray-700/60 flex flex-col justify-between">
            <div>
                <div class="flex items-center justify-between mb-3 border-b border-gray-100 dark:border-gray-700/50 pb-2.5">
                    <div>
                        <h3 class="text-sm sm:text-base font-black text-gray-900 dark:text-white">Drafts & Campaign Library</h3>
                        <p class="text-[11px] text-gray-400 dark:text-gray-500">Manage saved campaigns and templates</p>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <button onclick="downloadNewsletterTemplate()" class="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors flex items-center gap-1">
                            <i data-lucide="download" class="w-3.5 h-3.5"></i> Template
                        </button>
                        <label class="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors flex items-center gap-1 cursor-pointer">
                            <i data-lucide="file-text" class="w-3.5 h-3.5"></i> Import
                            <input type="file" accept=".md,.txt" class="hidden" onchange="handleMarkdownImport(event)">
                        </label>
                    </div>
                </div>

                <div class="space-y-2 overflow-y-auto max-h-56 sm:max-h-64 pr-1 custom-scrollbar">
                    ${adminDrafts.length > 0 ? adminDrafts.map(draft => `
                        <div class="flex items-center justify-between bg-gray-50 dark:bg-gray-700/40 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700/50 hover:border-indigo-300 transition-all">
                            <div class="min-w-0 flex-1">
                                <h4 class="text-xs font-bold text-gray-900 dark:text-white truncate">${draft.subject || 'Untitled Draft'}</h4>
                                <p class="text-[10px] text-gray-400 mt-0.5">${new Date(draft.updated_at || draft.created_at).toLocaleDateString()}</p>
                            </div>
                            <div class="flex items-center gap-1 ml-2 shrink-0">
                                <button onclick="loadNewsletterDraft('${draft.id}')" class="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 text-xs font-bold hover:bg-indigo-100">
                                    Load
                                </button>
                                <button onclick="deleteNewsletterDraft('${draft.id}')" class="p-1 text-gray-400 hover:text-red-500 rounded-lg">
                                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                                </button>
                            </div>
                        </div>
                    `).join('') : `
                        <div class="py-12 flex flex-col items-center justify-center text-gray-400 italic text-xs">
                            <i data-lucide="mail-open" class="w-7 h-7 opacity-30 mb-1.5"></i>
                            No saved email drafts yet.
                        </div>
                    `}
                </div>
            </div>

            <div class="pt-3 border-t border-gray-100 dark:border-gray-700/50 mt-3">
                <button onclick="sendTestWelcomeEmail()" class="w-full py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1.5">
                    <i data-lucide="send" class="w-3.5 h-3.5"></i> Dispatch Test Welcome Email
                </button>
            </div>
        </div>
    </div>
    `;
}

function renderSubscribersTab() {
    return `
    <div class="bg-white dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xs border border-gray-100 dark:border-gray-700/60 overflow-hidden">
        <div class="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-700/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <h2 class="text-base sm:text-lg font-black text-gray-900 dark:text-white">Subscribed Business Tenants</h2>
                <p class="text-xs text-gray-400 dark:text-gray-500">Audience delivery list across all platform enterprises</p>
            </div>
            <div class="relative w-full sm:w-72">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i data-lucide="search" class="w-4 h-4 text-gray-400"></i>
                </div>
                <input type="text" id="subscriberSearch" placeholder="Search by email..." class="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-xs font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" onkeyup="filterSubscribers()">
            </div>
        </div>

        <div class="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
            <table class="w-full text-left border-collapse min-w-[600px]">
                <thead class="sticky top-0 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur-xs z-10">
                    <tr class="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-700/50">
                        <th class="py-3.5 px-5 sm:px-6">Tenant / Email</th>
                        <th class="py-3.5 px-5 sm:px-6">Business Name</th>
                        <th class="py-3.5 px-5 sm:px-6 text-center">Status</th>
                        <th class="py-3.5 px-5 sm:px-6 text-right">Action</th>
                    </tr>
                </thead>
                <tbody id="subscribersList" class="divide-y divide-gray-100 dark:divide-gray-700/40 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                    ${adminProfiles.map(p => {
                        const email = p.email || 'No Email';
                        const isSubscribed = p.newsletter_subscribed !== false;
                        return `
                        <tr class="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors subscriber-row" data-email="${email.toLowerCase()}">
                            <td class="py-3.5 px-5 sm:px-6 font-bold text-gray-900 dark:text-white">${escapeHtml(email)}</td>
                            <td class="py-3.5 px-5 sm:px-6 font-medium text-gray-500">${escapeHtml(p.business_name || 'Standard Tenant')}</td>
                            <td class="py-3.5 px-5 sm:px-6 text-center">
                                <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isSubscribed ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-red-50 text-red-600 dark:bg-red-900/20'}">
                                    ${isSubscribed ? 'Subscribed' : 'Opted Out'}
                                </span>
                            </td>
                            <td class="py-3.5 px-5 sm:px-6 text-right">
                                <button onclick="toggleSubscription('${p.id}', ${isSubscribed})" class="text-xs font-bold ${isSubscribed ? 'text-red-500 hover:text-red-700' : 'text-emerald-500 hover:text-emerald-700'}">
                                    ${isSubscribed ? 'Unsubscribe' : 'Resubscribe'}
                                </button>
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    </div>
    `;
}

function renderLogsTab() {
    return `
    <div class="bg-white dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xs border border-gray-100 dark:border-gray-700/60 overflow-hidden">
        <div class="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-700/50">
            <h2 class="text-base sm:text-lg font-black text-gray-900 dark:text-white">Delivery Transmission Receipts</h2>
            <p class="text-xs text-gray-400 dark:text-gray-500">Immutable audit log of outgoing broadcasts and system alerts</p>
        </div>

        <div class="divide-y divide-gray-100 dark:divide-gray-700/40">
            ${broadcastsList.length ? broadcastsList.map(b => `
                <div class="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                    <div class="flex items-start gap-3">
                        <div class="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                            <i data-lucide="send" class="w-4 h-4"></i>
                        </div>
                        <div>
                            <h4 class="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">${escapeHtml(b.title)}</h4>
                            <p class="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">${escapeHtml(b.body)}</p>
                            <div class="flex items-center gap-2 mt-1.5 text-[10px] text-gray-400 font-bold">
                                <span>Target: ${b.target_type}</span>
                                <span>•</span>
                                <span>Channels: ${Array.isArray(b.channels) ? b.channels.join(', ') : 'in_app'}</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-auto shrink-0 text-right">
                        <div>
                            <span class="text-xs font-bold text-gray-900 dark:text-white">${b.delivered_count || 0} Delivered</span>
                            <p class="text-[10px] text-gray-400">${new Date(b.created_at).toLocaleString()}</p>
                        </div>
                        <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${b.status === 'completed' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/20'}">
                            ${b.status}
                        </span>
                    </div>
                </div>
            `).join('') : `
                <div class="py-12 text-center text-gray-400 text-xs italic">No delivery receipts recorded yet.</div>
            `}
        </div>
    </div>
    `;
}

async function loadCommunicationsData() {
    try {
        const [bRes, bnRes, pRes, profRes, draftRes, pushRes, pushOverviewRes, tplRes, pushDraftRes, cronSettingsRes] = await Promise.allSettled([
            supabase.from('sys_broadcasts').select('*').order('created_at', { ascending: false }),
            supabase.from('sys_banners').select('*').order('created_at', { ascending: false }),
            supabase.from('sys_popups').select('*').order('created_at', { ascending: false }),
            supabase.from('profiles').select('*'),
            supabase.from('sys_email_drafts').select('*').order('updated_at', { ascending: false }),
            supabase.from('sys_push_notifications').select('*').order('created_at', { ascending: false }),
            supabase.rpc('sysadmin_get_push_subscribers_overview'),
            supabase.from('sys_push_templates').select('*').order('created_at', { ascending: true }),
            supabase.rpc('get_admin_push_draft'),
            supabase.from('sys_settings').select('value').eq('key', 'cron_job_settings').maybeSingle()
        ]);

        broadcastsList = bRes.status === 'fulfilled' ? (bRes.value.data || []) : [];
        bannersList = bnRes.status === 'fulfilled' ? (bnRes.value.data || []) : [];
        popupsList = pRes.status === 'fulfilled' ? (pRes.value.data || []) : [];
        adminProfiles = profRes.status === 'fulfilled' ? (profRes.value.data || []) : [];
        adminDrafts = draftRes.status === 'fulfilled' ? (draftRes.value.data || []) : [];
        pushNotificationsList = pushRes.status === 'fulfilled' ? (pushRes.value.data || []) : [];
        pushTemplatesList = tplRes.status === 'fulfilled' ? (tplRes.value.data || []) : [];

        if (cronSettingsRes.status === 'fulfilled' && cronSettingsRes.value.data?.value) {
            try {
                const val = cronSettingsRes.value.data.value;
                adminCronSettings = typeof val === 'string' ? JSON.parse(val) : val;
            } catch (e) {}
        }

        if (pushDraftRes.status === 'fulfilled' && pushDraftRes.value.data && pushDraftRes.value.data.has_draft) {
            currentPushDraft = pushDraftRes.value.data;
        } else {
            const localDraftStr = localStorage.getItem('bms_admin_push_draft_local');
            if (localDraftStr) {
                try {
                    currentPushDraft = JSON.parse(localDraftStr);
                } catch (e) {
                    currentPushDraft = null;
                }
            }
        }

        // Sanitize draft image_url so email autofills are never persisted
        if (currentPushDraft && currentPushDraft.image_url) {
            if (currentPushDraft.image_url.includes('@') || (!currentPushDraft.image_url.startsWith('http://') && !currentPushDraft.image_url.startsWith('https://') && !currentPushDraft.image_url.startsWith('/'))) {
                currentPushDraft.image_url = '';
                localStorage.setItem('bms_admin_push_draft_local', JSON.stringify(currentPushDraft));
            }
        }

        if (pushOverviewRes.status === 'fulfilled' && pushOverviewRes.value?.data && typeof pushOverviewRes.value.data.total_devices === 'number') {
            pushOverview = pushOverviewRes.value.data;
        } else {
            pushOverview = {
                total_devices: 0,
                owner_devices: 0,
                branch_devices: 0,
                sysadmin_devices: 0,
                total_broadcasts: pushNotificationsList.length || 0,
                total_delivered: pushNotificationsList.reduce((acc, c) => acc + (c.delivered_count || 0), 0)
            };
        }

        // Direct query to sys_push_subscriptions to guarantee real-time device accuracy
        try {
            const { data: subsData, count } = await supabase
                .from('sys_push_subscriptions')
                .select('id, role, device_type', { count: 'exact' })
                .eq('is_active', true);

            if (subsData && (count > 0 || subsData.length > 0)) {
                const total = count !== null ? count : subsData.length;
                const owners = subsData.filter(s => s.role === 'owner').length;
                const branches = subsData.filter(s => s.role === 'branch').length;
                const sysadmins = subsData.filter(s => s.role === 'sysadmin').length;
                pushOverview.total_devices = total;
                pushOverview.owner_devices = owners;
                pushOverview.branch_devices = branches;
                pushOverview.sysadmin_devices = sysadmins;
            }
        } catch (subErr) {
            console.warn('[Communications] Direct subscriptions count fallback:', subErr);
        }
    } catch (e) {
        console.error('[Communications] Error loading data:', e);
    }
}

function calculateTotalDelivered() {
    return broadcastsList.reduce((acc, curr) => acc + (curr.delivered_count || 0), 0);
}

function renderBroadcastRows() {
    if (!broadcastsList.length) {
        return `<tr><td colspan="6" class="py-8 text-center text-gray-400 italic">No system broadcasts issued yet.</td></tr>`;
    }

    return broadcastsList.map(b => `
        <tr class="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
            <td class="py-4 px-6 font-bold text-gray-900 dark:text-white">${escapeHtml(b.title)}</td>
            <td class="py-4 px-6">
                <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getTypeBadge(b.message_type)}">
                    ${b.message_type}
                </span>
            </td>
            <td class="py-4 px-6 font-medium capitalize text-gray-600 dark:text-gray-400">${b.target_type}</td>
            <td class="py-4 px-6 font-bold text-gray-900 dark:text-white">${b.delivered_count || 0} / ${b.estimated_recipients || 0}</td>
            <td class="py-4 px-6">
                <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${b.status === 'completed' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/20'}">
                    ${b.status}
                </span>
            </td>
            <td class="py-4 px-6 text-gray-400">${new Date(b.created_at).toLocaleString()}</td>
        </tr>
    `).join('');
}

function getTypeBadge(type) {
    switch (type) {
        case 'security': return 'bg-red-50 text-red-600 dark:bg-red-900/20';
        case 'maintenance': return 'bg-amber-50 text-amber-600 dark:bg-amber-900/20';
        case 'promotion': return 'bg-purple-50 text-purple-600 dark:bg-purple-900/20';
        default: return 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20';
    }
}

function openBroadcastComposerModal() {
    focusUnifiedComposer();
}

window.focusUnifiedComposer = function() {
    if (activeCommTab !== 'newsletters') {
        renderAdminCommunications('newsletters').then(() => {
            const input = document.getElementById('newsletterSubject');
            if (input) {
                input.focus();
                input.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    } else {
        const input = document.getElementById('newsletterSubject');
        if (input) {
            input.focus();
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
};

window.openBroadcastComposerModal = function() {
    focusUnifiedComposer();
};

window.updateEstimatedRecipients = async function() {
    const select = document.getElementById('bTargetSelect');
    const display = document.getElementById('estimatedCountDisplay');
    if (!select || !display) return;

    try {
        const val = select.value;
        let count = 0;

        if (val === 'all') {
            const { count: pCount } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
            const { count: bCount } = await supabase.from('branches').select('id', { count: 'exact', head: true });
            count = (pCount || 0) + (bCount || 0);
        } else if (val === 'owners') {
            const { count: pCount } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
            count = pCount || 0;
        } else if (val === 'managers') {
            const { count: bCount } = await supabase.from('branches').select('id', { count: 'exact', head: true });
            count = bCount || 0;
        } else if (val === 'subscribers') {
            const subscribedCount = adminProfiles.filter(p => p.newsletter_subscribed !== false).length;
            count = subscribedCount || adminProfiles.length;
        }

        display.textContent = `${count} Recipient(s)`;
    } catch {
        display.textContent = 'Active Users';
    }
};

// Global Newsletter and Subscriber Helpers
window.filterSubscribers = function() {
    const q = document.getElementById('subscriberSearch')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('.subscriber-row');
    rows.forEach(r => {
        if (r.dataset.email.includes(q)) r.style.display = '';
        else r.style.display = 'none';
    });
};

window.toggleSubscription = async function(profileId, currentStatus) {
    showLoader('Updating subscription status...');
    try {
        const { error } = await supabase.from('profiles').update({ newsletter_subscribed: !currentStatus }).eq('id', profileId);
        if (error) throw error;

        hideLoader();
        showToast('Subscription updated successfully', 'success');
        await loadCommunicationsData();
        renderAdminCommunications(activeCommTab);
    } catch (e) {
        hideLoader();
        showToast('Failed to update subscription: ' + (e.message || e), 'error');
    }
};

window.handleMarkdownImport = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target.result;
        let body = content;

        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (frontmatterMatch) {
            const fm = frontmatterMatch[1];
            const getField = (key) => {
                const match = fm.match(new RegExp(`^${key}:\\s*(.*)$`, 'im'));
                return match ? match[1].trim() : '';
            };

            const subj = document.getElementById('newsletterSubject');
            const ban = document.getElementById('newsletterBanner');
            const ctaT = document.getElementById('newsletterCtaText');
            const ctaL = document.getElementById('newsletterCtaLink');

            if (subj) subj.value = getField('Subject');
            if (ban) ban.value = getField('Banner');
            if (ctaT) ctaT.value = getField('CTA_Text');
            if (ctaL) ctaL.value = getField('CTA_Link');

            body = content.replace(frontmatterMatch[0], '').trim();
        } else {
            const subjectMatch = content.match(/^# (.*$)/m);
            if (subjectMatch) {
                const subj = document.getElementById('newsletterSubject');
                if (subj) subj.value = subjectMatch[1].trim();
                body = body.replace(subjectMatch[0], '').trim();
            }
        }

        const b = document.getElementById('newsletterBody');
        if (b) b.value = body;
        showToast('File imported successfully!', 'success');
    };
    reader.readAsText(file);
    event.target.value = '';
};

window.downloadNewsletterTemplate = function() {
    const template = `---
Subject: Welcome to the BMS Platform!
Banner: https://images.unsplash.com/photo-1556761175-4b46a572b786?q=80&w=1200
CTA_Text: Explore the Dashboard
CTA_Link: https://bmstz.com/
---

Hello there,

Welcome to the **BMS Platform**! We are thrilled to have you here.

## What's Next?
* **New Features**: Check out our latest tools.
* **Business Insights**: Get tips for scaling.

If you have any questions, just reply!

**The BMS Team**
`;

    const blob = new Blob([template], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'BMS_Newsletter_Template.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

window.sendTestWelcomeEmail = async function() {
    const testEmail = prompt("Enter email address to send test welcome email to:");
    if (!testEmail) return;

    showLoader('Sending test welcome email...');
    try {
        const { error } = await supabase.functions.invoke('resend-welcome-email', {
            body: { email: testEmail.trim() }
        });
        if (error) throw error;

        hideLoader();
        showToast('Test welcome email sent successfully!', 'success');
    } catch (e) {
        hideLoader();
        showToast('Failed to send test email: ' + (e.message || e), 'error');
    }
};

window.sendPlatformNewsletter = async function() {
    const subject = document.getElementById('newsletterSubject')?.value.trim();
    const body = document.getElementById('newsletterBody')?.value.trim();
    const banner_url = document.getElementById('newsletterBanner')?.value.trim();
    const cta_text = document.getElementById('newsletterCtaText')?.value.trim();
    const cta_link = document.getElementById('newsletterCtaLink')?.value.trim();
    const type = document.getElementById('bTypeSelect')?.value || 'announcement';
    const target = document.getElementById('bTargetSelect')?.value || 'all';
    const channel = document.getElementById('bChannelSelect')?.value || 'both';

    if (!subject || !body) {
        showToast('Please enter both Subject and Message Body', 'warning');
        return;
    }

    const requiresStepUp = type === 'security' || target === 'all';
    const executeDispatch = async () => {
        showLoader('Dispatching multi-channel broadcast...');
        try {
            // 1. In-App Broadcast / Toast Alert
            if (channel === 'both' || channel === 'in_app') {
                const { error: rpcError } = await supabase.rpc('create_sys_broadcast', {
                    p_title: subject,
                    p_body: body,
                    p_message_type: type,
                    p_priority: type === 'security' ? 'urgent' : 'normal',
                    p_target_type: target === 'subscribers' ? 'all' : target,
                    p_channels: JSON.stringify(['in_app', 'toast'])
                });
                if (rpcError) console.warn('[Broadcast] In-app RPC warning:', rpcError.message);
                if (window.broadcastSystemEvent) {
                    await window.broadcastSystemEvent('sys_toast_broadcast', {
                        message: `${subject}: ${body}`,
                        type: type === 'security' ? 'warning' : 'info',
                        duration: 9000
                    });
                }
            }

            // 2. Email Campaign via Resend
            if (channel === 'both' || channel === 'email') {
                const { error: emailError } = await supabase.functions.invoke('resend-broadcast', {
                    body: { subject, body, banner_url, cta_text, cta_link, target_audience: target }
                });
                if (emailError) console.warn('[Broadcast] Email dispatch notice:', emailError.message);
            }

            hideLoader();
            showToast(`Broadcast dispatched successfully!`, 'success');

            const draftIdInput = document.getElementById('newsletterDraftId');
            if (draftIdInput) draftIdInput.value = '';
            if (document.getElementById('newsletterSubject')) document.getElementById('newsletterSubject').value = '';
            if (document.getElementById('newsletterBody')) document.getElementById('newsletterBody').value = '';
            if (document.getElementById('newsletterBanner')) document.getElementById('newsletterBanner').value = '';
            if (document.getElementById('newsletterCtaText')) document.getElementById('newsletterCtaText').value = '';
            if (document.getElementById('newsletterCtaLink')) document.getElementById('newsletterCtaLink').value = '';

            await loadCommunicationsData();
            renderAdminCommunications(activeCommTab);
        } catch (e) {
            hideLoader();
            showToast('Broadcast failed: ' + (e.message || e), 'error');
        }
    };

    if (requiresStepUp) {
        promptStepUpReauth(`Dispatch ${type.toUpperCase()} Broadcast (${target.toUpperCase()})`, executeDispatch);
    } else {
        await executeDispatch();
    }
};

window.onNewsletterComposerInput = function() {
    const badge = document.getElementById('newsletterAutosaveBadge');
    if (badge) {
        badge.innerHTML = `<span class="text-amber-500 flex items-center gap-1"><i data-lucide="edit-3" class="w-3 h-3 animate-pulse"></i> Unsaved...</span>`;
        if (window.lucide) window.lucide.createIcons();
    }

    clearTimeout(newsletterAutosaveTimeout);
    newsletterAutosaveTimeout = setTimeout(async () => {
        await executeNewsletterAutosave();
    }, 3000); // 3 seconds after user stops typing
};

async function executeNewsletterAutosave() {
    const draftIdInput = document.getElementById('newsletterDraftId');
    const id = draftIdInput ? draftIdInput.value : null;
    const subject = document.getElementById('newsletterSubject')?.value.trim();
    const body = document.getElementById('newsletterBody')?.value.trim();
    const banner_url = document.getElementById('newsletterBanner')?.value.trim();
    const cta_text = document.getElementById('newsletterCtaText')?.value.trim();
    const cta_link = document.getElementById('newsletterCtaLink')?.value.trim();

    if (!subject && !body) return;

    const badge = document.getElementById('newsletterAutosaveBadge');
    if (badge) {
        badge.innerHTML = `<span class="text-indigo-500 animate-pulse flex items-center gap-1"><i data-lucide="loader-2" class="w-3 h-3 animate-spin"></i> Autosaving...</span>`;
        if (window.lucide) window.lucide.createIcons();
    }

    try {
        const payload = {
            subject: subject || 'Untitled Draft',
            body: body || '',
            banner_url: banner_url || null,
            cta_text: cta_text || null,
            cta_link: cta_link || null,
            updated_at: new Date().toISOString()
        };

        if (id) {
            await supabase.from('sys_email_drafts').update(payload).eq('id', id);
        } else {
            const { data, error } = await supabase.from('sys_email_drafts').insert(payload).select('id').single();
            if (!error && data?.id && draftIdInput) {
                draftIdInput.value = data.id;
            }
        }

        if (badge) {
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            badge.innerHTML = `<span class="text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><i data-lucide="check-circle" class="w-3 h-3"></i> Autosaved (${timeStr})</span>`;
            if (window.lucide) window.lucide.createIcons();
        }
    } catch (e) {
        console.warn('[Communications] Autosave error:', e);
    }
}

window.saveNewsletterDraft = async function() {
    clearTimeout(newsletterAutosaveTimeout);
    const draftIdInput = document.getElementById('newsletterDraftId');
    const id = draftIdInput ? draftIdInput.value : null;
    const subject = document.getElementById('newsletterSubject')?.value.trim();
    const body = document.getElementById('newsletterBody')?.value.trim();
    const banner_url = document.getElementById('newsletterBanner')?.value.trim();
    const cta_text = document.getElementById('newsletterCtaText')?.value.trim();
    const cta_link = document.getElementById('newsletterCtaLink')?.value.trim();

    if (!subject && !body) {
        showToast('Please enter at least a subject or body to save a draft.', 'warning');
        return;
    }

    showLoader('Saving draft...');
    try {
        const payload = {
            subject, body, banner_url, cta_text, cta_link, updated_at: new Date().toISOString()
        };

        let res;
        if (id) {
            res = await supabase.from('sys_email_drafts').update(payload).eq('id', id);
        } else {
            res = await supabase.from('sys_email_drafts').insert(payload);
        }

        if (res.error) throw res.error;

        hideLoader();
        showToast('Draft saved successfully!', 'success');
        await loadCommunicationsData();
        renderAdminCommunications('newsletters');
    } catch (e) {
        hideLoader();
        showToast('Failed to save draft: ' + (e.message || e), 'error');
    }
};

window.loadNewsletterDraft = function(id) {
    const draft = adminDrafts.find(d => d.id === id);
    if (!draft) return;

    if (document.getElementById('newsletterDraftId')) document.getElementById('newsletterDraftId').value = draft.id;
    if (document.getElementById('newsletterSubject')) document.getElementById('newsletterSubject').value = draft.subject || '';
    if (document.getElementById('newsletterBody')) document.getElementById('newsletterBody').value = draft.body || '';
    if (document.getElementById('newsletterBanner')) document.getElementById('newsletterBanner').value = draft.banner_url || '';
    if (document.getElementById('newsletterCtaText')) document.getElementById('newsletterCtaText').value = draft.cta_text || '';
    if (document.getElementById('newsletterCtaLink')) document.getElementById('newsletterCtaLink').value = draft.cta_link || '';

    showToast('Draft loaded into composer!', 'success');
};

window.deleteNewsletterDraft = async function(id) {
    if (!confirm('Are you sure you want to delete this draft?')) return;

    showLoader('Deleting draft...');
    try {
        const { error } = await supabase.from('sys_email_drafts').delete().eq('id', id);
        if (error) throw error;

        hideLoader();
        showToast('Draft deleted!', 'success');
        await loadCommunicationsData();
        renderAdminCommunications('newsletters');
    } catch (e) {
        hideLoader();
        showToast('Failed to delete draft: ' + (e.message || e), 'error');
    }
};

function renderScheduledCronsTab() {
    const cronList = [
        // Branch Operations
        { key: 'branch_shift_open', name: 'Shift & Till Opening Reminder', role: 'Branch Staff / Cashiers', time: '07:00 EAT (04:00 UTC)', desc: 'Prompts branch cashiers to open their morning shift and verify opening till balance.', target: '/app/#view=cash_drawer', category: 'Branch Operations' },
        { key: 'branch_tasks_check', name: 'Daily Tasks & Objectives', role: 'Branch Staff / Cashiers', time: '08:00 EAT (05:00 UTC)', desc: 'Prompts staff to review tasks and daily performance targets assigned by management.', target: '/app/#view=tasks', category: 'Branch Operations' },
        { key: 'branch_midday_restock', name: 'Midday Stock & Restock Pulse', role: 'Branch Staff / Cashiers', time: '14:00 EAT (11:00 UTC)', desc: 'Reminds staff to inspect inventory and submit restock requests if stock is depleted.', target: '/app/#view=requests', category: 'Branch Operations' },
        { key: 'branch_shift_close', name: 'Shift Closing & Till Reconciliation', role: 'Branch Staff / Cashiers', time: '20:00 EAT (17:00 UTC)', desc: 'Prompts cashiers to count cash drawer, reconcile sales, and close daily shifts.', target: '/app/#view=cash_drawer', category: 'Branch Operations' },
        { key: 'branch_daily_report', name: 'Daily Work Handover', role: 'Branch Staff / Cashiers', time: '21:00 EAT (18:00 UTC)', desc: 'Reminds staff to submit recorded expenses, sales transactions, and daily summaries.', target: '/app/#view=shift_summary', category: 'Branch Operations' },
        { key: 'unclosed_shift_check', name: 'Unclosed Shift Sentinel', role: 'Branch Staff / Cashiers', time: '22:30 EAT (19:30 UTC)', desc: 'Detects active shifts left unclosed after hours and alerts branch staff to reconcile.', target: '/app/#view=cash_drawer', category: 'Branch Operations' },

        // Business Owner Routines
        { key: 'owner_morning', name: 'Morning Operations Briefing', role: 'Business Owners', time: '07:30 EAT (04:30 UTC)', desc: 'Executive briefing on opening status across branches, staff attendance & pending requests.', target: '/app/#view=overview', category: 'Executive Management' },
        { key: 'owner_credit_followup', name: 'Credit & Debtor Follow-up', role: 'Business Owners', time: '09:00 EAT (06:00 UTC)', desc: 'Highlights overdue customer credit balances and scheduled loan collections for today.', target: '/app/#view=customers', category: 'Executive Management' },
        { key: 'owner_midday', name: 'Midday Business Pulse', role: 'Business Owners', time: '13:30 EAT (10:30 UTC)', desc: 'Live midday gross sales, top branch rankings, and cashier transactions.', target: '/app/#view=sales', category: 'Executive Management' },
        { key: 'owner_transfers_check', name: 'Restock & Transfer Approvals', role: 'Business Owners', time: '15:00 EAT (12:00 UTC)', desc: 'Alerts owner to review pending branch stock requests and central dispatches.', target: '/app/#view=requests', category: 'Executive Management' },
        { key: 'owner_evening', name: 'Daily Revenue & Settlement', role: 'Business Owners', time: '20:30 EAT (17:30 UTC)', desc: 'Executive end-of-day revenue, gross profit margins, and reconciled drawers summary.', target: '/app/#view=financial_reports', category: 'Executive Management' },

        // Autonomous Sentinels
        { key: 'low_stock_sentinel', name: 'Low Stock & Reorder Sentinel', role: 'Owners & Branch Managers', time: 'Every 4 Hours (0 */4 * * *)', desc: 'Autonomous catalog scanner that pushes real-time reorder alerts when inventory dips below minimum threshold.', target: '/app/#view=central_inventory', category: 'Autonomous Sentinels' }
    ];

    const categories = ['Branch Operations', 'Executive Management', 'Autonomous Sentinels'];

    return `
    <div class="space-y-5">
        <div class="bg-white dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xs border border-gray-100 dark:border-gray-700/60 p-5 sm:p-6">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-gray-100 dark:border-gray-700/60">
                <div>
                    <h2 class="text-base sm:text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <i data-lucide="clock" class="w-5 h-5 text-indigo-600"></i>
                        Automated Cron Schedulers & Sentry Dispatchers
                    </h2>
                    <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Master server-side toggles and on-demand test dispatchers for all background scheduled streams</p>
                </div>
                <div class="flex items-center gap-2">
                    <span class="px-3 py-1 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 text-xs font-bold rounded-xl border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Vercel Engine Connected
                    </span>
                </div>
            </div>

            <div class="mt-6 space-y-6">
                ${categories.map(cat => `
                    <div class="space-y-3">
                        <div class="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            <i data-lucide="${cat === 'Branch Operations' ? 'store' : cat === 'Executive Management' ? 'briefcase' : 'shield-alert'}" class="w-4 h-4 text-indigo-500"></i>
                            <span>${cat}</span>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            ${cronList.filter(c => c.category === cat).map(c => {
                                const isCronActive = adminCronSettings[c.key] !== false;
                                return `
                                <div class="bg-gray-50/70 dark:bg-gray-900/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 flex flex-col justify-between gap-3 hover:border-gray-200 dark:hover:border-gray-700 transition-all">
                                    <div class="flex items-start justify-between gap-3">
                                        <div class="min-w-0">
                                            <div class="flex items-center gap-2">
                                                <h4 class="font-bold text-gray-900 dark:text-white text-xs sm:text-sm truncate">${c.name}</h4>
                                                <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${isCronActive ? 'bg-emerald-100/80 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}">
                                                    ${isCronActive ? 'Enabled' : 'Disabled'}
                                                </span>
                                            </div>
                                            <div class="flex items-center gap-2 mt-1 text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                                                <span class="flex items-center gap-1"><i data-lucide="clock" class="w-3 h-3 text-indigo-500"></i> ${c.time}</span>
                                                <span>•</span>
                                                <span>${c.role}</span>
                                            </div>
                                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">${c.desc}</p>
                                        </div>
                                        <label class="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                                            <input type="checkbox" ${isCronActive ? 'checked' : ''} onchange="window.toggleAdminCronSetting('${c.key}', this.checked)" class="sr-only peer">
                                            <div class="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:after:border-gray-600 peer-checked:bg-indigo-600"></div>
                                        </label>
                                    </div>
                                    <div class="flex items-center justify-between pt-2 border-t border-gray-200/50 dark:border-gray-700/50 text-xs">
                                        <span class="text-[10px] font-mono text-gray-400 truncate">slot=${c.key}</span>
                                        <button type="button" onclick="window.triggerAdminCronTest('${c.key}')" class="px-2.5 py-1 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 font-bold rounded-lg text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer">
                                            <i data-lucide="play" class="w-3 h-3"></i>
                                            <span>Test Trigger</span>
                                        </button>
                                    </div>
                                </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    </div>
    `;
}

window.toggleAdminCronSetting = async function(slotKey, isEnabled) {
    adminCronSettings[slotKey] = isEnabled;
    try {
        const res = await supabase.from('sys_settings').upsert({
            key: 'cron_job_settings',
            value: JSON.stringify(adminCronSettings),
            updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

        if (res.error) throw res.error;
        showToast(`Cron '${slotKey}' ${isEnabled ? 'enabled' : 'disabled'} globally`, 'success');
        renderAdminCommunications('crons');
    } catch (e) {
        showToast('Error saving cron toggle: ' + (e.message || e), 'error');
    }
};

window.triggerAdminCronTest = async function(slotKey) {
    showLoader(`Triggering test run for ${slotKey}...`);
    try {
        const url = slotKey === 'low_stock_sentinel' 
            ? '/api/crons/low-stock-alert' 
            : `/api/crons/scheduled-notifications?slot=${slotKey}`;
        const res = await fetch(url);
        const data = await res.json();
        hideLoader();
        if (data.skipped) {
            showToast(`Execution skipped: ${data.reason || 'Disabled'}`, 'info');
        } else {
            showToast(`Test triggered! Delivered to ${data.deliveredCount || 0} active device(s)`, 'success');
        }
    } catch (e) {
        hideLoader();
        showToast(`Test failed: ${e.message || e}`, 'error');
    }
};

function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

window.renderAdminCommunications = renderAdminCommunications;
window.renderScheduledCronsTab = renderScheduledCronsTab;
