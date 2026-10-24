import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLiveRace } from "./useLiveRace";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: { from: mocks.from, channel: mocks.channel, removeChannel: mocks.removeChannel },
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

function renderLiveRace(opties: { realtime?: boolean } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useLiveRace("game-1", true, opties), { wrapper });
}

/** Nep-Realtime-kanaal dat onthoudt waarop geluisterd wordt. */
function nepKanaal() {
  const luisteraars: { filter: string; melden: () => void }[] = [];
  const kanaal = {
    on: vi.fn((_type: string, opts: { filter: string }, melden: () => void) => {
      luisteraars.push({ filter: opts.filter, melden });
      return kanaal;
    }),
    subscribe: vi.fn(() => kanaal),
  };
  mocks.channel.mockReturnValue(kanaal);
  return { kanaal, luisteraars };
}

const ophaalbeurten = () => mocks.from.mock.calls.filter(([tabel]) => tabel === "stage_live_tracks").length;

describe("useLiveRace", () => {
  beforeEach(() => {
    mocks.from.mockReset();
    mocks.channel.mockReset();
    mocks.removeChannel.mockReset();
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

  it("luistert met Realtime naar de racestatus van de baan en haalt bij een wijziging meteen op", async () => {
    zetTabellen("mannen", { categorie: "Topdivisie Mannen", geslacht: "mannen" });
    const { kanaal, luisteraars } = nepKanaal();

    const { unmount } = renderLiveRace({ realtime: true });

    await waitFor(() => expect(luisteraars).toHaveLength(1));
    expect(mocks.channel).toHaveBeenCalledWith("live-race:game-1");
    expect(luisteraars[0].filter).toBe("track_id=eq.Amsterdam");
    expect(kanaal.subscribe).toHaveBeenCalled();

    const voor = ophaalbeurten();
    luisteraars[0].melden();
    await waitFor(() => expect(ophaalbeurten()).toBe(voor + 1));

    unmount();
    expect(mocks.removeChannel).toHaveBeenCalledWith(kanaal);
  });

  it("opent geen kanaal zonder Realtime, bijvoorbeeld buiten de Live-tab", async () => {
    zetTabellen("mannen", { categorie: "Topdivisie Mannen", geslacht: "mannen" });

    const { result } = renderLiveRace();

    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(mocks.channel).not.toHaveBeenCalled();
  });

  it("opent geen kanaal als er geen baan te volgen is", async () => {
    zetTabellen("vrouwen", { categorie: "Topdivisie Mannen", geslacht: "mannen" });
    nepKanaal();

    const { result } = renderLiveRace({ realtime: true });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
    expect(mocks.channel).not.toHaveBeenCalled();
  });
});
