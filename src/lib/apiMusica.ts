
const URL_BASE = (
    process.env.EXPO_PUBLIC_API_URL ?? 'https://vibesom-api.vercel.app'
).replace(/\/$/, '');


export type Musica = {
    /** Plataforma de origem: 'SoundCloud', 'Audius', 'Jamendo', etc. */
    source: string;
    /** ID único da música na plataforma de origem */
    id: string;
    titulo: string;
    artista: string;
    /** URL da capa do álbum — pode ser string vazia ou null */
    capa: string | null;
    /** Duração em segundos */
    duracao: number;
    /**
     * URL de streaming. Pode ser relativa (ex: /soundcloud/stream/123)
     * — use urlStreamCompleta() para resolver.
     */
    streamUrl: string;
};

/**
 * Representa um álbum retornado pela API.
 */
export type Album = {
    source: string;
    id: string;
    titulo: string;
    artista: string;
    capa: string | null;
};

/**
 * Representa um artista retornado pela API.
 */
export type Artista = {
    source: string;
    id: string;
    nome: string;
    capa: string | null;
    inscritos?: string; // Opcional, pois pode não vir de todas as fontes
};

/**
 * Representa uma playlist (ou álbum) retornada pela API.
 */
export type Playlist = {
    source: string;
    id: string;
    titulo: string;
    artista: string;
    capa: string | null;
    quantidade?: number; // Opcional
};

