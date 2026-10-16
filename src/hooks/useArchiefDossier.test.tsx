// Het dossier van een oude koers op /profiel. Bewaakt de opbouw (ritten
// zonder de GC-rit, klassement rond jou, ploeg met jokers en opgaves) en dat
// het ophalen alleen leest: geen get_or_create_entry, want die zou voor een
// oude koers een lege inschrijving aanmaken.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { GameStandingRow } from "@/hooks/useResults";
import type { PalmaresGame } from "@/hooks/usePalmares";

const db = vi.hoisted(() => ({
  aanroepen: [] as string[],
  tabellen: {} as Record<string, Record<string, unknown>[]>,
  rpc: {} as Record<string, unknown>,
}));

vi.mock("@/lib/supabase", () => {
  class Vraag {
    private filters: Array<(r: Record<string, unknown>) => boolean> = [];
    private enkel = false;
    constructor(private tabel: string) {
      db.aanroepen.push(`from:${tabel}`);
    }
    select() { return this; }
    order() { return this; }
    eq(k: string, v: unknown) { this.filters.push((r) => r[k] === v); return this; }
    in(k: string, v: unknown[]) { this.filters.push((r) => v.includes(r[k])); return this; }
    maybeSingle() { this.enkel = true; return this; }
    then(ok: (r: { data: unknown; error: null }) => unknown) {
      const rijen = (db.tabellen[this.tabel] ?? []).filter((r) => this.filters.every((f) => f(r)));
      return Promise.resolve({ data: this.enkel ? rijen[0] ?? null : rijen, error: null }).then(ok);
    }
  }
  return {
    supabase: {
      from: (t: string) => new Vraag(t),
      rpc: (naam: string, args: Record<string, unknown>) => {
        db.aanroepen.push(`rpc:${naam}:${JSON.stringify(args)}`);
        return Promise.resolve({ data: db.rpc[naam] ?? [], error: null });
      },
    },
  };
});
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "ik" } }) }));

import { bouwDossier, klassementRondJou, laatsteUitslag, useArchiefDossier, type DossierBronnen } from "./useArchiefDossier";

const rit = (n: number, extra: Partial<DossierBronnen["stages"][number]> = {}) => ({
  id: `r${n}`, stage_number: n, name: null, is_gc: false, results_status: "approved", ...extra,
});

function standRij(rang: number, totaal: number, extra: Partial<GameStandingRow> = {}): GameStandingRow {
  return {
    entry_id: `e${rang}`, user_id: `u${rang}`, team_name: `Ploeg ${rang}`, display_name: `Naam ${rang}`,
    cum_points: totaal - 10, pred_bonus: 10, total: totaal, rank: rang, prev_rank: rang, delta: 0,
    stage_points: 0, stage_rank: null, ...extra,
  };
}

/** Een veld van `n` ploegen, aflopend in punten, met jou (entry "ik") op `mijn`. */
function veld(n: number, mijn: number) {
  return Array.from({ length: n }, (_, i) => standRij(i + 1, 1000 - i * 5, i + 1 === mijn ? { entry_id: "ik" } : {}));
}

const basis: DossierBronnen = {
  entryId: "ik",
  mijnNaam: "Sanne",
  mijnRang: 0,
  mijnPunten: 0,
  stages: [],
  puntenPerRit: [],
  ritRangen: [],
  entry: null,
  rennerTotalen: [],
  renners: [],
  stand: [],
  standOpGc: true,
};

describe("laatsteUitslag", () => {
  it("neemt de hoogste goedgekeurde, ook de GC-rit", () => {
    expect(laatsteUitslag([rit(1), rit(21), rit(99, { is_gc: true })])?.stage_number).toBe(99);
  });
  it("slaat niet-goedgekeurde ritten over", () => {
    expect(laatsteUitslag([rit(1), rit(2, { results_status: "pending" })])?.stage_number).toBe(1);
    expect(laatsteUitslag([rit(1, { results_status: "draft" })])).toBeNull();
  });
});

describe("bouwDossier", () => {
  it("ritten: zonder GC-rit en zonder open ritten, op volgorde, punten opgeteld", () => {
    const d = bouwDossier({
      ...basis,
      stages: [rit(2), rit(99, { is_gc: true }), rit(1), rit(3, { results_status: "pending" })],
      puntenPerRit: [{ stage_id: "r1", points: 30 }, { stage_id: "r1", points: 12 }, { stage_id: "r2", points: 7 }],
      ritRangen: [{ stage_id: "r1", my_rank: 1 }],
    });
    expect(d.ritten).toEqual([
      { nummer: 1, naam: null, punten: 42, plaats: 1 },
      { nummer: 2, naam: null, punten: 7, plaats: null },
    ]);
  });

  it("ploeg: keuzes en jokers samen, met joker- en opgavevlag; onbekende renner valt weg", () => {
    const d = bouwDossier({
      ...basis,
      entry: { team_name: "De Waaierwerkers", entry_picks: [{ rider_id: "a" }, { rider_id: "b" }, { rider_id: "weg" }], entry_jokers: [{ rider_id: "a" }] },
      renners: [{ id: "a", name: "Pogačar", team: "UAE", is_dnf: false }, { id: "b", name: "Merlier", team: "SOQ", is_dnf: true }],
      rennerTotalen: [{ rider_id: "a", total_points: 580 }],
    });
    expect(d.ploegnaam).toBe("De Waaierwerkers");
    expect(d.ploeg).toEqual([
      { naam: "Pogačar", ploeg: "UAE", punten: 580, joker: true, opgave: false },
      { naam: "Merlier", ploeg: "SOQ", punten: 0, joker: false, opgave: true },
    ]);
  });
});

