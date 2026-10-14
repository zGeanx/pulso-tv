# Pulso TV

Site para assistir canais, a programação do momento e jogos ao vivo. A grade não
é hospedada aqui: o navegador incorpora players de terceiros. Não há conta,
banco de dados nem anúncios.

## Páginas

| Rota | O que mostra |
| --- | --- |
| `/` | Destaque, quatro jogos da agenda, o que está no ar, categorias, programação atual e canais de esporte |
| `/canais` | Grade completa, filtro por categoria e busca por canal ou programa. A lista carrega de 24 em 24 |
| `/agenda` | Jogos em quatro abas: todos, ao vivo, próximos e encerrados. A busca olha time, campeonato e esporte |
| `/disney` | Aviso de manutenção. A grade Disney+ não entra no site |
| `/canal/$channelId` | Player do canal, programa atual, jogos ligados a esse sinal e canais da mesma categoria |
| `/evento/$eventId` | Player do jogo, horário, status, canais que estão passando a partida e outros jogos |

O destaque da home escolhe, nesta ordem, futebol ao vivo, qualquer esporte ao vivo, futebol que ainda vai começar, outro esporte futuro e, por último, um canal com player.

O cabeçalho tem busca global a partir de dois caracteres (canais, programas, times e eventos) e um botão de tema. O tema escuro é o padrão; o claro fica em `localStorage` na chave `pulso-theme` e é aplicado antes da página pintar.

Canais sem programa atual e a CazéTV ficam de fora das listas da home. Quando há esporte, ESPN, SporTV, Premiere e Combate aparecem primeiro.

## Catálogo

Duas fontes públicas são lidas em paralelo. Se uma falhar, a outra ainda alimenta a tela.

- Uma fonte traz canais, EPG, categorias, agenda e busca.
- A outra traz jogos e embeds. O browser só recebe esse catálogo pela própria origem do site. Escudos passam pelo mesmo servidor, porque a origem marca esses arquivos como same-origin. Bandeiras e avatares de iniciais não são usados como escudo de clube.

No `npm run dev`, o Vite responde imagens antes do servidor da aplicação, então os escudos também passam por um middleware em `vite.config.ts`.

A mescla fica em `src/lib/merge-catalog.ts`:

- Um jogo que casa com o mesmo confronto no mesmo dia em São Paulo entra no evento já listado. Listagens repetidas do mesmo jogo viram um card só.
- O sinal extra substitui a opção alternativa daquele canal e as opções do player são numeradas na lista inteira.
- Jogo que só existe na segunda fonte ganha id `pulso-<slug>`, poster, escudo do catálogo ou de um mapa local de times, e horário lido como America/São Paulo.
- Embed de canal com o mesmo nome é anexado ao canal existente. O que não casa vira um canal novo.
- Entram só URLs `http` ou `https`. Disney+, `example.com` e YouTube fora de `/embed/` são descartados. Evento cuja única fonte é Disney+ some da agenda.
- Um jogo marcado como futuro pode aparecer ao vivo quando a outra fonte já o trata assim.

Canais são revalidados a cada 5 minutos. A agenda espera 30 segundos e, se houver jogo ao vivo, atualiza nesse intervalo. Categorias ficam em cache por 10 minutos.

## Player

`WatchPlayer` mostra um iframe 16:9. O seletor lista cada sinal como canal e qualidade, omite qualidade vazia e aplica a política `allow` do catálogo, junto com autoplay, tela cheia e picture-in-picture. Dá para copiar a URL do embed ou compartilhar a página.

## Stack

React 19, TanStack Start, TanStack Router e TanStack Query, Vite 8, Tailwind CSS 4 e Nitro com preset `cloudflare-module`. O alias `@/` aponta para `src/`. TypeScript está em modo estrito.

## Desenvolvimento

Requer Node.js 22 e npm.

```bash
npm install
npm run dev
```

```bash
npm run lint
npm run build
npm run preview
```

`npm run format` aplica o Prettier.

## Publicação

O build gera `.output/server`. `scripts/sync-worker-name.mjs` grava o nome `pulso-tv` no Wrangler gerado. O `wrangler.jsonc` da raiz só fixa a data de compatibilidade e `nodejs_compat`.

```bash
npm run build
npm run deploy
npm run deploy:prod
```

`deploy` envia uma versão do Worker sem promovê-la. `deploy:prod` publica.

## Estrutura

```
src/routes/            páginas e metadados
src/components/        shell, cards, player e tema
src/hooks/use-api.ts   queries do catálogo mesclado
src/lib/api.ts         cliente da grade e regras da home
src/lib/pulso-api.ts   cliente do catálogo de jogos
src/lib/merge-catalog.ts
src/lib/pulso-assets.ts
src/lib/team-logos.ts
src/server.ts          Worker: proxy, logos e página de erro
scripts/               nome do Worker, upload e deploy
```
