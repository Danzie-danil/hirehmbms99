import currentRelease from '../release_notes.json';
import { supabase } from './supabase.js';
import { localDb } from './data/db.js';
import { syncManager } from './data/syncManager.js';
import { isOnline } from './data/networkStatus.js';

export const APP_VERSION = '3.7.0';
const CURRENT_VERSION = (currentRelease && currentRelease.version) || APP_VERSION;
let isUpdateBannerActive = false;
let realtimeUpdateChannel = null;
let lastUpdateCheckAt = 0;
let updateCheckInFlight = null;
const UPDATE_CHECK_INTERVAL_MS = 10 * 60 * 1000;

/**
 * SemVer Comparator:
 * Returns true ONLY if `remote` is strictly newer/higher than `local`.
 * e.g. isNewerVersion('2.5.4', '2.5.3') => true
 *      isNewerVersion('2.5.3', '2.5.4') => false
 *      isNewerVersion('2.5.4', '2.5.4') => false
 */
export function isNewerVersion(remote, local) {
    if (!remote || !local) return false;
    const cleanRemote = String(remote).replace(/^v/i, '').trim();
    const cleanLocal = String(local).replace(/^v/i, '').trim();
    if (cleanRemote === cleanLocal) return false;

    const rParts = cleanRemote.split('.').map(n => parseInt(n, 10) || 0);
    const lParts = cleanLocal.split('.').map(n => parseInt(n, 10) || 0);
    const len = Math.max(rParts.length, lParts.length);

    for (let i = 0; i < len; i++) {
        const r = rParts[i] || 0;
        const l = lParts[i] || 0;
        if (r > l) return true;
        if (r < l) return false;
    }
    return false;
}

function triggerPushNotificationOnUpdate(version, bannerText) {
    try {
        if ('Notification' in window && Notification.permission === 'granted') {
            const title = `✨ BMSTz Update Available (v${version})`;
            const body = bannerText || `A new application update is ready with latest fixes and performance improvements.`;
            const options = {
                body: body,
                icon: '/bmtzofficiallogo.png',
                badge: '/bmtzofficiallogo.png',
                tag: `bms-update-${version}`,
                renotify: true,
                data: { url: window.location.origin + '/app/' }
            };

            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then(reg => {
                    reg.showNotification(title, options).catch(() => {});
                }).catch(() => {
                    try { new Notification(title, options); } catch (err) {}
                });
            } else {
                try { new Notification(title, options); } catch (err) {}
            }
        }
    } catch (e) {
        console.warn('[updateChecker] Auto push notification error:', e.message);
    }
}

/**
 * Initialise localStorage installed version tracking.
 */
function initInstalledVersionTracking() {
    const stored = localStorage.getItem('bms_installed_version');
    if (!stored) {
        localStorage.setItem('bms_installed_version', CURRENT_VERSION);
    } else if (isNewerVersion(CURRENT_VERSION, stored)) {
        // If bundle is newer than stored, upgrade stored installed version
        localStorage.setItem('bms_installed_version', CURRENT_VERSION);
    }
}

export function resolveRoleSpecificNotes(rawNotes, role) {
    if (!rawNotes) return [];
    if (Array.isArray(rawNotes)) return rawNotes;
    if (typeof rawNotes === 'object') {
        const userRole = role || (window.state && window.state.role) || localStorage.getItem('bms_last_role') || 'branch';
        if (Array.isArray(rawNotes[userRole]) && rawNotes[userRole].length > 0) {
            return rawNotes[userRole];
        }
        if (Array.isArray(rawNotes.default) && rawNotes.default.length > 0) {
            return rawNotes.default;
        }
        const firstArray = Object.values(rawNotes).find(v => Array.isArray(v) && v.length > 0);
        if (firstArray) return firstArray;
    }
    return typeof rawNotes === 'string' ? [rawNotes] : [];
}

export function resolveRoleSpecificBanner(remoteData, role) {
    if (!remoteData) return 'A new application update is ready with latest fixes and performance improvements.';
    const userRole = role || (window.state && window.state.role) || localStorage.getItem('bms_last_role') || 'branch';
    const banners = remoteData.banners || remoteData.banner;
    if (banners) {
        if (typeof banners === 'string') return banners;
        if (typeof banners === 'object') {
            if (banners[userRole]) return banners[userRole];
            if (banners.default) return banners.default;
        }
    }
    const notes = resolveRoleSpecificNotes(remoteData.notes, userRole);
    return notes.length > 0 ? notes[0] : 'A new application update is ready with latest fixes and performance improvements.';
}

