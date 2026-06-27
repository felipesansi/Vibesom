import { Stack } from 'expo-router';
import { ProvedorAutenticacao } from '../contexto/ContextoAutenticacao';
import { ProvedorPlayer } from '../contexto/ContextoPlayer';

export default function LayoutRaiz() {
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
