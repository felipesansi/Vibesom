import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Keyboard,
    Linking,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import Tema from '../../../../constantes/Cores';
import { buscarMusicasYoutube, formatarDuracao, Musica } from '../../../lib/apiMusica';

const PESQUISAS_RAPIDAS = ['Músicas em alta', 'Lo-fi', 'Ao vivo', 'Acústico'];

type EstadoYouTube = -1 | 0 | 1 | 2 | 3 | 5;

function criarHtmlPlayer(videoId: string) {
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>*{box-sizing:border-box}html,body,#player{margin:0;width:100%;height:100%;background:#000;overflow:hidden}</style></head><body><div id="player"></div><script>
      const id=${JSON.stringify(videoId)};
      const enviar=(extra={})=>{try{window.ReactNativeWebView.postMessage(JSON.stringify({type:'status',state:player&&player.getPlayerState?player.getPlayerState():-1,time:player&&player.getCurrentTime?player.getCurrentTime():0,duration:player&&player.getDuration?player.getDuration():0,...extra}))}catch(e){}};
      let player;
      window.vibesomPlayerCommand=(command)=>{if(!player)return;switch(command.action){case'play':player.playVideo();break;case'pause':player.pauseVideo();break;case'toggle':player.getPlayerState()===1?player.pauseVideo():player.playVideo();break;case'seek':player.seekTo(command.time,true);break;case'back':player.seekTo(Math.max(0,player.getCurrentTime()-10),true);break;case'forward':player.seekTo(Math.min(player.getDuration(),player.getCurrentTime()+10),true);break;}};
      const tag=document.createElement('script');tag.src='https://www.youtube.com/iframe_api';document.head.appendChild(tag);
      window.onYouTubeIframeAPIReady=()=>{player=new YT.Player('player',{videoId:id,host:'https://www.youtube-nocookie.com',playerVars:{autoplay:1,controls:1,playsinline:1,rel:0,fs:1,enablejsapi:1,origin:'https://www.youtube-nocookie.com',iv_load_policy:3},events:{onReady:()=>enviar(),onStateChange:e=>enviar({state:e.data}),onError:e=>enviar({error:e.data})}});setInterval(()=>enviar(),700)};
    </script></body></html>`;
}

function textoErroYouTube(codigo?: number) {
    if (codigo === 2) return 'O YouTube rejeitou o identificador deste vídeo.';
    if (codigo === 5) return 'Este vídeo não pode ser reproduzido neste player.';
    if (codigo === 100) return 'Este vídeo foi removido, está privado ou não está disponível.';
    if (codigo === 101 || codigo === 150) return 'O proprietário não permite a reprodução incorporada deste vídeo. Abra-o no YouTube.';
    if (codigo === 153) return 'O YouTube não aceitou a identificação da reprodução incorporada. Abra-o no YouTube.';
    return 'O YouTube não conseguiu reproduzir este vídeo. Tente abri-lo no YouTube.';
}

export default function TelaYouTube() {
    const [consulta, setConsulta] = useState('');
    const [termo, setTermo] = useState('');
    const [resultados, setResultados] = useState<Musica[]>([]);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const buscaAtual = useRef<AbortController | null>(null);
    const [videoSelecionado, setVideoSelecionado] = useState<Musica | null>(null);
    const [carregandoPlayer, setCarregandoPlayer] = useState(false);
    const [erroPlayer, setErroPlayer] = useState<string | null>(null);
    const [estadoPlayer, setEstadoPlayer] = useState<EstadoYouTube>(-1);
    const [progresso, setProgresso] = useState({ tempo: 0, duracao: 0 });
    const [larguraSeek, setLarguraSeek] = useState(0);
    const [indiceFila, setIndiceFila] = useState(-1);
    const webViewRef = useRef<WebView<{}>>(null);
    const ultimoEstadoRef = useRef<EstadoYouTube>(-1);
    const parametros = useLocalSearchParams<{ videoId?: string }>();

    useEffect(() => () => buscaAtual.current?.abort(), []);

    useEffect(() => {
        if (!videoSelecionado || !carregandoPlayer) return;

        const timeout = setTimeout(() => {
            setCarregandoPlayer(false);
            setErroPlayer('O player do YouTube está demorando para responder. Verifique sua conexão e tente novamente.');
        }, 15_000);

        return () => clearTimeout(timeout);
    }, [videoSelecionado?.id, carregandoPlayer]);

    useEffect(() => {
        const id = Array.isArray(parametros.videoId) ? parametros.videoId[0] : parametros.videoId;
        if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return;
        setVideoSelecionado({
            source: 'YouTube',
            id,
            titulo: 'Vídeo do YouTube',
            artista: '',
            capa: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
            duracao: 0,
            streamUrl: '',
        });
        setIndiceFila(-1);
    }, [parametros.videoId]);

    const enviarComandoPlayer = useCallback((action: string, time?: number) => {
        const comando = JSON.stringify({ action, ...(time === undefined ? {} : { time }) });
        webViewRef.current?.injectJavaScript(`window.vibesomPlayerCommand&&window.vibesomPlayerCommand(${comando});true;`);
    }, []);

    const selecionarVideo = useCallback((item: Musica) => {
        const indice = resultados.findIndex(resultado => resultado.id === item.id);
        setIndiceFila(indice);
        setEstadoPlayer(-1);
        ultimoEstadoRef.current = -1;
        setProgresso({ tempo: 0, duracao: item.duracao || 0 });
        setErroPlayer(null);
        setCarregandoPlayer(true);
        setVideoSelecionado(item);
    }, [resultados]);

    const aoReceberMensagem = useCallback((event: { nativeEvent: { data: string } }) => {
        try {
            const mensagem = JSON.parse(event.nativeEvent.data) as { state?: EstadoYouTube; time?: number; duration?: number; error?: number };
            if (mensagem.error !== undefined) {
                setCarregandoPlayer(false);
                setErroPlayer(textoErroYouTube(mensagem.error));
                return;
            }
            if (mensagem.state !== undefined) {
                setEstadoPlayer(mensagem.state);
                setCarregandoPlayer(mensagem.state === -1 || mensagem.state === 3);
                if (mensagem.state === 1) setErroPlayer(null);
                if (mensagem.state === 0 && ultimoEstadoRef.current !== 0 && indiceFila >= 0 && indiceFila + 1 < resultados.length) {
                    selecionarVideo(resultados[indiceFila + 1]);
                }
                ultimoEstadoRef.current = mensagem.state;
            }
            if (typeof mensagem.time === 'number' && typeof mensagem.duration === 'number') {
                setProgresso({ tempo: mensagem.time, duracao: mensagem.duration });
            }
        } catch {
            // Ignora mensagens não relacionadas ao estado do player.
        }
    }, [indiceFila, resultados, selecionarVideo]);

    const avancarFila = useCallback((delta: number) => {
        const proximo = indiceFila + delta;
        if (proximo >= 0 && proximo < resultados.length) selecionarVideo(resultados[proximo]);
    }, [indiceFila, resultados, selecionarVideo]);

    const buscar = useCallback(async (texto = consulta) => {
        const busca = texto.trim();
        if (!busca) return;
        buscaAtual.current?.abort();
        const controlador = new AbortController();
        buscaAtual.current = controlador;
        Keyboard.dismiss();
        setConsulta(busca);
        setTermo(busca);
        setCarregando(true);
        setErro(null);
        try {
            const musicas = await buscarMusicasYoutube(busca, controlador.signal);
            if (controlador.signal.aborted) return;
            setResultados(musicas);
            if (!musicas.length) setErro('Não encontramos vídeos para essa busca.');
        } catch (e) {
            if (controlador.signal.aborted) return;
            setResultados([]);
            setErro(e instanceof Error ? e.message : 'Não foi possível buscar no YouTube.');
        } finally {
            if (!controlador.signal.aborted) setCarregando(false);
        }
    }, [consulta]);

    const renderVideo = useCallback(({ item, index }: { item: Musica; index: number }) => {
        const estaSelecionado = videoSelecionado?.id === item.id;
        return (
            <TouchableOpacity
                style={[estilos.video, estaSelecionado && estilos.videoAtivo]}
                activeOpacity={0.78}
                onPress={() => selecionarVideo(item)}
            >
                <View style={estilos.miniaturaWrap}>
                    {item.capa
                        ? <Image source={{ uri: item.capa }} style={estilos.miniatura} />
                        : <View style={[estilos.miniatura, estilos.semMiniatura]}><Ionicons name="logo-youtube" size={27} color="#FF0000" /></View>}
                    <View style={estilos.playSobreposto}><Ionicons name="play" size={18} color="#FFF" /></View>
                    {item.duracao > 0 && <Text style={estilos.duracao}>{formatarDuracao(item.duracao)}</Text>}
                </View>
                <View style={estilos.videoInfo}>
                    <Text style={estilos.tituloVideo} numberOfLines={2}>{item.titulo}</Text>
                    <Text style={estilos.canal} numberOfLines={1}>{item.artista}</Text>
                    <Text style={estilos.indice}>{estaSelecionado ? 'Aberto no player' : `Resultado ${index + 1}`}</Text>
                </View>
                <Ionicons name="play-circle" size={29} color={estaSelecionado ? '#FF3333' : Tema.textoSuave} />
            </TouchableOpacity>
        );
    }, [videoSelecionado?.id, selecionarVideo]);

    return (
        <SafeAreaView style={estilos.container} edges={['top', 'left', 'right']}>
            <FlatList
                data={resultados}
                renderItem={renderVideo}
                keyExtractor={item => `youtube:${item.id}`}
                contentContainerStyle={estilos.lista}
                keyboardShouldPersistTaps="handled"
                ListHeaderComponent={
                    <>
                        <View style={estilos.cabecalho}>
                            <View style={estilos.logo}><Ionicons name="logo-youtube" size={25} color="#FFF" /></View>
                            <View style={{ flex: 1 }}>
                                <Text style={estilos.titulo}>YouTube</Text>
                                <Text style={estilos.subtitulo}>Busque e reproduza no player oficial</Text>
                            </View>
                        </View>

                        {videoSelecionado && (
                            <View style={estilos.playerCard}>
                                <View style={estilos.playerTopo}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={estilos.tocandoLabel}>PLAYER OFICIAL DO YOUTUBE</Text>
                                        <Text style={estilos.atualTitulo} numberOfLines={2}>{videoSelecionado.titulo}</Text>
                                        {!!videoSelecionado.artista && (
                                            <Text style={estilos.atualCanal} numberOfLines={1}>{videoSelecionado.artista}</Text>
                                        )}
                                    </View>
                                    <TouchableOpacity
                                        accessibilityLabel="Fechar vídeo"
                                        onPress={() => setVideoSelecionado(null)}
                                        style={estilos.fecharPlayer}
                                    >
                                        <Ionicons name="close" size={21} color={Tema.textoSuave} />
                                    </TouchableOpacity>
                                </View>
                                <View style={estilos.videoPlayer}>
                                    <WebView<{}>
                                        ref={webViewRef}
                                        key={videoSelecionado.id}
                                        source={{ html: criarHtmlPlayer(videoSelecionado.id), baseUrl: 'https://www.youtube-nocookie.com' }}
                                        style={estilos.webView}
                                        containerStyle={estilos.webViewContainer}
                                        javaScriptEnabled
                                        domStorageEnabled
                                        originWhitelist={['*']}
                                        allowsFullscreenVideo
                                        allowsInlineMediaPlayback
                                        mediaPlaybackRequiresUserAction={false}
                                        onMessage={aoReceberMensagem}
                                        onLoadStart={() => {
                                            setCarregandoPlayer(true);
                                            setErroPlayer(null);
                                        }}
                                        onError={() => {
                                            setCarregandoPlayer(false);
                                            setErroPlayer('Não foi possível carregar o player oficial do YouTube.');
                                        }}
                                    />
                                    {carregandoPlayer && (
                                        <View style={estilos.carregandoPlayer}>
                                            <ActivityIndicator color="#FF3333" />
                                        </View>
                                    )}
                                </View>
                                <View style={estilos.seekContainer}>
                                    <View
                                        style={estilos.seekBar}
                                        onLayout={event => setLarguraSeek(event.nativeEvent.layout.width)}
                                        onStartShouldSetResponder={() => true}
                                        onMoveShouldSetResponder={() => true}
                                        onResponderRelease={event => {
                                            if (!progresso.duracao || !larguraSeek) return;
                                            const proporcao = Math.max(0, Math.min(1, event.nativeEvent.locationX / larguraSeek));
                                            enviarComandoPlayer('seek', proporcao * progresso.duracao);
                                        }}
                                    >
                                        <View style={[estilos.seekProgresso, { width: `${progresso.duracao ? Math.min(100, progresso.tempo / progresso.duracao * 100) : 0}%` }]} />
                                    </View>
                                    <View style={estilos.tempos}><Text style={estilos.tempo}>{formatarDuracao(progresso.tempo)}</Text><Text style={estilos.tempo}>{formatarDuracao(progresso.duracao)}</Text></View>
                                </View>
                                <View style={estilos.controlesPlayer}>
                                    <TouchableOpacity accessibilityLabel="Vídeo anterior" onPress={() => avancarFila(-1)} disabled={indiceFila <= 0} style={estilos.controlePlayer}>
                                        <Ionicons name="play-skip-back" size={21} color={indiceFila <= 0 ? Tema.textoSuave : Tema.texto} />
                                    </TouchableOpacity>
                                    <TouchableOpacity accessibilityLabel="Voltar 10 segundos" onPress={() => enviarComandoPlayer('back')} style={estilos.controlePlayer}>
                                        <Ionicons name="play-back" size={23} color={Tema.texto} /><Text style={estilos.rotuloPulo}>10</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity accessibilityLabel={estadoPlayer === 1 ? 'Pausar' : 'Reproduzir'} onPress={() => enviarComandoPlayer('toggle')} style={estilos.controlePrincipal}>
                                        <Ionicons name={estadoPlayer === 1 ? 'pause' : 'play'} size={24} color="#FFF" />
                                    </TouchableOpacity>
                                    <TouchableOpacity accessibilityLabel="Avançar 10 segundos" onPress={() => enviarComandoPlayer('forward')} style={estilos.controlePlayer}>
                                        <Ionicons name="play-forward" size={23} color={Tema.texto} /><Text style={estilos.rotuloPulo}>10</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity accessibilityLabel="Próximo vídeo" onPress={() => avancarFila(1)} disabled={indiceFila < 0 || indiceFila >= resultados.length - 1} style={estilos.controlePlayer}>
                                        <Ionicons name="play-skip-forward" size={21} color={indiceFila < 0 || indiceFila >= resultados.length - 1 ? Tema.textoSuave : Tema.texto} />
                                    </TouchableOpacity>
                                </View>
                                {!!erroPlayer && (
                                    <View style={estilos.fallbackYouTube}>
                                        <Text style={estilos.erro}>{erroPlayer}</Text>
                                        <TouchableOpacity
                                            style={estilos.abrirYouTube}
                                            onPress={() => void Linking.openURL(`https://www.youtube.com/watch?v=${videoSelecionado.id}`).catch(() => setErroPlayer('Não foi possível abrir o YouTube neste dispositivo.'))}
                                        >
                                            <Ionicons name="open-outline" size={17} color="#FFF" />
                                            <Text style={estilos.textoAbrirYouTube}>Abrir no YouTube</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                                <Text style={estilos.textoDica}>
                                    Reprodução pelo player oficial do YouTube. O áudio em segundo plano depende das regras do YouTube e do dispositivo.
                                </Text>
                            </View>
                        )}

                        <View style={estilos.buscaLinha}>
                            <Ionicons name="search" size={20} color={Tema.textoSuave} />
                            <TextInput
                                value={consulta}
                                onChangeText={setConsulta}
                                onSubmitEditing={() => void buscar()}
                                placeholder="Buscar música ou artista"
                                placeholderTextColor={Tema.textoSuave}
                                returnKeyType="search"
                                style={estilos.input}
                            />
                            {consulta.length > 0 && <TouchableOpacity onPress={() => { buscaAtual.current?.abort(); buscaAtual.current = null; setConsulta(''); setTermo(''); setResultados([]); setErro(null); setCarregando(false); }}><Ionicons name="close-circle" size={19} color={Tema.textoSuave} /></TouchableOpacity>}
                            <TouchableOpacity onPress={() => void buscar()} disabled={carregando} style={estilos.botaoBuscar}>
                                {carregando ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="arrow-forward" size={20} color="#FFF" />}
                            </TouchableOpacity>
                        </View>

                        {!termo && (
                            <>
                                <Text style={estilos.rotuloSecao}>Pesquisas rápidas</Text>
                                <View style={estilos.chips}>
                                    {PESQUISAS_RAPIDAS.map(texto => (
                                        <TouchableOpacity key={texto} style={estilos.chip} onPress={() => void buscar(texto)}>
                                            <Text style={estilos.textoChip}>{texto}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <View style={estilos.dica}>
                                    <Ionicons name="headset-outline" size={21} color="#FF5555" />
                                    <Text style={estilos.textoDica}>Toque em um resultado para abri-lo no player oficial incorporado.</Text>
                                </View>
                            </>
                        )}

                        {!!termo && <Text style={estilos.rotuloSecao}>Faixas encontradas para “{termo}”</Text>}
                        {!!erro && <Text style={estilos.erro}>{erro}</Text>}
                    </>
                }
                ListEmptyComponent={!carregando && Boolean(termo) && !erro ? <Text style={estilos.vazio}>Nenhum resultado encontrado.</Text> : undefined}
            />
        </SafeAreaView>
    );
}

