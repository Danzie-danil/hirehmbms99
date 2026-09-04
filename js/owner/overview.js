import { state } from '../state.js';
import { supabase } from '../supabase.js';
import { dbTasks, dbBranches, dbActivities, dbRequests, dbStockMovements, dbMessages, dbCapital, dbAssets, dbAssetMaintenance } from '../db.js';
import { promptModal, showToast, fmt, openModal, closeModal, isCreatedToday } from '../utils.js';
import { getOwnerDashboardData, onDashboardUpdated } from '../data/repositories/dashboardRepository.js';
import { getLocalItems } from '../data/db.js';

let _dashboardSubUnsubscribe = null;

export async function notifyBranchStock(branchId, itemName) {
    const msg = await promptModal('Restock Reminder', `Send a restock reminder for "${itemName}":`, 'e.g. Please check supplier and restock by tomorrow...');
    if (msg === null) return;

    try {
        await dbTasks.add(branchId, {
            title: `RESTOCK: ${itemName}`,
            description: `Admin Comment: ${msg}`,
            priority: 'high',
            deadline: new Date().toISOString().split('T')[0]
        });
        showToast('Reminder sent to branch as a high-priority task.');
    } catch (err) {
        showToast('Failed to send reminder: ' + err.message, 'error');
    }
}

export function getOwnerDisplayName() {
    const isGenericAdmin = (str) => {
        if (!str || typeof str !== 'string') return true;
        const normalized = str.trim().toLowerCase();
        return ['admin', 'administrator', 'sysadmin', 'system admin', 'null', 'undefined'].includes(normalized);
    };

    if (state.profile?.full_name && !isGenericAdmin(state.profile.full_name)) {
        return state.profile.full_name.trim();
    }
    if (state.profile?.name && !isGenericAdmin(state.profile.name)) {
        return state.profile.name.trim();
    }
    const userMeta = state.user?.user_metadata || state.session?.user?.user_metadata;
    if (userMeta?.full_name && !isGenericAdmin(userMeta.full_name)) {
        return userMeta.full_name.trim();
    }
    if (userMeta?.first_name && !isGenericAdmin(userMeta.first_name)) {
        return userMeta.first_name.trim();
    }
    if (userMeta?.name && !isGenericAdmin(userMeta.name)) {
        return userMeta.name.trim();
    }
    if (state.profile?.business_name && !isGenericAdmin(state.profile.business_name)) {
        return state.profile.business_name.trim();
    }
    const emailCandidate = state.profile?.email || (state.currentUser && state.currentUser.includes('@') ? state.currentUser : null) || state.user?.email;
    if (emailCandidate && emailCandidate.includes('@')) {
        const localPart = emailCandidate.split('@')[0];
        const cleanName = localPart.replace(/[._-]/g, ' ').replace(/\s+/g, ' ').trim();
        if (cleanName && !isGenericAdmin(cleanName)) {
            return cleanName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }
    }
    if (state.currentUser && !state.currentUser.includes('@') && !isGenericAdmin(state.currentUser)) {
        return state.currentUser.trim();
    }
    const cached = localStorage.getItem('bms_user_name');
    if (cached && !isGenericAdmin(cached)) return cached.trim();
    if (state.profile?.business_name && state.profile.business_name.trim()) return state.profile.business_name.trim();
    return 'Owner';
}

if (typeof window !== 'undefined') {
    window.getOwnerDisplayName = getOwnerDisplayName;
}

