
import { state } from '../state.js';
import { supabase } from '../supabase.js';
import { showToast } from '../utils.js';
import { renderOwnerBilling } from './billing.js';
import { renderBackupSuite } from './backup_suite.js';

window.renderBackupSuite = renderBackupSuite;

export function renderSettings() {
    const main = document.getElementById('mainContent');
    const profile = (window.isSysadminImpersonationMode && window.currentInspectingTenant) 
        ? window.currentInspectingTenant 
        : (state.profile || {});

    // Determine plan status for access gating
    const plan = typeof window.getPlan === 'function' ? window.getPlan() : null;
    const isLocked = plan && plan.isExpired; // true for expired-trial AND skipped-trial

    // Force expired/skipped-trial users to the security (billing) tab only
    if (isLocked) {
        state.settingsTab = 'security';
    }

    const activeTab = state.settingsTab || 'personal';

    let _hours = { open: '08:00', close: '18:00' };
    try { if (profile.operating_hours) _hours = JSON.parse(profile.operating_hours); } catch(e) {}
    const hoursOpen = _hours.open || '08:00';
    const hoursClose = _hours.close || '18:00';

    main.innerHTML = `
    <div class="max-w-7xl mx-auto w-full opacity-0 translate-y-4 animate-fade-in-up space-y-4">

        <!-- Header -->
        <div class="flex flex-nowrap items-center justify-between gap-1.5 sm:gap-3 mb-2 overflow-x-auto scrollbar-hide py-0.5">
            <div class="inline-flex items-center gap-1.5 sm:gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-xl sm:rounded-2xl p-1 sm:p-1.5 pr-2 sm:pr-4 cursor-default hover:shadow-md transition-shadow flex-shrink-0">
                <div class="bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-bold uppercase tracking-wider whitespace-nowrap">${window.t('account_settings', 'Account Settings')}</div>
                <span class="text-[10px] sm:text-sm font-medium text-gray-500 dark:text-gray-400 hidden md:block whitespace-nowrap">${window.t('account_settings_sub', 'Manage your profile and business details.')}</span>
            </div>

            <div class="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <div id="ownerSaveIndicator" class="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-300 opacity-0"></div>
                <button type="button" onclick="clearAllCache()" title="Erase Cache" class="flex items-center gap-1 px-2.5 sm:px-4 py-1.5 sm:py-2.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-[11px] sm:text-sm font-bold rounded-lg sm:rounded-xl hover:bg-amber-600 hover:text-white transition-all active:scale-95 whitespace-nowrap shadow-sm">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i> <span>${window.t('clear_cache', 'Erase Cache')}</span>
                </button>
                <button type="button" onclick="confirmUpdateApp()" title="Update" class="flex items-center gap-1 px-2.5 sm:px-4 py-1.5 sm:py-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 text-[11px] sm:text-sm font-bold rounded-lg sm:rounded-xl hover:bg-emerald-600 hover:text-white transition-all active:scale-95 whitespace-nowrap shadow-sm">
                    <i data-lucide="refresh-cw" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i> <span>${window.t('check_updates', 'Update')}</span>
                </button>
            </div>
        </div>

        <!-- Sticky Top Horizontal Navigation Tabs -->
        <div class="sticky -top-3.5 sm:-top-5 z-40 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md p-1.5 sm:p-2 rounded-2xl shadow-md border border-gray-200/80 dark:border-gray-700/80 overflow-x-auto scrollbar-hide transition-all">
            <nav class="flex items-center gap-1.5 sm:gap-2 min-w-max">
                <button onclick="${isLocked ? `showToast && showToast('Subscribe to access this section', 'warning')` : `switchSettingsTab('personal')`}" id="tab-personal"
                    class="flex-shrink-0 whitespace-nowrap flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all ${isLocked ? 'text-gray-300 cursor-not-allowed opacity-50' : activeTab === 'personal' ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 shadow-sm border border-indigo-100 dark:border-indigo-800/60' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'}"
                    ${isLocked ? 'disabled title="Subscribe to unlock"' : ''}>
                    <i data-lucide="${isLocked ? 'lock' : 'user'}" class="w-4 h-4 ${isLocked ? 'text-gray-300' : activeTab === 'personal' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}"></i>
                    <span>${window.t('personal_profile', 'Personal Profile')}</span>
                </button>
                <button onclick="${isLocked ? `showToast && showToast('Subscribe to access this section', 'warning')` : `switchSettingsTab('business')`}" id="tab-business"
                    class="flex-shrink-0 whitespace-nowrap flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all ${isLocked ? 'text-gray-300 cursor-not-allowed opacity-50' : activeTab === 'business' ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 shadow-sm border border-indigo-100 dark:border-indigo-800/60' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'}"
                    ${isLocked ? 'disabled title="Subscribe to unlock"' : ''}>
                    <i data-lucide="${isLocked ? 'lock' : 'building-2'}" class="w-4 h-4 ${isLocked ? 'text-gray-300' : activeTab === 'business' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}"></i>
                    <span>${window.t('business_details', 'Business Details')}</span>
                </button>
                <button onclick="${isLocked ? `showToast && showToast('Subscribe to access this section', 'warning')` : `switchSettingsTab('preferences')`}" id="tab-preferences"
                    class="flex-shrink-0 whitespace-nowrap flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all ${isLocked ? 'text-gray-300 cursor-not-allowed opacity-50' : activeTab === 'preferences' ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 shadow-sm border border-indigo-100 dark:border-indigo-800/60' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'}"
                    ${isLocked ? 'disabled title="Subscribe to unlock"' : ''}>
                    <i data-lucide="${isLocked ? 'lock' : 'sliders'}" class="w-4 h-4 ${isLocked ? 'text-gray-300' : activeTab === 'preferences' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}"></i>
                    <span>${window.t('global_preferences', 'Global Preferences')}</span>
                </button>
                <button onclick="${isLocked ? `showToast && showToast('Subscribe to access this section', 'warning')` : `switchSettingsTab('invoicing')`}" id="tab-invoicing"
                    class="flex-shrink-0 whitespace-nowrap flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all ${isLocked ? 'text-gray-300 cursor-not-allowed opacity-50' : activeTab === 'invoicing' ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 shadow-sm border border-indigo-100 dark:border-indigo-800/60' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'}"
                    ${isLocked ? 'disabled title="Subscribe to unlock"' : ''}>
                    <i data-lucide="${isLocked ? 'lock' : 'receipt'}" class="w-4 h-4 ${isLocked ? 'text-gray-300' : activeTab === 'invoicing' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}"></i>
                    <span>${window.t('invoicing_branding', 'Invoicing & Branding')}</span>
                    <span class="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-md">PRO</span>
                </button>
                <button onclick="switchSettingsTab('security')" id="tab-security"
                    class="flex-shrink-0 whitespace-nowrap flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all ${activeTab === 'security' ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 shadow-sm border border-indigo-100 dark:border-indigo-800/60' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'}">
                    <i data-lucide="shield" class="w-4 h-4 ${activeTab === 'security' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}"></i>
                    <span>${window.t('security_billing', 'Security & Billing')}</span>
                </button>
            </nav>
        </div>

        <!-- Full Width Settings Content Area -->
        <div class="w-full">
            <form id="settingsForm" class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/60" onsubmit="event.preventDefault(); saveSettings();">

                    <!-- Tab Content: Personal Profile -->
                    <div id="content-personal" class="${activeTab === 'personal' ? 'block' : 'hidden'} p-8">
                        <h3 class="text-lg font-bold text-gray-900 mb-6">${window.t('personal_admin_info', 'Personal Admin Information')}</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="col-span-1 md:col-span-2">
                                <label for="set_full_name" class="block text-sm font-medium text-gray-700 mb-1">${window.t('full_name', 'Full Name')}</label>
                                <input type="text" id="set_full_name" value="${profile.full_name || ''}" class="form-input w-full" placeholder="e.g. John Doe">
                            </div>
                            <div class="col-span-1">
                                <label for="set_admin_email" class="block text-sm font-medium text-gray-700 mb-1">${window.t('admin_email', 'Admin Email Address')}</label>
                                <input type="email" id="set_admin_email" value="${profile.email || state.currentUser || ''}" class="form-input w-full bg-gray-50 cursor-not-allowed text-gray-500" disabled title="To change login email, please contact support.">
                                <p class="text-xs text-gray-400 mt-1">${window.t('primary_comm_email', 'Primary communication email.')}</p>
                            </div>
                            <div class="col-span-1">
                                <label for="set_mobile_number" class="block text-sm font-medium text-gray-700 mb-1">${window.t('mobile_number', 'Mobile Number')}</label>
                                <input type="tel" id="set_mobile_number" value="${profile.mobile_number || ''}" class="form-input w-full" placeholder="+1 (555) 000-0000">
                            </div>
                            <div class="col-span-1 md:col-span-2 mt-2">
                                <label class="block text-sm font-medium text-gray-700 mb-2">${window.t('profile_avatar', 'Profile Avatar')}</label>
                                <div class="flex items-center gap-6">
                                    <div class="relative group">
                                        <div id="avatar_preview" class="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0 text-xl font-bold overflow-hidden border-2 border-white shadow-md ring-2 ring-indigo-50">
                                            ${profile.avatar_url ? `<img src="${profile.avatar_url}" class="w-full h-full object-cover">` : (profile.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U')}
                                        </div>
                                        <label for="set_avatar_file" class="absolute bottom-0 right-0 p-1.5 bg-indigo-600 text-white rounded-full shadow-lg cursor-pointer hover:bg-indigo-700 transition-all border-2 border-white scale-90 group-hover:scale-100">
                                            <i data-lucide="camera" class="w-3.5 h-3.5"></i>
                                            <input type="file" id="set_avatar_file" accept="image/*" class="hidden" onchange="handleAvatarUpload(this)">
                                        </label>
                                    </div>
                                    <div class="flex-1" id="avatar_controls">
                                        <h4 class="text-sm font-bold text-gray-900 mb-1">${window.t('upload_profile_image', 'Upload Profile Image')}</h4>
                                        <p class="text-xs text-gray-500 mb-3">${window.t('square_images_sub', 'Square images work best. Max size 2MB.')}</p>
                                        <input type="hidden" id="set_avatar_url" value="${profile.avatar_url || ''}">
                                        <div class="flex items-center gap-2">
                                            ${profile.avatar_url ? `
                                                <button type="button" onclick="document.getElementById('set_avatar_file').click()" class="text-xs font-bold text-indigo-600 hover:text-indigo-700 px-3 py-1.5 bg-indigo-50 rounded-lg border border-indigo-100 transition-colors">
                                                    ${window.t('replace', 'Replace')}
                                                </button>
                                                <button type="button" onclick="removeAvatar()" class="text-xs font-bold text-red-600 hover:text-red-700 px-3 py-1.5 bg-red-50 rounded-lg border border-red-100 transition-colors">
                                                    ${window.t('remove', 'Remove')}
                                                </button>
                                            ` : `
                                                <button type="button" onclick="document.getElementById('set_avatar_file').click()" class="text-xs font-bold text-indigo-600 hover:text-indigo-700 px-3 py-1.5 bg-indigo-50 rounded-lg border border-indigo-100 transition-colors">
                                                    ${window.t('choose_image_files', 'Choose Image from Files')}
                                                </button>
                                            `}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tab Content: Business Details -->
                    <div id="content-business" class="${activeTab === 'business' ? 'block' : 'hidden'} p-8">
                        <h3 class="text-lg font-bold text-gray-900 mb-6">${window.t('business_org_details', 'Business / Organization Details')}</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="col-span-1 md:col-span-2">
                                <label for="set_business_name" class="block text-sm font-medium text-gray-700 mb-1">${window.t('business_name_label', 'Business Name')}</label>
                                <input type="text" id="set_business_name" value="${profile.business_name || ''}" class="form-input w-full" placeholder="Your Enterprise Name">
                            </div>
                            <div class="col-span-1">
                                <label for="set_industry" class="block text-sm font-medium text-gray-700 mb-1">${window.t('industry_category', 'Industry / Category')}</label>
                                ${window.renderPremiumSelect({
        id: 'set_industry',
        selectedValue: profile.industry || '',
        options: [
            { value: '', label: window.t('select_industry', 'Select Industry...'), icon: 'grid' },
            { value: 'retail', label: window.t('retail', 'Retail'), icon: 'shopping-bag' },
            { value: 'fnb', label: window.t('fnb', 'Food & Beverage'), icon: 'coffee' },
            { value: 'services', label: window.t('services', 'Services'), icon: 'briefcase' },
            { value: 'other', label: window.t('other', 'Other'), icon: 'more-horizontal' }
        ],
        classes: 'w-full'
    })}
                            </div>
                            <div class="col-span-1">
                                <label for="set_tax_id" class="block text-sm font-medium text-gray-700 mb-1">${window.t('tax_id_reg', 'Tax ID / Business Reg No.')}</label>
                                <input type="text" id="set_tax_id" value="${profile.tax_id || ''}" class="form-input w-full" placeholder="e.g. TAX-12345">
                            </div>

                            <hr class="col-span-1 md:col-span-2 my-2 border-gray-100">

                            <div class="col-span-1 md:col-span-2 mb-2">
                                <h4 class="text-sm font-bold text-gray-900 mb-4">${window.t('localization', 'Localization')}</h4>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label for="set_currency" class="block text-sm font-medium text-gray-700 mb-1">${window.t('global_currency', 'Global Currency')}</label>
                                        ${window.renderPremiumSelect({
        id: 'set_currency',
        selectedValue: profile.currency || 'USD',
        options: [
            { value: 'USD', label: 'USD ($) - US Dollar', icon: 'dollar-sign' },
            { value: 'EUR', label: 'EUR (€) - Euro', icon: 'euro' },
            { value: 'GBP', label: 'GBP (£) - British Pound', icon: 'coins' },
            { value: 'TZS', label: 'TZS (TZS) - Tanzanian Shilling', icon: 'banknote' },
            { value: 'KES', label: 'KES (KSh) - Kenyan Shilling', icon: 'coins' },
            { value: 'NGN', label: 'NGN (₦) - Nigerian Naira', icon: 'coins' },
            { value: 'UGX', label: 'UGX (USh) - Ugandan Shilling', icon: 'coins' },
            { value: 'ZAR', label: 'ZAR (R) - South African Rand', icon: 'coins' },
            { value: 'INR', label: 'INR (₹) - Indian Rupee', icon: 'indian-rupee' }
        ],
        classes: 'w-full'
    })}
                                    </div>

                                    <div class="col-span-1 md:col-span-2">
                                        <label for="set_street_address" class="block text-sm font-medium text-gray-700 mb-1">${window.t('street_address_label', 'Business Street Address (e.g. Mlimani City, Sam Nujoma Rd)')}</label>
                                        <input type="text" id="set_street_address" value="${profile.street_address || ''}" class="form-input w-full" placeholder="Street name and plot number">
                                    </div>

                                    <div class="col-span-1">
                                        <label for="set_city" class="block text-sm font-medium text-gray-700 mb-1">${window.t('city_town', 'City / Town')}</label>
                                        <input type="text" id="set_city" value="${profile.city || 'Dar es Salaam'}" class="form-input w-full" placeholder="e.g. Dar es Salaam">
                                    </div>

                                    <div class="col-span-1">
                                        <label for="set_zip_code" class="block text-sm font-medium text-gray-700 mb-1">${window.t('postal_zip', 'Postal / ZIP Code')}</label>
                                        <input type="text" id="set_zip_code" value="${profile.zip_code || '14101'}" class="form-input w-full" placeholder="e.g. 14101">
                                    </div>

                                    <div>
                                        <label for="set_timezone" class="block text-sm font-medium text-gray-700 mb-1">${window.t('timezone', 'Timezone')}</label>
                                        ${window.renderPremiumSelect({
        id: 'set_timezone',
        selectedValue: profile.timezone || 'UTC',
        options: [
            { value: 'UTC', label: 'UTC', icon: 'globe' },
            { value: 'Africa/Nairobi', label: 'Africa/Nairobi', icon: 'clock' },
            { value: 'Africa/Lagos', label: 'Africa/Lagos', icon: 'clock' },
            { value: 'Europe/London', label: 'Europe/London', icon: 'clock' },
            { value: 'America/New_York', label: 'America/New_York', icon: 'clock' }
        ],
        classes: 'w-full'
    })}
                                    </div>
                                </div>
                            </div>

                            <hr class="col-span-1 md:col-span-2 my-2 border-gray-100">

                            <div class="col-span-1 md:col-span-2">
                                <h4 class="text-sm font-bold text-gray-900 mb-4">${window.t('custom_branding', 'Custom Branding')}</h4>
                                ${window.hasFeature('custom_branding') ? `
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100">
                                    <div class="col-span-1">
                                        <label for="set_logo_url" class="block text-sm font-medium text-gray-700 mb-1">${window.t('business_logo_url', 'Business Logo Image URL')}</label>
                                        <input type="url" id="set_logo_url" value="${profile.logo_url || ''}" class="form-input w-full" placeholder="https://example.com/logo.png">
                                        <p class="text-xs text-gray-400 mt-1">${window.t('replaces_logo_sub', 'Replaces the default sidebar logo across all branches.')}</p>
                                    </div>
                                    <div class="col-span-1">
                                        <label for="set_brand_color" class="block text-sm font-medium text-gray-700 mb-1">${window.t('primary_brand_color', 'Primary Brand Accent Color')}</label>
                                        <div class="flex items-center gap-3">
                                            <input type="color" id="set_brand_color_picker" value="${profile.brand_color || '#6366f1'}"
                                                   oninput="document.getElementById('set_brand_color').value = this.value; window.applyLiveBrandColor(this.value);"
                                                   onchange="document.getElementById('set_brand_color').value = this.value; window.applyLiveBrandColor(this.value); window.saveSettings();"
                                                   class="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent">
                                            <input type="text" id="set_brand_color" value="${profile.brand_color || '#6366f1'}" class="form-input flex-1 font-mono uppercase" placeholder="#6366F1"
                                                   oninput="window.applyLiveBrandColor(this.value); window.saveSettings();">
                                        </div>
                                        <p class="text-xs text-gray-400 mt-1">${window.t('custom_accent_sub', 'Custom primary accent color for UI highlights.')}</p>
                                    </div>
                                </div>` : window.renderFeatureLock('Custom Branding (Logo & Colors)', 'Exclusive')}
                            </div>
                        </div>
                    </div>

                    <!-- Tab Content: Global Preferences -->
                    <div id="content-preferences" class="${activeTab === 'preferences' ? 'block' : 'hidden'} p-8">
                        <h3 class="text-lg font-bold text-gray-900 mb-6 font-primary">${window.t('global_branch_prefs', 'Global Branch Preferences')}</h3>
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div class="col-span-1 space-y-8">
                                <!-- Group 1: Sales Target -->
                                <div>
                                    <label for="set_default_target" class="block text-sm font-medium text-gray-700 mb-1">${window.t('default_daily_target', 'Default Daily Sales Target')}</label>
                                    <div class="flex items-stretch rounded-lg shadow-sm border border-gray-300 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 overflow-hidden bg-white">
                                        <span class="flex items-center px-3 bg-gray-50 border-r border-gray-300 text-gray-400 text-[10px] font-black uppercase tracking-widest whitespace-nowrap flex-shrink-0">${fmt.getSymbol()}</span>
                                        <input type="text" inputmode="decimal" id="set_default_target" value="${profile.default_target || 10000}" class="flex-1 block w-full px-4 py-2 text-gray-900 border-0 focus:ring-0 focus:outline-none number-format min-w-0">
                                    </div>
                                    <p class="text-xs text-gray-400 mt-2">${window.t('target_applied_sub', 'Applied as baseline when creating new branches.')}</p>
                                </div>

                                <!-- Group 2: Operating Hours (Now Below) -->
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-3">${window.t('global_operating_hours', 'Global Operating Hours')}</label>
                                    <div class="space-y-2">
                                        <div class="relative flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100 transition-all hover:border-indigo-200">
                                            <div class="flex items-center gap-2.5 pointer-events-none">
                                                <div class="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-indigo-500">
                                                    <i data-lucide="clock" class="w-4 h-4"></i>
                                                </div>
                                                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">${window.t('opens_at', 'Opens At')}</span>
                                            </div>
                                            ${window.renderPremiumTimeSelect({ id: 'set_hours_open', selectedValue: hoursOpen, classes: 'w-36 text-sm', startHour: 4, endHour: 23 })}
                                        </div>
                                        <div class="relative flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100 transition-all hover:border-indigo-200">
                                            <div class="flex items-center gap-2.5 pointer-events-none">
                                                <div class="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-indigo-500">
                                                    <i data-lucide="moon" class="w-4 h-4"></i>
                                                </div>
                                                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">${window.t('closes_at', 'Closes At')}</span>
                                            </div>
                                            ${window.renderPremiumTimeSelect({ id: 'set_hours_close', selectedValue: hoursClose, classes: 'w-36 text-sm', startHour: 4, endHour: 23 })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="col-span-1">
                                <label for="set_receipt_text" class="block text-sm font-medium text-gray-700 mb-1">${window.t('receipt_footer_text', 'Default Receipt / Invoice Footer Text')}</label>
                                <textarea id="set_receipt_text" class="form-input w-full" rows="7" placeholder="${window.t('receipt_footer_placeholder', 'Thank you for your business!')}">${profile.receipt_text || window.t('receipt_footer_placeholder', 'Thank you for your business!')}</textarea>
                                <p class="text-xs text-gray-400 mt-2 mb-8">${window.t('receipt_footer_sub', 'Maximum 500 characters. Support for basic plain text.')}</p>

                                <div class="my-6">
                                    ${window.renderPushNotificationSettingsCard ? window.renderPushNotificationSettingsCard() : ''}
                                </div>

                                <div class="pt-6 border-t border-gray-100 space-y-3">
                                    <h4 class="text-sm font-bold text-gray-900 mb-1">${window.t('maintenance_cache', 'Maintenance & Cache')}</h4>
                                    <p class="text-xs text-gray-500 mb-3">${window.t('clear_cache_sub', 'Clear cached application assets, offline storage, and service workers.')}</p>
                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <button type="button" onclick="clearAllCache()" class="flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-600 hover:text-white rounded-xl transition-all shadow-sm">
                                            <i data-lucide="trash-2" class="w-4 h-4"></i> ${window.t('clear_all_cache', 'Erase Cache')}
                                        </button>
                                        <button type="button" onclick="closeModal(); startSaaSTour(true);" class="flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 rounded-xl transition-all shadow-sm">
                                            <i data-lucide="play-circle" class="w-4 h-4"></i> ${window.t('replay_tour', 'Replay Welcome Tour')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tab Content: Invoicing & Branding Studio -->
                    <div id="content-invoicing" class="${activeTab === 'invoicing' ? 'block' : 'hidden'} p-6 sm:p-8 space-y-8">
                        ${window.hasFeature('custom_invoicing') ? `
                        <div class="flex items-center justify-between border-b border-gray-100 pb-4">
                            <div>
                                <h3 class="text-lg font-bold text-gray-900">${window.t('invoicing_branding_studio', 'Custom Invoice & Document Studio')}</h3>
                                <p class="text-xs text-gray-500">${window.t('invoicing_studio_sub', 'Configure how your invoices, receipts, and quotations look to customers.')}</p>
                            </div>
                            <span class="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg">Enterprise Feature</span>
                        </div>

                        <!-- Brand Logo & Accent Theme -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/70 p-5 rounded-2xl border border-gray-100">
                            <div>
                                <label class="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Invoice Logo (Compressed)</label>
                                <div class="flex items-center gap-4">
                                    <div id="inv_logo_preview" class="w-20 h-20 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center p-1.5 overflow-hidden">
                                        ${(profile.invoice_settings?.logo_data || profile.logo_url) ? `<img src="${profile.invoice_settings?.logo_data || profile.logo_url}" class="max-h-full max-w-full object-contain">` : '<i data-lucide="image" class="w-8 h-8 text-gray-300"></i>'}
                                    </div>
                                    <div class="space-y-2">
                                        <input type="hidden" id="set_inv_logo_data" value="${profile.invoice_settings?.logo_data || ''}">
                                        <input type="file" id="set_inv_logo_file" accept="image/*" class="hidden" onchange="window.handleInvoiceLogoUpload(this)">
                                        <button type="button" onclick="document.getElementById('set_inv_logo_file').click()" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer">
                                            <i data-lucide="upload" class="w-3.5 h-3.5"></i> Upload Logo
                                        </button>
                                        <button type="button" id="inv_logo_remove_btn" onclick="window.removeInvoiceLogo()" class="${(profile.invoice_settings?.logo_data || profile.logo_url) ? '' : 'hidden'} px-3 py-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer">
                                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Remove
                                        </button>
                                    </div>
                                </div>
                                <p class="text-[10px] text-gray-400 mt-2">Logos are automatically downscaled & heavily compressed (<50KB) for instant PDF generation.</p>
                            </div>

                            <div>
                                <label class="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Invoice Accent Theme</label>
                                <div class="flex items-center gap-3 mb-3">
                                    <input type="color" id="set_inv_brand_color" value="${profile.invoice_settings?.brand_color || '#4f46e5'}" class="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent" onchange="window.saveSettings()">
                                    <span class="text-xs font-mono font-bold text-gray-700 uppercase" id="set_inv_brand_color_text">${profile.invoice_settings?.brand_color || '#4F46E5'}</span>
                                </div>
                                <div class="flex flex-wrap gap-2">
                                    <button type="button" onclick="window.setInvoiceColorPalette('#4f46e5')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-indigo-100 text-indigo-800 hover:opacity-90">Indigo</button>
                                    <button type="button" onclick="window.setInvoiceColorPalette('#059669')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-100 text-emerald-800 hover:opacity-90">Emerald</button>
                                    <button type="button" onclick="window.setInvoiceColorPalette('#0284c7')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-sky-100 text-sky-800 hover:opacity-90">Ocean Sky</button>
                                    <button type="button" onclick="window.setInvoiceColorPalette('#dc2626')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-red-100 text-red-800 hover:opacity-90">Crimson</button>
                                    <button type="button" onclick="window.setInvoiceColorPalette('#1e293b')" class="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-200 text-slate-800 hover:opacity-90">Slate Dark</button>
                                </div>
                            </div>
                        </div>

                        <!-- Legal / Tax Details -->
                        <div>
                            <h4 class="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Tax & Legal Registration</h4>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs font-bold text-gray-700 mb-1">TIN / VAT / Tax PIN Number</label>
                                    <input type="text" id="set_inv_tax_pin" value="${profile.invoice_settings?.tax_pin || ''}" placeholder="e.g. 100-234-567 / TIN-8829" class="form-input w-full rounded-xl text-sm" oninput="window.saveSettings()">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-gray-700 mb-1">Default Payment Terms</label>
                                    <input type="text" id="set_inv_terms" value="${profile.invoice_settings?.payment_terms || 'Due upon receipt'}" placeholder="e.g. Net 14 Days, Due on Receipt" class="form-input w-full rounded-xl text-sm" oninput="window.saveSettings()">
                                </div>
                            </div>
                        </div>

                        <!-- Mobile Payment Options (Crucial) -->
                        <div class="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-4">
                            <div class="flex items-center gap-2 text-indigo-900">
                                <i data-lucide="smartphone" class="w-4 h-4 text-indigo-600"></i>
                                <h4 class="text-xs font-black uppercase tracking-widest">Mobile Payment Integration (Lipa kwa Simu)</h4>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label class="block text-xs font-bold text-gray-700 mb-1">Mobile Money Provider</label>
                                    <select id="set_inv_momo_provider" class="form-input w-full rounded-xl text-sm font-semibold" onchange="window.saveSettings()">
                                        <option value="M-Pesa" ${profile.invoice_settings?.mobile_money_provider === 'M-Pesa' ? 'selected' : ''}>M-Pesa (Vodacom)</option>
                                        <option value="Airtel Money" ${profile.invoice_settings?.mobile_money_provider === 'Airtel Money' ? 'selected' : ''}>Airtel Money</option>
                                        <option value="Tigo Pesa" ${profile.invoice_settings?.mobile_money_provider === 'Tigo Pesa' ? 'selected' : ''}>Tigo Pesa / Mixx</option>
                                        <option value="HaloPesa" ${profile.invoice_settings?.mobile_money_provider === 'HaloPesa' ? 'selected' : ''}>HaloPesa</option>
                                        <option value="All Providers" ${profile.invoice_settings?.mobile_money_provider === 'All Providers' ? 'selected' : ''}>All Mobile Providers</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-gray-700 mb-1">Till Number (Buy Goods / Lipa Namba)</label>
                                    <input type="text" id="set_inv_momo_till" value="${profile.invoice_settings?.mobile_money_till || ''}" placeholder="e.g. 5894123" class="form-input w-full rounded-xl text-sm" oninput="window.saveSettings()">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-gray-700 mb-1">Paybill / Account No</label>
                                    <input type="text" id="set_inv_momo_paybill" value="${profile.invoice_settings?.mobile_money_paybill || ''}" placeholder="e.g. Paybill: 400200, Acc: INV#" class="form-input w-full rounded-xl text-sm" oninput="window.saveSettings()">
                                </div>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-700 mb-1">USSD / Mobile Payment Instructions</label>
                                <input type="text" id="set_inv_momo_instructions" value="${profile.invoice_settings?.mobile_money_instructions || ''}" placeholder="e.g. Piga *150*00# -> Lipa kwa Simu -> Weka Namba ya Lipa 5894123" class="form-input w-full rounded-xl text-sm" oninput="window.saveSettings()">
                            </div>
                        </div>

                        <!-- Bank Details -->
                        <div class="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                            <div class="flex items-center gap-2 text-gray-900">
                                <i data-lucide="landmark" class="w-4 h-4 text-gray-600"></i>
                                <h4 class="text-xs font-black uppercase tracking-widest">Bank Account Information</h4>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label class="block text-xs font-bold text-gray-700 mb-1">Bank Name</label>
                                    <input type="text" id="set_inv_bank_name" value="${profile.invoice_settings?.bank_name || ''}" placeholder="e.g. CRDB / NMB / Equity Bank" class="form-input w-full rounded-xl text-sm" oninput="window.saveSettings()">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-gray-700 mb-1">Account Number</label>
                                    <input type="text" id="set_inv_bank_acc" value="${profile.invoice_settings?.bank_account_no || ''}" placeholder="e.g. 0150244889900" class="form-input w-full rounded-xl text-sm font-mono" oninput="window.saveSettings()">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-gray-700 mb-1">SWIFT / Branch Code</label>
                                    <input type="text" id="set_inv_bank_swift" value="${profile.invoice_settings?.bank_swift || ''}" placeholder="e.g. CORUTZTZ" class="form-input w-full rounded-xl text-sm font-mono" oninput="window.saveSettings()">
                                </div>
                            </div>
                        </div>

                        <!-- Footer & Notes -->
                        <div>
                            <label class="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">Invoice Footer Note / Disclaimer</label>
                            <textarea id="set_inv_notes" rows="3" class="form-input w-full rounded-xl text-sm" placeholder="e.g. Thank you for your business! Goods once sold are not returnable after 7 days." oninput="window.saveSettings()">${profile.invoice_settings?.notes || 'Thank you for your business!'}</textarea>
                        </div>
                        ` : window.renderFeatureLock('Custom Invoice & Document Studio', 'Enterprise')}
                    </div>

                    <!-- Tab Content: Security & Billing -->
                    <div id="content-security" class="${activeTab === 'security' ? 'block' : 'hidden'} p-8">
                        <h3 class="text-lg font-bold text-gray-900 mb-6 font-primary">Security & Billing</h3>

                        <div id="billingSettingsContainer" class="w-full pb-8 border-b border-gray-100 mb-8">
                            <!-- Billing UI injected here by billing.js -->
                        </div>

                        <div class="mb-8 space-y-4">
                            <h4 class="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Account Security</h4>
                            
                            <!-- 2FA Card -->
                            <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-750 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-indigo-100 transition-all hover:shadow-sm gap-3 overflow-hidden">
                                <div class="flex items-center gap-3.5 min-w-0 flex-1">
                                    <div class="w-10 h-10 rounded-xl bg-white dark:bg-gray-700 shadow-sm flex items-center justify-center text-indigo-500 shrink-0">
                                        <i data-lucide="shield-check" class="w-5 h-5"></i>
                                    </div>
                                    <div class="min-w-0 flex-1">
                                        <p class="font-bold text-sm text-gray-900 dark:text-white">Two-Factor Authentication (2FA)</p>
                                        <p class="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed break-words">Extra security layer for your owner account</p>
                                    </div>
                                </div>
                                <label class="relative inline-flex items-center cursor-pointer shrink-0">
                                    <input type="checkbox" id="set_two_factor" class="sr-only peer" ${profile.two_factor ? 'checked' : ''}>
                                    <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 shadow-inner"></div>
                                </label>
                            </div>

                            <!-- Password & Authentication Card -->
                            <div class="p-4 sm:p-5 bg-gray-50 dark:bg-gray-750 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4 overflow-hidden">
                                <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5">
                                    <div class="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                                        <div class="w-10 h-10 rounded-xl bg-white dark:bg-gray-700 shadow-sm flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5 sm:mt-0">
                                            <i data-lucide="key-round" class="w-5 h-5"></i>
                                        </div>
                                        <div class="min-w-0 flex-1">
                                            <p class="font-bold text-sm text-gray-900 dark:text-white">Password & Authentication</p>
                                            <p class="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed break-words">
                                                Update your account password or send a password reset email link.
                                            </p>
                                        </div>
                                    </div>
                                    <div class="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0 pt-1 md:pt-0">
                                        <button type="button" onclick="window.togglePasswordChangeForm?.()" id="togglePasswordChangeBtn" class="flex-1 sm:flex-initial px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap">
                                            <i data-lucide="lock" class="w-3.5 h-3.5"></i> Change Password
                                        </button>
                                        <button type="button" onclick="window.handleSendPasswordResetEmail?.()" id="sendResetEmailBtn" title="Send reset link to your registered email" class="flex-1 sm:flex-initial px-3.5 py-2 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 font-bold text-xs rounded-xl shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap">
                                            <i data-lucide="mail" class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400"></i> Send Reset Link
                                        </button>
                                    </div>
                                </div>

                                <!-- Collapsible In-App Password Update Form -->
                                <div id="passwordChangeFormContainer" class="hidden pt-4 border-t border-gray-200/80 dark:border-gray-700/80 space-y-4">
                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">New Password</label>
                                            <div class="relative">
                                                <input type="password" id="sec_new_password" placeholder="Enter new password (min. 6 chars)" class="form-input w-full rounded-xl pr-10 text-sm">
                                                <button type="button" onclick="window.togglePasswordInputVisibility?.('sec_new_password', this)" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                                                    <i data-lucide="eye" class="w-4 h-4"></i>
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Confirm New Password</label>
                                            <div class="relative">
                                                <input type="password" id="sec_confirm_password" placeholder="Repeat new password" class="form-input w-full rounded-xl pr-10 text-sm">
                                                <button type="button" onclick="window.togglePasswordInputVisibility?.('sec_confirm_password', this)" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                                                    <i data-lucide="eye" class="w-4 h-4"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="flex items-center justify-end gap-2.5 pt-1">
                                        <button type="button" onclick="window.togglePasswordChangeForm?.(false)" class="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                                            Cancel
                                        </button>
                                        <button type="button" id="submitUpdatePasswordBtn" onclick="window.handleUpdateSecurityPassword?.()" class="px-5 py-2 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer">
                                            <i data-lucide="check" class="w-3.5 h-3.5"></i> Save New Password
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Danger Zone: Account Deletion -->
                        <div>
                            <h4 class="text-xs font-black text-red-500 uppercase tracking-[0.2em] mb-4">Danger Zone</h4>
                            <div class="p-5 rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div class="space-y-1">
                                    <h5 class="text-sm font-bold text-red-900 dark:text-red-300 flex items-center gap-2">
                                        <i data-lucide="alert-triangle" class="w-4 h-4 text-red-600"></i>
                                        Delete Business Account
                                    </h5>
                                    <p class="text-xs text-red-700/80 dark:text-red-400/80 max-w-xl leading-relaxed">
                                        Request permanent deletion of your business owner account, branches, inventory, and sales records. Includes a <strong>30-day recovery grace period</strong> where you can cancel and reactivate at any time.
                                    </p>
                                </div>
                                <button type="button" onclick="window.openAccountDeletionModal?.()"
                                    class="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all active:scale-95 whitespace-nowrap flex items-center gap-1.5 cursor-pointer flex-shrink-0">
                                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Delete Account
                                </button>
                            </div>
                        </div>
                    </div>

                </form>

            </div>
        </div>
    </div>`;

    setTimeout(() => {
        const wrap = main.querySelector('.opacity-0');
        if (wrap) {
            wrap.classList.remove('opacity-0', 'translate-y-4');
        }
    }, 10);

    if (window.lucide) window.lucide.createIcons();

    if (activeTab === 'security') {
        setTimeout(() => {
            renderOwnerBilling();
        }, 50);
    }

    ['set_hours_open', 'set_hours_close'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', () => window.saveSettings());
    });

    const form = document.getElementById('settingsForm');
    if (form) {
        form.addEventListener('input', (e) => {
            if (e.target.matches('input, textarea, select')) {
                window.activeSettingsInput = e.target;
                window.saveSettings();
            }
        });

        form.addEventListener('change', (e) => {
            if (e.target.matches('input, textarea, select')) {
                window.activeSettingsInput = e.target;
                window.saveSettings();
            }
        });

        if (typeof window.attachClickToEditIndicators === 'function') {
            window.attachClickToEditIndicators(form);
        }
    }
};