export type ResultadoPesquisa = {
    artistas: Artista[];
    musicas: Musica[];
    playlists: Playlist[];
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Resolve streamUrl relativas para URLs absolutas usando URL_BASE.
 */
export function urlStreamCompleta(streamUrl: string): string {
    if (!streamUrl) return '';
    if (streamUrl.startsWith('http://') || streamUrl.startsWith('https://')) {
        return streamUrl;
    }
    const caminho = streamUrl.startsWith('/') ? streamUrl : `/${streamUrl}`;
    return `${URL_BASE}${caminho}`;
}

/**
 * Formata duração em segundos para "M:SS".
 */
export function formatarDuracao(segundos: number): string {
    if (!segundos || segundos < 0) return '—';
    const min = Math.floor(segundos / 60);
    const seg = Math.floor(segundos % 60);
    return `${min}:${seg.toString().padStart(2, '0')}`;
}

// ============================================================================
// Busca unificada — GET /pesquisa?termo=<termo>
// ============================================================================

/**
 * Pesquisa músicas, artistas e playlists em todas as plataformas via a VibeSom API.
 *
 * Endpoint: GET /pesquisa?termo=<termo>
 * Resposta de sucesso (200): { artistas: Artista[], musicas: Musica[], playlists: Playlist[] }
 * Resposta de erro (400): { erro: string }
 *
 * @param termo   Texto a pesquisar (artista, música, álbum)
 * @param signal  AbortSignal opcional para cancelamento
 * @returns       Objeto com os resultados da pesquisa.
 */
export async function pesquisar(
    termo: string,
    signal?: AbortSignal
): Promise<ResultadoPesquisa> {
    const termoLimpo = termo.trim();
    const resultadoVazio: ResultadoPesquisa = {
        artistas: [],
        musicas: [],
        playlists: [],
    };
    if (!termoLimpo) return resultadoVazio;

    const params = new URLSearchParams({ termo: termoLimpo });
    const url = `${URL_BASE}/pesquisa?${params}`;

    let resposta: Response;
    try {
        resposta = await fetch(url, { signal });
    } catch (err: unknown) {
        // Erro de rede ou abort
        if (err instanceof Error && err.name === 'AbortError') throw err;
        throw new Error('Sem conexão com o servidor.');
    }

    // 404 = nenhum resultado (tratamos como lista vazia)
    if (resposta.status === 404) return resultadoVazio;

    let dados: unknown;
    try {
        dados = await resposta.json();
    } catch {
        throw new Error('Resposta inválida do servidor.');
    }

    // Erros da API (400, 500, …)
    if (!resposta.ok) {
        const mensagem =
            dados &&
                typeof dados === 'object' &&
                'erro' in dados &&
                typeof (dados as { erro: unknown }).erro === 'string'
                ? (dados as { erro: string }).erro
                : `Erro na busca (${resposta.status})`;
        throw new Error(mensagem);
    }
    
    if (Array.isArray(dados)) {
        const musicas = dados as Musica[];
        const artistasMap = new Map<string, { count: number; musica: Musica }>();

        for (const musica of musicas) {
            if (!musica.artista) continue; 
            if (!artistasMap.has(musica.artista)) {
                artistasMap.set(musica.artista, { count: 0, musica: musica });
            }
            const entry = artistasMap.get(musica.artista)!;
            entry.count++;
        }

        const artistas: Artista[] = [];
        for (const [nome, { musica }] of artistasMap.entries()) {
            artistas.push({
                nome: nome,
                capa: musica.capa,
                id: nome, 
                source: musica.source,
            });
        }

        artistas.sort((a, b) => {
            const countA = artistasMap.get(a.nome)!.count;
            const countB = artistasMap.get(b.nome)!.count;
            return countB - countA;
        });

        const topArtista = artistas.length > 0 ? artistas[0] : null;
        const musicasFiltradas = topArtista
            ? musicas.filter(m => m.artista && m.artista.toLowerCase() === topArtista.nome.toLowerCase())
            : musicas;

        return {
            artistas: artistas,
            musicas: musicasFiltradas,
            playlists: [],
        };
    }


    // Valida se o objeto recebido tem a estrutura esperada
    if (
        dados &&
        typeof dados === 'object' &&
        'musicas' in dados &&
        Array.isArray((dados as ResultadoPesquisa).musicas)
    ) {
        return dados as ResultadoPesquisa;
    }

    return resultadoVazio;
}

//  todas as musicas por artista

export async function pesquisarMusicasPorArtista(
    artista: string,
    signal?: AbortSignal
): Promise<Musica[]> {
    const artistaLimpo = artista.trim();
    if (!artistaLimpo) return [];

    const params = new URLSearchParams({ termo: artistaLimpo });
    const url = `${URL_BASE}/pesquisa?${params}`;

    let resposta: Response;
    try {
        resposta = await fetch(url, { signal });
    } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') throw err;
        throw new Error('Sem conexão com o servidor.');
    }

    if (resposta.status === 404) return [];

    let dados: unknown;
    try {
        dados = await resposta.json();
    } catch {
        throw new Error('Resposta inválida do servidor.');
    }

    if (!resposta.ok) {
        const mensagem =
            dados &&
                typeof dados === 'object' &&
                'erro' in dados &&
                typeof (dados as { erro: unknown }).erro === 'string'
                ? (dados as { erro: string }).erro
                : `Erro na busca de músicas por artista (${resposta.status})`;
        throw new Error(mensagem);
    }

    if (Array.isArray(dados)) {
        return (dados as Musica[]).filter(
            (musica) => musica.artista && musica.artista.toLowerCase() === artistaLimpo.toLowerCase()
        );
    }

    return [];
}

/**
 * Pesquisa álbuns em todas as plataformas via a VibeSom API.
 * 
 * Endpoint: GET /pesquisa?termo=<termo>&tipo=album
 */
export async function pesquisarAlbums(
    termo: string,
    signal?: AbortSignal
): Promise<Album[]> {
    const termoLimpo = termo.trim();
    if (!termoLimpo) return [];

    const params = new URLSearchParams({ termo: termoLimpo, tipo: 'album' });
    const url = `${URL_BASE}/pesquisa?${params}`;

    let resposta: Response;
    try {
        resposta = await fetch(url, { signal });
    } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') throw err;
        throw new Error('Sem conexão com o servidor.');
    }

    if (resposta.status === 404) return [];

    let dados: unknown;
    try {
        dados = await resposta.json();
    } catch {
        throw new Error('Resposta inválida do servidor.');
    }

    if (!resposta.ok) {
        const mensagem =
            dados &&
                typeof dados === 'object' &&
                'erro' in dados &&
                typeof (dados as { erro: unknown }).erro === 'string'
                ? (dados as { erro: string }).erro
                : `Erro na busca de álbuns (${resposta.status})`;
        throw new Error(mensagem);
    }

    if (Array.isArray(dados)) {
        return (dados as Album[]);
    }

    return [];
}
