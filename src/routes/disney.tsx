import { createFileRoute, Link } from "@tanstack/react-router";
import { Clapperboard, Construction } from "lucide-react";

export const Route = createFileRoute("/disney")({
  head: () => ({
    meta: [
      { title: "Disney+ em breve | Pulso TV" },
      {
        name: "description",
        content: "Canais Disney+ em manutenção no Pulso TV. Em breve.",
      },
      { property: "og:title", content: "Disney+ em breve | Pulso TV" },
      {
        property: "og:description",
        content: "Canais Disney+ em manutenção no Pulso TV. Em breve.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DisneyPage,
});

function DisneyPage() {
  return (
    <div className="page-container py-8 lg:py-12">
      <header className="grid gap-6 border-b border-border pb-8 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7">
          <p className="section-kicker flex items-center gap-2 text-primary">
            <Clapperboard className="size-3.5" aria-hidden="true" />
            Disney+
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">Em breve.</h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            A grade Disney+ está em manutenção. Voltamos assim que os canais estiverem disponíveis
            de novo.
          </p>
        </div>
      </header>

      <div className="py-20 text-center">
        <Construction className="mx-auto size-10 text-primary" aria-hidden="true" />
        <h2 className="mt-5 font-display text-xl font-semibold">Em manutenção</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sem canais Disney+ no momento. Enquanto isso, acompanhe a grade e a agenda.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm">
          <Link to="/canais" className="text-primary underline-offset-4 hover:underline">
            Ver canais
          </Link>
          <Link to="/agenda" className="text-muted-foreground hover:text-foreground">
            Ir à agenda
          </Link>
        </div>
      </div>
    </div>
  );
}
