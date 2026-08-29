import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { buscarPerfilUsuario, criarOuAtualizarPerfilUsuario, PerfilUsuarioDB, supabase } from '../lib/supabase';

function extrairNomeExibido(user: User | null, perfil: PerfilUsuarioDB | null): string {
    if (perfil?.nome_completo?.trim()) return perfil.nome_completo.trim();
    if (perfil?.nome_usuario?.trim()) return perfil.nome_usuario.trim();

    const meta = user?.user_metadata;
    if (meta?.full_name?.trim()) return meta.full_name.trim();
    if (meta?.display_name?.trim()) return meta.display_name.trim();
    if (meta?.name?.trim()) return meta.name.trim();
    if (meta?.user_name?.trim()) return meta.user_name.trim();

    if (user?.email) {
        const parteEmail = user.email.split('@')[0];
        // Capitaliza a primeira letra do username extraído do email
        return parteEmail.charAt(0).toUpperCase() + parteEmail.slice(1);
    }

    return 'Ouvinte';
}

type TipoContextoAutenticacao = {
    usuario: User | null;
    sessao: Session | null;
    perfil: PerfilUsuarioDB | null;
    nomeExibido: string;
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
    const [perfil, setPerfil] = useState<PerfilUsuarioDB | null>(null);
    const [carregando, setCarregando] = useState(true);

    const carregarPerfil = async (user: User | null) => {
        if (!user?.id) {
            setPerfil(null);
            return;
        }
        try {
            const perfilDb = await buscarPerfilUsuario(user.id);
            if (perfilDb) {
                setPerfil(perfilDb);
            } else {
                const res = await criarOuAtualizarPerfilUsuario(user);
                if (res.perfil) setPerfil(res.perfil);
            }
        } catch (e) {
            console.warn('[AuthContext] Erro ao carregar perfil:', e);
        }
    };

    useEffect(() => {
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            setSessao(session);
            setUsuario(session?.user ?? null);
            setCarregando(false);
            if (session?.user) {
                await carregarPerfil(session.user);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_evento, sessaoAtual) => {
            setSessao(sessaoAtual);
            setUsuario(sessaoAtual?.user ?? null);
            setCarregando(false);
            if (sessaoAtual?.user) {
                await carregarPerfil(sessaoAtual.user);
            } else {
                setPerfil(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const entrar = async (
        email: string,
        senha: string
    ): Promise<{ erro: string | null }> => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) return { erro: error.message };
        if (data.user) {
            await carregarPerfil(data.user);
        }
        return { erro: null };
    };

    const cadastrar = async (
        email: string,
        senha: string,
        nome: string
    ): Promise<{ erro: string | null }> => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password: senha,
            options: {
                data: {
                    full_name: nome,
                    display_name: nome,
                    user_name: email.split('@')[0],
                    soundcloud_email: email,
                    soundcloud_synced: true,
                },
            },
        });
        if (error) return { erro: error.message };
        if (data.user) {
            await carregarPerfil(data.user);
        }
        return { erro: null };
    };

    const sair = async () => {
        setPerfil(null);
        await supabase.auth.signOut();
    };

    const nomeExibido = extrairNomeExibido(usuario, perfil);

    return (
        <ContextoAutenticacao.Provider
            value={{ usuario, sessao, perfil, nomeExibido, carregando, entrar, cadastrar, sair }}
        >
            {filhos}
        </ContextoAutenticacao.Provider>
    );
}

export const useAutenticacao = () => useContext(ContextoAutenticacao);