describe("klassementRondJou", () => {
  it("top drie, een gat, en jij met je buren", () => {
    const rijen = klassementRondJou({ ...basis, stand: veld(50, 12) });
    expect(rijen.map((r) => r.rang)).toEqual([1, 2, 3, 11, 12, 13]);
    expect(rijen.map((r) => r.gatErvoor)).toEqual([false, false, false, true, false, false]);
    expect(rijen.find((r) => r.ikZelf)?.rang).toBe(12);
  });

  it("sta je zelf in de top vijf, dan de top tot net onder jou, zonder gat", () => {
    const rijen = klassementRondJou({ ...basis, stand: veld(50, 4) });
    expect(rijen.map((r) => r.rang)).toEqual([1, 2, 3, 4, 5]);
    expect(rijen.some((r) => r.gatErvoor)).toBe(false);
  });

  it("gelijke punten delen een rang; de buren zijn rijen, geen rangnummers", () => {
    const stand = [standRij(1, 900), standRij(2, 800), standRij(3, 700), standRij(4, 500), standRij(5, 500, { entry_id: "ik" }), standRij(6, 500), standRij(7, 400), standRij(8, 300)];
    const rijen = klassementRondJou({ ...basis, stand });
    expect(rijen.map((r) => r.rang)).toEqual([1, 2, 3, 4, 4, 4]);
    expect(rijen.filter((r) => r.ikZelf)).toHaveLength(1);
  });

  it("tussenstand (geen GC-rit): rangschikt op ritpunten, zonder voorspelbonus", () => {
    const stand = [standRij(1, 500, { cum_points: 300 }), standRij(2, 450, { cum_points: 400, entry_id: "ik" })];
    const rijen = klassementRondJou({ ...basis, stand, standOpGc: false });
    expect(rijen[0]).toMatchObject({ rang: 1, ikZelf: true, punten: 400 });
  });

  it("buiten de opgehaalde stand: je eigen rij uit de erelijst achteraan", () => {
    const rijen = klassementRondJou({ ...basis, stand: veld(5, 0), mijnRang: 1500, mijnPunten: 812, entry: { team_name: "De Waaierwerkers", entry_picks: [], entry_jokers: [] } });
    expect(rijen.at(-1)).toEqual({ rang: 1500, ploegnaam: "De Waaierwerkers", naam: "Sanne", punten: 812, ikZelf: true, gatErvoor: true });
  });
});

describe("useArchiefDossier", () => {
  beforeEach(() => {
    db.aanroepen = [];
    db.tabellen = {
      stages: [
        { ...rit(1), game_id: "tour" },
        { ...rit(99, { is_gc: true }), game_id: "tour" },
      ],
      stage_points: [{ entry_id: "ik", stage_id: "r1", points: 99 }],
      entries: [{ id: "ik", team_name: "De Waaierwerkers", entry_picks: [{ rider_id: "a" }], entry_jokers: [] }],
      riders: [{ id: "a", name: "Pogačar", team: "UAE", is_dnf: false }],
    };
    db.rpc = { game_standings: veld(20, 7), my_stage_ranks: [{ stage_id: "r1", my_rank: 3 }], rider_entry_totals: [{ rider_id: "a", total_points: 99 }] };
  });

  const koers = { game_id: "tour", entry_id: "ik", my_rank: 7, approved_points: 970 } as PalmaresGame;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
  );

  it("haalt het dossier alleen lezend op, met de stand na de laatste uitslag", async () => {
    const { result } = renderHook(() => useArchiefDossier(koers, "Sanne"), { wrapper });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data?.ritten).toEqual([{ nummer: 1, naam: null, punten: 99, plaats: 3 }]);
    expect(result.current.data?.ploeg[0]).toMatchObject({ naam: "Pogačar", punten: 99 });
    expect(result.current.data?.klassement.find((r) => r.ikZelf)?.rang).toBe(7);
    expect(db.aanroepen).toContain(`rpc:game_standings:${JSON.stringify({ p_game_id: "tour", p_upto: 99, p_include_admins: false })}`);
    expect(db.aanroepen.some((a) => a.includes("get_or_create_entry"))).toBe(false);
  });

  it("zonder gekozen koers haalt hij niets op", () => {
    renderHook(() => useArchiefDossier(null, "Sanne"), { wrapper });
    expect(db.aanroepen).toEqual([]);
  });
});