export async function renderOwnerOverview() {
    const ownerId = state.ownerId || state.currentUserUuid || (state.profile && state.profile.id) || localStorage.getItem('bms_last_active_user') || 'owner';
    const container = document.getElementById('mainContent');
    if (!container) return;

    const branches = state.branches || [];
    const activeBranchFilter = state._overviewBranchFilter || 'all';
    const userName = getOwnerDisplayName();
    
    const branchOptions = [
        { value: 'all', label: window.t('all_branches', 'All Branches Consolidated') },
        ...branches.map(b => ({ value: b.id, label: b.name }))
    ];

    let shell = document.getElementById('overviewShell');
    if (!shell) {
        container.innerHTML = `
        <div class="space-y-2.5 sm:space-y-3 slide-in" id="overviewShell">
            <!-- Bento Top Greeting & Executive Filter Strip -->
            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-2.5 sm:p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">
                <div class="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center flex-shrink-0 text-indigo-600 dark:text-indigo-400">
                        <i data-lucide="layout-grid" class="w-4 h-4 sm:w-5 sm:h-5"></i>
                    </div>
                    <div class="min-w-0 flex-1">
                        <h2 id="ownerOverviewWelcomeHeading" class="text-sm sm:text-base font-black text-gray-900 dark:text-white tracking-tight truncate">${window.t('welcome_back', 'Welcome back')}, ${userName}</h2>
                        <p class="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1.5 mt-0.5 truncate">
                            <i data-lucide="calendar" class="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400 shrink-0"></i>
                            <span class="truncate">${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </p>
                    </div>
                </div>

                <!-- Location & Branch Filter -->
                <div class="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
                    ${window.renderPremiumSelect({
                        id: 'overviewBranchSelect',
                        options: branchOptions,
                        selectedValue: activeBranchFilter,
                        onChange: 'window.state._overviewBranchFilter = this.value; window.renderOwnerOverview()'
                    })}
                </div>
            </div>

            <!-- Bento Top KPI Summary Grid (Responsive 5-column strip on desktop) -->
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3" id="overviewKPIs">
                ${[1, 2, 3, 4, 5].map((_, idx) => `
                <div class="${idx === 4 ? 'col-span-2 sm:col-span-1 lg:col-span-1' : ''} stat-card bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-200 dark:border-gray-700 animate-pulse">
                    <div class="h-3 bg-gray-100 dark:bg-gray-700 rounded mb-2 w-20"></div>
                    <div class="h-6 bg-gray-100 dark:bg-gray-700 rounded w-28"></div>
                </div>`).join('')}
            </div>

            <div id="pendingApprovals" class="hidden"></div>

            <!-- Bento Main Content: Balanced 3-Column Grid -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-2.5 sm:gap-3">
                
                <!-- Left Bento Column: Financial Donut & Summary -->
                <div class="space-y-2.5 sm:space-y-3">
                    <!-- Concentric Financial Donut Card -->
                    <div id="overviewDonutWidget" class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-3 sm:p-3.5">
                        <div class="flex items-center justify-between mb-2">
                            <h3 class="font-bold text-gray-900 dark:text-white text-xs sm:text-sm uppercase tracking-wider">${window.t('financial_distribution', 'Financial Overview')}</h3>
                            <span class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md">Live</span>
                        </div>
                        <div id="donutContent" class="py-2 text-center text-xs text-gray-400 font-medium animate-pulse">Calculating financial metrics...</div>
                    </div>

                    <!-- Aggregate Snapshot Card -->
                    <div id="overviewBusinessSummary" class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-3 sm:p-3.5 space-y-2.5">
                        <div class="flex items-center justify-between">
                            <h3 class="font-bold text-gray-900 dark:text-white text-xs sm:text-sm uppercase tracking-wider">${window.t('summary_title', 'Business Snapshot')}</h3>
                            <span class="text-[10px] text-gray-400 font-medium">${window.t('today', 'Today')}</span>
                        </div>
                        <div id="businessSummaryContent" class="animate-pulse py-3 text-center text-gray-400 text-xs">Computing aggregated figures...</div>
                    </div>
                </div>

                <!-- Center Bento Column: Branch Progress & Quick Action Shortcuts -->
                <div class="space-y-2.5 sm:space-y-3">
                    <!-- Branch Performance Progress Card -->
                    <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-3 sm:p-3.5 space-y-2.5">
                        <div class="flex items-center justify-between">
                            <div>
                                <h3 class="font-bold text-gray-900 dark:text-white text-xs sm:text-sm uppercase tracking-wider">${window.t('branch_progress_title', 'Branch Target Progress')}</h3>
                                <p class="text-[10px] sm:text-[11px] text-gray-400 font-medium">${window.t('live_branch_tracking', 'Live revenue achievement vs daily goals')}</p>
                            </div>
                            <span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">Live</span>
                        </div>
                        <div class="space-y-2" id="branchPerformance">
                            ${[1, 2, 3].map(() => `
                            <div class="p-2 bg-gray-50 dark:bg-gray-900 rounded-xl animate-pulse">
                                <div class="h-2 bg-gray-100 dark:bg-gray-700 rounded mb-1.5 w-24"></div>
                                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5"></div>
                            </div>`).join('')}
                        </div>
                    </div>

                    <!-- Quick Action Shortcuts -->
                    <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-3 sm:p-3.5">
                        <div class="flex items-center justify-between mb-2.5">
                            <h3 class="font-bold text-gray-900 dark:text-white text-xs sm:text-sm uppercase tracking-wider">${window.t('quick_actions', 'Quick Shortcuts')}</h3>
                            <span class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md">Admin</span>
                        </div>
                        <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            <button onclick="openModal('addBranch')" data-tooltip="Create new branch" data-tooltip-title="Branch" data-tooltip-variant="indigo" class="flex flex-col items-center justify-center p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-all text-center group cursor-pointer">
                                <div class="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                                    <i data-lucide="plus-circle" class="w-3.5 h-3.5 text-indigo-600"></i>
                                </div>
                                <span class="text-[10px] font-bold text-gray-700 dark:text-gray-300 leading-tight uppercase truncate w-full">${window.t('branch', 'Branch')}</span>
                            </button>
                            <button onclick="openModal('addStock')" data-tooltip="Register stock inventory" data-tooltip-title="Stock" data-tooltip-variant="emerald" class="flex flex-col items-center justify-center p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all text-center group cursor-pointer">
                                <div class="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                                    <i data-lucide="package-plus" class="w-3.5 h-3.5 text-emerald-600"></i>
                                </div>
                                <span class="text-[10px] font-bold text-gray-700 dark:text-gray-300 leading-tight uppercase truncate w-full">${window.t('stock', 'Stock')}</span>
                            </button>
                            <button onclick="openModal('addStaff')" data-tooltip="Register new employee" data-tooltip-title="Staff" data-tooltip-variant="blue" class="flex flex-col items-center justify-center p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all text-center group cursor-pointer">
                                <div class="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                                    <i data-lucide="user-plus" class="w-3.5 h-3.5 text-blue-600"></i>
                                </div>
                                <span class="text-[10px] font-bold text-gray-700 dark:text-gray-300 leading-tight uppercase truncate w-full">${window.t('staff', 'Staff')}</span>
                            </button>
                            <button onclick="openModal('addSupplier')" data-tooltip="Record vendor contact" data-tooltip-title="Supplier" data-tooltip-variant="amber" class="flex flex-col items-center justify-center p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-all text-center group cursor-pointer">
                                <div class="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                                    <i data-lucide="truck" class="w-3.5 h-3.5 text-amber-600"></i>
                                </div>
                                <span class="text-[10px] font-bold text-gray-700 dark:text-gray-300 leading-tight uppercase truncate w-full">${window.t('supplier', 'Supplier')}</span>
                            </button>
                            <button onclick="openModal('addAnnouncementModal')" data-tooltip="Broadcast message" data-tooltip-title="Broadcast" data-tooltip-variant="purple" class="flex flex-col items-center justify-center p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-all text-center group cursor-pointer">
                                <div class="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                                    <i data-lucide="megaphone" class="w-3.5 h-3.5 text-purple-600"></i>
                                </div>
                                <span class="text-[10px] font-bold text-gray-700 dark:text-gray-300 leading-tight uppercase truncate w-full">${window.t('broadcast', 'Notice')}</span>
                            </button>
                            <button onclick="switchView('chat',null)" id="ownerDashMsgBtn" data-tooltip="Internal team chat" data-tooltip-title="Messages" data-tooltip-variant="indigo" class="relative flex flex-col items-center justify-center p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-all text-center group cursor-pointer">
                                <div class="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                                    <i data-lucide="message-square" class="w-3.5 h-3.5 text-indigo-500"></i>
                                    <span id="ownerDashMsgBadge" class="hidden absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">0</span>
                                </div>
                                <span class="text-[10px] font-bold text-gray-700 dark:text-gray-300 leading-tight uppercase truncate w-full">${window.t('chat', 'Chat')}</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Right Bento Column: Recent Activities Stream & Stock Health Alerts -->
                <div class="space-y-2.5 sm:space-y-3">
                    <!-- Recent Activities Stream -->
                    <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-3 sm:p-3.5 space-y-2.5">
                        <div class="flex items-center justify-between">
                            <h3 class="font-bold text-gray-900 dark:text-white text-xs sm:text-sm uppercase tracking-wider">${window.t('recent_activities', 'Activity Feed')}</h3>
                            <span class="text-[10px] text-gray-400 font-medium">${window.t('today', 'Today')}</span>
                        </div>
                        <div class="space-y-2 max-h-[175px] overflow-y-auto pr-1" id="activityFeed">
                            <div class="animate-pulse space-y-2 py-4">
                                ${[1, 2, 3].map(() => `<div class="h-9 bg-gray-100 dark:bg-gray-700 rounded-xl"></div>`).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- Branch Restock Requests -->
                    <div id="overviewBranchRequestsWidget" class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-3 sm:p-3.5 space-y-2.5">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-1.5">
                                <i data-lucide="truck" class="w-3.5 h-3.5 text-amber-500"></i>
                                <h3 class="font-bold text-gray-900 dark:text-white text-xs sm:text-sm uppercase tracking-wider">${window.t('branch_restock_requests', 'Branch Restock Requests')}</h3>
                            </div>
                            <span id="branchRequestsBadge" class="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md">Checking...</span>
                        </div>
                        <div id="branchRequestsContent" class="space-y-2 max-h-[175px] overflow-y-auto pr-1">
                            <div class="animate-pulse py-3 text-center text-gray-400 text-xs">Checking branch reorders...</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
        if (window.lucide) lucide.createIcons();
    }

    try {
        dbMessages.getUnreadCount(null, state.role).then(count => {
            const badge = document.getElementById('ownerDashMsgBadge');
            if (badge && count > 0) {
                badge.textContent = count > 9 ? '9+' : count;
                badge.classList.remove('hidden');
            }
        }).catch(() => { });
    } catch (e) {}

    const snapshotKey = `owner_${ownerId}_${activeBranchFilter}`;

    // Subscribe to live background updates
    if (_dashboardSubUnsubscribe) _dashboardSubUnsubscribe();
    _dashboardSubUnsubscribe = onDashboardUpdated((key, freshPayload) => {
        if (key === snapshotKey) {
            _populateOverviewDOM(freshPayload, false);
        }
    });

    try {
        // Cache-First Instant Read (< 20ms)
        const { data: snapshot, isCached, cachedAt } = await getOwnerDashboardData(ownerId, activeBranchFilter, state.branches);

        let snapshotData = snapshot;
        if (!snapshotData) {
            try {
                const [cachedSales, cachedInv, cachedBranches] = await Promise.all([
                    getLocalItems('sales').catch(() => []),
                    getLocalItems('inventory').catch(() => []),
                    getLocalItems('branches').catch(() => state.branches || [])
                ]);
                if ((cachedSales && cachedSales.length > 0) || (cachedInv && cachedInv.length > 0)) {
                    snapshotData = {
                        sales: cachedSales || [],
                        inventory: cachedInv || [],
                        branches: cachedBranches || state.branches || [],
                        tasks: [],
                        activities: [],
                        requests: [],
                        stockMovements: []
                    };
                }
            } catch (e) {}
        }

        _populateOverviewDOM(snapshotData || {
            sales: [],
            inventory: [],
            branches: state.branches || [],
            tasks: [],
            activities: [],
            requests: [],
            stockMovements: []
        }, isCached, cachedAt);
    } catch (err) {
        console.error('[Overview Hydration Error]:', err);
        _populateOverviewDOM({
            sales: [],
            inventory: [],
            branches: state.branches || [],
            tasks: [],
            activities: [],
            requests: [],
            stockMovements: []
        }, false, null);
    }
}

async function _populateOverviewDOM(payload, isCached = false, cachedAt = null) {
    if (!payload || typeof payload !== 'object') return;
    const branches = Array.isArray(payload.branches) ? payload.branches : (state.branches || []);
    const rawSalesList = Array.isArray(payload.sales) ? payload.sales : (Array.isArray(payload.sales?.items) ? payload.sales.items : (Array.isArray(payload.sales?.data) ? payload.sales.data : []));
    const todaySalesList = rawSalesList.filter(s => isCreatedToday(s));
    const inventoryItems = Array.isArray(payload.inventory) ? payload.inventory : (Array.isArray(payload.inventory?.items) ? payload.inventory.items : (Array.isArray(payload.inventory?.data) ? payload.inventory.data : []));
    const recentActivities = Array.isArray(payload.activities) ? payload.activities : (Array.isArray(payload.activities?.items) ? payload.activities.items : []);
    const pendingRequests = Array.isArray(payload.requests) ? payload.requests : (Array.isArray(payload.requests?.items) ? payload.requests.items : []);

    let combinedActivities = Array.isArray(recentActivities) && recentActivities.length > 0 ? [...recentActivities] : [];
    if (combinedActivities.length === 0 && todaySalesList.length > 0) {
        todaySalesList.slice(0, 20).forEach(s => {
            const bName = branches.find(b => b.id === s.branch_id)?.name || s.branches?.name || 'Branch';
            combinedActivities.push({
                type: 'sale',
                message: s.customer_name && s.customer_name !== 'Walk-in Customer' ? `Sale to ${s.customer_name}` : 'New sale recorded',
                branch: bName,
                amount: Number(s.amount || 0),
                created_at: s.created_at || new Date().toISOString(),
                time: new Date(s.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
        });
    }

    state.activities = combinedActivities.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));


    function _calculateSaleProfit(r) {
        if (!r) return 0;
        if (r.gross_profit != null && !isNaN(Number(r.gross_profit))) {
            return Number(r.gross_profit);
        }
        const amt = Number(r.amount || 0);
        const cost = Number(r.cost_amount || 0);
        return Math.max(0, amt - cost);
    }

    const totalSalesToday = todaySalesList.reduce((s, r) => s + Number(r.amount || 0), 0);
    const totalCogsToday = todaySalesList.reduce((s, r) => s + Number(r.cost_amount || 0), 0);
    const totalProfitToday = todaySalesList.reduce((s, r) => s + _calculateSaleProfit(r), 0);

    const inventoryCostValue = inventoryItems.reduce((s, i) => {
        const qty = Number(i.quantity != null ? i.quantity : (i.main_store_stock != null ? i.main_store_stock : (i.globalQty != null ? i.globalQty : 0)));
        const cost = Number(i.cost_price || 0);
        return s + (cost * qty);
    }, 0);
    const inventoryExpectedRevenue = inventoryItems.reduce((s, i) => {
        const qty = Number(i.quantity != null ? i.quantity : (i.main_store_stock != null ? i.main_store_stock : (i.globalQty != null ? i.globalQty : 0)));
        const price = Number(i.retail_price || i.price || 0);
        return s + (price * qty);
    }, 0);

    const ownerId = state.ownerId || state.currentUserUuid || (state.profile && state.profile.id);
    let totalLiquidCapital = 0;
    let capitalAccountsCount = 0;
    try {
        let capAccounts = Array.isArray(payload.capital_accounts) && payload.capital_accounts.length > 0 ? payload.capital_accounts : null;
        if (!capAccounts) {
            try {
                const localAccs = await getLocalItems('capital_accounts', a => !ownerId || a.owner_id === ownerId || !a.owner_id);
                if (Array.isArray(localAccs) && localAccs.length > 0) capAccounts = localAccs;
            } catch (e) {}
        }
        if (!capAccounts) {
            try {
                const cached = localStorage.getItem(`bms_cap_accs_${ownerId}`);
                if (cached) capAccounts = JSON.parse(cached);
            } catch (e) {}
        }
        if (!capAccounts) {
            capAccounts = await dbCapital.fetchAccounts(ownerId).catch(() => []);
        }
        totalLiquidCapital = (capAccounts || []).reduce((sum, a) => sum + parseFloat(a.balance || 0), 0);
        capitalAccountsCount = (capAccounts || []).length;
    } catch (e) {}


    // Refresh greeting with verified profile name
    const ownerWelcomeEl = document.getElementById('ownerOverviewWelcomeHeading');
    if (ownerWelcomeEl) {
        ownerWelcomeEl.textContent = `${window.t('welcome_back', 'Welcome back')}, ${getOwnerDisplayName()}`;
    }

    // 1. Render Executive Bento KPI Row with SVG Micro-Sparklines
    const kpiContainer = document.getElementById('overviewKPIs');
    if (kpiContainer) {
        const currencySymbol = (window.fmt && window.fmt.getSymbol) ? window.fmt.getSymbol() : 'TSh';
        kpiContainer.innerHTML = `
        <!-- Sales Today KPI -->
        <div onclick="switchView('sales')" data-tooltip="Total gross revenue generated across branches today" data-tooltip-title="Today's Revenue" class="relative bg-white dark:bg-gray-800 p-2.5 sm:p-3 rounded-2xl border border-gray-200 dark:border-gray-700 stat-card cursor-pointer flex flex-col justify-between h-full min-w-0">
            <div class="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shadow-2xs z-10">${currencySymbol}</div>
            <div class="flex items-center justify-between mb-1 pr-10">
                <span class="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight truncate block">${window.t('kpi_sales_today', 'Sales Today')}</span>
            </div>
            <div class="min-w-0 mt-auto pr-9">
                <p class="text-dynamic-lg font-black text-gray-900 dark:text-white truncate leading-tight" title="${fmt.currency(totalSalesToday)}">${fmt.number(totalSalesToday)}</p>
                <p class="text-[10px] text-gray-400 font-semibold mt-0.5 truncate">${todaySalesList.length} ${window.t('txns_recorded', 'transactions')}</p>
            </div>
            <!-- SVG Sparkline Micro-Bars -->
            <svg class="absolute bottom-2 right-2 w-5 h-3 text-indigo-500 opacity-75" viewBox="0 0 36 24" fill="currentColor">
                <rect x="2" y="12" width="4.5" height="12" rx="1.5"/>
                <rect x="9" y="6" width="4.5" height="18" rx="1.5"/>
                <rect x="16" y="10" width="4.5" height="14" rx="1.5"/>
                <rect x="23" y="4" width="4.5" height="20" rx="1.5"/>
                <rect x="30" y="2" width="4.5" height="22" rx="1.5"/>
            </svg>
        </div>

        <!-- Gross Profit KPI -->
        <div onclick="switchView('sales')" data-tooltip="Gross profit after subtracting COGS" data-tooltip-title="Gross Profit" class="relative bg-white dark:bg-gray-800 p-2.5 sm:p-3 rounded-2xl border border-gray-200 dark:border-gray-700 stat-card cursor-pointer flex flex-col justify-between h-full min-w-0">
            <div class="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-2xs z-10">${currencySymbol}</div>
            <div class="flex items-center justify-between mb-1 pr-10">
                <span class="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight truncate block">${window.t('kpi_profit_today', 'Gross Profit')}</span>
            </div>
            <div class="min-w-0 mt-auto pr-9">
                <p class="text-dynamic-lg font-black text-emerald-600 dark:text-emerald-400 truncate leading-tight" title="${fmt.currency(totalProfitToday)}">${fmt.number(totalProfitToday)}</p>
                <p class="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-0.5 truncate">COGS: ${fmt.currency(totalCogsToday)}</p>
            </div>
            <!-- SVG Sparkline Wave -->
            <svg class="absolute bottom-2 right-2 w-5.5 h-3.5 opacity-75" viewBox="0 0 40 24" fill="none">
                <path d="M2 16 L10 10 L18 14 L26 6 L38 3" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="38" cy="3" r="2.5" fill="#10B981"/>
            </svg>
        </div>

        <!-- Total Capital KPI -->
        <div onclick="switchView('capital')" data-tooltip="Total liquid business capital available across all accounts" data-tooltip-title="Business Capital" class="relative bg-white dark:bg-gray-800 p-2.5 sm:p-3 rounded-2xl border border-gray-200 dark:border-gray-700 stat-card cursor-pointer flex flex-col justify-between h-full min-w-0">
            <div class="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shadow-2xs z-10">${currencySymbol}</div>
            <div class="flex items-center justify-between mb-1 pr-10">
                <span class="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight truncate block">${window.t('total_available_capital', 'Total Capital')}</span>
            </div>
            <div class="min-w-0 mt-auto pr-9">
                <p class="text-dynamic-lg font-black text-indigo-600 dark:text-indigo-400 truncate leading-tight" title="${fmt.currency(totalLiquidCapital)}">${fmt.number(totalLiquidCapital)}</p>
                <p class="text-[10px] text-gray-400 font-semibold mt-0.5 truncate">${capitalAccountsCount} ${window.t('accounts', 'accounts')}</p>
            </div>
            <!-- SVG Sparkline Bars -->
            <svg class="absolute bottom-2 right-2 w-5 h-3 text-indigo-400 opacity-75" viewBox="0 0 36 24" fill="currentColor">
                <rect x="2" y="8" width="4.5" height="16" rx="1.5"/>
                <rect x="9" y="12" width="4.5" height="12" rx="1.5"/>
                <rect x="16" y="5" width="4.5" height="19" rx="1.5"/>
                <rect x="23" y="9" width="4.5" height="15" rx="1.5"/>
                <rect x="30" y="3" width="4.5" height="21" rx="1.5"/>
            </svg>
        </div>

        <!-- Inventory Cost KPI -->
        <div onclick="switchView('central_inventory')" data-tooltip="Total acquisition cost of inventory held across branches" data-tooltip-title="Inventory Cost" class="relative bg-white dark:bg-gray-800 p-2.5 sm:p-3 rounded-2xl border border-gray-200 dark:border-gray-700 stat-card cursor-pointer flex flex-col justify-between h-full min-w-0">
            <div class="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shadow-2xs z-10">${currencySymbol}</div>
            <div class="flex items-center justify-between mb-1 pr-10">
                <span class="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight truncate block">${window.t('kpi_inventory_cost', 'Stock Cost')}</span>
            </div>
            <div class="min-w-0 mt-auto pr-9">
                <p class="text-dynamic-lg font-black text-amber-600 dark:text-amber-400 truncate leading-tight" title="${fmt.currency(inventoryCostValue)}">${fmt.number(inventoryCostValue)}</p>
                <p class="text-[10px] text-gray-400 font-semibold mt-0.5 truncate">${inventoryItems.length} ${window.t('items', 'items')}</p>
            </div>
            <!-- SVG Sparkline Line -->
            <svg class="absolute bottom-2 right-2 w-5.5 h-3.5 opacity-75" viewBox="0 0 40 24" fill="none">
                <path d="M2 14 L10 18 L18 10 L26 12 L38 5" stroke="#F59E0B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="38" cy="5" r="2.5" fill="#F59E0B"/>
            </svg>
        </div>

        <!-- Expected Sales KPI -->
        <div onclick="switchView('stock_movements')" data-tooltip="Expected retail sales value upon selling all stock" data-tooltip-title="Potential Revenue" class="col-span-2 sm:col-span-1 lg:col-span-1 relative bg-white dark:bg-gray-800 p-2.5 sm:p-3 rounded-2xl border border-gray-200 dark:border-gray-700 stat-card cursor-pointer flex flex-col justify-between h-full min-w-0">
            <div class="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 shadow-2xs z-10">${currencySymbol}</div>
            <div class="flex items-center justify-between mb-1 pr-10">
                <span class="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-tight truncate block">${window.t('kpi_expected_sales', 'Expected Sales')}</span>
            </div>
            <div class="min-w-0 mt-auto pr-9">
                <p class="text-dynamic-lg font-black text-purple-600 dark:text-purple-400 truncate leading-tight" title="${fmt.currency(inventoryExpectedRevenue)}">${fmt.number(inventoryExpectedRevenue)}</p>
                <p class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5 truncate">+${fmt.currency(Math.max(0, inventoryExpectedRevenue - inventoryCostValue))}</p>
            </div>
            <div class="absolute bottom-2 right-2 w-5.5 h-5.5 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 text-[10px] font-black shadow-2xs">
                <i data-lucide="trending-up" class="w-3 h-3"></i>
            </div>
        </div>`;
    }

    // 2. Concentric Donut Progress Rings (Left Column)
    const donutEl = document.getElementById('donutContent');
    if (donutEl) {
        donutEl.className = 'w-full';
        const revVal = totalSalesToday || 0;
        const cogsVal = totalCogsToday || 0;
        const profitVal = totalProfitToday || 0;
        const marginPct = revVal > 0 ? Math.round((profitVal / revVal) * 100) : 0;

        // Radial progress calculations (r=36 circ=226.19; r=26 circ=163.36)
        const c1 = 2 * Math.PI * 36;
        const off1 = c1 - (Math.min(100, Math.max(0, marginPct)) / 100) * c1;

        donutEl.innerHTML = `
        <div class="flex items-center gap-3.5 sm:gap-4 py-0.5">
            <!-- Concentric Progress Donut Ring SVG -->
            <div class="relative w-[88px] h-[88px] shrink-0 flex items-center justify-center">
                <svg class="w-[88px] h-[88px] -rotate-90 transform" viewBox="0 0 96 96">
                    <!-- Outer Ring: Profit Margin -->
                    <circle cx="48" cy="48" r="36" stroke="currentColor" stroke-width="7" class="text-gray-100 dark:text-gray-700" fill="none"/>
                    <circle cx="48" cy="48" r="36" stroke="#10B981" stroke-width="7" stroke-dasharray="${c1}" stroke-dashoffset="${off1}" stroke-linecap="round" fill="none" class="transition-all duration-1000 ease-out"/>
                    
                    <!-- Inner Ring: COGS Ratio -->
                    <circle cx="48" cy="48" r="25" stroke="currentColor" stroke-width="5" class="text-gray-100 dark:text-gray-700" fill="none"/>
                    <circle cx="48" cy="48" r="25" stroke="#F59E0B" stroke-width="5" stroke-dasharray="${2 * Math.PI * 25}" stroke-dashoffset="${(2 * Math.PI * 25) * (1 - (revVal > 0 ? cogsVal / revVal : 0))}" stroke-linecap="round" fill="none" class="transition-all duration-1000 ease-out"/>
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    <span class="text-xs font-black text-gray-900 dark:text-white leading-none">${marginPct}%</span>
                    <span class="text-[8px] font-bold uppercase text-gray-400 mt-0.5">Margin</span>
                </div>
            </div>

            <div class="flex-1 min-w-0 space-y-1.5">
                <div class="flex items-center justify-between text-xs">
                    <div class="flex items-center gap-1.5 truncate">
                        <div class="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
                        <span class="text-gray-500 dark:text-gray-400 font-medium">Profit</span>
                    </div>
                    <span class="font-bold text-emerald-600 dark:text-emerald-400 shrink-0">${fmt.currency(profitVal)}</span>
                </div>
                <div class="flex items-center justify-between text-xs">
                    <div class="flex items-center gap-1.5 truncate">
                        <div class="w-2 h-2 rounded-full bg-amber-500 shrink-0"></div>
                        <span class="text-gray-500 dark:text-gray-400 font-medium">COGS</span>
                    </div>
                    <span class="font-bold text-amber-600 dark:text-amber-400 shrink-0">${fmt.currency(cogsVal)}</span>
                </div>
                <div class="flex items-center justify-between text-xs pt-1 border-t border-gray-100 dark:border-gray-700">
                    <span class="text-gray-400 font-semibold truncate">Revenue</span>
                    <span class="font-black text-gray-900 dark:text-white shrink-0">${fmt.currency(revVal)}</span>
                </div>
            </div>
        </div>`;
    }

    // 3. Aggregate Business Snapshot (Left Column)
    const summaryContainer = document.getElementById('businessSummaryContent');
    if (summaryContainer) {
        const branchBreakdown = (branches || []).map(b => {
            const bSales = todaySalesList.filter(s => s.branch_id === b.id);
            const bRevenue = bSales.reduce((s, r) => s + Number(r.amount || 0), 0);
            const bCogs = bSales.reduce((s, r) => s + Number(r.cost_amount || 0), 0);
            const bProfit = bSales.reduce((s, r) => s + _calculateSaleProfit(r), 0);
            return { branch: b, revenue: bRevenue, cogs: bCogs, profit: bProfit, count: bSales.length };
        });

        window.currentBranchBreakdown = branchBreakdown;

        summaryContainer.classList.remove('animate-pulse', 'py-8');
        summaryContainer.innerHTML = `
        <div class="grid grid-cols-2 gap-2">
            <div class="p-2.5 bg-gray-50/80 dark:bg-gray-900/60 rounded-xl border border-gray-100 dark:border-gray-800">
                <p class="text-[9px] text-gray-400 uppercase font-bold tracking-tight">${window.t('kpi_sales_today', 'Total Sales')}</p>
                <p class="text-xs sm:text-sm font-black text-gray-900 dark:text-white mt-0.5 truncate">${fmt.currency(totalSalesToday)}</p>
            </div>
            <div class="p-2.5 bg-gray-50/80 dark:bg-gray-900/60 rounded-xl border border-gray-100 dark:border-gray-800">
                <p class="text-[9px] text-emerald-600 dark:text-emerald-400 uppercase font-bold tracking-tight">${window.t('kpi_profit_today', 'Net Profit')}</p>
                <p class="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">${fmt.currency(totalProfitToday)}</p>
            </div>
            <div class="p-2.5 bg-gray-50/80 dark:bg-gray-900/60 rounded-xl border border-gray-100 dark:border-gray-800">
                <p class="text-[9px] text-amber-600 dark:text-amber-400 uppercase font-bold tracking-tight">Total COGS</p>
                <p class="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400 mt-0.5 truncate">${fmt.currency(totalCogsToday)}</p>
            </div>
            <div class="p-2.5 bg-gray-50/80 dark:bg-gray-900/60 rounded-xl border border-gray-100 dark:border-gray-800">
                <p class="text-[9px] text-indigo-600 dark:text-indigo-400 uppercase font-bold tracking-tight">Active Branches</p>
                <p class="text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400 mt-0.5 truncate">${todaySalesList.length} txns / ${(branches || []).length} br</p>
            </div>
        </div>

        <div class="pt-1">
            <button onclick="switchView('daily_summary')" class="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl text-xs border border-indigo-100 dark:border-indigo-900/50 transition-colors cursor-pointer">
                <i data-lucide="bar-chart-2" class="w-3.5 h-3.5"></i>
                <span>${window.t('click_see_daily_summary', 'Inspect Daily Performance Report')}</span>
            </button>
        </div>`;
    }

    // 4. Branch Performance Leaderboard (Center Column)
    const perfContainer = document.getElementById('branchPerformance');
    if (perfContainer) {
        perfContainer.classList.remove('animate-pulse');
        const withSales = (branches || []).map(b => {
            const bSales = todaySalesList.filter(s => s.branch_id === b.id);
            const bRevenue = bSales.reduce((s, r) => s + Number(r.amount || 0), 0);
            return { ...b, todaySales: bRevenue };
        });

        if (withSales.length === 0) {
            perfContainer.innerHTML = `<p class="text-xs text-gray-400 text-center py-4 font-medium">No branch performance targets set.</p>`;
        } else {
            perfContainer.innerHTML = withSales.map(branch => {
                const target = Number(branch.target || 0);
                const pct = target > 0 ? Math.min(Math.round((branch.todaySales / target) * 100), 100) : 0;
                let color = 'bg-indigo-600';
                let textColor = 'text-indigo-600 dark:text-indigo-400';
                if (pct >= 80) { color = 'bg-emerald-500'; textColor = 'text-emerald-600 dark:text-emerald-400'; }
                else if (pct >= 40) { color = 'bg-amber-500'; textColor = 'text-amber-600 dark:text-amber-400'; }
                else if (pct > 0) { color = 'bg-rose-500'; textColor = 'text-rose-600 dark:text-rose-400'; }

                return `
                <div class="p-2.5 bg-gray-50/70 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                    <div class="flex justify-between items-center mb-1.5">
                        <div class="min-w-0 pr-2">
                            <p class="font-bold text-xs text-gray-900 dark:text-white uppercase tracking-tight truncate">${branch.name}</p>
                            <p class="text-[10px] text-gray-500 dark:text-gray-400 font-medium">${fmt.currency(branch.todaySales)} achieved / ${fmt.currency(branch.target)}</p>
                        </div>
                        <span class="text-xs font-black ${textColor} shrink-0">${pct}%</span>
                    </div>
                    <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                        <div class="${color} h-1.5 rounded-full progress-bar transition-all duration-700" style="width:${Math.min(pct, 100)}%"></div>
                    </div>
                </div>`;
            }).join('');
        }
    }

    // 5. Activity Feed (Right Column)
    const feedContainer = document.getElementById('activityFeed');
    if (feedContainer) feedContainer.innerHTML = renderActivities();

    // 6. Branch Restock Requests & Low Stock Alerts (Right Column)
    const branchRequestsContainer = document.getElementById('branchRequestsContent');
    const branchRequestsBadge = document.getElementById('branchRequestsBadge');
    if (branchRequestsContainer) {
        const reqList = Array.isArray(pendingRequests) ? pendingRequests : [];
        const restockRequests = reqList.filter(r => r.status === 'pending');

        const lowStockItems = (inventoryItems || []).filter(i => {
            if (i.item_type === 'service' || (i.category && String(i.category).toLowerCase().includes('service')) || (i.unit && String(i.unit).toLowerCase() === 'service')) {
                return false;
            }
            const qty = Number(i.quantity != null ? i.quantity : (i.stock != null ? i.stock : 0));
            const threshold = i.min_threshold != null ? Number(i.min_threshold) : (i.minimum_stock_level != null ? Number(i.minimum_stock_level) : 5);
            return qty <= threshold;
        });

        const totalRestockCount = restockRequests.length + lowStockItems.length;

        if (branchRequestsBadge) {
            if (totalRestockCount > 0) {
                branchRequestsBadge.className = 'text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md';
                branchRequestsBadge.textContent = `${totalRestockCount} Pending / Low`;
            } else {
                branchRequestsBadge.className = 'text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md';
                branchRequestsBadge.textContent = 'All Fulfilled';
            }
        }

        if (totalRestockCount === 0) {
            branchRequestsContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center py-2.5 text-center px-2">
                <div class="w-7 h-7 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1">
                    <i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i>
                </div>
                <p class="text-xs font-bold text-gray-900 dark:text-white">All Branch Orders Fulfilled</p>
                <p class="text-[10px] text-gray-400 font-medium mt-0.5">No pending restock requests or low stock items.</p>
                <button onclick="switchView('central_dispatch')" class="mt-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer">
                    <span>Open Central Dispatch</span>
                    <i data-lucide="arrow-right" class="w-2.5 h-2.5"></i>
                </button>
            </div>`;
        } else {
            const requestCards = restockRequests.slice(0, 2).map(req => {
                const branchName = req.branches?.name || 'Branch';
                const qtyText = req.metadata?.requested_qty ? `${req.metadata.requested_qty} units requested` : (req.type === 'restock_request' ? 'Restock order' : 'Requisition');
                return `
                <div onclick="switchView('requests', '${req.id}')" class="flex items-center justify-between p-2 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl hover:bg-amber-100/60 dark:hover:bg-amber-900/40 transition-all cursor-pointer group">
                    <div class="min-w-0 flex-1 pr-2">
                        <p class="text-xs font-bold text-gray-900 dark:text-white truncate">${req.subject || 'Restock Request'}</p>
                        <p class="text-[10px] text-gray-500 dark:text-gray-400 font-medium truncate">${branchName} · <span class="text-amber-600 dark:text-amber-400 font-bold">${qtyText}</span></p>
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                        <span class="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-black uppercase tracking-tight flex items-center gap-1 shadow-2xs">
                            <i data-lucide="send" class="w-2.5 h-2.5"></i>
                            <span>Dispatch</span>
                        </span>
                    </div>
                </div>`;
            });

            const lowStockCards = lowStockItems.slice(0, 4 - requestCards.length).map(item => {
                const bName = branches.find(b => b.id === item.branch_id)?.name || item.branches?.name || 'Branch';
                const qty = Number(item.quantity != null ? item.quantity : 0);
                const threshold = item.min_threshold != null ? Number(item.min_threshold) : 5;
                const isOut = qty <= 0;
                return `
                <div onclick="switchView('stock_transfers')" class="flex items-center justify-between p-2 bg-rose-50/40 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl hover:bg-rose-100/60 dark:hover:bg-rose-900/40 transition-all cursor-pointer group">
                    <div class="min-w-0 flex-1 pr-2">
                        <p class="text-xs font-bold text-gray-900 dark:text-white truncate">${item.name || 'Inventory Item'}</p>
                        <p class="text-[10px] text-gray-500 dark:text-gray-400 font-medium truncate">${bName} · <span class="${isOut ? 'text-rose-600 dark:text-rose-400 font-black' : 'text-amber-600 dark:text-amber-400 font-bold'}">${isOut ? 'Out of stock (0)' : `${qty} left (Min: ${threshold})`}</span></p>
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                        <span class="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-tight flex items-center gap-1 shadow-2xs">
                            <i data-lucide="arrow-right-left" class="w-2.5 h-2.5"></i>
                            <span>Restock</span>
                        </span>
                    </div>
                </div>`;
            });

            branchRequestsContainer.innerHTML = [...requestCards, ...lowStockCards].join('');
        }
    }


    // 7. Approval Queue
    const currentQueue = document.getElementById('pendingApprovals');
    const reqList = Array.isArray(pendingRequests) ? pendingRequests : [];
    const pendingQueue = reqList.filter(r => r.status === 'pending');
    if (currentQueue) {
        if (pendingQueue.length === 0) {
            currentQueue.innerHTML = '';
            currentQueue.classList.add('hidden');
        } else {
            currentQueue.classList.remove('hidden');
            currentQueue.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-indigo-200 dark:border-indigo-800 overflow-hidden mb-3.5">
                <div class="px-3.5 py-2 flex items-center justify-between border-b border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/40">
                    <div class="flex items-center gap-2 text-indigo-900 dark:text-indigo-300 text-xs">
                        <i data-lucide="shield-check" class="w-3.5 h-3.5 text-indigo-600"></i>
                        <span class="font-bold tracking-tight">Action Required</span>
                    </div>
                    <span class="text-[9px] font-black uppercase bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">${pendingQueue.length} Pending</span>
                </div>
                <div class="p-2 space-y-1">
                    ${pendingQueue.slice(0, 2).map(req => `
                        <div onclick="switchView('requests', '${req.id}')" class="flex items-center gap-2.5 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl cursor-pointer transition-colors group">
                            <div class="w-7 h-7 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                <i data-lucide="${req.type?.includes('inventory') ? 'package' : 'message-square'}" class="w-3.5 h-3.5"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-[11px] font-bold text-gray-900 dark:text-white truncate">${req.subject}</p>
                                <p class="text-[9px] text-gray-400 truncate">${req.branches?.name || 'Branch Request'}</p>
                            </div>
                            <i data-lucide="chevron-right" class="w-3.5 h-3.5 text-gray-400"></i>
                        </div>
                    `).join('')}
                </div>
            </div>`;
        }
    }

    if (window.lucide) lucide.createIcons();
}


export async function renderDailySummaryView(passedBreakdown = null) {
    const container = document.getElementById('mainContent');
    if (!container) return;

    let breakdown = passedBreakdown || window.currentBranchBreakdown;

    // Self-recovering data fetch if navigated directly without prior overview render
    if (!breakdown || breakdown.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center min-h-[50vh] w-full opacity-75">
                <div class="premium-spinner mb-4"></div>
                <p class="text-sm font-medium text-gray-500 dark:text-gray-400 animate-pulse">${typeof window.t === 'function' ? window.t('loading', 'Loading daily performance metrics...') : 'Loading daily performance metrics...'}</p>
            </div>`;
        try {
            const ownerId = state.ownerId || state.currentUserUuid || (state.profile && state.profile.id);
            const branches = state.branches && state.branches.length > 0 ? state.branches : await dbBranches.fetchAll(ownerId);
            state.branches = branches || [];
            
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
            const { data: salesData } = await supabase
                .from('sales')
                .select('id, branch_id, amount, cost_amount, gross_profit, created_at')
                .gte('created_at', startOfDay);

            const todaySalesList = (salesData || []).filter(s => isCreatedToday(s));
            breakdown = (branches || []).map(b => {
                const bSales = todaySalesList.filter(s => s.branch_id === b.id);
                const bRevenue = bSales.reduce((s, r) => s + Number(r.amount || 0), 0);
                const bCogs = bSales.reduce((s, r) => s + Number(r.cost_amount || 0), 0);
                const bProfit = bSales.reduce((s, r) => s + _calculateSaleProfit(r), 0);
                return { branch: b, revenue: bRevenue, cogs: bCogs, profit: bProfit, count: bSales.length };
            });
            window.currentBranchBreakdown = breakdown;
        } catch (err) {
            console.error('[DailySummaryView] Error loading fresh metrics:', err);
            breakdown = window.currentBranchBreakdown || [];
        }
    }

    const totalRev = (breakdown || []).reduce((s, b) => s + (b.revenue || 0), 0);
    const totalCogs = (breakdown || []).reduce((s, b) => s + (b.cogs || 0), 0);
    const totalProfit = (breakdown || []).reduce((s, b) => s + (b.profit || 0), 0);
    const totalCount = (breakdown || []).reduce((s, b) => s + (b.count || 0), 0);
    const overallMargin = totalRev > 0 ? Math.round((totalProfit / totalRev) * 100) : 0;
    const totalProfitClass = totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
    const activeBranchesCount = (breakdown || []).filter(b => (b.revenue || 0) > 0).length;
    const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const currencyStr = (state.profile && state.profile.currency) || 'TZS';

    const tableRowsHtml = (breakdown || []).map(b => {
        const margin = b.revenue > 0 ? Math.round((b.profit / b.revenue) * 100) : 0;
        const profitClass = b.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
        const branchName = b.branch ? (b.branch.name || b.branch) : 'Branch';
        return `
        <tr class="hover:bg-slate-50/70 dark:hover:bg-gray-800/50 transition-colors">
            <td class="px-4 py-3 font-bold text-gray-900 dark:text-white">
                <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full ${b.revenue > 0 ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-gray-600'}"></span>
                    <span class="truncate">${branchName}</span>
                </div>
            </td>
            <td class="px-4 py-3 text-right font-black text-slate-900 dark:text-white">${fmt.currency(b.revenue)}</td>
            <td class="px-4 py-3 text-right font-medium text-amber-600 dark:text-amber-400">${fmt.currency(b.cogs)}</td>
            <td class="px-4 py-3 text-right font-black ${profitClass}">${fmt.currency(b.profit)}</td>
            <td class="px-4 py-3 text-right font-bold text-slate-500 dark:text-gray-400">${margin}%</td>
            <td class="px-4 py-3 text-right font-bold text-slate-600 dark:text-gray-300">${b.count}</td>
        </tr>`;
    }).join('');

    const cardsHtml = (breakdown || []).map(b => {
        const margin = b.revenue > 0 ? Math.round((b.profit / b.revenue) * 100) : 0;
        const profitClass = b.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
        const progressPct = Math.min(100, Math.max(0, margin));
        const branchName = b.branch ? (b.branch.name || b.branch) : 'Branch';
        return `
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-slate-200/80 dark:border-gray-700/80 shadow-xs space-y-3.5">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2.5 min-w-0">
                    <span class="w-2.5 h-2.5 rounded-full ${b.revenue > 0 ? 'bg-emerald-500 ring-4 ring-emerald-500/20' : 'bg-slate-300 dark:bg-gray-600'}"></span>
                    <h4 class="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white truncate">${branchName}</h4>
                </div>
                <span class="px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-gray-600/60">${b.count} ${window.t('txns', 'txns')}</span>
            </div>
            <div class="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-gray-700/60 text-center">
                <div>
                    <p class="text-[9px] font-bold uppercase tracking-wider text-slate-400">${window.t('revenue', 'Revenue')}</p>
                    <p class="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate mt-0.5">${fmt.currency(b.revenue)}</p>
                </div>
                <div>
                    <p class="text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">${window.t('cogs', 'COGS')}</p>
                    <p class="text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400 truncate mt-0.5">${fmt.currency(b.cogs)}</p>
                </div>
                <div>
                    <p class="text-[9px] font-bold uppercase tracking-wider ${profitClass}">${window.t('profit', 'Profit')} (${margin}%)</p>
                    <p class="text-xs sm:text-sm font-black ${profitClass} truncate mt-0.5">${fmt.currency(b.profit)}</p>
                </div>
            </div>
            <div class="w-full bg-slate-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                <div class="h-1.5 rounded-full ${b.profit >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}" style="width: ${progressPct}%"></div>
            </div>
        </div>`;
    }).join('');

    container.classList.add('overflow-hidden', '!p-0');
    container.classList.remove('overflow-y-auto');

    container.innerHTML = `
    <div class="page-container w-full h-full bg-slate-50/50 dark:bg-gray-900 rounded-none border-0 shadow-none overflow-hidden flex flex-col">
        <!-- Fixed Top Navigation Header -->
        <div class="modal-top-nav flex-none flex items-center justify-between px-3.5 sm:px-6 py-2.5 sm:py-3.5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-20">
            <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <button type="button" onclick="switchView('overview')" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                    <i data-lucide="chevron-left" class="w-4 h-4"></i>
                    <span>${window.t('back_to_overview', 'Back to Overview')}</span>
                </button>
                <div class="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <i data-lucide="bar-chart-2" class="w-4 h-4"></i>
                </div>
                <div class="min-w-0">
                    <h3 class="text-xs sm:text-base font-black text-slate-900 dark:text-white truncate">${window.t('daily_branch_summary', 'Daily Branch Summary')}</h3>
                    <p class="text-[10px] sm:text-xs text-slate-400 font-medium truncate">${todayLabel} · ${window.t('performance_breakdown', 'Performance Breakdown')}</p>
                </div>
            </div>
            <div class="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <span class="px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-slate-100 dark:bg-gray-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-gray-600">
                    ${(breakdown || []).length} ${window.t('branches_count', 'Branches')}
                </span>
                <span class="hidden sm:inline-flex px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40">
                    ${totalCount} ${window.t('txns', 'Transactions')}
                </span>
            </div>
        </div>

        <!-- Scrollable Middle Body -->
        <div class="modal-main-content flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-6 scroller-custom max-w-7xl mx-auto w-full">
            <!-- 4 KPI Summary Strip -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-2">
                <div class="relative bg-white dark:bg-gray-800 p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-gray-700/80 shadow-xs">
                    <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-gray-600 shadow-2xs z-10">${fmt.getSymbol ? fmt.getSymbol() : 'TSh'}</div>
                    <p class="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">${window.t('total_revenue', 'Total Revenue')}</p>
                    <p class="text-sm sm:text-2xl font-black text-slate-900 dark:text-white truncate mt-1">${fmt.number(totalRev)}</p>
                    <p class="text-[10px] text-slate-400 font-medium mt-0.5">${totalCount} ${window.t('txns_recorded', 'transactions recorded')}</p>
                </div>
                <div class="relative bg-white dark:bg-gray-800 p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-gray-700/80 shadow-xs">
                    <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shadow-2xs z-10">${fmt.getSymbol ? fmt.getSymbol() : 'TSh'}</div>
                    <p class="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">${window.t('cogs', 'Cost of Goods Sold (COGS)')}</p>
                    <p class="text-sm sm:text-2xl font-black text-amber-600 dark:text-amber-400 truncate mt-1">${fmt.number(totalCogs)}</p>
                    <p class="text-[10px] text-amber-500/80 font-medium mt-0.5">${window.t('merchandise_cost', 'Merchandise Cost Basis')}</p>
                </div>
                <div class="relative bg-white dark:bg-gray-800 p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-gray-700/80 shadow-xs">
                    <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-2xs z-10">${fmt.getSymbol ? fmt.getSymbol() : 'TSh'}</div>
                    <p class="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${totalProfitClass}">${window.t('kpi_profit_today', 'Gross Profit')} (${overallMargin}%)</p>
                    <p class="text-sm sm:text-2xl font-black ${totalProfitClass} truncate mt-1">${fmt.number(totalProfit)}</p>
                    <p class="text-[10px] ${totalProfitClass} font-medium mt-0.5">${overallMargin}% ${window.t('gross_margin', 'Gross Margin')}</p>
                </div>
                <div class="bg-white dark:bg-gray-800 p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-gray-700/80 shadow-xs">
                    <p class="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">${window.t('active_branches', 'Active Branches')}</p>
                    <p class="text-sm sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 truncate mt-1">${activeBranchesCount} / ${(breakdown || []).length}</p>
                    <p class="text-[10px] text-indigo-500/80 font-medium mt-0.5">${window.t('locations_reporting', 'Locations Reporting Sales')}</p>
                </div>
            </div>

            <!-- Desktop Matrix Table (Hidden on Mobile) -->
            <div class="hidden sm:block bg-white dark:bg-gray-800 rounded-2xl border border-slate-200/80 dark:border-gray-700/80 shadow-xs overflow-hidden">
                <div class="px-5 py-3.5 border-b border-slate-100 dark:border-gray-700/80 flex items-center justify-between">
                    <h4 class="font-extrabold text-xs text-slate-800 dark:text-white uppercase tracking-wider">${window.t('branch_financial_matrix', 'Branch Financial Matrix')}</h4>
                    <span class="text-[10px] font-bold text-slate-400">${window.t('currency_label', 'All amounts in')} ${currencyStr}</span>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-xs">
                        <thead class="bg-slate-50/80 dark:bg-gray-900/60 border-b border-slate-200/80 dark:border-gray-700/80">
                            <tr>
                                <th class="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">${window.t('branch', 'Branch')}</th>
                                <th class="text-right px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">${window.t('today_revenue', 'Today Revenue')}</th>
                                <th class="text-right px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">${window.t('cogs', 'COGS')}</th>
                                <th class="text-right px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">${window.t('gross_profit', 'Gross Profit')}</th>
                                <th class="text-right px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">${window.t('margin', 'Margin')}</th>
                                <th class="text-right px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">${window.t('sales', 'Sales')}</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-gray-700/60">
                            ${tableRowsHtml}
                        </tbody>
                        <tfoot class="bg-slate-100/60 dark:bg-gray-900/80 font-black border-t-2 border-slate-200 dark:border-gray-700">
                            <tr>
                                <td class="px-4 py-3.5 text-slate-900 dark:text-white uppercase tracking-wider">${window.t('consolidated_total', 'Consolidated Total')}</td>
                                <td class="px-4 py-3.5 text-right text-slate-900 dark:text-white">${fmt.currency(totalRev)}</td>
                                <td class="px-4 py-3.5 text-right text-amber-600 dark:text-amber-400">${fmt.currency(totalCogs)}</td>
                                <td class="px-4 py-3.5 text-right ${totalProfitClass}">${fmt.currency(totalProfit)}</td>
                                <td class="px-4 py-3.5 text-right text-slate-600 dark:text-gray-300">${overallMargin}%</td>
                                <td class="px-4 py-3.5 text-right text-slate-900 dark:text-white">${totalCount}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <!-- Mobile Branch Cards (Visible only on Mobile) -->
            <div class="sm:hidden space-y-3">
                ${cardsHtml}
            </div>
        </div>

        <!-- Fixed Bottom Action Nav / Footer -->
        <div class="modal-bottom-nav flex-none flex items-center justify-center gap-3 px-4 sm:px-6 py-3 sm:py-3.5 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-20">
            <button type="button" onclick="switchView('overview')" class="w-full sm:w-auto px-8 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-gray-700 dark:hover:bg-gray-600 text-white font-extrabold text-xs sm:text-sm rounded-full shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer">
                <i data-lucide="arrow-left" class="w-4 h-4"></i>
                <span>${window.t('back_to_overview', 'Back to Overview')}</span>
            </button>
        </div>
    </div>`;

    if (window.lucide) window.lucide.createIcons();
}

