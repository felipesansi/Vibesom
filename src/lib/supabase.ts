import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

// Adaptador de armazenamento: SecureStore no nativo, localStorage na web/SSR
let adaptadorArmazenamento: {
    getItem: (chave: string) => Promise<string | null>;
    setItem: (chave: string, valor: string) => Promise<void>;
    removeItem: (chave: string) => Promise<void>;
};

if (Platform.OS !== 'web') {
    // Importação dinâmica para evitar erro no ambiente Node.js/SSR
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ArmazenamentoSeguro = require('expo-secure-store');
    adaptadorArmazenamento = {
        getItem: (chave: string) => ArmazenamentoSeguro.getItemAsync(chave),
        setItem: (chave: string, valor: string) => ArmazenamentoSeguro.setItemAsync(chave, valor),
        removeItem: (chave: string) => ArmazenamentoSeguro.deleteItemAsync(chave),
    };
} else {
    // Fallback para web: usa localStorage (ou memória no SSR)
    const memória: Record<string, string> = {};
    const store = typeof localStorage !== 'undefined' ? localStorage : null;
    adaptadorArmazenamento = {
        getItem: async (chave) => store?.getItem(chave) ?? memória[chave] ?? null,
        setItem: async (chave, valor) => {
            if (store) store.setItem(chave, valor);
            else memória[chave] = valor;
        },
        removeItem: async (chave) => {
            if (store) store.removeItem(chave);
            else delete memória[chave];
        },
    };
}

const urlSupabaseRaw = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const chaveAnonimaSupabase = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Garante URL HTTP/HTTPS válida para o createClient não lançar erro fatal
function normalizarUrl(raw: string): string {
    if (!raw) return 'https://placeholder.supabase.co';
    const semBarra = raw.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
    if (/^https?:\/\//i.test(semBarra)) return semBarra;
    return 'https://placeholder.supabase.co';
}

const urlSupabase = normalizarUrl(urlSupabaseRaw);

if (!urlSupabaseRaw || urlSupabase === 'https://placeholder.supabase.co') {
    console.warn(
        `[Supabase] EXPO_PUBLIC_SUPABASE_URL inválida: "${urlSupabaseRaw}". ` +
        'Defina a URL completa no .env (ex: https://<projeto>.supabase.co).'
    );
}

if (!chaveAnonimaSupabase) {
    console.warn('[Supabase] EXPO_PUBLIC_SUPABASE_ANON_KEY não definida. Defina no arquivo .env.');
}

export const supabase = createClient(urlSupabase, chaveAnonimaSupabase || 'placeholder-key', {
    auth: {
        storage: adaptadorArmazenamento,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
