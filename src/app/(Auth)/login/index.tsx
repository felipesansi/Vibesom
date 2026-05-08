import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import colors from '../../../../constants/Colors';
import Input from '../../../conponents/Input';

export default function Login() {
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState(''); 
    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
        <View style={styles.header}>
            <Image source={require('../../../../assets/images/fd-entrar.png')} style={styles.foto} />
            <View style={styles.forms_login}>
                <Text style={styles.label}> Vibesom sua vibe aqui </Text>
                <Input
                    placeholder="Seu email"
                    label=""
                    value={email}
                    onChangeText={setEmail}
                />
                <Input
                    placeholder="Sua senha"
                    label=""
                    value={senha}
                    onChangeText={setSenha}
                    secureTextEntry
                />
            </View>
        </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
        backgroundColor: colors.forms,
    },
    foto: {
        width: "100%",
        height: "40%",
        resizeMode: 'cover',
    },
    forms_login: {
        flex: 2,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 32,
        backgroundColor: '#1a1a1a',
        width: "100%",
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
    },
    label: {
        color: colors.input_text,
        fontSize: 32,
        marginBottom: 40,
    },
});
