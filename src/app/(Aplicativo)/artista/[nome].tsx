import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Tema from '../../../../constantes/Cores';
import { usePlayer } from "../../../contexto/ContextoPlayer";
import { Musica, formatarDuracao, pesquisarMusicasPorArtista, buscarMusicasMB } from '../../../lib/apiMusica';

const CORES_PLATAFORMA: Record<string, string> = {
    soundcloud: '#FF5500',
    youtube: '#FF0000',
    audius: '#CC0000',
    jamendo: '#00A6A6',
    archive: '#7B4F9E',
};

function corDaPlataforma(source: string): string {
    return CORES_PLATAFORMA[source.toLowerCase()] ?? Tema.destaqueAlt;
}

export default function TelaArtista() {
    const router = useRouter();
    const params = useLocalSearchParams<{ nome: string, nomeArt?: string, source?: string }>();
    const paramId = decodeURIComponent(params.nome ?? '');
    const nomeExibicao = params.nomeArt ? decodeURIComponent(params.nomeArt) : paramId;
    const isMusicBrainz = params.source === 'MusicBrainz';

    const [musicas, setMusicas] = useState<Musica[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);

    const { faixaAtual, estado, tocar, pausar, retomar } = usePlayer();

    useEffect(() => {
        if (!paramId) {
            setErro('ID ou nome do artista não fornecido.');
            setCarregando(false);
            return;
        }

        const controlador = new AbortController();

        (async () => {
            setCarregando(true);
            setErro(null);
            try {
                let resultados;
                if (isMusicBrainz) {
                    resultados = await buscarMusicasMB(paramId, controlador.signal);
                } else {
                    resultados = await pesquisarMusicasPorArtista(paramId, controlador.signal);
                }
                setMusicas(resultados);
            } catch (e) {
                if (e instanceof Error && e.name !== 'AbortError') {
                    setErro(e.message || 'Falha ao carregar as músicas do artista.');
                }
            } finally {
                setCarregando(false);
            }
        })();

        return () => controlador.abort();
    }, [paramId, isMusicBrainz]);

    const aoTocar = useCallback(async (item: Musica) => {
        const ehAtual = faixaAtual?.id === item.id && faixaAtual?.source === item.source;
        if (ehAtual) {
            if (estado === 'tocando') pausar();
            else retomar();
        } else {
            await tocar(item, musicas);
        }
    }, [faixaAtual, estado, tocar, pausar, retomar, musicas]);

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
                    <Text style={estilos.tituloMusica} numberOfLines={1}>{item.titulo}</Text>
                    <Text style={estilos.artistaMusica} numberOfLines={1}>{item.artista}</Text>
                    <View style={estilos.rodapeMusica}>
                        <View style={[estilos.badgePlataforma, { backgroundColor: corDaPlataforma(item.source) + '33' }]}>
                            <Text style={[estilos.textoBadge, { color: corDaPlataforma(item.source) }]}>
                                {item.source.toUpperCase()}
                            </Text>
                        </View>
                        {item.duracao > 0 && (
                            <Text style={estilos.duracaoMusica}>{formatarDuracao(item.duracao)}</Text>
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
            <TouchableOpacity onPress={() => router.back()} style={estilos.botaoVoltar}>
                <Ionicons name="arrow-back" size={24} color={Tema.texto} />
            </TouchableOpacity>
            <Text style={estilos.titulo} numberOfLines={1}>{nomeExibicao}</Text>
        </View>
    );

    return (
        <SafeAreaView style={estilos.container}>
            {carregando ? (
                <View style={estilos.centro}>
                    <ActivityIndicator size="large" color={Tema.destaque} />
                </View>
            ) : erro ? (
                <View style={estilos.centro}>
                    <Text style={estilos.textoErro}>{erro}</Text>
                </View>
            ) : (
                <FlatList
                    data={musicas}
                    keyExtractor={(item) => `${item.source}-${item.id}`}
                    renderItem={renderItem}
                    ListHeaderComponent={cabecalho}
                    contentContainerStyle={estilos.rolagem}
                    ListEmptyComponent={
                        <Text style={estilos.vazio}>Nenhuma música encontrada para este artista.</Text>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const estilos = StyleSheet.create({
    container: { flex: 1, backgroundColor: Tema.fundo },
    rolagem: { paddingHorizontal: 16, paddingBottom: 32 },
    cabecalho: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 16 },
    botaoVoltar: { padding: 4 },
    titulo: { color: Tema.texto, fontSize: 24, fontWeight: '800', flex: 1 },
    centro: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    textoErro: { color: Tema.erro, fontSize: 16, textAlign: 'center' },
    vazio: { color: Tema.textoSuave, fontSize: 15, textAlign: 'center', marginTop: 40 },
    linhaMusica: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 8, marginBottom: 4, gap: 12 },
    linhaMusicaAtiva: { backgroundColor: Tema.superficie },
    capa: { width: 48, height: 48, borderRadius: 4, backgroundColor: Tema.superficieClara },
    capaPlaceholder: { alignItems: 'center', justifyContent: 'center' },
    infoMusica: { flex: 1, justifyContent: 'center' },
    tituloMusica: { color: Tema.texto, fontSize: 16, fontWeight: '500' },
    artistaMusica: {
        color: Tema.textoSecundario,
        fontSize: 14,
        marginTop: 4,
    },
    rodapeMusica: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
    badgePlataforma: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    textoBadge: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
    duracaoMusica: { color: Tema.textoSuave, fontSize: 12 },
    iconePlay: { width: 40, alignItems: 'center' },
});