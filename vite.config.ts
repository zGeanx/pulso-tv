import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart({
      // SSR entry is src/server.ts, which wraps TanStack Start's server handler.
      server: { entry: "server" },
    }),
    viteReact(),
    // Cloudflare worker output expected by scripts/cf-deploy.mjs.
    nitro({ preset: "cloudflare-module" }),
  ],
});
