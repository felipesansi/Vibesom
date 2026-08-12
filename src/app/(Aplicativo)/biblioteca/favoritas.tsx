import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Tema from '../../../../constantes/Cores';
import { SeletorFonteAudio } from '../../../componentes/SeletorFonteAudio';
import { useAutenticacao } from '../../../contexto/ContextoAutenticacao';
import { usePlayer } from '../../../contexto/ContextoPlayer';
import { formatarDuracao, Musica } from '../../../lib/apiMusica';
import {
    buscarMusicasDaPlaylist,
    buscarPlaylistFavoritasDoUsuario,
    removerMusicaFavorita,
} from '../../../lib/supabase';

export default function Favoritas() {
    const router = useRouter();
    const { usuario } = useAutenticacao();
    const { faixaAtual, estado, tocar, pausar, retomar } = usePlayer();
    
    const [musicas, setMusicas] = useState<Musica[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);
    const [musicaEscolhida, setMusicaEscolhida] = useState<Musica | null>(null);
    const playlistFavoritasIdRef = useRef<string | null>(null);

    const carregarFavoritas = useCallback(async () => {
        if (!usuario?.id) {
            setCarregando(false);
            setErro('Você precisa estar logado para ver suas favoritas.');
            return;
        }

        setCarregando(true);
        setErro(null);

        try {
            let playlistId = playlistFavoritasIdRef.current;
            if (!playlistId) {
                playlistId = await buscarPlaylistFavoritasDoUsuario(usuario.id);
                playlistFavoritasIdRef.current = playlistId;
            }
            if (!playlistId) {
                setMusicas([]);
                return;
            }

            const faixas = await buscarMusicasDaPlaylist(playlistId);
            setMusicas(faixas);
        } catch (e) {
            console.error('[Favoritas] Erro:', e);
            setErro('Não foi possível carregar as favoritas.');
        } finally {
            setCarregando(false);
        }
    }, [usuario]);

    useFocusEffect(
        useCallback(() => {
            carregarFavoritas();
        }, [carregarFavoritas])
    );

    const tocarFonte = useCallback(async (musica: Musica) => {
        const ehAtual = faixaAtual?.id === musica.id && faixaAtual?.source === musica.source;
        if (ehAtual) {
            if (estado === 'tocando') pausar();
            else retomar();
            return;
        }
        await tocar(musica, musicas);
    }, [estado, faixaAtual, pausar, retomar, tocar, musicas]);

    const removerFavorita = useCallback(async (musica: Musica) => {
        if (!usuario?.id) return;
        
        Alert.alert(
            'Remover dos Favoritos',
            `Deseja remover "${musica.titulo}" das favoritas?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Remover',
                    style: 'destructive',
                    onPress: async () => {
                        const { erro } = await removerMusicaFavorita(usuario.id, musica);
                        if (erro) {
                            Alert.alert('Erro', erro);
                        } else {
                            setMusicas((prev) => prev.filter(m => !(m.id === musica.id && m.source === musica.source)));
                        }
                    }
                }
            ]
        );
    }, [usuario]);

    const renderMusica = useCallback(({ item, index }: { item: Musica; index: number }) => {
        const ativa = faixaAtual?.id === item.id && faixaAtual?.source === item.source;
        const carregandoEsta = ativa && estado === 'carregando';
        return (
            <View style={[estilos.musica, ativa && estilos.musicaAtiva]}>
                <TouchableOpacity style={estilos.musicaInfo} onPress={() => setMusicaEscolhida(item)}>
                    <Text style={estilos.numero}>{index + 1}</Text>
                    <View style={{ flex: 1 }}>
                        <Text style={[estilos.tituloMusica, ativa && { color: Tema.destaqueAlt }]} numberOfLines={1}>{item.titulo}</Text>
                        <Text style={estilos.subtituloMusica} numberOfLines={1}>{item.artista}</Text>
                    </View>
                </TouchableOpacity>
                <View style={estilos.musicaAcoes}>
                    <Text style={estilos.duracao}>{formatarDuracao(item.duracao)}</Text>
                    {carregandoEsta && <ActivityIndicator size="small" color={Tema.destaqueAlt} style={{ marginLeft: 4 }} />}
                    <TouchableOpacity
                        style={estilos.botaoCurtir}
                        onPress={() => removerFavorita(item)}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={'heart'}
                            size={20}
                            color={Tema.destaqueAlt}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }, [faixaAtual, estado, removerFavorita]);

    const cabecalho = (
        <View style={estilos.topo}>
            <TouchableOpacity onPress={() => router.back()} style={estilos.voltar}>
                <Ionicons name="arrow-back" size={24} color={Tema.texto} />
            </TouchableOpacity>
            <View style={estilos.tituloContainer}>
                <Text style={estilos.tituloSecao}>Músicas Curtidas</Text>
                <Text style={estilos.subtituloSecao}>{musicas.length} faixas</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={estilos.container}>
            {carregando ? (
                <View style={estilos.centro}>
                    <ActivityIndicator size="large" color={Tema.destaqueAlt} />
                </View>
            ) : erro ? (
                <View style={estilos.centro}>
                    <Text style={estilos.erro}>{erro}</Text>
                </View>
            ) : (
                <FlatList
                    data={musicas}
                    renderItem={renderMusica}
                    keyExtractor={item => `${item.source}-${item.id}`}
                    ListHeaderComponent={cabecalho}
                    ListEmptyComponent={<Text style={estilos.vazio}>Nenhuma música curtida ainda.</Text>}
                    contentContainerStyle={estilos.rolagem}
                    initialNumToRender={10}
                    windowSize={7}
                    removeClippedSubviews
                />
            )}
            <SeletorFonteAudio 
                musica={musicaEscolhida} 
                visivel={!!musicaEscolhida} 
                onFechar={() => setMusicaEscolhida(null)} 
                onSelecionar={tocarFonte} 
            />
        </SafeAreaView>
    );
}

const estilos = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Tema.fundo,
    },
    rolagem: {
        paddingBottom: 32,
    },
    centro: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    topo: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 10,
        marginBottom: 20,
    },
    voltar: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    tituloContainer: {
        flex: 1,
    },
    tituloSecao: {
        color: Tema.texto,
        fontSize: 24,
        fontWeight: '800',
    },
    subtituloSecao: {
        color: Tema.textoSuave,
        fontSize: 14,
        marginTop: 4,
    },
    musica: {
        minHeight: 72,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginHorizontal: 16,
        marginBottom: 10,
        borderRadius: 18,
        backgroundColor: Tema.superficie,
        borderWidth: 1,
        borderColor: Tema.borda,
    },
    musicaAtiva: {
        borderColor: Tema.destaqueAlt,
        backgroundColor: Tema.superficieClara,
    },
    musicaInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    musicaAcoes: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    numero: {
        color: Tema.textoSuave,
        width: 24,
        textAlign: 'right',
        fontVariant: ['tabular-nums'],
    },
    tituloMusica: {
        color: Tema.texto,
        fontSize: 15,
        fontWeight: '700',
    },
    subtituloMusica: {
        color: Tema.textoSuave,
        fontSize: 13,
        marginTop: 3,
    },
    duracao: {
        color: Tema.textoSuave,
        fontSize: 13,
        minWidth: 40,
        textAlign: 'right',
    },
    botaoCurtir: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Tema.superficieClara,
    },
    vazio: {
        color: Tema.textoSuave,
        textAlign: 'center',
        marginTop: 45,
        paddingHorizontal: 30,
    },
    erro: {
        color: Tema.erro,
        textAlign: 'center',
        padding: 24,
    },
});
