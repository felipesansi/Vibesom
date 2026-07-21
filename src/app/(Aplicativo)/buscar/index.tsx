import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, FlatList, Image, ScrollView,
    StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Tema from '../../../../constantes/Cores';
import { usePlayer } from '../../../contexto/ContextoPlayer';
import { Album, Musica, formatarDuracao, pesquisarAlbums, pesquisarMusicas } from '../../../lib/apiMusica';


type Categoria = {
    id: string;
    rotulo: string;
    cor: string;
    icone: 'radio' | 'flame' | 'mic' | 'pulse' | 'leaf' | 'cafe' | 'logo-soundcloud';
};

const CATEGORIAS: Categoria[] = [
    { id: '1', rotulo: 'Pop', cor: '#EC4899', icone: 'radio' },
    { id: '2', rotulo: 'Rock', cor: '#EF4444', icone: 'flame' },
    { id: '3', rotulo: 'Hip-hop', cor: '#F59E0B', icone: 'mic' },
    { id: '4', rotulo: 'Eletrônica', cor: '#8B5CF6', icone: 'pulse' },
    { id: '5', rotulo: 'Sertanejo', cor: '#22C55E', icone: 'leaf' },
    { id: '6', rotulo: 'Jazz', cor: '#06B6D4', icone: 'cafe' },
    { id: '7', rotulo: 'SoundCloud', cor: '#FF5500', icone: 'logo-soundcloud' },
];

const CORES_PLATAFORMA: Record<string, string> = {
    soundcloud: '#FF5500',
    youtube: '#FF0000',
    audius: '#CC0000',
    jamendo: '#00A6A6',
    archive: '#7B4F9E',
    mixcloud: '#52AAD8',
    hearthis: '#E81C7C',
    bandcamp: '#1DA0C3',
    dailymotion: '#0066DC',
    palco: '#009688',
    palcomp3: '#009688',
    saavn: '#2BC5B4',
};

function corDaPlataforma(source: string): string {
    return CORES_PLATAFORMA[source.toLowerCase()] ?? Tema.destaqueAlt;
}

const ATRASO_BUSCA_MS = 400;

