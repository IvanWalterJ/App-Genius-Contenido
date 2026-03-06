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

const withTimeout = async <T>(promise: any, ms: number, label: string): Promise<T> => {
    return Promise.race([
        Promise.resolve(promise),
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`Supabase Timeout: ${label}`)), ms)
        )
    ]);
};

export const getProfile = async (userId: string) => {
    console.log("Supabase: Iniciando getProfile para:", userId);
    try {
        const result = await withTimeout<any>(
            supabase.from('profiles').select('id, email, credits').eq('id', userId).maybeSingle(),
            10000,
            'getProfile'
        );

        if (result.error) {
            console.error("Supabase: Error en query getProfile:", result.error);
            return { data: null, error: result.error };
        }

        if (!result.data) {
            console.warn("Supabase: No se encontró perfil. Intentando creación manual...");
            const { data: userData } = await supabase.auth.getUser();
            if (userData?.user) {
                const createResult = await withTimeout<any>(
                    supabase.from('profiles')
                        .insert({ id: userId, email: userData.user.email, credits: 50 })
                        .select()
                        .maybeSingle(),
                    10000,
                    'createProfile'
                );

                if (createResult.error) {
                    console.error("Supabase: Error crítico al crear perfil:", createResult.error);
                    return { data: null, error: createResult.error };
                }
                console.log("Supabase: Perfil creado con éxito.");
                return { data: createResult.data as Profile, error: null };
            }
        }

        console.log("Supabase: Perfil cargado correctamente:", result.data);
        return { data: result.data as Profile, error: null };
    } catch (err: any) {
        console.error("Supabase: Excepción en getProfile:", err.message);
        return { data: null, error: err };
    }
};

export const useCredit = async (userId: string) => {
    console.log("Supabase: Iniciando reducción de créditos...");
    try {
        const { data: profile, error: getError } = await getProfile(userId);

        if (getError || !profile) {
            throw new Error(getError?.message || 'Perfil no disponible');
        }

        if (profile.credits <= 0) {
            throw new Error('Sin créditos suficientes (50/50 usados)');
        }

        console.log("Supabase: Actualizando créditos...");
        const updateResult = await withTimeout<any>(
            supabase.from('profiles')
                .update({ credits: profile.credits - 1 })
                .eq('id', userId),
            10000,
            'updateCredit'
        );

        if (updateResult.error) {
            console.error("Supabase: Error al descontar crédito:", updateResult.error);
            throw updateResult.error;
        }

        console.log("Supabase: Crédito descontado con éxito.");
        return true;
    } catch (err: any) {
        console.error("Supabase: Excepción en useCredit:", err.message);
        throw err;
    }
};

