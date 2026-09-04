import { supabase } from './supabase.js';

// VAPID public key (safe to expose — this is the PUBLIC key by design)
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BNJ1FTRqt1o-s8HeQnURhp8plIz8tMUpORz-0dhbNQTAIJymY3mAzfMUWp6Km1mbIi6f-zSGxz17UZ5PL_QUo-g';

// Helper to convert base64 url string to Uint8Array for push manager applicationServerKey
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isStandalonePWA() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export function isPushSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function getPushPermissionStatus() {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission; // 'default', 'granted', 'denied'
}

function detectDeviceType() {
    const ua = navigator.userAgent || '';
    if (/tablet|ipad/i.test(ua)) return 'tablet';
    if (/mobile|android|iphone|ipod/i.test(ua)) return 'mobile';
    return 'desktop';
}

/**
 * Get a stable, per-user device UUID that is tied to the Supabase user ID.
 * This ensures deduplication works correctly even if localStorage is cleared.
 */
async function getStableDeviceUUID(userId) {
    const key = `bms_device_uuid_${userId}`;
    let deviceId = localStorage.getItem(key);
    if (!deviceId) {
        deviceId = typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : 'dev-' + Math.random().toString(36).substring(2) + Date.now();
        localStorage.setItem(key, deviceId);
    }
    return deviceId;
}

/**
 * Register push subscription to Supabase backend.
 * Requires an authenticated Supabase session.
 */
export async function syncPushSubscriptionWithServer(subscription) {
    if (!supabase) return false;
    try {
        // Ensure the user is authenticated before syncing
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            console.warn('[Push] Sync skipped — user not authenticated yet');
            return false;
        }

        let endpoint = '';
        let p256dh = '';
        let auth = '';

        if (subscription && typeof subscription.toJSON === 'function') {
            const subJson = subscription.toJSON();
            endpoint = subJson.endpoint || '';
            p256dh = subJson.keys?.p256dh || '';
            auth = subJson.keys?.auth || '';
        }

        if (!endpoint || !p256dh || !auth || endpoint.startsWith('https://bms.internal')) {
            console.warn('[Push] Sync skipped - browser did not provide a valid Web Push subscription');
            return false;
        }

        const userAgent = navigator.userAgent || '';
        const deviceType = detectDeviceType();
        const deviceUUID = await getStableDeviceUUID(user.id);
        const deviceFingerprint = `${user.id.substring(0, 8)}_${deviceUUID}`;
        const currentRole = window.state?.role || localStorage.getItem('bms_last_role') || 'owner';

        // 1. Try RPC first
        const { data, error } = await supabase.rpc('register_push_subscription', {
            p_endpoint: endpoint,
            p_p256dh: p256dh,
            p_auth: auth,
            p_user_agent: userAgent,
            p_device_type: deviceType,
            p_device_fingerprint: deviceFingerprint,
            p_app_version: '2.7.3'
        });

        if (error) {
            console.warn('[Push] RPC error, falling back to safe direct update:', error.message);
            try {
                // Check if a record already exists for this device_fingerprint or endpoint
                const { data: existing } = await supabase
                    .from('sys_push_subscriptions')
                    .select('id')
                    .eq('user_id', user.id)
                    .or(`device_fingerprint.eq.${deviceFingerprint},endpoint.eq.${endpoint}`)
                    .limit(1)
                    .maybeSingle();

                if (existing && existing.id) {
                    await supabase
                        .from('sys_push_subscriptions')
                        .update({
                            endpoint: endpoint,
                            p256dh: p256dh,
                            auth: auth,
                            role: currentRole,
                            user_agent: userAgent,
                            device_type: deviceType,
                            device_fingerprint: deviceFingerprint,
                            is_active: true,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', existing.id);
                } else {
                    await supabase.from('sys_push_subscriptions').upsert({
                        user_id: user.id,
                        role: currentRole,
                        endpoint: endpoint,
                        p256dh: p256dh,
                        auth: auth,
                        user_agent: userAgent,
                        device_type: deviceType,
                        device_fingerprint: deviceFingerprint,
                        is_active: true,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'endpoint' });
                }
                return true;
            } catch (fallbackErr) {
                console.warn('[Push] Direct update fallback error:', fallbackErr);
                return false;
            }
        }

        return !!(data && data.success);
    } catch (err) {
        console.warn('[Push] syncPushSubscriptionWithServer error:', err);
        return false;
    }
}

/**
 * Request notification permission and subscribe device with VAPID key.
 */
export async function requestPushPermissionAndSubscribe() {
    if (isIOS() && !isStandalonePWA()) {
        showIOSInstallPushGuide();
        return { success: false, reason: 'ios_pwa_required' };
    }

    if (!isPushSupported()) {
        return { success: false, reason: 'unsupported' };
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            return { success: false, reason: 'denied', permission };
        }

        let subscription = null;
        try {
            const reg = await navigator.serviceWorker.ready;
            subscription = await reg.pushManager.getSubscription();

            // If an existing subscription is present, ensure it works or refresh with new VAPID key
            if (subscription && VAPID_PUBLIC_KEY) {
                const subJson = subscription.toJSON();
                if (!subJson.keys || !subJson.keys.p256dh) {
                    await subscription.unsubscribe().catch(() => {});
                    subscription = null;
                }
            }

            if (!subscription) {
                // VAPID key is required for Chrome/Edge/Firefox/Safari on production HTTPS
                subscription = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
                }).catch(async (err) => {
                    console.warn('[Push] VAPID subscribe error, trying clean resubscribe:', err.message);
                    const existing = await reg.pushManager.getSubscription().catch(() => null);
                    if (existing) await existing.unsubscribe().catch(() => {});
                    return await reg.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
                    }).catch(() => null);
                });
            }
        } catch (swErr) {
            console.warn('[Push] PushManager subscription skipped:', swErr.message);
        }

        if (!subscription) {
            return { success: false, reason: 'subscribe_failed', permission };
        }

        const synced = await syncPushSubscriptionWithServer(subscription);
        return { success: synced, synced, subscription, reason: synced ? undefined : 'server_sync_failed' };
    } catch (err) {
        console.warn('[Push] Subscription failed:', err);
        return { success: false, reason: err.message || 'unknown_error' };
    }
}

