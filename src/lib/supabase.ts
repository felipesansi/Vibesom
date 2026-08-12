import { createClient, type User } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';
import type { Musica } from './apiMusica';

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

export type PerfilUsuario = {
    id: string;
    nome_usuario: string;
    nome_completo: string | null;
    avatar_url: string | null;
    criado_em: string;
};

export type PlaylistDB = {
    id: string;
    usuario_id: string;
    nome: string;
    descricao: string | null;
    e_publica: boolean;
    criado_em: string;
};

export type MusicaDB = {
    id: string;
    usuario_id?: string;
    id_original_midia: string;
    source: string;
    titulo: string;
    artista: string;
    capa_url: string | null;
    duracao_segundos: number;
    stream_url: string;
    criado_em: string;
};

export type PlaylistMusicaDB = {
    playlist_id: string;
    musica_id: string;
    posicao: number | null;
    adicionado_em: string;
};

export async function criarOuAtualizarPerfilUsuario(
    usuario: User,
): Promise<{ erro: string | null }> {
    if (!usuario?.id) {
        return { erro: 'Usuário inválido.' };
    }

    const { data: me, error: userErr } = await supabase.auth.getUser();
    if (userErr) {
        return { erro: userErr.message };
    }
    if (!me?.user) {
        return { erro: 'Usuário não autenticado.' };
    }

    const usuarioId = me.user.id;
    const nomeUsuario =
        typeof usuario.user_metadata?.user_name === 'string' && usuario.user_metadata.user_name.trim()
            ? usuario.user_metadata.user_name.trim()
            : typeof usuario.email === 'string' && usuario.email.trim()
                ? usuario.email.split('@')[0]
                : usuarioId;

    const nomeCompleto =
        typeof usuario.user_metadata?.full_name === 'string' && usuario.user_metadata.full_name.trim()
            ? usuario.user_metadata.full_name.trim()
            : null;

    const avatarUrl =
        typeof usuario.user_metadata?.avatar_url === 'string' && usuario.user_metadata.avatar_url.trim()
            ? usuario.user_metadata.avatar_url.trim()
            : null;

    const { error } = await supabase
        .from('perfis_usuarios')
        .upsert({
            id: usuarioId,
            nome_usuario: nomeUsuario,
            nome_completo: nomeCompleto,
            avatar_url: avatarUrl,
        }, { onConflict: 'id' });

    return { erro: error?.message ?? null };
}

export async function salvarMusicaFavorita(
    usuario: User,
    musica: Musica,
): Promise<{ erro: string | null }> {
    if (!usuario?.id) {
        return { erro: 'Usuário inválido.' };
    }

    const { data: me, error: userErr } = await supabase.auth.getUser();
    if (userErr) {
        console.warn('[Supabase] usuário inválido ao salvar música:', userErr.message);
        return { erro: 'Sessão inválida. Faça login novamente.' };
    }
    if (!me?.user) {
        console.warn('[Supabase] usuário não autenticado ao salvar música');
        return { erro: 'Sessão inválida. Faça login novamente.' };
    }

    const usuarioId = me.user.id;
    if (usuarioId !== usuario.id) {
        console.warn('[Supabase] ID do usuário da sessão difere do usuário passado:', usuario.id, usuarioId);
    }

    const perfilResult = await criarOuAtualizarPerfilUsuario(usuario);
    if (perfilResult.erro) {
        console.warn('[Supabase] erro ao garantir perfil do usuário antes de salvar música:', perfilResult.erro);
        return { erro: perfilResult.erro };
    }

    try {
        const { error: erroMusica } = await supabase
            .from('musicas')
            .upsert({
                usuario_id: usuarioId,
                id_original_midia: `${musica.source}:${musica.id}`,
                source: musica.source,
                titulo: musica.titulo,
                artista: musica.artista,
                capa_url: musica.capa,
                duracao_segundos: Math.round(musica.duracao),
                stream_url: musica.streamUrl,
            }, { onConflict: 'id_original_midia' });

        if (erroMusica) {
            console.warn('[Supabase] Erro ao salvar música:', erroMusica.message);
            return { erro: erroMusica.message };
        }

        const musicaRes = await supabase
            .from('musicas')
            .select('id')
            .eq('id_original_midia', `${musica.source}:${musica.id}`)
            .single();

        if (musicaRes.error || !musicaRes.data) {
            return { erro: musicaRes.error?.message ?? 'Não foi possível obter o ID da música.' };
        }

        const { id: musicaId } = musicaRes.data as { id: string };

        const playlistNome = 'Favoritas';
        const { data: playlistsExistentes, error: erroPlaylist } = await supabase
            .from('playlists')
            .select('id')
            .eq('usuario_id', usuario.id)
            .eq('nome', playlistNome)
            .maybeSingle();

        if (erroPlaylist && erroPlaylist.code !== 'PGRST116') {
            return { erro: erroPlaylist.message };
        }

        let playlistId = playlistsExistentes?.id;
        if (!playlistId) {
            const { data: novaPlaylist, error: erroCriar } = await supabase
                .from('playlists')
                .insert({
                    usuario_id: usuario.id,
                    nome: playlistNome,
                    descricao: 'Minhas músicas curtidas',
                    e_publica: false,
                })
                .single();

            if (erroCriar || !novaPlaylist) {
                return { erro: erroCriar?.message ?? 'Não foi possível criar a playlist de favoritas.' };
            }
            playlistId = (novaPlaylist as PlaylistDB).id;
        }

        const { error: erroInserir } = await supabase
            .from('playlist_musicas')
            .upsert({
                playlist_id: playlistId,
                musica_id: musicaId,
                posicao: 0,
            }, { onConflict: 'playlist_id,musica_id' });

        if (erroInserir) {
            return { erro: erroInserir.message };
        }

        return { erro: null };
    } catch (erro) {
        console.error('[Supabase] salvarMusicaFavorita', erro);
        return { erro: erro instanceof Error ? erro.message : 'Erro desconhecido' };
    }
}

