import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import type { Musica } from '../../lib/apiMusica';

const pastaDownloads = Platform.OS === 'web' ? null : new Directory(Paths.document, 'downloads');

function criarPastaDownloads() {
    if (!pastaDownloads) {
        throw new Error('Downloads offline não estão disponíveis na versão web.');
    }

    pastaDownloads.create({
        intermediates: true,
        idempotent: true,
    });
}

function chaveDaMusica(musica: Pick<Musica, 'source' | 'id'>) {
    return `${encodeURIComponent(musica.source)}-${encodeURIComponent(musica.id)}`;
}

function arquivosDaMusica(musica: Pick<Musica, 'source' | 'id'>) {
    if (!pastaDownloads) {
        throw new Error('Downloads offline não estão disponíveis na versão web.');
    }

    const chave = chaveDaMusica(musica);
    return {
        audio: new File(pastaDownloads, `${chave}.mp3`),
        metadados: new File(pastaDownloads, `${chave}.json`),
    };
}

function ehMusica(valor: unknown): valor is Musica {
    if (typeof valor !== 'object' || valor === null) return false;

    const musica = valor as Partial<Musica>;
    return typeof musica.source === 'string'
        && typeof musica.id === 'string'
        && typeof musica.titulo === 'string'
        && typeof musica.artista === 'string'
        && typeof musica.duracao === 'number'
        && typeof musica.streamUrl === 'string'
        && (typeof musica.capa === 'string' || musica.capa === null);
}

export async function baixarMusica(musica: Musica, streamUrl: string): Promise<File> {
    criarPastaDownloads();
    const { audio, metadados } = arquivosDaMusica(musica);

    if (audio.exists && metadados.exists) return audio;
    if (audio.exists) audio.delete();

    try {
        await File.downloadFileAsync(streamUrl, audio);
        metadados.write(JSON.stringify(musica));
        return audio;
    } catch (erro) {
        if (audio.exists) audio.delete();
        throw erro;
    }
}

export function obterArquivoMusicaBaixada(musica: Pick<Musica, 'source' | 'id'>): string | null {
    if (!pastaDownloads) return null;

    const { audio, metadados } = arquivosDaMusica(musica);
    return audio.exists && metadados.exists ? audio.uri : null;
}

export async function listarMusicasBaixadas(): Promise<Musica[]> {
    criarPastaDownloads();
    if (!pastaDownloads) {
        throw new Error('Downloads offline não estão disponíveis na versão web.');
    }

    const musicas: Musica[] = [];

    for (const item of pastaDownloads.list()) {
        if (!(item instanceof File) || !item.uri.endsWith('.json')) continue;

        let dados: unknown;
        try {
            dados = JSON.parse(await item.text());
        } catch (erro) {
            throw new Error(`Não foi possível ler os dados de uma música baixada: ${erro instanceof Error ? erro.message : 'arquivo inválido'}`);
        }

        if (!ehMusica(dados)) {
            throw new Error('Os dados de uma música baixada estão inválidos.');
        }

        if (obterArquivoMusicaBaixada(dados)) musicas.push(dados);
    }

    return musicas;
}
