import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Keyboard,
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
    const parametros = useLocalSearchParams<{ videoId?: string }>();

    useEffect(() => () => buscaAtual.current?.abort(), []);

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
    }, [parametros.videoId]);

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
                onPress={() => setVideoSelecionado(item)}
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
    }, [videoSelecionado?.id]);

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
                                    <WebView
                                        key={videoSelecionado.id}
                                        source={{
                                            uri: `https://www.youtube-nocookie.com/embed/${videoSelecionado.id}?playsinline=1&controls=1&autoplay=0&rel=0`,
                                        }}
                                        style={estilos.webView}
                                        containerStyle={estilos.webViewContainer}
                                        allowsFullscreenVideo
                                        allowsInlineMediaPlayback
                                        mediaPlaybackRequiresUserAction
                                        onLoadStart={() => {
                                            setCarregandoPlayer(true);
                                            setErroPlayer(null);
                                        }}
                                        onLoadEnd={() => setCarregandoPlayer(false)}
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
                                {!!erroPlayer && <Text style={estilos.erro}>{erroPlayer}</Text>}
                                <Text style={estilos.textoDica}>
                                    Use os controles do YouTube para iniciar a reprodução. O áudio em segundo plano depende das regras do YouTube.
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
                ListEmptyComponent={!carregando && termo && !erro ? <Text style={estilos.vazio}>Nenhum resultado encontrado.</Text> : null}
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
    videoPlayer: { height: 210, position: 'relative', backgroundColor: '#000', borderRadius: 12, overflow: 'hidden' },
    webView: { flex: 1, backgroundColor: '#000' },
    webViewContainer: { backgroundColor: '#000' },
    carregandoPlayer: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
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
