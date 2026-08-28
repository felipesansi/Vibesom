import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState
} from 'react';
import { Alert } from 'react-native';
import { Musica, resolverAudio, urlStreamCompleta } from '../lib/apiMusica';


type EstadoPlayer = 'parado' | 'carregando' | 'tocando' | 'pausado' | 'erro';

type ContextoPlayerValor = {
    faixaAtual: Musica | null;
    lista: Musica[];
    estado: EstadoPlayer;
    erro: string | null;
    posicao: number;   // segundos
    duracao: number;   // segundos
    repetir: boolean;
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
    const [repetir, setRepetir] = useState(false);
    const [aleatorio, setAleatorio] = useState(false);

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

        if (!status.isLoaded || status.isBuffering) {
            setEstado('carregando');
        } else if (status.playing) {
            setEstado('tocando');
        } else {
            setEstado('pausado');
        }
    }, [status.playing, status.isLoaded, status.isBuffering, faixaAtual, erroMsg]);

    // Alguns provedores encerram a conexão sem propagar um erro nativo. Evita
    // que a interface fique carregando indefinidamente nesses casos.
    useEffect(() => {
        if (!faixaAtual || estado !== 'carregando') return;

        const limite = setTimeout(() => {
            const mensagem = 'A reprodução demorou demais para iniciar. Tente outra música.';
            setErroMsg(mensagem);
            setEstado('erro');
            Alert.alert('Não foi possível reproduzir', mensagem);
        }, 20_000);

        return () => clearTimeout(limite);
    }, [faixaAtual?.id, faixaAtual?.source, estado]);

    const tocar: ContextoPlayerValor['tocar'] = useCallback(async (musica, novaLista) => {
        try {
            setEstado('carregando');
            setErroMsg(null);

            const listaReferencia = novaLista || lista;
            if (novaLista) setLista(novaLista);

            const index = listaReferencia.findIndex(m => m.id === musica.id && m.source === musica.source);
            setIndiceAtual(index);
            setFaixaAtual(musica);

            // A escolha e o fallback entre provedores pertencem à API. Não
            // restringimos a fonte recebida na busca (por exemplo, Piped).
            let url = '';
            try {
                const resolucao = await resolverAudio(musica.artista, musica.titulo);
                url = urlStreamCompleta(resolucao.url || resolucao.streamUrl || '');
            } catch (erroResolucao) {
                console.warn('[Player] API não encontrou uma fonte de áudio:', erroResolucao);
                const mensagem = 'Áudio não disponível para esta música no momento.';
                setErroMsg(mensagem);
                setEstado('erro');
                Alert.alert('Não foi possível reproduzir', mensagem);
                return;
            }

            if (!url) {
                const mensagem = 'Não encontramos uma fonte de áudio válida para esta faixa.';
                setErroMsg(mensagem);
                setEstado('erro');
                Alert.alert('Erro na reprodução', mensagem);
                return;
            }

            player.replace(url);

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

            player.play();
        } catch (e) {
            console.error('[Player] Erro ao tocar:', e);
            const mensagem = 'Ocorreu uma falha ao iniciar a reprodução. Tente novamente.';
            setErroMsg(mensagem);
            setEstado('erro');
            Alert.alert('Erro ao carregar áudio', mensagem);
        }
    }, [player, lista, setEstado, setErroMsg, setLista, setIndiceAtual, setFaixaAtual]);

    const proxima = useCallback(() => {
        if (lista.length === 0) return;

        let proximoIndice: number;
        if (aleatorio) {
            proximoIndice = Math.floor(Math.random() * lista.length);
        } else {
            proximoIndice = (indiceAtual + 1) % lista.length;
        }

        tocar(lista[proximoIndice]);
    }, [lista, indiceAtual, aleatorio, tocar]);

    const anterior = useCallback(() => {
        if (lista.length === 0) return;

        // Se já passou de 3 segundos, reinicia a música atual
        if (status.currentTime && status.currentTime > 3) {
            player.seekTo(0);
            return;
        }

        const indiceAnterior = (indiceAtual - 1 + lista.length) % lista.length;
        tocar(lista[indiceAnterior]);
    }, [lista, indiceAtual, status.currentTime, player, tocar]);

    const alternarRepeticao = () => setRepetir(!repetir);
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
        player.loop = repetir;
    }, [player, repetir]);

    React.useEffect(() => {
        if (status.isLoaded && status.didJustFinish && !player.loop) {
            proxima();
        }
    }, [status.isLoaded, status.didJustFinish, player.loop, proxima]);

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

    const parar = useCallback(() => {
        player.pause();
        try {
            player.setActiveForLockScreen(false);
        } catch (_) {
            try { player.clearLockScreenControls(); } catch (_) { }
        }
        setFaixaAtual(null);
    }, [player]);

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
