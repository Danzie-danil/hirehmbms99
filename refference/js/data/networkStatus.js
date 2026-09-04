import { supabase } from '../supabase.js';

/**
 * BMSTZ Central Network & Connectivity Health Service
 * Provides reactive connectivity monitoring, active backend heartbeat probes,
 * and visual sync status indicator management.
 */

let _status = navigator.onLine ? 'online' : 'offline';
let _wasOffline = !navigator.onLine || sessionStorage.getItem('bms_was_offline') === 'true';
let _isReloading = false;
const _listeners = new Set();
let _probeTimeout = null;
let _isProbing = false;

export function getNetworkStatus() {
    return _status;
}

export function isOnline() {
    return _status === 'online' || _status === 'syncing';
}

export function subscribeNetworkStatus(callback) {
    _listeners.add(callback);
    return () => _listeners.delete(callback);
}

export async function handleOnlineReconnection() {
    if (_isReloading) return;

    const hadOfflineState = _wasOffline || sessionStorage.getItem('bms_was_offline') === 'true';
    if (!hadOfflineState) return;

    _isReloading = true;
    _wasOffline = false;
    sessionStorage.removeItem('bms_was_offline');

    console.log('[NetworkStatus] Internet connection restored. Seamlessly syncing offline data and refreshing active view...');

    // 1. Sync all pending offline data / sales / mutations
    try {
        if (typeof window.syncAllOfflineData === 'function') {
            await window.syncAllOfflineData();
        }
    } catch (err) {
        console.warn('[NetworkStatus] Offline sync notice on reconnection:', err);
    }

    // 2. Clear runtime memory caches so fresh data is fetched from the server
    window._cachedCentralItems = null;
    window._cachedBranchInventory = null;

    // 3. Reactively refresh session and view data in place without page reload
    try {
        if (typeof window.handleAppResume === 'function') {
            await window.handleAppResume('reconnection');
        } else if (typeof window.switchView === 'function' && window.state?.activeView) {
            await window.switchView(window.state.activeView, null, true);
        }
    } catch (err) {
        console.warn('[NetworkStatus] In-place view refresh notice:', err);
    } finally {
        _isReloading = false;
    }
}

function _setStatus(newStatus) {
    if (_status !== newStatus) {
        const prev = _status;
        _status = newStatus;
        _notifyListeners(newStatus, prev);
        updateNetworkUI();

        if (newStatus === 'offline') {
            _wasOffline = true;
            sessionStorage.setItem('bms_was_offline', 'true');
        } else if (newStatus === 'online') {
            if (prev === 'offline' || _wasOffline || sessionStorage.getItem('bms_was_offline') === 'true') {
                handleOnlineReconnection();
            }
        }
    }
}

function _notifyListeners(status, prev) {
    _listeners.forEach(fn => {
        try {
            fn(status, prev);
        } catch (e) {
            console.error('[NetworkStatus Listener Error]:', e);
        }
    });
}

/**
 * Actively probe Supabase backend health to guarantee real reachability
 * rather than relying exclusively on navigator.onLine.
 */
export async function probeBackendHealth(timeoutMs = 3500) {
    if (!navigator.onLine) {
        _wasOffline = true;
        sessionStorage.setItem('bms_was_offline', 'true');
        _setStatus('offline');
        return false;
    }

    if (_isProbing) return _status === 'online' || _status === 'syncing';
    _isProbing = true;

    try {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

        const probeRes = await fetch('/bmtzofficiallogo.png?probe=' + Date.now(), {
            method: 'HEAD',
            cache: 'no-store',
            signal: controller ? controller.signal : undefined
        }).catch(() => null);

        if (timer) clearTimeout(timer);

        if (probeRes && (probeRes.ok || probeRes.status < 500)) {
            const wasOff = _status === 'offline' || _wasOffline || sessionStorage.getItem('bms_was_offline') === 'true';
            _setStatus('online');
            _isProbing = false;

            if (wasOff && !_isReloading) {
                handleOnlineReconnection();
            }
            return true;
        }

        const probePromise = supabase
            .from('sys_settings')
            .select('key')
            .limit(1);

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Probe timeout')), timeoutMs)
        );

        await Promise.race([probePromise, timeoutPromise]);
        const wasOff = _status === 'offline' || _wasOffline || sessionStorage.getItem('bms_was_offline') === 'true';
        _setStatus('online');
        _isProbing = false;

        if (wasOff && !_isReloading) {
            handleOnlineReconnection();
        }

        return true;
    } catch (err) {
        console.warn('[NetworkStatus] Backend probe info:', err.message || err);
        _wasOffline = true;
        sessionStorage.setItem('bms_was_offline', 'true');
        _setStatus('offline');
        _isProbing = false;
        return false;
    }
}

/**
 * Notify the network service of an active sync in progress
 */
export function setSyncingState(isSyncing, hasError = false) {
    if (hasError) {
        _setStatus('sync_error');
        setTimeout(() => {
            if (_status === 'sync_error') {
                _setStatus(navigator.onLine ? 'online' : 'offline');
            }
        }, 4000);
    } else if (isSyncing) {
        _setStatus('syncing');
    } else {
        _setStatus(navigator.onLine ? 'online' : 'offline');
    }
}

/**
 * Update the visual network & sync status badge in the header
 */
export function updateNetworkUI() {
    const pill = document.getElementById('globalNetworkSyncPill');
    if (!pill) return;

    if (_status === 'online') {
        pill.className = 'hidden inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 transition-all';
        pill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Online`;
    } else if (_status === 'syncing') {
        pill.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40 transition-all animate-pulse';
        pill.innerHTML = `<svg class="animate-spin h-3 w-3 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Syncing...`;
    } else if (_status === 'offline') {
        pill.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 transition-all';
        pill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Offline (Cached)`;
    } else if (_status === 'sync_error') {
        pill.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40 transition-all';
        pill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Sync Failed`;
    }
}

/**
 * Initialize event listeners
 */
export function initNetworkStatus() {
    if (!navigator.onLine) {
        _wasOffline = true;
        sessionStorage.setItem('bms_was_offline', 'true');
        _setStatus('offline');
    }

    window.addEventListener('online', () => {
        _setStatus('connecting');
        probeBackendHealth();
    });

    window.addEventListener('offline', () => {
        _wasOffline = true;
        sessionStorage.setItem('bms_was_offline', 'true');
        _setStatus('offline');
    });

    // Periodic heartbeat probe every 30 seconds when online
    setInterval(() => {
        if (navigator.onLine && document.visibilityState === 'visible') {
            probeBackendHealth(3000);
        }
    }, 30000);

    // Initial probe
    probeBackendHealth();
}

window.handleOnlineReconnection = handleOnlineReconnection;
