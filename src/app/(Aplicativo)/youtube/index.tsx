import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
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
import Tema from '../../../../constantes/Cores';
import { usePlayer } from '../../../contexto/ContextoPlayer';
import { buscarMusicasYoutube, formatarDuracao, Musica } from '../../../lib/apiMusica';

const PESQUISAS_RAPIDAS = ['Músicas em alta', 'Lo-fi', 'Ao vivo', 'Acústico'];

export default function TelaYouTube() {
    const [consulta, setConsulta] = useState('');
    const [termo, setTermo] = useState('');
    const [resultados, setResultados] = useState<Musica[]>([]);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const { faixaAtual, estado, lista, posicao, duracao, tocar, pausar, retomar, proxima, anterior } = usePlayer();

    const filaYouTube = useMemo(
        () => lista.filter(item => item.source.toLowerCase() === 'youtube'),
        [lista],
    );
    const atualEhYouTube = faixaAtual?.source.toLowerCase() === 'youtube';
    const carregandoFaixa = atualEhYouTube && estado === 'carregando';
    const tocandoFaixa = atualEhYouTube && estado === 'tocando';
    const progresso = duracao > 0 && atualEhYouTube ? Math.min(100, (posicao / duracao) * 100) : 0;

    const buscar = useCallback(async (texto = consulta) => {
        const busca = texto.trim();
        if (!busca) return;
        Keyboard.dismiss();
        setConsulta(busca);
        setTermo(busca);
        setCarregando(true);
        setErro(null);
        try {
            const musicas = await buscarMusicasYoutube(busca);
            setResultados(musicas);
            if (!musicas.length) setErro('Não encontramos vídeos para essa busca.');
        } catch (e) {
            setResultados([]);
            setErro(e instanceof Error ? e.message : 'Não foi possível buscar no YouTube.');
        } finally {
            setCarregando(false);
        }
    }, [consulta]);

    const tocarVideo = useCallback((musica: Musica) => {
        void tocar(musica, resultados);
    }, [resultados, tocar]);

    const renderVideo = useCallback(({ item, index }: { item: Musica; index: number }) => {
        const estaTocando = faixaAtual?.id === item.id && faixaAtual?.source === item.source;
        return (
            <TouchableOpacity
                style={[estilos.video, estaTocando && estilos.videoAtivo]}
                activeOpacity={0.78}
                onPress={() => tocarVideo(item)}
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
                    <Text style={estilos.indice}>{estaTocando ? 'Tocando agora' : `Resultado ${index + 1}`}</Text>
                </View>
                <Ionicons name={estaTocando && tocandoFaixa ? 'pause-circle' : 'play-circle'} size={29} color={estaTocando ? '#FF3333' : Tema.textoSuave} />
            </TouchableOpacity>
        );
    }, [faixaAtual?.id, faixaAtual?.source, tocarVideo, tocandoFaixa]);

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
                                <Text style={estilos.subtitulo}>Busque músicas e ouça somente o áudio</Text>
                            </View>
                        </View>

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
                            {consulta.length > 0 && <TouchableOpacity onPress={() => { setConsulta(''); setTermo(''); setResultados([]); setErro(null); }}><Ionicons name="close-circle" size={19} color={Tema.textoSuave} /></TouchableOpacity>}
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
                                    <Text style={estilos.textoDica}>Toque em uma faixa para ouvir. A fila inclui os resultados de áudio desta busca.</Text>
                                </View>
                            </>
                        )}

                        {atualEhYouTube && faixaAtual && (
                            <View style={estilos.playerCard}>
                                <View style={estilos.playerTopo}>
                                    {faixaAtual.capa ? <Image source={{ uri: faixaAtual.capa }} style={estilos.capaAtual} /> : <View style={[estilos.capaAtual, estilos.semMiniatura]}><Ionicons name="logo-youtube" size={25} color="#FF0000" /></View>}
                                    <View style={estilos.atualInfo}>
                                        <Text style={estilos.tocandoLabel}>TOCANDO NO YOUTUBE</Text>
                                        <Text style={estilos.atualTitulo} numberOfLines={1}>{faixaAtual.titulo}</Text>
                                        <Text style={estilos.atualCanal} numberOfLines={1}>{faixaAtual.artista}</Text>
                                    </View>
                                </View>
                                <View style={estilos.trilho}><View style={[estilos.progresso, { width: `${progresso}%` }]} /></View>
                                <View style={estilos.tempos}><Text style={estilos.tempo}>{formatarDuracao(posicao)}</Text><Text style={estilos.tempo}>{formatarDuracao(duracao)}</Text></View>
                                <View style={estilos.controles}>
                                    <TouchableOpacity onPress={anterior}><Ionicons name="play-skip-back" size={25} color={Tema.textoSecundario} /></TouchableOpacity>
                                    <TouchableOpacity style={estilos.botaoPlay} onPress={() => tocandoFaixa ? pausar() : retomar()}>
                                        {carregandoFaixa ? <ActivityIndicator color="#FFF" /> : <Ionicons name={tocandoFaixa ? 'pause' : 'play'} size={27} color="#FFF" />}
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={proxima}><Ionicons name="play-skip-forward" size={25} color={Tema.textoSecundario} /></TouchableOpacity>
                                    <View style={estilos.contagemFila}><Ionicons name="list" size={17} color={Tema.textoSuave} /><Text style={estilos.textoFila}>{filaYouTube.length} na fila</Text></View>
                                </View>
                            </View>
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
    miniaturaWrap: { position: 'relative' },
    miniatura: { width: 116, height: 70, borderRadius: 10, backgroundColor: Tema.superficieClara },
    semMiniatura: { alignItems: 'center', justifyContent: 'center' },
    playSobreposto: { position: 'absolute', left: 44, top: 22, width: 29, height: 29, borderRadius: 15, backgroundColor: '#0009', alignItems: 'center', justifyContent: 'center' },
    duracao: { position: 'absolute', right: 4, bottom: 4, color: '#FFF', backgroundColor: '#000C', fontSize: 10, paddingHorizontal: 4, borderRadius: 4, overflow: 'hidden' },
    videoInfo: { flex: 1, alignSelf: 'stretch', justifyContent: 'center', gap: 3 },
    tituloVideo: { color: Tema.texto, fontSize: 14, lineHeight: 18, fontWeight: '700' },
    canal: { color: Tema.textoSecundario, fontSize: 12 },
    indice: { color: Tema.textoSuave, fontSize: 11 },
    playerCard: { backgroundColor: Tema.superficie, borderWidth: 1, borderColor: Tema.borda, borderRadius: 18, padding: 14, marginTop: 18 },
    playerTopo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    capaAtual: { width: 62, height: 62, borderRadius: 12, backgroundColor: Tema.superficieClara },
    atualInfo: { flex: 1, gap: 4 },
    tocandoLabel: { color: '#FF5555', fontSize: 10, fontWeight: '900', letterSpacing: .7 },
    atualTitulo: { color: Tema.texto, fontSize: 15, fontWeight: '800' },
    atualCanal: { color: Tema.textoSecundario, fontSize: 12 },
    trilho: { height: 4, borderRadius: 2, backgroundColor: Tema.superficieClara, overflow: 'hidden', marginTop: 15 },
    progresso: { height: 4, backgroundColor: '#FF3333' },
    tempos: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
    tempo: { color: Tema.textoSuave, fontSize: 10 },
    controles: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 26, marginTop: 12 },
    botaoPlay: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E62117', alignItems: 'center', justifyContent: 'center' },
    contagemFila: { position: 'absolute', right: 0, flexDirection: 'row', alignItems: 'center', gap: 4 },
    textoFila: { color: Tema.textoSuave, fontSize: 11 },
    erro: { color: Tema.erro, paddingVertical: 16 },
    vazio: { color: Tema.textoSuave, textAlign: 'center', paddingVertical: 26 },
});
