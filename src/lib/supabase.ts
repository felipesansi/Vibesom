import 'react-native-url-polyfill/auto';
import * as ArmazenamentoSeguro from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

const adaptadorArmazenamentoExpo = {
    getItem: (chave: string) => ArmazenamentoSeguro.getItemAsync(chave),
    setItem: (chave: string, valor: string) => ArmazenamentoSeguro.setItemAsync(chave, valor),
    removeItem: (chave: string) => ArmazenamentoSeguro.deleteItemAsync(chave),
};

const urlSupabase = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '')
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');
const chaveAnonimaSupabase = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(urlSupabase, chaveAnonimaSupabase, {
    auth: {
        storage: adaptadorArmazenamentoExpo,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
