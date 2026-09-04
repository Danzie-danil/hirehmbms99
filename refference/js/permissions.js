// Multi-Platform Permissions & Push Notifications Engine for BMSTz (iOS, Android & Desktop Browsers)

export function isIOSDevice() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isPWAStandalone() {
    return window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}

export function isPushNotificationsEnabled() {
    if (localStorage.getItem('bmstz_push_enabled') === 'false') return false;
    return 'Notification' in window && Notification.permission === 'granted';
}

export async function requestNotificationPermission(showToastOnSuccess = true) {
    const isIOS = isIOSDevice();

    if (!('Notification' in window)) {
        console.warn('[Permissions] Notification API not available in this context');
        if (isIOS && !isPWAStandalone()) {
            if (window.showToast) {
                window.showToast(window.t('ios_push_pwa_required', 'On iOS, tap Share -> "Add to Home Screen" to enable push notifications'), 'warning');
            }
        } else {
            if (window.showToast) {
                window.showToast(window.t('notif_not_supported', 'Push notifications are not supported on this browser/device'), 'info');
            }
        }
        return false;
    }

    if (Notification.permission === 'granted') {
        localStorage.setItem('bmstz_push_enabled', 'true');
        if (showToastOnSuccess && window.showToast) {
            window.showToast(window.t('notif_already_enabled', 'Push notifications are enabled'), 'info');
        }
        return true;
    }

    if (Notification.permission === 'denied') {
        console.warn('[Permissions] Notification permission is blocked');
        localStorage.setItem('bmstz_push_enabled', 'false');
        if (window.showToast) {
            const platformName = isIOS ? 'iOS Settings' : 'Android browser settings';
            window.showToast(window.t('notif_permission_denied', `Push notifications are blocked. Enable permissions in your ${platformName}.`), 'warning');
        }
        return false;
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            localStorage.setItem('bmstz_push_enabled', 'true');
            if (showToastOnSuccess && window.showToast) {
                window.showToast(window.t('notif_enabled_success', 'Push notifications enabled successfully'), 'success');
            }

            // Trigger welcome push notification
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then(reg => {
                    reg.showNotification('BMSTz Alerts Active', {
                        body: 'You will now receive real-time push alerts for sales, low stock, and task updates.',
                        icon: '/bmtzofficiallogo.png',
                        badge: '/bmtzofficiallogo.png',
                        tag: 'bmstz-welcome-notif'
                    }).catch(e => console.warn('[SW Notification Error]', e));
                });
            } else {
                try {
                    new Notification('BMSTz Alerts Active', {
                        body: 'You will now receive real-time push alerts for sales, low stock, and task updates.',
                        icon: '/bmtzofficiallogo.png'
                    });
                } catch (e) {
                    console.warn('[Notification Error]', e);
                }
            }
            return true;
        } else {
            localStorage.setItem('bmstz_push_enabled', 'false');
            if (window.showToast) {
                window.showToast(window.t('notif_not_granted', 'Push notification permission was not granted.'), 'info');
            }
            return false;
        }
    } catch (err) {
        console.error('[Permissions] Error requesting Notification permission:', err);
        return false;
    }
}

export async function requestCameraPermission(showToastOnSuccess = false) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('[Permissions] getUserMedia not supported in this browser context');
        if (window.showToast) window.showToast(window.t('camera_not_supported', 'Camera access is not supported on this browser/device'), 'error');
        return false;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } }
        });
        
        // Stop stream tracks immediately so barcode libraries can claim device camera cleanly
        stream.getTracks().forEach(track => track.stop());

        if (showToastOnSuccess && window.showToast) {
            window.showToast(window.t('camera_permission_granted', 'Camera permission granted'), 'success');
        }
        return true;
    } catch (err) {
        console.warn('[Permissions] Camera permission result:', err.name, err.message);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            if (window.showToast) {
                window.showToast(window.t('camera_permission_denied', 'Camera access denied. Please allow camera permissions in browser/device settings.'), 'error');
            }
        } else if (err.name === 'NotFoundError') {
            if (window.showToast) {
                window.showToast(window.t('camera_not_found', 'No camera detected on this device.'), 'error');
            }
        }
        return false;
    }
}

