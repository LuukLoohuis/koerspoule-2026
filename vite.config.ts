import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

const SITE = "https://koerspoule.nl";

// Per-route head-meta voor de meta-snapshots. Spiegelt src/components/RouteSeo.tsx
// (die zet hetzelfde client-side via react-helmet). Alleen publieke, indexeerbare
// routes — geen auth/admin/data-routes.
const ROUTE_META: Record<string, { title: string; description: string }> = {
  "/giro-italia-poule-2026": {
    title: "Giro d'Italia poule 2026 — gratis meedoen | Koerspoule",
    description:
      "Doe gratis mee met de Giro d'Italia poule 2026. Stel je ploeg samen, daag vrienden uit en strijd om de roze trui.",
  },
  "/team-samenstellen": {
    title: "Stel je team samen | Koerspoule",
    description:
      "Bouw jouw Giro-ploeg: kies per categorie, voeg jokers toe en doe GC-voorspellingen voor extra punten.",
  },
  "/uitslagen": {
    title: "Uitslagen & puntenverdeling | Koerspoule",
    description:
      "Bekijk etappe-uitslagen, puntenverdeling per ploeg en de heatmap van populaire renners in de Koerspoule.",
  },
  "/mijn-peloton": {
    title: "Mijn Peloton — jouw team & subpoule | Koerspoule",
    description:
      "Persoonlijk dashboard met je team, palmares, subpoulestand en head-to-head vergelijking met vrienden.",
  },
  "/regels": {
    title: "Koersreglement & puntentelling | Koerspoule",
    description:
      "Spelregels, deadlines en puntentelling van Koerspoule — hoe werken categorieën, jokers en klassementen?",
  },
  "/juridisch": {
    title: "Juridisch, privacy & cookies | Koerspoule",
    description: "Privacyverklaring, cookieverklaring en gebruiksvoorwaarden van Koerspoule.",
  },
};

const escapeAttr = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Schrijft na de build per publieke route een dist/<route>/index.html: een kopie
 * van het hoofd-index.html waarin alleen de <head>-meta (title/description/OG/
 * canonical) is aangepast. De <body> en alle scripts blijven identiek, dus React
 * mount precies zoals altijd — geen SSR, geen hydration, geen Chromium. Doel:
 * non-JS social-/crawl-bots krijgen de juiste per-route meta i.p.v. de homepage.
 */
function metaSnapshots(): Plugin {
  return {
    name: "koerspoule-meta-snapshots",
    apply: "build",
    closeBundle() {
      const distDir = path.resolve(__dirname, "dist");
      const baseFile = path.join(distDir, "index.html");
      if (!fs.existsSync(baseFile)) return;
      const base = fs.readFileSync(baseFile, "utf-8");

      for (const [route, meta] of Object.entries(ROUTE_META)) {
        const url = `${SITE}${route}`;
        const title = escapeAttr(meta.title);
        const desc = escapeAttr(meta.description);

        const html = base
          .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
          .replace(
            /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
            `<meta name="description" content="${desc}">`,
          )
          .replace(
            /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
            `<meta property="og:title" content="${title}" />`,
          )
          .replace(
            /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
            `<meta property="og:description" content="${desc}" />`,
          )
          .replace(
            /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
            `<meta property="og:url" content="${url}" />`,
          )
          .replace(
            /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
            `<meta name="twitter:title" content="${title}" />`,
          )
          .replace(
            /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/,
            `<meta name="twitter:description" content="${desc}" />`,
          )
          .replace(
            /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
            `<link rel="canonical" href="${url}" />`,
          );

        const outDir = path.join(distDir, route.replace(/^\//, ""));
        fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(path.join(outDir, "index.html"), html, "utf-8");
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    allowedHosts: [],
    hmr: {
      overlay: false,
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
  },
  plugins: [react(), metaSnapshots()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
