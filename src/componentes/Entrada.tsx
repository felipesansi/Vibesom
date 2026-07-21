import React, { useState } from 'react';
import {
    TextInput,
    Text,
    View,
    StyleSheet,
    KeyboardTypeOptions,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Tema from '../../constantes/Cores';

type PropsEntrada = {
    placeholder: string;
    rotulo?: string;
    valor: string;
    aoAlterarTexto: (texto: string) => void;
    entradaSecreta?: boolean;
    tipoTeclado?: KeyboardTypeOptions;
    icone?: keyof typeof Ionicons.glyphMap;
    capitalizacao?: 'none' | 'sentences' | 'words' | 'characters';
};

export default function Entrada({
    placeholder,
    rotulo,
    valor,
    aoAlterarTexto,
    entradaSecreta = false,
    tipoTeclado = 'default',
    icone,
    capitalizacao = 'none',
}: PropsEntrada) {
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [focado, setFocado] = useState(false);
    const ehSenha = entradaSecreta;

    return (
        <View style={estilos.container}>
            {rotulo ? <Text style={estilos.rotulo}>{rotulo}</Text> : null}
            <View style={[estilos.campo, focado && estilos.campoFocado]}>
                {icone && (
                    <Ionicons
                        name={icone}
                        size={18}
                        color={focado ? Tema.destaque : Tema.textoSuave}
                        style={estilos.icone}
                    />
                )}
                <TextInput
                    style={estilos.input}
                    placeholder={placeholder}
                    placeholderTextColor={Tema.textoSuave}
                    value={valor}
                    onChangeText={aoAlterarTexto}
                    secureTextEntry={ehSenha && !mostrarSenha}
                    keyboardType={tipoTeclado}
                    autoCapitalize={capitalizacao}
                    autoCorrect={false}
                    onFocus={() => setFocado(true)}
                    onBlur={() => setFocado(false)}
                />
                {ehSenha && (
                    <TouchableOpacity
                        onPress={() => setMostrarSenha(!mostrarSenha)}
                        style={estilos.botaoOlho}
                    >
                        <Ionicons
                            name={mostrarSenha ? 'eye-off-outline' : 'eye-outline'}
                            size={18}
                            color={Tema.textoSuave}
                        />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const estilos = StyleSheet.create({
    container: {
        width: '100%',
        paddingHorizontal: 24,
        marginBottom: 14,
    },
    rotulo: {
        color: Tema.textoSecundario,
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 8,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
    },
    campo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Tema.superficieClara,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Tema.borda,
        paddingHorizontal: 14,
        height: 52,
    },
    campoFocado: {
        borderColor: Tema.destaque,
        backgroundColor: Tema.superficie,
    },
    icone: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        color: Tema.texto,
        fontSize: 15,
    },
    botaoOlho: {
        paddingLeft: 8,
    },
});
