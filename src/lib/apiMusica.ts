
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
    /** Tipo de lançamento quando a API o disponibiliza (album, single, ep...). */
    tipo?: string;
};

export type FonteAudio = Pick<Musica, 'source' | 'streamUrl'> & {
    id: string;
    titulo: string;
    artista: string;
    capa: string | null;
    duracao: number;
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

    const params = new URLSearchParams({ termo: termoLimpo, limit: '50' });
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

        // Retorna TODAS as músicas — não filtra por artista dominante
        // pois buscas por título de música teriam artistas variados (uploaders)
        return {
            artistas: artistas,
            musicas: musicas,
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

    const musicas = Array.isArray(dados)
        ? dados as Musica[]
        : dados && typeof dados === 'object' && 'musicas' in dados && Array.isArray((dados as ResultadoPesquisa).musicas)
            ? (dados as ResultadoPesquisa).musicas
            : [];

    return musicas.filter(
            (musica) => musica.artista && musica.artista.toLowerCase() === artistaLimpo.toLowerCase()
    );
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

// ============================================================================
// MusicBrainz e Resolver
// ============================================================================

export async function buscarArtistasMB(nome: string, signal?: AbortSignal): Promise<Artista[]> {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) return [];

    const url = `${URL_BASE}/musicbrainz/artista/${encodeURIComponent(nomeLimpo)}`;

    let resposta: Response;
    try {
        resposta = await fetch(url, { signal });
    } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') throw err;
        throw new Error('Sem conexão com o servidor.');
    }

    if (!resposta.ok) return [];

    try {
        const dados = await resposta.json();
        return dados.map((mbArt: any) => ({
            id: mbArt.id,
            nome: mbArt.name,
            source: 'MusicBrainz',
            capa: mbArt.picture ?? null,
            inscritos: typeof mbArt.fans === 'number' ? String(mbArt.fans) : undefined,
        }));
    } catch {
        return [];
    }
}

export async function buscarAlbunsMB(artistaId: string, signal?: AbortSignal, artistaNome?: string): Promise<Album[]> {
    const url = `${URL_BASE}/musicbrainz/album/${encodeURIComponent(artistaId)}`;
    let resposta: Response;
    try {
        resposta = await fetch(url, { signal });
    } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') throw err;
        throw new Error('Sem conexão com o servidor.');
    }

    if (!resposta.ok) return [];

    try {
        const dados = await resposta.json();
        return dados.map((mbAlbum: any) => ({
            id: mbAlbum.id,
            titulo: mbAlbum.title ?? mbAlbum.titulo ?? 'Sem título',
            artista: artistaNome ?? (mbAlbum['artist-credit']?.[0]?.name || 'Artista Desconhecido'),
            source: 'MusicBrainz',
            capa: mbAlbum.cover ?? mbAlbum.capa ?? null,
            tipo: mbAlbum.type ?? mbAlbum['release-group']?.['primary-type'] ?? mbAlbum['primary-type'] ?? mbAlbum.tipo
        }));
    } catch {
        return [];
    }
}

export async function buscarMusicasDeAlbumMB(
    artistaId: string,
    tituloAlbum: string,
    signal?: AbortSignal,
    artistaNome?: string
): Promise<Musica[]> {
    // A API disponibiliza as faixas no catálogo do artista; cada faixa informa
    // o campo `album`, que usamos para montar a página do lançamento.
    const url = `${URL_BASE}/musicbrainz/musicas/${encodeURIComponent(artistaId)}`;
    let resposta: Response;
    try {
        resposta = await fetch(url, { signal });
    } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') throw err;
        throw new Error('Sem conexão com o servidor.');
    }

    if (!resposta.ok) return [];

    try {
        const dados = await resposta.json();
        const albumNormalizado = tituloAlbum.trim().toLocaleLowerCase();
        return dados.filter((mbTrack: any) => (mbTrack.album ?? '').trim().toLocaleLowerCase() === albumNormalizado).map((mbTrack: any) => ({
            id: mbTrack.id,
            titulo: mbTrack.title ?? mbTrack.titulo ?? 'Sem título',
            artista: artistaNome ?? (mbTrack['artist-credit']?.[0]?.name || 'Artista Desconhecido'),
            source: mbTrack.preview ? 'Deezer' : 'MusicBrainz',
            capa: mbTrack.cover ?? mbTrack.capa ?? null,
            duracao: mbTrack.length ? Math.floor(mbTrack.length / 1000) : 0,
            streamUrl: mbTrack.preview ?? mbTrack.streamUrl ?? ''
        }));
    } catch {
        return [];
    }
}

