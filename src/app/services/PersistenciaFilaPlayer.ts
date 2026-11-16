import { File, Paths } from 'expo-file-system';
import type { Musica } from '../../lib/apiMusica';

export type FilaPersistida = {
    lista: Musica[];
    indiceAtual: number;
    repetir: boolean;
    aleatorio: boolean;
};

const arquivoEstado = new File(Paths.document, 'vibesom-player-state.json');
const LIMITE_FAIXAS_PERSISTIDAS = 100;

function validarMusica(valor: unknown): valor is Musica {
    if (!valor || typeof valor !== 'object') return false;
    const musica = valor as Partial<Musica>;
    return typeof musica.source === 'string'
        && typeof musica.id === 'string'
        && typeof musica.titulo === 'string'
        && typeof musica.artista === 'string'
        && typeof musica.duracao === 'number';
}

export async function carregarFilaPersistida(): Promise<FilaPersistida | null> {
    try {
        if (!arquivoEstado.exists) return null;
        const dados: unknown = JSON.parse(await arquivoEstado.text());
        if (!dados || typeof dados !== 'object') return null;

        const estado = dados as Partial<FilaPersistida>;
        const lista = Array.isArray(estado.lista)
            ? estado.lista.filter(validarMusica).slice(0, LIMITE_FAIXAS_PERSISTIDAS)
            : [];

        return {
            lista,
            indiceAtual: typeof estado.indiceAtual === 'number'
                ? Math.min(Math.max(estado.indiceAtual, -1), lista.length - 1)
                : -1,
            repetir: estado.repetir === true,
            aleatorio: estado.aleatorio === true,
        };
    } catch (erro) {
        console.warn('[Player] Não foi possível restaurar a fila:', erro);
        return null;
    }
}

export async function salvarFilaPersistida(estado: FilaPersistida): Promise<void> {
    try {
        const lista = estado.lista.slice(0, LIMITE_FAIXAS_PERSISTIDAS).map(musica => ({
            ...musica,
            // URLs assinadas ou temporárias não devem sobreviver ao encerramento do app.
            // Faixas baixadas continuam disponíveis localmente; as demais são resolvidas ao tocar.
            streamUrl: '',
        }));

        arquivoEstado.write(JSON.stringify({
            lista,
            indiceAtual: estado.indiceAtual,
            repetir: estado.repetir,
            aleatorio: estado.aleatorio,
            atualizadoEm: new Date().toISOString(),
        }));
    } catch (erro) {
        console.warn('[Player] Não foi possível salvar a fila:', erro);
    }
}
