import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Entrada from '../../../componentes/Entrada';
import Tema from '../../../../constantes/Cores';
import { useAutenticacao } from '../../../contexto/ContextoAutenticacao';

type Modo = 'entrada' | 'cadastro';

export default function TelaEntrar() {
    const [email, setEmail] = useState('');
    const [nome, setNome] = useState('');
    const [senha, setSenha] = useState('');
    const [confirmarSenha, setConfirmarSenha] = useState('');
    const [modo, setModo] = useState<Modo>('entrada');
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    const opacidadeAnim = useRef(new Animated.Value(1)).current;

    const { entrar, cadastrar } = useAutenticacao();
    const roteador = useRouter();

    const alternarModo = (novoModo: Modo) => {
        Animated.timing(opacidadeAnim, {
            toValue: 0,
            duration: 120,
            useNativeDriver: true,
        }).start(() => {
            setErro(null);
            setNome('');
            setSenha('');
            setConfirmarSenha('');
            setModo(novoModo);
            Animated.timing(opacidadeAnim, {
                toValue: 1,
                duration: 160,
                useNativeDriver: true,
            }).start();
        });
    };

    const enviarFormulario = async () => {
        setErro(null);

        if (!email || !senha) {
            setErro('Preencha todos os campos.');
            return;
        }

        if (modo === 'cadastro') {
            if (!nome.trim()) {
                setErro('Informe seu nome.');
                return;
            }
            if (senha !== confirmarSenha) {
                setErro('As senhas não coincidem.');
                return;
            }
            if (senha.length < 6) {
                setErro('A senha deve ter ao menos 6 caracteres.');
                return;
            }
        }

        setEnviando(true);
        try {
            if (modo === 'entrada') {
                const { erro: erroAuth } = await entrar(email, senha);
                if (erroAuth) {
                    setErro(mapearErro(erroAuth));
                } else {
                    roteador.replace('/(Aplicativo)/inicio');
                }
            } else {
                const { erro: erroAuth } = await cadastrar(email, senha, nome.trim());
                if (erroAuth) {
                    setErro(mapearErro(erroAuth));
                } else {
                    Alert.alert(
                        'Conta criada',
                        'Verifique seu email para confirmar o cadastro e depois faça login.',
                        [{ text: 'OK', onPress: () => alternarModo('entrada') }]
                    );
                }
            }
        } finally {
            setEnviando(false);
        }
    };

    const mapearErro = (mensagem: string): string => {
        if (mensagem.includes('Invalid login credentials')) return 'Email ou senha incorretos.';
        if (mensagem.includes('Email not confirmed')) return 'Confirme seu email antes de entrar.';
        if (mensagem.includes('already registered')) return 'Este email já está cadastrado.';
        if (mensagem.includes('rate limit')) return 'Muitas tentativas. Tente novamente em breve.';
        return mensagem;
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
                <View style={estilos.cabecalho}>
                    <Image
                        source={require('../../../../assets/images/fd-entrar.png')}
                        style={estilos.imagemCabecalho}
                    />
                    <View style={estilos.sobreposicaoCabecalho} />
                    <View style={estilos.conteudoCabecalho}>
                        <View style={estilos.caixaLogo}>
                            <Ionicons name="musical-notes" size={28} color={Tema.texto} />
                        </View>
                        <Text style={estilos.marca}>Vibesom</Text>
                        <Text style={estilos.slogan}>Música no seu ritmo.</Text>
                    </View>
                </View>

                <View style={estilos.folha}>
                    <View style={estilos.abas}>
                        <TouchableOpacity
                            style={[estilos.aba, modo === 'entrada' && estilos.abaAtiva]}
                            onPress={() => modo !== 'entrada' && alternarModo('entrada')}
                        >
                            <Text
                                style={[
                                    estilos.textoAba,
                                    modo === 'entrada' && estilos.textoAbaAtiva,
                                ]}
                            >
                                Entrar
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[estilos.aba, modo === 'cadastro' && estilos.abaAtiva]}
                            onPress={() => modo !== 'cadastro' && alternarModo('cadastro')}
                        >
                            <Text
                                style={[
                                    estilos.textoAba,
                                    modo === 'cadastro' && estilos.textoAbaAtiva,
                                ]}
                            >
                                Cadastrar
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <Animated.View style={{ opacity: opacidadeAnim }}>
                        {modo === 'cadastro' && (
                            <Entrada
                                placeholder="Seu nome"
                                valor={nome}
                                aoAlterarTexto={setNome}
                                icone="person-outline"
                                capitalizacao="words"
                            />
                        )}

                        <Entrada
                            placeholder="Email"
                            valor={email}
                            aoAlterarTexto={setEmail}
                            tipoTeclado="email-address"
                            icone="mail-outline"
                        />

                        <Entrada
                            placeholder="Senha"
                            valor={senha}
                            aoAlterarTexto={setSenha}
                            entradaSecreta
                            icone="lock-closed-outline"
                        />

                        {modo === 'cadastro' && (
                            <Entrada
                                placeholder="Confirmar senha"
                                valor={confirmarSenha}
                                aoAlterarTexto={setConfirmarSenha}
                                entradaSecreta
                                icone="shield-checkmark-outline"
                            />
                        )}

                        {erro ? (
                            <View style={estilos.caixaErro}>
                                <Ionicons name="alert-circle" size={16} color={Tema.erro} />
                                <Text style={estilos.textoErro}>{erro}</Text>
                            </View>
                        ) : null}

                        <TouchableOpacity
                            style={[estilos.botao, enviando && estilos.botaoDesabilitado]}
                            onPress={enviarFormulario}
                            disabled={enviando}
                            activeOpacity={0.85}
                        >
                            {enviando ? (
                                <ActivityIndicator color={Tema.texto} size="small" />
                            ) : (
                                <Text style={estilos.textoBotao}>
                                    {modo === 'entrada' ? 'Continuar' : 'Criar conta'}
                                </Text>
                            )}
                        </TouchableOpacity>

                        {modo === 'entrada' && (
                            <TouchableOpacity style={estilos.esqueciSenha}>
                                <Text style={estilos.textoEsqueciSenha}>Esqueceu a senha?</Text>
                            </TouchableOpacity>
                        )}
                    </Animated.View>
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
        height: 260,
        position: 'relative',
    },
    imagemCabecalho: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    sobreposicaoCabecalho: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(10, 10, 18, 0.5)',
    },
    conteudoCabecalho: {
        position: 'absolute',
        bottom: 28,
        left: 24,
    },
    caixaLogo: {
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
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    slogan: {
        color: Tema.textoSecundario,
        fontSize: 15,
        marginTop: 4,
    },
    folha: {
        flex: 1,
        backgroundColor: Tema.superficie,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        marginTop: -24,
        paddingTop: 24,
        paddingBottom: 40,
    },
    abas: {
        flexDirection: 'row',
        marginHorizontal: 24,
        backgroundColor: Tema.superficieClara,
        borderRadius: 14,
        padding: 4,
        marginBottom: 16,
    },
    aba: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
    },
    abaAtiva: {
        backgroundColor: Tema.destaque,
    },
    textoAba: {
        color: Tema.textoSuave,
        fontSize: 14,
        fontWeight: '600',
    },
    textoAbaAtiva: {
        color: Tema.texto,
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
    esqueciSenha: {
        alignItems: 'center',
        paddingVertical: 18,
    },
    textoEsqueciSenha: {
        color: Tema.destaqueAlt,
        fontSize: 14,
        fontWeight: '600',
    },
});