export function switchSettingsTab(tabName) {

    state.settingsTab = tabName;

    const iconMap = {
        'personal': 'user',
        'business': 'building-2',
        'preferences': 'sliders',
        'invoicing': 'receipt',
        'security': 'shield'
    };

    ['personal', 'business', 'preferences', 'invoicing', 'security'].forEach(tab => {
        const btn = document.getElementById('tab-' + tab);
        const iconName = iconMap[tab];
        const content = document.getElementById('content-' + tab);

        if (!btn || !content) return;

        if (tab === tabName) {
            btn.className = `flex-shrink-0 whitespace-nowrap flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 shadow-sm border border-indigo-100 dark:border-indigo-800/60`;
            const iconWrap = btn.querySelector('svg, i');
            if (iconWrap) iconWrap.outerHTML = `<i data-lucide="${iconName}" class="w-4 h-4 text-indigo-600 dark:text-indigo-400"></i>`;
            content.classList.remove('hidden');
            content.classList.add('block');
        } else {
            btn.className = `flex-shrink-0 whitespace-nowrap flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50`;
            const iconWrap = btn.querySelector('svg, i');
            if (iconWrap) iconWrap.outerHTML = `<i data-lucide="${iconName}" class="w-4 h-4 text-gray-400"></i>`;
            content.classList.add('hidden');
            content.classList.remove('block');
        }
    });

    if (window.lucide) window.lucide.createIcons();

    if (tabName === 'security') {
        setTimeout(() => renderOwnerBilling(), 50);
    }
}

