/**
 * Het dossier van één afgeronde koers voor "Oude spellen" op /profiel: je
 * punten per rit, het eindklassement rond jou en je ploeg met de punten per
 * renner. Eén query per koers, pas geladen als je hem openklapt.
 *
 * Alleen lezen: dit haalt de inschrijving op via het entry-id uit de erelijst
 * en niet via useEntry, want die maakt er een aan als hij ontbreekt.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { GameStandingRow } from "@/hooks/useResults";
import type { PalmaresGame } from "@/hooks/usePalmares";
import type { ArchiefDossier, ArchiefKlassementRij } from "@/components/profiel/OudeSpellen";

export type DossierRit = {
  id: string;
  stage_number: number;
  name: string | null;
  is_gc: boolean;
  results_status: string | null;
};

export type DossierBronnen = {
  entryId: string;
  /** Jouw naam, voor je eigen rij als je buiten de opgehaalde stand valt. */
  mijnNaam: string | null;
  /** Rang en punten uit de erelijst: de terugval voor je eigen rij. */
  mijnRang: number;
  mijnPunten: number;
  stages: DossierRit[];
  puntenPerRit: { stage_id: string; points: number }[];
  ritRangen: { stage_id: string; my_rank: number }[];
  entry: { team_name: string | null; entry_picks: { rider_id: string }[]; entry_jokers: { rider_id: string }[] } | null;
  rennerTotalen: { rider_id: string; total_points: number }[];
  renners: { id: string; name: string; team: string | null; is_dnf: boolean | null }[];
  stand: GameStandingRow[];
  /** Is de stand die van het eindklassement (GC-rit), met de voorspelbonus erin? */
  standOpGc: boolean;
};

/** De laatst goedgekeurde uitslag: daar staat het eindklassement op. */
export function laatsteUitslag(stages: DossierRit[]): DossierRit | null {
  const klaar = stages.filter((s) => s.results_status === "approved");
  if (klaar.length === 0) return null;
  return klaar.reduce((a, b) => (b.stage_number > a.stage_number ? b : a));
}

const TOP = 3;

/**
 * Top drie plus jou met je directe buren. Op volgorde in de stand, niet op
 * rang: bij gelijke punten delen rijen een rang, en dan zou "rang min één"
 * niet bestaan. Ben je zelf top vijf, dan gewoon de top tot net onder jou.
 */
export function klassementRondJou(b: Pick<DossierBronnen, "stand" | "standOpGc" | "entryId" | "mijnNaam" | "mijnRang" | "mijnPunten" | "entry">): ArchiefKlassementRij[] {
  const punten = (r: GameStandingRow) => (b.standOpGc ? r.total : r.cum_points);
  const gesorteerd = [...b.stand].sort((x, y) => punten(y) - punten(x));
  // Rang opnieuw tellen op de getoonde punten (gelijke punten = gelijke rang),
  // zoals het klassement op Uitslagen doet.
  let vorige: number | null = null;
  let rang = 0;
  const rijen = gesorteerd.map((r, i) => {
    if (vorige === null || punten(r) < vorige) {
      rang = i + 1;
      vorige = punten(r);
    }
    return { rang, ploegnaam: r.team_name ?? "—", naam: r.display_name, punten: punten(r), ikZelf: r.entry_id === b.entryId };
  });

  const ik = rijen.findIndex((r) => r.ikZelf);
  const tot = ik >= 0 && ik < 5 ? Math.max(5, ik + 2) : TOP;
  const indexen = new Set<number>();
  for (let i = 0; i < Math.min(tot, rijen.length); i++) indexen.add(i);
  if (ik >= 0) for (let i = ik - 1; i <= ik + 1; i++) if (i >= 0 && i < rijen.length) indexen.add(i);

  const gekozen = [...indexen].sort((x, y) => x - y);
  const uit: ArchiefKlassementRij[] = gekozen.map((i, k) => ({ ...rijen[i], gatErvoor: k > 0 && i - gekozen[k - 1] > 1 }));

  // Buiten de opgehaalde stand (te groot veld, of alleen de top kwam mee):
  // je eigen rij uit de erelijst achteraan.
  if (ik < 0 && b.mijnRang > 0) {
    uit.push({
      rang: b.mijnRang,
      ploegnaam: b.entry?.team_name ?? "—",
      naam: b.mijnNaam,
      punten: b.mijnPunten,
      ikZelf: true,
      gatErvoor: uit.length > 0,
    });
  }
  return uit;
}

