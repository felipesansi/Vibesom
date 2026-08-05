import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, Alert, Animated, FlatList, Image, Linking, Modal, ScrollView,
    StyleSheet, Text, TextInput, TouchableOpacity, View,
    useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Tema from '../../../../constantes/Cores';
import { useAutenticacao } from '../../../contexto/ContextoAutenticacao';
import { usePlayer } from '../../../contexto/ContextoPlayer';
import {
    Artista,
    Musica,
    ResultadoPesquisa,
    buscarArtistasMB,
    formatarDuracao,
    pesquisar
} from '../../../lib/apiMusica';
import {
    buscarMusicasDaPlaylist,
    buscarPlaylistFavoritasDoUsuario,
    removerMusicaFavorita,
    salvarMusicaFavorita
} from '../../../lib/supabase';


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
    const [resultados, setResultados] = useState<ResultadoPesquisa>({ artistas: [], musicas: [], playlists: [] });
    const [melhorArtista, setMelhorArtista] = useState<Artista | null>(null);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const [filtroAtivo, setFiltroAtivo] = useState<'tudo' | 'musicas' | 'playlists' | 'artistas'>('tudo');
    const router = useRouter();
    const navigation = useNavigation<BottomTabNavigationProp<any>>();
    const { width } = useWindowDimensions();
    const isTablet = width > 768;

    const inputRef = useRef<TextInput>(null);
    const flatListRef = useRef<FlatList>(null);

    const { faixaAtual, estado, erro: erroPlayer, tocar, pausar, retomar, adicionarAFila } = usePlayer();
    const { usuario } = useAutenticacao();
    const [menuMusica, setMenuMusica] = useState<Musica | null>(null);
    const [favoritas, setFavoritas] = useState<Set<string>>(new Set());
    const [playlistFavoritasId, setPlaylistFavoritasId] = useState<string | null>(null);
    const [carregandoFavoritos, setCarregandoFavoritos] = useState(false);
    const slideAnim = useRef(new Animated.Value(300)).current;

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
            setResultados({ artistas: [], musicas: [], playlists: [] });
            setErro(null);
            return;
        }

        const controlador = new AbortController();

        (async () => {
            setErro(null);
            setCarregando(true);
            try {
                const [res, artistasMB] = await Promise.all([
                    pesquisar(termoBusca, controlador.signal).catch(() => ({ artistas: [], musicas: [], playlists: [] })),
                    buscarArtistasMB(termoBusca, controlador.signal).catch(() => [])
                ]);

                const resultadosCombinados = {
                    ...res,
                    artistas: artistasMB.length > 0 ? artistasMB : res.artistas
                };

                setResultados(resultadosCombinados);
                setMelhorArtista(resultadosCombinados.artistas.length > 0 ? resultadosCombinados.artistas[0] : null);
            } catch (e) {
                if (e instanceof Error && e.name !== 'AbortError') {
                    setResultados({ artistas: [], musicas: [], playlists: [] });
                    setErro(e.message || 'Falha ao buscar músicas.');
                }
            } finally {
                setCarregando(false);
            }
        })();

        return () => controlador.abort();
    }, [termoBusca]);

    useEffect(() => {
        if (!usuario?.id) {
            setFavoritas(new Set());
            setPlaylistFavoritasId(null);
            return;
        }

        let ativo = true;
        setCarregandoFavoritos(true);

        (async () => {
            try {
                const playlistId = await buscarPlaylistFavoritasDoUsuario(usuario.id);
                if (!ativo) return;
                setPlaylistFavoritasId(playlistId);

                if (!playlistId) {
                    setFavoritas(new Set());
                    return;
                }

                const musicasFavoritas = await buscarMusicasDaPlaylist(playlistId);
                if (!ativo) return;
                setFavoritas(new Set(musicasFavoritas.map((musica) => `${musica.source}:${musica.id}`)));
            } catch (erro) {
                console.warn('[Favoritas] falha ao carregar favoritas:', erro);
            } finally {
                if (ativo) setCarregandoFavoritos(false);
            }
        })();

        return () => { ativo = false; };
    }, [usuario?.id]);

    const alternarCurtida = useCallback(async (musica: Musica) => {
        if (!usuario?.id) {
            Alert.alert('Faça login', 'Você precisa entrar para favoritar músicas.');
            return;
        }

        const chave = `${musica.source}:${musica.id}`;
        const jaCurtida = favoritas.has(chave);

        setFavoritas((prev) => {
            const novo = new Set(prev);
            if (jaCurtida) novo.delete(chave);
            else novo.add(chave);
            return novo;
        });

        if (jaCurtida) {
            const { erro } = await removerMusicaFavorita(usuario.id, musica);
            if (erro) {
                setFavoritas((prev) => new Set(prev).add(chave));
                Alert.alert('Erro', erro);
            }
            return;
        }

        const { erro } = await salvarMusicaFavorita(usuario, musica);
        if (erro) {
            setFavoritas((prev) => {
                const novo = new Set(prev);
                novo.delete(chave);
                return novo;
            });
            Alert.alert('Erro', erro);
        }
    }, [favoritas, usuario]);

    const buscarPorCategoria = useCallback((rotulo: string) => {
        setConsulta(rotulo);
        setTermoBusca(rotulo);
    }, []);

    const aoTocar = useCallback(async (item: Musica) => {
        const ehAtual = faixaAtual?.id === item.id && faixaAtual?.source === item.source;
        if (ehAtual) {
            if (estado === 'tocando') pausar();
            else retomar();
        } else {
            await tocar(item, resultados.musicas);
        }
    }, [faixaAtual, estado, tocar, pausar, retomar, resultados.musicas]);

    const abrirMenu = useCallback((musica: Musica) => {
        setMenuMusica(musica);
        slideAnim.setValue(300);
        Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
        }).start();
    }, [slideAnim]);

    const fecharMenu = useCallback(() => {
        Animated.timing(slideAnim, {
            toValue: 300,
            duration: 200,
            useNativeDriver: true,
        }).start(() => setMenuMusica(null));
    }, [slideAnim]);

    const renderItem = useCallback(({ item }: { item: Musica }) => {
        const ehAtual = faixaAtual?.id === item.id && faixaAtual?.source === item.source;
        const tocandoEsta = ehAtual && estado === 'tocando';
        const carregandoEsta = ehAtual && estado === 'carregando';
        const chaveMusica = `${item.source}:${item.id}`;
        const curtida = favoritas.has(chaveMusica);
        const fonte = item.source.toLowerCase();
        const corFonte = corDaPlataforma(item.source);

        // Botão 3: ação específica da plataforma
        const acaoPlatadorma = (() => {
            if (fonte === 'soundcloud') return {
                icone: 'logo-soundcloud' as const,
                label: 'SoundCloud',
                cor: '#FF5500',
                acao: () => Linking.openURL(`https://soundcloud.com/search?q=${encodeURIComponent(item.titulo)}`),
            };
            if (fonte === 'youtube') return {
                icone: 'logo-youtube' as const,
                label: 'YouTube',
                cor: '#FF0000',
                acao: () => Linking.openURL(`https://youtube.com/watch?v=${item.id}`),
            };
            if (fonte === 'audius') return {
                icone: 'musical-note' as const,
                label: 'Audius',
                cor: '#CC0000',
                acao: () => Linking.openURL(`https://audius.co`),
            };
            if (fonte === 'jamendo') return {
                icone: 'musical-note' as const,
                label: 'Jamendo',
                cor: '#00A6A6',
                acao: () => Linking.openURL(`https://www.jamendo.com/track/${item.id}`),
            };
            if (fonte === 'bandcamp') return {
                icone: 'musical-note' as const,
                label: 'Bandcamp',
                cor: '#1DA0C3',
                acao: () => Linking.openURL(`https://bandcamp.com`),
            };
            // default
            return {
                icone: 'share-outline' as const,
                label: 'Compartilhar',
                cor: Tema.textoSecundario,
                acao: () => { },
            };
        })();

        return (
            <View style={[estilos.cardMusica, ehAtual && estilos.cardMusicaAtivo]}>
                {/* Linha superior: capa + info */}
                <TouchableOpacity
                    style={estilos.linhaMusica}
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
                        <Text style={[estilos.tituloMusica, ehAtual && { color: Tema.destaque }]} numberOfLines={1}>
                            {item.titulo}
                        </Text>
                        <Text style={estilos.artistaMusica} numberOfLines={1}>
                            {item.artista}
                        </Text>
                        <View style={estilos.rodapeMusica}>
                            <View style={[
                                estilos.badgePlataforma,
                                { backgroundColor: corFonte + '33' }
                            ]}>
                                {fonte === 'soundcloud' && (
                                    <Ionicons name="logo-soundcloud" size={12} color={corFonte} style={{ marginRight: 4 }} />
                                )}
                                {fonte === 'youtube' && (
                                    <Ionicons name="logo-youtube" size={12} color={corFonte} style={{ marginRight: 4 }} />
                                )}
                                <Text style={[estilos.textoBadge, { color: corFonte }]}>
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

                    {carregandoEsta && (
                        <ActivityIndicator size="small" color={Tema.destaque} style={{ marginLeft: 4 }} />
                    )}
                </TouchableOpacity>

                {/* Separador com cor da plataforma */}
                <View style={[estilos.separadorFonte, { backgroundColor: corFonte + '55' }]} />

                {/* 4 botões de ação */}
                <View style={estilos.botoesAcao}>
                    {/* 1. Tocar / Pausar */}
                    <TouchableOpacity
                        style={[estilos.botaoAcao, tocandoEsta && { backgroundColor: Tema.destaque + '18' }]}
                        onPress={() => aoTocar(item)}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={tocandoEsta ? 'pause-circle' : 'play-circle'}
                            size={22}
                            color={ehAtual ? Tema.destaque : Tema.textoSecundario}
                        />
                        <Text style={[estilos.labelBotaoAcao, ehAtual && { color: Tema.destaque }]}>
                            {tocandoEsta ? 'Pausar' : 'Tocar'}
                        </Text>
                    </TouchableOpacity>

                    {/* 2. Próxima na fila */}
                    <TouchableOpacity
                        style={estilos.botaoAcao}
                        onPress={() => adicionarAFila(item)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="play-skip-forward" size={22} color={Tema.textoSecundario} />
                        <Text style={estilos.labelBotaoAcao}>Próxima</Text>
                    </TouchableOpacity>

                    {/* 3. Ação da plataforma */}
                    <TouchableOpacity
                        style={estilos.botaoAcao}
                        onPress={acaoPlatadorma.acao}
                        activeOpacity={0.7}
                    >
                        <Ionicons name={acaoPlatadorma.icone} size={22} color={acaoPlatadorma.cor} />
                        <Text style={[estilos.labelBotaoAcao, { color: acaoPlatadorma.cor }]}>
                            {acaoPlatadorma.label}
                        </Text>
                    </TouchableOpacity>

                    {/* 4. Curtir */}
                    <TouchableOpacity
                        style={[estilos.botaoAcao, curtida && { backgroundColor: '#EC4899' + '18' }]}
                        onPress={() => alternarCurtida(item)}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={curtida ? 'heart' : 'heart-outline'}
                            size={22}
                            color={curtida ? '#EC4899' : Tema.textoSecundario}
                        />
                        <Text style={[estilos.labelBotaoAcao, curtida && { color: '#EC4899' }]}>
                            {curtida ? 'Curtido' : 'Curtir'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }, [faixaAtual, estado, aoTocar, adicionarAFila, alternarCurtida, favoritas]);

    const renderCardArtista = () => {
        if (!melhorArtista) return null;

        return (
            <TouchableOpacity
                style={estilos.cardMelhorResultado}
                activeOpacity={0.8}
                onPress={() => {
                    // Passa o ID do artista se for do MusicBrainz, senão passa o nome
                    const paramId = melhorArtista.source === 'MusicBrainz' ? melhorArtista.id : melhorArtista.nome;
                    router.push({
                        pathname: '/artista/[nome]',
                        params: { nome: paramId, nomeArt: melhorArtista.nome, source: melhorArtista.source, capa: melhorArtista.capa ?? '' }
                    });
                }}
            >
                {melhorArtista.capa ? (
                    <Image source={{ uri: melhorArtista.capa }} style={estilos.fotoArtistaMaior} />
                ) : (
                    <View style={[estilos.fotoArtistaMaior, estilos.capaPlaceholder]}>
                        <Ionicons name="person" size={48} color={Tema.textoSuave} />
                    </View>
                )}
                <Text style={estilos.nomeMelhorResultado} numberOfLines={2}>
                    {melhorArtista.nome}
                </Text>
                <View style={estilos.badgeArtista}>
                    <Text style={estilos.textoBadgeArtista}>Artista</Text>
                </View>
            </TouchableOpacity>
        );
    };

    const abrirArtista = useCallback((artista: Artista) => {
        const id = artista.source === 'MusicBrainz' ? artista.id : artista.nome;
        router.push({
            pathname: '/artista/[nome]',
            params: { nome: id, nomeArt: artista.nome, source: artista.source, capa: artista.capa ?? '' }
        });
    }, [router]);

    const dadosLista = termoBusca && !carregando && !erro
        ? (filtroAtivo === 'tudo' ? resultados.musicas.slice(0, 10) : (filtroAtivo === 'musicas' ? resultados.musicas : []))
        : [];

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
                        if (termo) setResultados({ artistas: [], musicas: [], playlists: [] });
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
                <>
                    {erroPlayer ? (
                        <View style={estilos.alertaPlayer}>
                            <Text style={estilos.textoErroPlayer}>{erroPlayer}</Text>
                        </View>
                    ) : null}
                    <View style={estilos.filtrosBusca}>
                        <TouchableOpacity onPress={() => setFiltroAtivo('tudo')} style={[estilos.filtroBadge, filtroAtivo === 'tudo' && estilos.filtroAtivo]}>
                            <Text style={[estilos.textoFiltro, filtroAtivo === 'tudo' && estilos.textoFiltroAtivo]}>Tudo</Text>
                        </TouchableOpacity>
                    <TouchableOpacity onPress={() => setFiltroAtivo('musicas')} style={[estilos.filtroBadge, filtroAtivo === 'musicas' && estilos.filtroAtivo]}>
                        <Text style={[estilos.textoFiltro, filtroAtivo === 'musicas' && estilos.textoFiltroAtivo]}>Músicas</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setFiltroAtivo('playlists')} style={[estilos.filtroBadge, filtroAtivo === 'playlists' && estilos.filtroAtivo]}>
                        <Text style={[estilos.textoFiltro, filtroAtivo === 'playlists' && estilos.textoFiltroAtivo]}>Playlists</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setFiltroAtivo('artistas')} style={[estilos.filtroBadge, filtroAtivo === 'artistas' && estilos.filtroAtivo]}>
                        <Text style={[estilos.textoFiltro, filtroAtivo === 'artistas' && estilos.textoFiltroAtivo]}>Artistas</Text>
                    </TouchableOpacity>
                </View>
                </>
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
                    ) : resultados.musicas.length > 0 || resultados.playlists.length > 0 || resultados.artistas.length > 0 ? (
                        <View style={isTablet && filtroAtivo === 'tudo' ? estilos.gridSuperior : null}>
                            {/* Sessão Melhor Resultado */}
                            {filtroAtivo === 'tudo' && melhorArtista && (
                                <View style={isTablet ? estilos.colunaEsquerda : { marginBottom: 24 }}>
                                    <Text style={estilos.secao}>Melhor resultado</Text>
                                    {renderCardArtista()}
                                </View>
                            )}

                            {/* Sessão Músicas Header */}
                            {((filtroAtivo === 'tudo' && resultados.musicas.length > 0) || (filtroAtivo === 'musicas')) && (
                                <View style={isTablet && filtroAtivo === 'tudo' ? estilos.colunaDireita : null}>
                                    <Text style={[estilos.secao, { marginBottom: 8 }]}>Músicas</Text>
                                    {/* Músicas vão ser renderizadas no FlatList principal para ter rolagem eficiente, exceto se estivermos na view de tablet (lá faríamos no ListHeaderComponent, mas para manter a estrutura, deixaremos o ListHeaderComponent cuidar do título e a FlatList do conteúdo) */}
                                </View>
                            )}
                        </View>
                    ) : null}
                </View>
            )}
        </View>
    );

    const rodape = (
        <View style={estilos.rodapeLista}>
            {termoBusca && !carregando && filtroAtivo === 'tudo' && resultados.musicas.length > 10 && (
                <TouchableOpacity style={estilos.botaoVerMais} onPress={() => setFiltroAtivo('musicas')}>
                    <Text style={estilos.textoBotaoVerMais}>Ver todas as músicas</Text>
                </TouchableOpacity>
            )}

            {termoBusca && !carregando && !erro && (filtroAtivo === 'tudo' || filtroAtivo === 'artistas') && resultados.artistas.length > 0 && (
                <View style={estilos.secaoResultados}>
                    <Text style={estilos.secao}>{filtroAtivo === 'artistas' ? 'Artistas' : 'Mais artistas'}</Text>
                    {resultados.artistas.map(artista => (
                        <TouchableOpacity
                            key={`${artista.source}-${artista.id}`}
                            style={estilos.linhaArtista}
                            activeOpacity={.75}
                            onPress={() => abrirArtista(artista)}
                        >
                            {artista.capa ? <Image source={{ uri: artista.capa }} style={estilos.fotoArtista} /> : (
                                <View style={[estilos.fotoArtista, estilos.capaPlaceholder]}><Ionicons name="person" size={25} color={Tema.textoSuave} /></View>
                            )}
                            <View style={{ flex: 1 }}>
                                <Text style={estilos.nomeArtista} numberOfLines={1}>{artista.nome}</Text>
                                <Text style={estilos.descricaoArtista}>Artista · {artista.source}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={Tema.textoSuave} />
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {termoBusca && !carregando && !erro && (filtroAtivo === 'tudo' || filtroAtivo === 'playlists') && resultados.playlists.length > 0 && (
                <View style={estilos.secaoResultados}>
                    <Text style={estilos.secao}>Playlists e Álbuns</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={estilos.listaHorizontal}
                    >
                        {resultados.playlists.map((playlist) => (
                            <TouchableOpacity
                                key={`${playlist.source}-${playlist.id}`}
                                style={estilos.cartaoAlbum}
                                onPress={() => setConsulta(playlist.titulo)}
                            >
                                {playlist.capa ? (
                                    <Image source={{ uri: playlist.capa }} style={estilos.capaAlbum} />
                                ) : (
                                    <View style={[estilos.capaAlbum, estilos.capaAlbumPlaceholder]}>
                                        <Ionicons name="albums" size={40} color={Tema.textoSuave} />
                                    </View>
                                )}
                                <Text style={estilos.tituloAlbum} numberOfLines={1}>{playlist.titulo}</Text>
                                <Text style={estilos.artistaAlbum} numberOfLines={1}>{playlist.artista}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}
        </View>
    );

    return (
        <SafeAreaView style={estilos.container}>
            <FlatList
                ref={flatListRef}
                data={dadosLista}
                keyExtractor={(item) => `${item.source}-${item.id}`}
                renderItem={renderItem}
                ListHeaderComponent={cabecalho}
                ListFooterComponent={rodape}
                contentContainerStyle={estilos.rolagem}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    termoBusca && !carregando && !erro && resultados.musicas.length === 0 && resultados.playlists.length === 0 ? (
                        <Text style={estilos.vazio}>Nenhum resultado encontrado para "{termoBusca}".</Text>
                    ) : null
                }
            />

            {/* Menu de opções da música */}
            <Modal
                visible={!!menuMusica}
                transparent
                animationType="none"
                onRequestClose={fecharMenu}
            >
                <TouchableOpacity style={estilos.overlay} activeOpacity={1} onPress={fecharMenu}>
                    <Animated.View
                        style={[estilos.menuContainer, { transform: [{ translateY: slideAnim }] }]}
                    >
                        {/* Cabeçalho do menu com info da música */}
                        {menuMusica && (
                            <>
                                <View style={estilos.menuHandle} />
                                <TouchableOpacity activeOpacity={1}>
                                    <View style={estilos.menuCabecalho}>
                                        {menuMusica.capa ? (
                                            <Image source={{ uri: menuMusica.capa }} style={estilos.menuCapa} />
                                        ) : (
                                            <View style={[estilos.menuCapa, estilos.menuCapaPlaceholder]}>
                                                <Ionicons name="musical-notes" size={28} color={Tema.textoSuave} />
                                            </View>
                                        )}
                                        <View style={{ flex: 1 }}>
                                            <Text style={estilos.menuTitulo} numberOfLines={1}>
                                                {menuMusica.titulo}
                                            </Text>
                                            <Text style={estilos.menuArtista} numberOfLines={1}>
                                                {menuMusica.artista}
                                            </Text>
                                            <View style={[estilos.badgePlataforma, {
                                                backgroundColor: corDaPlataforma(menuMusica.source) + '33',
                                                alignSelf: 'flex-start',
                                                marginTop: 6,
                                            }]}>
                                                <Text style={[estilos.textoBadge, { color: corDaPlataforma(menuMusica.source) }]}>
                                                    {menuMusica.source.toUpperCase()}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>

                                    <View style={estilos.menuDivisor} />

                                    {/* Opção 1: Tocar agora */}
                                    <TouchableOpacity
                                        style={estilos.menuOpcao}
                                        onPress={() => { fecharMenu(); setTimeout(() => aoTocar(menuMusica), 250); }}
                                    >
                                        <View style={[estilos.menuIconeWrapper, { backgroundColor: Tema.destaque + '22' }]}>
                                            <Ionicons name="play-circle" size={24} color={Tema.destaque} />
                                        </View>
                                        <View style={estilos.menuOpcaoTexto}>
                                            <Text style={estilos.menuOpcaoLabel}>Tocar agora</Text>
                                            <Text style={estilos.menuOpcaoDesc}>Iniciar reprodução imediatamente</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={16} color={Tema.textoSuave} />
                                    </TouchableOpacity>

                                    {/* Opção 2: Adicionar à fila */}
                                    <TouchableOpacity
                                        style={estilos.menuOpcao}
                                        onPress={() => { adicionarAFila(menuMusica); fecharMenu(); }}
                                    >
                                        <View style={[estilos.menuIconeWrapper, { backgroundColor: '#6366F1' + '22' }]}>
                                            <Ionicons name="list" size={24} color="#6366F1" />
                                        </View>
                                        <View style={estilos.menuOpcaoTexto}>
                                            <Text style={estilos.menuOpcaoLabel}>Adicionar à fila</Text>
                                            <Text style={estilos.menuOpcaoDesc}>Tocar após a música atual</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={16} color={Tema.textoSuave} />
                                    </TouchableOpacity>

                                    {/* Opção 3: Curtir */}
                                    <TouchableOpacity
                                        style={estilos.menuOpcao}
                                        onPress={() => { if (menuMusica) alternarCurtida(menuMusica); fecharMenu(); }}
                                    >
                                        <View style={[estilos.menuIconeWrapper, {
                                            backgroundColor: favoritas.has(`${menuMusica.source}:${menuMusica.id}`) ? '#EC4899' + '33' : Tema.superficie
                                        }]}> 
                                            <Ionicons
                                                name={favoritas.has(`${menuMusica.source}:${menuMusica.id}`) ? 'heart' : 'heart-outline'}
                                                size={24}
                                                color={favoritas.has(`${menuMusica.source}:${menuMusica.id}`) ? '#EC4899' : Tema.textoSuave}
                                            />
                                        </View>
                                        <View style={estilos.menuOpcaoTexto}>
                                                    <Text style={estilos.menuOpcaoLabel}>
                                                {favoritas.has(`${menuMusica.source}:${menuMusica.id}`) ? 'Remover curtida' : 'Curtir'}
                                            </Text>
                                            <Text style={estilos.menuOpcaoDesc}>Salvar nas músicas curtidas</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={16} color={Tema.textoSuave} />
                                    </TouchableOpacity>

                                    {/* Opção 4: Ver artista */}
                                    <TouchableOpacity
                                        style={estilos.menuOpcao}
                                        onPress={() => {
                                            fecharMenu();
                                            setTimeout(() => {
                                                router.push({
                                                    pathname: '/artista/[nome]',
                                                    params: { nome: menuMusica.artista, nomeArt: menuMusica.artista, source: 'search' }
                                                } as any);
                                            }, 300);
                                        }}
                                    >
                                        <View style={[estilos.menuIconeWrapper, { backgroundColor: '#F59E0B' + '22' }]}>
                                            <Ionicons name="person-circle" size={24} color="#F59E0B" />
                                        </View>
                                        <View style={estilos.menuOpcaoTexto}>
                                            <Text style={estilos.menuOpcaoLabel}>Ver artista</Text>
                                            <Text style={estilos.menuOpcaoDesc}>{menuMusica.artista}</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={16} color={Tema.textoSuave} />
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            </>
                        )}
                    </Animated.View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}


const estilos = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Tema.fundo,
    },
    rolagem: {
        paddingHorizontal: 16,
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
        borderRadius: 8,
        borderWidth: 0,
        paddingHorizontal: 14,
        height: 48,
        gap: 10,
        marginBottom: 16,
    },
    inputBusca: {
        flex: 1,
        color: Tema.texto,
        fontSize: 16,
        fontWeight: '500',
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
    },
    filtroAtivo: {
        backgroundColor: Tema.destaqueAlt,
    },
    textoFiltro: {
        color: Tema.textoSuave,
        fontSize: 13,
        fontWeight: '600',
    },
    textoFiltroAtivo: {
        color: Tema.fundo,
        fontWeight: '700',
    },
    secao: {
        color: Tema.texto,
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 16,
    },
    secaoResultados: {
        marginTop: 24,
        marginBottom: 8,
    },
    listaHorizontal: {
        gap: 16,
        paddingRight: 20,
    },
    cartaoAlbum: {
        width: 140,
    },
    linhaArtista: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 64,
        paddingVertical: 8,
    },
    fotoArtista: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Tema.superficieClara,
    },
    nomeArtista: { color: Tema.texto, fontSize: 15, fontWeight: '700' },
    descricaoArtista: { color: Tema.textoSecundario, fontSize: 13, marginTop: 3 },
    capaAlbum: {
        width: 140,
        height: 140,
        borderRadius: 8,
        backgroundColor: Tema.superficieClara,
        marginBottom: 12,
    },
    capaAlbumPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    tituloAlbum: {
        color: Tema.texto,
        fontSize: 14,
        fontWeight: '700',
    },
    artistaAlbum: {
        color: Tema.textoSuave,
        fontSize: 13,
        marginTop: 4,
    },
    grade: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 8,
    },
    cartaoCategoria: {
        width: '47%',
        height: 100,
        borderRadius: 8,
        padding: 12,
        overflow: 'hidden',
        justifyContent: 'flex-start',
    },
    rotuloCategoria: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        marginTop: 4,
    },
    iconeCategoria: {
        position: 'absolute',
        right: -8,
        bottom: -8,
        transform: [{ rotate: '25deg' }],
    },
    statusBusca: {
        minHeight: 32,
        justifyContent: 'center',
    },
    carregandoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginVertical: 20,
    },
    textoCarregando: {
        color: Tema.textoSecundario,
        fontSize: 15,
    },
    textoErro: {
        color: Tema.erro,
        fontSize: 14,
        marginVertical: 10,
    },
    alertaPlayer: {
        backgroundColor: '#FEE2E2',
        borderColor: '#FECACA',
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
    },
    textoErroPlayer: {
        color: '#B91C1C',
        fontSize: 14,
    },
    cardMusica: {
        backgroundColor: Tema.superficie,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: Tema.borda,
        overflow: 'hidden',
    },
    cardMusicaAtivo: {
        borderColor: Tema.destaque + '66',
        backgroundColor: Tema.superficieClara,
    },
    linhaMusica: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        gap: 12,
    },
    linhaMusicaAtiva: {
        backgroundColor: Tema.superficie,
    },
    capa: {
        width: 48,
        height: 48,
        borderRadius: 4,
        backgroundColor: Tema.superficieClara,
    },
    capaPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoMusica: {
        flex: 1,
        justifyContent: 'center',
    },
    tituloMusica: {
        color: Tema.texto,
        fontSize: 16,
        fontWeight: '500',
    },
    artistaMusica: {
        color: Tema.textoSecundario,
        fontSize: 14,
        marginTop: 4,
    },
    rodapeMusica: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 6,
    },
    badgePlataforma: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        flexDirection: 'row',
        alignItems: 'center',
    },
    textoBadge: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    duracaoMusica: {
        color: Tema.textoSuave,
        fontSize: 12,
    },
    iconePlay: {
        width: 40,
        alignItems: 'center',
    },
    separadorFonte: {
        height: 2,
    },
    botoesAcao: {
        flexDirection: 'row',
    },
    botaoAcao: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        gap: 4,
        borderRadius: 0,
    },
    labelBotaoAcao: {
        color: Tema.textoSuave,
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    vazio: {
        color: Tema.textoSuave,
        fontSize: 15,
        textAlign: 'center',
        marginTop: 40,
    },
    // Estilos do layout Spotify-like
    gridSuperior: {
        flexDirection: 'row',
        gap: 24,
    },
    colunaEsquerda: {
        flex: 1,
    },
    colunaDireita: {
        flex: 1,
    },
    cardMelhorResultado: {
        backgroundColor: Tema.superficie,
        borderRadius: 8,
        padding: 20,
        gap: 16,
    },
    fotoArtistaMaior: {
        width: 92,
        height: 92,
        borderRadius: 46, // imagem redonda para artistas
        backgroundColor: Tema.superficieClara,
    },
    nomeMelhorResultado: {
        color: Tema.texto,
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    badgeArtista: {
        backgroundColor: 'rgba(0,0,0,0.4)',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    textoBadgeArtista: {
        color: Tema.texto,
        fontSize: 13,
        fontWeight: '700',
    },
    rodapeLista: {
        marginTop: 16,
    },
    botaoVerMais: {
        alignSelf: 'flex-start',
        marginTop: 8,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Tema.borda,
    },
    textoBotaoVerMais: {
        color: Tema.texto,
        fontSize: 13,
        fontWeight: '700',
    },
    // Estilos do menu de opções
    botaoMenu: {
        width: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    menuContainer: {
        backgroundColor: Tema.superficie,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 40,
        overflow: 'hidden',
    },
    menuHandle: {
        width: 40,
        height: 4,
        backgroundColor: Tema.borda,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 8,
    },
    menuCabecalho: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 14,
    },
    menuCapa: {
        width: 56,
        height: 56,
        borderRadius: 8,
        backgroundColor: Tema.superficieClara,
    },
    menuCapaPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuTitulo: {
        color: Tema.texto,
        fontSize: 16,
        fontWeight: '700',
    },
    menuArtista: {
        color: Tema.textoSecundario,
        fontSize: 13,
        marginTop: 2,
    },
    menuDivisor: {
        height: 1,
        backgroundColor: Tema.borda,
        marginHorizontal: 16,
        marginBottom: 8,
    },
    menuOpcao: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 14,
    },
    menuIconeWrapper: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuOpcaoTexto: {
        flex: 1,
    },
    menuOpcaoLabel: {
        color: Tema.texto,
        fontSize: 15,
        fontWeight: '600',
    },
    menuOpcaoDesc: {
        color: Tema.textoSuave,
        fontSize: 12,
        marginTop: 2,
    },
});