/** Carrega as faixas de um álbum, respeitando o identificador e a fonte da API. */
export async function buscarMusicasDoAlbum(
    albumId: string,
    source: string,
    signal?: AbortSignal,
    artistaNome?: string,
    artistaId?: string,
    tituloAlbum?: string
): Promise<Musica[]> {
    if (source.toLowerCase() === 'musicbrainz') {
        if (!artistaId || !tituloAlbum) return [];
        return buscarMusicasDeAlbumMB(artistaId, tituloAlbum, signal, artistaNome);
    }

    const params = new URLSearchParams({ source });
    const url = `${URL_BASE}/album/${encodeURIComponent(albumId)}?${params.toString()}`;
    try {
        const resposta = await fetch(url, { signal });
        if (!resposta.ok) return [];
        const dados: unknown = await resposta.json();
        const faixas = Array.isArray(dados)
            ? dados
            : dados && typeof dados === 'object' && 'musicas' in dados && Array.isArray((dados as ResultadoPesquisa).musicas)
                ? (dados as ResultadoPesquisa).musicas
                : [];
        return faixas as Musica[];
    } catch (erro: unknown) {
        if (erro instanceof Error && erro.name === 'AbortError') throw erro;
        return [];
    }
}


export async function buscarMusicasMB(artistaId: string, signal?: AbortSignal, artistaNome?: string): Promise<Musica[]> {
    const url = `${URL_BASE}/musicbrainz/musicas/${encodeURIComponent(artistaId)}`;
    let resposta: Response;
    try {
        resposta = await fetch(url, { signal });
    } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') throw err;
        throw new Error('Sem conexão com o servidor.');
    }

    if (!resposta.ok) return [];

    try {
        const dados = await resposta.json();
        return dados.map((mbTrack: any) => ({
            id: mbTrack.id,
            titulo: mbTrack.title ?? mbTrack.titulo ?? 'Sem título',
            artista: artistaNome ?? (mbTrack['artist-credit']?.[0]?.name || 'Artista Desconhecido'),
            source: mbTrack.preview ? 'Deezer' : 'MusicBrainz',
            capa: mbTrack.cover ?? mbTrack.capa ?? null,
            duracao: mbTrack.length ? Math.floor(mbTrack.length / 1000) : 0,
            streamUrl: mbTrack.preview ?? mbTrack.streamUrl ?? ''
        }));
    } catch {
        return [];
    }
}

export async function resolverAudio(artista: string, faixa: string, signal?: AbortSignal): Promise<{ source: string, url: string, titulo: string }> {
    const params = new URLSearchParams({ artista, faixa });
    const url = `${URL_BASE}/resolver?${params.toString()}`;

    let resposta: Response;
    try {
        resposta = await fetch(url, { signal });
    } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') throw err;
        throw new Error('Sem conexão com o servidor.');
    }

    if (!resposta.ok) {
        throw new Error('Áudio não encontrado em nenhuma plataforma.');
    }

    try {
        const dados = await resposta.json();
        return dados;
    } catch {
        throw new Error('Erro ao processar resposta do servidor.');
    }
}

