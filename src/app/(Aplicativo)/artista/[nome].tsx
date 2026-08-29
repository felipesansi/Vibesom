import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    ScrollView,
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
import {
    Album,
    Artista,
    artistaEstaSendoSeguido,
    buscarAlbunsMB,
    buscarMusicasMB,
    deixarDeSeguirArtistaNaApi,
    formatarDuracao,
    Musica,
    pesquisarAlbums,
    pesquisarMusicasPorArtista,
    seguirArtistaNaApi,
} from '../../../lib/apiMusica';
import {
    buscarMusicasDaPlaylist,
    buscarPlaylistFavoritasDoUsuario,
    deixarDeSeguirArtista,
    removerMusicaFavorita,
    salvarMusicaFavorita,
    seguirArtista,
    verificarArtistaSeguido,
} from '../../../lib/supabase';

function ehSingle(album: Album): boolean {
    const tipo = (album.tipo ?? '').toLowerCase();
    return tipo.includes('single') || tipo.includes('ep');
}

export default function TelaArtista() {
    const router = useRouter();
    const params = useLocalSearchParams<{ nome: string; nomeArt?: string; source?: string; capa?: string }>();
    const idOuNome = decodeURIComponent(params.nome ?? '');
    const nomeArtista = params.nomeArt ? decodeURIComponent(params.nomeArt) : idOuNome;
    const usaMusicBrainz = params.source === 'MusicBrainz';

    const [albuns, setAlbuns] = useState<Album[]>([]);
    const [musicas, setMusicas] = useState<Musica[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);
    const [musicaEscolhida, setMusicaEscolhida] = useState<Musica | null>(null);
    const [favoritas, setFavoritas] = useState<Set<string>>(new Set());
    const [carregandoFavoritos, setCarregandoFavoritos] = useState(false);
    const [seguindo, setSeguindo] = useState(false);
    const [salvandoSeguir, setSalvandoSeguir] = useState(false);
    const { faixaAtual, estado, tocar, pausar, retomar } = usePlayer();
    const { usuario, sessao } = useAutenticacao();

    useEffect(() => {
        if (!idOuNome) {
            setCarregando(false);
            setErro('Artista não informado.');
            return;
        }

        const controlador = new AbortController();
        setCarregando(true);
        setErro(null);

        const carregar = usaMusicBrainz
            ? Promise.all([buscarAlbunsMB(idOuNome, controlador.signal, nomeArtista), buscarMusicasMB(idOuNome, controlador.signal, nomeArtista)])
            : Promise.all([pesquisarAlbums(nomeArtista, controlador.signal), pesquisarMusicasPorArtista(nomeArtista, controlador.signal)]);

        carregar.then(([lancamentos, faixas]) => {
            const nomeNormalizado = nomeArtista.trim().toLowerCase();
            setAlbuns(usaMusicBrainz
                ? lancamentos
                : lancamentos.filter(album => album.artista?.toLowerCase() === nomeNormalizado));
            setMusicas(faixas);
        }).catch(e => {
            if (e instanceof Error && e.name !== 'AbortError') setErro(e.message || 'Falha ao carregar o artista.');
        }).finally(() => setCarregando(false));

        return () => controlador.abort();
    }, [idOuNome, nomeArtista, usaMusicBrainz]);

    useFocusEffect(
        useCallback(() => {
            if (!usuario?.id) {
                setFavoritas(new Set());
                setSeguindo(false);
                return;
            }

            let ativo = true;
            setCarregandoFavoritos(true);

            (async () => {
                try {
                    let estaSeguindo = false;
                    if (sessao?.access_token) {
                        try {
                            estaSeguindo = await artistaEstaSendoSeguido(idOuNome, sessao.access_token);
                        } catch {
                            estaSeguindo = await verificarArtistaSeguido(usuario.id, idOuNome, params.source);
                        }
                    } else {
                        estaSeguindo = await verificarArtistaSeguido(usuario.id, idOuNome, params.source);
                    }

                    if (!ativo) return;
                    setSeguindo(estaSeguindo);

                    const playlistId = await buscarPlaylistFavoritasDoUsuario(usuario.id);
                    if (!ativo) return;

                    if (!playlistId) {
                        setFavoritas(new Set());
                        return;
                    }

                    const musicasFavoritas = await buscarMusicasDaPlaylist(playlistId);
                    if (!ativo) return;
                    setFavoritas(new Set(musicasFavoritas.map((musica: Musica) => `${musica.source}:${musica.id}`)));
                } catch (e) {
                    console.warn('[Artista] falha ao carregar dados do usuário:', e);
                } finally {
                    if (ativo) setCarregandoFavoritos(false);
                }
            })();

            return () => { ativo = false; };
        }, [usuario?.id, sessao?.access_token, idOuNome, params.source])
    );

    const { discos, singles } = useMemo(() => ({
        discos: albuns.filter(album => !ehSingle(album)),
        singles: albuns.filter(ehSingle),
    }), [albuns]);

    const tocarFonte = useCallback(async (musica: Musica) => {
        const ehAtual = faixaAtual?.id === musica.id && faixaAtual?.source === musica.source;
        if (ehAtual) {
            if (estado === 'tocando') pausar();
            else retomar();
            return;
        }
        await tocar(musica, [musica]);
    }, [estado, faixaAtual, pausar, retomar, tocar]);

    const abrirAlbum = useCallback((album: Album) => {
        router.push({
            pathname: '/album/[id]',
            params: {
                id: album.id,
                titulo: album.titulo,
                artista: album.artista,
                capa: album.capa ?? '',
                source: album.source,
                tipo: album.tipo ?? '',
                artistaId: idOuNome,
            },
        } as any);
    }, [idOuNome, router]);

    const alternarSeguir = useCallback(async () => {
        if (!usuario) {
            Alert.alert('Faça login', 'Você precisa entrar para seguir artistas.');
            return;
        }

        setSalvandoSeguir(true);
        const estavaSeguindo = seguindo;
        setSeguindo(!estavaSeguindo);

        const artistaObj: Artista = {
            id: idOuNome,
            nome: nomeArtista,
            capa: params.capa ? decodeURIComponent(params.capa) : undefined,
            source: params.source ?? 'MusicBrainz',
        };

        try {
            if (estavaSeguindo) {
                if (sessao?.access_token) {
                    try {
                        await deixarDeSeguirArtistaNaApi(idOuNome, sessao.access_token);
                    } catch {}
                }
                await deixarDeSeguirArtista(usuario.id, idOuNome, artistaObj.source);
                setSeguindo(false);
            } else {
                if (sessao?.access_token) {
                    try {
                        await seguirArtistaNaApi(artistaObj, sessao.access_token);
                    } catch {}
                }
                await seguirArtista(usuario, artistaObj);
                setSeguindo(true);
            }
        } catch (e) {
            setSeguindo(estavaSeguindo);
            Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível atualizar este artista.');
        } finally {
            setSalvandoSeguir(false);
        }
    }, [usuario, sessao?.access_token, seguindo, idOuNome, nomeArtista, params.capa, params.source]);

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

    const renderAlbum = (album: Album) => (
        <TouchableOpacity key={`${album.source}-${album.id}`} style={estilos.album} onPress={() => abrirAlbum(album)} activeOpacity={0.8}>
            {album.capa ? <Image source={{ uri: album.capa }} style={estilos.capaAlbum} /> : (
                <View style={[estilos.capaAlbum, estilos.capaVazia]}><Ionicons name="disc" size={42} color={Tema.textoSuave} /></View>
            )}
            <Text style={estilos.tituloAlbum} numberOfLines={2}>{album.titulo}</Text>
            <Text style={estilos.metaAlbum} numberOfLines={1}>{ehSingle(album) ? 'Single / EP' : 'Álbum'}</Text>
        </TouchableOpacity>
    );

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
                        onPress={() => alternarCurtida(item)}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={favoritas.has(`${item.source}:${item.id}`) ? 'heart' : 'heart-outline'}
                            size={20}
                            color={favoritas.has(`${item.source}:${item.id}`) ? Tema.destaqueAlt : Tema.textoSuave}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }, [faixaAtual, estado, favoritas, alternarCurtida]);

    const cabecalho = useMemo(() => (
        <>
            <View style={estilos.topo}>
                <TouchableOpacity onPress={() => router.back()} style={estilos.voltar}><Ionicons name="arrow-back" size={24} color={Tema.texto} /></TouchableOpacity>
            </View>
            <View style={estilos.perfil}>
                {params.capa ? <Image source={{ uri: decodeURIComponent(params.capa) }} style={estilos.fotoArtista} /> : (
                    <View style={[estilos.fotoArtista, estilos.capaVazia]}><Ionicons name="person" size={58} color={Tema.textoSuave} /></View>
                )}
                <Text style={estilos.rotulo}>ARTISTA</Text>
                <Text style={estilos.nome}>{nomeArtista}</Text>
                <Text style={estilos.resumo}>{albuns.length} lançamentos · {musicas.length} faixas encontradas</Text>
                <TouchableOpacity
                    style={[estilos.botaoSeguir, seguindo && estilos.botaoSeguindo]}
                    onPress={alternarSeguir}
                    disabled={salvandoSeguir}
                    activeOpacity={0.75}
                >
                    {salvandoSeguir
                        ? <ActivityIndicator size="small" color={seguindo ? Tema.destaqueAlt : Tema.fundo} />
                        : <Text style={[estilos.textoBotaoSeguir, seguindo && estilos.textoBotaoSeguindo]}>
                            {seguindo ? 'Seguindo' : 'Seguir'}
                          </Text>
                    }
                </TouchableOpacity>
            </View>

            {!!discos.length && <View style={estilos.secao}>
                <Text style={estilos.tituloSecao}>Álbuns</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.listaAlbuns}>{discos.map(renderAlbum)}</ScrollView>
            </View>}
            {!!singles.length && <View style={estilos.secao}>
                <Text style={estilos.tituloSecao}>Singles e EPs</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.listaAlbuns}>{singles.map(renderAlbum)}</ScrollView>
            </View>}
            {!!musicas.length && <Text style={[estilos.tituloSecao, estilos.tituloFaixas]}>Músicas</Text>}
        </>
    ), [nomeArtista, albuns, musicas, discos, singles, params.capa, seguindo, salvandoSeguir, alternarSeguir, renderAlbum, router]);

    return (
        <SafeAreaView style={estilos.container}>
            {carregando ? <View style={estilos.centro}><ActivityIndicator size="large" color={Tema.destaqueAlt} /></View>
                : erro ? <View style={estilos.centro}><Text style={estilos.erro}>{erro}</Text></View>
                    : <FlatList
                        data={musicas}
                        renderItem={renderMusica}
                        keyExtractor={item => `${item.source}-${item.id}`}
                        ListHeaderComponent={cabecalho}
                        ListEmptyComponent={<Text style={estilos.vazio}>Nenhum álbum, single ou música encontrado para este artista.</Text>}
                        contentContainerStyle={estilos.rolagem}
                    />}
            <SeletorFonteAudio musica={musicaEscolhida} visivel={!!musicaEscolhida} onFechar={() => setMusicaEscolhida(null)} onSelecionar={tocarFonte} />
        </SafeAreaView>
    );
}

