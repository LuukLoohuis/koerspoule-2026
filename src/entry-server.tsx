import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { HelmetProvider, type HelmetServerState } from "react-helmet-async";
import App from "./App";

/**
 * SSR-entry voor de prerender van publieke marketing-routes (scripts/prerender.mjs).
 * Rendert de App onder een StaticRouter + HelmetProvider en geeft de HTML van #root
 * plus de verzamelde <head>-tags (title/meta/link/script) terug als string.
 */
export function render(url: string): { appHtml: string; head: string } {
  const helmetContext: { helmet?: HelmetServerState } = {};
  const appHtml = renderToString(
    <HelmetProvider context={helmetContext}>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </HelmetProvider>,
  );
  const h = helmetContext.helmet;
  const head = h
    ? [
        h.title.toString(),
        h.meta.toString(),
        h.link.toString(),
        h.script.toString(),
      ]
        .filter(Boolean)
        .join("\n    ")
    : "";
  return { appHtml, head };
}
