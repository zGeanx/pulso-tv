"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    return localStorage.getItem("pulso_theme") === "light" ? "light" : "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("pulso_theme", theme);
  }, [theme]);

  function setMode(newTheme: "dark" | "light") {
    setTheme(newTheme);
  }

  return (
    <div className="theme-switch-segmented" role="radiogroup" aria-label="Alternar tema de cores">
      <button
        type="button"
        className={`theme-segment${theme === "light" ? " active" : ""}`}
        onClick={() => setMode("light")}
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
        onClick={() => setMode("dark")}
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
    <Link className={`brand${footer ? " footer-brand" : ""}`} href="/" aria-label="Pulso TV, página inicial">
      <span className="brand-logo-wrap">
        <BrandIcon />
      </span>
      <span>PULSO<span>TV</span></span>
    </Link>
  );
}

export function SiteHeader({ active, searchValue, onSearchChange }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header">
      <Brand />

      <nav className={menuOpen ? "nav open" : "nav"} aria-label="Principal">
        {navigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={active === item.href ? "active" : undefined}
            aria-current={active === item.href ? "page" : undefined}
            onClick={() => setMenuOpen(false)}
          >
            {item.label}
          </Link>
        ))}
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

        <ThemeToggle />

        <button
          className="menu-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Abrir menu de navegação"
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
        <div>
          <Brand footer />
          <p>O sinal certo, na hora certa. Streaming e TV ao vivo sem complicação.</p>
        </div>
        <nav aria-label="Rodapé">
          <Link href="/">Início</Link>
          <Link href="/canais">Canais</Link>
          <Link href="/agenda">Agenda</Link>
          <Link href="/disneyplus">Disney+</Link>
        </nav>
        <span className="footer-note">Transmissões e eventos organizados em páginas próprias.</span>
      </div>
    </footer>
  );
}
