import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import {
    ActivityIndicator,
    Image,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Tema from '../../../../constantes/Cores';
import { usePlayer } from '../../../contexto/ContextoPlayer';
import { formatarDuracao } from '../../../lib/apiMusica';

export default function TelaPlayerCompleto() {
    const router = useRouter();
    const { 
        faixaAtual, estado, erro, posicao, duracao, 
        pausar, retomar, proxima, anterior,
        aleatorio, repetir, alternarAleatorio, alternarRepeticao 
    } = usePlayer();

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
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={estilos.container}>
            <TouchableOpacity onPress={handleGoBack} style={estilos.botaoVoltar}>
                <Ionicons name="chevron-down" size={30} color={Tema.texto} />
            </TouchableOpacity>

            <View style={estilos.conteudo}>
                {faixaAtual.capa ? (
                    <Image source={{ uri: faixaAtual.capa }} style={estilos.capaAlbum} />
                ) : (
                    <View style={[estilos.capaAlbum, estilos.capaAlbumPlaceholder]}>
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
                    <View style={estilos.barraProgresso}>
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

                    <TouchableOpacity style={estilos.botaoSecundario} onPress={alternarRepeticao}>
                        <Ionicons name="repeat" size={24} color={repetir ? Tema.destaqueAlt : Tema.textoSuave} />
                    </TouchableOpacity>
                </View>
            </View>
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
    botaoPlayPause: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Tema.destaque,
        alignItems: 'center',
        justifyContent: 'center',
    },
});