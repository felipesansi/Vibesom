import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type TipoContextoAutenticacao = {
    usuario: User | null;
    sessao: Session | null;
    carregando: boolean;
    entrar: (email: string, senha: string) => Promise<{ erro: string | null }>;
    cadastrar: (email: string, senha: string, nome: string) => Promise<{ erro: string | null }>;
    sair: () => Promise<void>;
};

const ContextoAutenticacao = createContext<TipoContextoAutenticacao>(
    {} as TipoContextoAutenticacao
);

export function ProvedorAutenticacao({ children: filhos }: { children: React.ReactNode }) {
    const [usuario, setUsuario] = useState<User | null>(null);
    const [sessao, setSessao] = useState<Session | null>(null);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSessao(session);
            setUsuario(session?.user ?? null);
            setCarregando(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_evento, sessaoAtual) => {
            setSessao(sessaoAtual);
            setUsuario(sessaoAtual?.user ?? null);
            setCarregando(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const entrar = async (
        email: string,
        senha: string
    ): Promise<{ erro: string | null }> => {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) return { erro: error.message };
        return { erro: null };
    };

    const cadastrar = async (
        email: string,
        senha: string,
        nome: string
    ): Promise<{ erro: string | null }> => {
        const { error } = await supabase.auth.signUp({
            email,
            password: senha,
            options: {
                data: {
                    full_name: nome,
                    display_name: nome,
                },
            },
        });
        if (error) return { erro: error.message };
        return { erro: null };
    };

    const sair = async () => {
        await supabase.auth.signOut();
    };

    return (
        <ContextoAutenticacao.Provider
            value={{ usuario, sessao, carregando, entrar, cadastrar, sair }}
        >
            {filhos}
        </ContextoAutenticacao.Provider>
    );
}

export const useAutenticacao = () => useContext(ContextoAutenticacao);
