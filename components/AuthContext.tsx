
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, getProfile, Profile } from '../services/supabase';

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshProfile = async () => {
        if (user) {
            const { data } = await getProfile(user.id);
            if (data) setProfile(data);
        }
    };

    useEffect(() => {
        // Initial session check
        const initSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const currentUser = session?.user ?? null;
                setUser(currentUser);

                // Don't wait for profile to stop the loading spinner
                setLoading(false);

                if (currentUser) {
                    const { data } = await getProfile(currentUser.id);
                    if (data) setProfile(data);
                }
            } catch (err) {
                console.error("Auth init error:", err);
                setLoading(false);
            }
        };

        initSession();

        // Safety timeout: Never stay in loading state for more than 5 seconds
        const timer = setTimeout(() => {
            setLoading(false);
        }, 5000);

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("Auth Event:", event);
            const currentUser = session?.user ?? null;
            setUser(currentUser);

            if (currentUser) {
                const { data } = await getProfile(currentUser.id);
                setProfile(data);
            } else {
                setProfile(null);
            }

            setLoading(false);
            clearTimeout(timer);
        });

        return () => {
            subscription.unsubscribe();
            clearTimeout(timer);
        };
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
