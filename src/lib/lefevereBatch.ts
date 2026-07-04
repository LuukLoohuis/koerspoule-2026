/**
 * lefevereBatch — client-driven batch-generatie van Lefevère-rapporten voor ALLE
 * inzendingen van een game, voor de huidige stand. Draait in de admin-browser en
 * spiegelt EXACT dezelfde formules als useHorsCategorieSummary.ts (Monte-Carlo
 * apen-sim, Emirates-droomploeg, Wielerdirecteur-score), zodat de gegenereerde
 * cijfers 1-op-1 gelijk zijn aan wat een deelnemer in zijn eigen Hors Catégorie-
 * tab ziet. Elke entry wordt via de bestaande edge-functie gegenereerd en met de
 * sleutel (entry_id, stage_count) in lefevere_rapporten geüpsert.
 *
 * De lazy per-deelnemer-generatie in useLefevereReport blijft het vangnet; deze
 * batch vult alles vooruit zodat niemand hoeft te wachten.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { pointsTable } from "@/data/riders";
import type { LefevereReportInput } from "@/hooks/useLefevereReport";
import { fetchAllRows } from "@/lib/fetchAll";

// ─── Monte-Carlo primitieven (identieke kopie uit useHorsCategorieSummary) ────
function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
function pickN<T>(arr: T[], n: number, rng: () => number): T[] {
  if (arr.length <= n) return [...arr];
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(rng() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

type PickStat = { category_id: string; rider_id: string; pick_count: number; total_entries: number };
type CategoryRow = { id: string; max_picks: number | null; category_riders: Array<{ riders: { id: string } | null }> };
type RiderRow = { id: string; name: string; is_dnf: boolean };
type EntryRow = { id: string; user_id: string; team_name: string | null };

export type BatchCtx = {
  stageCount: number;
  approvedStageIds: Set<string>;
  categories: CategoryRow[];
  ridersById: Map<string, RiderRow>;
  pickStats: PickStat[];
  totals: number[];                        // cum_points-verdeling over alle entries
  randomScores: number[];                  // gesorteerde Monte-Carlo apenscores
  riderTotals: Map<string, number>;        // finishpunten per renner (approved)
  dreamTotal: number;                      // Emirates-droomploegtotaal (gedeeld)
  catRiderIds: Set<string>;                // renners die in een categorie zitten
  bestJokerPts: number;                    // top-2 non-categorie-renners (gedeeld)
  picksByEntry: Map<string, Map<string, string[]>>; // entry → cat → riderIds
  jokersByEntry: Map<string, string[]>;    // entry → riderIds
  entryTotal: Map<string, number>;         // entry → som ALLE stage_points
  entryApprovedTotal: Map<string, number>; // entry → som stage_points op approved etappes
  entries: EntryRow[];
  gameId: string;
};

/** Haalt alle gedeelde + per-entry data op en berekent de gedeelde rekenbasis. */
export async function buildBatchCtx(supabase: SupabaseClient, gameId: string): Promise<BatchCtx> {
  // Stages (voor approved-set + stageCount, identiek aan de hook).
  const { data: stagesData } = await supabase
    .from("stages")
    .select("id, stage_number, results_status")
    .eq("game_id", gameId);
  const stages = (stagesData ?? []) as Array<{ id: string; stage_number: number; results_status: string }>;
  const approved = stages.filter((s) => s.results_status === "approved");
  const stageCount = approved.length;
  const approvedStageIds = new Set(approved.map((s) => s.id));
  const maxStageNum = approved.reduce((m, s) => Math.max(m, s.stage_number), 0);

  // Categorieën met hun renners.
  const { data: catData } = await supabase
    .from("categories")
    .select("id, max_picks, category_riders(riders(id))")
    .eq("game_id", gameId);
  const categories = (catData ?? []) as unknown as CategoryRow[];

  // Alle renners van de game (namen + DNF) via teams.
  const { data: teams } = await supabase.from("teams").select("id").eq("game_id", gameId);
  const teamIds = (teams ?? []).map((t: { id: string }) => t.id);
  const riderRows = teamIds.length
    ? await fetchAllRows<RiderRow>((from, to) =>
        supabase.from("riders").select("id, name, is_dnf").in("team_id", teamIds).range(from, to))
    : [];
  const ridersById = new Map(riderRows.map((r) => [r.id, r]));

  // Pick-statistieken (gedeeld) via RPC.
  const { data: psData } = await (supabase as unknown as { rpc: (n: string, a: unknown) => Promise<{ data: unknown }> })
    .rpc("game_pick_stats", { p_game_id: gameId });
  const pickStats = (psData ?? []) as PickStat[];

  // Klassement-verdeling (cum_points per entry) via RPC.
  const standRows = await fetchAllRows<{ entry_id: string; cum_points: number }>((from, to) =>
    (supabase as unknown as { rpc: (n: string, a: unknown) => { range: (f: number, t: number) => unknown } })
      .rpc("game_standings", { p_game_id: gameId, p_upto: maxStageNum }).range(from, to) as never);
  const totals = standRows.map((r) => r.cum_points ?? 0);

  // Stage-resultaten (approved) → finishpunten per renner.
  const srRows = await fetchAllRows<{ rider_id: string | null; finish_position: number }>((from, to) =>
    supabase
      .from("stage_results")
      .select("rider_id, finish_position, stages!inner(game_id, results_status)")
      .eq("stages.game_id", gameId)
      .eq("stages.results_status", "approved")
      .range(from, to) as never);
  const riderTotals = new Map<string, number>();
  for (const r of srRows) {
    if (!r.rider_id) continue;
    const pts = pointsTable[r.finish_position] ?? 0;
    if (pts === 0) continue;
    riderTotals.set(r.rider_id, (riderTotals.get(r.rider_id) ?? 0) + pts);
  }

  // Categorie-renner-set + Emirates-droomploegtotaal (gedeeld).
  const catRiderIds = new Set<string>();
  let dreamTotal = 0;
  for (const cat of categories) {
    const candidates = (cat.category_riders ?? [])
      .map((cr) => (cr.riders ? { id: cr.riders.id, points: riderTotals.get(cr.riders.id) ?? 0 } : null))
      .filter((x): x is { id: string; points: number } => Boolean(x))
      .sort((a, b) => b.points - a.points);
    dreamTotal += candidates.slice(0, cat.max_picks ?? 1).reduce((s, r) => s + r.points, 0);
    for (const cr of cat.category_riders ?? []) if (cr.riders) catRiderIds.add(cr.riders.id);
  }
  const bestJokerList = riderRows
    .filter((r) => !catRiderIds.has(r.id))
    .map((r) => riderTotals.get(r.id) ?? 0)
    .sort((a, b) => b - a)
    .slice(0, 2);
  dreamTotal += bestJokerList.reduce((s, p) => s + p, 0);
  const bestJokerPts = bestJokerList.reduce((s, p) => s + p, 0);

  // Monte-Carlo apenverdeling (gedeeld — zelfde seed als de hook).
  const randomScores = buildRandomScores(categories, pickStats, totals, gameId);

  // Alle ingediende inzendingen + hun picks/jokers/stage-punten.
  const entries = await fetchAllRows<EntryRow>((from, to) =>
    supabase.from("entries").select("id, user_id, team_name").eq("game_id", gameId).eq("status", "submitted").range(from, to));
  const entryIds = entries.map((e) => e.id);

  const picksByEntry = new Map<string, Map<string, string[]>>();
  const jokersByEntry = new Map<string, string[]>();
  const entryTotal = new Map<string, number>();
  const entryApprovedTotal = new Map<string, number>();
  if (entryIds.length > 0) {
    const pickRows = await fetchAllRows<{ entry_id: string; category_id: string; rider_id: string }>((from, to) =>
      supabase.from("entry_picks").select("entry_id, category_id, rider_id").in("entry_id", entryIds).range(from, to));
    for (const p of pickRows) {
      let m = picksByEntry.get(p.entry_id);
      if (!m) { m = new Map(); picksByEntry.set(p.entry_id, m); }
      const arr = m.get(p.category_id) ?? [];
      arr.push(p.rider_id);
      m.set(p.category_id, arr);
    }
    const jokerRows = await fetchAllRows<{ entry_id: string; rider_id: string }>((from, to) =>
      supabase.from("entry_jokers").select("entry_id, rider_id").in("entry_id", entryIds).range(from, to));
    for (const j of jokerRows) {
      const arr = jokersByEntry.get(j.entry_id) ?? [];
      arr.push(j.rider_id);
      jokersByEntry.set(j.entry_id, arr);
    }
    const spRows = await fetchAllRows<{ entry_id: string; stage_id: string; points: number }>((from, to) =>
      supabase.from("stage_points").select("entry_id, stage_id, points").in("entry_id", entryIds).order("entry_id").range(from, to));
    for (const sp of spRows) {
      entryTotal.set(sp.entry_id, (entryTotal.get(sp.entry_id) ?? 0) + (sp.points ?? 0));
      if (approvedStageIds.has(sp.stage_id)) {
        entryApprovedTotal.set(sp.entry_id, (entryApprovedTotal.get(sp.entry_id) ?? 0) + (sp.points ?? 0));
      }
    }
  }

  return {
    stageCount, approvedStageIds, categories, ridersById, pickStats, totals, randomScores,
    riderTotals, dreamTotal, catRiderIds, bestJokerPts, picksByEntry, jokersByEntry,
    entryTotal, entryApprovedTotal, entries, gameId,
  };
}