export function highlightMissingFields(fieldIds) {
    if (!fieldIds || !fieldIds.length) return;

    fieldIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add('ring-2', 'ring-red-500', 'border-red-500', 'animate-pulse');
            el.addEventListener('focus', () => {
                el.classList.remove('ring-2', 'ring-red-500', 'border-red-500', 'animate-pulse');
            }, { once: true });
        }
    });

    const firstEl = document.getElementById(fieldIds[0]);
    if (firstEl) {
        firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstEl.focus();
    }
}

window.setInvoiceColorPalette = function(colorHex) {
    const picker = document.getElementById('set_inv_brand_color');
    const text = document.getElementById('set_inv_brand_color_text');
    if (picker) picker.value = colorHex;
    if (text) text.textContent = colorHex.toUpperCase();
    window.saveSettings();
};

window.handleInvoiceLogoUpload = function(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
        showToast('Logo file too large (max 15MB)', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const maxDimension = 280;
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > maxDimension) {
                    height = Math.round((height * maxDimension) / width);
                    width = maxDimension;
                }
            } else {
                if (height > maxDimension) {
                    width = Math.round((width * maxDimension) / height);
                    height = maxDimension;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.82); // heavily compressed (<30KB)
            
            const hidden = document.getElementById('set_inv_logo_data');
            const preview = document.getElementById('inv_logo_preview');
            const removeBtn = document.getElementById('inv_logo_remove_btn');
            if (hidden) hidden.value = compressed;
            if (preview) preview.innerHTML = `<img src="${compressed}" class="max-h-full max-w-full object-contain">`;
            if (removeBtn) removeBtn.classList.remove('hidden');
            
            showToast('Invoice logo compressed & uploaded!', 'success');
            window.saveSettings();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
};

