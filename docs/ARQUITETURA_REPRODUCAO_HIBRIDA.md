# Reprodução híbrida do VibeSom

## Estado atual

O aplicativo mantém um único motor de áudio em `src/contexto/ContextoPlayer.tsx`, baseado em `expo-audio`. Não crie um segundo player: telas e controles devem consumir `usePlayer()`.

A configuração Expo já habilita reprodução em segundo plano:
- `expo-audio.enableBackgroundPlayback`
- iOS `UIBackgroundModes: ["audio"]`
- Android `FOREGROUND_SERVICE` e `FOREGROUND_SERVICE_MEDIA_PLAYBACK`

## Fluxo híbrido

1. **Faixa baixada:** `obterArquivoMusicaBaixada()` fornece o arquivo local. A reprodução não depende de API nem de rede.
2. **URL de áudio direta:** quando o catálogo fornece uma URL HTTPS reproduzível, o player tenta essa URL diretamente. A validade e a autorização continuam dependendo do provedor.
3. **URL relativa ou resolução:** rotas como `/resolver` são resolvidas pela API configurada em `EXPO_PUBLIC_API_URL`.
4. **Fallback:** se uma fonte falhar, o player pode consultar a pesquisa da API para encontrar outra fonte compatível.
5. **YouTube:** permanece no fluxo de vídeo incorporado oficial; não é convertido em stream de áudio pelo player nativo.

## Persistência local

`src/app/services/PersistenciaFilaPlayer.ts` guarda fila, índice, repetição e aleatório no diretório de documentos do app. URLs de streaming são removidas antes da gravação porque podem conter tokens ou expirar. Ao retomar uma faixa que não está baixada, o fluxo deve obter uma nova URL válida.

A persistência não baixa músicas automaticamente e não transforma fontes remotas em conteúdo offline. Para ouvir sem rede, a faixa precisa ter sido baixada por um fluxo autorizado e estar presente no armazenamento local.

## Limites e segurança

- Não há garantia de que um provedor permita reprodução indefinida, em segundo plano ou sem autenticação.
- Não contorne DRM, paywalls, restrições de região ou termos de serviço.
- Não grave tokens, URLs assinadas ou credenciais no estado persistido.
- A API pode ser hospedada fora da Vercel; basta configurar `EXPO_PUBLIC_API_URL` para uma implantação compatível com os endpoints usados pelo app.
- Alterações em plugins nativos e permissões exigem novo development build / APK; uma atualização OTA não altera o binário nativo já instalado.

## Verificação

Antes de publicar uma versão de produção, execute no ambiente do projeto:

```bash
bun install
npx expo-doctor
npx tsc --noEmit
```

Depois valide em um development build Android real:
- iniciar, pausar, retomar e avançar com tela bloqueada;
- receber interrupção de áudio (chamada/assistente) e retomar;
- restaurar fila após encerrar e reabrir o app;
- tocar arquivo baixado em modo avião;
- tocar URL direta com a API indisponível;
- confirmar que rotas relativas e resolução apresentam erro compreensível sem API.
