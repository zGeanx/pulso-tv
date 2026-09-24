# Pulso TV — Integração da API Externa: Design Técnico

## Overview

O Pulso TV migrou de dados mockados estáticos (`src/lib/pulso-data.ts`) para uma integração completa com a API REST externa `https://api.reidoscanais.st`. A mudança introduz dados reais de canais (com EPG ao vivo), eventos esportivos e busca global, mantendo a arquitetura TanStack Start + React 18 + TypeScript + React Query já existente.

A estratégia escolhida foi **substituição direta de fonte** — remover os dados estáticos e substituí-los por chamadas HTTP tipadas, sem alterar a camada de apresentação além do necessário. O `pulso-data.ts` foi preservado apenas para os assets de imagem usados na página `disney.tsx`, que ainda não consome a API.

---

## Glossary

- **Bug_Condition (C)**: A condição que disparava o bug — dados mockados sendo exibidos em vez de dados reais da API, resultando em canais e eventos fixos, sem EPG ao vivo e sem capacidade de busca.
- **Property (P)**: O comportamento correto desejado — cada página consome dados dinâmicos da API, com cache, revalidação e estados de loading/error apropriados.
- **Preservation**: O comportamento de UI que deve permanecer intacto — navegação, layout, Tailwind classes, shadcn/ui components, roteamento TanStack Router, e o fluxo do player modal.
- **`apiFetch`**: Função helper em `src/lib/api.ts` que centraliza todas as chamadas HTTP, aplica o `BASE_URL` e lança erro em respostas não-OK.
- **`ApiChannel`**: Interface TypeScript que representa um canal retornado pela API, incluindo `id`, `name`, `logo_url`, `category`, `embeds[]` e `epg`.
- **`ApiSportEvent`**: Interface TypeScript para eventos esportivos com `id`, `title`, `competition`, `status`, `start_time`, `embeds[]`, etc.
- **`ApiEmbed`**: Representa uma fonte de streaming: `{ provider, quality, embed_url }`.
- **`ApiEpg`**: Dados de programação atual e próxima de um canal: `{ current: ApiEpgEntry | null, next: ApiEpgNextEntry | null }`.
- **React Query**: Biblioteca de data-fetching com cache, stale-time configurável e refetch automático para dados ao vivo.
- **`SPORT_STATUS_LABEL`**: Mapa `satisfies Record<ApiSportStatus, string>` que traduz os status da API (`live/upcoming/finished`) para labels PT-BR exibidas na UI.

---

## Bug Details

### Bug Condition

O bug se manifestava em toda a aplicação: as páginas exibiam dados hardcoded/mockados em vez de dados reais da API. Especificamente:

- `/` (Home): canais e eventos estáticos, sem EPG real, sem player funcional para canais reais.
- `/canais`: grid mockado, sem filtro por categoria dinâmica, sem busca real.
- `/agenda`: eventos esportivos mockados, sem status ao vivo atualizado.
- Shell global: sem busca funcional.

**Formal Specification:**
```
FUNCTION isBugCondition(appState)
  INPUT: appState — estado da aplicação no momento de renderização
  OUTPUT: boolean

  RETURN appState.dataSource == "static_mock"
         AND appState.apiCallCount == 0
         AND appState.channelCount == FIXED_MOCK_COUNT
         AND NOT anyLiveEpgDisplayed(appState)
END FUNCTION
```

### Examples

- **Canal fixo sem EPG**: O card de um canal exibia nome e logo estáticos; o campo "programa atual" estava sempre vazio ou com texto placeholder.
- **Agenda sem status ao vivo**: Eventos mostravam status fixo independentemente da hora real; o badge "Ao vivo agora" nunca piscava.
- **Busca global inoperante**: O campo de busca no shell abria o overlay mas não retornava resultados (não havia integração com `/search`).
- **Filtro de categoria estático**: A aba "Esportes" em `/canais` usava uma lista hardcoded de categorias, não os dados reais de `/channels/categories`.

---

## Expected Behavior

### Preservation Requirements