window.removeInvoiceLogo = function() {
    const hidden = document.getElementById('set_inv_logo_data');
    const preview = document.getElementById('inv_logo_preview');
    const removeBtn = document.getElementById('inv_logo_remove_btn');
    if (hidden) hidden.value = '';
    if (preview) preview.innerHTML = '<i data-lucide="image" class="w-8 h-8 text-gray-300"></i>';
    if (removeBtn) removeBtn.classList.add('hidden');
    if (window.lucide) window.lucide.createIcons();
    showToast('Invoice logo removed', 'info');
    window.saveSettings();
};

let ownerAutoSaveTimeout = null;
let ownerIndicatorTimeout = null;
window.activeSettingsInput = null;

export async function saveSettings() {
    const mainIndicator = document.getElementById('ownerSaveIndicator');
    const inputIndicator = window.activeSettingsInput;

    if (mainIndicator) {
        clearTimeout(ownerIndicatorTimeout);
        mainIndicator.innerHTML = '<span class="text-indigo-600">Saving...</span>';
        mainIndicator.classList.remove('opacity-0', 'bg-emerald-50', 'bg-red-50');
        mainIndicator.classList.add('opacity-100', 'bg-indigo-50');
    }

    if (inputIndicator && typeof showInlineSaveIndicator === 'function') {
        showInlineSaveIndicator(inputIndicator, 'saving');
    }

    clearTimeout(ownerAutoSaveTimeout);
    ownerAutoSaveTimeout = setTimeout(async () => {

        const personal = {
            full_name: document.getElementById('set_full_name')?.value.trim() || '',
            mobile_number: document.getElementById('set_mobile_number')?.value.trim() || '',
            avatar_url: document.getElementById('set_avatar_url')?.value.trim() || ''
        };

        const business = {
            business_name: document.getElementById('set_business_name')?.value.trim() || '',
            industry: document.getElementById('set_industry')?.value || '',
            tax_id: document.getElementById('set_tax_id')?.value.trim() || '',
            currency: document.getElementById('set_currency')?.value || 'USD',
            timezone: document.getElementById('set_timezone')?.value || 'UTC',
            street_address: document.getElementById('set_street_address')?.value.trim() || '',
            city: document.getElementById('set_city')?.value.trim() || '',
            zip_code: document.getElementById('set_zip_code')?.value.trim() || '',
            brand_color: document.getElementById('set_brand_color')?.value.trim() || '',
            logo_url: document.getElementById('set_logo_url')?.value.trim() || ''
        };

        const prefs = {
            default_target: fmt.parseNumber(document.getElementById('set_default_target')?.value) || 10000,
            receipt_text: document.getElementById('set_receipt_text')?.value.trim() || '',
            operating_hours: JSON.stringify({
                open: document.getElementById('set_hours_open')?.value || '08:00',
                close: document.getElementById('set_hours_close')?.value || '18:00'
            })
        };

        const invoiceSettings = {
            brand_color: document.getElementById('set_inv_brand_color')?.value || '#4f46e5',
            logo_data: document.getElementById('set_inv_logo_data')?.value || null,
            tax_pin: document.getElementById('set_inv_tax_pin')?.value.trim() || '',
            mobile_money_provider: document.getElementById('set_inv_momo_provider')?.value || 'M-Pesa',
            mobile_money_till: document.getElementById('set_inv_momo_till')?.value.trim() || '',
            mobile_money_paybill: document.getElementById('set_inv_momo_paybill')?.value.trim() || '',
            mobile_money_account_no: document.getElementById('set_inv_momo_account')?.value.trim() || '',
            mobile_money_instructions: document.getElementById('set_inv_momo_instructions')?.value.trim() || '',
            bank_name: document.getElementById('set_inv_bank_name')?.value.trim() || '',
            bank_account_no: document.getElementById('set_inv_bank_acc')?.value.trim() || '',
            bank_swift: document.getElementById('set_inv_bank_swift')?.value.trim() || '',
            payment_terms: document.getElementById('set_inv_terms')?.value.trim() || 'Due upon receipt',
            notes: document.getElementById('set_inv_notes')?.value.trim() || 'Thank you for your business!'
        };

        const security = {
            two_factor: document.getElementById('set_two_factor')?.checked ?? false
        };

        const payload = {
            ...personal,
            ...business,
            ...prefs,
            invoice_settings: invoiceSettings,
            ...security
        };

        try {
            const updatedProfile = await dbProfile.upsert(state.ownerId, payload);

            state.profile = updatedProfile;

            window.applyCustomBranding?.();

            document.getElementById('currentUser').textContent = updatedProfile.full_name || state.currentUser;

            window.updateSidebarAvatar?.();

            if (mainIndicator) {
                mainIndicator.innerHTML = '<i data-lucide="check-circle" class="w-3 h-3 text-emerald-500"></i> <span class="text-emerald-600">Saved!</span>';
                mainIndicator.classList.remove('bg-indigo-50', 'bg-red-50');
                mainIndicator.classList.add('bg-emerald-50');
                if (window.lucide) window.lucide.createIcons();

                ownerIndicatorTimeout = setTimeout(() => {
                    mainIndicator.classList.remove('opacity-100');
                    mainIndicator.classList.add('opacity-0');
                }, 2500);
            }

            if (inputIndicator && typeof showInlineSaveIndicator === 'function') {
                showInlineSaveIndicator(inputIndicator, 'saved');
            }
        } catch (err) {
            console.error('Auto-save Settings Error:', err);
            if (mainIndicator) {
                mainIndicator.innerHTML = '<i data-lucide="alert-circle" class="w-3 h-3 text-red-500"></i> <span class="text-red-600">Failed</span>';
                mainIndicator.classList.remove('bg-indigo-50', 'bg-emerald-50');
                mainIndicator.classList.add('bg-red-50');
                if (window.lucide) window.lucide.createIcons();
            }

            if (inputIndicator && typeof showInlineSaveIndicator === 'function') {
                showInlineSaveIndicator(inputIndicator, 'error');
            }
            showToast('Failed to save settings: ' + err.message, 'error');
        }
    }, 1000);
};

