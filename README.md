# Pulso TV

Frontend em Vinext para navegar por canais e eventos ao vivo. A aplicação
mantém páginas independentes para início, canais, agenda, Disney+ e reprodução.

## Requisitos

- Node.js `>=22.13.0`
- pnpm

## Desenvolvimento

```bash
pnpm install
pnpm dev
```

## Verificação

```bash
pnpm lint
pnpm typecheck
pnpm test
```

O teste executa o build de produção e valida a renderização do servidor e a
separação das rotas principais.

## Estrutura principal

- `app/page.tsx`: página inicial
- `app/canais/`: catálogo de canais
- `app/agenda/`: agenda esportiva
- `app/disneyplus/`: eventos Disney+
- `app/canal/[id]/`: reprodução de canais
- `app/assistir/[id]/`: reprodução de eventos
- `app/api/reidoscanais/`: proxy para a API externa
- `lib/reidoscanais/`: cliente e tipos compartilhados

As integrações de banco de dados e autenticação não fazem parte da aplicação
atual. Elas devem ser adicionadas somente quando houver uma funcionalidade que
realmente precise de persistência ou identidade de usuário.