function buildRandomScores(categories: CategoryRow[], pickStats: PickStat[], totals: number[], gameId: string): number[] {
  const N = 5000;
  if (categories.length === 0 || pickStats.length === 0) return [];
  const meanTotal = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;
  const byCat = new Map<string, PickStat[]>();
  for (const p of pickStats) {
    const arr = byCat.get(p.category_id) ?? [];
    arr.push(p);
    byCat.set(p.category_id, arr);
  }
  const totalSlots = categories.reduce((s, c) => s + (c.max_picks ?? 1), 0) || 1;
  const baselinePerSlot = meanTotal / totalSlots;
  const riderWeight = new Map<string, number>();
  for (const [, list] of byCat) {
    const max = Math.max(1, ...list.map((p) => p.pick_count));
    for (const p of list) riderWeight.set(p.rider_id, 0.4 + (p.pick_count / max) * 1.2);
  }
  const rng = seededRandom(gameId.split("-").reduce((a, c) => a + c.charCodeAt(0), 0) ?? 42);
  const scoreFromRiderIds = (ids: string[]) => {
    let s = 0;
    for (const rid of ids) s += baselinePerSlot * (riderWeight.get(rid) ?? 0.7) * (0.7 + rng() * 0.6);
    return s;
  };
  const scores: number[] = [];
  for (let i = 0; i < N; i++) {
    const team: string[] = [];
    for (const cat of categories) {
      const pool = (byCat.get(cat.id) ?? []).map((p) => p.rider_id);
      if (pool.length === 0) continue;
      team.push(...pickN(pool, cat.max_picks ?? 1, rng));
    }
    scores.push(scoreFromRiderIds(team));
  }
  scores.sort((a, b) => a - b);
  return scores;
}

