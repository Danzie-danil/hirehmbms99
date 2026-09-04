
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
        lock: false
    },
    realtime: {
        params: {
            eventsPerSecond: 10
        }
    }
});

if (typeof window !== 'undefined') {
    window.supabase = supabase;
    window.supabaseClient = supabase;
}