window.showDailySummaryModal = function() {
    if (typeof window.switchView === 'function') {
        window.switchView('daily_summary');
    } else {
        renderDailySummaryView();
    }
};

window.renderDailySummaryView = renderDailySummaryView;

window.renderActivities = function () {
    const todayStr = new Date().toDateString();
    let displayActivities = (state.activities || []).filter(a => {
        if (!a.created_at) return true;
        return new Date(a.created_at).toDateString() === todayStr;
    });

    if (displayActivities.length === 0 && Array.isArray(state.activities) && state.activities.length > 0) {
        displayActivities = state.activities.slice(0, 15);
    }

    if (displayActivities.length === 0) {
        return `
        <div class="flex flex-col items-center justify-center py-4 text-center">
            <div class="w-7 h-7 rounded-full bg-gray-50 dark:bg-gray-700/60 text-gray-400 flex items-center justify-center mb-1">
                <i data-lucide="clock" class="w-3.5 h-3.5"></i>
            </div>
            <p class="text-xs font-medium text-gray-400">${window.t('no_activities_today', 'No activities recorded today')}</p>
        </div>`;
    }
    const typeMap = {
        sale: { bg: 'bg-emerald-100 dark:bg-emerald-950/40', icon: 'shopping-cart', ic: 'text-emerald-600 dark:text-emerald-400', amt: 'text-emerald-600 dark:text-emerald-400', sign: '+' },
        expense: { bg: 'bg-red-100 dark:bg-red-950/40', icon: 'credit-card', ic: 'text-red-600 dark:text-red-400', amt: 'text-red-600 dark:text-red-400', sign: '-' },
        task_completed: { bg: 'bg-blue-100 dark:bg-blue-950/40', icon: 'check-circle', ic: 'text-blue-600 dark:text-blue-400', amt: null, sign: '' },
        task_assigned: { bg: 'bg-amber-100 dark:bg-amber-950/40', icon: 'clipboard-list', ic: 'text-amber-600 dark:text-amber-400', amt: null, sign: '' }
    };
    const todayLabel = window.t('today', 'Today');
    return displayActivities.slice(0, 20).map(a => {
        const t = typeMap[a.type] || typeMap.task_completed;
        const isToday = a.created_at ? new Date(a.created_at).toDateString() === todayStr : true;
        const timeFormatted = a.time || (a.created_at ? new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');
        const dateTag = isToday ? todayLabel : new Date(a.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' });

        return `
        <div class="flex items-center gap-2.5 p-2 sm:p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl transition-all">
            <div class="w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-full ${t.bg} flex items-center justify-center shrink-0">
                <i data-lucide="${t.icon}" class="w-3.5 h-3.5 ${t.ic}"></i>
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold text-gray-900 dark:text-white leading-snug truncate">${a.message}</p>
                <p class="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 font-medium truncate">${a.branch} · <span class="text-indigo-600 dark:text-indigo-400 font-bold">${dateTag}</span> ${timeFormatted}</p>
            </div>
            ${a.amount ? `<span class="text-xs font-extrabold ${t.amt} shrink-0">${t.sign}${fmt.currency(a.amount)}</span>` : ''}
        </div>`;
    }).join('');
};


window.renderOwnerOverview = renderOwnerOverview;
window.notifyBranchStock = notifyBranchStock;
