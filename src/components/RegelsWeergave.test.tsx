// Het koersreglement: bij de Meermarathon schaatsteksten zonder jokers en de
// puntentelling als "De punten" in de opmaak van de Instagram-post (top 20,
// weging per factor, pronostiek). Een wielerkoers blijft zoals hij was.
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import "@/i18n";
import RegelsWeergave, { type RegelsWeergaveProps } from "./RegelsWeergave";
import type { CategoryWithRiders } from "@/hooks/useCategories";

const SCHEMA = [50, 40, 32, 26, 22, 20, 18, 16, 14, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((points, i) => ({
  position: i + 1,
  points,
}));

const CATEGORIE = {
  id: "c1",
  name: "Sprinters",
  short_name: null,
  sort_order: 1,
  max_picks: 1,
  game_id: "g",
  category_riders: [{ rider_id: "r1", riders: { id: "r1", name: "Lotte Bosma", start_number: 1, team_id: null, firstcycling_id: null } }],
} as unknown as CategoryWithRiders;

const WEGING = [
  { weging: 2, wedstrijden: ["ONK", "Grand Prix Finale"], voorbeeld: "ONK" },
  { weging: 1, wedstrijden: ["Cup 1 t/m 12"], voorbeeld: "Cup 1 Amsterdam" },
  { weging: 0.5, wedstrijden: ["Vierdaagse dag 1 Hoorn"], voorbeeld: "Vierdaagse dag 1 Hoorn" },
];

function toon(over: Partial<RegelsWeergaveProps> = {}) {
  return render(
    <RegelsWeergave
      meermarathon
      gameNaam="Meermarathon 2026-2027"
      categories={[CATEGORIE]}
      categoriesLoading={false}
      stagePoints={SCHEMA}
      schemaLoading={false}
      wegingGroepen={WEGING}
      pronostiekPunten={50}
      seizoen="26/27"
      {...over}
    />,
  );
}

describe("RegelsWeergave › Meermarathon", () => {
  it("zet de hele pagina in de opmaak van de posts: kopjes zonder emoji, stappen met een groot cijfer", () => {
    toon();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Speluitleg & Reglement");
    expect(screen.getByText("Meermarathon 2026-2027")).toBeInTheDocument();
    for (const kop of ["Het Reglement", "Hoe speel je mee?", "Categorieën", "Tot slot"]) {
      expect(screen.getByRole("heading", { name: kop })).toBeInTheDocument();
    }
    expect(screen.queryByText(/📜|📋|🏁/)).toBeNull();
    // "Stap 3 —" valt weg: het grote cijfer zegt het al.
    expect(screen.getByRole("heading", { name: "Voorspel de klassementswinnaars" })).toBeInTheDocument();
    expect(screen.getByText("05")).toBeInTheDocument();
    expect(screen.getByText("REGLEMENT")).toBeInTheDocument();
  });

  it("toont De punten met de top 20 uit het puntenschema", () => {
    toon();
    expect(screen.getByRole("heading", { name: "De punten" })).toBeInTheDocument();
    expect(screen.getByText("De top 20 scoort")).toBeInTheDocument();
    const plekken = within(screen.getByRole("list", { name: "Punten per plek" })).getAllByRole("listitem");
    expect(plekken).toHaveLength(20);
    expect(plekken[0]).toHaveAccessibleName("Plek 1: 50 punten");
    expect(plekken[19]).toHaveAccessibleName("Plek 20: 1 punten");
    expect(screen.getByText("Buiten de top 20, niet gestart of uitgestapt: 0 punten")).toBeInTheDocument();
  });

  it("zet de weging in tegels per factor, zwaarste eerst, met een rekenvoorbeeld", () => {
    toon();
    const tegels = within(screen.getByRole("list", { name: "Weging per wedstrijd" })).getAllByRole("listitem", { name: /^×/ });
    expect(tegels.map((t) => t.getAttribute("aria-label"))).toEqual([
      "×2: ONK, Grand Prix Finale",
      "×1: Cup 1 t/m 12",
      "×0,5: Vierdaagse dag 1 Hoorn",
    ]);
    expect(tegels[0]).toHaveTextContent("Dubbel");
    expect(tegels[2]).toHaveTextContent("Half");
    // Nummers blijven aan hun woord vast.
    expect(tegels[1].textContent).toContain("Cup 1 t/m 12");
    expect(screen.getByText("ONK gewonnen?", { exact: false })).toHaveTextContent("ONK gewonnen? 50 × 2 = 100 punten");
  });

  it("noemt de pronostiek met de punten uit het schema en zegt dat er geen jokers zijn", () => {
    toon({ pronostiekPunten: 60 });
    expect(screen.getByText("+60")).toBeInTheDocument();
    expect(screen.getByText("Pronostiek · per peloton")).toBeInTheDocument();
    expect(screen.getByText(/Geen\. Alleen de schaatsers uit de categorieën scoren/)).toBeInTheDocument();
    expect(screen.getByText(/Kies uit/)).toHaveTextContent("Jokers zijn er niet.");
    expect(screen.queryByText(/Kies twee Jokers/)).toBeNull();
    expect(screen.queryByText("Podium algemeen klassement")).toBeNull();
    expect(screen.queryByText(/ploegentijdrit/i)).toBeNull();
    expect(screen.getByText("Koerspoule · seizoen 26/27")).toBeInTheDocument();
  });

  it("wacht zonder puntenschema of wedstrijden, en rekent zonder zwaardere wedstrijd gewoon", () => {
    const { unmount } = toon({ stagePoints: [], wegingGroepen: [] });
    expect(screen.getByText("Het puntenschema volgt.")).toBeInTheDocument();
    expect(screen.getByText("De weging volgt zodra de wedstrijden bekend zijn.")).toBeInTheDocument();
    unmount();
    toon({ wegingGroepen: [{ weging: 1, wedstrijden: ["Cup 1 t/m 3"], voorbeeld: "Cup 1" }] });
    expect(screen.getByText("Winst in een wedstrijd?", { exact: false })).toHaveTextContent("Winst in een wedstrijd? 50 punten");
  });
});

describe("RegelsWeergave › wielerkoers", () => {
  it("blijft zoals hij was: jokers, podium en truien, geen De punten", () => {
    toon({ meermarathon: false, gameNaam: "Tour de France 2026", wegingGroepen: undefined });
    expect(screen.getByText(/Kies twee Jokers/)).toBeInTheDocument();
    expect(screen.getByText("Podium algemeen klassement")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "De punten" })).toBeNull();
    expect(screen.queryByText(/schaatser/)).toBeNull();
  });
});
