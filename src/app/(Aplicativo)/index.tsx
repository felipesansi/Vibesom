import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Tema from '../../../constantes/Cores';
import { useAutenticacao } from '../../contexto/ContextoAutenticacao';
import { usePlayer } from '../../contexto/ContextoPlayer';

export default function TelaConfiguracoes() {
    const { usuario, sair } = useAutenticacao();
    const { parar } = usePlayer();
    const router = useRouter();

    const handleSair = () => {
        Alert.alert(
            'Encerrar Sessão',
            'Tem certeza que deseja encerrar sua sessão?',
            [
                { text: 'Cancelar', style: 'cancel' },
                { 
                    text: 'Sair', 
                    style: 'destructive',
                    onPress: async () => {
                        parar(); // Para o áudio antes de deslogar
                        await sair();
                        router.replace('/(Autenticacao)/entrar');
                    }
                },
            ]
        );
    };

    return (
        <SafeAreaView style={estilos.container}>
            <ScrollView contentContainerStyle={estilos.rolagem} showsVerticalScrollIndicator={false}>
                <View style={estilos.cabecalho}>
                    <Text style={estilos.titulo}>Configurações</Text>
                </View>

                <View style={estilos.secao}>
                    <Text style={estilos.subtitulo}>Sua Conta</Text>
                    <View style={estilos.cartaoPerfil}>
                        <View style={estilos.avatar}>
                            <Ionicons name="person" size={32} color={Tema.texto} />
                        </View>
                        <View style={estilos.infoPerfil}>
                            <Text style={estilos.nomeUsuario}>
                                {usuario?.user_metadata?.full_name || 'Usuário'}
                            </Text>
                            <Text style={estilos.emailUsuario}>{usuario?.email}</Text>
                        </View>
                    </View>
                </View>

                <View style={estilos.secao}>
                    <Text style={estilos.subtitulo}>Conta</Text>
                    <TouchableOpacity style={estilos.itemMenu} onPress={handleSair}>
                        <View style={[estilos.iconeContainerMenu, { backgroundColor: Tema.erro + '22' }]}>
                            <Ionicons name="log-out-outline" size={22} color={Tema.erro} />
                        </View>
                        <Text style={[estilos.textoMenu, { color: Tema.erro }]}>Encerrar sessão</Text>
                        <Ionicons name="chevron-forward" size={20} color={Tema.textoSuave} />
                    </TouchableOpacity>
                </View>
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
        paddingBottom: 40,
    },
    cabecalho: {
        paddingHorizontal: 24,
        paddingTop: 20,
        marginBottom: 30,
    },
    titulo: {
        fontSize: 28,
        fontWeight: '800',
        color: Tema.texto,
    },
    secao: {
        marginBottom: 30,
        paddingHorizontal: 24,
    },
    subtitulo: {
        fontSize: 12,
        fontWeight: '700',
        color: Tema.textoSuave,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 12,
        marginLeft: 4,
    },
    cartaoPerfil: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Tema.superficie,
        padding: 16,
        borderRadius: 20,
        gap: 16,
        borderWidth: 1,
        borderColor: Tema.borda,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Tema.destaque,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoPerfil: {
        flex: 1,
    },
    nomeUsuario: {
        fontSize: 18,
        fontWeight: '700',
        color: Tema.texto,
    },
    emailUsuario: {
        fontSize: 14,
        color: Tema.textoSecundario,
    },
    itemMenu: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Tema.superficie,
        padding: 12,
        borderRadius: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: Tema.borda,
    },
    iconeContainerMenu: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textoMenu: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
    },
});