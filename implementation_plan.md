# Pulso TV: análise e plano de correção

O formato e o design ficam como estão: mesmo grid, mesmas seções, mesmas fontes e cores. O plano mexe nos dados, nas imagens e em detalhes de acabamento.

> [!NOTE]
> O diagnóstico foi feito com os dados reais das duas APIs (16/10, 15h34) e com um teste HTTP de **cada** URL do mapa de escudos ([logos.mjs](file:///C:/Users/Gean/.gemini/antigravity-ide/brain/b85db90a-9712-4e65-bcbe-26226535f7dd/scratch/logos.mjs)).

---

## Diagnóstico: o que está quebrado e por quê

### 1. Emblemas que não aparecem (4 causas confirmadas)

| # | Causa | Onde | Impacto |
|---|---|---|---|
| A | A regex de arquivo de logo **não aceita `_`**. A API manda `/logos/teams/sao_paulo.png`, `cerro_porteno.png`, `boca_juniors.png`… Esses arquivos não passam pelo proxy e o navegador pede o caminho ao próprio site, que responde 404 | [pulso-assets.ts:L4](file:///c:/Users/Gean/Downloads/pulso-tv/src/lib/pulso-assets.ts#L4) | Todo clube com nome composto vindo da API Pulso (e `coventry_city`, `newcastle_united`, `al_nassr` do mapa local) |
| B | **19 URLs do mapa local estão mortas (404)**: Sport, Guarani, Ituano, Amazonas, Peñarol, Olimpia, Racing, Independiente, Colo-Colo, LDU, Atlético de Madrid, Juventus, Roma, Feyenoord, Brasil, Argentina, Inglaterra, Holanda, Colômbia | [team-logos.ts:L66-L186](file:///c:/Users/Gean/Downloads/pulso-tv/src/lib/team-logos.ts#L66-L186) | Escudo some e vira iniciais |
| C | O **mapa local tem prioridade** sobre o escudo que a API manda. Exemplo de hoje: a API manda um escudo válido para "Sport Recife", mas o mapa troca por uma URL morta | [merge-catalog.ts:L316-L322](file:///c:/Users/Gean/Downloads/pulso-tv/src/lib/merge-catalog.ts#L316-L322) | Um escudo bom vira escudo quebrado |
| D | `normalizeTeamKey` **apaga siglas de estado** (`mg`, `go`, `pr`, `sp`…). "Atlético-MG" e "Atlético-GO" viram a mesma chave, `atletico`, e um pode receber o escudo do outro. "Botafogo-SP" recebe o escudo do Botafogo do Rio. As entradas `atletico mg`, `athletico pr` e `botafogo sp` nunca casam | [team-logos.ts:L5-L20](file:///c:/Users/Gean/Downloads/pulso-tv/src/lib/team-logos.ts#L5-L20) | Escudo errado ou ausente |

Também encontrei:
- Napoli usa a mesma URL do PSG.
- Existem duas normalizações de nome de time diferentes, uma em `team-logos.ts` e outra em `merge-catalog.ts`.
- `crestFor` e `teamCrest` devolvem o placeholder até quando ele foi detectado. As duas linhas finais são idênticas.
- Seleções (Cabo Verde, Indonésia) ficam sem emblema, porque bandeiras são descartadas mesmo quando o time é uma seleção.

### 2. Emblemas com fundo branco (2 causas)

- **O CSS da caixa é quase branco**: `.logo-box` usa `color-mix(white 88%, card)`. No tema escuro, todo escudo aparece num quadrado branco ([styles.css:L220-L228](file:///c:/Users/Gean/Downloads/pulso-tv/src/styles.css#L220-L228)).
- **Arquivos sem transparência**: Brusque, Libertad e Uruguai no mapa local não são PNG de verdade. Têm fundo sólido.

### 3. Fotos dos cards genéricas ou vazias

- **15 de 16 jogos da API Pulso usam foto de banco de imagens** (`images.unsplash.com`). É o "fundo genérico". O código já tem `isStockPhoto()`, mas só usa a função para escolher entre listagens duplicadas. Ela não barra o pôster ([merge-catalog.ts:L339](file:///c:/Users/Gean/Downloads/pulso-tv/src/lib/merge-catalog.ts#L339)).
- Sem `match_image`, o pôster passa a ser a **thumbnail do canal** (logo da ESPN esticado no card).
- Sem pôster nenhum (1 de 3 jogos da outra fonte hoje), o card fica **um retângulo vazio** ([event-card.tsx:L32-L34](file:///c:/Users/Gean/Downloads/pulso-tv/src/components/event-card.tsx#L32-L34)).
- Pôster fora de 16:9 fica com faixas pretas (`object-contain` sobre `bg-background`).

### 4. Informações erradas ou incompletas

| Problema | Onde |
|---|---|
| Jogos da API Pulso chegam sempre como `scheduled` e **nunca viram "Ao vivo"**. Ficam em "Em breve" mesmo horas depois de começar | [merge-catalog.ts:L626-L630](file:///c:/Users/Gean/Downloads/pulso-tv/src/lib/merge-catalog.ts#L626-L630) |
| Agenda sem jogo ao vivo **não atualiza sozinha** (`refetchInterval: false`), então quem está com a página aberta não vê o jogo começar | [use-api.ts:L43-L47](file:///c:/Users/Gean/Downloads/pulso-tv/src/hooks/use-api.ts#L43-L47) |
| Categoria fixa em **"Futebol"** até para "Copa das Nações de Futsal" | [merge-catalog.ts:L340](file:///c:/Users/Gean/Downloads/pulso-tv/src/lib/merge-catalog.ts#L340) |
| Destaque da home diz **"Hoje às 20:00"** mesmo para jogo de amanhã | [index.tsx:L91](file:///c:/Users/Gean/Downloads/pulso-tv/src/routes/index.tsx#L91) |
| Destaque escolhe o primeiro da lista, não o mais próximo, e pode escolher jogo **sem player** (botão desativado) | [index.tsx:L67-L84](file:///c:/Users/Gean/Downloads/pulso-tv/src/routes/index.tsx#L67-L84) |
| A busca da agenda **ignora o nome dos times** | [agenda.tsx:L77-L83](file:///c:/Users/Gean/Downloads/pulso-tv/src/routes/agenda.tsx#L77-L83) |
| Agenda e cards da home **não ordenam por horário** | [api.ts:L350-L356](file:///c:/Users/Gean/Downloads/pulso-tv/src/lib/api.ts#L350-L356) |
| Página do canal "ESPN" lista jogos da ESPN 2, ESPN 4… porque compara com `includes()` | [api.ts:L367-L380](file:///c:/Users/Gean/Downloads/pulso-tv/src/lib/api.ts#L367-L380) |
| Título da aba no carregamento mostra o slug (`mirassol-x-internacional \| Pulso TV`) | [evento.$eventId.tsx:L21](file:///c:/Users/Gean/Downloads/pulso-tv/src/routes/evento.$eventId.tsx#L21) |
| Cada aba da agenda dispara uma nova chamada às 3 APIs, embora o filtro seja local | [agenda.tsx:L72-L75](file:///c:/Users/Gean/Downloads/pulso-tv/src/routes/agenda.tsx#L72-L75) |

---

## Plano de correção

### Fase 1: emblemas (prioridade máxima)

#### [MODIFY] [pulso-assets.ts](file:///c:/Users/Gean/Downloads/pulso-tv/src/lib/pulso-assets.ts)
- Aceitar `_` na regex `LOGO_FILE`. Resolve a causa A no proxy do Worker e no middleware do Vite, que já usam essa função.

#### [MODIFY] [team-logos.ts](file:///c:/Users/Gean/Downloads/pulso-tv/src/lib/team-logos.ts)
- Trocar `normalizeTeamKey` para **manter** as siglas de estado e unificar com `canonicalTeam` de `merge-catalog.ts` numa normalização exportada. As variantes ("Atlético-MG", "Atletico Mineiro", "CAM") viram aliases explícitos.
- Substituir as 19 URLs mortas e os 3 arquivos sem transparência por PNGs transparentes que respondem 200. Corrigir o Napoli.
- Expor `resolveTeamCrests(name)`, que devolve uma **lista de candidatos** em ordem, em vez de uma única URL.

#### [MODIFY] [merge-catalog.ts](file:///c:/Users/Gean/Downloads/pulso-tv/src/lib/merge-catalog.ts)
- Nova ordem do escudo:
  1. escudo real da API
  2. mapa local
  3. bandeira, só para seleção
  4. fallback visual
- Corrigir o `return existing` duplicado.
- Guardar os candidatos em `teams.home.logos[]` para o componente tentar o próximo se um falhar.

#### [NEW] `src/components/team-crest.tsx`
- Componente único de escudo usado na home, no evento, nos cards e na busca.
- **Fundo transparente** com `drop-shadow` suave, para o escudo funcionar no tema escuro e no claro.
- Tenta cada URL da lista. Se todas falharem, mostra um **círculo com iniciais e cor derivada do nome**, no mesmo estilo em todo o site.

#### [MODIFY] [media-image.tsx](file:///c:/Users/Gean/Downloads/pulso-tv/src/components/media-image.tsx)
- Aceitar `src` como lista, com fallback em cadeia.
- Detectar imagem que já está em cache (`img.complete`) para não ficar presa em `opacity-0`.

#### [MODIFY] [styles.css](file:///c:/Users/Gean/Downloads/pulso-tv/src/styles.css)
- Novo utilitário `crest-box`: transparente, sem caixa branca.
- Suavizar `logo-box` dos canais (veja a decisão 3 abaixo).

#### [NEW] `scripts/check-logos.mjs` + `npm run check:logos`
- Testa todas as URLs do mapa: status HTTP, se é PNG real e se tem transparência. Também acusa URLs duplicadas. Assim, uma URL morta é detectada antes do deploy.

### Fase 2: cards da agenda

#### [MODIFY] [merge-catalog.ts](file:///c:/Users/Gean/Downloads/pulso-tv/src/lib/merge-catalog.ts)
- Descartar como pôster: fotos do Unsplash, thumbnail ou logo de canal e placeholders `data:`. Nesses casos o pôster vira `null`.

#### [NEW] `src/components/match-cover.tsx`
- **Capa gerada** para jogos sem pôster real, no mesmo 16:9 do card. Leva os dois escudos grandes com "×", a competição e o horário sobre um gradiente escuro na paleta do site. Também serve no destaque da home.

#### [MODIFY] [event-card.tsx](file:///c:/Users/Gean/Downloads/pulso-tv/src/components/event-card.tsx)
- Usar a capa gerada quando não houver pôster real.
- Pôster fora de 16:9: preencher as faixas com uma cópia **desfocada** da própria imagem, no lugar das barras pretas.
- Linha de horário relativa ("em 25 min", "começou há 10 min").
- Trocar a linha final repetida ("Futebol") pelos canais da transmissão ("Sportv · Premiere").

#### [MODIFY] [index.tsx](file:///c:/Users/Gean/Downloads/pulso-tv/src/routes/index.tsx)
- Destaque: no lugar de `TeamMark`, usar `TeamCrest` e `MatchCover`.
- Remover a terceira repetição de escudos sobre a imagem, porque o lado esquerdo já mostra os escudos.

### Fase 3: informações e agenda

#### [MODIFY] [merge-catalog.ts](file:///c:/Users/Gean/Downloads/pulso-tv/src/lib/merge-catalog.ts)
- **Status inferido pelo horário** para jogos da API Pulso:
  - "Ao vivo" entre o início e cerca de 2h15 depois
  - "Encerrado" depois disso
  - os valores `live` e `finished` explícitos da API continuam valendo
- **Categoria inferida** pela competição: Futsal, Basquete, Vôlei, Tênis, MMA/UFC, F1… O padrão continua "Futebol".

#### [MODIFY] [api.ts](file:///c:/Users/Gean/Downloads/pulso-tv/src/lib/api.ts)
- Ordenar por status e depois por horário (`sortEvents`), na agenda, nos cards da home e nos relacionados.
- `eventsForChannel`: comparar com `sameBroadcastChannel` no lugar de `includes()`.

#### [MODIFY] [use-api.ts](file:///c:/Users/Gean/Downloads/pulso-tv/src/hooks/use-api.ts)
- Atualizar a cada 30 s com jogo ao vivo, a cada 60 s com jogo começando nos próximos 30 min e a cada 5 min no resto do tempo.
- Agenda com **uma única query**. As abas filtram localmente.

#### [MODIFY] [agenda.tsx](file:///c:/Users/Gean/Downloads/pulso-tv/src/routes/agenda.tsx)
- A busca passa a usar `eventSearchBlob`, que inclui os times.
- Contador em cada aba ("Ao vivo agora · 3").
- Separadores de dia discretos dentro da lista ("Hoje", "Amanhã", "sáb., 18/10"), mantendo o layout em linhas.
- Mostrar todos os canais do jogo, não só o primeiro.

#### [MODIFY] [index.tsx](file:///c:/Users/Gean/Downloads/pulso-tv/src/routes/index.tsx)
- `heroKicker` usa o dia real ("Amanhã às 20:00").
- `pickHero` prefere jogo com player e o horário mais próximo.

#### [MODIFY] [evento.$eventId.tsx](file:///c:/Users/Gean/Downloads/pulso-tv/src/routes/evento.$eventId.tsx) e [canal.$channelId.tsx](file:///c:/Users/Gean/Downloads/pulso-tv/src/routes/canal.$channelId.tsx)
- Título e descrição legíveis já no SSR, derivados do slug ("Mirassol x Internacional | Pulso TV").
- Evento: contagem regressiva antes do início e escudos com `TeamCrest`.

#### [MODIFY] [pulso-shell.tsx](file:///c:/Users/Gean/Downloads/pulso-tv/src/components/pulso-shell.tsx)
- Busca global: os eventos mostram o dia além da hora, e o status ao vivo usa o mesmo selo do resto do site.

### Fase 4: documentação

#### [MODIFY] [README.md](file:///c:/Users/Gean/Downloads/pulso-tv/README.md)
- Registrar a nova ordem dos escudos, a regra de pôster, a inferência de status e categoria e o `check:logos`.

---

## Decisões que preciso de você

> [!IMPORTANT]
> **1. Capa gerada nos cards sem foto real.** Pelo histórico do git, os escudos já foram tirados de cima das fotos (`drop crest overlays from match cards`). A capa gerada **só aparece quando não há foto real**, sem sobrepor nada a pôster existente. Posso seguir assim?

> [!IMPORTANT]
> **2. Escudos na lista da agenda.** Eles foram removidos no commit `320d915`, provavelmente por causa das caixas brancas. Com o escudo transparente, quer que eu volte a mostrar dois escudos pequenos ao lado do nome do jogo, ou a lista fica só com texto?

> [!IMPORTANT]
> **3. Caixa dos logos de canais.** Escudos de time ficam transparentes. Logos de canal às vezes são pretos e somem no fundo escuro. Proposta: trocar o branco sólido por uma superfície clara suave, com cantos arredondados e borda sutil. Outra opção é deixar como está.

---

## Verificação

- `npm run check:logos`: nenhuma URL com 404, nenhum arquivo sem transparência, nenhuma duplicata.
- `npm run lint` e `npm run build` sem erros.
- `npm run dev` com checagem visual no navegador, temas escuro e claro: home (destaque e cards), `/agenda` (abas, busca por time, separadores), `/evento/…` (escudos, contagem) e `/canal/espn` (só jogos da ESPN).
- Simular jogo da API Pulso com horário passado para confirmar que ele vira "Ao vivo".
