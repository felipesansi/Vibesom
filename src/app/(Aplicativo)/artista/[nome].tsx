import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
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
import { usePlayer } from '../../../contexto/ContextoPlayer';
import {
    Album,
    buscarAlbunsMB,
    buscarMusicasMB,
    formatarDuracao,
    Musica,
    pesquisarAlbums,
    pesquisarMusicasPorArtista,
} from '../../../lib/apiMusica';

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
    const { faixaAtual, estado, tocar, pausar, retomar } = usePlayer();

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

    const renderAlbum = (album: Album) => (
        <TouchableOpacity key={`${album.source}-${album.id}`} style={estilos.album} onPress={() => abrirAlbum(album)} activeOpacity={.8}>
            {album.capa ? <Image source={{ uri: album.capa }} style={estilos.capaAlbum} /> : (
                <View style={[estilos.capaAlbum, estilos.capaVazia]}><Ionicons name="disc" size={42} color={Tema.textoSuave} /></View>
            )}
            <Text style={estilos.tituloAlbum} numberOfLines={2}>{album.titulo}</Text>
            <Text style={estilos.metaAlbum} numberOfLines={1}>{ehSingle(album) ? 'Single / EP' : 'Álbum'}</Text>
        </TouchableOpacity>
    );

    const renderMusica = useCallback(({ item, index }: { item: Musica; index: number }) => {
        const ativa = faixaAtual?.id === item.id && faixaAtual?.source === item.source;
        return (
            <TouchableOpacity style={[estilos.musica, ativa && estilos.musicaAtiva]} onPress={() => setMusicaEscolhida(item)}>
                <Text style={estilos.numero}>{index + 1}</Text>
                <View style={{ flex: 1 }}>
                    <Text style={[estilos.tituloMusica, ativa && { color: Tema.destaqueAlt }]} numberOfLines={1}>{item.titulo}</Text>
                    <Text style={estilos.subtituloMusica} numberOfLines={1}>{item.artista}</Text>
                </View>
                <Text style={estilos.duracao}>{formatarDuracao(item.duracao)}</Text>
                <Ionicons name="ellipsis-horizontal" size={20} color={Tema.textoSuave} />
            </TouchableOpacity>
        );
    }, [faixaAtual]);

    const cabecalho = (
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
    );

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
    container: { flex: 1, backgroundColor: Tema.fundo }, rolagem: { paddingBottom: 32 }, centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    topo: { paddingHorizontal: 16, paddingTop: 6 }, voltar: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    perfil: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 28 }, fotoArtista: { width: 130, height: 130, borderRadius: 65, backgroundColor: Tema.superficieClara }, capaVazia: { alignItems: 'center', justifyContent: 'center' },
    rotulo: { color: Tema.destaqueAlt, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, marginTop: 16 }, nome: { color: Tema.texto, fontSize: 30, fontWeight: '900', textAlign: 'center', marginTop: 5 }, resumo: { color: Tema.textoSecundario, fontSize: 14, marginTop: 8 },
    secao: { marginBottom: 28 }, tituloSecao: { color: Tema.texto, fontSize: 21, fontWeight: '800', marginLeft: 16, marginBottom: 14 }, listaAlbuns: { gap: 14, paddingHorizontal: 16 }, album: { width: 144 }, capaAlbum: { width: 144, height: 144, borderRadius: 8, backgroundColor: Tema.superficieClara }, tituloAlbum: { color: Tema.texto, fontSize: 14, fontWeight: '700', marginTop: 8, lineHeight: 19 }, metaAlbum: { color: Tema.textoSuave, fontSize: 12, marginTop: 3 },
    tituloFaixas: { marginTop: 2 }, musica: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 9 }, musicaAtiva: { backgroundColor: Tema.superficie }, numero: { color: Tema.textoSuave, width: 18, textAlign: 'right', fontVariant: ['tabular-nums'] }, tituloMusica: { color: Tema.texto, fontSize: 15, fontWeight: '600' }, subtituloMusica: { color: Tema.textoSecundario, fontSize: 13, marginTop: 3 }, duracao: { color: Tema.textoSuave, fontSize: 13 },
    vazio: { color: Tema.textoSuave, textAlign: 'center', marginTop: 45, paddingHorizontal: 30 }, erro: { color: Tema.erro, textAlign: 'center', padding: 24 },
});
