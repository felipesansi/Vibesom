import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import Tema from '../../../../constantes/Cores';
import Entrada from '../../../componentes/Entrada';
import { supabase } from '../../../lib/supabase';

export default function Senha() {
    const [email, setEmail] = useState('');
    const [enviando, setEnviando] = useState(false);

    const handleEnviar = async () => {
        setEnviando(true);
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) Alert.alert('Erro', error.message);
        else Alert.alert('Sucesso', 'Verifique seu email para o link de redefinição de senha.');
        setEnviando(false);
    };

    return (
        <View>
            <View style={estilos.container}>
                <Text style={estilos.titulo}>Alterar Senha</Text>
                <Entrada placeholder='Email' valor={email} aoAlterarTexto={setEmail} />
                <TouchableOpacity
                    style={estilos.botao}
                    onPress={handleEnviar}
                    disabled={enviando}
                >
                    {enviando ? (
                        <ActivityIndicator color={Tema.texto} />
                    ) : (
                        <Text style={estilos.textoBotao}>Enviar</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const estilos = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 24, gap: 16, backgroundColor: Tema.superficie },
    titulo: { fontSize: 28, fontWeight: 'bold', color: Tema.texto, textAlign: 'center', marginBottom: 16 },
    botao: { height: 52, borderRadius: 14, backgroundColor: Tema.destaque, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
    botaoDesabilitado: { opacity: 0.7 },
    textoBotao: { color: Tema.texto, fontSize: 16, fontWeight: '700' },
}); 
