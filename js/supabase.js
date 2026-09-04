import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        multiTab: true,
        storageKey: 'bmstz-auth-token',
        storage: window.localStorage,
        // Direct non-blocking lock function to bypass navigator.locks contention and steal AbortErrors
        lock: async (_name, _acquireTimeout, fn) => {
            return await fn();
        }
    },
    realtime: {
        params: {
            eventsPerSecond: 10
        }
    }
});

// Centralized Singleton In-Flight Deduplicator for Token Refresh
// Prevents concurrent refreshSession() calls across lifecycle, inactivityManager, dashboardRepository, and auth
// from sending duplicate single-use refresh tokens to Supabase Auth and revoking the session.
let _inFlightRefreshPromise = null;
let _lastSuccessfulRefresh = 0;
const REFRESH_DEDUPE_COOLDOWN_MS = 10000; // 10s cooldown

const _rawRefreshSession = supabase.auth.refreshSession.bind(supabase.auth);

supabase.auth.refreshSession = async function (currentSession) {
    const now = Date.now();

    // 1. If another refresh is already in-flight, await and share the exact same promise
    if (_inFlightRefreshPromise) {
        return await _inFlightRefreshPromise;
    }

    // 2. If token was refreshed successfully within the last 10 seconds, reuse current session
    if (now - _lastSuccessfulRefresh < REFRESH_DEDUPE_COOLDOWN_MS) {
        try {
            const current = await supabase.auth.getSession();
            if (current?.data?.session) {
                return current;
            }
        } catch (e) {}
    }

    // 3. Launch single authoritative refresh request with failsafe timeout
    _inFlightRefreshPromise = (async () => {
        try {
            const res = await Promise.race([
                _rawRefreshSession(currentSession),
                new Promise((_, reject) => setTimeout(() => reject(new Error('refreshSession timed out')), 6000))
            ]);
            if (res?.data?.session) {
                _lastSuccessfulRefresh = Date.now();
            }
            return res;
        } finally {
            _inFlightRefreshPromise = null;
        }
    })();

    return await _inFlightRefreshPromise;
};

if (typeof window !== 'undefined') {
    window.supabase = supabase;
    window.supabaseClient = supabase;
}