/**
 * Trigger an instant local OS notification via Service Worker
 */
export async function showLocalPushNotification(title, options = {}) {
    if (!isPushSupported() || Notification.permission !== 'granted') {
        return false;
    }

    try {
        const reg = await navigator.serviceWorker.ready;
        const defaultOptions = {
            body: options.body || 'New notification from BMS',
            icon: options.icon || '/bmtzofficiallogo.png',
            badge: options.badge || '/bmtzofficiallogo.png',
            image: options.image_url || null,
            data: { url: options.target_url || '/app/' },
            vibrate: [100, 50, 100],
            tag: 'bms-local-' + Date.now(),
            renotify: true
        };
        await reg.showNotification(title, defaultOptions);
        return true;
    } catch (err) {
        console.warn('[Push] showLocalPushNotification error:', err);
        return false;
    }
}

/**
 * Display an intuitive guide for iOS Safari users to Add to Home Screen first
 */
export function showIOSInstallPushGuide() {
    if (document.getElementById('bms-ios-push-guide-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'bms-ios-push-guide-modal';
    modal.className = 'fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-300 opacity-0';
    modal.innerHTML = `
    <div class="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden transform scale-95 transition-transform duration-300 p-6 text-center space-y-4">
        <div class="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
            <i data-lucide="smartphone" class="w-7 h-7"></i>
        </div>
        <div class="space-y-1">
            <h3 class="text-lg font-black text-gray-900 dark:text-white">Enable iOS Push Alerts</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">
                Apple requires BMS to be added to your Home Screen to deliver background push notifications.
            </p>
        </div>
        <div class="bg-slate-50 dark:bg-gray-800/60 rounded-2xl p-4 text-left space-y-3 text-xs font-semibold text-gray-700 dark:text-gray-300 border border-slate-100 dark:border-gray-700/50">
            <div class="flex items-start gap-3">
                <span class="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-black shrink-0">1</span>
                <span>Tap the <strong class="text-indigo-600 dark:text-indigo-400">Share</strong> button <i data-lucide="share" class="w-3.5 h-3.5 inline"></i> at the bottom of Safari.</span>
            </div>
            <div class="flex items-start gap-3">
                <span class="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-black shrink-0">2</span>
                <span>Scroll down and tap <strong class="text-indigo-600 dark:text-indigo-400">"Add to Home Screen"</strong> <i data-lucide="plus-square" class="w-3.5 h-3.5 inline"></i>.</span>
            </div>
            <div class="flex items-start gap-3">
                <span class="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-black shrink-0">3</span>
                <span>Open <strong class="text-indigo-600 dark:text-indigo-400">BMS</strong> from your Home Screen & tap Enable Push!</span>
            </div>
        </div>
        <button onclick="document.getElementById('bms-ios-push-guide-modal')?.remove()" class="w-full py-2.5 px-4 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-black transition-all cursor-pointer">
            Got It!
        </button>
    </div>
    `;
    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();
    requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        const card = modal.querySelector('div');
        if (card) card.classList.remove('scale-95');
    });
}
window.showIOSInstallPushGuide = showIOSInstallPushGuide;

