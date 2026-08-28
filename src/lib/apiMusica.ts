
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
    album?: string;
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
    /** Data de lançamento no formato YYYY-MM-DD ou ano. */
    dataLancamento?: string;
};

export type Lancamento = {
    id: string;
    titulo: string;
    artista: string;
    artistaId?: string;
    album?: string;
    capa: string | null;
    tipo?: string;
    dataLancamento?: string;
    duracao?: number;
    streamUrl?: string;
    source: string;
};

export type PaginaLancamentos = {
    pagina: number;
    limite: number;
    total: number;
    totalPaginas: number;
    lancamentos: Lancamento[];
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
    capa: string | null | undefined;
    inscritos?: string; // Opcional, pois pode não vir de todas as fontes
    totalAlbuns?: number;
    totalFaixas?: number;
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

/**
 * Formata data de lançamento ISO (YYYY-MM-DD) para exibição amigável em português.
 */
export function formatarDataLancamento(dataStr?: string): string {
    if (!dataStr) return '';
    try {
        const partes = dataStr.split('-');
        if (partes.length === 3) {
            const data = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
            if (!isNaN(data.getTime())) {
                return data.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
            }
        } else if (partes.length === 1 && partes[0].length === 4) {
            return partes[0];
        }
        return dataStr;
    } catch {
        return dataStr;
    }
}

const TEMPO_LIMITE_API_MS = 15_000;

/** Faz requisições autenticadas à API, mantendo o token de sessão fora do código. */
async function requisicaoApi<T>(
    caminho: string,
    token: string,
    opcoes: RequestInit = {},
    signal?: AbortSignal,
): Promise<T> {
    if (!token) throw new Error('Você precisa entrar para acessar esta funcionalidade.');

    const controlador = new AbortController();
    const aoAbortar = () => controlador.abort();
    signal?.addEventListener('abort', aoAbortar, { once: true });
    const timeout = setTimeout(() => controlador.abort(), TEMPO_LIMITE_API_MS);

    try {
        const resposta = await fetch(`${URL_BASE}${caminho}`, {
            ...opcoes,
            signal: controlador.signal,
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${token}`,
                ...opcoes.headers,
            },
        });

        const dados: unknown = await resposta.json().catch(() => null);
        if (!resposta.ok) {
            const mensagem = dados && typeof dados === 'object' && 'erro' in dados && typeof (dados as { erro: unknown }).erro === 'string'
                ? (dados as { erro: string }).erro
                : resposta.status === 401
                    ? 'Sua sessão expirou. Entre novamente para continuar.'
                    : `Não foi possível concluir a solicitação (${resposta.status}).`;
            throw new Error(mensagem);
        }
        return dados as T;
    } catch (erro) {
        if (erro instanceof Error && erro.name === 'AbortError') {
            if (signal?.aborted) throw erro;
            throw new Error('A solicitação demorou demais. Verifique sua conexão e tente novamente.');
        }
        if (erro instanceof Error) throw erro;
        throw new Error('Sem conexão com o servidor.');
    } finally {
        clearTimeout(timeout);
        signal?.removeEventListener('abort', aoAbortar);
    }
}

function normalizarLancamento(item: Partial<Lancamento>): Lancamento {
    return {
        id: String(item.id ?? ''),
        titulo: item.titulo ?? 'Sem título',
        artista: item.artista ?? 'Artista desconhecido',
        artistaId: item.artistaId,
        album: item.album,
        capa: item.capa ?? null,
        tipo: item.tipo,
        dataLancamento: item.dataLancamento,
        duracao: item.duracao,
        streamUrl: item.streamUrl,
        source: item.source ?? 'Desconhecida',
    };
}

// ============================================================================
// Artistas seguidos — API autenticada
// ============================================================================

export async function listarArtistasSeguidos(token: string, signal?: AbortSignal): Promise<Artista[]> {
    const dados = await requisicaoApi<unknown>('/artists/following', token, {}, signal);
    if (!Array.isArray(dados)) return [];
    return dados.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object').map(item => ({
        id: String(item.id ?? ''),
        nome: typeof item.nome === 'string' ? item.nome : 'Artista desconhecido',
        capa: typeof item.capa === 'string' ? item.capa : null,
        source: typeof item.source === 'string' ? item.source : 'Desconhecida',
    }));
}

export async function artistaEstaSendoSeguido(artistId: string, token: string, signal?: AbortSignal): Promise<boolean> {
    const dados = await requisicaoApi<{ following?: unknown }>(`/artists/${encodeURIComponent(artistId)}/following`, token, {}, signal);
    return dados.following === true;
}

export async function seguirArtistaNaApi(artista: Artista, token: string, signal?: AbortSignal): Promise<boolean> {
    const dados = await requisicaoApi<{ following?: unknown }>(
        `/artists/${encodeURIComponent(artista.id)}/follow`,
        token,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: artista.nome, image: artista.capa ?? undefined, source: artista.source }),
        },
        signal,
    );
    return dados.following !== false;
}

export async function deixarDeSeguirArtistaNaApi(artistId: string, token: string, signal?: AbortSignal): Promise<boolean> {
    const dados = await requisicaoApi<{ following?: unknown }>(
        `/artists/${encodeURIComponent(artistId)}/follow`,
        token,
        { method: 'DELETE' },
        signal,
    );
    return dados.following === true;
}

export async function buscarNovosLancamentos(token: string, pagina = 1, limite = 20, signal?: AbortSignal): Promise<PaginaLancamentos> {
    const params = new URLSearchParams({ page: String(pagina), limit: String(limite) });
    const dados = await requisicaoApi<Partial<PaginaLancamentos>>(`/artists/new-releases?${params.toString()}`, token, {}, signal);
    return {
        pagina: typeof dados.pagina === 'number' ? dados.pagina : pagina,
        limite: typeof dados.limite === 'number' ? dados.limite : limite,
        total: typeof dados.total === 'number' ? dados.total : 0,
        totalPaginas: typeof dados.totalPaginas === 'number' ? dados.totalPaginas : 0,
        lancamentos: Array.isArray(dados.lancamentos) ? dados.lancamentos.map(normalizarLancamento) : [],
    };
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
            id: String(mbAlbum.id),
            titulo: mbAlbum.title ?? mbAlbum.titulo ?? 'Sem título',
            artista: artistaNome ?? (mbAlbum['artist-credit']?.[0]?.name || 'Artista Desconhecido'),
            source: 'MusicBrainz',
            capa: mbAlbum.cover ?? mbAlbum.capa ?? null,
            tipo: mbAlbum.type ?? mbAlbum['release-group']?.['primary-type'] ?? mbAlbum['primary-type'] ?? mbAlbum.tipo ?? 'album',
            dataLancamento: mbAlbum['first-release-date'] ?? mbAlbum.release_date ?? mbAlbum.data ?? undefined,
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
            album: tituloAlbum,
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

export async function resolverAudio(
    artista: string,
    faixa: string,
    signal?: AbortSignal,
): Promise<{ source: string; url: string; streamUrl?: string; titulo: string; artista?: string; capa?: string }> {
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
        return {
            source: dados.source || 'Desconhecida',
            url: dados.url || dados.streamUrl || '',
            streamUrl: dados.streamUrl || dados.url || '',
            titulo: dados.titulo || faixa,
            artista: dados.artista || artista,
            capa: dados.capa ?? null,
        };
    } catch {
        throw new Error('Erro ao processar resposta do servidor.');
    }
}

/**
 * Busca e compila os lançamentos mais recentes de uma lista de artistas seguidos,
 * ordenados dos mais recentes para os mais antigos.
 */
export async function buscarNovosLancamentosDeArtistas(
    artistas: Artista[],
    signal?: AbortSignal
): Promise<Lancamento[]> {
    if (!artistas || artistas.length === 0) return [];

    const promessas = artistas.map(async (artista) => {
        try {
            const idArtista = artista.id || artista.nome;
            if (artista.source.toLowerCase() === 'musicbrainz' || /^\d+$/.test(idArtista)) {
                const albuns = await buscarAlbunsMB(idArtista, signal, artista.nome);
                return albuns.map(alb => ({
                    id: String(alb.id),
                    titulo: alb.titulo,
                    artista: alb.artista || artista.nome,
                    artistaId: idArtista,
                    album: alb.titulo,
                    capa: alb.capa || artista.capa,
                    tipo: alb.tipo || 'album',
                    dataLancamento: alb.dataLancamento,
                    source: alb.source || 'MusicBrainz',
                } as Lancamento));
            } else {
                const albuns = await pesquisarAlbums(artista.nome, signal);
                return albuns.map(alb => ({
                    id: String(alb.id),
                    titulo: alb.titulo,
                    artista: alb.artista || artista.nome,
                    artistaId: artista.id,
                    album: alb.titulo,
                    capa: alb.capa || artista.capa,
                    tipo: alb.tipo || 'album',
                    dataLancamento: alb.dataLancamento,
                    source: alb.source || 'SoundCloud',
                } as Lancamento));
            }
        } catch {
            return [];
        }
    });

    const resultados = await Promise.all(promessas);
    const todosLancamentos = resultados.flat();

    // Remove duplicatas de lançamentos com mesmo título e artista
    const lancamentosUnicos = new Map<string, Lancamento>();
    for (const lancamento of todosLancamentos) {
        const chave = `${lancamento.artista.toLowerCase()}_${lancamento.titulo.toLowerCase()}`;
        if (!lancamentosUnicos.has(chave)) {
            lancamentosUnicos.set(chave, lancamento);
        }
    }

    // Ordena do mais recente para o mais antigo
    return Array.from(lancamentosUnicos.values()).sort((a, b) => {
        const dataA = a.dataLancamento ? new Date(a.dataLancamento).getTime() : 0;
        const dataB = b.dataLancamento ? new Date(b.dataLancamento).getTime() : 0;
        return dataB - dataA;
    });
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
 * Busca em todas as plataformas por fontes de áudio alternativas para uma
 * determinada música, usando o endpoint de pesquisa genérico da API.
 * Retorna as 5 melhores correspondências encontradas.
 */
export async function buscarFontesDeAudio(
    musica: Musica,
    signal?: AbortSignal
): Promise<FonteAudio[]> {
    const termo = `${musica.artista} ${musica.titulo}`;

    try {
        const { musicas } = await pesquisar(termo, signal);

        if (!musicas || musicas.length === 0) return [];

        const tituloOriginal = normalizarTexto(musica.titulo);
        const artistaOriginal = normalizarTexto(musica.artista);

        const pontuarCandidato = (candidato: Musica) => {
            if (!candidato.titulo || !candidato.artista) return -99;
            if ((candidato.duracao ?? 0) < 45) return -99; // descarta faixas muito curtas

            const tituloCandidato = normalizarTexto(candidato.titulo);
            const artistaCandidato = normalizarTexto(candidato.artista);
            let pontuacao = 0;

            // Bônus por título e artista correspondentes
            if (tituloCandidato.includes(tituloOriginal) || tituloOriginal.includes(tituloCandidato)) {
                pontuacao += 5;
            }
            if (artistaCandidato.includes(artistaOriginal)) {
                pontuacao += 3;
            }
            if (tituloCandidato === tituloOriginal) {
                pontuacao += 5; // Bônus maior para correspondência exata
            }

            // Penalidade por diferença de duração
            if (musica.duracao > 0 && candidato.duracao > 0) {
                const diff = Math.abs(musica.duracao - candidato.duracao);
                if (diff > 10) pontuacao -= 1; // Pequena penalidade
                if (diff > 20) pontuacao -= 2; // Penalidade maior
            }

            // Penalidade por termos extras no título (ex: "live", "remix")
            const extras = ['live', 'remix', 'acoustic', 'cover', 'official video'];
            for (const extra of extras) {
                if (tituloCandidato.includes(extra) && !tituloOriginal.includes(extra)) {
                    pontuacao -= 3;
                }
            }
            return pontuacao;
        };

        const candidatos = musicas
            .map(c => ({ ...c, pontuacao: pontuarCandidato(c) }))
            .filter(c => c.pontuacao > 0)
            .sort((a, b) => b.pontuacao - a.pontuacao);

        return candidatos.slice(0, 5);

    } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') throw err;
        console.error('[buscarFontesDeAudio] Falha ao buscar fontes:', err);
        return [];
    }
}
