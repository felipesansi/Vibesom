# Vibesom

## Atualizações automáticas

Este projeto usa Expo Updates para publicar atualizações OTA automaticamente.

### Requisitos
- Criar um token do Expo em https://expo.dev/accounts/[username]/settings/access-tokens
- Adicionar o segredo `EXPO_TOKEN` no GitHub Actions
- Garantir que o projeto esteja associado ao projeto Expo com o `projectId` de [app.json](app.json)

### Fluxo
1. Envie mudanças para a branch `main`
2. O GitHub Actions executa `npx expo publish`
3. O app baixa a atualização automaticamente quando aberto

### Teste local
```bash
npx expo publish --non-interactive
```
