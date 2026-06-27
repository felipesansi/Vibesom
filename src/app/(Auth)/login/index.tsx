import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Tema from '../../../../constantes/Cores';
import { useAutenticacao } from '../../../contexto/ContextoAutenticacao';

type Mode = 'login' | 'signup';

export default function Login() {
    const [nome, setNome] = useState('');
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [confirmarSenha, setConfirmarSenha] = useState('');
    const [mode, setMode] = useState<Mode>('login');
    const [loading, setLoading] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    const { entrar, cadastrar } = useAutenticacao();
    const router = useRouter();

    const isLogin = mode === 'login';

    const handleSubmeter = async () => {
        setErro(null);
        if (!email.trim() || !senha.trim()) {
            setErro('Preencha os campos obrigatórios.');
            return;
        }

        if (!isLogin) {
            if (!nome.trim()) {
                setErro('Preencha o seu nome.');
                return;
            }
            if (senha !== confirmarSenha) {
                setErro('As senhas não coincidem.');
                return;
            }
        }

        setLoading(true);
        try {
            if (isLogin) {
                const res = await entrar(email.trim(), senha);
                if (res.erro) {
                    setErro(res.erro);
                } else {
                    router.replace('/(Aplicativo)/inicio' as any);
                }
            } else {
                const res = await cadastrar(email.trim(), senha, nome.trim());
                if (res.erro) {
                    setErro(res.erro);
                } else {
                    router.replace('/(Aplicativo)/inicio' as any);
                }
            }
        } catch (e) {
            setErro('Ocorreu um erro inesperado.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={estilos.container}>
            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerStyle={estilos.rolagem} showsVerticalScrollIndicator={false}>
                    <View style={estilos.cabecalho}>
                        <View style={estilos.logoIcone}>
                            <Ionicons name="musical-notes" size={48} color={Tema.texto} />
                        </View>
                        <Text style={estilos.tituloLogo}>Vibesom</Text>
                        <Text style={estilos.subtitulo}>
                            {isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta e ouça sem limites.'}
                        </Text>
                    </View>

                    <View style={estilos.formulario}>
                        {erro && (
                            <View style={estilos.caixaErro}>
                                <Ionicons name="alert-circle" size={20} color={Tema.erro} />
                                <Text style={estilos.textoErro}>{erro}</Text>
                            </View>
                        )}

                        {!isLogin && (
                            <View style={estilos.campo}>
                                <Text style={estilos.label}>Nome completo</Text>
                                <TextInput
                                    style={estilos.input}
                                    placeholder="Digite seu nome"
                                    placeholderTextColor={Tema.textoSuave}
                                    value={nome}
                                    onChangeText={setNome}
                                />
                            </View>
                        )}

                        <View style={estilos.campo}>
                            <Text style={estilos.label}>E-mail</Text>
                            <TextInput
                                style={estilos.input}
                                placeholder="seu@email.com"
                                placeholderTextColor={Tema.textoSuave}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>

                        <View style={estilos.campo}>
                            <Text style={estilos.label}>Senha</Text>
                            <TextInput
                                style={estilos.input}
                                placeholder="Sua senha secreta"
                                placeholderTextColor={Tema.textoSuave}
                                value={senha}
                                onChangeText={setSenha}
                                secureTextEntry
                            />
                        </View>

                        {!isLogin && (
                            <View style={estilos.campo}>
                                <Text style={estilos.label}>Confirmar senha</Text>
                                <TextInput
                                    style={estilos.input}
                                    placeholder="Repita sua senha"
                                    placeholderTextColor={Tema.textoSuave}
                                    value={confirmarSenha}
                                    onChangeText={setConfirmarSenha}
                                    secureTextEntry
                                />
                            </View>
                        )}

                        <TouchableOpacity 
                            style={[estilos.botaoPrimario, loading && estilos.botaoDesativado]}
                            onPress={handleSubmeter}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={estilos.textoBotaoPrimario}>
                                    {isLogin ? 'Entrar' : 'Cadastrar'}
                                </Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={estilos.botaoSecundario}
                            onPress={() => {
                                setErro(null);
                                setMode(isLogin ? 'signup' : 'login');
                            }}
                            disabled={loading}
                        >
                            <Text style={estilos.textoBotaoSecundario}>
                                {isLogin ? 'Não tem uma conta? Crie agora' : 'Já tem conta? Faça login'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const estilos = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Tema.fundo,
    },
    rolagem: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 40,
        justifyContent: 'center',
    },
    cabecalho: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoIcone: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: Tema.destaque,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        transform: [{ rotate: '-5deg' }],
    },
    tituloLogo: {
        fontSize: 32,
        fontWeight: '900',
        color: Tema.texto,
        letterSpacing: -1,
        marginBottom: 8,
    },
    subtitulo: {
        fontSize: 16,
        color: Tema.textoSecundario,
        textAlign: 'center',
        maxWidth: '80%',
    },
    formulario: {
        gap: 16,
    },
    caixaErro: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Tema.erro + '22',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Tema.erro + '55',
        gap: 8,
        marginBottom: 8,
    },
    textoErro: {
        flex: 1,
        color: Tema.erro,
        fontSize: 14,
        fontWeight: '500',
    },
    campo: {
        gap: 6,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: Tema.texto,
        marginLeft: 4,
    },
    input: {
        backgroundColor: Tema.superficie,
        borderWidth: 1,
        borderColor: Tema.borda,
        borderRadius: 14,
        paddingHorizontal: 16,
        height: 54,
        color: Tema.texto,
        fontSize: 16,
    },
    botaoPrimario: {
        backgroundColor: Tema.destaqueAlt,
        height: 56,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        shadowColor: Tema.destaqueAlt,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    botaoDesativado: {
        opacity: 0.7,
    },
    textoBotaoPrimario: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    botaoSecundario: {
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textoBotaoSecundario: {
        color: Tema.textoSecundario,
        fontSize: 14,
        fontWeight: '600',
    },
});
