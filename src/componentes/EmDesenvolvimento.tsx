import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import Tema from '../../constantes/Cores';

type Props = {
    titulo?: string;
};

export function EmDesenvolvimento({ titulo = 'Em desenvolvimento' }: Props) {
    return (
        <>
            <Stack.Screen options={{ title: titulo }} />
            <SafeAreaView style={estilos.container}>
                <View style={estilos.card}>
                    <Ionicons name="construct" size={56} color={Tema.destaqueAlt} />
                    <Text style={estilos.titulo}>{titulo}</Text>
                    <Text style={estilos.subtitulo}>
                        Esta página está em desenvolvimento e será liberada em breve.
                    </Text>
                </View>
            </SafeAreaView>
        </>
    );
}

const estilos = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Tema.fundo,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    card: {
        width: '100%',
        maxWidth: 420,
        alignItems: 'center',
        backgroundColor: Tema.superficie,
        borderRadius: 24,
        padding: 30,
        borderWidth: 1,
        borderColor: Tema.borda,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 8,
    },
    titulo: {
        color: Tema.texto,
        fontSize: 22,
        fontWeight: '800',
        textAlign: 'center',
        marginTop: 18,
    },
    subtitulo: {
        color: Tema.textoSecundario,
        fontSize: 15,
        textAlign: 'center',
        marginTop: 12,
        lineHeight: 22,
    },
});
