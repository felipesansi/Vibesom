import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState
} from 'react';
import { Musica, urlStreamCompleta, resolverAudio } from '../lib/apiMusica';
import { obterAudioYoutube } from '../lib/youtube';


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

        if (!status.isLoaded || status.isBuffering) {
            setEstado('carregando');
        } else if (status.playing) {
            setEstado('tocando');
        } else {
            setEstado('pausado');
        }
    }, [status.playing, status.isLoaded, status.isBuffering, faixaAtual]);

    const tocar: ContextoPlayerValor['tocar'] = useCallback(async (musica, novaLista) => {
        try {
            setEstado('carregando');
            setErroMsg(null);

            const listaReferencia = novaLista || lista;
            if (novaLista) setLista(novaLista);

            const index = listaReferencia.findIndex(m => m.id === musica.id && m.source === musica.source);
            setIndiceAtual(index);
            setFaixaAtual(musica);

            let url = musica.streamUrl ? urlStreamCompleta(musica.streamUrl) : '';

            if (!url || musica.source.toLowerCase() === 'musicbrainz') {
                try {
                    const resolucao = await resolverAudio(musica.artista, musica.titulo);
                    url = urlStreamCompleta(resolucao.url);
                } catch (err) {
                    setErroMsg('Áudio não encontrado para esta música nas plataformas.');
                    setEstado('erro');
                    return;
                }
            } else if (musica.source.toLowerCase() === 'youtube' && !musica.streamUrl.startsWith('/stream/')) {
                const streamYoutube = await obterAudioYoutube(musica.id);
                if (streamYoutube) {
                    url = streamYoutube;
                } else {
                    setErroMsg('Não foi possível obter o áudio do YouTube. Tente outra música.');
                    setEstado('erro');
                    return;
                }
            }

            if (!url) {
                setErroMsg('URL de áudio inválida.');
                setEstado('erro');
                return;
            }

            player.replace(url);

            // Registra a sessão de mídia antes de iniciar a faixa. Isso cria a
            // notificação/controle do sistema no Android e a tela bloqueada no iOS.
            try {
                player.setActiveForLockScreen(true, {
                    title: musica.titulo,
                    artist: musica.artista,
                    albumTitle: musica.artista,
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
            setErroMsg('Não foi possível carregar o áudio desta música.');
            setEstado('erro');
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
        try {
            player.updateLockScreenMetadata({
                title: faixaAtual.titulo,
                artist: faixaAtual.artista,
                albumTitle: faixaAtual.artista,
                ...(faixaAtual.capa ? { artworkUrl: faixaAtual.capa } : {}),
            });
        } catch (erro) {
            console.warn('[Player] Não foi possível atualizar os controles:', erro);
        }
    }, [faixaAtual, player]);

    const pausar = useCallback(() => {
        player.pause();
    }, [player]);

    const retomar = useCallback(() => {
        player.play();
    }, [player]);

    const parar = useCallback(() => {
        player.pause();
        try { player.clearLockScreenControls(); } catch (_) {}
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


export function usePlayer(): ContextoPlayerValor {
    const ctx = useContext(ContextoPlayer);
    if (!ctx) throw new Error('usePlayer deve ser usado dentro de <ProvedorPlayer>');
    return ctx;
}
