import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { router } from 'expo-router';
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState
} from 'react';
import { Alert } from 'react-native';
import { Musica, pesquisar, resolverAudio, urlStreamCompleta } from '../lib/apiMusica';
import { obterArquivoMusicaBaixada } from '../app/services/DownloadMusica';


type EstadoPlayer = 'parado' | 'carregando' | 'tocando' | 'pausado' | 'erro';
type ModoRepeticao = 'desligado' | 'fila' | 'faixa';

type ContextoPlayerValor = {
    faixaAtual: Musica | null;
    lista: Musica[];
    estado: EstadoPlayer;
    erro: string | null;
    posicao: number;   // segundos
    duracao: number;   // segundos
    buscarPara: (segundos: number) => void;
    repetir: ModoRepeticao;
    aleatorio: boolean;
    tocar: (musica: Musica, novaLista?: Musica[]) => Promise<void>;
    pausar: () => void;
    retomar: () => void;
    parar: () => void;
    proxima: () => void;
    anterior: () => void;
    alternarRepeticao: () => void;
    alternarAleatorio: () => void;
    adicionarAFila: (musica: Musica) => void;
};


const ContextoPlayer = createContext<ContextoPlayerValor | null>(null);

export function ProvedorPlayer({ children }: { children: React.ReactNode }) {
    const [faixaAtual, setFaixaAtual] = useState<Musica | null>(null);
    const [lista, setLista] = useState<Musica[]>([]);
    const [indiceAtual, setIndiceAtual] = useState<number>(-1);
    const [estado, setEstado] = useState<EstadoPlayer>('parado');
    const [erroMsg, setErroMsg] = useState<string | null>(null);
    const [repetir, setRepetir] = useState<ModoRepeticao>('desligado');
    const [aleatorio, setAleatorio] = useState(false);
    const requisicaoAtual = useRef(0);
    const iniciarAoCarregar = useRef(false);
    const tentouFallbackRef = useRef(false);
    const alternativasRef = useRef<Musica[]>([]);
    const indiceAlternativaRef = useRef(0);

    const player = useAudioPlayer(null);
    const status = useAudioPlayerStatus(player);

    // Configura sessão de áudio para reprodução em segundo plano
    useEffect(() => {
        setAudioModeAsync({
            playsInSilentMode: true,
            shouldPlayInBackground: true,
            interruptionMode: 'doNotMix',
        }).catch(e => console.warn('[Player] setAudioModeAsync falhou:', e));
    }, []);

    // Sincroniza estado com status do player
    React.useEffect(() => {
        if (!faixaAtual) {
            setEstado('parado');
            setErroMsg(null);
            return;
        }

        if (erroMsg) {
            setEstado('erro');
            return;
        }

        if (status.playing) {
            setEstado('tocando');
        } else if (!status.isLoaded || status.isBuffering || estado === 'carregando') {
            setEstado('carregando');
        } else {
            setEstado('pausado');
        }
    }, [status.playing, status.isLoaded, status.isBuffering, faixaAtual, erroMsg, estado]);

    // HLS (SoundCloud) pode levar alguns segundos para carregar o manifesto.
    // Iniciar somente quando o player reportar a fonte pronta evita perder o
    // comando play enviado logo após replace() em conexões móveis lentas.
    useEffect(() => {
        if (!iniciarAoCarregar.current || !status.isLoaded) return;
        iniciarAoCarregar.current = false;
        player.play();
    }, [status.isLoaded, player]);

    // Alguns provedores encerram a conexão sem propagar um erro nativo. Evita
    // que a interface fique carregando indefinidamente nesses casos.
    useEffect(() => {
        if (!faixaAtual || estado !== 'carregando') return;

        const limite = setTimeout(async () => {
            const requisicao = requisicaoAtual.current;
            if (!tentouFallbackRef.current && faixaAtual) {
                tentouFallbackRef.current = true;
                try {
                    const { musicas } = await pesquisar(`${faixaAtual.artista} ${faixaAtual.titulo}`);
                    if (requisicao !== requisicaoAtual.current) return;
                    const vistos = new Set([`${faixaAtual.source}:${faixaAtual.id}`]);
                    alternativasRef.current = musicas.filter(item => {
                        if (item.source.toLowerCase() === 'youtube') return false;
                        const key = `${item.source}:${item.id}`;
                        if (!item.streamUrl || vistos.has(key)) return false;
                        vistos.add(key);
                        return true;
                    });
                    indiceAlternativaRef.current = 0;
                } catch (erro) {
                    console.warn('[Player] Não foi possível buscar fontes alternativas:', erro);
                }
            }

            const tentarProximaAlternativa = async (): Promise<boolean> => {
                while (indiceAlternativaRef.current < alternativasRef.current.length) {
                const alternativa = alternativasRef.current[indiceAlternativaRef.current++];
                if (requisicao !== requisicaoAtual.current) return false;
                const urlFallback = urlStreamCompleta(alternativa.streamUrl);

                setFaixaAtual(alternativa);
                setErroMsg(null);
                setEstado('carregando');
                iniciarAoCarregar.current = true;
                player.replace({ uri: urlFallback });
                setTimeout(() => {
                    if (requisicao !== requisicaoAtual.current || player.playing) return;
                    void tentarProximaAlternativa().then(tentou => {
                        if (!tentou) {
                            const mensagem = 'As fontes encontradas não responderam. Tente outra música.';
                            player.pause();
                            setErroMsg(mensagem);
                            setEstado('erro');
                            Alert.alert('Não foi possível reproduzir', mensagem);
                        }
                    });
                }, 20_000);
                return true;
                }
                return false;
            };

            if (await tentarProximaAlternativa()) return;

            const mensagem = 'As fontes encontradas não responderam. Tente outra música.';
            player.pause();
            setErroMsg(mensagem);
            setEstado('erro');
            Alert.alert('Não foi possível reproduzir', mensagem);
        }, 20_000);

        return () => clearTimeout(limite);
    }, [faixaAtual?.id, faixaAtual?.source, estado, player]);

    const parar = useCallback(() => {
        requisicaoAtual.current += 1;
        iniciarAoCarregar.current = false;
        player.pause();
        try {
            player.setActiveForLockScreen(false);
        } catch (erro) {
            console.warn('[Player] Não foi possível remover os controles do sistema:', erro);
            try {
                player.clearLockScreenControls();
            } catch (erroControles) {
                console.warn('[Player] Não foi possível limpar os controles do sistema:', erroControles);
            }
        }
        setFaixaAtual(null);
    }, [player]);

    const tocar: ContextoPlayerValor['tocar'] = useCallback(async (musica, novaLista) => {
        if (musica.source.toLowerCase() === 'youtube') {
            parar();
            router.push({ pathname: '/youtube', params: { videoId: musica.id } });
            return;
        }

        const requisicao = ++requisicaoAtual.current;
        tentouFallbackRef.current = false;
        alternativasRef.current = [];
        indiceAlternativaRef.current = 0;
        try {
            setEstado('carregando');
            setErroMsg(null);
            player.pause();

            const listaReferencia = novaLista || lista;
            if (novaLista) setLista(novaLista);

            const index = listaReferencia.findIndex(m => m.id === musica.id && m.source === musica.source);
            setIndiceAtual(index);
            setFaixaAtual(musica);

            let url = obterArquivoMusicaBaixada(musica) ?? '';
            if (!url && musica.streamUrl) {
                url = urlStreamCompleta(musica.streamUrl);
            }
            if (!url) {
                try {
                    const resolucao = await resolverAudio(musica.artista, musica.titulo);
                    if (requisicao !== requisicaoAtual.current) return;
                    url = urlStreamCompleta(resolucao.url || resolucao.streamUrl || '');
                } catch (erroResolucao) {
                    if (requisicao !== requisicaoAtual.current) return;
                    console.warn('[Player] API não encontrou uma fonte de áudio:', erroResolucao);
                    const mensagem = 'Áudio não disponível para esta música no momento.';
                    setErroMsg(mensagem);
                    setEstado('erro');
                    Alert.alert('Não foi possível reproduzir', mensagem);
                    return;
                }
            }

            if (!url) {
                const mensagem = 'Não encontramos uma fonte de áudio válida para esta faixa.';
                setErroMsg(mensagem);
                setEstado('erro');
                Alert.alert('Erro na reprodução', mensagem);
                return;
            }

            if (requisicao !== requisicaoAtual.current) return;
            iniciarAoCarregar.current = true;
            player.replace({ uri: url });

            // Registra a sessão de mídia antes de iniciar a faixa.
            try {
                player.setActiveForLockScreen(true, {
                    title: musica.titulo,
                    artist: musica.artista,
                    albumTitle: musica.album || musica.artista,
                    ...(musica.capa ? { artworkUrl: musica.capa } : {}),
                }, {
                    showSeekBackward: true,
                    showSeekForward: true,
                });
            } catch (erro) {
                console.warn('[Player] Controles do sistema indisponíveis:', erro);
            }

            // `replace` começa o carregamento em background. Iniciar aqui
            // conserva o autoplay enquanto o HLS resolve o manifesto.
            player.play();

        } catch (e) {
            if (requisicao !== requisicaoAtual.current) return;
            console.error('[Player] Erro ao tocar:', e);
            const mensagem = e instanceof Error
                ? e.message
                : 'Ocorreu uma falha ao iniciar a reprodução. Tente novamente.';
            setErroMsg(mensagem);
            setEstado('erro');
            Alert.alert('Erro ao carregar áudio', mensagem);
        }
    }, [player, lista, parar]);

    const proxima = useCallback(() => {
        if (lista.length === 0) return;

        let proximoIndice: number;
        if (aleatorio) {
            proximoIndice = lista.length > 1
                ? (indiceAtual + 1 + Math.floor(Math.random() * (lista.length - 1))) % lista.length
                : indiceAtual;
        } else {
            if (indiceAtual < 0) proximoIndice = 0;
            else if (indiceAtual + 1 < lista.length) proximoIndice = indiceAtual + 1;
            else if (repetir === 'fila') proximoIndice = 0;
            else return;
        }

        tocar(lista[proximoIndice]);
    }, [lista, indiceAtual, aleatorio, repetir, tocar]);

    const anterior = useCallback(() => {
        if (lista.length === 0) return;

        // Se já passou de 3 segundos, reinicia a música atual
        if (status.currentTime && status.currentTime > 3) {
            player.seekTo(0);
            return;
        }

        const indiceAnterior = indiceAtual > 0
            ? indiceAtual - 1
            : repetir === 'fila' ? lista.length - 1 : -1;
        if (indiceAnterior >= 0) tocar(lista[indiceAnterior]);
    }, [lista, indiceAtual, status.currentTime, repetir, player, tocar]);

    const alternarRepeticao = () => setRepetir(modo => modo === 'desligado' ? 'fila' : modo === 'fila' ? 'faixa' : 'desligado');
    const alternarAleatorio = () => setAleatorio(!aleatorio);

    const adicionarAFila = useCallback((musica: Musica) => {
        setLista(prev => {
            // Evita duplicatas na fila
            const jaExiste = prev.some(m => m.id === musica.id && m.source === musica.source);
            if (jaExiste) return prev;
            // Insere logo após a faixa atual
            const novaLista = [...prev];
            const insercao = indiceAtual >= 0 ? indiceAtual + 1 : novaLista.length;
            novaLista.splice(insercao, 0, musica);
            return novaLista;
        });
    }, [indiceAtual]);

    // Sincroniza a propriedade loop nativa do player com o estado do contexto
    React.useEffect(() => {
        player.loop = repetir === 'faixa';
    }, [player, repetir]);

    React.useEffect(() => {
        if (status.isLoaded && status.didJustFinish && repetir !== 'faixa') {
            proxima();
        }
    }, [status.isLoaded, status.didJustFinish, repetir, proxima]);

    // Mantém título, artista e capa atualizados no controle de mídia quando
    // a faixa muda enquanto o app está em segundo plano.
    React.useEffect(() => {
        if (!faixaAtual) return;

        const metadata = {
            title: faixaAtual.titulo,
            artist: faixaAtual.artista,
            albumTitle: faixaAtual.album || faixaAtual.artista,
            ...(faixaAtual.capa ? { artworkUrl: faixaAtual.capa } : {}),
        };

        try {
            player.setActiveForLockScreen(true, metadata, {
                showSeekBackward: true,
                showSeekForward: true,
            });
        } catch (erro) {
            console.warn('[Player] Não foi possível ativar os controles do sistema:', erro);
        }

        try {
            player.updateLockScreenMetadata(metadata);
        } catch (erro) {
            console.warn('[Player] Não foi possível atualizar os controles:', erro);
        }
    }, [faixaAtual, player]);

    const pausar = useCallback(() => {
        player.pause();
    }, [player]);

    const retomar = useCallback(() => {
        setErroMsg(null);
        setEstado('carregando');
        if (faixaAtual) {
            try {
                player.setActiveForLockScreen(true, {
                    title: faixaAtual.titulo,
                    artist: faixaAtual.artista,
                    albumTitle: faixaAtual.album || faixaAtual.artista,
                    ...(faixaAtual.capa ? { artworkUrl: faixaAtual.capa } : {}),
                }, {
                    showSeekBackward: true,
                    showSeekForward: true,
                });
            } catch (erro) {
                console.warn('[Player] Não foi possível reativar os controles do sistema:', erro);
            }
        }

        player.play();
    }, [player, faixaAtual]);

    const buscarPara = useCallback((segundos: number) => {
        if (!status.isLoaded || !Number.isFinite(segundos)) return;
        player.seekTo(Math.max(0, Math.min(segundos, status.duration || segundos)));
    }, [player, status.isLoaded, status.duration]);

    const posicao = status.isLoaded ? (status.currentTime ?? 0) : 0;
    const duracao = status.isLoaded ? (status.duration ?? 0) : 0;

    return (
        <ContextoPlayer.Provider
            value={{
                faixaAtual,
                lista,
                estado,
                erro: erroMsg,
                posicao,
                duracao,
                buscarPara,
                repetir,
                aleatorio,
                tocar,
                pausar,
                retomar,
                parar,
                proxima,
                anterior,
                alternarRepeticao,
                alternarAleatorio,
                adicionarAFila
            }}
        >
            {children}
        </ContextoPlayer.Provider>
    );
}

export const usePlayer = () => {
    const contexto = useContext(ContextoPlayer);
    if (!contexto) {
        throw new Error('usePlayer deve ser usado dentro de ProvedorPlayer');
    }
    return contexto;
};
