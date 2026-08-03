import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Tema from '../../../../constantes/Cores';
import { SeletorFonteAudio } from '../../../componentes/SeletorFonteAudio';
import { usePlayer } from '../../../contexto/ContextoPlayer';
import { buscarMusicasDoAlbum, formatarDuracao, Musica } from '../../../lib/apiMusica';

export default function TelaAlbum() {
    const router = useRouter();
    const params = useLocalSearchParams<{ id: string; titulo?: string; artista?: string; capa?: string; source?: string; tipo?: string; artistaId?: string }>();
    const [musicas, setMusicas] = useState<Musica[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);
    const [musicaEscolhida, setMusicaEscolhida] = useState<Musica | null>(null);
    const { faixaAtual, estado, tocar, pausar, retomar } = usePlayer();

    useEffect(() => {
        const id = params.id ? decodeURIComponent(params.id) : '';
        if (!id) {
            setErro('Álbum não informado.');
            setCarregando(false);
            return;
        }
        const controlador = new AbortController();
        setCarregando(true);
        setErro(null);
        buscarMusicasDoAlbum(
            id,
            params.source ?? 'MusicBrainz',
            controlador.signal,
            params.artista ? decodeURIComponent(params.artista) : undefined,
            params.artistaId ? decodeURIComponent(params.artistaId) : undefined,
            params.titulo ? decodeURIComponent(params.titulo) : undefined,
        )
            .then(resultado => setMusicas(resultado.map(musica => ({ ...musica, capa: musica.capa ?? (params.capa ? decodeURIComponent(params.capa) : null) }))))
            .catch(e => {
                if (e instanceof Error && e.name !== 'AbortError') setErro(e.message || 'Não foi possível carregar as faixas.');
            })
            .finally(() => setCarregando(false));
        return () => controlador.abort();
    }, [params.id, params.source, params.capa, params.artista, params.artistaId, params.titulo]);

    const tocarFonte = useCallback(async (musica: Musica) => {
        const ativa = faixaAtual?.id === musica.id && faixaAtual?.source === musica.source;
        if (ativa) {
            if (estado === 'tocando') pausar(); else retomar();
            return;
        }
        await tocar(musica, [musica]);
    }, [estado, faixaAtual, pausar, retomar, tocar]);

    const renderMusica = useCallback(({ item, index }: { item: Musica; index: number }) => {
        const ativa = faixaAtual?.id === item.id && faixaAtual?.source === item.source;
        const carregandoEsta = ativa && estado === 'carregando';
        return <TouchableOpacity style={[estilos.faixa, ativa && estilos.faixaAtiva]} onPress={() => setMusicaEscolhida(item)}>
            <Text style={estilos.numero}>{index + 1}</Text>
            <View style={{ flex: 1 }}>
                <Text style={[estilos.tituloFaixa, ativa && { color: Tema.destaqueAlt }]} numberOfLines={1}>{item.titulo}</Text>
                <Text style={estilos.artistaFaixa} numberOfLines={1}>{item.artista}</Text>
            </View>
            <Text style={estilos.duracao}>{formatarDuracao(item.duracao)}</Text>
            {carregandoEsta && <ActivityIndicator size="small" color={Tema.destaqueAlt} style={{ marginLeft: 4 }} />}
            <Ionicons name="play-circle-outline" size={25} color={Tema.textoSecundario} />
        </TouchableOpacity>;
    }, [faixaAtual, estado]);

    const titulo = params.titulo ? decodeURIComponent(params.titulo) : 'Álbum';
    const artista = params.artista ? decodeURIComponent(params.artista) : '';
    const capa = params.capa ? decodeURIComponent(params.capa) : '';
    const tipo = (params.tipo ?? '').toLowerCase().includes('single') ? 'Single' : 'Álbum';
    const cabecalho = <>
        <View style={estilos.topo}><TouchableOpacity style={estilos.voltar} onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={Tema.texto} /></TouchableOpacity></View>
        <View style={estilos.cabecalho}>
            {capa ? <Image source={{ uri: capa }} style={estilos.capa} /> : <View style={[estilos.capa, estilos.capaVazia]}><Ionicons name="disc" size={65} color={Tema.textoSuave} /></View>}
            <Text style={estilos.tipo}>{tipo.toUpperCase()}</Text>
            <Text style={estilos.titulo} numberOfLines={2}>{titulo}</Text>
            <Text style={estilos.artista} numberOfLines={1}>{artista}</Text>
            <Text style={estilos.contagem}>{musicas.length} {musicas.length === 1 ? 'música' : 'músicas'}</Text>
        </View>
        {!!musicas.length && <Text style={estilos.tituloLista}>Todas as músicas</Text>}
    </>;

    return <SafeAreaView style={estilos.container}>
        {carregando ? <View style={estilos.centro}><ActivityIndicator size="large" color={Tema.destaqueAlt} /></View>
            : erro ? <View style={estilos.centro}><Text style={estilos.erro}>{erro}</Text></View>
                : <FlatList data={musicas} keyExtractor={item => `${item.source}-${item.id}`} renderItem={renderMusica} ListHeaderComponent={cabecalho} contentContainerStyle={estilos.rolagem} ListEmptyComponent={<Text style={estilos.vazio}>Não há músicas disponíveis neste lançamento.</Text>} />}
        <SeletorFonteAudio musica={musicaEscolhida} visivel={!!musicaEscolhida} onFechar={() => setMusicaEscolhida(null)} onSelecionar={tocarFonte} />
    </SafeAreaView>;
}

const estilos = StyleSheet.create({
    container: { flex: 1, backgroundColor: Tema.fundo }, rolagem: { paddingBottom: 32 }, centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    topo: { paddingHorizontal: 16, paddingTop: 6 }, voltar: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }, cabecalho: { alignItems: 'center', paddingHorizontal: 30, paddingBottom: 28 },
    capa: { width: 205, height: 205, borderRadius: 8, backgroundColor: Tema.superficieClara, shadowColor: '#000', shadowOpacity: .35, shadowRadius: 14, elevation: 8 }, capaVazia: { alignItems: 'center', justifyContent: 'center' },
    tipo: { color: Tema.destaqueAlt, fontSize: 12, fontWeight: '800', letterSpacing: 1.1, marginTop: 20 }, titulo: { color: Tema.texto, fontSize: 28, fontWeight: '900', textAlign: 'center', marginTop: 5 }, artista: { color: Tema.textoSecundario, fontSize: 16, marginTop: 7 }, contagem: { color: Tema.textoSuave, fontSize: 13, marginTop: 7 },
    tituloLista: { color: Tema.texto, fontSize: 20, fontWeight: '800', marginLeft: 16, marginBottom: 9 }, faixa: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 9 }, faixaAtiva: { backgroundColor: Tema.superficie }, numero: { width: 21, color: Tema.textoSuave, textAlign: 'right', fontVariant: ['tabular-nums'] }, tituloFaixa: { color: Tema.texto, fontSize: 15, fontWeight: '600' }, artistaFaixa: { color: Tema.textoSecundario, fontSize: 13, marginTop: 3 }, duracao: { color: Tema.textoSuave, fontSize: 13 },
    vazio: { color: Tema.textoSuave, textAlign: 'center', marginTop: 38, paddingHorizontal: 25 }, erro: { color: Tema.erro, textAlign: 'center', padding: 22 },
});