export function handleAvatarUpload(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];

        if (file.size > 20 * 1024 * 1024) {
            showToast('Image is too large (max 20MB)', 'error');
            input.value = '';
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            showToast('Compressing large image...', 'info');
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                const size = 200;
                canvas.width = size;
                canvas.height = size;

                let sourceX, sourceY, sourceWidth, sourceHeight;
                if (img.width > img.height) {
                    sourceHeight = img.height;
                    sourceWidth = img.height;
                    sourceX = (img.width - img.height) / 2;
                    sourceY = 0;
                } else {
                    sourceWidth = img.width;
                    sourceHeight = img.width;
                    sourceX = 0;
                    sourceY = (img.height - img.width) / 2;
                }

                ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, size, size);

                const finalBase64 = canvas.toDataURL('image/jpeg', 0.85);

                const preview = document.getElementById('avatar_preview');
                if (preview) {
                    preview.innerHTML = `<img src="${finalBase64}" class="w-full h-full object-cover">`;
                }

                const hiddenInput = document.getElementById('set_avatar_url');
                if (hiddenInput) {
                    hiddenInput.value = finalBase64;
                    window.saveSettings();
                }

                updateAvatarControls(true);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
};

export function removeAvatar() {
    const hiddenInput = document.getElementById('set_avatar_url');
    if (hiddenInput) {
        hiddenInput.value = '';
    }

    const preview = document.getElementById('avatar_preview');
    if (preview) {
        const profile = state.profile || {};
        preview.innerHTML = profile.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U';
    }

    updateAvatarControls(false);
    window.saveSettings();
};

