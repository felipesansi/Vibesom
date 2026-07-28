import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Tema from '../../constantes/Cores';
import { usePlayer } from '../contexto/ContextoPlayer';
import {
    Album,
    Musica,
    buscarAlbunsMB,
    buscarMusicasMB,
    formatarDuracao,
    pesquisarAlbums,
    pesquisarMusicasPorArtista,
} from './apiMusica';

export default function TelaArtista() {
    const router = useRouter();
    const { nome, nomeArt, source } = useLocalSearchParams<{
        nome: string;
        nomeArt: string;
        source: 'MusicBrainz' | 'search';
    }>();

    const [albuns, setAlbuns] = useState<Album[]>([]);
    const [musicas, setMusicas] = useState<Musica[]>([]);
    const [carregando, setCarregando] = useState(true);

    const { tocar, faixaAtual, estado } = usePlayer();

    useEffect(() => {
        if (!nome) return;

        const controlador = new AbortController();
        setCarregando(true);

        (async () => {
            try {
                if (source === 'MusicBrainz') {
                    const [albunsRes, musicasRes] = await Promise.all([
                        buscarAlbunsMB(nome, controlador.signal),
                        buscarMusicasMB(nome, controlador.signal),
                    ]);
                    setAlbuns(albunsRes);
                    setMusicas(musicasRes);
                } else {
                    const [albunsRes, musicasRes] = await Promise.all([
                        pesquisarAlbums(nomeArt, controlador.signal),
                        pesquisarMusicasPorArtista(nomeArt, controlador.signal),
                    ]);
                    setAlbuns(albunsRes);
                    setMusicas(musicasRes);
                }
            } catch (error) {
                console.error('Erro ao buscar dados do artista:', error);
            } finally {
                setCarregando(false);
            }
        })();

        return () => controlador.abort();
    }, [nome, nomeArt, source]);

    const renderItemMusica = ({ item, index }: { item: Musica; index: number }) => {
        const ehAtual = faixaAtual?.id === item.id && faixaAtual.source === item.source;
        return (
            <TouchableOpacity style={styles.itemMusica} onPress={() => tocar(item, musicas)}>
                <Text style={styles.indiceMusica}>{index + 1}</Text>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.tituloMusica, ehAtual && { color: Tema.destaque }]} numberOfLines={1}>
                        {item.titulo}
                    </Text>
                    <Text style={styles.artistaMusica} numberOfLines={1}>
                        {item.artista}
                    </Text>
                </View>
                <Text style={styles.duracaoMusica}>{formatarDuracao(item.duracao)}</Text>
            </TouchableOpacity>
        );
    };

    const renderItemAlbum = ({ item }: { item: Album }) => (
        <TouchableOpacity
            style={styles.cartaoAlbum}
            onPress={() =>
                router.push({
                    pathname: '/album/[id]',
                    params: {
                        id: item.id,
                        titulo: item.titulo,
                        artista: item.artista,
                        capa: item.capa,
                        source: item.source,
                    },
                } as any)
            }
        >
            {item.capa ? (
                <Image source={{ uri: item.capa }} style={styles.capaAlbum} />
            ) : (
                <View style={[styles.capaAlbum, styles.capaPlaceholder]}>
                    <Ionicons name="albums-outline" size={40} color={Tema.textoSuave} />
                </View>
            )}
            <Text style={styles.tituloAlbum} numberOfLines={2}>
                {item.titulo}
            </Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ title: nomeArt, headerTitleAlign: 'center' }} />
            <ScrollView>
                <View style={styles.cabecalho}>
                    <Text style={styles.nomeArtista}>{nomeArt}</Text>
                </View>

                {carregando ? (
                    <ActivityIndicator size="large" color={Tema.destaque} style={{ marginTop: 40 }} />
                ) : (
                    <>
                        {albuns.length > 0 && (
                            <View style={styles.secao}>
                                <Text style={styles.tituloSecao}>Álbuns</Text>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.listaHorizontal}
                                >
                                    {albuns.map(album => (
                                        <View key={album.id}>{renderItemAlbum({ item: album })}</View>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {musicas.length > 0 && (
                            <View style={styles.secao}>
                                <Text style={styles.tituloSecao}>Músicas Populares</Text>
                                {musicas.slice(0, 10).map((musica, index) => (
                                    <View key={`${musica.id}-${index}`}>
                                        {renderItemMusica({ item: musica, index })}
                                    </View>
                                ))}
                            </View>
                        )}

                        {!albuns.length && !musicas.length && (
                            <Text style={styles.textoVazio}>Nenhum conteúdo encontrado para este artista.</Text>
                        )}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Tema.fundo },
    cabecalho: { padding: 20, alignItems: 'center' },
    nomeArtista: { fontSize: 28, fontWeight: 'bold', color: Tema.texto, textAlign: 'center' },
    secao: { marginBottom: 24 },
    tituloSecao: { fontSize: 20, fontWeight: 'bold', color: Tema.texto, marginBottom: 16, paddingHorizontal: 16 },
    listaHorizontal: { paddingHorizontal: 16, gap: 16 },
    cartaoAlbum: { width: 150 },
    capaAlbum: { width: 150, height: 150, borderRadius: 8, backgroundColor: Tema.superficie },
    capaPlaceholder: { justifyContent: 'center', alignItems: 'center' },
    tituloAlbum: { color: Tema.texto, fontWeight: '600', marginTop: 8, fontSize: 14 },
    itemMusica: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    indiceMusica: {
        color: Tema.textoSuave,
        fontSize: 16,
        width: 30,
    },
    tituloMusica: {
        color: Tema.texto,
        fontSize: 16,
        fontWeight: '500',
    },
    artistaMusica: {
        color: Tema.textoSecundario,
        fontSize: 13,
        marginTop: 2,
    },
    duracaoMusica: {
        color: Tema.textoSuave,
        fontSize: 14,
    },
    textoVazio: {
        color: Tema.textoSuave,
        textAlign: 'center',
        marginTop: 40,
        fontSize: 16,
    }
});
