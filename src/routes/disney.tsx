import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useMemo } from "react";
import { ChannelCard } from "@/components/channel-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useChannels } from "@/hooks/use-api";
import { isDisneyChannel } from "@/lib/api";

export const Route = createFileRoute("/disney")({
  head: () => ({
    meta: [
      { title: "Disney+ | Pulso TV" },
      { name: "description", content: "Canais Disney+ no Pulso TV." },
      { property: "og:title", content: "Disney+ | Pulso TV" },
      { property: "og:description", content: "Canais Disney+ no Pulso TV." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DisneyPage,
});

function DisneyPage() {
  const { data: channels = [], isLoading, isError, refetch } = useChannels();
  const disneyChannels = useMemo(() => channels.filter(isDisneyChannel), [channels]);

  return (
    <div className="page-container py-8 lg:py-12">
      <header className="grid gap-6 border-b border-border pb-8 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7">
          <p className="section-kicker flex items-center gap-2 text-primary">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Disney+
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">
            Histórias da Disney+.
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Canais da grade Disney+ quando estiverem na programação do Pulso TV.
          </p>
        </div>
      </header>

      <div className="flex items-center justify-between border-b border-border py-6">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <Sparkles className="size-5 text-primary" aria-hidden="true" />
          Canais
        </h2>
        {!isLoading && (
          <span className="text-xs uppercase text-muted-foreground">
            {disneyChannels.length} {disneyChannels.length === 1 ? "resultado" : "resultados"}
          </span>
        )}
      </div>

      {isLoading && (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
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

      {!isLoading && !isError && disneyChannels.length > 0 && (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {disneyChannels.map((channel) => (
            <ChannelCard key={channel.id} channel={channel} />
          ))}
        </div>
      )}

      {!isLoading && !isError && disneyChannels.length === 0 && (
        <div className="py-20 text-center">
          <h2 className="font-display text-xl font-semibold">Nenhum canal Disney+ na grade</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A programação atual não lista canais Disney+.
          </p>
        </div>
      )}
    </div>
  );
}
