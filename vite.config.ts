import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, type Plugin } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { PULSO_LOGO_ROUTE, PULSO_ORIGIN, pulsoLogoFile } from "./src/lib/pulso-assets";

/** Vite answers `<img>` with 404 before the app server. Proxy those crests first. */
function pulsoLogoDevProxy(): Plugin {
  return {
    name: "pulso-logo-proxy",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || (req.method !== "GET" && req.method !== "HEAD")) return next();
        const url = new URL(req.url, "http://localhost");
        if (url.pathname !== PULSO_LOGO_ROUTE) return next();
        const file = pulsoLogoFile(`/logos/${url.searchParams.get("path") ?? ""}`);
        if (!file) {
          res.statusCode = 400;
          res.end();
          return;
        }
        try {
          const upstream = await fetch(`${PULSO_ORIGIN}/logos/${file}`, {
            headers: { Accept: "image/*,*/*" },
          });
          res.statusCode = upstream.status;
          const contentType = upstream.headers.get("content-type");
          if (contentType) res.setHeader("content-type", contentType);
          if (upstream.ok) res.setHeader("cache-control", "public, max-age=86400");
          if (req.method === "HEAD") {
            res.end();
            return;
          }
          res.end(Buffer.from(await upstream.arrayBuffer()));
        } catch (error) {
          console.error(error);
          res.statusCode = 502;
          res.end();
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [
    pulsoLogoDevProxy(),
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