const estilos = StyleSheet.create({
    container: { flex: 1, backgroundColor: Tema.fundo },
    lista: { padding: 18, paddingBottom: 150, gap: 11 },
    cabecalho: { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 20 },
    logo: { width: 48, height: 48, borderRadius: 15, backgroundColor: '#FF0000', alignItems: 'center', justifyContent: 'center' },
    titulo: { color: Tema.texto, fontSize: 25, fontWeight: '900' },
    subtitulo: { color: Tema.textoSuave, fontSize: 13, marginTop: 3 },
    buscaLinha: { minHeight: 54, backgroundColor: Tema.superficie, borderColor: Tema.borda, borderWidth: 1, borderRadius: 16, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
    input: { flex: 1, height: 52, color: Tema.texto, fontSize: 15 },
    botaoBuscar: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#E62117', alignItems: 'center', justifyContent: 'center' },
    rotuloSecao: { color: Tema.texto, fontSize: 17, fontWeight: '800', marginTop: 22, marginBottom: 10 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 18, backgroundColor: Tema.superficieClara, borderWidth: 1, borderColor: Tema.borda },
    textoChip: { color: Tema.textoSecundario, fontSize: 13, fontWeight: '600' },
    dica: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: Tema.superficie, padding: 14, borderRadius: 15, marginTop: 19 },
    textoDica: { flex: 1, color: Tema.textoSecundario, lineHeight: 19, fontSize: 13 },
    video: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, backgroundColor: Tema.superficie, borderRadius: 16, borderWidth: 1, borderColor: Tema.borda },
    videoAtivo: { borderColor: '#E62117' },
    playerCard: { backgroundColor: Tema.superficie, borderWidth: 1, borderColor: Tema.borda, borderRadius: 18, padding: 14, marginBottom: 8 },
    playerTopo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    tocandoLabel: { color: '#FF5555', fontSize: 10, fontWeight: '900', letterSpacing: .7 },
    atualTitulo: { color: Tema.texto, fontSize: 15, fontWeight: '800', marginTop: 5 },
    atualCanal: { color: Tema.textoSecundario, fontSize: 12, marginTop: 3 },
    fecharPlayer: { padding: 7 },
    videoPlayer: { aspectRatio: 16 / 9, position: 'relative', backgroundColor: '#000', borderRadius: 12, overflow: 'hidden' },
    webView: { flex: 1, backgroundColor: '#000' },
    webViewContainer: { backgroundColor: '#000' },
    carregandoPlayer: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
    seekContainer: { marginTop: 12, gap: 5 },
    seekBar: { height: 5, width: '100%', backgroundColor: Tema.superficieClara, borderRadius: 4, overflow: 'hidden' },
    seekProgresso: { height: '100%', backgroundColor: '#FF3333' },
    tempos: { flexDirection: 'row', justifyContent: 'space-between' },
    tempo: { color: Tema.textoSuave, fontSize: 10 },
    controlesPlayer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginTop: 10 },
    controlePlayer: { minWidth: 40, height: 42, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
    rotuloPulo: { position: 'absolute', fontSize: 8, color: Tema.texto, fontWeight: '800', top: 15 },
    controlePrincipal: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E62117', alignItems: 'center', justifyContent: 'center' },
    fallbackYouTube: { gap: 6 },
    abrirYouTube: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#E62117', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10 },
    textoAbrirYouTube: { color: '#FFF', fontSize: 12, fontWeight: '700' },
    miniaturaWrap: { position: 'relative' },
    miniatura: { width: 116, height: 70, borderRadius: 10, backgroundColor: Tema.superficieClara },
    semMiniatura: { alignItems: 'center', justifyContent: 'center' },
    playSobreposto: { position: 'absolute', left: 44, top: 22, width: 29, height: 29, borderRadius: 15, backgroundColor: '#0009', alignItems: 'center', justifyContent: 'center' },
    duracao: { position: 'absolute', right: 4, bottom: 4, color: '#FFF', backgroundColor: '#000C', fontSize: 10, paddingHorizontal: 4, borderRadius: 4, overflow: 'hidden' },
    videoInfo: { flex: 1, alignSelf: 'stretch', justifyContent: 'center', gap: 3 },
    tituloVideo: { color: Tema.texto, fontSize: 14, lineHeight: 18, fontWeight: '700' },
    canal: { color: Tema.textoSecundario, fontSize: 12 },
    indice: { color: Tema.textoSuave, fontSize: 11 },
    erro: { color: Tema.erro, paddingVertical: 16 },
    vazio: { color: Tema.textoSuave, textAlign: 'center', paddingVertical: 26 },
});