export function updateAvatarControls(hasImage) {
    const container = document.getElementById('avatar_controls');
    if (!container) return;

    const buttonGroup = container.querySelector('.flex.items-center.gap-2');
    if (!buttonGroup) return;

    if (hasImage) {
        buttonGroup.innerHTML = `
            <button type="button" onclick="document.getElementById('set_avatar_file').click()" class="text-xs font-bold text-indigo-600 hover:text-indigo-700 px-3 py-1.5 bg-indigo-50 rounded-lg border border-indigo-100 transition-colors">
                Replace
            </button>
            <button type="button" onclick="removeAvatar()" class="text-xs font-bold text-red-600 hover:text-red-700 px-3 py-1.5 bg-red-50 rounded-lg border border-red-100 transition-colors">
                Remove
            </button>
        `;
    } else {
        buttonGroup.innerHTML = `
            <button type="button" onclick="document.getElementById('set_avatar_file').click()" class="text-xs font-bold text-indigo-600 hover:text-indigo-700 px-3 py-1.5 bg-indigo-50 rounded-lg border border-indigo-100 transition-colors">
                Choose Image from Files
            </button>
        `;
    }
};

export function applyLiveBrandColor(color) {
    if (!state.profile) state.profile = {};
    state.profile.brand_color = color;
    if (typeof window.applyCustomBranding === 'function') {
        window.applyCustomBranding();
    }
}