export async function handleTogglePushNotifications(enabled) {
    const switches = document.querySelectorAll('.togglePushNotificationsSwitch');

    if (enabled) {
        const granted = await requestNotificationPermission(true);
        if (granted) {
            localStorage.setItem('bmstz_push_enabled', 'true');
            switches.forEach(s => s.checked = true);
        } else {
            localStorage.setItem('bmstz_push_enabled', 'false');
            switches.forEach(s => s.checked = false);
        }
    } else {
        localStorage.setItem('bmstz_push_enabled', 'false');
        switches.forEach(s => s.checked = false);
        if (window.showToast) {
            window.showToast(window.t('push_notifications_disabled', 'Push notifications disabled'), 'info');
        }
    }
}

export function getUserNotificationPreferences() {
    try {
        const stored = localStorage.getItem('bms_notif_prefs');
        if (stored) return JSON.parse(stored);
    } catch (e) {}
    return {
        branch_shift_open: true,
        branch_tasks_check: true,
        branch_midday_restock: true,
        branch_shift_close: true,
        branch_daily_report: true,
        owner_morning: true,
        owner_credit_followup: true,
        owner_midday: true,
        owner_transfers_check: true,
        owner_evening: true,
        low_stock_sentinel: true
    };
}

export async function handleToggleNotificationPreference(slotKey, isEnabled) {
    const currentPrefs = getUserNotificationPreferences();
    currentPrefs[slotKey] = isEnabled;
    try {
        localStorage.setItem('bms_notif_prefs', JSON.stringify(currentPrefs));
    } catch (e) {}

    // Reconcile with Supabase sys_push_subscriptions for current active endpoint
    try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            if (sub && sub.endpoint) {
                const endpoint = sub.endpoint;
                const supabaseClient = window.supabase || window.supabaseClient;
                if (supabaseClient) {
                    await supabaseClient.rpc('update_device_push_preferences', {
                        p_endpoint: endpoint,
                        p_preferences: currentPrefs
                    });
                }
            }
        }
    } catch (err) {
        console.warn('[Push Preferences] Sync error:', err.message);
    }

    if (window.showToast) {
        window.showToast(isEnabled ? 'Notification category enabled' : 'Notification category muted', 'success');
    }
}

