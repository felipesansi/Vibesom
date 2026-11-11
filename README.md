# Vibesom

Vibesom é um aplicativo de streaming de música para dispositivos móveis, construído com React Native e Expo. Ele permite que os usuários pesquisem e ouçam músicas de várias fontes, gerenciem suas faixas favoritas e desfrutem de uma experiência de reprodução contínua.

## ✨ Funcionalidades

### Requisitos
- Criar um token do Expo em https://expo.dev/accounts/[username]/settings/access-tokens
- Adicionar o segredo `EXPO_TOKEN` no GitHub Actions
- Garantir que o projeto esteja associado ao projeto Expo com o `projectId` de [app.json](app.json)
*   **Busca Unificada**: Pesquise músicas, artistas e playlists em múltiplas plataformas através de uma API centralizada.
*   **Player de Áudio Completo**: Controles de reprodução (play/pause, avançar, retroceder), repetição, modo aleatório e visualização em tela cheia.
*   **YouTube**: Busca de vídeos com reprodução pelo player oficial incorporado. A reprodução em segundo plano depende das regras do YouTube; o player do Vibesom continua destinado às fontes de áudio do catálogo.
*   **Favoritos**: Salve suas músicas preferidas em uma playlist pessoal (integrado com Supabase).
*   **Fontes de Áudio Alternativas**: Selecione diferentes fontes de streaming para a mesma música.
*   **Conectividade Bluetooth**: Funcionalidades para escanear e conectar-se a dispositivos Bluetooth.
*   **Atualizações OTA**: Receba atualizações automaticamente com o Expo Updates.

### Fluxo
1. Envie mudanças para a branch `main`
2. O GitHub Actions publica com `eas update --channel preview --platform android`
3. Apps instalados com o mesmo runtime baixam a atualização quando abertos
## 🚀 Tecnologias Utilizadas

### Teste local
*   **React Native**: Estrutura principal para o desenvolvimento móvel.
*   **Expo**: Plataforma e conjunto de ferramentas para facilitar o desenvolvimento (incluindo Expo Router, Expo Audio, Expo Updates).
*   **TypeScript**: Para um código mais robusto e seguro.
*   **Supabase**: Backend para autenticação e banco de dados (usado para as músicas favoritas).
*   **Vibesom API**: Backend customizado para buscar e resolver as fontes de áudio.

## ⚙️ Configuração e Execução Local

### Pré-requisitos
*   Node.js (versão LTS recomendada)
*   Yarn ou npm
*   Expo CLI: `npm install -g expo-cli`
*   Um arquivo `.env` na raiz do projeto com as variáveis de ambiente necessárias (ex: `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`).

### Instalação

Clone o repositório e instale as dependências:

```bash
git clone <URL_DO_REPOSITORIO>
cd vibesom
npm install
# ou
yarn install
```

### Executando o App

Inicie o servidor de desenvolvimento do Expo:

```bash
npx expo start
```

Isso abrirá o Expo Dev Tools no seu navegador. Você pode então escanear o QR code com o aplicativo Expo Go no seu dispositivo (iOS ou Android) para rodar o projeto.

## 📦 Publicação e Atualizações (OTA)

Este projeto usa o Expo Updates para publicar atualizações Over-the-Air (OTA) automaticamente através de GitHub Actions.

Atualizações OTA não instalam módulos nativos. A reprodução incorporada do YouTube usa `react-native-webview`, então esta alteração requer gerar e instalar um novo APK antes do teste:

```bash
npx eas-cli build --profile preview --platform android
```

Depois que o APK for instalado, as atualizações JavaScript compatíveis podem continuar sendo entregues pelo canal `preview`.

1.  Ao enviar mudanças para a branch `main`, a action do GitHub é acionada.
2.  O job executa `eas update --channel preview --platform android`.
3.  Apps no canal `preview` e com runtime compatível baixam a atualização ao abrir.

Para testar o processo de publicação localmente, execute:
```bash
npx eas-cli update --channel preview --platform android
```