window.applyLiveBrandColor = applyLiveBrandColor;
window.switchSettingsTab = switchSettingsTab;
window.highlightMissingFields = highlightMissingFields;
window.saveSettings = saveSettings;
window.handleAvatarUpload = handleAvatarUpload;
window.removeAvatar = removeAvatar;

window.togglePasswordChangeForm = function(forceState) {
    const container = document.getElementById('passwordChangeFormContainer');
    if (!container) return;
    if (typeof forceState === 'boolean') {
        if (forceState) container.classList.remove('hidden');
        else container.classList.add('hidden');
    } else {
        container.classList.toggle('hidden');
    }
    if (window.lucide) window.lucide.createIcons({ scope: container });
};

window.togglePasswordInputVisibility = function(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        if (btn) btn.innerHTML = '<i data-lucide="eye-off" class="w-4 h-4"></i>';
    } else {
        input.type = 'password';
        if (btn) btn.innerHTML = '<i data-lucide="eye" class="w-4 h-4"></i>';
    }
    if (window.lucide) window.lucide.createIcons({ scope: btn });
};

window.handleUpdateSecurityPassword = async function() {
    const newPass = document.getElementById('sec_new_password')?.value || '';
    const confirmPass = document.getElementById('sec_confirm_password')?.value || '';

    if (!newPass || newPass.length < 6) {
        showToast('Password must be at least 6 characters long', 'warning');
        document.getElementById('sec_new_password')?.focus();
        return;
    }

    if (newPass !== confirmPass) {
        showToast('Passwords do not match. Please re-type to confirm.', 'warning');
        document.getElementById('sec_confirm_password')?.focus();
        return;
    }

    const btn = document.getElementById('submitUpdatePasswordBtn');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> Updating...';
        if (window.lucide) window.lucide.createIcons({ scope: btn });
    }

    try {
        const { error } = await supabase.auth.updateUser({ password: newPass });
        if (error) throw error;

        showToast('Password updated successfully!', 'success');
        const pass1 = document.getElementById('sec_new_password');
        const pass2 = document.getElementById('sec_confirm_password');
        if (pass1) pass1.value = '';
        if (pass2) pass2.value = '';
        window.togglePasswordChangeForm(false);
    } catch (err) {
        console.error('Failed to update password:', err);
        showToast('Failed to update password: ' + err.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origHtml || '<i data-lucide="check" class="w-3.5 h-3.5"></i> Save New Password';
            if (window.lucide) window.lucide.createIcons({ scope: btn });
        }
    }
};

window.handleSendPasswordResetEmail = async function() {
    const userEmail = state.profile?.email || state.currentUser;
    if (!userEmail || !userEmail.includes('@')) {
        showToast('No valid email address found for this account', 'error');
        return;
    }

    const btn = document.getElementById('sendResetEmailBtn');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> Sending...';
        if (window.lucide) window.lucide.createIcons({ scope: btn });
    }

    try {
        const redirectUrl = `${window.location.origin}/app/`;
        const { error } = await supabase.auth.resetPasswordForEmail(userEmail, { redirectTo: redirectUrl });
        if (error) throw error;

        showToast(`Password reset link sent to ${userEmail}! Please check your inbox.`, 'success');
    } catch (err) {
        console.error('Failed to send reset link:', err);
        showToast('Failed to send reset email: ' + err.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origHtml || '<i data-lucide="mail" class="w-3.5 h-3.5 text-indigo-600"></i> Send Reset Link';
            if (window.lucide) window.lucide.createIcons({ scope: btn });
        }
    }
};
