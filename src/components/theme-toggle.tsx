import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { applyTheme, readDocumentTheme, type Theme } from "@/lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(readDocumentTheme());
  }, []);

  const isLight = theme === "light";

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-11 w-11"
      onClick={() => {
        const next = isLight ? "dark" : "light";
        setTheme(next);
        applyTheme(next);
      }}
      aria-label={isLight ? "Ativar modo escuro" : "Ativar modo claro"}
      title={isLight ? "Modo escuro" : "Modo claro"}
    >
      {isLight ? <Moon /> : <Sun />}
    </Button>
  );
}
