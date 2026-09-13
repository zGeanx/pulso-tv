"use client";

import { useEffect, useState } from "react";
import { SearchIcon, SunIcon, MoonIcon, BrandIcon } from "./icons";

type SiteHeaderProps = {
  active?: "/" | "/canais" | "/agenda" | "/disneyplus";
  searchValue?: string;
  onSearchChange?: (value: string) => void;
};

const navigation = [
  { href: "/", label: "Início" },
  { href: "/canais", label: "Canais" },
  { href: "/agenda", label: "Agenda" },
  { href: "/disneyplus", label: "Disney+" },
] as const;

export function ThemeToggle({
  theme,
  onThemeChange,
}: {
  theme: "dark" | "light";
  onThemeChange: (theme: "dark" | "light") => void;
}) {
  return (
    <div className="theme-switch-segmented" role="radiogroup" aria-label="Alternar tema de cores">
      <button
        type="button"
        className={`theme-segment${theme === "light" ? " active" : ""}`}
        onClick={() => onThemeChange("light")}
        aria-label="Modo Claro"
        title="Modo Claro"
        role="radio"
        aria-checked={theme === "light"}
      >
        <SunIcon style={{ width: 16, height: 16 }} />
      </button>

      <button
        type="button"
        className={`theme-segment${theme === "dark" ? " active" : ""}`}
        onClick={() => onThemeChange("dark")}
        aria-label="Modo Escuro"
        title="Modo Escuro"
        role="radio"
        aria-checked={theme === "dark"}
      >
        <MoonIcon style={{ width: 16, height: 16 }} />
      </button>
    </div>
  );
}

export function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <a className={`brand${footer ? " footer-brand" : ""}`} href="/" aria-label="Pulso TV, página inicial">
      <span className="brand-logo-wrap">
        <BrandIcon />
      </span>
      <span>PULSO<span>TV</span></span>
    </a>
  );
}

export function SiteHeader({ active, searchValue, onSearchChange }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    return localStorage.getItem("pulso_theme") === "light" ? "light" : "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("pulso_theme", theme);
  }, [theme]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 12);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`site-header${scrolled ? " scrolled" : ""}`}>
      <Brand />

      <nav className={menuOpen ? "nav open" : "nav"} aria-label="Principal">
        {navigation.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={active === item.href ? "active" : undefined}
            aria-current={active === item.href ? "page" : undefined}
            onClick={() => setMenuOpen(false)}
          >
            {item.label}
          </a>
        ))}

        <div className="mobile-nav-theme">
          <ThemeToggle theme={theme} onThemeChange={setTheme} />
        </div>
      </nav>

      <div className="header-actions">
        <form className="header-search" action="/canais" method="GET" role="search">
          <SearchIcon style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <input
            name="q"
            value={searchValue}
            onChange={onSearchChange ? (event) => onSearchChange(event.target.value) : undefined}
            placeholder="Buscar canal ou programa..."
            aria-label="Buscar canal ou programa"
          />
        </form>

        <div className="desktop-theme-toggle">
          <ThemeToggle theme={theme} onThemeChange={setTheme} />
        </div>

        <button
          className={`menu-toggle${menuOpen ? " open" : ""}`}
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Fechar menu de navegação" : "Abrir menu de navegação"}
          aria-expanded={menuOpen}
        >
          <span /><span /><span />
        </button>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer>
      <div className="page-shell footer-inner">
        <div className="footer-brand-column">
          <Brand footer />
          <p className="footer-disclaimer">
            A Pulso TV não armazena arquivos em seus servidores. Nosso site apenas indexa conteúdos de mídia hospedados por serviços de terceiros.
          </p>
          <span className="footer-copyright">
            © 2026 Pulso TV. Todos os direitos reservados.
          </span>
        </div>
        <nav aria-label="Rodapé">
          <a href="/">Início</a>
          <a href="/canais">Canais</a>
          <a href="/agenda">Agenda</a>
          <a href="/disneyplus">Disney+</a>
        </nav>
      </div>
    </footer>
  );
}
