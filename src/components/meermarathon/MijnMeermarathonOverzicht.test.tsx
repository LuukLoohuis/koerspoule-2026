import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { MijnMeermarathonOverzicht } from "./MijnMeermarathonOverzicht";
import { bouwGameStatus, type MmEntry, type MmWedstrijd } from "@/lib/meermarathonSeizoen";
import Scherm1Demo from "@/dev/mm/Scherm1Demo";

const NU = new Date(2026, 10, 10, 12, 0);

// Met de v7-vlaggen aan, zodat React Router niet bij elke test waarschuwt.
const Router = ({ children }: { children: ReactNode }) => (
  <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{children}</MemoryRouter>
);

const cup = (game_id: string, stage_number: number, date: string, approved = false): MmWedstrijd => ({
  id: `${game_id}-${stage_number}`,
  game_id,
  stage_number,
  name: null,
  date,
  status: null,
  is_gc: false,
  results_status: approved ? "approved" : null,
  ijs_type: "kunstijs",
  wedstrijd_type: "cup",
  aantal_rondes: game_id === "v" ? 80 : 125,
  distance_km: null,
});

const status = (id: "v" | "m", entry: MmEntry | null) =>
  bouwGameStatus({
    game: {
      id,
      name: id,
      year: 2026,
      status: "open_inschrijving",
      game_type: "meermarathon",
      categorie: id === "v" ? "vrouwen" : "mannen",
      registration_closes_at: new Date(2026, 10, 13, 23, 59).toISOString(),
    },
    entry,
    vereist: 5,
    wedstrijden: [cup(id, 1, "2026-10-31", true), cup(id, 2, "2026-11-07", true), cup(id, 3, "2026-11-14")],
    klassement: entry?.status === "submitted" ? { rank: 12, totaal: 1204, delta: 4, punten: 92 } : null,
    puntenPerWedstrijd: new Map(),
    vandaag: "2026-11-10",
  });

describe("Mijn Meermarathon", () => {
  it("toont per game de juiste kaart en knoppen", () => {
    const naarVolgwagen = vi.fn();
    const rondkijken = vi.fn();
    render(
      <Router>
        <MijnMeermarathonOverzicht
          statussen={[status("v", { id: "e", status: "submitted", teamName: "X", picks: 5 }), status("m", null)]}
          gekozenGameId="v"
          nu={NU}
          onNaarVolgwagen={naarVolgwagen}
          onRondkijken={rondkijken}
        />
      </Router>,
    );

    const vrouwen = screen.getByRole("region", { name: "Meermarathon Vrouwen" });
    expect(within(vrouwen).getByText("12e")).toBeInTheDocument();
    expect(within(vrouwen).getByText("vr 13 nov, 23:59")).toBeInTheDocument();
    fireEvent.click(within(vrouwen).getByRole("button", { name: "Naar je Volgwagen" }));
    expect(naarVolgwagen).toHaveBeenCalledWith("v");

    const mannen = screen.getByRole("region", { name: "Meermarathon Mannen" });
    expect(within(mannen).getByText("Ook meedoen met de Mannen?")).toBeInTheDocument();
    expect(within(mannen).getByRole("link", { name: "Schrijf je in voor de Mannen" })).toHaveAttribute(
      "href",
      "/team-samenstellen?game=m",
    );
    fireEvent.click(within(mannen).getByRole("button", { name: "Eerst rondkijken" }));
    expect(rondkijken).toHaveBeenCalledWith("m");
  });

  it("laat de rondkijk-link weg zonder route naar Uitslagen", () => {
    render(
      <Router>
        <MijnMeermarathonOverzicht statussen={[status("v", null)]} gekozenGameId={null} nu={NU} onNaarVolgwagen={() => {}} />
      </Router>,
    );
    expect(screen.queryByRole("button", { name: "Eerst rondkijken" })).toBeNull();
    expect(screen.getByRole("link", { name: "Stel je Vrouwen-ploeg samen" })).toBeInTheDocument();
  });

  it("rendert alle demo-staten zonder fouten", () => {
    render(
      <Router>
        <Scherm1Demo />
      </Router>,
    );
    expect(screen.getAllByText("Kijk mee bij de Mannen").length).toBeGreaterThan(0);
  });
});