export function isReleaseNotesVisibleForRole(releaseData, role) {
    if (!releaseData) return false;
    if (releaseData.enabled === false) return false;

    const userRole = role || (window.state && window.state.role) || localStorage.getItem('bms_last_role') || 'branch';

    if (typeof releaseData.show === 'boolean') {
        return releaseData.show;
    }
    if (releaseData.show && typeof releaseData.show === 'object') {
        if (releaseData.show[userRole] === false) return false;
        if (releaseData.show[userRole] === true) return true;
        if (releaseData.show.default === false) return false;
    }

    const notes = resolveRoleSpecificNotes(releaseData.notes, userRole);
    return Array.isArray(notes) && notes.length > 0;
}

export async function checkCodebaseUpdate(force = false) {
    // If user just updated in this session, skip check
    if (sessionStorage.getItem('bms_just_updated') === 'true') {
        return;
    }

    const now = Date.now();
    if (!force && (updateCheckInFlight || now - lastUpdateCheckAt < UPDATE_CHECK_INTERVAL_MS)) {
        return updateCheckInFlight || undefined;
    }

    updateCheckInFlight = (async () => {
    try {
        lastUpdateCheckAt = now;
        const res = await fetch(`/release_notes.json?_t=${Date.now()}`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        });

        if (!res.ok) return;
        const remoteData = await res.json();

        if (!remoteData || !remoteData.version) return;

        const installedVersion = localStorage.getItem('bms_installed_version') || CURRENT_VERSION;

        // Trigger when the deployment version is newer than what this browser has accepted.
        if (isNewerVersion(remoteData.version, installedVersion)) {
            triggerAppUpdateBanner(remoteData.version, remoteData.notes, remoteData.banners || remoteData.banner);
        }
    } catch (e) {
        // Offline or network silent fail
    } finally {
        updateCheckInFlight = null;
    }
    })();

    return updateCheckInFlight;
}

export function triggerAppUpdateBanner(newVersion, notes = [], banners = null) {
    const targetVersion = newVersion || CURRENT_VERSION;
    const installedVersion = localStorage.getItem('bms_installed_version') || CURRENT_VERSION;

    // Guard: Never trigger if not strictly newer than the browser's accepted version.
    if (!isNewerVersion(targetVersion, installedVersion)) {
        return;
    }
    if (localStorage.getItem(`bms_dismissed_update_${targetVersion}`) === 'true') {
        return;
    }
    if (sessionStorage.getItem('bms_just_updated') === 'true') {
        return;
    }

    isUpdateBannerActive = true;

    const bannerText = resolveRoleSpecificBanner({ notes, banners });

    // Automate Push Notification on new version deployment
    triggerPushNotificationOnUpdate(targetVersion, bannerText);

    const banner = document.createElement('div');
    banner.id = 'bms-codebase-update-banner';
    banner.className = 'w-full shrink-0 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 text-white px-3 sm:px-4 py-2.5 text-xs font-bold shadow-md select-none overflow-hidden flex items-center justify-between gap-2 sm:gap-3 border-b border-white/20 z-[99999] transition-all duration-300';

    const msg = `Updates Available (v${targetVersion}): ${bannerText}`;

    banner.innerHTML = `
        <div class="flex items-center gap-2 min-w-0 flex-1">
            <div class="flex items-center justify-center w-6 h-6 rounded-lg bg-white/20 flex-shrink-0 animate-pulse">
                <i data-lucide="sparkles" class="w-3.5 h-3.5 text-amber-300"></i>
            </div>
            <div class="truncate">
                <span class="font-extrabold uppercase tracking-wide text-[11px]">${msg}</span>
            </div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
            <button id="executeAppUpdateBtn" type="button" class="px-3.5 py-1.5 rounded-lg bg-white text-indigo-700 hover:bg-white/90 text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 shadow-md cursor-pointer">
                <i data-lucide="rotate-cw" class="w-3.5 h-3.5"></i>
                <span>Update Now</span>
            </button>
        </div>
    `;

    const systemBannerContainer = document.getElementById('system-banner-container');
    if (systemBannerContainer) {
        systemBannerContainer.classList.remove('hidden');
        const existingUpdate = systemBannerContainer.querySelector('#bms-codebase-update-banner');
        if (existingUpdate) existingUpdate.remove();
        systemBannerContainer.prepend(banner);
    } else {
        const appEl = document.getElementById('app');
        if (appEl) {
            appEl.prepend(banner);
        } else {
            document.body.prepend(banner);
        }
    }

    if (window.lucide) lucide.createIcons();

    banner.querySelector('#executeAppUpdateBtn')?.addEventListener('click', () => {
        executeAppUpdate(targetVersion);
    });
}