**Comportamentos que devem permanecer inalterados:**

- Layout e componentes visuais (Tailwind classes, shadcn/ui, ícones lucide-react) não devem ser modificados além do necessário para exibir dados dinâmicos.
- Roteamento TanStack Router (`/`, `/canais`, `/agenda`, `/disney`) deve funcionar exatamente como antes.
- O `PlayerModal` deve continuar fechando com Escape e clique no backdrop.
- A navegação mobile (hambúrguer) e o header sticky devem continuar funcionando.
- A página `/disney` e o arquivo `pulso-data.ts` (imagens) não devem ser afetados pela integração.
- O comportamento de SSR/hidratação do TanStack Start não deve ser quebrado.

**Escopo:**
Todos os componentes e páginas que **não** consomem canais ou eventos da API devem permanecer completamente intocados. Isso inclui:
- `src/routes/disney.tsx`
- `src/components/ui/*` (accordion, button, etc.)
- Configurações de build (`vite.config.ts`, `tailwind.config.ts`, etc.)

---

## Hypothesized Root Cause

A ausência de integração com a API tinha causas estruturais, não um bug pontual:

1. **Ausência de cliente HTTP**: Não existia módulo centralizado para chamar a API; todos os dados vinham de imports estáticos em `pulso-data.ts`.

2. **Ausência de camada de hooks**: Sem React Query configurado para endpoints de canais/esportes/busca, não havia como gerenciar cache, loading states ou revalidação.

3. **Componentes acoplados a tipos mockados**: `ChannelCard` e as páginas dependiam de interfaces locais incompatíveis com a forma retornada pela API (e.g., sem campo `embeds`, sem `epg`).

4. **Ausência de PlayerModal**: Não havia componente para renderizar iframes de streaming; o botão "Assistir" era decorativo.

5. **Busca global não implementada**: O shell não chamava nenhum endpoint; o campo de busca existia apenas como elemento visual.

---

## Correctness Properties

Property 1: Bug Condition — Dados Reais Substituem Dados Mockados

_For any_ renderização de página que envolva canais ou eventos esportivos, a aplicação corrigida SHALL buscar dados da API `https://api.reidoscanais.st`, exibir os resultados reais (incluindo EPG ao vivo, status atualizado e embeds funcionais) e refletir qualquer alteração nos dados dentro do intervalo de stale-time configurado.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation — Comportamento Visual e de Navegação Intacto

_For any_ interação do usuário que não envolva diretamente o consumo de dados da API (navegação entre rotas, abertura/fechamento do menu mobile, interações com componentes shadcn/ui, acesso à página `/disney`), a aplicação corrigida SHALL produzir exatamente o mesmo resultado visual e comportamental que produzia antes da integração.

**Validates: Requirements 3.1, 3.2, 3.3**

---

## Fix Implementation

### Changes Required

#### Arquivo: `src/lib/api.ts` _(criado do zero)_

**Responsabilidade**: Cliente HTTP tipado, único ponto de contato com `https://api.reidoscanais.st`.

**Estrutura:**
1. **Tipos exportados**: `ApiChannel`, `ApiSportEvent`, `ApiEmbed`, `ApiEpg`, `ApiEpgEntry`, `ApiEpgNextEntry`, `ApiCategory`, `ApiSearchResult`, `ApiChannelStatus`, `ApiSportStatus`.
2. **`apiFetch<T>(path, init?)`**: Helper genérico que prefixa `BASE_URL`, seta `Accept: application/json` e lança `Error` em respostas não-OK.
3. **Funções de fetch por recurso**:
   - `fetchChannels(params: ChannelsParams)` → `GET /channels?category=&search=&limit=&offset=`
   - `fetchChannel(id: string)` → `GET /channels/:id`
   - `fetchChannelCategories()` → `GET /channels/categories`
   - `fetchSports(params: SportsParams)` → `GET /sports?status=&category=&search=&limit=&offset=`
   - `fetchSportCategories()` → `GET /sports/categories`
   - `fetchSearch(q: string)` → `GET /search?q=`
