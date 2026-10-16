// /profiel als geheel: tab en koers uit de URL, alleen afgeronde koersen in
// het archief, en "Bekijk in Mijn Peloton" zet die koers klaar.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { PalmaresGame } from "@/hooks/usePalmares";
import Profiel from "./Profiel";

const staat = vi.hoisted(() => ({
  profiel: { display_name: "Sanne de Wit", created_at: "2026-04-18T10:00:00Z" } as { display_name: string | null; created_at: string } | null,
  games: [] as PalmaresGame[],
  dossierVoor: [] as Array<string | null>,
  setSelectedGameId: vi.fn(),
}));

vi.mock("react-i18next", async () => {
  const { maakT } = await import("@/test/i18nMock");
  return { useTranslation: () => ({ t: maakT(), i18n: { language: "nl" } }) };
});
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "ik", email: "sanne@voorbeeld.nl" } }) }));
vi.mock("@/hooks/useProfile", () => ({ useProfile: () => ({ data: staat.profiel }) }));
vi.mock("@/hooks/usePalmares", () => ({ usePalmares: () => ({ data: { games: staat.games, subpoules: [] } }) }));
vi.mock("@/context/SelectedGameContext", () => ({
  useSelectedGame: () => ({ games: [{ id: "mm-v", categorie: "vrouwen" }], setSelectedGameId: staat.setSelectedGameId }),
}));
vi.mock("@/hooks/useArchiefDossier", () => ({
  useArchiefDossier: (koers: PalmaresGame | null) => {
    staat.dossierVoor.push(koers?.game_id ?? null);
    return { data: koers ? { ploegnaam: "De Waaierwerkers", ritten: [], klassement: [], ploeg: [] } : undefined, isLoading: false, isError: false, refetch: vi.fn() };
  },
}));
vi.mock("@/components/PalmaresPanel", () => ({ default: () => <p>erelijst</p> }));

function game(id: string, status: string, rang: number, extra: Partial<PalmaresGame> = {}): PalmaresGame {
  return {
    game_id: id, game_name: `${id} 2026`, game_type: "tour", year: 2026, status, entry_id: `e-${id}`, approved_points: 1000,
    my_rank: rang, total_participants: 500, stage_wins: 1, stage_podiums: 2, stages_count: 21, dagzeges: [], ...extra,
  };
}

function toon(pad: string) {
  return render(
    <MemoryRouter initialEntries={[pad]}>
      <Routes>
        <Route path="/profiel" element={<Profiel />} />
        <Route path="/mijn-peloton" element={<p>mijn peloton</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Profiel", () => {
  beforeEach(() => {
    staat.profiel = { display_name: "Sanne de Wit", created_at: "2026-04-18T10:00:00Z" };
    staat.games = [game("tour", "finished", 12), game("giro", "finished", 214, { game_type: "giro" }), game("mm-v", "live", 3, { game_type: "meermarathon" })];
    staat.dossierVoor = [];
    staat.setSelectedGameId.mockClear();
  });

  it("licentie met naam en loopbaan; standaard de Palmares-tab", () => {
    toon("/profiel");
    expect(screen.getByRole("heading", { name: "Sanne de Wit" })).toBeInTheDocument();
    // Drie koersen (ook de lopende), drie dagzeges, beste eindklassering uit een afgeronde koers.
    expect(screen.getByText(/3 koersen · 3 dagzeges · beste eindklassering #12/)).toBeInTheDocument();
    expect(screen.getByText("erelijst")).toBeInTheDocument();
  });

  it("zonder weergavenaam: het begin van je e-mailadres", () => {
    staat.profiel = null;
    toon("/profiel");
    expect(screen.getByRole("heading", { name: "sanne" })).toBeInTheDocument();
  });

  it("oude spellen: alleen afgeronde koersen", () => {
    toon("/profiel?tab=oude-spellen");
    expect(screen.getByRole("button", { name: /tour/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /giro/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /meermarathon/i })).toBeNull();
    expect(staat.dossierVoor.at(-1)).toBeNull();
  });

  it("koers uit de URL laadt dat dossier; doorklikken naar Mijn Peloton zet hem klaar", () => {
    toon("/profiel?tab=oude-spellen&koers=giro");
    expect(staat.dossierVoor.at(-1)).toBe("giro");
    expect(screen.getByText("De Waaierwerkers")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Bekijk in Mijn Peloton/ }));
    expect(staat.setSelectedGameId).toHaveBeenCalledWith("giro");
    expect(screen.getByText("mijn peloton")).toBeInTheDocument();
  });

  it("een koers kiezen in het archief opent zijn dossier", () => {
    toon("/profiel?tab=oude-spellen");
    fireEvent.click(screen.getByRole("button", { name: /tour/i }));
    expect(staat.dossierVoor.at(-1)).toBe("tour");
    fireEvent.click(screen.getByRole("button", { name: /Alle oude spellen/ }));
    expect(staat.dossierVoor.at(-1)).toBeNull();
  });
});
