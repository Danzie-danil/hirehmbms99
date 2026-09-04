import { state } from './state.js';

const INACTIVITY_LIMIT_MS = 10 * 60 * 1000; // 10 minutes

let lastActivityTime = Date.now();
let lastResetThrottle = 0;

function resetInactivityTimer() {
    const now = Date.now();
    if (now - lastResetThrottle < 1000) return;
    lastResetThrottle = now;
    lastActivityTime = now;
}

function recoverAfterInactivity() {
    const isAppVisible = state.role && document.getElementById('loginScreen')?.classList.contains('hidden');
    if (isAppVisible) {
        const elapsed = Date.now() - lastActivityTime;
        if (elapsed >= INACTIVITY_LIMIT_MS) {
            // Mobile browsers routinely freeze an app while it is in the app switcher.
            // A hard reload here discarded the already-rendered, cache-backed UI and made
            // every return depend on a fresh network/auth bootstrap. Ask the lifecycle
            // layer to reconnect and refresh safely instead.
            console.log(`[InactivityManager] ${Math.round(elapsed / 1000)}s inactive. Running safe resume recovery.`);
            lastActivityTime = Date.now();
            window.handleAppResume?.('inactive_return');
        }
    }
}

export function initInactivityManager() {
    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

    activityEvents.forEach(evt => {
        window.addEventListener(evt, resetInactivityTimer, { passive: true });
    });

    setInterval(recoverAfterInactivity, 10000);

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            recoverAfterInactivity();
        }
    });

    window.addEventListener('focus', recoverAfterInactivity);

    console.log('[InactivityManager] Initialized. 10-minute safe resume recovery active.');
}

window.initInactivityManager = initInactivityManager;
