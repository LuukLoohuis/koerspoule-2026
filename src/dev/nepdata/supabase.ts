/**
 * Nep-Supabase voor testbanken (zie vite.nepdata.config.ts): tabellen in het
 * geheugen, zodat de echte schermen met hun echte hooks draaien. Kiezen,
 * voorspellen, indienen en terugzetten werken; niets verlaat de browser en
 * na herladen begint alles opnieuw.
 *
 * Alleen wat de ploegbouwer vraagt: select met eq/in/ilike/order/limit,
 * maybeSingle/single, update, en de rpc's van useEntry. Geneste selects
 * (category_riders(riders(...)), entry_picks(...)) staan al in de rijen.
 * Een onbekende tabel is leeg.
 */
type Rij = Record<string, unknown>;
type Fout = { message: string; code?: string };
type Resultaat = { data: unknown; error: Fout | null };

export type NepCategorie = { id: string; game_id: string; name: string; short_name: string | null; sort_order: number; max_picks: number; rijders: string[] };
export type NepEntry = {
  id: string;
  user_id: string;
  game_id: string;
  status: "draft" | "submitted";
  team_name: string | null;
  entry_picks: { category_id: string; rider_id: string }[];
  entry_jokers: { rider_id: string }[];
  entry_predictions: { classification: string; position: number; rider_id: string }[];
};
export type NepWereld = {
  games: Rij[];
  categories: NepCategorie[];
  teams: Rij[];
  riders: Rij[];
  entries: NepEntry[];
};

/** Iets vertraging, zodat laadstanden en optimistische updates echt te zien zijn. */
const VERTRAGING_MS = 150;

let wereld: NepWereld = { games: [], categories: [], teams: [], riders: [], entries: [] };
let gebruikerId = "nep-deelnemer";

export function laadWereld(w: NepWereld, userId: string) {
  wereld = structuredClone(w);
  gebruikerId = userId;
}

/** Wat er nu "in de database" staat; handig in de console van de testbank. */
export function huidigeWereld(): NepWereld {
  return structuredClone(wereld);
}

function rijenVan(tabel: string): Rij[] {
  switch (tabel) {
    case "games":
    case "teams":
    case "riders":
      return wereld[tabel];
    case "entries":
      return wereld.entries;
    case "categories":
      return wereld.categories.map(({ rijders, ...c }) => ({
        ...c,
        category_riders: rijders.map((id) => ({ rider_id: id, riders: wereld.riders.find((r) => r.id === id) ?? null })),
      }));
    default:
      return [];
  }
}

const later = <T,>(waarde: () => T) => new Promise<T>((ok) => setTimeout(() => ok(waarde()), VERTRAGING_MS));

class Vraag implements PromiseLike<Resultaat> {
  private filters: ((r: Rij) => boolean)[] = [];
  private volgorde: { kolom: string; oplopend: boolean; nullsFirst: boolean }[] = [];
  private max: number | null = null;
  private enkel: "maybe" | "single" | null = null;
  private wijziging: Rij | null = null;

  constructor(private tabel: string) {}

  select() {
    return this;
  }
  eq(kolom: string, waarde: unknown) {
    this.filters.push((r) => r[kolom] === waarde);
    return this;
  }
  in(kolom: string, waarden: unknown[]) {
    this.filters.push((r) => waarden.includes(r[kolom]));
    return this;
  }
  ilike(kolom: string, patroon: string) {
    const deel = patroon.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*");
    const re = new RegExp(`^${deel}$`, "i");
    this.filters.push((r) => re.test(String(r[kolom] ?? "")));
    return this;
  }
  order(kolom: string, opties: { ascending?: boolean; nullsFirst?: boolean } = {}) {
    const oplopend = opties.ascending ?? true;
    // Zoals Postgres: NULLS LAST bij oplopend, NULLS FIRST bij aflopend.
    this.volgorde.push({ kolom, oplopend, nullsFirst: opties.nullsFirst ?? !oplopend });
    return this;
  }
  limit(n: number) {
    this.max = n;
    return this;
  }
  maybeSingle() {
    this.enkel = "maybe";
    return this;
  }
  single() {
    this.enkel = "single";
    return this;
  }
  update(waarden: Rij) {
    this.wijziging = waarden;
    return this;
  }

