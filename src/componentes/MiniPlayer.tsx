import { Ionicons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Tema from '../../constantes/Cores';
import { usePlayer } from '../contexto/ContextoPlayer';

export function MiniPlayer() {
    const { faixaAtual, estado, pausar, retomar, proxima, anterior } = usePlayer();
    const router = useRouter();
    const segmentos = useSegments();
    const ultimoClique = React.useRef(0);

    if (!faixaAtual || (segmentos as string[])?.includes('biblioteca')) return null;

    const tocando = estado === 'tocando';

    const alternarReproducao = () => {
        if (tocando) {
            pausar();
        } else {
            retomar();
        }
    };

    const aoClicar = () => {
        const agora = Date.now();
        if (agora - ultimoClique.current < 400) {
            router.push('/(Aplicativo)/biblioteca' as any);
            ultimoClique.current = 0;
        } else {
            ultimoClique.current = agora;
        }
    };

    return (
        <View style={estilos.container}>
            <TouchableOpacity 
                style={estilos.infoContainer} 
                activeOpacity={0.8} 
                onPress={aoClicar}
            >
                {faixaAtual.capa ? (
                    <Image source={{ uri: faixaAtual.capa }} style={estilos.capa} />
                ) : (
                    <View style={[estilos.capa, estilos.capaPlaceholder]}>
                        <Ionicons name="musical-notes" size={24} color={Tema.textoSuave} />
                    </View>
                )}

                <View style={estilos.textos}>
                    <Text style={estilos.titulo} numberOfLines={1}>{faixaAtual.titulo}</Text>
                    <Text style={estilos.artista} numberOfLines={1}>{faixaAtual.artista}</Text>
                </View>
            </TouchableOpacity>

            <View style={estilos.controles}>
                <TouchableOpacity onPress={anterior} style={estilos.botao}>
                    <Ionicons name="play-skip-back" size={24} color={Tema.texto} />
                </TouchableOpacity>

                <TouchableOpacity onPress={alternarReproducao} style={[estilos.botao, estilos.botaoPlay]}>
                    <Ionicons name={tocando ? "pause" : "play"} size={24} color={Tema.fundo} />
                </TouchableOpacity>

                <TouchableOpacity onPress={proxima} style={estilos.botao}>
                    <Ionicons name="play-skip-forward" size={24} color={Tema.texto} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const estilos = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Tema.superficieClara,
        padding: 10,
        borderRadius: 16,
        marginHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
    },
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    capa: {
        width: 48,
        height: 48,
        borderRadius: 8,
    },
    capaPlaceholder: {
        backgroundColor: Tema.superficie,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textos: {
        marginLeft: 12,
        flex: 1,
        marginRight: 8,
    },
    titulo: {
        color: Tema.texto,
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    artista: {
        color: Tema.textoSecundario,
        fontSize: 12,
    },
    controles: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 10,
    },
    botao: {
        padding: 8,
    },
    botaoPlay: {
        backgroundColor: Tema.texto,
        borderRadius: 24,
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 6,
        padding: 0,
    }
});