export async function executeAppUpdate(newVersion) {
    const targetVersion = newVersion || CURRENT_VERSION;

    // 1. Immediately remove banner from the UI
    const banner = document.getElementById('bms-codebase-update-banner');
    if (banner) {
        banner.remove();
        isUpdateBannerActive = false;
    }

    // 2. Safely sync any pending offline mutations before reloading
    try {
        if (localDb && localDb.sync_queue && isOnline()) {
            const pendingCount = await localDb.sync_queue.where('status').equals('PENDING').count();
            if (pendingCount > 0) {
                if (window.showToast) {
                    window.showToast(`Syncing ${pendingCount} offline item${pendingCount > 1 ? 's' : ''} before update...`, 'info', 3000);
                }
                const syncPromise = syncManager.processPendingQueue();
                const timeoutPromise = new Promise(resolve => setTimeout(resolve, 3000));
                await Promise.race([syncPromise, timeoutPromise]);
            }
        }
    } catch (e) {
        console.warn('[Update] Offline sync check warning:', e);
    }

    if (window.showToast) {
        window.showToast(`Applying update (v${targetVersion})...`, 'info', 2500);
    }

    // 3. Set Status: TRUE in Local Storage
    localStorage.setItem('bms_installed_version', targetVersion);
    localStorage.setItem('bms_app_updated_status', 'true');
    localStorage.setItem('bms_last_update_timestamp', String(Date.now()));
    localStorage.setItem(`bms_dismissed_update_${targetVersion}`, 'true');
    sessionStorage.setItem('bms_just_updated', 'true');

    // 4. Fire-and-forget: Backend update reporting (non-blocking)
    try {
        if (supabase) {
            supabase.auth.getUser().then(({ data }) => {
                const user = data?.user;
                if (user) {
                    const deviceUUID = localStorage.getItem(`bms_device_uuid_${user.id}`);
                    const deviceFingerprint = deviceUUID ? `${user.id.substring(0, 8)}_${deviceUUID}` : null;
                    supabase.rpc('record_device_app_update', {
                        p_version: targetVersion,
                        p_device_fingerprint: deviceFingerprint
                    }).catch(() => {});
                }
            }).catch(() => {});
        }
    } catch (e) {}

    // 5. Gracefully upgrade Service Worker & swap caches without destructive purge
    if ('serviceWorker' in navigator) {
        try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let reg of registrations) {
                if (reg.waiting) {
                    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                }
                await reg.update().catch(() => {});
            }
        } catch (e) {
            console.warn('[Update] SW upgrade notice:', e);
        }
    }

    // 6. Smooth cache-busting reload to fetch updated application bundle
    const cleanPath = window.location.pathname;
    const cleanHash = window.location.hash || '';
    const bustUrl = `${window.location.origin}${cleanPath}?_v=${Date.now()}${cleanHash}`;

    setTimeout(() => {
        window.location.replace(bustUrl);
    }, 400);
}

// Unified via primary 'bms-live' channel in realtime.js
window.showAppUpdateBanner = function(version, notes, banners) {
    const installedVersion = localStorage.getItem('bms_installed_version') || CURRENT_VERSION;
    if (version && isNewerVersion(version, installedVersion)) {
        if (sessionStorage.getItem('bms_just_updated') !== 'true') {
            triggerAppUpdateBanner(version, notes || [], banners || null);
        }
    }
};

window.executeAppUpdate = executeAppUpdate;
window.triggerAppUpdateBanner = triggerAppUpdateBanner;

export function initUpdateChecker() {
    initInstalledVersionTracking();

    // Instantaneous check at startup without artificial latency
    if (sessionStorage.getItem('bms_just_updated') === 'true') {
        setTimeout(() => {
            sessionStorage.removeItem('bms_just_updated');
        }, 10000);
    } else {
        checkCodebaseUpdate(true);
    }

    // Checking a no-store endpoint every 20 seconds multiplied resume-time work on
    // mobile. Keep the update prompt responsive without competing with data recovery.
    setInterval(checkCodebaseUpdate, UPDATE_CHECK_INTERVAL_MS);
    window.addEventListener('focus', () => checkCodebaseUpdate());
    window.addEventListener('online', () => checkCodebaseUpdate());
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            checkCodebaseUpdate();
        }
    });

    // Service Worker update listener
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(reg => {
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                if (!newWorker) return;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        if (sessionStorage.getItem('bms_just_updated') !== 'true') {
                            checkCodebaseUpdate();
                        }
                    }
                });
            });
        }).catch(() => {});
    }
}
