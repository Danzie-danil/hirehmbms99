import { supabase } from './supabase.js';
import { state } from './state.js';
import { checkCodebaseUpdate } from './updateChecker.js';
import { initPushNotifications } from './pushNotifications.js';

let lastResumeCheck = Date.now();
let resumeTimer = null;
let resumeInFlight = false;
const VIEW_REFRESH_AFTER_MS = 60 * 1000;

function isUserLoggedIn() {
    const appEl = document.getElementById('app');
    const isAppVisible = appEl && !appEl.classList.contains('hidden');
    return Boolean(isAppVisible && state.role && (state.currentUser || state.ownerId || state.branchId));
}

function getCurrentView() {
    if (state.activeView) return state.activeView;
    if (state.role === 'sysadmin') return localStorage.getItem('lastSysadminView') || 'sysadmin-dashboard';
    if (state.role === 'branch') return localStorage.getItem('lastBranchView') || 'dashboard';
    return localStorage.getItem('lastOwnerView') || 'overview';
}

function sidebarNavNeedsRecovery() {
    if (!isUserLoggedIn()) return false;
    if (window.isSysadminImpersonationMode) {
        const ownerNav = document.getElementById('ownerNav');
        return !ownerNav || ownerNav.classList.contains('hidden');
    }
    const role = state.role || localStorage.getItem('bms_last_role');
    if (!role) return false;
    const targetNav = document.getElementById(role === 'owner' ? 'ownerNav' : (role === 'branch' ? 'branchNav' : 'sysadminNav'));
    if (!targetNav) return true;
    return targetNav.classList.contains('hidden') || targetNav.children.length === 0;
}

function currentViewNeedsRetry() {
    if (!isUserLoggedIn()) return false;
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return false;
    const trimmed = (mainContent.innerHTML || '').trim();
    if (!mainContent.children.length || !trimmed) return true;
    const text = (mainContent.textContent || '').trim().toLowerCase();
    if (!text) return true;
    return text.includes('failed to load') ||
           text.includes("couldn't load") ||
           text.includes('loading view') ||
           text.includes('network interrupted') ||
           text.includes('network connection issue') ||
           text.includes('retry loading');
}

async function withTimeout(promise, timeoutMs) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('resume_timeout')), timeoutMs))
    ]);
}

