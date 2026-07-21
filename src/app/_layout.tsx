import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { ProvedorAutenticacao } from '../contexto/ContextoAutenticacao';
import { ProvedorPlayer } from '../contexto/ContextoPlayer';

export default function LayoutRaiz() {
    useEffect(() => {
        if (Platform.OS === 'android') {
            // Esconde os botões virtuais (Voltar, Home, Recentes) do Android
            NavigationBar.setVisibilityAsync("hidden");
            // Define comportamento imersivo: ao deslizar, aparece temporariamente e some
            NavigationBar.setBehaviorAsync("overlay-swipe");
        }
    }, []);
    return (
        <ProvedorAutenticacao>
            <ProvedorPlayer>
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="index" />
                    <Stack.Screen name="(Autenticacao)" />
                    <Stack.Screen name="(Aplicativo)" />
                </Stack>
            </ProvedorPlayer>
        </ProvedorAutenticacao>
    );
}
