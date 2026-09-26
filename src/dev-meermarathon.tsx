/**
 * Visuele testbank voor de Meermarathon-schermen (niet in de router, niet in
 * de build). Rendert de echte componenten met nepdata, in licht en nacht,
 * zodat de opmaak te beoordelen is zonder database of inlog.
 *
 * Draaien: npx vite  →  /dev-meermarathon.html  (?scherm=1..5, ?modus=nacht)
 */
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Koersbalk, type KoersbalkItem } from "@/components/meermarathon/Koersbalk";
import Scherm1Demo from "@/dev/mm/Scherm1Demo";
import Scherm2Demo from "@/dev/mm/Scherm2Demo";
import Scherm3Demo from "@/dev/mm/Scherm3Demo";
import Scherm4Demo from "@/dev/mm/Scherm4Demo";
import Scherm5Demo from "@/dev/mm/Scherm5Demo";
import "@/i18n";
import "./index.css";
import "./styles/salle-de-course.css";
import "./styles/meermarathon.css";
import "./styles/meermarathon-thema.css";

const KOERSBALK: KoersbalkItem[] = [
  { id: "v", label: "Vrouwen", categorie: "vrouwen", seizoen: "26/27", pil: { tekst: "Ingeschreven", soort: "ingeschreven" } },
  { id: "m", label: "Mannen", categorie: "mannen", seizoen: "26/27", pil: { tekst: "Ploeg 3/5", soort: "let-op" } },
];

function KoersbalkDemo() {
  const [gekozen, setGekozen] = useState("v");
  return (
    <div className="space-y-3">
      <Koersbalk items={KOERSBALK} selectedId={gekozen} onSelect={setGekozen} />
      <Koersbalk
        items={[
          { ...KOERSBALK[0], pil: { tekst: "Live", soort: "live" } },
          { ...KOERSBALK[1], pil: { tekst: "Inschrijving open", soort: "open" } },
        ]}
        selectedId="v"
        onSelect={() => {}}
      />
    </div>
  );
}

const SCHERMEN = [
  { key: "0", titel: "Koersbalk", Demo: KoersbalkDemo },
  { key: "1", titel: "1 · Mijn Meermarathon", Demo: Scherm1Demo },
  { key: "2", titel: "2 · Ploeg samenstellen", Demo: Scherm2Demo },
  { key: "3", titel: "3 · Volgwagen › Mijn ploeg", Demo: Scherm3Demo },
  { key: "4", titel: "4 · Volgwagen › Live", Demo: Scherm4Demo },
  { key: "5", titel: "5 · Uitslagen", Demo: Scherm5Demo },
];

function Testbank() {
  const params = new URLSearchParams(window.location.search);
  const [modus, setModus] = useState(params.get("modus") === "nacht" ? "nacht" : "licht");
  const [thema, setThema] = useState(params.get("thema") ?? "winter");
  const alleen = params.get("scherm");

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
        {SCHERMEN.filter((s) => !alleen || s.key === alleen).map(({ key, titel, Demo }) => (
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
