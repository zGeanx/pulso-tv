export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "pulso-theme";

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("light", theme === "light");
  root.style.colorScheme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* private mode */
  }
}

export function readDocumentTheme(): Theme {
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="light"){document.documentElement.classList.add("light");document.documentElement.style.colorScheme="light";}else{document.documentElement.style.colorScheme="dark";}}catch(e){}})();`;
