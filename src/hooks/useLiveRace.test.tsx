import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLiveRace } from "./useLiveRace";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: { from: mocks.from },
}));

/** Supabase-querybouwer die elke keten accepteert en `data` teruggeeft. */
function antwoord(data: unknown[]) {
  const q: Record<string, unknown> = {};
  for (const methode of ["select", "eq", "in", "order"]) q[methode] = () => q;
  q.then = (resolve: (v: unknown) => void) => resolve({ data, error: null });
  return q;
}

/** Cup 1 Amsterdam, gekoppeld aan baan "Amsterdam", voor een game van één categorie. */
function zetTabellen(gameCategorie: string | null, bron: Record<string, unknown>) {
  const tabellen: Record<string, unknown[]> = {
    stage_live_tracks: [{
      track_id: "Amsterdam",
      label: "Topdivisie Vrouwen",
      categorie: "Topdivisie Vrouwen",
      sort_order: 0,
      stage_id: "cup-1",
      stages: {
        id: "cup-1",
        stage_number: 1,
        name: "Cup 1 Amsterdam",
        ijs_type: "kunstijs",
        game_id: "game-1",
        games: { categorie: gameCategorie },
      },
    }],
    live_race_state: [{
      track_id: "Amsterdam",
      totaal_ronden: 125,
      ronden_te_gaan: 66,
      synced_at: new Date().toISOString(),
      ...bron,
    }],
    live_rider_standings: [{
      track_id: "Amsterdam",
      beennummer: "087",
      naam: "Luc ter Haar",
      aantal_ronden: 59,
      tijd_sort: 1969985,
      rider_id: "rider-1",
    }],
    live_premies: [],
  };
  mocks.from.mockImplementation((tabel: string) => antwoord(tabellen[tabel] ?? []));
}

function renderLiveRace() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useLiveRace("game-1"), { wrapper });
}

describe("useLiveRace", () => {
  beforeEach(() => {
    mocks.from.mockReset();
  });

  it("toont de mannenrace niet bij de vrouwengame, ook al hangt dezelfde baan eraan", async () => {
    zetTabellen("vrouwen", { categorie: "Topdivisie Mannen", geslacht: "mannen" });

    const { result } = renderLiveRace();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it("toont de race van de eigen categorie met rijders", async () => {
    zetTabellen("mannen", { categorie: "Topdivisie Mannen", geslacht: "mannen" });

    const { result } = renderLiveRace();

    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data?.tracks).toHaveLength(1);
    expect(result.current.data?.tracks[0].riders.map((r) => r.naam)).toEqual(["Luc ter Haar"]);
    expect(result.current.data?.tracks[0].riderIdByBeennummer.get("087")).toBe("rider-1");
  });

  it("toont de race zoals voorheen als de sync het geslacht nog niet kent", async () => {
    zetTabellen("vrouwen", {});

    const { result } = renderLiveRace();

    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data?.tracks).toHaveLength(1);
  });
});
