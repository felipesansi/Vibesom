import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Linking,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Tema from '../../constantes/Cores';
import { buscarFontesDeAudio, FonteAudio, Musica, obterOpcaoAcessoSoundCloud } from '../lib/apiMusica';

type Props = {
    musica: Musica | null;
    visivel: boolean;
    onFechar: () => void;
    onSelecionar: (musica: Musica) => void;
};

const CORES: Record<string, string> = {
    youtube: '#FF0000',
    soundcloud: '#FF5500',
    audius: '#CC0000',
    jamendo: '#00A6A6',
    bandcamp: '#1DA0C3',
    archive: '#7B4F9E',
};

function iconeDaFonte(source: string): React.ComponentProps<typeof Ionicons>['name'] {
    switch (source.toLowerCase()) {
        case 'youtube': return 'logo-youtube';
        case 'soundcloud': return 'logo-soundcloud';
        default: return 'musical-note';
    }
}

/** Modal reutilizável que apresenta as fontes realmente retornadas pela API. */
export function SeletorFonteAudio({ musica, visivel, onFechar, onSelecionar }: Props) {
    const [fontes, setFontes] = useState<FonteAudio[]>([]);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const [urlCriarContaSoundCloud, setUrlCriarContaSoundCloud] = useState('https://soundcloud.com/signup');

    useEffect(() => {
        if (!visivel || !musica) return;

        const controlador = new AbortController();
        setCarregando(true);
        setErro(null);
        setFontes([]);

        Promise.all([
            buscarFontesDeAudio(musica, controlador.signal),
            obterOpcaoAcessoSoundCloud(controlador.signal).catch(() => null),
        ])
            .then(([resultado, acesso]) => {
                setFontes(resultado);
                if (acesso?.criarContaUrl) setUrlCriarContaSoundCloud(acesso.criarContaUrl);
                if (!resultado.length) setErro('Não encontramos opções do YouTube ou SoundCloud com pelo menos um minuto.');
            })
            .catch(e => {
                if (e instanceof Error && e.name !== 'AbortError') {
                    setErro('Não foi possível consultar as fontes de áudio.');
                }
            })
            .finally(() => setCarregando(false));

        return () => controlador.abort();
    }, [visivel, musica]);

    const escolher = (fonte: FonteAudio) => {
        if (!musica) return;
        onSelecionar({ ...musica, ...fonte });
        onFechar();
    };

    const abrirCriacaoContaSoundCloud = async () => {
        try {
            await Linking.openURL(urlCriarContaSoundCloud);
        } catch {
            setErro('Não foi possível abrir o cadastro do SoundCloud.');
        }
    };

    return (
        <Modal visible={visivel} transparent animationType="slide" onRequestClose={onFechar}>
            <View style={estilos.fundo}>
                <View style={estilos.cartao}>
                    <View style={estilos.cabecalho}>
                        <View style={{ flex: 1 }}>
                            <Text style={estilos.sobreTitulo}>Escolha uma fonte</Text>
                            <Text style={estilos.titulo} numberOfLines={1}>{musica?.titulo}</Text>
                            <Text style={estilos.subtitulo} numberOfLines={1}>{musica?.artista}</Text>
                        </View>
                        <TouchableOpacity accessibilityLabel="Fechar" onPress={onFechar} hitSlop={12}>
                            <Ionicons name="close" size={24} color={Tema.textoSecundario} />
                        </TouchableOpacity>
                    </View>

                    <Text style={estilos.ajuda}>Se não tocar, tente outra fonte </Text>
                    <Text style={estilos.ajuda}>ou procure direto na busca pelo nome do artista e da música.</Text>

                    <View style={estilos.contaSoundCloud}>
                        <Ionicons name="logo-soundcloud" size={22} color="#FF5500" />
                        <View style={{ flex: 1 }}>
                            <Text style={estilos.tituloConta}>Mais opções no SoundCloud</Text>
                            <Text style={estilos.textoConta}>Crie uma conta, se quiser, para acessar o catálogo e recursos da plataforma.</Text>
                        </View>
                        <TouchableOpacity onPress={abrirCriacaoContaSoundCloud} style={estilos.botaoConta}>
                            <Text style={estilos.textoBotaoConta}>Criar conta</Text>
                        </TouchableOpacity>
                    </View>

                    {carregando ? (
                        <View style={estilos.estado}>
                            <ActivityIndicator color={Tema.destaqueAlt} />
                            <Text style={estilos.textoEstado}>Procurando fontes de áudio…</Text>
                        </View>
                    ) : erro ? (
                        <Text style={[estilos.textoEstado, { color: Tema.erro }]}>{erro}</Text>
                    ) : fontes.map((fonte, indice) => {
                        const cor = CORES[fonte.source.toLowerCase()] ?? Tema.destaqueAlt;
                        return (
                            <TouchableOpacity key={`${fonte.source}-${fonte.id}-${indice}`} style={estilos.opcao} onPress={() => escolher(fonte)}>
                                <View style={[estilos.icone, { backgroundColor: `${cor}22` }]}>
                                    <Ionicons name={iconeDaFonte(fonte.source)} size={22} color={cor} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={estilos.nomeFonte}>{fonte.source}</Text>
                                    <Text style={estilos.tituloFonte} numberOfLines={1}>{fonte.titulo}</Text>
                                </View>
                                <Ionicons name="play-circle" size={30} color={Tema.destaqueAlt} />
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        </Modal>
    );
}

const estilos = StyleSheet.create({
    fundo: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.62)' },
    cartao: { backgroundColor: Tema.superficie, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32, minHeight: 260 },
    cabecalho: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
    sobreTitulo: { color: Tema.destaqueAlt, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: .7 },
    titulo: { color: Tema.texto, fontSize: 20, fontWeight: '800', marginTop: 4 },
    subtitulo: { color: Tema.textoSecundario, fontSize: 14, marginTop: 2 },
    ajuda: { color: Tema.textoSuave, fontSize: 13, lineHeight: 18, marginTop: 16, marginBottom: 10 },
    contaSoundCloud: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FF550015', borderWidth: 1, borderColor: '#FF550040', borderRadius: 14, padding: 12, marginBottom: 8 },
    tituloConta: { color: Tema.texto, fontSize: 13, fontWeight: '700' },
    textoConta: { color: Tema.textoSecundario, fontSize: 11, lineHeight: 15, marginTop: 2 },
    botaoConta: { backgroundColor: '#FF5500', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8 },
    textoBotaoConta: { color: Tema.texto, fontWeight: '800', fontSize: 11 },
    estado: { minHeight: 100, alignItems: 'center', justifyContent: 'center', gap: 12 },
    textoEstado: { color: Tema.textoSecundario, textAlign: 'center', fontSize: 14, marginVertical: 20 },
    opcao: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Tema.borda },
    icone: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
    nomeFonte: { color: Tema.texto, fontSize: 15, fontWeight: '700' },
    tituloFonte: { color: Tema.textoSecundario, fontSize: 12, marginTop: 2 },
});
