import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Tema from '../../../../constantes/Cores';
import { useAutenticacao } from '../../../contexto/ContextoAutenticacao';
import { usePlayer } from '../../../contexto/ContextoPlayer';
import { formatarDuracao, Musica } from '../../../lib/apiMusica';
import {
    buscarMusicasDaPlaylist,
    buscarPlaylistFavoritasDoUsuario,
    removerMusicaFavorita,
} from '../../../lib/supabase';

export default function TelaBiblioteca() {
    const router = useRouter();
    const { usuario } = useAutenticacao();
    const { tocar } = usePlayer();
    const [musicas, setMusicas] = useState<Musica[]>([]);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    useEffect(() => {
        if (!usuario?.id) {
            setMusicas([]);
            return;
        }

        let ativo = true;
        setCarregando(true);
        setErro(null);

        (async () => {
            try {
                const playlistId = await buscarPlaylistFavoritasDoUsuario(usuario.id);
                if (!ativo) return;
                if (!playlistId) {
                    setMusicas([]);
                    return;
                }

                const musicasFavoritas = await buscarMusicasDaPlaylist(playlistId);
                if (!ativo) return;
                setMusicas(musicasFavoritas);
            } catch (e) {
                console.warn('[Biblioteca] erro ao carregar músicas favoritas:', e);
                if (ativo) setErro('Não foi possível carregar suas músicas favoritas.');
            } finally {
                if (ativo) setCarregando(false);
            }
        })();

        return () => {
            ativo = false;
        };
    }, [usuario?.id]);

    const tocarPlaylist = useCallback(async () => {
        if (musicas.length > 0) {
            await tocar(musicas[0], musicas);
        }
    }, [musicas, tocar]);

    const tocarMusica = useCallback(async (musica: Musica) => {
        await tocar(musica, musicas);
    }, [musicas, tocar]);

    const removerFavorita = useCallback(async (musica: Musica) => {
        if (!usuario?.id) return;

        setErro(null);
        const { erro } = await removerMusicaFavorita(usuario.id, musica);
        if (erro) {
            setErro(erro);
            return;
        }

        setMusicas((prev) => prev.filter((item) => item.source !== musica.source || item.id !== musica.id));
    }, [usuario?.id]);

    const abrirBuscar = useCallback(() => {
        router.push('/buscar');
    }, [router]);

    if (!usuario) {
        return (
            <SafeAreaView style={estilos.container}>
                <View style={estilos.cardVazio}>
                    <Ionicons name="heart-outline" size={48} color={Tema.textoSuave} />
                    <Text style={estilos.tituloVazio}>Faça login para ver suas favoritas</Text>
                    <TouchableOpacity style={estilos.botaoVazio} onPress={abrirBuscar}>
                        <Text style={estilos.textoBotaoVazio}>Buscar músicas</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={estilos.container}>
            <ScrollView contentContainerStyle={estilos.rolagem} showsVerticalScrollIndicator={false}>
                <Text style={estilos.titulo}>Sua Biblioteca</Text>
                <Text style={estilos.subtitulo}>Favoritas</Text>

                {carregando ? (
                    <View style={estilos.cardVazio}>
                        <ActivityIndicator size="large" color={Tema.destaque} />
                    </View>
                ) : erro ? (
                    <View style={estilos.cardVazio}>
                        <Text style={estilos.textoErro}>{erro}</Text>
                    </View>
                ) : musicas.length === 0 ? (
                    <View style={estilos.cardVazio}>
                        <Ionicons name="heart" size={48} color={Tema.textoSuave} />
                        <Text style={estilos.tituloVazio}>Sem músicas favoritas ainda</Text>
                        <TouchableOpacity style={estilos.botaoVazio} onPress={abrirBuscar}>
                            <Text style={estilos.textoBotaoVazio}>Buscar músicas</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <TouchableOpacity style={estilos.botaoTocarTudo} onPress={tocarPlaylist}>
                            <Text style={estilos.textoBotaoTocarTudo}>Tocar todas</Text>
                        </TouchableOpacity>
                        {musicas.map((musica) => (
                            <View key={`${musica.source}-${musica.id}`} style={estilos.itemMusica}>
                                <TouchableOpacity style={estilos.infoMusica} onPress={() => tocarMusica(musica)}>
                                    <Text style={estilos.tituloMusica} numberOfLines={1}>{musica.titulo}</Text>
                                    <Text style={estilos.artistaMusica} numberOfLines={1}>{musica.artista}</Text>
                                </TouchableOpacity>
                                <View style={estilos.actionsMusica}>
                                    <Text style={estilos.duracaoMusica}>{formatarDuracao(musica.duracao)}</Text>
                                    <TouchableOpacity style={estilos.botaoRemover} onPress={() => removerFavorita(musica)}>
                                        <Ionicons name="trash-outline" size={20} color={Tema.textoSuave} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const estilos = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Tema.fundo,
    },
    rolagem: {
        padding: 20,
        paddingBottom: 32,
    },
    titulo: {
        color: Tema.texto,
        fontSize: 28,
        fontWeight: '800',
        marginBottom: 10,
    },
    subtitulo: {
        color: Tema.textoSuave,
        fontSize: 16,
        marginBottom: 18,
    },
    cardVazio: {
        flex: 1,
        minHeight: 240,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingTop: 40,
    },
    tituloVazio: {
        color: Tema.texto,
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
    },
    botaoVazio: {
        marginTop: 14,
        backgroundColor: Tema.destaque,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 999,
    },
    textoBotaoVazio: {
        color: Tema.fundo,
        fontWeight: '700',
    },
    textoErro: {
        color: Tema.erro,
        fontSize: 15,
        textAlign: 'center',
    },
    botaoTocarTudo: {
        backgroundColor: Tema.destaque,
        borderRadius: 16,
        paddingVertical: 14,
        alignItems: 'center',
        marginBottom: 20,
    },
    textoBotaoTocarTudo: {
        color: Tema.fundo,
        fontWeight: '700',
    },
    itemMusica: {
        backgroundColor: Tema.superficie,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Tema.borda,
    },
    infoMusica: {
        marginBottom: 12,
    },
    tituloMusica: {
        color: Tema.texto,
        fontSize: 16,
        fontWeight: '700',
    },
    artistaMusica: {
        color: Tema.textoSuave,
        fontSize: 14,
        marginTop: 4,
    },
    actionsMusica: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    duracaoMusica: {
        color: Tema.textoSuave,
        fontSize: 13,
    },
    botaoRemover: {
        padding: 8,
    },
});