4. **UI helpers**:
   - `SPORT_STATUS_LABEL` — mapa `satisfies Record<ApiSportStatus, string>` → labels PT-BR.
   - `ALL_SPORT_STATUS_LABELS` — array dos três labels para uso nos tabs.
   - `formatEventTime(isoString)` — converte `"YYYY-MM-DD HH:mm:ss"` (UTC) para hora local `"HH:mm"` via `Date` + `toLocaleTimeString("pt-BR")`.

**Decisão de design — tratamento de UTC:**
A API retorna `start_time` como string `"YYYY-MM-DD HH:mm:ss"` sem indicador de timezone. A função `formatEventTime` adiciona o sufixo `"T...Z"` antes de construir o `Date`, forçando a interpretação como UTC e garantindo a conversão correta para o horário local do browser.

---

#### Arquivo: `src/hooks/use-api.ts` _(criado do zero)_

**Responsabilidade**: Hooks React Query que encapsulam cada recurso da API com políticas de cache adequadas.

| Hook | Endpoint | `staleTime` | `refetchInterval` |
|---|---|---|---|
| `useChannels(params)` | `fetchChannels` | 60 s | — |
| `useChannel(id)` | `fetchChannel` | 60 s | — |
| `useChannelCategories()` | `fetchChannelCategories` | 10 min | — |
| `useSports(params)` | `fetchSports` | 30 s | 30 s se `hasLive` |
| `useSportCategories()` | `fetchSportCategories` | 10 min | — |
| `useSearch(query)` | `fetchSearch` | 30 s | — (enabled quando `query.trim().length >= 2`) |

**Decisão de design — auto-refresh de eventos ao vivo:**
`useSports` usa `refetchInterval` dinâmico: retorna `30_000` ms apenas quando há ao menos um evento com `status === "live"`, evitando polling desnecessário quando não há partidas em andamento.

---

#### Arquivo: `src/components/player-modal.tsx` _(criado do zero)_

**Responsabilidade**: Modal de player de streaming, agnóstico ao tipo de conteúdo (canal ou evento esportivo).

**Props**: `{ title: string, embeds: ApiEmbed[], onClose: () => void }`

**Comportamento:**
- Renderiza `<iframe>` com `embed_url` do embed selecionado; usa `key={embed_url}` para forçar remount ao trocar de fonte.
- Seletor de servidores exibido apenas quando `embeds.length > 1`.
- Fecha via tecla Escape (listener em `document`) ou clique no backdrop (detectado por `e.target === overlayRef.current`).
- Bloqueia scroll do body durante abertura (`document.body.style.overflow = "hidden"`), restaurado via cleanup do `useEffect`.
- `role="dialog"` + `aria-modal="true"` + `aria-label` para acessibilidade.

---

#### Arquivo: `src/components/channel-card.tsx` _(atualizado)_

**Mudanças em relação ao mock:**
- Prop alterada de tipo local para `ApiChannel`.
- Logo centralizado sobre fundo `bg-card` (substitui thumbnail de vídeo estático).
- Badge "LIVE" sempre visível (todos os canais da API estão ao vivo).
- Botão de play renderizado condicionalmente via `channel.embeds.length > 0`; ao clicar, abre `PlayerModal`.
- Programa atual (`channel.epg?.current?.title`) e próximo (`channel.epg?.next?.title`) exibidos com encadeamento opcional seguro.

---

#### Arquivo: `src/routes/canais.tsx` _(atualizado)_

**Mudanças:**
- Substituiu lista mockada por `useChannels(params)` + `useChannelCategories()`.
- Filtro por categoria: passa `category` nos params da query, delegando a filtragem ao servidor.
- Busca textual: passa `search` nos params — filtro server-side, sem debounce adicional (React Query deduplica por `queryKey`).
- Estados de `isLoading` / `isError` com retry button e spinner `Loader2`.
- Contador dinâmico de resultados (`channels.length`).
- Suporte a query param `?categoria=X` via `validateSearch` do TanStack Router para deep-linking.

---