export async function buscarPlaylistsDoUsuario(
    usuarioId: string,
): Promise<PlaylistDB[]> {
    const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('usuario_id', usuarioId)
        .order('criado_em', { ascending: false });

    if (error) throw error;
    return data ?? [];
}

export async function criarPlaylist(
    usuarioId: string,
    nome: string,
    descricao?: string,
    ePublica?: boolean,
): Promise<{ data?: PlaylistDB; erro: string | null }> {
    const { data, error } = await supabase
        .from('playlists')
        .insert({
            usuario_id: usuarioId,
            nome,
            descricao: descricao ?? null,
            e_publica: ePublica ?? true,
        })
        .single();

    if (error) return { erro: error.message };
    return { data: data ?? undefined, erro: null };
}

export async function adicionarMusicaAPlaylist(
    playlistId: string,
    musicaId: string,
    posicao?: number,
): Promise<{ erro: string | null }> {
    const { error } = await supabase
        .from('playlist_musicas')
        .upsert({
            playlist_id: playlistId,
            musica_id: musicaId,
            posicao: posicao ?? 0,
        }, { onConflict: 'playlist_id,musica_id' });

    if (error) return { erro: error.message };
    return { erro: null };
}

export async function buscarMusicasDaPlaylist(
    playlistId: string,
): Promise<Musica[]> {
    const { data, error } = await supabase
        .from('playlist_musicas')
        .select('musicas(id, source, titulo, artista, capa_url, duracao_segundos, stream_url, id_original_midia)')
        .eq('playlist_id', playlistId)
        .order('posicao', { ascending: true });

    if (error) throw error;
    return (data ?? []).map((item: any) => {
        const track = item.musicas;
        const idOriginalMidia = typeof track.id_original_midia === 'string' ? track.id_original_midia : '';
        const idFromOriginalMidia = idOriginalMidia.startsWith(`${track.source}:`)
            ? idOriginalMidia.slice(track.source.length + 1)
            : track.id;

        return {
            source: track.source,
            id: idFromOriginalMidia,
            titulo: track.titulo,
            artista: track.artista,
            capa: track.capa_url,
            duracao: track.duracao_segundos ?? 0,
            streamUrl: track.stream_url,
        };
    });
}

export async function buscarPlaylistFavoritasDoUsuario(
    usuarioId: string,
): Promise<string | null> {
    const { data, error } = await supabase
        .from('playlists')
        .select('id')
        .eq('usuario_id', usuarioId)
        .eq('nome', 'Favoritas')
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data?.id ?? null;
}

export async function removerMusicaFavorita(
    usuarioId: string,
    musica: Musica,
): Promise<{ erro: string | null }> {
    try {
        const playlistId = await buscarPlaylistFavoritasDoUsuario(usuarioId);
        if (!playlistId) return { erro: null };

        const idOriginalMidia = `${musica.source}:${musica.id}`;
        const musicaRes = await supabase
            .from('musicas')
            .select('id')
            .eq('id_original_midia', idOriginalMidia)
            .single();

        if (musicaRes.error || !musicaRes.data) {
            return { erro: musicaRes.error?.message ?? null };
        }

        const { error } = await supabase
            .from('playlist_musicas')
            .delete()
            .eq('playlist_id', playlistId)
            .eq('musica_id', musicaRes.data.id);

        if (error) return { erro: error.message };
        return { erro: null };
    } catch (erro) {
        console.error('[Supabase] removerMusicaFavorita', erro);
        return { erro: erro instanceof Error ? erro.message : 'Erro desconhecido' };
    }
}