/**
 * Show a modern, aesthetic push notification permission prompt modal
 */
export function checkAndPromptPushPermission(force = false) {
    if (isIOS() && !isStandalonePWA()) {
        if (force) showIOSInstallPushGuide();
        return;
    }

    if (!isPushSupported()) return;

    if (Notification.permission === 'granted') {
        initPushNotifications();
        return;
    }

    if (Notification.permission === 'denied' && !force) {
        return;
    }

    const dismissedUntil = localStorage.getItem('bms_push_prompt_dismissed_until');
    if (!force && dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
        return;
    }

    // Don't duplicate if already open
    if (document.getElementById('bms-push-permission-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'bms-push-permission-modal';
    modal.className = 'fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 opacity-0';

    modal.innerHTML = `
    <div class="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden transform scale-95 transition-transform duration-300">
        <div class="p-5 sm:p-6 text-center space-y-4">
            <!-- Icon with glowing pulse -->
            <div class="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 relative">
                <i data-lucide="bell-ring" class="w-7 h-7 animate-bounce"></i>
            </div>

            <div class="space-y-1.5">
                <h3 class="text-base sm:text-lg font-black text-gray-900 dark:text-white tracking-tight">
                    Stay Instantly Informed
                </h3>
                <p class="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                    Enable push notifications to receive real-time sales alerts, stock warnings, and critical operational updates even when the app is in the background.
                </p>
            </div>

            <!-- Features Pill List -->
            <div class="bg-slate-50 dark:bg-gray-800/60 rounded-xl p-3 text-left space-y-1.5 border border-slate-100 dark:border-gray-700/50">
                <div class="flex items-center gap-2 text-[11px] font-bold text-gray-700 dark:text-gray-300">
                    <i data-lucide="check" class="w-3.5 h-3.5 text-emerald-500 shrink-0"></i>
                    <span>Real-time business & sales updates</span>
                </div>
                <div class="flex items-center gap-2 text-[11px] font-bold text-gray-700 dark:text-gray-300">
                    <i data-lucide="check" class="w-3.5 h-3.5 text-emerald-500 shrink-0"></i>
                    <span>Instant low stock & transfer alerts</span>
                </div>
                <div class="flex items-center gap-2 text-[11px] font-bold text-gray-700 dark:text-gray-300">
                    <i data-lucide="check" class="w-3.5 h-3.5 text-emerald-500 shrink-0"></i>
                    <span>Important administrative broadcasts</span>
                </div>
            </div>

            <!-- Actions -->
            <div class="space-y-2 pt-1">
                <button id="bmsAllowPushBtn" type="button" class="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-700 hover:to-purple-700 active:scale-95 text-white text-xs font-black shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer">
                    <i data-lucide="bell" class="w-4 h-4"></i>
                    <span>Enable Push Notifications</span>
                </button>

                <button id="bmsDismissPushBtn" type="button" class="w-full py-2 px-3 rounded-xl text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xs font-bold transition-colors cursor-pointer">
                    Maybe Later
                </button>
            </div>
        </div>
    </div>
    `;

    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();

    requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        const card = modal.querySelector('div');
        if (card) card.classList.remove('scale-95');
    });

    const closeModal = () => {
        modal.classList.add('opacity-0');
        const card = modal.querySelector('div');
        if (card) card.classList.add('scale-95');
        setTimeout(() => modal.remove(), 250);
    };

    modal.querySelector('#bmsAllowPushBtn')?.addEventListener('click', async () => {
        closeModal();
        const res = await requestPushPermissionAndSubscribe();
        if (res.success) {
            if (window.showToast) {
                window.showToast('Push notifications enabled successfully', 'success');
            }
        }
    });

    modal.querySelector('#bmsDismissPushBtn')?.addEventListener('click', () => {
        localStorage.setItem('bms_push_prompt_dismissed_until', String(Date.now() + 24 * 60 * 60 * 1000));
        closeModal();
    });
}

