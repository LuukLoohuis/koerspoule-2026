// Prerender van de PUBLIEKE marketing-routes naar statische HTML.
//
// Draait ná `vite build` (client) + `vite build --ssr` (server-bundle). Voor elke
// route rendert het de App server-side, vervangt het SEO-blok tussen
// <!--seo:start--> en <!--seo:end--> door de per-pagina <head> (title/meta/link/
// JSON-LD via react-helmet-async) en injecteert het de HTML in #root. App-/auth-
// routes worden NIET geprerenderd; die houden de lege SPA-schil (dist/index.html).

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const distDir = join(root, "dist");
const serverEntry = join(root, "dist-server", "entry-server.js");

// Uitsluitend publieke marketing-routes — geen app/auth/data-routes.
const ROUTES = [
  "/",
  "/tour-de-france-poule-2026",
  "/giro-italia-poule-2026",
  "/regels",
  "/juridisch",
];

const SEO_RE = /<!--\s*seo:start[\s\S]*?seo:end\s*-->/;

function routeToFile(route) {
  if (route === "/") return join(distDir, "index.html");
  return join(distDir, route.replace(/^\//, ""), "index.html");
}

const { render } = await import(pathToFileURL(serverEntry).href);
const template = readFileSync(join(distDir, "index.html"), "utf-8");

// Lege SPA-schil voor de fallback (app/auth-routes). Zo krijgen niet-geprerenderde
// routes een leeg #root (client render) i.p.v. de geprerenderde homepage-content.
// vercel.json verwijst de catch-all-rewrite naar /app-shell.html.
writeFileSync(join(distDir, "app-shell.html"), template, "utf-8");

let ok = 0;
for (const route of ROUTES) {
  try {
    const { appHtml, head } = render(route);
    let html = template;
    if (SEO_RE.test(html)) {
      html = html.replace(SEO_RE, `<!--seo:start-->\n    ${head}\n    <!--seo:end-->`);
    } else {
      html = html.replace("</head>", `    ${head}\n  </head>`);
    }
    html = html.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);
    const outFile = routeToFile(route);
    mkdirSync(dirname(outFile), { recursive: true });
    writeFileSync(outFile, html, "utf-8");
    ok += 1;
    console.log(`prerendered ${route} -> ${outFile.replace(root + "/", "")}`);
  } catch (err) {
    console.error(`prerender FAILED for ${route}:`, err?.stack || err);
    process.exitCode = 1;
  }
}
console.log(`prerender done: ${ok}/${ROUTES.length} routes`);
// Forceer een schone exit: de supabase-client kan nog async timers hebben staan
// (auth/realtime) die de Node-prerender anders open houden of laten crashen.
process.exit(process.exitCode ?? 0);
