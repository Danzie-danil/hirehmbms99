import { state } from './state.js';
import { supabase } from './supabase.js';

const INACTIVITY_LIMIT_MS = 10 * 60 * 1000; // 10 minutes inactivity session

let lastActivityTime = Date.now();
let lastResetThrottle = 0;
let isReloading = false;

export function triggerInactivityReload(reason = 'inactivity') {
    if (isReloading) return;
    const isAppVisible = state.role && document.getElementById('loginScreen')?.classList.contains('hidden');
    if (!isAppVisible) return;

    isReloading = true;
    console.log(`[InactivityManager] Inactivity session detected (${reason}). Auto-triggering refresh.`);

    try {
        sessionStorage.removeItem('bms_backgrounded_at');
    } catch (e) {}

    // Prioritize clean triggerAppRefresh function call (clears memory caches + saves active view hash)
    if (typeof window.triggerAppRefresh === 'function') {
        window.triggerAppRefresh();
        return;
    }

    const refreshBtn = document.querySelector('button[onclick*="triggerAppRefresh"]');
    if (refreshBtn) {
        try {
            refreshBtn.click();
            return;
        } catch (e) {
            console.warn('[InactivityManager] Error clicking refreshBtn:', e);
        }
    }

    window.location.reload();
}

export async function recoverAfterInactivity(trigger = 'event') {
    const isAppVisible = state.role && document.getElementById('loginScreen')?.classList.contains('hidden');
    if (!isAppVisible || isReloading) return;

    const now = Date.now();
    const elapsedSinceActivity = now - lastActivityTime;
    
    // Check backgrounded duration from sessionStorage
    const backgroundedAt = Number(sessionStorage.getItem('bms_backgrounded_at') || 0);
    const timeInBackground = backgroundedAt ? now - backgroundedAt : 0;

    // Silently verify and refresh session token without destructive reloads
    if (elapsedSinceActivity >= 3 * 60 * 1000 || timeInBackground >= 3 * 60 * 1000) {
        if (navigator.onLine && supabase?.auth) {
            try {
                const { data: sessData } = await supabase.auth.getSession();
                const session = sessData?.session;
                if (!session || (session.expires_at && session.expires_at * 1000 - now < 120000)) {
                    await supabase.auth.refreshSession();
                }
            } catch (e) {}
        }
    }
}

function handleUserActivity() {
    const now = Date.now();
    if (now - lastResetThrottle < 1000) return;
    lastResetThrottle = now;
    lastActivityTime = now;
}

export function initInactivityManager() {
    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

    activityEvents.forEach(evt => {
        window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    const checkAndHandleWake = (source) => {
        const now = Date.now();
        const elapsedSinceActivity = now - lastActivityTime;
        const backgroundedAt = Number(sessionStorage.getItem('bms_backgrounded_at') || 0);
        const timeInBackground = backgroundedAt ? now - backgroundedAt : 0;
        const maxInactive = Math.max(elapsedSinceActivity, timeInBackground);

        if (maxInactive >= INACTIVITY_LIMIT_MS) {
            console.log(`[InactivityManager] Inactivity duration (${Math.round(maxInactive / 1000)}s) reached threshold (${INACTIVITY_LIMIT_MS / 1000}s). Auto-refreshing app...`);
            triggerInactivityReload(source);
        } else {
            recoverAfterInactivity(source);
        }
    };

    // When tab becomes visible, auto-refresh if inactive or silently recover session
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            checkAndHandleWake('visibility_change');
        }
    });

    window.addEventListener('focus', () => checkAndHandleWake('window_focus'));
    window.addEventListener('pageshow', () => checkAndHandleWake('pageshow_restore'));
    document.addEventListener('resume', () => checkAndHandleWake('pwa_resume'));

    console.log('[InactivityManager] Initialized. Background session sync and auto-refresh active.');
}

window.initInactivityManager = initInactivityManager;
window.recoverAfterInactivity = recoverAfterInactivity;
window.triggerInactivityReload = triggerInactivityReload;