const estilos = StyleSheet.create({
    container: { flex: 1, backgroundColor: Tema.fundo },
    rolagem: { paddingBottom: 32 },
    centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    topo: { paddingHorizontal: 16, paddingTop: 10, marginBottom: 6 },
    voltar: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    perfil: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 28 },
    fotoArtista: { width: 142, height: 142, borderRadius: 72, backgroundColor: Tema.superficieClara },
    capaVazia: { alignItems: 'center', justifyContent: 'center' },
    rotulo: { color: Tema.destaqueAlt, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, marginTop: 16 },
    nome: { color: Tema.texto, fontSize: 30, fontWeight: '900', textAlign: 'center', marginTop: 8 },
    resumo: { color: Tema.textoSuave, fontSize: 14, marginTop: 8, lineHeight: 20, textAlign: 'center', maxWidth: '85%' },
    botaoSeguir: { marginTop: 18, paddingHorizontal: 32, paddingVertical: 10, borderRadius: 24, backgroundColor: Tema.destaqueAlt, minWidth: 110, alignItems: 'center' },
    botaoSeguindo: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Tema.destaqueAlt },
    textoBotaoSeguir: { color: Tema.fundo, fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
    textoBotaoSeguindo: { color: Tema.destaqueAlt },
    secao: { marginBottom: 30 },
    tituloSecao: { color: Tema.texto, fontSize: 21, fontWeight: '800', marginLeft: 16, marginBottom: 14 },
    listaAlbuns: { gap: 14, paddingHorizontal: 16 },
    album: { width: 144 },
    capaAlbum: { width: 144, height: 144, borderRadius: 18, backgroundColor: Tema.superficieClara },
    tituloAlbum: { color: Tema.texto, fontSize: 14, fontWeight: '700', marginTop: 10, lineHeight: 20 },
    metaAlbum: { color: Tema.textoSuave, fontSize: 12, marginTop: 4 },
    tituloFaixas: { marginTop: 2, marginLeft: 16 },
    musica: { minHeight: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: 16, marginBottom: 10, borderRadius: 18, backgroundColor: Tema.superficie, borderWidth: 1, borderColor: Tema.borda },
    musicaAtiva: { borderColor: Tema.destaqueAlt, backgroundColor: Tema.superficieClara },
    musicaInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
    musicaAcoes: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    numero: { color: Tema.textoSuave, width: 24, textAlign: 'right', fontVariant: ['tabular-nums'] },
    tituloMusica: { color: Tema.texto, fontSize: 15, fontWeight: '700' },
    subtituloMusica: { color: Tema.textoSuave, fontSize: 13, marginTop: 3 },
    duracao: { color: Tema.textoSuave, fontSize: 13, minWidth: 40, textAlign: 'right' },
    botaoCurtir: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: Tema.superficieClara },
    vazio: { color: Tema.textoSuave, textAlign: 'center', marginTop: 45, paddingHorizontal: 30 },
    erro: { color: Tema.erro, textAlign: 'center', padding: 24 },
});
