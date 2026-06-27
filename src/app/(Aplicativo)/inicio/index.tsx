import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Tema from '../../../../constantes/Cores';
import { useAutenticacao } from '../../../contexto/ContextoAutenticacao';
import { usePlayer } from '../../../contexto/ContextoPlayer';

type ItemRecente = {
    id: string;
    titulo: string;
    artista: string;
    cor: string;
    icone?: keyof typeof Ionicons.glyphMap;
};

type ItemPlaylist = {
    id: string;
    titulo: string;
    descricao: string;
    cor: string;
};

const RECENTES: ItemRecente[] = [
    { id: '1', titulo: 'Flow Noturno', artista: 'Mix automático', cor: '#7C3AED' },
    { id: '2', titulo: 'Hits BR', artista: 'Top Brasil', cor: '#0891B2' },
    { id: '3', titulo: 'Chill Vibes', artista: 'Relax total', cor: '#DB2777' },
    { id: '4', titulo: 'SoundCloud Mix', artista: 'Sons exclusivos', cor: '#FF5500', icone: 'logo-soundcloud' },
];

const PLAYLISTS: ItemPlaylist[] = [
    { id: '1', titulo: 'Descobertas', descricao: 'Novos sons toda semana', cor: '#6366F1' },
    { id: '2', titulo: 'Para treinar', descricao: 'Energia alta', cor: '#F59E0B' },
    { id: '3', titulo: 'Acústico', descricao: 'Voz e violão', cor: '#14B8A6' },
];

function obterSaudacao(): string {
    const hora = new Date().getHours();
    if (hora < 12) return 'Bom dia';
    if (hora < 18) return 'Boa tarde';
    return 'Boa noite';
}

export default function TelaInicio() {
    const { usuario } = useAutenticacao();
    const { faixaAtual, estado, pausar, retomar } = usePlayer();
    const router = useRouter();

    const nome =
        usuario?.user_metadata?.full_name ||
        usuario?.user_metadata?.display_name ||
        usuario?.email?.split('@')[0] ||
        'ouvinte';

    const primeiroNome = String(nome).split(' ')[0];
    const filtros = ['Para você', 'Novidades', 'Relax', 'Treino'];

    return (
        <SafeAreaView style={estilos.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={estilos.rolagem}
            >
                <Text style={estilos.saudacao}>
                    {obterSaudacao()}, {primeiroNome}
                </Text>
                <Text style={estilos.subtitulo}>O que vamos ouvir hoje?</Text>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={estilos.filtros}
                >
                    {filtros.map((filtro, indice) => (
                        <TouchableOpacity
                            key={filtro}
                            style={[estilos.filtro, indice === 0 && estilos.filtroAtivo]}
                        >
                            <Text
                                style={[
                                    estilos.textoFiltro,
                                    indice === 0 && estilos.textoFiltroAtivo,
                                ]}
                            >
                                {filtro}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <Text style={estilos.secao}>Recentes</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={estilos.listaHorizontal}
                >
                    {RECENTES.map((item) => (
                        <TouchableOpacity key={item.id} style={estilos.cartaoRecente}>
                            <View style={[estilos.capaRecente, { backgroundColor: item.cor }]}>
                                <Ionicons name={item.icone || "musical-notes"} size={28} color={Tema.texto} />
                            </View>
                            <Text style={estilos.tituloRecente} numberOfLines={1}>
                                {item.titulo}
                            </Text>
                            <Text style={estilos.artistaRecente} numberOfLines={1}>
                                {item.artista}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <Text style={estilos.secao}>Playlists</Text>
                {PLAYLISTS.map((item) => (
                    <TouchableOpacity key={item.id} style={estilos.linhaPlaylist}>
                        <View style={[estilos.capaPlaylist, { backgroundColor: item.cor }]}>
                            <Ionicons name="albums" size={22} color={Tema.texto} />
                        </View>
                        <View style={estilos.infoPlaylist}>
                            <Text style={estilos.tituloPlaylist}>{item.titulo}</Text>
                            <Text style={estilos.descricaoPlaylist}>{item.descricao}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={Tema.textoSuave} />
                    </TouchableOpacity>
                ))}
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
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 24,
    },
    saudacao: {
        color: Tema.texto,
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    subtitulo: {
        color: Tema.textoSecundario,
        fontSize: 15,
        marginTop: 4,
        marginBottom: 20,
    },
    filtros: {
        gap: 8,
        paddingBottom: 24,
    },
    filtro: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: Tema.superficie,
        borderWidth: 1,
        borderColor: Tema.borda,
    },
    filtroAtivo: {
        backgroundColor: Tema.destaque,
        borderColor: Tema.destaque,
    },
    textoFiltro: {
        color: Tema.textoSecundario,
        fontSize: 13,
        fontWeight: '600',
    },
    textoFiltroAtivo: {
        color: Tema.texto,
    },
    secao: {
        color: Tema.texto,
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 14,
    },
    listaHorizontal: {
        gap: 12,
        paddingBottom: 28,
    },
    cartaoRecente: {
        width: 140,
    },
    capaRecente: {
        width: 140,
        height: 140,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    tituloRecente: {
        color: Tema.texto,
        fontSize: 14,
        fontWeight: '600',
    },
    artistaRecente: {
        color: Tema.textoSuave,
        fontSize: 12,
        marginTop: 2,
    },
    linhaPlaylist: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Tema.superficie,
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        gap: 12,
        borderWidth: 1,
        borderColor: Tema.borda,
    },
    capaPlaylist: {
        width: 48,
        height: 48,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoPlaylist: {
        flex: 1,
    },
    tituloPlaylist: {
        color: Tema.texto,
        fontSize: 15,
        fontWeight: '600',
    },
    descricaoPlaylist: {
        color: Tema.textoSuave,
        fontSize: 12,
        marginTop: 2,
    },
});
