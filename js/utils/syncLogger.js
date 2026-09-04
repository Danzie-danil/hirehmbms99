/**
 * BMSTZ Centralized Synchronization & Realtime Diagnostic Logger
 * Provides structured, development-friendly sync observability without noisy production console spam.
 */

const IS_DEV = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window._SYNC_DEBUG === true ||
    localStorage.getItem('bms_sync_debug') === 'true'
);

function formatTimestamp() {
    return new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export const syncLogger = {
    log(category, action, details = null) {
        if (!IS_DEV && !window._SYNC_DEBUG) return;
        const tag = `[${category.toUpperCase()}]`;
        const time = formatTimestamp();
        if (details !== null && details !== undefined) {
            console.log(`%c${time} ${tag} ${action}`, 'color: #3b82f6; font-weight: bold;', details);
        } else {
            console.log(`%c${time} ${tag} ${action}`, 'color: #3b82f6; font-weight: bold;');
        }
    },

    warn(category, action, details = null) {
        const tag = `[${category.toUpperCase()}]`;
        const time = formatTimestamp();
        if (details !== null && details !== undefined) {
            console.warn(`${time} ${tag} ${action}`, details);
        } else {
            console.warn(`${time} ${tag} ${action}`);
        }
    },

    error(category, action, error = null) {
        const tag = `[${category.toUpperCase()}]`;
        const time = formatTimestamp();
        const msg = error ? (error.message || String(error)) : '';
        console.error(`${time} ${tag} ${action}: ${msg}`, error);
    }
};

if (typeof window !== 'undefined') {
    window.syncLogger = syncLogger;
}

export default syncLogger;
