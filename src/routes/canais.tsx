import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Layers3, Search, X } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ChannelCard } from "@/components/channel-card";
import { Button } from "@/components/ui/button";
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
      <header className="flex flex-col gap-6 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between lg:pb-8">
        <div>
          <p className="section-kicker flex items-center gap-2 text-primary">
            <Layers3 className="size-3.5" aria-hidden="true" />
            Catálogo de canais
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:mt-3 sm:text-5xl">
            Todos os sinais,
            <br />
            em um só lugar.
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:mt-4 sm:text-base">
            Canais abertos, filmes, notícias, esportes e programação infantil em uma grade viva.
          </p>
        </div>

        {/* Search input container */}
        <div className="w-full lg:max-w-md">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3.5 size-4 text-muted-foreground" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11 w-full rounded-xl border border-border/80 bg-card/60 pl-10 pr-9 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-primary focus:bg-card focus:ring-1 focus:ring-primary/40 sm:h-12"
              placeholder="Buscar canal ou programa..."
              aria-label="Buscar canal ou programa"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 rounded-md p-1 text-muted-foreground hover:bg-card hover:text-foreground cursor-pointer"
                aria-label="Limpar busca"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Category Pills & Filter Bar */}
      <div className="py-5 sm:py-6">
        <div
          className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none"
          role="tablist"
          aria-label="Categorias de canais"
        >
          {categoryNames.map((item) => {
            const isSelected = category === item;
            return (
              <button
                key={item}
                role="tab"
                aria-selected={isSelected}
                onClick={() => setCategory(item)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "bg-primary font-semibold text-primary-foreground shadow-sm shadow-primary/20 scale-[1.02]"
                    : "border border-border/80 bg-card/60 text-muted-foreground hover:border-primary/50 hover:bg-card hover:text-foreground"
                }`}
              >
                <span>{item}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 font-display text-[11px] tabular-nums ${
                    isSelected
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-secondary/80 text-muted-foreground"
                  }`}
                >
                  {counts[item] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between border-b border-border pb-3.5">
        <div className="flex items-center gap-2">
          <span className="font-display text-sm font-semibold text-foreground">
            {category === ALL_LABEL ? "Todos os canais" : category}
          </span>
          {deferredQuery && (
            <span className="text-xs text-muted-foreground">
              · filtrado por &ldquo;<span className="text-foreground font-medium">{deferredQuery}</span>&rdquo;
            </span>
          )}
        </div>
        {!isLoading && (
          <span className="font-display text-xs tabular-nums text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "canal" : "canais"}
          </span>
        )}
      </div>

      {isLoading && (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-border/70 bg-card/40">
              <Skeleton className="aspect-video w-full rounded-none" />
              <div className="p-4 space-y-2.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="pt-2 border-t border-border/30">
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
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
            className="mt-4 text-sm text-primary underline-offset-4 hover:underline cursor-pointer"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((channel) => (
              <ChannelCard key={channel.id} channel={channel} />
            ))}
          </div>
          {visible.length < filtered.length && (
            <div className="mt-10 flex flex-col items-center justify-center gap-2">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                className="rounded-xl border-border/80 bg-card/60 px-6 font-medium hover:border-primary/50 hover:bg-card cursor-pointer"
              >
                Carregar mais {Math.min(PAGE_SIZE, filtered.length - visible.length)} canais
              </Button>
              <span className="text-xs text-muted-foreground font-display tabular-nums">
                Exibindo {visible.length} de {filtered.length} canais
              </span>
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