/** Bouwt de Lefevère-input voor één entry — identiek aan de hook's lefevereInput. */
export function buildEntryInput(entryId: string, ctx: BatchCtx): LefevereReportInput | null {
  const entry = ctx.entries.find((e) => e.id === entryId);
  if (!entry) return null;
  const picks = ctx.picksByEntry.get(entryId) ?? new Map<string, string[]>();
  const jokerIds = ctx.jokersByEntry.get(entryId) ?? [];
  const myStageTotal = ctx.entryTotal.get(entryId) ?? 0;

  // Pool-score (rang) — identiek aan de hook.
  const n = ctx.totals.length;
  const myRank = n > 0 ? ctx.totals.filter((t) => t > myStageTotal).length + 1 : 1;
  const poolScore = n <= 1 ? 0.75 : (n - myRank) / (n - 1);

  // Monkey-score (beatPct van de apenverdeling).
  const userPicks: string[] = [];
  picks.forEach((ids) => userPicks.push(...ids));
  const userActual = userPicks.length ? myStageTotal : 0;
  const beatPct = ctx.randomScores.length === 0
    ? 0
    : (ctx.randomScores.filter((s) => userActual > s).length / ctx.randomScores.length) * 100;
  const monkeyScore = beatPct / 100;

  // Joker-score (rendement).
  let jokerScore = 0.5;
  if (jokerIds.length > 0) {
    const yourJokerPts = jokerIds.reduce((s, jid) => s + (ctx.riderTotals.get(jid) ?? 0), 0);
    const rendement = ctx.bestJokerPts > 0 ? Math.min(1, Math.max(0, yourJokerPts / ctx.bestJokerPts)) : 0.5;
    jokerScore = 0.3 + rendement * 0.7;
  }

  // Differentiaal — punten-gewogen uniciteit.
  let diffScore = 0.5;
  {
    const ownOf = (rid: string) => {
      const ps = ctx.pickStats.find((p) => p.rider_id === rid);
      return ps && ps.total_entries > 0 ? ps.pick_count / ps.total_entries : 0.15;
    };
    let wsum = 0, psum = 0;
    for (const rid of userPicks) {
      const pts = ctx.riderTotals.get(rid) ?? 0;
      if (pts > 0) { wsum += (1 - ownOf(rid)) * pts; psum += pts; }
    }
    if (psum > 0) diffScore = Math.min(1, Math.max(0, wsum / psum));
  }

  const raw = poolScore * 0.45 + monkeyScore * 0.25 + jokerScore * 0.2 + diffScore * 0.1;
  const score = Math.max(3.0, Math.round((raw * 9 + 1) * 10) / 10);
  const toSub = (v: number) => Math.max(1.0, Math.round((v * 9 + 1) * 10) / 10);

  // Emirates.
  const emiratesPct = ctx.dreamTotal > 0
    ? { pct: Math.round(((ctx.entryApprovedTotal.get(entryId) ?? 0) / ctx.dreamTotal) * 100), dreamTotal: ctx.dreamTotal, myPoints: ctx.entryApprovedTotal.get(entryId) ?? 0 }
    : null;

  // Pech (DNF onder eigen renners + jokers).
  const allRiderIds = [...jokerIds, ...userPicks];
  const uitvallerNamen = Array.from(new Set(allRiderIds))
    .filter((id) => ctx.ridersById.get(id)?.is_dnf)
    .map((id) => ctx.ridersById.get(id)?.name)
    .filter((x): x is string => Boolean(x));

  return {
    score,
    components: {
      poolRanking: { score: toSub(poolScore), weging: 0.45, rang: myRank, totaalDeelnemers: n },
      monkeyVergelijking: { score: toSub(monkeyScore), weging: 0.25, percentageVerslagen: Math.round(beatPct) },
      jokerPrestatie: { score: toSub(jokerScore), weging: 0.2, aantalJokers: jokerIds.length },
      differentiaal: { score: toSub(diffScore), weging: 0.1 },
    },
    deelnemer: { ploegnaam: entry.team_name ?? undefined },
    etappePrestatie: {
      jokerRenners: jokerIds.map((id) => ctx.ridersById.get(id)?.name).filter((x): x is string => Boolean(x)),
    },
    pech: { uitvallers: uitvallerNamen.length, namen: uitvallerNamen },
    horsCategorieScores: emiratesPct
      ? { emirates: { percentage: emiratesPct.pct, droomploegPunten: emiratesPct.dreamTotal, jouwPunten: emiratesPct.myPoints } }
      : undefined,
  };
}