export function bouwDossier(b: DossierBronnen): Omit<ArchiefDossier, "subpoules"> {
  const puntenOpRit = new Map<string, number>();
  for (const p of b.puntenPerRit) puntenOpRit.set(p.stage_id, (puntenOpRit.get(p.stage_id) ?? 0) + p.points);
  const rangOpRit = new Map(b.ritRangen.map((r) => [r.stage_id, r.my_rank]));

  const ritten = b.stages
    .filter((s) => !s.is_gc && s.results_status === "approved")
    .sort((x, y) => x.stage_number - y.stage_number)
    .map((s) => ({ nummer: s.stage_number, naam: s.name, punten: puntenOpRit.get(s.id) ?? 0, plaats: rangOpRit.get(s.id) ?? null }));

  const jokers = new Set((b.entry?.entry_jokers ?? []).map((j) => j.rider_id));
  const ids = [...new Set([...(b.entry?.entry_picks ?? []).map((p) => p.rider_id), ...jokers])];
  const totalen = new Map(b.rennerTotalen.map((r) => [r.rider_id, r.total_points ?? 0]));
  const rennerOp = new Map(b.renners.map((r) => [r.id, r]));
  const ploeg = ids.flatMap((id) => {
    const r = rennerOp.get(id);
    if (!r) return [];
    return [{ naam: r.name, ploeg: r.team, punten: totalen.get(id) ?? 0, joker: jokers.has(id), opgave: Boolean(r.is_dnf) }];
  });

  return { ploegnaam: b.entry?.team_name ?? null, ritten, klassement: klassementRondJou(b), ploeg };
}

type Rpc = (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }>;

async function haalDossier(koers: PalmaresGame, userId: string, mijnNaam: string | null): Promise<Omit<ArchiefDossier, "subpoules">> {
  if (!supabase) throw new Error("Supabase niet geconfigureerd");
  const sb = supabase;
  const rpc = (sb as unknown as { rpc: Rpc }).rpc.bind(sb);
  const gameId = koers.game_id;
  const entryId = koers.entry_id;
  const zeker = <T,>(r: { data: unknown; error: { message?: string } | null }, fallback: T): T => {
    if (r.error) throw new Error(r.error.message ?? "Laden mislukt");
    return (r.data ?? fallback) as T;
  };

  const [stagesR, puntenR, rangenR, entryR, totalenR] = await Promise.all([
    sb.from("stages").select("id, stage_number, name, is_gc, results_status").eq("game_id", gameId).order("stage_number"),
    sb.from("stage_points").select("stage_id, points").eq("entry_id", entryId),
    rpc("my_stage_ranks", { p_game_id: gameId, p_user_id: userId }),
    sb.from("entries").select("team_name, entry_picks(rider_id), entry_jokers(rider_id)").eq("id", entryId).maybeSingle(),
    rpc("rider_entry_totals", { p_game_id: gameId, p_entry_id: entryId }),
  ]);
  const stages = zeker<DossierRit[]>(stagesR, []);
  const entry = zeker<DossierBronnen["entry"]>(entryR, null);
  const rennerIds = [...new Set([...(entry?.entry_picks ?? []), ...(entry?.entry_jokers ?? [])].map((p) => p.rider_id))];
  const laatste = laatsteUitslag(stages);

  const [rennersR, standR] = await Promise.all([
    rennerIds.length > 0
      ? sb.from("riders").select("id, name, team, is_dnf").in("id", rennerIds)
      : Promise.resolve({ data: [], error: null }),
    laatste
      ? rpc("game_standings", { p_game_id: gameId, p_upto: laatste.stage_number, p_include_admins: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  return bouwDossier({
    entryId,
    mijnNaam,
    mijnRang: koers.my_rank,
    mijnPunten: koers.approved_points,
    stages,
    puntenPerRit: zeker(puntenR, []),
    // Dagklassering en renner-totalen zijn bijzaak: ontbreekt zo'n RPC, dan
    // nog steeds het dossier, alleen zonder die cijfers.
    ritRangen: rangenR.error ? [] : ((rangenR.data ?? []) as DossierBronnen["ritRangen"]),
    entry,
    rennerTotalen: totalenR.error ? [] : ((totalenR.data ?? []) as DossierBronnen["rennerTotalen"]),
    renners: zeker(rennersR, []),
    stand: zeker(standR, []),
    standOpGc: Boolean(laatste?.is_gc),
  });
}

export function useArchiefDossier(koers: PalmaresGame | null, mijnNaam: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["archief-dossier", koers?.game_id, koers?.entry_id, user?.id],
    enabled: Boolean(supabase && koers && user?.id),
    // Een afgeronde koers verandert niet meer.
    staleTime: 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    queryFn: () => haalDossier(koers!, user!.id, mijnNaam),
  });
}
