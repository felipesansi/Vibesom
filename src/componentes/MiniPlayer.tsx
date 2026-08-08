import { Ionicons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
    ActivityIndicator,
    Animated,
    Image,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Tema from '../../constantes/Cores';
import { usePlayer } from '../contexto/ContextoPlayer';
import { useBluetooth } from './useBluetooth';

export function MiniPlayer() {
    const { faixaAtual, estado, pausar, retomar, proxima, anterior, posicao, duracao } = usePlayer();
    const { abrirConfiguracoesBluetooth, connectedDevice } = useBluetooth();
    const router = useRouter();
    const segmentos = useSegments();

    // Animações
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const barraAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    const tocando = estado === 'tocando';
    const carregando = estado === 'carregando';

    // Barra de progresso animada
    useEffect(() => {
        const progresso = duracao > 0 ? posicao / duracao : 0;
        Animated.timing(barraAnim, {
            toValue: progresso,
            duration: 500,
            useNativeDriver: false,
        }).start();
    }, [posicao, duracao]);

    // Pulsação do ícone de onda quando tocando
    useEffect(() => {
        let loop: Animated.CompositeAnimation;
        if (tocando) {
            loop = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
                ])
            );
            loop.start();
        } else {
            pulseAnim.setValue(1);
        }
        return () => loop?.stop();
    }, [tocando]);

    if ((segmentos as string[])?.includes('biblioteca')) return null;
    if (!faixaAtual) return null;

    const alternarReproducao = () => {
        if (carregando) return;
        if (tocando) pausar();
        else retomar();
    };

    const pressIn = () =>
        Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, tension: 200 }).start();
    const pressOut = () =>
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 200 }).start();

    return (
        <Animated.View style={[estilos.wrapper, { transform: [{ scale: scaleAnim }] }]}>
            {/* Barra de progresso — parte superior */}
            <View style={estilos.barraFundo}>
                <Animated.View
                    style={[
                        estilos.barraProgresso,
                        {
                            width: barraAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0%', '100%'],
                            }),
                        },
                    ]}
                />
            </View>

            <View style={estilos.container}>
                {/* Capa */}
                <TouchableOpacity
                    activeOpacity={0.85}
                    onPressIn={pressIn}
                    onPressOut={pressOut}
                    onPress={() => router.push('/biblioteca' as any)}
                    style={estilos.capaWrapper}
                >
                    {faixaAtual.capa ? (
                        <Image source={{ uri: faixaAtual.capa }} style={estilos.capa} />
                    ) : (
                        <View style={[estilos.capa, estilos.capaPlaceholder]}>
                            <Ionicons name="musical-notes" size={20} color={Tema.textoSuave} />
                        </View>
                    )}
                </TouchableOpacity>

                {/* Título + artista */}
                <TouchableOpacity
                    style={estilos.textos}
                    activeOpacity={0.7}
                    onPress={() => router.push('/biblioteca' as any)}
                >
                    <Text style={estilos.titulo} numberOfLines={1}>
                        {faixaAtual.titulo}
                    </Text>
                    <View style={estilos.artistaRow}>
                        {tocando && (
                            <Animated.View style={{ transform: [{ scale: pulseAnim }], marginRight: 4 }}>
                                <Ionicons name="stats-chart" size={11} color={Tema.destaque} />
                            </Animated.View>
                        )}
                        <Text style={estilos.artista} numberOfLines={1}>
                            {faixaAtual.artista}
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* Controles */}
                <View style={estilos.controles}>
                    <TouchableOpacity
                        onPress={abrirConfiguracoesBluetooth}
                        style={estilos.botaoSecundario}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="bluetooth" size={18} color={connectedDevice ? Tema.destaqueAlt : Tema.textoSuave} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={anterior}
                        style={estilos.botaoSecundario}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="play-skip-back" size={20} color={Tema.textoSuave} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={alternarReproducao}
                        style={estilos.botaoPlay}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        activeOpacity={0.75}
                    >
                        {carregando ? (
                            <ActivityIndicator size="small" color="#000" />
                        ) : (
                            <Ionicons
                                name={tocando ? 'pause' : 'play'}
                                size={20}
                                color="#000"
                                style={tocando ? {} : { marginLeft: 2 }}
                            />
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={proxima}
                        style={estilos.botaoSecundario}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="play-skip-forward" size={20} color={Tema.textoSuave} />
                    </TouchableOpacity>
                </View>
            </View>
        </Animated.View>
    );
}

const estilos = StyleSheet.create({
    wrapper: {
        marginHorizontal: 10,
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: '#1A1A2E',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.45,
                shadowRadius: 16,
            },
            android: {
                elevation: 12,
            },
        }),
    },
    barraFundo: {
        height: 2,
        backgroundColor: 'rgba(255,255,255,0.08)',
        width: '100%',
    },
    barraProgresso: {
        height: 2,
        backgroundColor: Tema.destaque,
        borderRadius: 1,
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 10,
        gap: 10,
    },
    capaWrapper: {
        borderRadius: 8,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 8,
            },
            android: { elevation: 6 },
        }),
    },
    capa: {
        width: 44,
        height: 44,
        borderRadius: 8,
    },
    capaPlaceholder: {
        backgroundColor: '#2A2A3E',
        alignItems: 'center',
        justifyContent: 'center',
    },
    textos: {
        flex: 1,
        justifyContent: 'center',
        gap: 3,
    },
    titulo: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.1,
    },
    artistaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    artista: {
        color: 'rgba(255,255,255,0.55)',
        fontSize: 12,
        fontWeight: '500',
        flex: 1,
    },
    controles: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    botaoSecundario: {
        padding: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    botaoPlay: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
