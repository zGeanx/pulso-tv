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

## Anúncios

O site aceita blocos responsivos do Google AdSense na página inicial e abaixo
do player. Copie `.env.example` para `.env.local` e preencha:

```bash
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-0000000000000000
NEXT_PUBLIC_ADSENSE_HOME_SLOT=0000000000
NEXT_PUBLIC_ADSENSE_PLAYER_SLOT=0000000000
```

Sem essas variáveis, os banners de afiliados definidos em
`lib/ads-config.ts` continuam sendo exibidos como fallback. Reinicie o servidor
de desenvolvimento após alterar as variáveis.

Os valores `NEXT_PUBLIC_*` ficam visíveis no navegador e devem conter somente
identificadores públicos. Nunca coloque chaves de API, tokens ou senhas nessas
variáveis. Credenciais futuras do serviço upstream devem existir apenas como
secrets do Worker e ser usadas exclusivamente nas rotas do servidor.

Os players aceitam por padrão apenas `esportesembed.net`, `rdcanais.net` e seus
subdomínios. Para acrescentar provedores aprovados, configure os hostnames
separados por vírgula (sem protocolo ou caminho):

```bash
NEXT_PUBLIC_ALLOWED_EMBED_HOSTS=player.exemplo.com,cdn.exemplo.com
```

O player também rejeita esquemas inseguros, credenciais, portas não padrão,
endereços locais e a própria origem da Pulso TV. A política `frame-src` impede
destinos fora da lista. Os provedores atuais bloqueiam deliberadamente qualquer
iframe que contenha o atributo `sandbox`, portanto os players aprovados são
carregados sem esse atributo como uma exceção explícita de compatibilidade.
Hostnames acrescentados pela variável de ambiente continuam sandboxados. Trate
cada nova exceção sem sandbox como uma decisão de confiança e não a conceda a
provedores que não tenham sido revisados.

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