function normalizarTexto(texto: unknown): string {
    return (typeof texto === 'string' ? texto : '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

function fonteDaResposta(dados: unknown, musica: Musica): FonteAudio[] {
    const itens = Array.isArray(dados)
        ? dados
        : dados && typeof dados === 'object'
            ? ((dados as { fontes?: unknown; resultados?: unknown; musicas?: unknown }).fontes
                ?? (dados as { resultados?: unknown }).resultados
                ?? (dados as { musicas?: unknown }).musicas
                ?? [dados])
            : [];

    if (!Array.isArray(itens)) return [];

    return itens.flatMap((item): FonteAudio[] => {
        if (!item || typeof item !== 'object') return [];
        const fonte = item as Record<string, unknown>;
        const streamUrl = typeof fonte.url === 'string'
            ? fonte.url
            : typeof fonte.streamUrl === 'string' ? fonte.streamUrl : '';
        const source = typeof fonte.source === 'string' ? fonte.source : '';
        if (!streamUrl || !source) return [];
        return [{
            id: typeof fonte.id === 'string' ? fonte.id : musica.id,
            titulo: typeof fonte.titulo === 'string' ? fonte.titulo : musica.titulo,
            artista: typeof fonte.artista === 'string' ? fonte.artista : musica.artista,
            capa: typeof fonte.capa === 'string' ? fonte.capa : musica.capa,
            duracao: typeof fonte.duracao === 'number' ? fonte.duracao : musica.duracao,
            source,
            streamUrl,
        }];
    });
}

async function buscarCandidatoDaFonte(
    url: string,
    musica: Musica,
    source: string,
    quantidade: number,
    signal?: AbortSignal
): Promise<FonteAudio[]> {
    try {
        const resposta = await fetch(url, { signal });
        if (!resposta.ok) return [];
        const dados: unknown = await resposta.json();
        const itens = Array.isArray(dados)
            ? dados
            : dados && typeof dados === 'object' && 'musicas' in dados && Array.isArray((dados as ResultadoPesquisa).musicas)
                ? (dados as ResultadoPesquisa).musicas
                : [];
        const titulo = normalizarTexto(musica.titulo);
        const artista = normalizarTexto(musica.artista);
        // A rota específica do SoundCloud não envia `source`; a rota já
        // determina a origem, então completamos o campo antes de filtrar.
        const candidatos = (itens as Partial<Musica>[])
            .map(item => ({ ...item, source: typeof item.source === 'string' ? item.source : source }) as Musica)
            .filter(item => typeof item.streamUrl === 'string' && typeof item.source === 'string')
            .filter(item => typeof item.duracao === 'number' && item.duracao >= 60)
            .filter(item => {
                const tituloCandidato = normalizarTexto(item.titulo);
                return tituloCandidato.includes(titulo) || titulo.includes(tituloCandidato);
            })
            .sort((a, b) => {
                const pontuacao = (item: Musica) =>
                    (normalizarTexto(item.titulo) === titulo ? 4 : 0)
                    + (normalizarTexto(item.artista).includes(artista) ? 2 : 0)
                    + (normalizarTexto(item.titulo).includes(artista) ? 1 : 0);
                return pontuacao(b) - pontuacao(a);
            });
        return candidatos.slice(0, quantidade).map(item => ({ ...item }));
    } catch (erro: unknown) {
        if (erro instanceof Error && erro.name === 'AbortError') throw erro;
        return [];
    }
}

/**
 * Retorna quatro alternativas para a faixa: duas do YouTube e duas do
 * SoundCloud. Faixas com menos de um minuto são sempre descartadas.
 */
export async function buscarFontesDeAudio(
    musica: Musica,
    signal?: AbortSignal
): Promise<FonteAudio[]> {
    const consulta = encodeURIComponent(`${musica.artista} ${musica.titulo}`);
    const [youtube, soundcloud] = await Promise.allSettled([
        buscarCandidatoDaFonte(`${URL_BASE}/youtube/busca?termo=${consulta}&limite=20`, musica, 'YouTube', 2, signal),
        buscarCandidatoDaFonte(`${URL_BASE}/soundcloud/search/${consulta}`, musica, 'SoundCloud', 2, signal),
    ]);

    return [youtube, soundcloud]
        .flatMap(resultado => resultado.status === 'fulfilled' ? resultado.value : [])
        .filter((fonte): fonte is FonteAudio =>
            typeof fonte?.source === 'string'
            && typeof fonte.streamUrl === 'string'
            && fonte.streamUrl.length > 0
            && fonte.duracao >= 60
        )
        .slice(0, 4);
}
