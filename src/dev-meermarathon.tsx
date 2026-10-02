/**
 * Visuele testbank voor de Meermarathon-schermen (niet in de router, niet in
 * de build). Rendert de echte componenten met nepdata, in licht en nacht,
 * zodat de opmaak te beoordelen is zonder database of inlog.
 *
 * Draaien: npx vite  →  /dev-meermarathon.html  (?scherm=1..14 of ?scherm=6,7, ?modus=nacht)
 * Scherm 2 (ploeg samenstellen) is weg: de Meermarathon gebruikt de gewone
 * ploegbouwer. Die staat met nepdata in /dev-ploegbouwer.html.
 */
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Scherm1Demo from "@/dev/mm/Scherm1Demo";
import Scherm3Demo from "@/dev/mm/Scherm3Demo";
import Scherm4Demo from "@/dev/mm/Scherm4Demo";
import Scherm5Demo from "@/dev/mm/Scherm5Demo";
import Scherm6Demo from "@/dev/mm/Scherm6Demo";
import Scherm7Demo from "@/dev/mm/Scherm7Demo";
import Scherm8Demo from "@/dev/mm/Scherm8Demo";
import Scherm9Demo from "@/dev/mm/Scherm9Demo";
import Scherm10Demo from "@/dev/mm/Scherm10Demo";
import Scherm11Demo from "@/dev/mm/Scherm11Demo";
import Scherm12Demo from "@/dev/mm/Scherm12Demo";
import Scherm13Demo from "@/dev/mm/Scherm13Demo";
import Scherm14Demo from "@/dev/mm/Scherm14Demo";
import "@/i18n";
import "./index.css";
import "./styles/salle-de-course.css";
import "./styles/meermarathon.css";
import "./styles/meermarathon-thema.css";

const SCHERMEN = [
  { key: "1", titel: "1 · Mijn Meermarathon", Demo: Scherm1Demo },
  { key: "3", titel: "3 · Volgwagen › Mijn ploeg", Demo: Scherm3Demo },
  { key: "4", titel: "4 · Volgwagen › Live", Demo: Scherm4Demo },
  { key: "5", titel: "5 · Uitslagen", Demo: Scherm5Demo },
  { key: "6", titel: "6 · Eén game: vrouwen en mannen", Demo: Scherm6Demo },
  { key: "7", titel: "7 · Uitslagenbalk: Cup, Grand Prix, ONK, NK", Demo: Scherm7Demo },
  { key: "8", titel: "8 · Beheer: wedstrijden", Demo: Scherm8Demo },
  { key: "9", titel: "9 · Krant, Ploeg en Pronostiek zoals bij de wielergames", Demo: Scherm9Demo },
  { key: "10", titel: "10 · Uitslagen-pagina: tussenstand, schaatstruien en beker", Demo: Scherm10Demo },
  { key: "11", titel: "11 · Wisselen: vrouwen, mannen en het totaal", Demo: Scherm11Demo },
  { key: "12", titel: "12 · Uitslagenbalk: de foto van het peloton", Demo: Scherm12Demo },
  { key: "13", titel: "13 · De kop van de pagina op een foto", Demo: Scherm13Demo },
  { key: "14", titel: "14 · Weging: een Grand Prix die dubbel telt", Demo: Scherm14Demo },
];

function Testbank() {
  const params = new URLSearchParams(window.location.search);
  const [modus, setModus] = useState(params.get("modus") === "nacht" ? "nacht" : "licht");
  const [thema, setThema] = useState(params.get("thema") ?? "winter");
  const alleen = params.get("scherm")?.split(",") ?? null;

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-thema", thema);
    if (thema === "winter" && modus === "nacht") root.setAttribute("data-modus", "nacht");
    else root.removeAttribute("data-modus");
  }, [thema, modus]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-50 flex flex-wrap items-center gap-2 border-b border-border bg-card px-4 py-2 text-xs">
        <strong>Meermarathon-testbank</strong>
        <button className="rounded border px-2 py-1" onClick={() => setModus(modus === "nacht" ? "licht" : "nacht")}>
          {modus === "nacht" ? "Nacht" : "Licht"}
        </button>
        <select className="rounded border bg-card px-2 py-1" value={thema} onChange={(e) => setThema(e.target.value)}>
          <option value="winter">winter</option>
          <option value="roze">roze (inschrijffase)</option>
        </select>
      </div>
      <main className="container mx-auto px-5 py-6 space-y-12">
        {SCHERMEN.filter((s) => !alleen || alleen.includes(s.key)).map(({ key, titel, Demo }) => (
          <section key={key} id={`scherm-${key}`} className="space-y-4">
            <h2 className="editor-eyebrow">{titel}</h2>
            <Demo />
          </section>
        ))}
      </main>
    </div>
  );
}

const client = new QueryClient({ defaultOptions: { queries: { retry: false, enabled: false } } });

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={client}>
    <MemoryRouter>
      <Testbank />
    </MemoryRouter>
  </QueryClientProvider>,
);
