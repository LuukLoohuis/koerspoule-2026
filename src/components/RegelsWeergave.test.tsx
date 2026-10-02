// Het koersreglement: bij de Meermarathon geen jokers, podium, truien of
// ploegentijdrit, wél de pronostiek en de weging per wedstrijd uit het beheer.
// Een wielerkoers blijft zoals hij was.
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import "@/i18n";
import RegelsWeergave, { type RegelsWeergaveProps } from "./RegelsWeergave";
import type { CategoryWithRiders } from "@/hooks/useCategories";

const SCHEMA = [50, 40, 32, 26, 22].map((points, i) => ({ position: i + 1, points }));

const CATEGORIE = {
  id: "c1",
  name: "Sprinters",
  short_name: null,
  sort_order: 1,
  max_picks: 1,
  game_id: "g",
  category_riders: [{ rider_id: "r1", riders: { id: "r1", name: "Lotte Bosma", start_number: 1, team_id: null, firstcycling_id: null } }],
} as unknown as CategoryWithRiders;

function toon(over: Partial<RegelsWeergaveProps> = {}) {
  return render(
    <RegelsWeergave
      meermarathon
      gameNaam="Meermarathon 2026-2027"
      categories={[CATEGORIE]}
      categoriesLoading={false}
      stagePoints={SCHEMA}
      schemaLoading={false}
      wegingGroepen={[
        { soort: "cup", weging: 1, wedstrijden: ["Cup 1", "Cup 2"] },
        { soort: "grandprix", weging: 2, wedstrijden: ["Grand Prix 6"] },
        { soort: "onk", weging: 2, wedstrijden: ["ONK"] },
      ]}
      pronostiekPunten={50}
      {...over}
    />,
  );
}

describe("RegelsWeergave › Meermarathon", () => {
  it("toont de weging per soort wedstrijd met een rekenvoorbeeld", () => {
    toon();
    const lijst = screen.getByRole("list", { name: "Weging per wedstrijd" });
    const regels = within(lijst).getAllByRole("listitem");
    expect(regels.map((r) => r.textContent)).toEqual([
      expect.stringMatching(/Cup.*Cup 1 · Cup 2.*telt gewoon.*×1/),
      expect.stringMatching(/Grand Prix.*Grand Prix 6.*telt dubbel.*×2/),
      expect.stringMatching(/ONK.*telt dubbel.*×2/),
    ]);
    expect(screen.getByText("Voorbeeld: winst in een wedstrijd met weging ×2 levert 2 × 50 = 100 punten op.")).toBeInTheDocument();
  });

  it("zegt dat er geen jokers zijn en laat podium, truien en ploegentijdrit weg", () => {
    toon();
    expect(screen.getByText(/De Meermarathon kent geen jokers/)).toBeInTheDocument();
    expect(screen.queryByText(/Kies twee Jokers/)).toBeNull();
    expect(screen.queryByText("Podium algemeen klassement")).toBeNull();
    expect(screen.queryByText(/Truien \(groen, berg, wit\)/)).toBeNull();
    expect(screen.queryByText(/ploegentijdrit/i)).toBeNull();
    expect(screen.getByText(/Kies uit/)).toHaveTextContent("Kies uit 1 categorieën telkens 1 schaatser. Doe mee bij de vrouwen, de mannen of allebei. Jokers zijn er niet.");
  });

  it("noemt de pronostiek met de punten uit het schema", () => {
    toon({ pronostiekPunten: 60 });
    expect(screen.getByText("Juiste winnaar Cup-klassement (kunstijs)").nextSibling).toHaveTextContent("60 pt");
    expect(screen.getByText("Juiste winnaar Grand Prix-klassement (natuurijs)").nextSibling).toHaveTextContent("60 pt");
  });

  it("zegt het als alles gewoon telt, en wacht zonder wedstrijden", () => {
    const { unmount } = toon({ wegingGroepen: [{ soort: "cup", weging: 1, wedstrijden: ["Cup 1"] }] });
    expect(screen.getByText("Op dit moment tellen alle wedstrijden even zwaar (×1).")).toBeInTheDocument();
    unmount();
    toon({ wegingGroepen: [] });
    expect(screen.getByText("De weging volgt zodra de wedstrijden bekend zijn.")).toBeInTheDocument();
  });
});

describe("RegelsWeergave › wielerkoers", () => {
  it("blijft zoals hij was: jokers, podium en truien, geen weging", () => {
    toon({ meermarathon: false, gameNaam: "Tour de France 2026", wegingGroepen: undefined });
    expect(screen.getByText(/Kies twee Jokers/)).toBeInTheDocument();
    expect(screen.getByText("Podium algemeen klassement")).toBeInTheDocument();
    expect(screen.queryByText("Weging per wedstrijd")).toBeNull();
    expect(screen.queryByText(/schaatser/)).toBeNull();
  });
});
