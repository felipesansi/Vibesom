import { Redirect } from 'expo-router';
import { useAutenticacao } from '../contexto/ContextoAutenticacao';
import { ActivityIndicator, View } from 'react-native';
import Tema from '../../constantes/Cores';

export default function Indice() {
    const { sessao, carregando } = useAutenticacao();

    if (carregando) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: Tema.fundo,
                }}
            >
                <ActivityIndicator size="large" color={Tema.destaque} />
            </View>
        );
    }

    if (sessao) {
        return <Redirect href="/(Aplicativo)/inicio" />;
    }

    return <Redirect href="/(Autenticacao)/entrar" />;
}