// ─── Teller: hoeveel entries hebben al een rapport voor de huidige stand ──────
export type LefevereCount = { metRapport: number; totaal: number; stageCount: number };

export async function fetchLefevereCount(supabase: SupabaseClient, gameId: string): Promise<LefevereCount> {
  const { data: stagesData } = await supabase
    .from("stages").select("results_status").eq("game_id", gameId);
  const stageCount = ((stagesData ?? []) as Array<{ results_status: string }>).filter((s) => s.results_status === "approved").length;
  const { count: totaal } = await supabase
    .from("entries").select("id", { count: "exact", head: true }).eq("game_id", gameId).eq("status", "submitted");
  if (stageCount === 0) return { metRapport: 0, totaal: totaal ?? 0, stageCount };
  // Via de FK-join (entry → game) i.p.v. een enorme .in(entry_ids), die anders de
  // URL-lengte overschrijdt en de query laat falen (→ teller bleef leeg).
  const repRows = await fetchAllRows<{ entry_id: string }>((from, to) =>
    supabase.from("lefevere_rapporten")
      .select("entry_id, entries!inner(game_id, status)")
      .eq("entries.game_id", gameId)
      .eq("entries.status", "submitted")
      .eq("stage_count", stageCount)
      .range(from, to) as never);
  return { metRapport: new Set(repRows.map((r) => r.entry_id)).size, totaal: totaal ?? 0, stageCount };
}

// ─── Batch-runner (draait in de admin-browser) ────────────────────────────────
export type BatchResult = {
  ok: boolean;
  total: number;
  generated: number;
  skipped: number;
  remaining: number;
  timedOut: boolean;
  failed: Array<{ entry_id: string; error: string }>;
};

/**
 * Genereert Lefevère-rapporten voor alle inzendingen voor de huidige stand.
 * Idempotent: bestaande (entry_id, stage_count)-rijen worden overgeslagen tenzij
 * force. Verwerkt in chunks van 5 met een tijdsbudget van 130s; bij overschrijding
 * timedOut=true zodat een tweede klik de rest afmaakt.
 */
