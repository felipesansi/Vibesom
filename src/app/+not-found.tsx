import { Link, Stack } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import Tema from '../../constantes/Cores';

export default function RotaNaoEncontrada() {
    return (
        <>
            <Stack.Screen options={{ title: 'Página não encontrada' }} />
            <View style={estilos.container}>
                <Text style={estilos.titulo}>Rota não encontrada</Text>
                <Text style={estilos.texto}>Este endereço não existe no app.</Text>
                <Link href="/" style={estilos.link}>
                    Voltar ao início
                </Link>
            </View>
        </>
    );
}

const estilos = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        backgroundColor: Tema.fundo,
    },
    titulo: {
        color: Tema.texto,
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 8,
    },
    texto: {
        color: Tema.textoSecundario,
        fontSize: 15,
        marginBottom: 24,
        textAlign: 'center',
    },
    link: {
        color: Tema.destaqueAlt,
        fontSize: 16,
        fontWeight: '600',
    },
});
