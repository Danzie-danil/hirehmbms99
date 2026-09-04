import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../../js/supabase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState(null);
    const [role, setRole] = useState('owner'); // 'sysadmin' | 'owner' | 'branch'
    const [loading, setLoading] = useState(true);

    const checkIsSysAdmin = async (userId) => {
        try {
            const { data } = await supabase.rpc('check_is_sysadmin', { p_user_id: userId });
            return !!data;
        } catch {
            return false;
        }
    };

    const fetchUserProfile = async (authUser) => {
        if (!authUser) {
            setUser(null);
            setProfile(null);
            setRole('owner');
            setLoading(false);
            return;
        }

        setUser(authUser);

        try {
            const isSys = await checkIsSysAdmin(authUser.id, authUser.email);
            if (isSys) {
                setRole('sysadmin');
                setProfile({ id: authUser.id, email: authUser.email, role: 'sysadmin', business_name: 'BMS System Administrator' });
                setLoading(false);
                return;
            }

            // Check if branch manager
            const { data: branchData } = await supabase
                .from('branches')
                .select('*')
                .eq('manager_id', authUser.id)
                .maybeSingle();

            if (branchData) {
                setRole('branch');
                setProfile({ ...authUser, branch: branchData });
                setLoading(false);
                return;
            }

            // Default business owner
            const { data: ownerProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .maybeSingle();

            setRole('owner');
            setProfile(ownerProfile || { id: authUser.id, email: authUser.email });
        } catch (err) {
            console.warn('[AuthContext] Error fetching profile:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            fetchUserProfile(session?.user ?? null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            fetchUserProfile(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setProfile(null);
        window.location.href = '/';
    };

    return (
        <AuthContext.Provider value={{ user, session, profile, role, loading, logout, refetchProfile: () => fetchUserProfile(user) }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