#### Arquivo: `src/routes/agenda.tsx` _(atualizado)_

**Mudanças:**
- Substituiu eventos mockados por `useSports(params)`.
- Tabs mapeados por `labelToApiStatus` (reverso de `SPORT_STATUS_LABEL`) para passar o parâmetro correto à API.
- Filtro textual client-side sobre o resultado da API (title + competition + category), via `useMemo`.
- `isLoading` / `isError` com estados visuais e retry.
- Botão "Assistir" abre `PlayerModal` com `embeds` do evento; renderizado condicionalmente via `event.embeds.length > 0`.

---

#### Arquivo: `src/routes/index.tsx` _(atualizado)_

**Mudanças:**
- `HeroSection` usa `channels[0]` (primeiro canal com embed) da API; exibe `epg.current.title` como headline.
- Hero player: se `VITE_PLAYER_EMBED_URL` estiver definido no env, renderiza iframe estático; caso contrário, exibe logo do canal hero.
- `LiveNowSection` exibe os primeiros 3 canais retornados pela API com dados de EPG.
- `ExploreSection` mantém as categorias hardcoded como links de navegação para `/canais?categoria=X` (não consome a API — as categorias são estáveis).
- `SportsSection` usa `useSports({ limit: 10 })`; botão de play abre `PlayerModal`.
- `ScheduleSection` extrai horários de `channel.epg.current` dos primeiros 4 canais.

---

#### Arquivo: `src/components/pulso-shell.tsx` _(atualizado)_

**Mudanças:**
- Integrou `useSearch(query)` do hook; resultados separados em `channelResults` e `sportResults`.
- Overlay de busca exibe seções "Canais e programas" e "Eventos esportivos" com links para `/canais` e `/agenda`.
- `enabled` quando `query.trim().length >= 2` (evita chamadas com 0 ou 1 caractere).
- Spinner `Loader2` no ícone de busca quando `isFetching`.
- Fecha overlay e limpa query ao navegar (via `useEffect` em `pathname`).
- Badge "AO VIVO" no header para sinalização de estado da plataforma.

---

#### Arquivo: `src/lib/pulso-data.ts` _(reduzido)_

**Mudança**: Removidos todos os dados mockados de canais e eventos. Mantido apenas o objeto `images` com os 4 assets de imagem (`stadiumImage`, `newsroomImage`, `cinemaImage`, `kidsImage`) usados por `disney.tsx`.

---

## Testing Strategy

### Validation Approach

A estratégia segue duas fases: primeiro, verificar que o bug original (dados mockados) foi eliminado, confirmando que dados reais da API são exibidos; depois, verificar que nenhum comportamento preexistente foi quebrado.

### Exploratory Bug Condition Checking

**Goal**: Confirmar que a aplicação com dados mockados (antes da integração) falhava em exibir dados reais.

**Test Plan**: Mockar o módulo `src/lib/pulso-data.ts` como fonte de dados e verificar que nenhum resultado real é retornado. Rodar nos testes unitários sobre o código pré-integração.

**Test Cases**:
1. **Canal sem EPG**: Renderizar `ChannelCard` com dado mockado e verificar que `epg.current.title` retorna `null` (confirma ausência de dados reais).
2. **Agenda sem status ao vivo**: Renderizar `AgendaPage` com dados mockados e verificar que nenhum evento tem `status === "live"` (confirma dados estáticos).
3. **Busca sem resultados**: Digitar query no shell e verificar que `useSearch` nunca é chamado (confirma ausência de integração).
4. **Player sem embeds**: Verificar que botão "Assistir" não aparece em `ChannelCard` com mock (confirma campo `embeds` ausente).

**Expected Counterexamples**:
- Nenhum evento com `status === "live"` em dados mockados.
- Campo `embeds` ausente ou vazio em dados mockados.
- `useSearch` nunca disparado com dados mockados.

---

### Fix Checking

**Goal**: Verificar que para todas as condições de bug (dados mockados), a aplicação corrigida produz dados reais da API.

