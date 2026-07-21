/**
 * youtube.ts — Resolução de áudio do YouTube via instâncias Piped.
 *
 * A busca de músicas do YouTube já é feita pela VibeSom API (endpoint /pesquisa),
 * portanto este módulo cuida apenas da extração do stream de áudio
 * a partir do ID do vídeo, usando instâncias públicas do Piped como proxy.
 */

const INSTANCIAS_PIPED = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.adminforge.de',
    'https://pipedapi.in.projectsegfau.lt',
    'https://piped-api.privacy.com.de',
    'https://pipedapi.smnz.de',
    'https://api-piped.mha.fi',
    'https://piped-api.lunar.icu',
    'https://pipedapi.drgns.space',
    'https://pipedapi.tokhmi.xyz',
    'https://piped-api.codeberg.page',
];

const INSTANCIAS_INVIDIOUS = [
    'https://invidious.drgns.space',
    'https://iv.ggtyler.dev',
    'https://inv.odyssey346.dev',
    'https://invidious.protokolla.fi',
];

/** Tempo máximo (ms) para cada tentativa de instância. */
const TIMEOUT_MS = 10_000;

/**
 * Obtém a URL de áudio de um vídeo do YouTube via Piped.
 *
 * Percorre as instâncias disponíveis até obter sucesso.
 * Prioriza streams `audio/mp4` (m4a) para melhor compatibilidade com expo-audio.
 *
 * @param id  ID do vídeo (pode conter o prefixo `/watch?v=`)
 * @returns   URL direta do stream de áudio, ou `null` se todas falharem.
 */
export async function obterAudioYoutube(id: string): Promise<string | null> {
    const videoId = id.replace('/watch?v=', '').replace('/', '');

    // Função para buscar e processar o stream de uma única instância.
    // Rejeita a promise em caso de falha para que Promise.any possa ignorá-la.
    const buscarEmInstancia = (instancia: string): Promise<string> => {
        return new Promise(async (resolve, reject) => {
            const controlador = new AbortController();
            const timer = setTimeout(() => {
                controlador.abort();
                reject(new Error(`Timeout para ${instancia}`));
            }, TIMEOUT_MS);

            try {
                const resposta = await fetch(`${instancia}/streams/${videoId}`, {
                    signal: controlador.signal,
                });

                if (!resposta.ok) {
                    return reject(new Error(`Resposta não-OK de ${instancia}: ${resposta.status}`));
                }

                const dados = await resposta.json();
                if (!dados?.audioStreams?.length) {
                    return reject(new Error(`Nenhum stream de áudio em ${instancia}`));
                }

                const streams = dados.audioStreams;
                const obterMelhorStream = (formato: 'm4a' | 'webm') =>
                    streams
                        .filter((s: any) => s.format === formato && s.url)
                        .sort((a: any, b: any) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0];

                const urlFinal =
                    obterMelhorStream('m4a')?.url ??
                    obterMelhorStream('webm')?.url ??
                    streams[0]?.url;

                if (urlFinal) resolve(urlFinal);
                else reject(new Error(`URL de stream não encontrada em ${instancia}`));
            } catch (err) {
                reject(err);
            } finally {
                clearTimeout(timer);
            }
        });
    };

    const buscarEmInvidious = (instancia: string): Promise<string> => {
        return new Promise(async (resolve, reject) => {
            const controlador = new AbortController();
            const timer = setTimeout(() => {
                controlador.abort();
                reject(new Error(`Timeout para Invidious ${instancia}`));
            }, TIMEOUT_MS);

            try {
                const resposta = await fetch(`${instancia}/api/v1/videos/${videoId}`, {
                    signal: controlador.signal,
                });

                if (!resposta.ok) {
                    return reject(new Error(`Resposta não-OK de Invidious ${instancia}: ${resposta.status}`));
                }

                const dados = await resposta.json();
                const streams = dados?.adaptiveFormats;

                if (!streams?.length) {
                    return reject(new Error(`Nenhum stream de áudio em Invidious ${instancia}`));
                }

                const obterMelhorStream = (formato: 'mp4' | 'webm') =>
                    streams
                        .filter((s: any) => s.type?.includes(`audio/${formato}`) && s.url)
                        .sort((a: any, b: any) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0];

                const urlFinal = obterMelhorStream('mp4')?.url ?? obterMelhorStream('webm')?.url;

                if (urlFinal) resolve(urlFinal);
                else reject(new Error(`URL de stream não encontrada em Invidious ${instancia}`));
            } catch (err) {
                reject(err);
            } finally {
                clearTimeout(timer);
            }
        });
    };

    try {
        const promessas = INSTANCIAS_PIPED.map(buscarEmInstancia);
        return await Promise.any(promessas);
    } catch (e) {
        console.warn(`[YouTube] Piped falhou para ${videoId}. Tentando Invidious...`);
        try {
            const promessasInvidious = INSTANCIAS_INVIDIOUS.map(buscarEmInvidious);
            return await Promise.any(promessasInvidious);
        } catch (e2) {
            console.error(`[YouTube] Invidious também falhou para ${videoId}.`);
            return null;
        }
    }
}
