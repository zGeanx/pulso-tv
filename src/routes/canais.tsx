import { createFileRoute } from "@tanstack/react-router";
import { Layers3, Loader2, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { ChannelCard } from "@/components/channel-card";
import { useChannels, useChannelCategories } from "@/hooks/use-api";

type ChannelSearch = { categoria?: string | undefined };

export const Route = createFileRoute("/canais")({
  validateSearch: (search: Record<string, unknown>): ChannelSearch => ({
    categoria:
      typeof search["categoria"] === "string" ? (search["categoria"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Canais — Pulso TV" },
      { name: "description", content: "Explore a grade completa de canais do Pulso TV." },
      { property: "og:title", content: "Canais — Pulso TV" },
      {
        property: "og:description",
        content: "Explore a grade completa de canais do Pulso TV.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChannelsPage,
});

const ALL_LABEL = "Todos";

function ChannelsPage() {
  const search = Route.useSearch();

  const { data: apiCategories = [] } = useChannelCategories();
  const categoryNames = useMemo(
    () => [ALL_LABEL, ...apiCategories.map((c) => c.name)],
    [apiCategories],
  );

  const initialCategory =
    search.categoria && categoryNames.includes(search.categoria) ? search.categoria : ALL_LABEL;

  const [category, setCategory] = useState(initialCategory);
  const [query, setQuery] = useState("");

  const channelsParams: import("@/lib/api").ChannelsParams = {};
  if (category !== ALL_LABEL) channelsParams.category = category;
  if (query.trim()) channelsParams.search = query.trim();

  const { data: channels = [], isLoading, isError, refetch } = useChannels(channelsParams);

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 md:px-8 lg:py-12">
      <header className="grid gap-6 border-b border-border pb-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="section-kicker flex items-center gap-2 text-primary">
            <Layers3 className="size-3.5" aria-hidden="true" />
            Catálogo
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">
            Todos os sinais,
            <br />
            em um só lugar.
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Canais abertos, filmes, notícias, esportes e programação infantil em uma grade viva.
          </p>
        </div>
        <label className="flex h-12 items-center gap-3 self-end border-b border-border lg:col-span-5">
          <Search className="shrink-0 text-primary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
            placeholder="Buscar canal ou programa"
          />
        </label>
      </header>

      {/* Category tabs */}
      <div className="py-6">
        <div className="hidden flex-wrap items-center gap-x-6 gap-y-3 md:flex" role="tablist">
          <SlidersHorizontal className="size-4 text-primary" aria-hidden="true" />
          {categoryNames.map((item) => (
            <button
              key={item}
              role="tab"
              aria-selected={category === item}
              onClick={() => setCategory(item)}
              className={`border-b-2 pb-2 text-sm transition-colors ${
                category === item
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-11 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground md:hidden"
          aria-label="Filtrar categoria"
        >
          {categoryNames.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between border-b border-border pb-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <Layers3 className="size-5 text-primary" aria-hidden="true" />
          {category}
        </h2>
        {!isLoading && (
          <span className="text-xs uppercase text-muted-foreground">
            {channels.length} {channels.length === 1 ? "resultado" : "resultados"}
          </span>
        )}
      </div>

      {/* States */}
      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-8 animate-spin text-primary" aria-label="Carregando canais" />
        </div>
      )}

      {isError && (
        <div className="py-20 text-center">
          <h2 className="font-display text-xl font-semibold">
            Não foi possível carregar os canais
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Verifique sua conexão e tente novamente.
          </p>
          <button
            onClick={() => refetch()}
            className="mt-4 text-sm text-primary underline-offset-4 hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!isLoading && !isError && channels.length > 0 && (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {channels.map((channel) => (
            <ChannelCard key={channel.id} channel={channel} />
          ))}
        </div>
      )}

      {!isLoading && !isError && channels.length === 0 && (
        <div className="py-20 text-center">
          <h2 className="font-display text-xl font-semibold">Nenhum canal encontrado</h2>
          <p className="mt-2 text-sm text-muted-foreground">Tente outro termo ou categoria.</p>
        </div>
      )}
    </div>
  );
}
