import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Tema from '../../../../constantes/Cores';
import Entrada from '../../../componentes/Entrada';
import { supabase } from '../../../lib/supabase';

export default function RecuperarSenha() {
    const [email, setEmail] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const [enviado, setEnviado] = useState(false);
    const router = useRouter();

    const handleEnviar = async () => {
        setErro(null);

        if (!email.trim()) {
            setErro('Informe seu email.');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            setErro('Informe um email válido.');
            return;
        }

        setEnviando(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
            if (error) {
                setErro(error.message.includes('rate limit')
                    ? 'Muitas tentativas. Aguarde alguns minutos.'
                    : 'Não foi possível enviar o email. Tente novamente.');
            } else {
                setEnviado(true);
            }
        } finally {
            setEnviando(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={estilos.container}
        >
            <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={estilos.rolagem}
            >
                {/* Cabeçalho com imagem */}
                <View style={estilos.cabecalho}>
                    <Image
                        source={require('../../../../assets/images/fd-entrar.png')}
                        style={estilos.imagemCabecalho}
                    />
                    <View style={estilos.sobreposicaoCabecalho} />
                    <TouchableOpacity
                        style={estilos.botaoVoltar}
                        onPress={() => router.back()}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="arrow-back" size={22} color="#fff" />
                    </TouchableOpacity>
                    <View style={estilos.conteudoCabecalho}>
                        <View style={estilos.caixaIcone}>
                            <Ionicons name="lock-open-outline" size={26} color={Tema.texto} />
                        </View>
                        <Text style={estilos.marca}>Recuperar senha</Text>
                        <Text style={estilos.slogan}>Enviaremos um link para seu email.</Text>
                    </View>
                </View>

                {/* Folha de conteúdo */}
                <View style={estilos.folha}>
                    {enviado ? (
                        /* Estado de sucesso */
                        <View style={estilos.sucessoContainer}>
                            <View style={estilos.iconeSuccesso}>
                                <Ionicons name="checkmark-circle" size={56} color={Tema.destaque} />
                            </View>
                            <Text style={estilos.sucessoTitulo}>Email enviado!</Text>
                            <Text style={estilos.sucessoDesc}>
                                Verifique sua caixa de entrada em{'\n'}
                                <Text style={{ color: Tema.destaqueAlt, fontWeight: '700' }}>
                                    {email}
                                </Text>
                                {'\n'}e siga as instruções para redefinir sua senha.
                            </Text>
                            <TouchableOpacity
                                style={estilos.botao}
                                onPress={() => router.back()}
                                activeOpacity={0.85}
                            >
                                <Text style={estilos.textoBotao}>Voltar ao login</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={estilos.botaoReenviar}
                                onPress={() => { setEnviado(false); setEmail(''); }}
                                activeOpacity={0.7}
                            >
                                <Text style={estilos.textoReenviar}>Usar outro email</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        /* Formulário */
                        <>
                            <Text style={estilos.instrucao}>
                                Digite o email associado à sua conta e enviaremos um link para você criar uma nova senha.
                            </Text>

                            <Entrada
                                placeholder="Seu email"
                                valor={email}
                                aoAlterarTexto={(t) => { setEmail(t); setErro(null); }}
                                tipoTeclado="email-address"
                                icone="mail-outline"
                            />

                            {erro ? (
                                <View style={estilos.caixaErro}>
                                    <Ionicons name="alert-circle" size={16} color={Tema.erro} />
                                    <Text style={estilos.textoErro}>{erro}</Text>
                                </View>
                            ) : null}

                            <TouchableOpacity
                                style={[estilos.botao, enviando && estilos.botaoDesabilitado]}
                                onPress={handleEnviar}
                                disabled={enviando}
                                activeOpacity={0.85}
                            >
                                {enviando ? (
                                    <ActivityIndicator color={Tema.texto} size="small" />
                                ) : (
                                    <Text style={estilos.textoBotao}>Enviar link de recuperação</Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={estilos.linkVoltar}
                                onPress={() => router.back()}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="arrow-back" size={15} color={Tema.destaqueAlt} style={{ marginRight: 4 }} />
                                <Text style={estilos.textoLinkVoltar}>Voltar ao login</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const estilos = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Tema.fundo,
    },
    rolagem: {
        flexGrow: 1,
    },
    cabecalho: {
        width: '100%',
        height: 240,
        position: 'relative',
    },
    imagemCabecalho: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    sobreposicaoCabecalho: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(10, 10, 18, 0.55)',
    },
    botaoVoltar: {
        position: 'absolute',
        top: 52,
        left: 20,
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    conteudoCabecalho: {
        position: 'absolute',
        bottom: 28,
        left: 24,
    },
    caixaIcone: {
        width: 52,
        height: 52,
        borderRadius: 14,
        backgroundColor: Tema.destaque,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    marca: {
        color: Tema.texto,
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    slogan: {
        color: Tema.textoSecundario,
        fontSize: 14,
        marginTop: 4,
    },
    folha: {
        flex: 1,
        backgroundColor: Tema.superficie,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        marginTop: -24,
        paddingTop: 28,
        paddingBottom: 40,
    },
    instrucao: {
        color: Tema.textoSecundario,
        fontSize: 14,
        lineHeight: 21,
        marginHorizontal: 24,
        marginBottom: 20,
    },
    caixaErro: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginHorizontal: 24,
        marginBottom: 14,
        padding: 12,
        backgroundColor: 'rgba(251, 113, 133, 0.1)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(251, 113, 133, 0.25)',
    },
    textoErro: {
        color: Tema.erro,
        fontSize: 13,
        flex: 1,
    },
    botao: {
        marginHorizontal: 24,
        height: 52,
        borderRadius: 14,
        backgroundColor: Tema.destaque,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
    },
    botaoDesabilitado: {
        opacity: 0.7,
    },
    textoBotao: {
        color: Tema.texto,
        fontSize: 16,
        fontWeight: '700',
    },
    linkVoltar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
    },
    textoLinkVoltar: {
        color: Tema.destaqueAlt,
        fontSize: 14,
        fontWeight: '600',
    },
    // Estado de sucesso
    sucessoContainer: {
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 12,
    },
    iconeSuccesso: {
        marginBottom: 16,
    },
    sucessoTitulo: {
        color: Tema.texto,
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 12,
    },
    sucessoDesc: {
        color: Tema.textoSecundario,
        fontSize: 15,
        lineHeight: 23,
        textAlign: 'center',
        marginBottom: 32,
    },
    botaoReenviar: {
        paddingVertical: 16,
    },
    textoReenviar: {
        color: Tema.destaqueAlt,
        fontSize: 14,
        fontWeight: '600',
    },
});
