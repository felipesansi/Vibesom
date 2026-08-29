import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Linking,
    Modal,
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
import { obterOpcaoAcessoSoundCloud } from '../../lib/apiMusica';

export default function TelaConfiguracoes() {
    const { usuario, sair } = useAutenticacao();
    const { parar } = usePlayer();
    const router = useRouter();
    const [modalSair, setModalSair] = useState(false);
    const [saindo, setSaindo] = useState(false);

    const confirmarSair = async () => {
        setSaindo(true);
        try {
            parar();
            await sair();
            setModalSair(false);
            router.replace('/(Autenticacao)/entrar');
        } catch {
            setSaindo(false);
            setModalSair(false);
        }
    };

    const nomeExibido = usuario?.user_metadata?.full_name
        || usuario?.user_metadata?.display_name
        || 'Usuário';
    const iniciais = nomeExibido
        .split(' ')
        .slice(0, 2)
        .map((p: string) => p[0]?.toUpperCase() ?? '')
        .join('');

    return (
        <SafeAreaView style={estilos.container}>
            <ScrollView contentContainerStyle={estilos.rolagem} showsVerticalScrollIndicator={false}>

                {/* Cabeçalho */}
                <View style={estilos.cabecalho}>
                    <Text style={estilos.titulo}>Configurações</Text>
                </View>

                {/* Perfil */}
                <View style={estilos.secao}>
                    <Text style={estilos.subtitulo}>Sua Conta</Text>
                    <View style={estilos.cartaoPerfil}>
                        <View style={estilos.avatar}>
                            <Text style={estilos.iniciaisAvatar}>{iniciais || '?'}</Text>
                        </View>
                        <View style={estilos.infoPerfil}>
                            <Text style={estilos.nomeUsuario} numberOfLines={1}>{nomeExibido}</Text>
                            <Text style={estilos.emailUsuario} numberOfLines={1}>{usuario?.email}</Text>
                        </View>
                        <View style={[estilos.badgeAtivo]}>
                            <Text style={estilos.textoBadgeAtivo}>Ativo</Text>
                        </View>
                    </View>
                </View>

                {/* Conta */}
                <View style={estilos.secao}>
                    <Text style={estilos.subtitulo}>Conta</Text>
                    <View style={estilos.grupo}>
                        <TouchableOpacity
                            style={estilos.itemMenu}
                            onPress={() => router.push('/(Autenticacao)/senha')}
                            activeOpacity={0.7}
                        >
                            <View style={[estilos.iconeContainer, { backgroundColor: '#6366F1' + '22' }]}>
                                <Ionicons name="lock-closed-outline" size={20} color="#6366F1" />
                            </View>
                            <View style={estilos.itemTexto}>
                                <Text style={estilos.textoMenu}>Alterar senha</Text>
                                <Text style={estilos.textoMenuDesc}>Enviar link de redefinição por email</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={Tema.textoSuave} />
                        </TouchableOpacity>

                        <View style={estilos.divisor} />

                        <TouchableOpacity
                            style={estilos.itemMenu}
                            onPress={() => setModalSair(true)}
                            activeOpacity={0.7}
                        >
                            <View style={[estilos.iconeContainer, { backgroundColor: Tema.erro + '22' }]}>
                                <Ionicons name="log-out-outline" size={20} color={Tema.erro} />
                            </View>
                            <View style={estilos.itemTexto}>
                                <Text style={[estilos.textoMenu, { color: Tema.erro }]}>Encerrar sessão</Text>
                                <Text style={estilos.textoMenuDesc}>Sair da sua conta no dispositivo</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={Tema.textoSuave} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* SoundCloud & Fontes de Áudio */}
                <View style={estilos.secao}>
                    <Text style={estilos.subtitulo}>SoundCloud & Fontes de Áudio</Text>
                    <View style={estilos.grupo}>
                        <View style={estilos.itemMenu}>
                            <View style={[estilos.iconeContainer, { backgroundColor: '#FF550022' }]}>
                                <Ionicons name="logo-soundcloud" size={20} color="#FF5500" />
                            </View>
                            <View style={estilos.itemTexto}>
                                <Text style={estilos.textoMenu}>Conta SoundCloud</Text>
                                <Text style={estilos.textoMenuDesc}>
                                    {usuario?.email ? `Vinculada a ${usuario.email}` : 'Disponível no app'}
                                </Text>
                            </View>
                            <View style={estilos.badgeAtivo}>
                                <Text style={estilos.textoBadgeAtivo}>Integrada</Text>
                            </View>
                        </View>

                        <View style={estilos.divisor} />

                        <TouchableOpacity
                            style={estilos.itemMenu}
                            onPress={async () => {
                                try {
                                    const opcao = await obterOpcaoAcessoSoundCloud().catch(() => null);
                                    const url = opcao?.criarContaUrl || 'https://soundcloud.com/signup';
                                    await Linking.openURL(url);
                                } catch {}
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={[estilos.iconeContainer, { backgroundColor: '#FF550018' }]}>
                                <Ionicons name="open-outline" size={20} color="#FF5500" />
                            </View>
                            <View style={estilos.itemTexto}>
                                <Text style={estilos.textoMenu}>Acessar SoundCloud Oficial</Text>
                                <Text style={estilos.textoMenuDesc}>Gerenciar perfil e playlists no SoundCloud</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={Tema.textoSuave} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Versão */}
                <Text style={estilos.versao}>Vibesom • v1.0.0</Text>
            </ScrollView>

            {/* Modal de confirmação de logout */}
            <Modal
                visible={modalSair}
                transparent
                animationType="fade"
                onRequestClose={() => !saindo && setModalSair(false)}
            >
                <TouchableOpacity
                    style={estilos.overlay}
                    activeOpacity={1}
                    onPress={() => !saindo && setModalSair(false)}
                >
                    <View style={estilos.modalContainer}>
                        <View style={estilos.modalIcone}>
                            <Ionicons name="log-out-outline" size={32} color={Tema.erro} />
                        </View>

                        <Text style={estilos.modalTitulo}>Encerrar sessão?</Text>
                        <Text style={estilos.modalDesc}>
                            Você será desconectado da sua conta neste dispositivo.
                        </Text>

                        <TouchableOpacity
                            style={estilos.botaoSair}
                            onPress={confirmarSair}
                            disabled={saindo}
                            activeOpacity={0.85}
                        >
                            {saindo ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={estilos.textoBotaoSair}>Encerrar sessão</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={estilos.botaoCancelar}
                            onPress={() => setModalSair(false)}
                            disabled={saindo}
                            activeOpacity={0.7}
                        >
                            <Text style={estilos.textoBotaoCancelar}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
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
        marginBottom: 28,
    },
    titulo: {
        fontSize: 28,
        fontWeight: '800',
        color: Tema.texto,
    },
    secao: {
        marginBottom: 28,
        paddingHorizontal: 24,
    },
    subtitulo: {
        fontSize: 11,
        fontWeight: '700',
        color: Tema.textoSuave,
        textTransform: 'uppercase',
        letterSpacing: 1.4,
        marginBottom: 12,
        marginLeft: 4,
    },
    cartaoPerfil: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Tema.superficie,
        padding: 16,
        borderRadius: 20,
        gap: 14,
        borderWidth: 1,
        borderColor: Tema.borda,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Tema.destaque,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iniciaisAvatar: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '800',
    },
    infoPerfil: {
        flex: 1,
    },
    nomeUsuario: {
        fontSize: 17,
        fontWeight: '700',
        color: Tema.texto,
    },
    emailUsuario: {
        fontSize: 13,
        color: Tema.textoSecundario,
        marginTop: 2,
    },
    badgeAtivo: {
        backgroundColor: '#22C55E22',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    textoBadgeAtivo: {
        color: '#22C55E',
        fontSize: 12,
        fontWeight: '700',
    },
    grupo: {
        backgroundColor: Tema.superficie,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Tema.borda,
        overflow: 'hidden',
    },
    itemMenu: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        gap: 12,
    },
    iconeContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    itemTexto: {
        flex: 1,
    },
    textoMenu: {
        fontSize: 15,
        fontWeight: '600',
        color: Tema.texto,
    },
    textoMenuDesc: {
        fontSize: 12,
        color: Tema.textoSuave,
        marginTop: 2,
    },
    divisor: {
        height: 1,
        backgroundColor: Tema.borda,
        marginLeft: 66,
    },
    versao: {
        textAlign: 'center',
        color: Tema.textoSuave,
        fontSize: 12,
        marginTop: 8,
    },
    // Modal
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContainer: {
        backgroundColor: Tema.superficie,
        borderRadius: 24,
        padding: 28,
        width: '100%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Tema.borda,
    },
    modalIcone: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Tema.erro + '18',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    modalTitulo: {
        fontSize: 20,
        fontWeight: '800',
        color: Tema.texto,
        marginBottom: 8,
        textAlign: 'center',
    },
    modalDesc: {
        fontSize: 14,
        color: Tema.textoSecundario,
        textAlign: 'center',
        lineHeight: 21,
        marginBottom: 28,
    },
    botaoSair: {
        width: '100%',
        height: 50,
        borderRadius: 14,
        backgroundColor: Tema.erro,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    textoBotaoSair: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    botaoCancelar: {
        width: '100%',
        height: 50,
        borderRadius: 14,
        backgroundColor: Tema.superficieClara,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textoBotaoCancelar: {
        color: Tema.texto,
        fontSize: 16,
        fontWeight: '600',
    },
});