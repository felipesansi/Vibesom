import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
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
import { useAutenticacao } from '../../../contexto/ContextoAutenticacao';
import { usePlayer } from '../../../contexto/ContextoPlayer';
import {
    buscarNovosLancamentos,
    formatarDataLancamento,
    Lancamento,
    Musica,
} from '../../../lib/apiMusica';

export default function TelaLancamentos() {
    const router = useRouter();
    const { usuario, sessao } = useAutenticacao();
    const { tocar, faixaAtual, estado, pausar, retomar } = usePlayer();
    const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            if (!usuario?.id || !sessao?.access_token) {
                setLancamentos([]);
                setCarregando(false);
                return;
            }

            let ativo = true;
            const controlador = new AbortController();
            setCarregando(true);
            setErro(null);

            (async () => {
                try {
                    const pagina = await buscarNovosLancamentos(sessao.access_token, 1, 20, controlador.signal);
                    if (ativo) setLancamentos(pagina.lancamentos);
                } catch (e: any) {
                    if (ativo && e?.name !== 'AbortError') {
                        setErro(e?.message || 'Falha ao carregar lançamentos.');
                    }
                } finally {
                    if (ativo) setCarregando(false);
                }
            })();

            return () => {
                ativo = false;
                controlador.abort();
            };
        }, [usuario?.id, sessao?.access_token])
    );

    const tocarLancamento = useCallback(async (lancamento: Lancamento) => {
        const musica: Musica = {
            id: lancamento.id,
            titulo: lancamento.titulo,
            artista: lancamento.artista,
            album: lancamento.album,
            capa: lancamento.capa ?? null,
            duracao: lancamento.duracao ?? 0,
            streamUrl: lancamento.streamUrl ?? '',
            source: lancamento.source,
        };

        const ehAtual = faixaAtual?.id === musica.id && faixaAtual?.source === musica.source;
        if (ehAtual) {
            if (estado === 'tocando') pausar();
            else retomar();
            return;
        }

        await tocar(musica, [musica]);
    }, [faixaAtual, estado, tocar, pausar, retomar]);

    const abrirArtista = useCallback((lancamento: Lancamento) => {
        router.push({
            pathname: '/artista/[nome]',
            params: {
                nome: encodeURIComponent(lancamento.artistaId ?? lancamento.artista),
                nomeArt: encodeURIComponent(lancamento.artista),
                source: lancamento.source,
            },
        } as any);
    }, [router]);

    const renderLancamento = useCallback(({ item }: { item: Lancamento }) => {
        const ehAtual = faixaAtual?.id === item.id && faixaAtual?.source === item.source;
        const tocando = ehAtual && estado === 'tocando';

        return (
            <TouchableOpacity
                style={[estilos.item, ehAtual && estilos.itemAtivo]}
                onPress={() => tocarLancamento(item)}
                activeOpacity={0.75}
            >
                {item.capa
                    ? <Image source={{ uri: item.capa }} style={estilos.capa} />
                    : <View style={[estilos.capa, estilos.capaVazia]}>
                        <Ionicons name="disc-outline" size={28} color={Tema.textoSuave} />
                    </View>
                }
                <View style={estilos.info}>
                    <Text style={[estilos.titulo, ehAtual && estilos.tituloAtivo]} numberOfLines={1}>{item.titulo}</Text>
                    <TouchableOpacity onPress={() => abrirArtista(item)}>
                        <Text style={estilos.artista} numberOfLines={1}>{item.artista}</Text>
                    </TouchableOpacity>
                    {item.dataLancamento && (
                        <Text style={estilos.data}>{formatarDataLancamento(item.dataLancamento)}</Text>
                    )}
                    {item.tipo && (
                        <Text style={estilos.tipo}>{item.tipo.toUpperCase()}</Text>
                    )}
                </View>
                <TouchableOpacity style={estilos.botaoPlay} onPress={() => tocarLancamento(item)}>
                    <Ionicons
                        name={tocando ? 'pause' : 'play'}
                        size={20}
                        color={ehAtual ? Tema.destaqueAlt : Tema.textoSuave}
                    />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    }, [faixaAtual, estado, tocarLancamento, abrirArtista]);

    const renderVazio = () => {
        if (carregando) return null;
        if (!usuario?.id) return (
            <View style={estilos.centro}>
                <Ionicons name="person-outline" size={52} color={Tema.textoSuave} style={{ marginBottom: 16 }} />
                <Text style={estilos.mensagem}>Faça login para ver novos lançamentos dos artistas que você segue.</Text>
            </View>
        );
        return (
            <View style={estilos.centro}>
                <Ionicons name="musical-notes-outline" size={52} color={Tema.textoSuave} style={{ marginBottom: 16 }} />
                <Text style={estilos.mensagem}>
                    Nenhum lançamento encontrado.{'\n'}Siga artistas para ver suas músicas aqui!
                </Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={estilos.container}>
            <View style={estilos.topo}>
                <TouchableOpacity onPress={() => router.back()} style={estilos.voltar}>
                    <Ionicons name="arrow-back" size={24} color={Tema.texto} />
                </TouchableOpacity>
                <View style={estilos.topoTexto}>
                    <Text style={estilos.titulo2}>Novos lançamentos</Text>
                    <Text style={estilos.subtitulo}>Artistas que você segue</Text>
                </View>
            </View>

            {carregando
                ? <View style={estilos.centro}><ActivityIndicator size="large" color={Tema.destaqueAlt} /></View>
                : erro
                    ? <View style={estilos.centro}><Text style={estilos.textoErro}>{erro}</Text></View>
                    : <FlatList
                        data={lancamentos}
                        renderItem={renderLancamento}
                        keyExtractor={item => `${item.source}-${item.id}`}
                        ListEmptyComponent={renderVazio}
                        contentContainerStyle={lancamentos.length === 0 ? estilos.listaVazia : estilos.lista}
                    />
            }
        </SafeAreaView>
    );
}

const estilos = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Tema.fundo,
    },
    topo: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 14,
        gap: 12,
    },
    voltar: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    topoTexto: {
        flex: 1,
    },
    titulo2: {
        color: Tema.texto,
        fontSize: 22,
        fontWeight: '800',
    },
    subtitulo: {
        color: Tema.textoSuave,
        fontSize: 13,
        marginTop: 2,
    },
    lista: {
        paddingHorizontal: 16,
        paddingBottom: 32,
        gap: 10,
    },
    listaVazia: {
        flex: 1,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Tema.superficie,
        borderRadius: 16,
        padding: 12,
        gap: 12,
        borderWidth: 1,
        borderColor: Tema.borda,
    },
    itemAtivo: {
        borderColor: Tema.destaqueAlt,
        backgroundColor: Tema.superficieClara,
    },
    capa: {
        width: 60,
        height: 60,
        borderRadius: 10,
        backgroundColor: Tema.superficieClara,
    },
    capaVazia: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    info: {
        flex: 1,
    },
    titulo: {
        color: Tema.texto,
        fontSize: 15,
        fontWeight: '700',
    },
    tituloAtivo: {
        color: Tema.destaqueAlt,
    },
    artista: {
        color: Tema.textoSuave,
        fontSize: 13,
        marginTop: 3,
    },
    data: {
        color: Tema.textoSuave,
        fontSize: 12,
        marginTop: 3,
    },
    tipo: {
        color: Tema.destaqueAlt,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.8,
        marginTop: 4,
    },
    botaoPlay: {
        width: 38,
        height: 38,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 19,
        backgroundColor: Tema.superficieClara,
    },
    centro: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    mensagem: {
        color: Tema.textoSuave,
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
    textoErro: {
        color: Tema.erro,
        textAlign: 'center',
    },
});
