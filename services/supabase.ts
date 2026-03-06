import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zfscilbvmujsnzvnttrd.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Mci_tBWQs-EtgrUCO84Dmw_7KdUTlWe';

export const supabase = createClient(supabaseUrl, supabaseKey);

export type Profile = {
    id: string;
    email: string;
    credits: number;
    is_admin: boolean;
};

export const getProfile = async (userId: string) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        // PGRST116 means "JSON object requested, but no rows returned"
        if (error && error.code === 'PGRST116') {
            const { data: userData } = await supabase.auth.getUser();
            if (userData?.user) {
                const { data: newProfile, error: createError } = await supabase
                    .from('profiles')
                    .insert({ id: userId, email: userData.user.email, credits: 50 })
                    .select()
                    .single();

                if (createError) {
                    console.error("Profile Creation Failed:", createError);
                    return { data: null, error: createError };
                }
                return { data: newProfile as Profile, error: null };
            }
        }

        return { data: data as Profile, error };
    } catch (err: any) {
        console.error("getProfile unexpected error:", err);
        return { data: null, error: err };
    }
};

export const useCredit = async (userId: string) => {
    const { data: profile, error: getError } = await getProfile(userId);

    if (getError || !profile) {
        console.error("Profile Error:", getError);
        throw new Error('No se pudo verificar tu perfil o créditos.');
    }

    if (profile.credits <= 0) {
        throw new Error('No tienes créditos suficientes. Tu límite mensual de 50 ha sido alcanzado.');
    }

    const { error } = await supabase
        .from('profiles')
        .update({ credits: profile.credits - 1 })
        .eq('id', userId);

    if (error) {
        console.error("Credit Update Error:", error);
        throw new Error('Error al descontar crédito.');
    }

    return true;
};