**Pseudocode:**
```
FOR ALL page IN [HomePage, CanaisPage, AgendaPage, PulsoShell] DO
  result := render(page_with_api_integration)
  ASSERT result.dataSource == "https://api.reidoscanais.st"
  ASSERT result.channelCount >= 1
  ASSERT expectedBehavior(result)
END FOR
```

**Função `expectedBehavior`:**
```
FUNCTION expectedBehavior(renderResult)
  INPUT: renderResult — saída de renderização de um componente integrado
  OUTPUT: boolean

  RETURN renderResult.channels COMES_FROM_API
         AND renderResult.epg IS_NOT_NULL
         AND renderResult.embeds.length >= 0
         AND renderResult.playerModal CAN_OPEN
         AND renderResult.search RETURNS_API_RESULTS
END FUNCTION
```

---

### Preservation Checking

**Goal**: Verificar que interações não relacionadas à API produzem o mesmo resultado antes e depois da integração.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalBehavior(input) == fixedBehavior(input)
END FOR
```

**Testing Approach**: Property-based testing é recomendado para gerar variações de estado de UI (menu aberto/fechado, diferentes tabs selecionadas) e verificar que o comportamento visual permanece idêntico.

**Test Cases**:
1. **Navegação**: Clicar nos links do nav deve navegar para as rotas corretas — independente de dados da API.
2. **Menu mobile**: Abrir/fechar hambúrguer deve funcionar com ou sem dados carregados.
3. **PlayerModal — Escape**: Pressionar Escape deve fechar o modal em qualquer contexto (canal ou evento).
4. **PlayerModal — backdrop**: Clicar fora do modal deve fechá-lo.
5. **Página Disney**: Renderizar `/disney` não deve ser afetado pela integração (sem chamadas de API nessa página).
6. **Seletor de servidores**: Com múltiplos embeds, alternar entre servidores deve atualizar o iframe (verificado por `key={embed_url}`).

---

### Unit Tests

- Testar `formatEventTime` com strings UTC em vários fusos horários.
- Testar `SPORT_STATUS_LABEL` e `labelToApiStatus` para garantir bijeção correta.
- Testar `apiFetch` com respostas de erro HTTP (400, 404, 500) para garantir que lança `Error`.
- Testar `ChannelCard` com `embeds: []` — botão de play não deve aparecer.
- Testar `ChannelCard` com `embeds: [...]` — botão de play deve aparecer e abrir `PlayerModal`.
- Testar `PlayerModal` com `embeds.length === 1` — seletor de servidores não deve aparecer.
- Testar `PlayerModal` com `embeds.length > 1` — seletor deve aparecer e trocar o iframe ao clicar.

### Property-Based Tests

- Gerar arrays aleatórios de `ApiEmbed` e verificar que `PlayerModal` sempre renderiza sem crash, independente do tamanho.
- Gerar strings de tempo aleatórias em formato `"YYYY-MM-DD HH:mm:ss"` e verificar que `formatEventTime` sempre retorna uma string no formato `"HH:MM"` sem lançar exceção.
- Gerar arrays aleatórios de `ApiChannel` e verificar que `ChannelCard` renderiza corretamente para qualquer combinação de `epg: null`, `embeds: []`, etc.
- Verificar que para qualquer `ApiSportStatus`, `SPORT_STATUS_LABEL[status]` retorna uma string não-vazia.

### Integration Tests

- Testar fluxo completo: API mockada → `useChannels` → `ChannelCard` → botão play → `PlayerModal` aberto com embeds corretos.
- Testar fluxo de busca: digitar query no shell → `useSearch` chamado → resultados exibidos → clicar resultado navega corretamente.
- Testar filtro de categoria em `/canais`: selecionar categoria → `useChannels` chamado com parâmetro correto → grid atualizado.
- Testar auto-refresh de eventos ao vivo: `useSports` com evento `live` deve configurar `refetchInterval` de 30 s; sem evento live, `refetchInterval` deve ser `false`.
- Testar deep-link `?categoria=Esportes` em `/canais`: categoria deve ser pré-selecionada na chegada à página.
