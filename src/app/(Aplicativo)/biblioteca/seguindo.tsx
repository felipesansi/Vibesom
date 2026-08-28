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
import { Artista, listarArtistasSeguidos } from '../../../lib/apiMusica';

export default function TelaArtistasSeguidos() {
    const router = useRouter();
    const { usuario, sessao } = useAutenticacao();
    const [artistas, setArtistas] = useState<Artista[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            if (!usuario?.id || !sessao?.access_token) {
                setArtistas([]);
                setCarregando(false);
                return;
            }

            let ativo = true;
            setCarregando(true);
            setErro(null);

            listarArtistasSeguidos(sessao.access_token)
                .then(lista => { if (ativo) setArtistas(lista); })
                .catch(e => { if (ativo) setErro(e?.message || 'Falha ao carregar artistas seguidos.'); })
                .finally(() => { if (ativo) setCarregando(false); });

            return () => { ativo = false; };
        }, [usuario?.id, sessao?.access_token])
    );

    const abrirArtista = useCallback((artista: Artista) => {
        router.push({
            pathname: '/artista/[nome]',
            params: {
                nome: encodeURIComponent(artista.id),
                nomeArt: encodeURIComponent(artista.nome),
                source: artista.source ?? 'MusicBrainz',
                capa: artista.capa ? encodeURIComponent(artista.capa) : '',
            },
        } as any);
    }, [router]);

    const renderArtista = useCallback(({ item }: { item: Artista }) => (
        <TouchableOpacity style={estilos.item} onPress={() => abrirArtista(item)} activeOpacity={0.75}>
            {item.capa
                ? <Image source={{ uri: item.capa }} style={estilos.avatar} />
                : <View style={[estilos.avatar, estilos.avatarVazio]}>
                    <Ionicons name="person" size={30} color={Tema.textoSuave} />
                </View>
            }
            <View style={estilos.info}>
                <Text style={estilos.nome} numberOfLines={1}>{item.nome}</Text>
                {(item.totalFaixas != null || item.totalAlbuns != null) && (
                    <Text style={estilos.meta} numberOfLines={1}>
                        {[
                            item.totalAlbuns != null && `${item.totalAlbuns} álbuns`,
                            item.totalFaixas != null && `${item.totalFaixas} faixas`,
                        ].filter(Boolean).join(' · ')}
                    </Text>
                )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={Tema.textoSuave} />
        </TouchableOpacity>
    ), [abrirArtista]);

    const renderVazio = () => {
        if (carregando) return null;
        if (!usuario?.id) return (
            <View style={estilos.centro}>
                <Ionicons name="person-outline" size={52} color={Tema.textoSuave} style={{ marginBottom: 16 }} />
                <Text style={estilos.mensagem}>Faça login para ver os artistas que você segue.</Text>
            </View>
        );
        return (
            <View style={estilos.centro}>
                <Ionicons name="musical-notes-outline" size={52} color={Tema.textoSuave} style={{ marginBottom: 16 }} />
                <Text style={estilos.mensagem}>Você ainda não segue nenhum artista.{'\n'}Explore e siga seus favoritos!</Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={estilos.container}>
            <View style={estilos.topo}>
                <TouchableOpacity onPress={() => router.back()} style={estilos.voltar}>
                    <Ionicons name="arrow-back" size={24} color={Tema.texto} />
                </TouchableOpacity>
                <Text style={estilos.titulo}>Artistas seguidos</Text>
            </View>

            {carregando
                ? <View style={estilos.centro}><ActivityIndicator size="large" color={Tema.destaqueAlt} /></View>
                : erro
                    ? <View style={estilos.centro}><Text style={estilos.textoErro}>{erro}</Text></View>
                    : <FlatList
                        data={artistas}
                        renderItem={renderArtista}
                        keyExtractor={item => `${item.source ?? 'mb'}-${item.id}`}
                        ListEmptyComponent={renderVazio}
                        contentContainerStyle={artistas.length === 0 ? estilos.listaVazia : estilos.lista}
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
    titulo: {
        color: Tema.texto,
        fontSize: 22,
        fontWeight: '800',
    },
    lista: {
        paddingHorizontal: 16,
        paddingBottom: 32,
        gap: 12,
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
        gap: 14,
        borderWidth: 1,
        borderColor: Tema.borda,
    },
    avatar: {
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: Tema.superficieClara,
    },
    avatarVazio: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    info: {
        flex: 1,
    },
    nome: {
        color: Tema.texto,
        fontSize: 16,
        fontWeight: '700',
    },
    meta: {
        color: Tema.textoSuave,
        fontSize: 13,
        marginTop: 4,
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
