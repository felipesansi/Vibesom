import { Directory, File, Paths } from 'expo-file-system';

const pastaDownloads = new Directory(Paths.document, 'downloads');

export function criarPastaDownloads() {
    pastaDownloads.create({
        intermediates: true,
        idempotent: true,
    });
}

export async function baixarMusica(
    id: string,
    streamUrl: string,
    apiBaseUrl: string,
) {
    criarPastaDownloads();

    const url = new URL(streamUrl, apiBaseUrl).toString();
    const arquivo = new File(pastaDownloads, `${id}.mp3`);

    return await File.downloadFileAsync(url, arquivo, {
        idempotent: true,
    });
}
