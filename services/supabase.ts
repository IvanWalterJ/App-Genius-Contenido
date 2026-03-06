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
    console.log("Supabase: Check profile for ID:", userId);
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        // PGRST116 means "JSON object requested, but no rows returned"
        if (error && error.code === 'PGRST116') {
            console.warn("Supabase: Profile not found. Creating default profile...");
            const { data: { session } } = await supabase.auth.getSession();
            const userEmail = session?.user?.email;

            if (session?.user) {
                const { data: newProfile, error: createError } = await supabase
                    .from('profiles')
                    .insert({ id: userId, email: userEmail, credits: 50 })
                    .select()
                    .single();

                if (createError) {
                    console.error("Supabase: CRITICAL - Profile Creation Failed:", createError);
                    return { data: null, error: createError };
                }
                console.log("Supabase: New profile created successfully.");
                return { data: newProfile as Profile, error: null };
            }
        }

        if (error) {
            console.error("Supabase: getProfile error:", error);
        } else {
            console.log("Supabase: Profile loaded successfully:", data);
        }

        return { data: data as Profile, error };
    } catch (err: any) {
        console.error("Supabase: Unexpected error in getProfile:", err);
        return { data: null, error: err };
    }
};

export const useCredit = async (userId: string) => {
    console.log("Supabase: Attempting to use credit for:", userId);
    const { data: profile, error: getError } = await getProfile(userId);

    if (getError || !profile) {
        console.error("Supabase: Profile fetch failed during credit use.");
        throw new Error('No se pudo verificar tu perfil o créditos. Revisa tu conexión.');
    }

    if (profile.credits <= 0) {
        console.warn("Supabase: Out of credits.");
        throw new Error('No tienes créditos suficientes. Tu límite mensual de 50 ha sido alcanzado.');
    }

    console.log("Supabase: Deducting 1 credit from:", profile.credits);
    const { error } = await supabase
        .from('profiles')
        .update({ credits: profile.credits - 1 })
        .eq('id', userId);

    if (error) {
        console.error("Supabase: Credit Update Failed:", error);
        throw new Error('Error al descontar crédito. No se pudo conectar con la base de datos.');
    }

    console.log("Supabase: Credit used successfully.");
    return true;
};

