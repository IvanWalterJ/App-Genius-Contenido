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
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    return { data: data as Profile, error };
};

export const useCredit = async (userId: string) => {
    const { data: profile } = await getProfile(userId);
    if (!profile || profile.credits <= 0) {
        throw new Error('No tienes créditos suficientes.');
    }

    const { error } = await supabase
        .from('profiles')
        .update({ credits: profile.credits - 1 })
        .eq('id', userId);

    if (error) throw error;
    return true;
};

