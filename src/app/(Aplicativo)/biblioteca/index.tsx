import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import {
    ActivityIndicator,
    Modal,
    Image,
    Platform,
    ScrollView,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import Tema from '../../../../constantes/Cores';
import { usePlayer } from '../../../contexto/ContextoPlayer';
import { formatarDuracao, Musica } from '../../../lib/apiMusica';
import { SeletorFonteAudio } from '../../../componentes/SeletorFonteAudio';

export default function TelaPlayerCompleto() {
    const router = useRouter();
    const { width, height } = useWindowDimensions();
    const [filaVisivel, setFilaVisivel] = React.useState(false);
    const [fontesVisiveis, setFontesVisiveis] = React.useState(false);
    const [larguraBarra, setLarguraBarra] = React.useState(0);
    const { 
        faixaAtual, lista, estado, erro, posicao, duracao, buscarPara,
        pausar, retomar, proxima, anterior,
        aleatorio, repetir, alternarAleatorio, alternarRepeticao, tocar
    } = usePlayer();

    const buscarNaLinhaDoTempo = useCallback((x: number) => {
        if (duracao <= 0 || larguraBarra <= 0) return;
        buscarPara(Math.max(0, Math.min(1, x / larguraBarra)) * duracao);
    }, [buscarPara, duracao, larguraBarra]);

    const selecionarFonte = useCallback((fonte: Musica) => {
        if (!faixaAtual) return;
        const indiceAtual = lista.findIndex(item => item.id === faixaAtual.id && item.source === faixaAtual.source);
        const novaLista = [...lista];
        if (indiceAtual >= 0) novaLista[indiceAtual] = fonte;
        else novaLista.push(fonte);
        void tocar(fonte, novaLista);
    }, [faixaAtual, lista, tocar]);

    const tocarDaFila = useCallback((musica: Musica) => {
        setFilaVisivel(false);
        void tocar(musica, lista);
    }, [lista, tocar]);

    const handleGoBack = useCallback(() => {
        router.back();
    }, [router]);

    const handlePlayPause = useCallback(() => {
        if (!faixaAtual) return;
        if (estado === 'tocando') {
            pausar();
        } else {
            retomar();
        }
    }, [faixaAtual, estado, pausar, retomar]);

    const progresso = duracao > 0 ? posicao / duracao : 0;

    if (!faixaAtual) {
        return (
            <SafeAreaView style={[estilos.container, estilos.containerVazio]}>
                <TouchableOpacity onPress={handleGoBack} style={estilos.botaoVoltar}>
                    <Ionicons name="chevron-down" size={30} color={Tema.texto} />
                </TouchableOpacity>
                <View style={estilos.conteudoVazio}>
                    <Ionicons name="musical-notes-outline" size={64} color={Tema.textoSuave} />
                    <Text style={estilos.textoVazio}>Nenhuma música tocando no momento.</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (estado === 'erro') {
        return (
            <SafeAreaView style={[estilos.container, estilos.containerVazio]}>
                <TouchableOpacity onPress={handleGoBack} style={estilos.botaoVoltar}>
                    <Ionicons name="chevron-down" size={30} color={Tema.texto} />
                </TouchableOpacity>
                <View style={estilos.conteudoVazio}>
                    <Ionicons name="warning-outline" size={60} color={Tema.erro} />
                    <Text style={estilos.textoVazio}>{erro || 'Ocorreu um erro ao carregar a música.'}</Text>
                    <TouchableOpacity style={estilos.botaoFonteErro} onPress={() => setFontesVisiveis(true)}>
                        <Ionicons name="swap-horizontal" size={18} color="#FFF" />
                        <Text style={estilos.textoBotaoFonteErro}>Tentar outra fonte de áudio</Text>
                    </TouchableOpacity>
                </View>
                <SeletorFonteAudio musica={faixaAtual} visivel={fontesVisiveis} onFechar={() => setFontesVisiveis(false)} onSelecionar={selecionarFonte} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={estilos.container}>
            
            <TouchableOpacity onPress={handleGoBack} style={estilos.botaoVoltar}>
                <Ionicons name="chevron-down" size={30} color={Tema.texto} />
            </TouchableOpacity>

            <View style={estilos.topoPlayer}>
                <View style={estilos.tituloTopo}>
                    <Text style={estilos.rotuloTopo}>TOCANDO AGORA</Text>
                    <Text style={estilos.nomeFonteTopo} numberOfLines={1}>{faixaAtual.source}</Text>
                </View>
                <View style={estilos.acoesTopo}>
                    <TouchableOpacity accessibilityLabel="Escolher fonte de áudio" style={estilos.botaoTopo} onPress={() => setFontesVisiveis(true)}>
                        <Ionicons name="swap-horizontal" size={22} color={Tema.texto} />
                    </TouchableOpacity>
                    <TouchableOpacity accessibilityLabel="Abrir fila de reprodução" style={estilos.botaoTopo} onPress={() => setFilaVisivel(true)}>
                        <Ionicons name="list" size={22} color={Tema.texto} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={estilos.conteudo}>
                {faixaAtual.capa ? (
                    <Image source={{ uri: faixaAtual.capa }} style={[estilos.capaAlbum, { width: Math.min(width - 52, height * 0.42), maxWidth: 360 }]} />
                ) : (
                    <View style={[estilos.capaAlbum, estilos.capaAlbumPlaceholder, { width: Math.min(width - 52, height * 0.42), maxWidth: 360 }]}>
                        <Ionicons name="musical-notes" size={80} color={Tema.textoSuave} />
                    </View>
                )}

                <Text style={estilos.tituloMusica} numberOfLines={2}>
                    {faixaAtual.titulo}
                </Text>
                <Text style={estilos.artistaMusica} numberOfLines={1}>
                    {faixaAtual.artista}
                </Text>

                <View style={estilos.controlesProgresso}>
                    <View
                        style={estilos.barraProgresso}
                        onLayout={event => setLarguraBarra(event.nativeEvent.layout.width)}
                        onStartShouldSetResponder={() => true}
                        onMoveShouldSetResponder={() => true}
                        onResponderRelease={event => buscarNaLinhaDoTempo(event.nativeEvent.locationX)}
                    >
                        <View style={[estilos.barraPreenchida, { width: `${progresso * 100}%` }]} />
                    </View>
                    <View style={estilos.tempos}>
                        <Text style={estilos.tempoTexto}>{formatarDuracao(posicao)}</Text>
                        <Text style={estilos.tempoTexto}>{formatarDuracao(duracao)}</Text>
                    </View>
                </View>

                <View style={estilos.controlesPlayer}>
                    <TouchableOpacity style={estilos.botaoSecundario} onPress={alternarAleatorio}>
                        <Ionicons name="shuffle" size={24} color={aleatorio ? Tema.destaqueAlt : Tema.textoSuave} />
                    </TouchableOpacity>

                    <TouchableOpacity style={estilos.botaoControle} onPress={anterior}>
                        <Ionicons name="play-skip-back" size={32} color={Tema.texto} />
                    </TouchableOpacity>

                    <TouchableOpacity style={estilos.botaoPlayPause} onPress={handlePlayPause}>
                        {estado === 'carregando' ? (
                            <ActivityIndicator size="large" color={Tema.texto} />
                        ) : (
                            <Ionicons
                                name={estado === 'tocando' ? 'pause' : 'play'}
                                size={48}
                                color={Tema.texto}
                                style={{ marginLeft: estado === 'tocando' ? 0 : 4 }}
                            />
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={estilos.botaoControle} onPress={proxima}>
                        <Ionicons name="play-skip-forward" size={32} color={Tema.texto} />
                    </TouchableOpacity>

                    <TouchableOpacity accessibilityLabel={`Repetição: ${repetir}`} style={estilos.botaoSecundario} onPress={alternarRepeticao}>
                        <View>
                            <Ionicons name="repeat" size={24} color={repetir !== 'desligado' ? Tema.destaqueAlt : Tema.textoSuave} />
                            {repetir === 'faixa' && <Text style={estilos.repetirUm}>1</Text>}
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            <Modal visible={filaVisivel} transparent animationType="slide" onRequestClose={() => setFilaVisivel(false)}>
                <View style={estilos.fundoModal}>
                    <View style={estilos.cartaoFila}>
                        <View style={estilos.cabecalhoFila}>
                            <View style={{ flex: 1 }}>
                                <Text style={estilos.tituloFila}>Fila de reprodução</Text>
                                <Text style={estilos.subtituloFila}>{lista.length} músicas</Text>
                            </View>
                            <TouchableOpacity accessibilityLabel="Fechar fila" onPress={() => setFilaVisivel(false)}>
                                <Ionicons name="close" size={24} color={Tema.textoSecundario} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            {lista.length === 0 ? <Text style={estilos.filaVazia}>Adicione músicas pela busca para montar sua fila.</Text> : lista.map((item, index) => {
                                const atual = item.id === faixaAtual.id && item.source === faixaAtual.source;
                                return (
                                    <TouchableOpacity key={`${item.source}:${item.id}:${index}`} style={[estilos.itemFila, atual && estilos.itemFilaAtual]} onPress={() => tocarDaFila(item)}>
                                        {item.capa ? <Image source={{ uri: item.capa }} style={estilos.capaFila} /> : <View style={[estilos.capaFila, estilos.capaFilaVazia]}><Ionicons name="musical-notes" size={18} color={Tema.textoSuave} /></View>}
                                        <View style={{ flex: 1 }}>
                                            <Text style={[estilos.tituloItemFila, atual && estilos.textoItemAtual]} numberOfLines={1}>{item.titulo}</Text>
                                            <Text style={estilos.artistaItemFila} numberOfLines={1}>{item.artista} · {item.source}</Text>
                                        </View>
                                        {atual && <Ionicons name="volume-high" size={18} color={Tema.destaqueAlt} />}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
            <SeletorFonteAudio musica={faixaAtual} visivel={fontesVisiveis} onFechar={() => setFontesVisiveis(false)} onSelecionar={selecionarFonte} />
        </SafeAreaView>
    );
}

const estilos = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Tema.fundo,
        paddingTop: Platform.OS === 'android' ? 25 : 0,
    },
    containerVazio: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    conteudoVazio: {
        alignItems: 'center',
        gap: 10,
    },
    textoVazio: {
        color: Tema.textoSuave,
        fontSize: 16,
        marginTop: 10,
    },
    botaoVoltar: {
        position: 'absolute',
        top: Platform.OS === 'android' ? 35 : 15,
        left: 15,
        zIndex: 1,
        padding: 5,
    },
    topoPlayer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'android' ? 28 : 14, paddingHorizontal: 20 },
    tituloTopo: { marginLeft: 45 },
    rotuloTopo: { color: Tema.textoSuave, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
    nomeFonteTopo: { color: Tema.textoSecundario, fontSize: 12, marginTop: 3 },
    acoesTopo: { flexDirection: 'row', gap: 8 },
    botaoTopo: { width: 40, height: 40, borderRadius: 20, backgroundColor: Tema.superficie, alignItems: 'center', justifyContent: 'center' },
    conteudo: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    capaAlbum: {
        width: '80%',
        aspectRatio: 1,
        borderRadius: 20,
        backgroundColor: Tema.superficieClara,
        marginBottom: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    capaAlbumPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    tituloMusica: {
        color: Tema.texto,
        fontSize: 28,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 8,
    },
    artistaMusica: {
        color: Tema.textoSecundario,
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 40,
    },
    controlesProgresso: {
        width: '100%',
        marginBottom: 40,
    },
    barraProgresso: {
        height: 4,
        backgroundColor: Tema.borda,
        borderRadius: 2,
        width: '100%',
    },
    barraPreenchida: {
        height: '100%',
        backgroundColor: Tema.destaqueAlt,
        borderRadius: 2,
    },
    tempos: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    tempoTexto: {
        color: Tema.textoSuave,
        fontSize: 12,
    },
    controlesPlayer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        width: '100%',
    },
    botaoControle: {
        padding: 10,
    },
    botaoSecundario: {
        padding: 10,
    },
    repetirUm: { position: 'absolute', right: -2, bottom: -3, color: Tema.destaqueAlt, fontSize: 10, fontWeight: '900', backgroundColor: Tema.fundo, borderRadius: 5, overflow: 'hidden', paddingHorizontal: 2 },
    botaoPlayPause: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Tema.destaque,
        alignItems: 'center',
        justifyContent: 'center',
    },
    botaoFonteErro: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Tema.destaqueAlt, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, marginTop: 10 },
    textoBotaoFonteErro: { color: '#FFF', fontSize: 13, fontWeight: '700' },
    fundoModal: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
    cartaoFila: { maxHeight: '78%', backgroundColor: Tema.superficie, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 20, paddingBottom: 28 },
    cabecalhoFila: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    tituloFila: { color: Tema.texto, fontSize: 20, fontWeight: '800' },
    subtituloFila: { color: Tema.textoSuave, fontSize: 12, marginTop: 3 },
    filaVazia: { color: Tema.textoSuave, textAlign: 'center', paddingVertical: 28 },
    itemFila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Tema.borda },
    itemFilaAtual: { backgroundColor: '#4A7AB818' },
    capaFila: { width: 46, height: 46, borderRadius: 8 },
    capaFilaVazia: { backgroundColor: Tema.superficieClara, alignItems: 'center', justifyContent: 'center' },
    tituloItemFila: { color: Tema.texto, fontSize: 14, fontWeight: '700' },
    textoItemAtual: { color: Tema.destaqueAlt },
    artistaItemFila: { color: Tema.textoSuave, fontSize: 11, marginTop: 3 },
});
