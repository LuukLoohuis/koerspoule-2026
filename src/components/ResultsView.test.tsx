// Uitslagen › Klassement: de balk bovenaan kiest de tussenstand. Een
// wielerkoers houdt de etappebalk met terrein en kilometers; de Meermarathon
// krijgt de schaatsbalk met Cup, Grand Prix, ONK en NK, net als onder
// Per wedstrijd. Anders stond elke schaatswedstrijd er als "vlakke rit, 0 km".
// Bij de schaatsers alleen de oranje leiderstrui en de witte trui; de
// poulewinnaar krijgt de beker.
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ResultsView from "./ResultsView";

const staat = vi.hoisted(() => ({
  games: [] as { id: string; name: string; year: number; status: string; game_type: string; categorie?: string | null }[],
  stages: [] as Record<string, unknown>[],
  standen: vi.fn(),
  standRijen: [] as Record<string, unknown>[],
}));

vi.mock("react-i18next", async () => {
  const { maakT } = await import("@/test/i18nMock");
  return { useTranslation: () => ({ t: maakT(), i18n: { language: "nl" } }) };
});
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "ik" }, role: "user", loading: false, session: null }) }));
vi.mock("@/hooks/useCurrentGame", () => ({ useCurrentGame: () => ({ data: null }) }));
vi.mock("@/hooks/useAllGames", () => ({ useAllGames: () => ({ data: staat.games }) }));
vi.mock("@/hooks/useJokerMultiplier", () => ({ useJokerMultiplier: () => 2 }));
vi.mock("@/hooks/usePointsSchema", () => ({ usePointsSchema: () => ({ data: [] }) }));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false, useMinWidth: () => true }));
vi.mock("@/lib/supabase", () => ({ supabase: null }));
vi.mock("@/components/ResultsUpdatedBadge", () => ({ default: () => null }));
vi.mock("@/hooks/useResults", () => ({
  useStages: () => ({ data: staat.stages, isLoading: false }),
  useStageResults: () => ({ data: [], isLoading: false }),
  useEntries: () => ({ data: [{ id: "e1", user_id: "ik", team_name: "Kouwe Kant", total_points: 54, display_name: "Ik" }] }),
  useStagePointsForEntries: () => ({
    data: [
      { entry_id: "e1", stage_id: "w1", points: 30 },
      { entry_id: "e1", stage_id: "w2", points: 24 },
    ],
  }),
  useMyStageRanks: () => ({ data: new Map() }),
  useGameStandings: (...args: unknown[]) => {
    staat.standen(...args);
    return { data: staat.standRijen };
  },
}));

const wedstrijd = (nr: number, extra: Record<string, unknown>) => ({
  id: `w${nr}`,
  game_id: "g",
  stage_number: nr,
  name: null,
  date: `2026-11-0${nr}`,
  status: "published",
  stage_type: null,
  distance_km: null,
  is_gc: false,
  results_status: null,
  ...extra,
});

function toon() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, enabled: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ResultsView showHeader={false} gameId="g" gameName="Koers" initialView="klassement" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeAll(() => {
  // jsdom kent geen scrollIntoView; de tabbalk en de etappebalk roepen het aan.
  Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  staat.standen.mockClear();
  staat.standRijen = [];
});

describe("ResultsView › Klassement", () => {
  it("Meermarathon: de schaatsbalk kiest de tussenstand, zonder ritten of kilometers", () => {
    staat.games = [{ id: "g", name: "Meermarathon Mannen 2026-2027", year: 2026, status: "live", game_type: "meermarathon", categorie: "mannen" }];
    staat.stages = [
      wedstrijd(1, { name: "Amsterdam", wedstrijd_type: "cup", ijs_type: "kunstijs", results_status: "approved" }),
      wedstrijd(2, { wedstrijd_type: "cup", ijs_type: "kunstijs", results_status: "approved" }),
      wedstrijd(3, { wedstrijd_type: "grandprix", ijs_type: "natuurijs" }),
    ];
    toon();

    const balk = screen.getByRole("region", { name: "TUSSENSTAND SELECTEREN" });
    expect(screen.queryByRole("button", { name: /^Rit \d+,/ })).toBeNull();
    expect(screen.getAllByRole("tab", { name: /Per wedstrijd/ }).length).toBeGreaterThan(0);
    expect(screen.queryByText("Etappes")).toBeNull();

    // Zonder deep-link staat het klassement na de laatste gereden wedstrijd.
    expect(within(balk).getByRole("button", { name: /^Cup 2,/ })).toHaveAttribute("aria-pressed", "true");
    expect(staat.standen).toHaveBeenLastCalledWith("g", 2, false);

    fireEvent.click(within(balk).getByRole("button", { name: /^Amsterdam,/ }));
    expect(within(balk).getByRole("button", { name: /^Amsterdam,/ })).toHaveAttribute("aria-pressed", "true");
    expect(staat.standen).toHaveBeenLastCalledWith("g", 1, false);
    expect(within(balk).getByRole("status")).toHaveTextContent("+30 pnt");

    // Na een wedstrijd die nog komt is er geen tussenstand.
    const komt = within(balk).getByRole("button", { name: /^Grand Prix 3,/ });
    expect(komt).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(komt);
    expect(within(balk).getByRole("button", { name: /^Amsterdam,/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("Meermarathon: bij de schaatsers alleen leiderstrui en witte trui, de beker voor de poulewinnaar", () => {
    staat.games = [{ id: "g", name: "Meermarathon Mannen 2026-2027", year: 2026, status: "live", game_type: "meermarathon", categorie: "mannen" }];
    staat.stages = [wedstrijd(1, { wedstrijd_type: "cup", ijs_type: "kunstijs", results_status: "approved" })];
    staat.standRijen = [
      { entry_id: "e1", user_id: "ik", team_name: "Kouwe Kant", display_name: "Ik", cum_points: 30, pred_bonus: 0, total: 30, rank: 1, prev_rank: 1, delta: 0, stage_points: 30, stage_rank: 1 },
    ];
    toon();

    expect(screen.getByRole("tab", { name: /Algemeen/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Witte trui/ })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /Punten|Berg|Jongeren/ })).toBeNull();
    expect(screen.getByText("Klassementen schaatsers")).toBeInTheDocument();
    expect(screen.getAllByAltText("Beker Meermarathon").length).toBeGreaterThan(0);
  });

  it("Wielerkoers: de etappebalk blijft", () => {
    staat.games = [{ id: "g", name: "Tour de France 2026", year: 2026, status: "live", game_type: "tour" }];
    staat.stages = [
      wedstrijd(1, { stage_type: "vlak", distance_km: 184, results_status: "approved" }),
      wedstrijd(2, { stage_type: "bergop", distance_km: 152 }),
    ];
    toon();

    expect(screen.getByRole("button", { name: /^Rit 1,/ })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Kies een wedstrijd" })).toBeNull();
    expect(screen.getAllByRole("tab", { name: /Etappes/ }).length).toBeGreaterThan(0);
  });
});