export async function handleAppResume(reason = 'resume', event = null) {
    if (resumeInFlight) return;
    if (!isUserLoggedIn()) return; // Never run resume loops when on login screen or not logged in

    // BFCache and iOS/Android app-switcher restores are normal lifecycle events, not
    // failures. Reloading them caused a slow cold start precisely when a user returned.
    // A truly discarded tab already runs a new boot sequence, so it needs no second reload.
    const backgroundedAt = Number(sessionStorage.getItem('bms_backgrounded_at') || 0);
    const timeInBackground = backgroundedAt ? Date.now() - backgroundedAt : 0;

    // Always re-sync all memory state from persistent localStorage cache on every wake.
    // Sysadmin's minimal state (ownerId='sysadmin', no profile) is immune to partial
    // browser heap eviction. Owner/Branch have richer state (profile, branches,
    // branchProfile) that iOS/Android can partially evict. Unconditionally restoring
    // from cache guarantees the full state is always complete before view re-renders.
    if (typeof window._tryRestoreOfflineSession === 'function') {
        window._tryRestoreOfflineSession(null, false);
    }

    // Always guarantee sidebar nav visibility for active role
    if (typeof window.ensureSidebarNavVisible === 'function') {
        window.ensureSidebarNavVisible(window.isSysadminImpersonationMode ? 'owner' : state.role);
    }

    resumeInFlight = true;
    try {
        try {
            await checkCodebaseUpdate();
        } catch (e) {}

        // Proactively refresh auth session token if expired during background sleep
        if (navigator.onLine) {
            try {
                await withTimeout(supabase.auth.getSession(), 3000);
            } catch (authErr) {
                console.warn('[Lifecycle] Background auth refresh notice:', authErr.message);
            }

            // Reconcile server entitlements and plan upgrades across devices
            if (typeof window.revalidateSessionAndEntitlements === 'function') {
                try {
                    await withTimeout(window.revalidateSessionAndEntitlements(), 4000);
                } catch (e) {}
            }
        }

        // Re-hydrate UI user indicators
        const elCurrentUser = document.getElementById('currentUser');
        if (elCurrentUser && state.currentUser) {
            elCurrentUser.textContent = state.currentUser;
        }
        if (typeof window.updateSidebarAvatar === 'function') {
            window.updateSidebarAvatar();
        }

        window._cachedCentralItems = null;
        window._cachedBranchInventory = null;

        try {
            if (!window.realtimeChannel || window.realtimeChannel.state !== 'joined') {
                if (typeof window.destroyRealtimeSync === 'function') {
                    window.destroyRealtimeSync();
                }
                if (typeof window.initRealtimeSync === 'function') {
                    window.initRealtimeSync(true);
                }
            }
        } catch (e) {}

        try {
            initPushNotifications();
        } catch (e) {}

        // After a meaningful background period, re-render the active page in place.
        // Module repositories return IndexedDB snapshots first, so this preserves an
        // app-like instant view while their cloud requests refresh in the background.
        const shouldRefreshView = timeInBackground >= VIEW_REFRESH_AFTER_MS;
        if (shouldRefreshView && typeof window.switchView === 'function') {
            try {
                await window.switchView(getCurrentView(), state.activeViewContext || null, true);
            } catch (e) {
                console.warn('[Lifecycle] Active view refresh notice:', e.message);
            }
        }

        // Auto-recover empty sidebar nav or crashed view canvas across Mobile, iPad, Mac, Desktop
        const navNeedsFix = sidebarNavNeedsRecovery();
        const viewNeedsFix = currentViewNeedsRetry();
        if ((navNeedsFix || viewNeedsFix) && typeof window.switchView === 'function') {
            try {
                if (typeof window.ensureSidebarNavVisible === 'function') {
                    window.ensureSidebarNavVisible(state.role);
                }
                if (window.ensureBmsViewModule && typeof window.clearViewModuleErrors === 'function') {
                    window.clearViewModuleErrors();
                }
                const targetView = getCurrentView();
                await window.switchView(targetView, null, true);
            } catch (e) {}
        }
    } catch (err) {
        console.warn(`[Lifecycle] ${reason} recovery warning:`, err);
    } finally {
        lastResumeCheck = Date.now();
        resumeInFlight = false;
    }
}

export function initAppLifecycleRecovery() {
    const scheduleResume = (reason, event = null) => {
        if (!isUserLoggedIn()) return;
        clearTimeout(resumeTimer);
        resumeTimer = setTimeout(() => {
            handleAppResume(reason, event);
        }, 300);
    };

    // 1. Tab visibility changes (Desktops, Macs, Tablets, Mobile)
    document.addEventListener('visibilitychange', (event) => {
        if (document.visibilityState === 'hidden') {
            sessionStorage.setItem('bms_backgrounded_at', String(Date.now()));
            return;
        }
        if (document.visibilityState === 'visible' && isUserLoggedIn()) {
            scheduleResume('visible', event);
        }
    });

    // 2. BFCache / Tab hibernation restore (Mac Safari, iPadOS, iOS, Chromium Discarding)
    window.addEventListener('pageshow', (event) => {
        if (isUserLoggedIn()) scheduleResume('pageshow', event);
    });

    window.addEventListener('pagehide', () => {
        sessionStorage.setItem('bms_backgrounded_at', String(Date.now()));
    });

    // 3. Window focus changes (Desktop multi-window, Mac Command-Tab, Windows Alt-Tab, iPad Split View)
    window.addEventListener('focus', (event) => {
        if (isUserLoggedIn()) {
            scheduleResume('focus', event);
        }
    });

    // 4. Network reconnection
    window.addEventListener('online', (event) => {
        if (isUserLoggedIn()) scheduleResume('online', event);
    });

    // 5. Capacitor / Cordova / Native App / Web Freeze-Resume hooks
    document.addEventListener('resume', (event) => {
        if (isUserLoggedIn()) scheduleResume('native_resume', event);
    });
}

window.handleAppResume = handleAppResume;
initAppLifecycleRecovery();
