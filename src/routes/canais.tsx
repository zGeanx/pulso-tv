import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Layers3, Search, SlidersHorizontal } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ChannelCard } from "@/components/channel-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useChannels, useChannelCategories } from "@/hooks/use-api";
import { filterChannels } from "@/lib/api";

type ChannelSearch = { categoria?: string | undefined };

export const Route = createFileRoute("/canais")({
  validateSearch: (search: Record<string, unknown>): ChannelSearch => ({
    categoria:
      typeof search["categoria"] === "string" ? (search["categoria"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Canais | Pulso TV" },
      { name: "description", content: "Explore a grade completa de canais do Pulso TV." },
      { property: "og:title", content: "Canais | Pulso TV" },
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
const PAGE_SIZE = 24;

function ChannelsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/canais" });

  const { data: apiCategories = [] } = useChannelCategories();
  const categoryNames = useMemo(
    () => [ALL_LABEL, ...apiCategories.map((c) => c.name)],
    [apiCategories],
  );

  const category =
    search.categoria &&
    (apiCategories.length === 0 || categoryNames.includes(search.categoria))
      ? search.categoria
      : ALL_LABEL;

  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const deferredQuery = useDeferredValue(query);

  const { data: channels = [], isLoading, isError, refetch } = useChannels();

  const counts = useMemo(() => {
    const map: Record<string, number> = { [ALL_LABEL]: channels.length };
    for (const channel of channels) {
      map[channel.category] = (map[channel.category] ?? 0) + 1;
    }
    return map;
  }, [channels]);

  const filtered = useMemo(() => {
    const byCategory =
      category === ALL_LABEL ? channels : channels.filter((ch) => ch.category === category);
    return filterChannels(byCategory, deferredQuery);
  }, [channels, category, deferredQuery]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [category, deferredQuery]);

  const visible = filtered.slice(0, visibleCount);

  function setCategory(next: string) {
    void navigate({
      search: { categoria: next === ALL_LABEL ? undefined : next },
      replace: true,
    });
  }

  return (
    <div className="page-container py-8 lg:py-12">
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
            aria-label="Buscar canal ou programa"
          />
        </label>
      </header>

      <div className="py-6">
        <div className="hidden items-center gap-x-6 overflow-x-auto md:flex" role="tablist">
          <SlidersHorizontal className="size-4 shrink-0 text-primary" aria-hidden="true" />
          {categoryNames.map((item) => (
            <button
              key={item}
              role="tab"
              aria-selected={category === item}
              onClick={() => setCategory(item)}
              className={`min-h-11 shrink-0 border-b-2 text-sm transition-colors ${
                category === item
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {item}
              <span className="ml-2 text-xs text-muted-foreground">{counts[item] ?? 0}</span>
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
            <option key={item} value={item}>
              {item} ({counts[item] ?? 0})
            </option>
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
            {filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}
          </span>
        )}
      </div>

      {isLoading && (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="border-b border-border pb-5">
              <Skeleton className="aspect-video w-full" />
              <Skeleton className="mt-3 h-5 w-2/3" />
              <Skeleton className="mt-2 h-4 w-1/2" />
            </div>
          ))}
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

      {!isLoading && !isError && filtered.length > 0 && (
        <>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((channel) => (
              <ChannelCard key={channel.id} channel={channel} />
            ))}
          </div>
          {visible.length < filtered.length && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                className="min-h-11 rounded-md border border-border px-5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                Mostrar mais
              </button>
            </div>
          )}
        </>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="py-20 text-center">
          <h2 className="font-display text-xl font-semibold">Nenhum canal encontrado</h2>
          <p className="mt-2 text-sm text-muted-foreground">Tente outro termo ou categoria.</p>
        </div>
      )}
    </div>
  );
}
