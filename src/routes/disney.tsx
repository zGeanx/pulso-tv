import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { images } from "@/lib/pulso-data";

export const Route = createFileRoute("/disney")({
  head: () => ({
    meta: [
      { title: "Disney+ | Pulso TV" },
      { name: "description", content: "Acesse a seleção Disney+ pelo Pulso TV." },
      { property: "og:title", content: "Disney+ | Pulso TV" },
      { property: "og:description", content: "Acesse a seleção Disney+ pelo Pulso TV." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DisneyPage,
});

function DisneyPage() {
  return (
    <div className="page-container py-8 lg:py-12">
      <section className="grid gap-8 lg:grid-cols-12">
        <div className="flex flex-col justify-center lg:col-span-5">
          <p className="section-kicker flex items-center gap-2 text-primary">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Seleção parceira
          </p>
          <h1 className="mt-3 font-display text-5xl font-bold">Disney+</h1>
          <p className="mt-4 max-w-md text-muted-foreground">
            Filmes, séries e histórias para toda a família em uma seleção integrada ao Pulso TV.
          </p>
          <p className="mt-8 border-t border-border pt-5 text-sm text-muted-foreground">
            A disponibilidade depende da sua assinatura Disney+.
          </p>
        </div>
        <img
          src={images.kidsImage}
          alt="Cenário colorido de programação infantil"
          width={1024}
          height={640}
          className="aspect-video w-full rounded-lg object-cover lg:col-span-7"
        />
      </section>
    </div>
  );
}
