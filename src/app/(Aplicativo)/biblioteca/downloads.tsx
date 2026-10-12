import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Tema from '../../../../constantes/Cores';
import { usePlayer } from '../../../contexto/ContextoPlayer';
import { listarMusicasBaixadas } from '../../services/DownloadMusica';
import { formatarDuracao, Musica } from '../../../lib/apiMusica';

export default function MusicasBaixadas() {
    const router = useRouter();
    const { faixaAtual, estado, tocar, pausar, retomar } = usePlayer();
    const [musicas, setMusicas] = useState<Musica[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            let ativo = true;
            setCarregando(true);
            setErro(null);

            listarMusicasBaixadas()
                .then(resultado => {
                    if (ativo) setMusicas(resultado);
                })
                .catch(e => {
                    if (ativo) setErro(e instanceof Error ? e.message : 'Não foi possível carregar os downloads.');
                })
                .finally(() => {
                    if (ativo) setCarregando(false);
                });

            return () => { ativo = false; };
        }, [])
    );

    const tocarMusica = useCallback(async (musica: Musica) => {
        const ehAtual = faixaAtual?.id === musica.id && faixaAtual?.source === musica.source;
        if (ehAtual) {
            if (estado === 'tocando') pausar();
            else retomar();
            return;
        }

        try {
            await tocar(musica, musicas);
        } catch (e) {
            Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível reproduzir esta música.');
        }
    }, [estado, faixaAtual, musicas, pausar, retomar, tocar]);

    const renderMusica = useCallback(({ item, index }: { item: Musica; index: number }) => {
        const ativa = faixaAtual?.id === item.id && faixaAtual?.source === item.source;
        const tocando = ativa && estado === 'tocando';
        const carregandoEsta = ativa && estado === 'carregando';

        return (
            <TouchableOpacity
                style={[estilos.musica, ativa && estilos.musicaAtiva]}
                onPress={() => tocarMusica(item)}
                activeOpacity={0.75}
            >
                <Text style={estilos.numero}>{index + 1}</Text>
                <View style={estilos.info}>
                    <Text style={[estilos.titulo, ativa && { color: Tema.destaqueAlt }]} numberOfLines={1}>{item.titulo}</Text>
                    <Text style={estilos.artista} numberOfLines={1}>{item.artista}</Text>
                </View>
                <Text style={estilos.duracao}>{formatarDuracao(item.duracao)}</Text>
                {carregandoEsta
                    ? <ActivityIndicator size="small" color={Tema.destaqueAlt} />
                    : <Ionicons name={tocando ? 'pause-circle' : 'play-circle-outline'} size={26} color={Tema.destaqueAlt} />}
            </TouchableOpacity>
        );
    }, [estado, faixaAtual, tocarMusica]);

    const cabecalho = (
        <View style={estilos.topo}>
            <TouchableOpacity onPress={() => router.back()} style={estilos.voltar} accessibilityLabel="Voltar">
                <Ionicons name="arrow-back" size={24} color={Tema.texto} />
            </TouchableOpacity>
            <View>
                <Text style={estilos.tituloCabecalho}>Músicas baixadas</Text>
                <Text style={estilos.subtitulo}>{musicas.length} faixas disponíveis offline</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={estilos.container}>
            {carregando ? (
                <View style={estilos.centro}><ActivityIndicator size="large" color={Tema.destaqueAlt} /></View>
            ) : erro ? (
                <View style={estilos.centro}><Text style={estilos.erro}>{erro}</Text></View>
            ) : (
                <FlatList
                    data={musicas}
                    renderItem={renderMusica}
                    keyExtractor={item => `${item.source}-${item.id}`}
                    ListHeaderComponent={cabecalho}
                    ListEmptyComponent={<Text style={estilos.vazio}>As músicas baixadas aparecerão aqui para você ouvir offline.</Text>}
                    contentContainerStyle={estilos.lista}
                />
            )}
        </SafeAreaView>
    );
}

const estilos = StyleSheet.create({
    container: { flex: 1, backgroundColor: Tema.fundo },
    lista: { paddingBottom: 32 },
    centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    topo: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
    voltar: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    tituloCabecalho: { color: Tema.texto, fontSize: 23, fontWeight: '800' },
    subtitulo: { color: Tema.textoSuave, fontSize: 13, marginTop: 3 },
    musica: { minHeight: 68, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 16, marginBottom: 8, borderRadius: 16, backgroundColor: Tema.superficie, borderWidth: 1, borderColor: Tema.borda, gap: 12 },
    musicaAtiva: { borderColor: Tema.destaqueAlt, backgroundColor: Tema.superficieClara },
    numero: { width: 22, color: Tema.textoSuave, textAlign: 'right', fontVariant: ['tabular-nums'] },
    info: { flex: 1 },
    titulo: { color: Tema.texto, fontSize: 15, fontWeight: '700' },
    artista: { color: Tema.textoSuave, fontSize: 13, marginTop: 3 },
    duracao: { color: Tema.textoSuave, fontSize: 13 },
    vazio: { color: Tema.textoSuave, textAlign: 'center', marginTop: 45, paddingHorizontal: 30 },
    erro: { color: Tema.erro, textAlign: 'center', padding: 24 },
});