export function renderPushNotificationSettingsCard() {
    const isEnabled = isPushNotificationsEnabled();
    const isIOS = isIOSDevice();
    const isStandalone = isPWAStandalone();
    const userRole = (window.state?.role || window.state?.profile?.role || 'branch').toLowerCase();
    const isOwner = userRole === 'owner' || userRole === 'sysadmin';
    const prefs = getUserNotificationPreferences();

    const ownerCategories = [
        { key: 'owner_morning', icon: 'sun', title: 'Morning Briefing ☀️', desc: 'Opening status, staff attendance & pending requests' },
        { key: 'owner_midday', icon: 'bar-chart-3', title: 'Midday Sales Pulse 📊', desc: 'Live gross sales, revenue totals & cashier check-ins' },
        { key: 'owner_transfers_check', icon: 'truck', title: 'Restock & Transfer Approvals 🚚', desc: 'Branch restock requests & central dispatch approvals' },
        { key: 'owner_credit_followup', icon: 'wallet', title: 'Credit & Debtor Follow-up 💰', desc: 'Overdue customer credit balances & scheduled collections' },
        { key: 'owner_evening', icon: 'moon', title: 'Daily Revenue Settlement 🌙', desc: 'Closing revenue, gross profit & reconciled drawers' },
        { key: 'low_stock_sentinel', icon: 'alert-triangle', title: 'Low Stock & Reorder Alerts ⚠️', desc: 'Catalog threshold warnings & out-of-stock items' }
    ];

    const branchCategories = [
        { key: 'branch_shift_open', icon: 'sun', title: 'Shift & Till Opening ☀️', desc: 'Morning till balance verification & shift start reminder' },
        { key: 'branch_tasks_check', icon: 'check-square', title: 'Daily Tasks & Objectives 📋', desc: 'New tasks and performance targets from management' },
        { key: 'branch_midday_restock', icon: 'package', title: 'Midday Stock Pulse 📦', desc: 'Fast-selling items inspection & branch restock request check' },
        { key: 'branch_shift_close', icon: 'bell', title: 'Shift Closing & Till Count 🔔', desc: 'End of day cash drawer reconciliation & shift closing' },
        { key: 'branch_daily_report', icon: 'file-text', title: 'Daily Work Handover 📝', desc: 'Submission confirmation for daily sales, expenses & summaries' },
        { key: 'low_stock_sentinel', icon: 'alert-triangle', title: 'Low Stock Alerts ⚠️', desc: 'Branch inventory reorder level reminders' }
    ];

    const activeList = isOwner ? ownerCategories : branchCategories;

    return `
    <div class="bg-white dark:bg-gray-800/90 p-5 sm:p-6 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs space-y-4">
        <div class="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-700/80">
            <div class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
                <i data-lucide="bell-ring" class="w-5 h-5"></i>
            </div>
            <div>
                <h4 class="font-extrabold text-gray-900 dark:text-white text-sm sm:text-base">${window.t('push_notifs_device_permissions', 'Push Notifications & Permissions')}</h4>
                <p class="text-xs text-gray-500 dark:text-gray-400">${window.t('manage_device_alerts_desc', 'Manage system alerts for iOS, Android, and Web Browsers')}</p>
            </div>
        </div>

        ${(isIOS && !isStandalone) ? `
        <div class="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300">
            <i data-lucide="apple" class="w-4 h-4 text-amber-600 shrink-0 mt-0.5"></i>
            <p><strong>iOS Web Push Note:</strong> To enable push notifications on iOS Safari, tap <strong>Share -> Add to Home Screen</strong>, then open BMSTz from your home screen.</p>
        </div>` : ''}

        <div class="space-y-3">
            <div class="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700/60">
                <div class="space-y-0.5">
                    <p class="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">${window.t('enable_push_alerts', 'Master Push Notifications')}</p>
                    <p class="text-[11px] text-gray-500 dark:text-gray-400">${window.t('receive_push_alerts_desc', 'Receive real-time push alerts on iOS, Android & Desktop')}</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" ${isEnabled ? 'checked' : ''} onchange="window.handleTogglePushNotifications(this.checked)" class="sr-only peer togglePushNotificationsSwitch">
                    <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-gray-600 peer-checked:bg-indigo-600"></div>
                </label>
            </div>

            <!-- Granular Opt-in / Opt-out Category Controls -->
            <div class="pt-2">
                <p class="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2.5 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <i data-lucide="sliders" class="w-3.5 h-3.5 text-indigo-500"></i>
                    <span>Notification Categories (Opt-In / Opt-Out)</span>
                </p>
                <div class="space-y-2">
                    ${activeList.map(cat => {
                        const isCatEnabled = prefs[cat.key] !== false;
                        return `
                        <div class="flex items-center justify-between p-3 bg-white dark:bg-gray-900/30 rounded-xl border border-gray-100 dark:border-gray-800 transition-all hover:border-gray-200 dark:hover:border-gray-700">
                            <div class="flex items-center gap-2.5 min-w-0 pr-2">
                                <div class="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 flex items-center justify-center shrink-0">
                                    <i data-lucide="${cat.icon}" class="w-3.5 h-3.5"></i>
                                </div>
                                <div class="min-w-0">
                                    <p class="text-xs font-bold text-gray-900 dark:text-white truncate">${cat.title}</p>
                                    <p class="text-[10px] text-gray-400 dark:text-gray-500 truncate">${cat.desc}</p>
                                </div>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer shrink-0">
                                <input type="checkbox" ${isCatEnabled ? 'checked' : ''} onchange="window.handleToggleNotificationPreference('${cat.key}', this.checked)" class="sr-only peer">
                                <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:after:border-gray-600 peer-checked:bg-emerald-600"></div>
                            </label>
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <div class="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700/60 mt-3">
                <div class="space-y-0.5">
                    <p class="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">${window.t('camera_permission', 'Camera Permissions')}</p>
                    <p class="text-[11px] text-gray-500 dark:text-gray-400">${window.t('camera_permission_desc', 'Required for scanning product barcodes and SKUs')}</p>
                </div>
                <button type="button" onclick="window.requestCameraPermission(true)" class="px-3 py-1.5 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5">
                    <i data-lucide="camera" class="w-3.5 h-3.5"></i>
                    <span>${window.t('test_camera', 'Test Camera')}</span>
                </button>
            </div>
        </div>
    </div>`;
}

export async function promptAndroidPermissionsIfNeeded() {
    if (sessionStorage.getItem('bmstz_permissions_prompted')) return;
    sessionStorage.setItem('bmstz_permissions_prompted', 'true');

    const needsNotif = 'Notification' in window && Notification.permission === 'default';

    if (!needsNotif) return;

    setTimeout(() => {
        if (window.openModal) {
            const isIOS = isIOSDevice();
            const platformTitle = isIOS ? 'Enable iOS Push Notifications' : 'Enable Device Permissions';
            
            const modalHtml = `
                <div class="p-6 text-center space-y-4 max-w-md mx-auto">
                    <div class="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                        <i data-lucide="bell-ring" class="w-7 h-7"></i>
                    </div>
                    <div>
                        <h3 class="text-base sm:text-lg font-black text-gray-900 dark:text-white">${platformTitle}</h3>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Enable real-time push alerts to receive vital business updates, sales alerts, and low stock notifications.</p>
                    </div>

                    <div class="bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-xl border border-gray-200/80 dark:border-gray-700/80 text-left space-y-2 text-xs">
                        <div class="flex items-center gap-2.5 text-gray-700 dark:text-gray-300 font-semibold">
                            <i data-lucide="bell" class="w-4 h-4 text-indigo-500 shrink-0"></i>
                            <span>Push Notifications & Real-Time Alerts</span>
                        </div>
                        <div class="flex items-center gap-2.5 text-gray-700 dark:text-gray-300 font-semibold">
                            <i data-lucide="camera" class="w-4 h-4 text-emerald-500 shrink-0"></i>
                            <span>Camera Access for Barcode Scanning</span>
                        </div>
                    </div>

                    <div class="flex gap-3 pt-2">
                        <button type="button" onclick="closeModal()" class="flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                            ${window.t('maybe_later', 'Maybe Later')}
                        </button>
                        <button type="button" onclick="window.handleGrantPermissionsFromModal()" class="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                            <i data-lucide="shield-check" class="w-4 h-4"></i>
                            <span>${window.t('enable_permissions', 'Enable Permissions')}</span>
                        </button>
                    </div>
                </div>
            `;
            window.openModal(modalHtml);
        }
    }, 1200);
}

window.handleGrantPermissionsFromModal = async function() {
    window.closeModal?.();
    await requestNotificationPermission(true);
    await requestCameraPermission(false);
};

window.getUserNotificationPreferences = getUserNotificationPreferences;
window.handleToggleNotificationPreference = handleToggleNotificationPreference;
window.isIOSDevice = isIOSDevice;
window.isPWAStandalone = isPWAStandalone;
window.isPushNotificationsEnabled = isPushNotificationsEnabled;
window.requestNotificationPermission = requestNotificationPermission;
window.requestCameraPermission = requestCameraPermission;
window.handleTogglePushNotifications = handleTogglePushNotifications;
window.renderPushNotificationSettingsCard = renderPushNotificationSettingsCard;
window.promptAndroidPermissionsIfNeeded = promptAndroidPermissionsIfNeeded;