export async function runLefevereBatch(
  supabase: SupabaseClient,
  gameId: string,
  opts: { force?: boolean } = {},
): Promise<BatchResult> {
  const startedAt = Date.now();
  const TIME_BUDGET_MS = 130_000;
  const CONCURRENCY = 5;

  const ctx = await buildBatchCtx(supabase, gameId);
  if (ctx.stageCount === 0) {
    return { ok: true, total: 0, generated: 0, skipped: 0, remaining: 0, timedOut: false, failed: [] };
  }

  const allIds = ctx.entries.map((e) => e.id);
  const total = allIds.length;

  // force: wis eerst de rijen voor deze stage_count. Gechunkt zodat de .in()-URL
  // niet te lang wordt bij duizenden inzendingen.
  if (opts.force && allIds.length > 0) {
    for (let i = 0; i < allIds.length; i += 300) {
      await supabase.from("lefevere_rapporten").delete().eq("stage_count", ctx.stageCount).in("entry_id", allIds.slice(i, i + 300));
    }
  }

  // Bepaal welke entries nog geen rij hebben (cursor) — via de FK-join i.p.v. een
  // enorme .in(entry_ids) die de URL-lengte overschrijdt.
  const existing = new Set<string>();
  if (allIds.length > 0) {
    const rows = await fetchAllRows<{ entry_id: string }>((from, to) =>
      supabase.from("lefevere_rapporten")
        .select("entry_id, entries!inner(game_id, status)")
        .eq("entries.game_id", gameId)
        .eq("entries.status", "submitted")
        .eq("stage_count", ctx.stageCount)
        .range(from, to) as never);
    for (const r of rows) existing.add(r.entry_id);
  }
  const pending = ctx.entries.filter((e) => !existing.has(e.id));

  let generated = 0;
  let skipped = existing.size;
  let processed = 0;
  let timedOut = false;
  const failed: Array<{ entry_id: string; error: string }> = [];

  const one = async (entry: EntryRow): Promise<void> => {
    const input = buildEntryInput(entry.id, ctx);
    if (!input) { skipped++; return; }
    // Variatie-guard: laatste paar eigen rapporten meegeven.
    const recent = await fetchAllRows<{ directeurs_analyse: string; ploeg_karakterisering: string; stage_count: number }>((from, to) =>
      supabase.from("lefevere_rapporten")
        .select("directeurs_analyse, ploeg_karakterisering, stage_count")
        .eq("entry_id", entry.id).lt("stage_count", ctx.stageCount)
        .order("stage_count", { ascending: false }).range(from, to));
    const recente = recent.slice(0, 5);
    const { data, error } = await supabase.functions.invoke("generate-lefevere-report", {
      body: {
        ...input,
        recenteAnalyses: recente.map((r) => r.directeurs_analyse).filter(Boolean),
        recenteKarakteriseringen: recente.map((r) => r.ploeg_karakterisering).filter(Boolean),
      },
    });
    if (error) {
      let detail = error.message;
      const c = (error as { context?: Response }).context;
      if (c && typeof c.text === "function") { try { const b = await c.text(); if (b) detail = b; } catch { /* keep */ } }
      throw new Error(detail);
    }
    const r = data as { directeursAnalyse?: string; ploegKarakterisering?: string; model?: string };
    if (typeof r?.directeursAnalyse !== "string" || typeof r?.ploegKarakterisering !== "string") {
      throw new Error("Onverwacht antwoord van generator");
    }
    const { error: upErr } = await supabase.from("lefevere_rapporten").upsert(
      {
        entry_id: entry.id,
        stage_count: ctx.stageCount,
        directeurs_analyse: r.directeursAnalyse,
        ploeg_karakterisering: r.ploegKarakterisering,
        score: input.score,
        model: r.model ?? null,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "entry_id,stage_count" },
    );
    if (upErr) throw upErr;
    generated++;
  };

  for (let i = 0; i < pending.length; i += CONCURRENCY) {
    const chunk = pending.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(chunk.map(one));
    settled.forEach((s, idx) => {
      processed++;
      if (s.status === "rejected") {
        failed.push({ entry_id: chunk[idx].id, error: (s.reason as Error)?.message ?? String(s.reason) });
      }
    });
    if (Date.now() - startedAt > TIME_BUDGET_MS) { timedOut = true; break; }
  }

  return { ok: true, total, generated, skipped, remaining: pending.length - processed, timedOut, failed };
}
