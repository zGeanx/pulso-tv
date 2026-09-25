import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, Home, Loader2, Menu, Search, Sparkles, Tv, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { MediaImage } from "@/components/media-image";
import { ThemeToggle } from "@/components/theme-toggle";
import { useSearch } from "@/hooks/use-api";
import { formatEventTime, SPORT_STATUS_LABEL } from "@/lib/api";

const navItems = [
  { to: "/" as const, label: "Início", icon: Home },
  { to: "/canais" as const, label: "Canais", icon: Tv },
  { to: "/agenda" as const, label: "Agenda", icon: CalendarDays },
  { to: "/disney" as const, label: "Disney+", icon: Sparkles },
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    setSearchOpen(false);
    setQuery("");
  }, [pathname]);

  useEffect(() => {
    if (!searchOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
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
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 lg:hidden"
              onClick={() => setMobileOpen((open) => !open)}
              aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            >
              {mobileOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </div>

        {mobileOpen && (
          <nav
            className="grid grid-cols-4 border-t border-border bg-background px-2 py-2 lg:hidden"
            aria-label="Navegação mobile"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`mobile-nav ${pathname === item.to ? "mobile-nav-active" : ""}`}
                >
                  <Icon />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      {searchOpen && (
        <div
          className="fixed inset-0 z-50 bg-background/98 px-4 pt-4 backdrop-blur-xl md:pt-16"
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
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11"
                onClick={() => {
                  setSearchOpen(false);
                  setQuery("");
                }}
                aria-label="Fechar busca"
              >
                <X />
              </Button>
            </div>

            {!query && (
              <p className="py-8 text-sm text-muted-foreground">
                Digite para pesquisar em toda a programação do Pulso TV.
              </p>
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
                      <span className="w-14 shrink-0 font-display text-sm tabular-nums text-primary">
                        {formatEventTime(item)}
                      </span>
                      <span className="min-w-0">
                        <strong className="block truncate">{item.title}</strong>
                        <small className="text-muted-foreground">{item.competition}</small>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {SPORT_STATUS_LABEL[item.status]}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      )}

      <main>{children}</main>

      <footer className="border-t border-border">
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
    </div>
  );
}