  then<A = Resultaat, B = never>(
    ok?: ((v: Resultaat) => A | PromiseLike<A>) | null,
    nee?: ((e: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return later(() => this.voerUit()).then(ok, nee);
  }

  private voerUit(): Resultaat {
    const bron = this.wijziging ? (wereld as unknown as Record<string, Rij[]>)[this.tabel] ?? [] : rijenVan(this.tabel);
    let rijen = bron.filter((r) => this.filters.every((f) => f(r)));
    if (this.wijziging) {
      for (const r of rijen) Object.assign(r, this.wijziging);
      return { data: null, error: null };
    }
    for (const { kolom, oplopend, nullsFirst } of [...this.volgorde].reverse()) {
      rijen = [...rijen].sort((a, b) => {
        const x = a[kolom] as string | number | null | undefined;
        const y = b[kolom] as string | number | null | undefined;
        if (x == null || y == null) return x == null && y == null ? 0 : (x == null) === nullsFirst ? -1 : 1;
        return (x < y ? -1 : x > y ? 1 : 0) * (oplopend ? 1 : -1);
      });
    }
    if (this.max != null) rijen = rijen.slice(0, this.max);
    const data = structuredClone(rijen);
    if (this.enkel === "maybe") return { data: data[0] ?? null, error: null };
    if (this.enkel === "single") {
      return data.length === 1 ? { data: data[0], error: null } : { data: null, error: { message: "Geen of meer dan één rij" } };
    }
    return { data, error: null };
  }
}

function entryVan(id: unknown): NepEntry | undefined {
  return wereld.entries.find((e) => e.id === id);
}

const fout = (message: string): Resultaat => ({ data: null, error: { message } });

function rpc(naam: string, args: Record<string, unknown>): Resultaat {
  switch (naam) {
    case "get_or_create_entry": {
      const bestaand = wereld.entries.find((e) => e.game_id === args.p_game_id && e.user_id === gebruikerId);
      if (bestaand) return { data: bestaand.id, error: null };
      const nieuw: NepEntry = {
        id: `entry-${String(args.p_game_id)}`,
        user_id: gebruikerId,
        game_id: String(args.p_game_id),
        status: "draft",
        team_name: null,
        entry_picks: [],
        entry_jokers: [],
        entry_predictions: [],
      };
      wereld.entries.push(nieuw);
      return { data: nieuw.id, error: null };
    }
    case "toggle_entry_pick":
    case "save_entry_pick": {
      const e = entryVan(args.p_entry_id);
      const cat = wereld.categories.find((c) => c.id === args.p_category_id);
      if (!e || !cat) return fout("Entry of categorie niet gevonden");
      const rijder = String(args.p_rider_id);
      const inCat = e.entry_picks.filter((p) => p.category_id === cat.id);
      if (naam === "save_entry_pick") {
        e.entry_picks = [...e.entry_picks.filter((p) => p.category_id !== cat.id), { category_id: cat.id, rider_id: rijder }];
        return { data: null, error: null };
      }
      if (inCat.some((p) => p.rider_id === rijder)) {
        e.entry_picks = e.entry_picks.filter((p) => !(p.category_id === cat.id && p.rider_id === rijder));
        return { data: null, error: null };
      }
      if (inCat.length >= cat.max_picks) {
        if (cat.max_picks > 1) return fout(`Deze categorie is al compleet (${inCat.length}/${cat.max_picks}).`);
        e.entry_picks = e.entry_picks.filter((p) => p.category_id !== cat.id);
      }
      e.entry_picks.push({ category_id: cat.id, rider_id: rijder });
      return { data: null, error: null };
    }
    case "save_entry_jokers": {
      const e = entryVan(args.p_entry_id);
      if (!e) return fout("Entry niet gevonden");
      const game = wereld.games.find((g) => g.id === e.game_id);
      if (game?.game_type === "meermarathon") return fout("De Meermarathon kent geen jokers.");
      e.entry_jokers = (args.p_rider_ids as string[]).map((id) => ({ rider_id: id }));
      return { data: null, error: null };
    }
    case "save_entry_predictions": {
      const e = entryVan(args.p_entry_id);
      if (!e) return fout("Entry niet gevonden");
      e.entry_predictions = structuredClone(args.p_predictions as NepEntry["entry_predictions"]);
      return { data: null, error: null };
    }
    case "submit_entry": {
      const e = entryVan(args.p_entry_id);
      if (!e) return fout("Entry niet gevonden");
      const leeg = wereld.categories.filter((c) => c.game_id === e.game_id && !e.entry_picks.some((p) => p.category_id === c.id));
      if (leeg.length > 0) return fout(`Kies eerst in elke categorie (nog open: ${leeg.map((c) => c.name).join(", ")}).`);
      e.status = "submitted";
      return { data: null, error: null };
    }
    default:
      // game_standings en de rest: nog niets gereden.
      return { data: [], error: null };
  }
}

export const supabase = {
  from: (tabel: string) => new Vraag(tabel),
  rpc: (naam: string, args: Record<string, unknown> = {}) => later(() => rpc(naam, args)),
  channel: () => {
    const kanaal = { on: () => kanaal, subscribe: () => kanaal, unsubscribe: () => Promise.resolve("ok") };
    return kanaal;
  },
  removeChannel: () => Promise.resolve("ok"),
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
} as unknown as typeof import("@/integrations/supabase/client").supabase;

export const hasSupabaseConfig = true;
export const supabaseConfig = { url: "nepdata://testbank", hasAnonKey: true, looksPlaceholder: false };
