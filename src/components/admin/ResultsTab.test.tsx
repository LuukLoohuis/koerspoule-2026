// Beheer › Uitslagen: welke klassementen een beheerder kan invullen. Bij de
// Meermarathon alleen de uitslag, het algemeen klassement (oranje
// leiderstrui) en de witte trui; een punten- en bergklassement bestaan daar
// niet, en het algemeen klassement is geen roze trui.
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import ResultsTab from "./ResultsTab";

vi.mock("@/lib/supabase", () => ({ supabase: null }));

vi.mock("./StageApprovalCard", () => ({ default: () => null }));

/** Kies de eerste wedstrijd in de keuzelijst. */
function kiesEerste() {
  fireEvent.click(screen.getByTestId("results-stage-select"));
  fireEvent.click(within(screen.getByRole("listbox")).getAllByRole("option")[0]);
}

function toon(gameType: string) {
  render(<ResultsTab activeGameId="" stages={[]} riders={[]} gameType={gameType as never} gameYear={2026} />);
  return screen.getAllByRole("tab").map((tab) => tab.textContent?.trim());
}

describe("ResultsTab", () => {
  it("Meermarathon: alleen uitslag, algemeen en witte trui", () => {
    expect(toon("meermarathon")).toEqual(["🏁 Uitslag", "🟠 Algemeen", "⚪ Witte trui"]);
    expect(screen.getByText("Selecteer wedstrijd & klassement")).toBeInTheDocument();
  });

  it("Meermarathon: geen import van wielersites, wel de screenshot-import", () => {
    render(
      <ResultsTab
        activeGameId=""
        stages={[{ id: "w1", game_id: "", stage_number: 1, name: null, date: null, status: "draft", wedstrijd_type: "cup", ijs_type: "kunstijs" }]}
        riders={[]}
        gameType={"meermarathon" as never}
        gameYear={2026}
      />,
    );
    kiesEerste();
    expect(screen.queryByTestId("import-btn")).toBeNull();
    expect(screen.queryByTestId("import-cf-btn")).toBeNull();
    expect(screen.getByTestId("import-screenshot-btn")).toBeInTheDocument();

    // Radix-tabs wisselen op mousedown.
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Algemeen/ }), { button: 0 });
    expect(screen.getByText("Algemeen klassement")).toBeInTheDocument();
    expect(screen.getByText("Oranje leiderstrui — top 20", { exact: false })).toBeInTheDocument();
  });

  it("Wielerkoers: alle vijf, zoals het was", () => {
    expect(toon("tdf")).toEqual(["🏁 STAGE", "🩷 GC", "🔵 KOM", "🟣 POINTS", "⚪ YOUTH"]);
    expect(screen.getByText("Selecteer etappe & klassement")).toBeInTheDocument();
  });
});
