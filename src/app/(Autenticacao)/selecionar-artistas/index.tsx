import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Tema from '../../../../constantes/Cores';
import { useAutenticacao } from '../../../contexto/ContextoAutenticacao';
import { Artista, buscarArtistasMB, seguirArtistaNaApi } from '../../../lib/apiMusica';

const chaveArtista = (artista: Artista) => `${artista.source}:${artista.id}`;

export default function TelaSelecionarArtistas() {
    const router = useRouter();
    const { sessao } = useAutenticacao();
    const [busca, setBusca] = useState('');
    const [resultados, setResultados] = useState<Artista[]>([]);
    const [selecionados, setSelecionados] = useState<Record<string, Artista>>({});
    const [buscando, setBuscando] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    const artistasSelecionados = useMemo(() => Object.values(selecionados), [selecionados]);

    const pesquisar = useCallback(async () => {
        const termo = busca.trim();
        if (!termo) {
            setResultados([]);
            setErro('Digite o nome de um artista para pesquisar.');
            return;
        }

        setBuscando(true);
        setErro(null);
        try {
            const artistas = await buscarArtistasMB(termo);
            setResultados(artistas);
            if (!artistas.length) setErro('Nenhum artista encontrado. Tente outro nome.');
        } catch (e) {
            setResultados([]);
            setErro(e instanceof Error ? e.message : 'Não foi possível buscar artistas.');
        } finally {
            setBuscando(false);
        }
    }, [busca]);

    const alternarSelecao = useCallback((artista: Artista) => {
        const chave = chaveArtista(artista);
        setSelecionados(atual => {
            if (atual[chave]) {
                const { [chave]: _, ...restante } = atual;
                return restante;
            }
            return { ...atual, [chave]: artista };
        });
    }, []);

    const concluir = useCallback(async () => {
        if (!sessao?.access_token) {
            Alert.alert('Sessão expirada', 'Entre novamente para escolher artistas.');
            router.replace('/(Autenticacao)/entrar');
            return;
        }

        if (!artistasSelecionados.length) {
            router.replace('/(Aplicativo)/inicio');
            return;
        }

        setSalvando(true);
        const falhas: string[] = [];

        for (const artista of artistasSelecionados) {
            try {
                const seguido = await seguirArtistaNaApi(artista, sessao.access_token);
                if (!seguido) falhas.push(artista.nome);
            } catch {
                falhas.push(artista.nome);
            }
        }

        setSalvando(false);
        if (falhas.length) {
            Alert.alert(
                'Alguns artistas não foram salvos',
                `Não foi possível seguir: ${falhas.join(', ')}. Tente novamente.`
            );
            return;
        }

        router.replace('/(Aplicativo)/inicio');
    }, [artistasSelecionados, router, sessao?.access_token]);

    const renderArtista = useCallback(({ item }: { item: Artista }) => {
        const marcado = Boolean(selecionados[chaveArtista(item)]);
        return (
            <TouchableOpacity
                style={[estilos.artista, marcado && estilos.artistaSelecionado]}
                onPress={() => alternarSelecao(item)}
                activeOpacity={0.78}
            >
                {item.capa ? (
                    <Image source={{ uri: item.capa }} style={estilos.avatar} />
                ) : (
                    <View style={[estilos.avatar, estilos.avatarVazio]}>
                        <Ionicons name="person" size={26} color={Tema.textoSuave} />
                    </View>
                )}
                <View style={estilos.infoArtista}>
                    <Text style={estilos.nomeArtista} numberOfLines={1}>{item.nome}</Text>
                    <Text style={estilos.origem} numberOfLines={1}>{item.source}</Text>
                </View>
                <View style={[estilos.marcador, marcado && estilos.marcadorSelecionado]}>
                    {marcado && <Ionicons name="checkmark" size={18} color={Tema.texto} />}
                </View>
            </TouchableOpacity>
        );
    }, [alternarSelecao, selecionados]);

    return (
        <SafeAreaView style={estilos.container} edges={['top', 'left', 'right']}>
            <KeyboardAvoidingView style={estilos.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <FlatList
                    data={resultados}
                    renderItem={renderArtista}
                    keyExtractor={chaveArtista}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={estilos.lista}
                    ListHeaderComponent={
                        <>
                            <View style={estilos.iconeTopo}>
                                <Ionicons name="people" size={29} color={Tema.texto} />
                            </View>
                            <Text style={estilos.titulo}>Siga seus artistas</Text>
                            <Text style={estilos.subtitulo}>
                                Escolha quem você quer acompanhar para receber novos lançamentos na sua biblioteca.
                            </Text>

                            <View style={estilos.campoBusca}>
                                <Ionicons name="search" size={20} color={Tema.textoSuave} />
                                <TextInput
                                    value={busca}
                                    onChangeText={setBusca}
                                    onSubmitEditing={pesquisar}
                                    placeholder="Busque por um artista"
                                    placeholderTextColor={Tema.textoSuave}
                                    returnKeyType="search"
                                    style={estilos.input}
                                />
                                {buscando && <ActivityIndicator size="small" color={Tema.destaqueAlt} />}
                            </View>
                            <TouchableOpacity style={estilos.botaoBuscar} onPress={pesquisar} disabled={buscando}>
                                <Text style={estilos.textoBotaoBuscar}>Buscar artistas</Text>
                            </TouchableOpacity>

                            {artistasSelecionados.length > 0 && (
                                <Text style={estilos.contagem}>
                                    {artistasSelecionados.length} {artistasSelecionados.length === 1 ? 'artista selecionado' : 'artistas selecionados'}
                                </Text>
                            )}
                            {!!erro && <Text style={estilos.erro}>{erro}</Text>}
                        </>
                    }
                    ListEmptyComponent={!buscando && !erro ? (
                        <View style={estilos.vazio}>
                            <Ionicons name="musical-notes-outline" size={42} color={Tema.textoSuave} />
                            <Text style={estilos.textoVazio}>Pesquise seus artistas favoritos para começar.</Text>
                        </View>
                    ) : null}
                />

                <View style={estilos.rodape}>
                    <TouchableOpacity
                        style={[estilos.botaoContinuar, salvando && estilos.botaoDesabilitado]}
                        onPress={concluir}
                        disabled={salvando}
                    >
                        {salvando ? <ActivityIndicator color={Tema.texto} /> : (
                            <Text style={estilos.textoContinuar}>
                                {artistasSelecionados.length ? 'Seguir e continuar' : 'Pular por enquanto'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const estilos = StyleSheet.create({
    container: { flex: 1, backgroundColor: Tema.fundo },
    lista: { flexGrow: 1, padding: 24, paddingBottom: 126, gap: 10 },
    iconeTopo: { width: 58, height: 58, borderRadius: 18, backgroundColor: Tema.destaque, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
    titulo: { color: Tema.texto, fontSize: 28, fontWeight: '900' },
    subtitulo: { color: Tema.textoSecundario, fontSize: 15, lineHeight: 22, marginTop: 9, marginBottom: 24 },
    campoBusca: { height: 52, borderRadius: 14, backgroundColor: Tema.superficie, borderColor: Tema.borda, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, gap: 10 },
    input: { flex: 1, color: Tema.texto, fontSize: 15, height: '100%' },
    botaoBuscar: { height: 44, marginTop: 10, marginBottom: 20, borderRadius: 12, backgroundColor: Tema.superficieClara, alignItems: 'center', justifyContent: 'center' },
    textoBotaoBuscar: { color: Tema.destaqueAlt, fontSize: 14, fontWeight: '800' },
    contagem: { color: Tema.destaqueAlt, fontSize: 14, fontWeight: '700', marginBottom: 12 },
    erro: { color: Tema.erro, fontSize: 14, marginBottom: 12 },
    artista: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 11, borderRadius: 16, backgroundColor: Tema.superficie, borderWidth: 1, borderColor: Tema.borda },
    artistaSelecionado: { borderColor: Tema.destaqueAlt, backgroundColor: '#1A2A42' },
    avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: Tema.superficieClara },
    avatarVazio: { alignItems: 'center', justifyContent: 'center' },
    infoArtista: { flex: 1 },
    nomeArtista: { color: Tema.texto, fontSize: 16, fontWeight: '700' },
    origem: { color: Tema.textoSuave, fontSize: 13, marginTop: 4 },
    marcador: { width: 25, height: 25, borderRadius: 13, borderWidth: 1.5, borderColor: Tema.textoSuave, alignItems: 'center', justifyContent: 'center' },
    marcadorSelecionado: { borderColor: Tema.destaqueAlt, backgroundColor: Tema.destaqueAlt },
    vazio: { alignItems: 'center', paddingTop: 45, gap: 14 },
    textoVazio: { color: Tema.textoSuave, fontSize: 14, textAlign: 'center' },
    rodape: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingVertical: 16, backgroundColor: Tema.fundo, borderTopWidth: 1, borderTopColor: Tema.borda },
    botaoContinuar: { height: 54, borderRadius: 15, backgroundColor: Tema.destaqueAlt, alignItems: 'center', justifyContent: 'center' },
    botaoDesabilitado: { opacity: 0.65 },
    textoContinuar: { color: Tema.texto, fontSize: 16, fontWeight: '800' },
});
