import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useAutenticacao } from '../../contexto/ContextoAutenticacao';
import { usePlayer } from '../../contexto/ContextoPlayer';
import { Platform, StyleSheet, View } from 'react-native';
import Tema from '../../../constantes/Cores';
import { MiniPlayer } from '../../componentes/MiniPlayer';

export default function LayoutAplicativo() {
    return (
        <View style={{ flex: 1, backgroundColor: Tema.fundo }}>
            <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: Tema.superficie,
                    borderTopColor: 'rgba(255, 255, 255, 0.05)',
                    borderTopWidth: 1,
                    height: Platform.OS === 'ios' ? 80 : 100,
                    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
                    paddingTop: 7,
                    elevation: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 12,
                    
                },
                tabBarShowLabel: false,
                tabBarActiveTintColor: '#FFFFFF',
                tabBarInactiveTintColor: Tema.textoSuave,
            }}
        >
            <Tabs.Screen
                name="inicio/index"
                options={{
                    title: 'Início',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={[estilos.iconeContainer, focused && estilos.iconeAtivo]}>
                            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="buscar/index"
                options={{
                    title: 'Buscar',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={[estilos.iconeContainer, focused && estilos.iconeAtivo]}>
                            <Ionicons name={focused ? "search" : "search-outline"} size={24} color={color} />
                        </View>
                    ),
                }}
            />

            <Tabs.Screen
                name="index"
                options={{
                    title: 'Configurações',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={[estilos.iconeContainer, focused && estilos.iconeAtivo]}>
                            <Ionicons name={focused ? "settings" : "settings-outline"} size={24} color={color} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="biblioteca/index"
                options={{
                    href: null,
                }}
            />
        </Tabs>
        <View style={estilos.miniPlayerWrapper}>
            <MiniPlayer />
        </View>
    </View>
    );
}

const estilos = StyleSheet.create({
    iconeContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    iconeAtivo: {
        backgroundColor: Tema.destaqueAlt,
        shadowColor: Tema.destaqueAlt,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
    },
    miniPlayerWrapper: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 84 : 104,
        left: 0,
        right: 0,
    }
});