export default function TelaBuscar() {
    const [consulta, setConsulta] = useState('');
    const [termoBusca, setTermoBusca] = useState('');
    const [resultados, setResultados] = useState<Musica[]>([]);
    const [albums, setAlbums] = useState<Album[]>([]);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const [filtroAtivo, setFiltroAtivo] = useState<'tudo' | 'musicas' | 'albuns'>('tudo');
    const router = useRouter(); 
    const navigation = useNavigation<BottomTabNavigationProp<any>>();
  
    const inputRef = useRef<TextInput>(null);
    const flatListRef = useRef<FlatList>(null);

    const { faixaAtual, estado, posicao, duracao, tocar, pausar, retomar } = usePlayer();

    useEffect(() => {
        const unsubscribe = navigation.addListener('tabPress', () => {
            if (navigation.isFocused()) {
                inputRef.current?.focus();
                flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
            }
        });
        return unsubscribe;
    }, [navigation]);

    useEffect(() => {
        const timer = setTimeout(() => setTermoBusca(consulta.trim()), ATRASO_BUSCA_MS);
        return () => clearTimeout(timer);
    }, [consulta]);

    useEffect(() => {
        if (!termoBusca) {
            setResultados([]);
            setErro(null);
            return;
        }

        const controlador = new AbortController();

        (async () => {
            setErro(null);
            setCarregando(true);
            try {
                const [musicas, resAlbums] = await Promise.all([
                    pesquisarMusicas(termoBusca, controlador.signal),
                    pesquisarAlbums(termoBusca, controlador.signal)
                ]);

                setResultados(musicas);
                setAlbums(resAlbums);
            } catch (e) {
                if (e instanceof Error && e.name !== 'AbortError') {
                    setResultados([]);
                    setAlbums([]);
                    setErro(e.message || 'Falha ao buscar músicas.');
                }
            } finally {
                setCarregando(false);
            }
        })();

        return () => controlador.abort();
    }, [termoBusca]);

    const buscarPorCategoria = useCallback((rotulo: string) => {
        setResultados([]);
        setConsulta(rotulo);
        setTermoBusca(rotulo);
    }, []);

    const aoTocar = useCallback(async (item: Musica) => {
        const ehAtual = faixaAtual?.id === item.id && faixaAtual?.source === item.source;
        if (ehAtual) {
            if (estado === 'tocando') pausar();
            else retomar();
        } else {
            await tocar(item, resultados);
        }
    }, [faixaAtual, estado, tocar, pausar, retomar, resultados]);

    const renderItem = useCallback(({ item }: { item: Musica }) => {
        const ehAtual = faixaAtual?.id === item.id && faixaAtual?.source === item.source;
        const tocandoEsta = ehAtual && estado === 'tocando';
        const carregandoEsta = ehAtual && estado === 'carregando';

        return (
            <TouchableOpacity
                style={[estilos.linhaMusica, ehAtual && estilos.linhaMusicaAtiva]}
                activeOpacity={0.75}
                onPress={() => aoTocar(item)}
            >
                {item.capa ? (
                    <Image source={{ uri: item.capa }} style={estilos.capa} />
                ) : (
                    <View style={[estilos.capa, estilos.capaPlaceholder]}>
                        <Ionicons name="musical-notes" size={24} color={Tema.textoSuave} />
                    </View>
                )}

                <View style={estilos.infoMusica}>
                    <Text style={estilos.tituloMusica} numberOfLines={1}>
                        {item.titulo}
                    </Text>
                    <Text style={estilos.artistaMusica} numberOfLines={1}>
                        {item.artista}
                    </Text>
                    <View style={estilos.rodapeMusica}>
                        <View style={[
                            estilos.badgePlataforma,
                            { backgroundColor: corDaPlataforma(item.source) + '33' }
                        ]}>
                            {item.source.toLowerCase() === 'soundcloud' && (
                                <Ionicons name="logo-soundcloud" size={12} color={corDaPlataforma(item.source)} style={{ marginRight: 4 }} />
                            )}
                            {item.source.toLowerCase() === 'youtube' && (
                                <Ionicons name="logo-youtube" size={12} color={corDaPlataforma(item.source)} style={{ marginRight: 4 }} />
                            )}
                            <Text style={[
                                estilos.textoBadge,
                                { color: corDaPlataforma(item.source) }
                            ]}>
                                {item.source.toUpperCase()}
                            </Text>
                        </View>
                        {item.duracao > 0 && (
                            <Text style={estilos.duracaoMusica}>
                                {formatarDuracao(item.duracao)}
                            </Text>
                        )}
                    </View>
                </View>

                <View style={estilos.iconePlay}>
                    {carregandoEsta ? (
                        <ActivityIndicator size="small" color={Tema.destaque} />
                    ) : (
                        <Ionicons
                            name={tocandoEsta ? 'pause-circle' : 'play-circle'}
                            size={32}
                            color={ehAtual ? Tema.destaqueAlt : Tema.destaque}
                        />
                    )}
                </View>
            </TouchableOpacity>
        );
    }, [faixaAtual, estado, aoTocar]);

    const cabecalho = (
        <View style={estilos.cabecalho}>
            <Text style={estilos.titulo}>Buscar</Text>

            <View style={estilos.caixaBusca}>
                <Ionicons name="search" size={20} color={Tema.textoSuave} />
                <TextInput
                    ref={inputRef}
                    style={estilos.inputBusca}
                    placeholder="Artistas, músicas ou álbuns"
                    placeholderTextColor={Tema.textoSuave}
                    value={consulta}
                    onChangeText={setConsulta}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                    onSubmitEditing={() => {
                        const termo = consulta.trim();
                        if (termo) setResultados([]);
                        setTermoBusca(termo);
                    }}
                />
                {consulta.length > 0 && (
                    <TouchableOpacity
                        onPress={() => {
                            setConsulta('');
                            setTermoBusca('');
                        }}
                    >
                        <Ionicons name="close-circle" size={20} color={Tema.textoSuave} />
                    </TouchableOpacity>
                )}
            </View>

            {termoBusca ? (
                <View style={estilos.filtrosBusca}>
                    <TouchableOpacity onPress={() => setFiltroAtivo('tudo')} style={[estilos.filtroBadge, filtroAtivo === 'tudo' && estilos.filtroAtivo]}>
                        <Text style={[estilos.textoFiltro, filtroAtivo === 'tudo' && estilos.textoFiltroAtivo]}>Tudo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setFiltroAtivo('musicas')} style={[estilos.filtroBadge, filtroAtivo === 'musicas' && estilos.filtroAtivo]}>
                        <Text style={[estilos.textoFiltro, filtroAtivo === 'musicas' && estilos.textoFiltroAtivo]}>Músicas</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setFiltroAtivo('albuns')} style={[estilos.filtroBadge, filtroAtivo === 'albuns' && estilos.filtroAtivo]}>
                        <Text style={[estilos.textoFiltro, filtroAtivo === 'albuns' && estilos.textoFiltroAtivo]}>Álbuns</Text>
                    </TouchableOpacity>
                </View>
            ) : null}

            {!termoBusca ? (
                <>
                    <Text style={estilos.secao}>Explorar por gênero</Text>
                    <View style={estilos.grade}>
                        {CATEGORIAS.map((categoria) => (
                            <TouchableOpacity
                                key={categoria.id}
                                style={[estilos.cartaoCategoria, { backgroundColor: categoria.cor }]}
                                activeOpacity={0.85}
                                onPress={() => buscarPorCategoria(categoria.rotulo)}
                            >
                                <Text style={estilos.rotuloCategoria}>{categoria.rotulo}</Text>
                                <Ionicons
                                    name={categoria.icone}
                                    size={48}
                                    color="rgba(255,255,255,0.3)"
                                    style={estilos.iconeCategoria}
                                />
                            </TouchableOpacity>
                        ))}
                    </View>
                </>
            ) : (
                <View style={estilos.statusBusca}>
                    {carregando ? (
                        <View style={estilos.carregandoRow}>
                            <ActivityIndicator size="small" color={Tema.destaque} />
                            <Text style={estilos.textoCarregando}>Buscando em diversas plataformas…</Text>
                        </View>
                    ) : erro ? (
                        <Text style={estilos.textoErro}>{erro}</Text>
                    ) : resultados.length > 0 || albums.length > 0 ? (
                        <View>
                            {filtroAtivo !== 'musicas' && albums.length > 0 && (
                                <View style={estilos.secaoResultados}>
                                    <Text style={estilos.secao}>Álbuns</Text>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={estilos.listaHorizontal}
                                    >
                                        {albums.map((album) => (
                                            <TouchableOpacity 
                                                key={`${album.source}-${album.id}`} 
                                                style={estilos.cartaoAlbum}
                                                onPress={() => setConsulta(album.titulo)}
                                            >
                                                {album.capa ? (
                                                    <Image source={{ uri: album.capa }} style={estilos.capaAlbum} />
                                                ) : (
                                                    <View style={[estilos.capaAlbum, estilos.capaAlbumPlaceholder]}>
                                                        <Ionicons name="albums" size={40} color={Tema.textoSuave} />
                                                    </View>
                                                )}
                                                <Text style={estilos.tituloAlbum} numberOfLines={1}>{album.titulo}</Text>
                                                <Text style={estilos.artistaAlbum} numberOfLines={1}>{album.artista}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                            
                            {filtroAtivo !== 'albuns' && resultados.length > 0 && (
                                <Text style={[estilos.secao, { marginTop: 10 }]}>Músicas</Text>
                            )}
                        </View>
                    ) : null}
                </View>
            )}
        </View>
    );

    return (
        <SafeAreaView style={estilos.container}>
            <FlatList
                ref={flatListRef}
                data={termoBusca && filtroAtivo !== 'albuns' ? resultados : []}
                keyExtractor={(item) => `${item.source}-${item.id}`}
                renderItem={renderItem}
                ListHeaderComponent={cabecalho}
                contentContainerStyle={estilos.rolagem}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    termoBusca && !carregando && !erro && resultados.length === 0 ? (
                        <Text style={estilos.vazio}>Nenhuma música encontrada.</Text>
                    ) : null
                }
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
        paddingHorizontal: 20,
        paddingBottom: 32,
    },
    cabecalho: {
        paddingTop: 4,
    },
    titulo: {
        color: Tema.texto,
        fontSize: 28,
        fontWeight: '800',
        marginBottom: 20,
    },
    caixaBusca: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Tema.superficie,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Tema.borda,
        paddingHorizontal: 14,
        height: 48,
        gap: 10,
        marginBottom: 16,
    },
    inputBusca: {
        flex: 1,
        color: Tema.texto,
        fontSize: 15,
    },
    filtrosBusca: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    filtroBadge: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: Tema.superficie,
        borderWidth: 1,
        borderColor: Tema.borda,
    },
    filtroAtivo: {
        backgroundColor: Tema.destaque,
        borderColor: Tema.destaque,
    },
    textoFiltro: {
        color: Tema.textoSuave,
        fontSize: 13,
        fontWeight: '600',
    },
    textoFiltroAtivo: {
        color: Tema.texto,
    },
    secao: {
        color: Tema.texto,
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 14,
    },
    secaoResultados: {
        marginBottom: 8,
    },
    listaHorizontal: {
        gap: 12,
        paddingRight: 20,
    },
    cartaoAlbum: {
        width: 120,
    },
    capaAlbum: {
        width: 120,
        height: 120,
        borderRadius: 10,
        backgroundColor: Tema.superficieClara,
        marginBottom: 8,
    },
    capaAlbumPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    tituloAlbum: {
        color: Tema.texto,
        fontSize: 13,
        fontWeight: '600',
    },
    artistaAlbum: {
        color: Tema.textoSuave,
        fontSize: 11,
        marginTop: 2,
    },
    grade: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 8,
    },
    cartaoCategoria: {
        width: '48%',
        height: 96,
        borderRadius: 10,
        padding: 12,
        overflow: 'hidden',
        justifyContent: 'flex-end',
    },
    rotuloCategoria: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
    },
    iconeCategoria: {
        position: 'absolute',
        right: 8,
        bottom: 8,
        transform: [{ rotate: '12deg' }],
    },
    statusBusca: {
        minHeight: 32,
        marginBottom: 12,
        justifyContent: 'center',
    },
    carregandoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    textoCarregando: {
        color: Tema.textoSecundario,
        fontSize: 13,
    },
    contagem: {
        color: Tema.textoSecundario,
        fontSize: 14,
    },
    textoErro: {
        color: Tema.erro,
        fontSize: 14,
    },
    linhaMusica: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Tema.superficie,
        borderRadius: 12,
        padding: 10,
        marginBottom: 10,
        gap: 12,
        borderWidth: 1,
        borderColor: Tema.borda,
    },
    linhaMusicaAtiva: {
        borderColor: Tema.destaqueAlt,
        backgroundColor: '#1B2A40',
    },
    capa: {
        width: 56,
        height: 56,
        borderRadius: 8,
        backgroundColor: Tema.superficieClara,
    },
    capaPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoMusica: {
        flex: 1,
    },
    tituloMusica: {
        color: Tema.texto,
        fontSize: 15,
        fontWeight: '600',
    },
    artistaMusica: {
        color: Tema.textoSecundario,
        fontSize: 13,
        marginTop: 2,
    },
    rodapeMusica: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 5,
    },
    badgePlataforma: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        flexDirection: 'row',
        alignItems: 'center',
    },
    textoBadge: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    duracaoMusica: {
        color: Tema.textoSuave,
        fontSize: 11,
    },
    iconePlay: {
        width: 36,
        alignItems: 'center',
    },
    vazio: {
        color: Tema.textoSuave,
        fontSize: 14,
        textAlign: 'center',
        marginTop: 24,
    },
});
