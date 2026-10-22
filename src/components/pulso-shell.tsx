import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, Clapperboard, Home, Loader2, Search, Tv, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { MediaImage } from "@/components/media-image";
import { TeamCrest } from "@/components/team-crest";
import { ThemeToggle } from "@/components/theme-toggle";
import { useSearch } from "@/hooks/use-api";
import { formatEventDay, formatEventTime, SPORT_STATUS_LABEL } from "@/lib/api";

const navItems = [
  { to: "/" as const, label: "Início", icon: Home },
  { to: "/canais" as const, label: "Canais", icon: Tv },
  { to: "/agenda" as const, label: "Agenda", icon: CalendarDays },
  { to: "/disney" as const, label: "Disney+", icon: Clapperboard },
];

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" aria-label="Pulso TV — início" className="font-display font-bold text-foreground">
      <span className={compact ? "text-lg" : "text-2xl"}>PULSO</span>
      <span className="text-primary">·</span>
      <span className={compact ? "text-lg" : "text-2xl"}>TV</span>
    </Link>
  );
}

export function PulsoShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setSearchOpen(false);
    setQuery("");
  }, [pathname]);

  useEffect(() => {
    function onGlobalKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isEditing =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
        return;
      }

      if (e.key === "/" && !isEditing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }

      if (e.key === "Escape" && searchOpen) {
        e.preventDefault();
        setSearchOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("keydown", onGlobalKeyDown);
    return () => document.removeEventListener("keydown", onGlobalKeyDown);
  }, [searchOpen]);

  const { data: results, isFetching } = useSearch(query);

  const channelResults = results?.channels?.slice(0, 5) ?? [];
  const sportResults = results?.events?.slice(0, 5) ?? [];
  const noResults =
    query.trim().length >= 2 &&
    !isFetching &&
    channelResults.length === 0 &&
    sportResults.length === 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="page-container flex h-16 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-8">
            <Brand />
            <nav className="hidden items-center gap-6 lg:flex" aria-label="Navegação principal">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`nav-link flex items-center gap-2 ${pathname === item.to ? "nav-link-active" : ""}`}
                  >
                    <Icon className="size-3.5" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="search"
              className="hidden w-80 justify-start md:inline-flex"
              onClick={() => setSearchOpen(true)}
              aria-label="Abrir busca global"
            >
              <Search />
              <span className="truncate">Buscar canais e eventos</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 md:hidden"
              onClick={() => setSearchOpen(true)}
              aria-label="Abrir busca"
            >
              <Search />
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {searchOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-background/98 px-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-[calc(3rem+env(safe-area-inset-bottom,0px))] backdrop-blur-xl md:pt-16"
          role="dialog"
          aria-modal="true"
          aria-label="Busca global"
        >
          <div className="mx-auto max-w-3xl">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-primary pb-4">
              <label className="flex min-w-0 items-center gap-3">
                {isFetching ? (
                  <Loader2 className="size-5 shrink-0 animate-spin text-primary" />
                ) : (
                  <Search className="shrink-0 text-primary" />
                )}
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Canal, programa, evento, time ou esporte"
                  aria-label="Buscar canais, programas e eventos"
                  className="w-full bg-transparent font-display text-lg text-foreground outline-none placeholder:text-muted-foreground md:text-2xl"
                />
              </label>
              <div className="flex items-center gap-2">
                <kbd className="desktop-kbd hidden sm:inline-flex">ESC</kbd>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => {
                    setSearchOpen(false);
                    setQuery("");
                  }}
                  aria-label="Fechar busca"
                >
                  <X className="size-4.5" />
                </Button>
              </div>
            </div>

            {!query && (
              <div className="py-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Buscas populares
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    "Sportv",
                    "ESPN",
                    "Premiere",
                    "CazéTV",
                    "Brasileirão",
                    "Champions League",
                    "Flamengo",
                    "Corinthians",
                    "Real Madrid",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setQuery(suggestion)}
                      className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary active:scale-95"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
                <p className="mt-6 text-xs text-muted-foreground">
                  Ou digite o nome de qualquer time, emissora ou campeonato.
                </p>
              </div>
            )}

            {query.trim().length === 1 && (
              <p className="py-8 text-sm text-muted-foreground">
                Continue digitando para ver resultados…
              </p>
            )}

            {noResults && (
              <div className="py-12">
                <p className="font-display text-xl font-semibold">Nenhum resultado</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Tente outro canal, evento, time ou categoria.
                </p>
              </div>
            )}

            {channelResults.length > 0 && (
              <section className="py-6">
                <h2 className="section-kicker">Canais e programas</h2>
                <div className="mt-3 divide-y divide-border">
                  {channelResults.map((item) => (
                    <Link
                      key={item.id}
                      to="/canal/$channelId"
                      params={{ channelId: item.id }}
                      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-4"
                    >
                      <div className="logo-box h-10 w-14">
                        <MediaImage
                          src={item.logo_url}
                          alt={item.name}
                          className="h-full w-full bg-transparent"
                          imgClassName="logo-box-img"
                        />
                      </div>
                      <span className="min-w-0">
                        <strong className="block truncate">{item.name}</strong>
                        <small className="block truncate text-muted-foreground">
                          {item.epg?.current?.title ?? ""} · {item.category}
                        </small>
                      </span>
                      {item.epg?.current && (
                        <span className="status-label status-live text-[10px]">
                          <span className="live-dot" />
                          AO VIVO
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {sportResults.length > 0 && (
              <section className="py-6">
                <h2 className="section-kicker">Eventos esportivos</h2>
                <div className="mt-3 divide-y divide-border">
                  {sportResults.map((item) => (
                    <Link
                      key={item.id}
                      to="/evento/$eventId"
                      params={{ eventId: item.id }}
                      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-4"
                    >
                      <span className="w-16 shrink-0">
                        <span className="block font-display text-sm tabular-nums text-primary">
                          {formatEventTime(item)}
                        </span>
                        <span className="block text-[11px] capitalize text-muted-foreground">
                          {formatEventDay(item)}
                        </span>
                      </span>
                      <span className="flex min-w-0 items-center gap-3">
                        {item.teams ? (
                          <span className="flex shrink-0 items-center gap-1">
                            <TeamCrest
                              name={item.teams.home.name}
                              logo={item.teams.home.logo}
                              logos={item.teams.home.logos}
                              className="h-7 w-7"
                            />
                            <TeamCrest
                              name={item.teams.away.name}
                              logo={item.teams.away.logo}
                              logos={item.teams.away.logos}
                              className="h-7 w-7"
                            />
                          </span>
                        ) : null}
                        <span className="min-w-0">
                          <strong className="block truncate">{item.title}</strong>
                          <small className="text-muted-foreground">{item.competition}</small>
                        </span>
                      </span>
                      {item.status === "live" ? (
                        <span className="status-label status-live text-[10px]">
                          <span className="live-dot" />
                          AO VIVO
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {SPORT_STATUS_LABEL[item.status as keyof typeof SPORT_STATUS_LABEL] ??
                            "Agendado"}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      )}

      <main className="pb-16 lg:pb-0">{children}</main>

      <footer className="border-t border-border pb-20 lg:pb-8">
        <div className="page-container grid gap-x-8 gap-y-4 py-8 text-xs text-muted-foreground sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <Brand compact />
          <nav className="flex flex-wrap gap-5 sm:justify-end" aria-label="Navegação do rodapé">
            <Link to="/canais">Canais</Link>
            <Link to="/agenda">Agenda</Link>
            <Link to="/disney">Disney+</Link>
          </nav>
          <p className="max-w-3xl leading-relaxed">
            A Pulso TV não hospeda nem armazena conteúdos. Os links são encontrados publicamente na
            internet e apenas incorporamos conteúdos hospedados por terceiros.
          </p>
          <p className="sm:text-right">© 2026 // Todos os direitos reservados</p>
        </div>
      </footer>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-border bg-background/95 px-2 backdrop-blur-lg pb-[env(safe-area-inset-bottom,0px)] lg:hidden"
        aria-label="Navegação mobile"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`mobile-nav ${isActive ? "mobile-nav-active" : ""}`}
            >
              <Icon />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