window.checkAndPromptPushPermission = checkAndPromptPushPermission;

/**
 * Auth-aware boot initialization.
 * Syncs subscription when permission is already granted AND user is authenticated.
 * If the session is not ready yet, waits for SIGNED_IN event.
 */
export async function initPushNotifications() {
    if (!isPushSupported()) return;

    if (Notification.permission === 'granted') {
        // Try immediately first
        const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

        if (user) {
            // User is authenticated — sync now
            try {
                let subscription = null;
                try {
                    const reg = await navigator.serviceWorker.ready;
                    subscription = await reg.pushManager.getSubscription();
                    // If no subscription exists yet (e.g. VAPID key just added), subscribe now
                    if (!subscription && VAPID_PUBLIC_KEY) {
                        subscription = await reg.pushManager.subscribe({
                            userVisibleOnly: true,
                            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
                        }).catch(() => null);
                    }
                } catch (e) {}
                await syncPushSubscriptionWithServer(subscription);
            } catch (e) {
                // Silent
            }
        } else {
            // Not authenticated yet — wait for sign-in then sync
            const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event) => {
                if (event === 'SIGNED_IN') {
                    if (authSub && typeof authSub.unsubscribe === 'function') {
                        try { authSub.unsubscribe(); } catch (e) {}
                    }
                    setTimeout(async () => {
                        try {
                            let pushSub = null;
                            try {
                                const reg = await navigator.serviceWorker.ready;
                                pushSub = await reg.pushManager.getSubscription();
                                if (!pushSub && VAPID_PUBLIC_KEY) {
                                    pushSub = await reg.pushManager.subscribe({
                                        userVisibleOnly: true,
                                        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
                                    }).catch(() => null);
                                }
                            } catch (e) {}
                            await syncPushSubscriptionWithServer(pushSub);
                        } catch (e) {}
                    }, 50);
                }
            });
        }
    } else if (Notification.permission === 'default') {
        // Prompt user after initial view load
        setTimeout(() => {
            checkAndPromptPushPermission(false);
        }, 2500);
    }

    // Push broadcast handling is unified via primary 'bms-live' channel
}

export async function handleIncomingPushPayload(notif) {
    try {
        if (!notif || !notif.title) return;
        const user = (await supabase.auth.getUser())?.data?.user;
        const targetAudience = notif.target_audience || 'all';

        // Audience validation
        if (targetAudience !== 'all' && user) {
            const isSysAdmin = state.role === 'sysadmin' || state.profile?.role === 'sysadmin';
            if (targetAudience === 'sysadmins' && !isSysAdmin) return;
        }

        // 1. Show native OS notification via Service Worker
        await showLocalPushNotification(notif.title, {
            body: notif.body,
            icon: notif.icon || '/bmtzofficiallogo.png',
            badge: notif.badge || '/bmtzofficiallogo.png',
            image_url: notif.image_url,
            target_url: notif.target_url || '/app/#view=overview'
        });

        // 2. If app window is focused, show an in-app notice toast
        if (document.visibilityState === 'visible' && window.showToast) {
            window.showToast(`${notif.title}: ${notif.body}`, 'info', 6000);
        }
    } catch (err) {
        console.warn('[Push] handleIncomingPushPayload error:', err);
    }
}
window.handleIncomingPushPayload = handleIncomingPushPayload;
