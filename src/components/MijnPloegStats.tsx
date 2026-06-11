import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useEntry } from "@/hooks/useEntry";
import { useEntries, useStages, useStageAverages, useMyStageRanks, useGameStandings, useStagePointsForEntries } from "@/hooks/useResults";
import { usePointsSchema } from "@/hooks/usePointsSchema";
import { useSubpoules, useSubpouleMembers } from "@/hooks/useSubpoules";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown } from "lucide-react";

// ── Pure helpers ──────────────────────────────────────────────────────────────

function rankInMap(
  map: Map<string, number>,
  entryId: string,
  pool: Array<{ id: string }>
): number {
  const sorted = pool.map((e) => ({ id: e.id, pts: map.get(e.id) ?? 0 })).sort((a, b) => b.pts - a.pts);
  return sorted.findIndex((e) => e.id === entryId) + 1;
}

// ── Animation hook ────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 650, delay = 0) {
  const [val, setVal] = useState(0);
  const raf = useRef<number>();
  const triggered = useRef(false);

  useEffect(() => {
    if (target <= 0 || triggered.current) return;
    triggered.current = true;
    const t0 = setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3); // cubic ease-out
        setVal(Math.round(target * eased));
        if (p < 1) raf.current = requestAnimationFrame(tick);
        else setVal(target);
      };
      raf.current = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(t0);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  // target > 0 triggers once when data arrives; after that the ref blocks re-runs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target > 0]);

  return val;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Delta({ n }: { n: number }) {
  if (n === 0) return <span className="text-[10px] font-bold tabular-nums" style={{ color: "#9A9A9A" }}>—</span>;
  return (
    <span
      className="inline-flex items-center gap-px text-[10px] font-bold tabular-nums leading-none"
      style={{ color: n > 0 ? "#2E8B57" : "#C0392B" }}
    >
      {n > 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
      {Math.abs(n)}
    </span>
  );
}

function rankColor(rank: number | null): string {
  if (rank === 1) return "hsl(var(--primary))";
  if (rank !== null && rank <= 3) return "hsl(var(--vintage-gold))";
  return "hsl(25 20% 12%)";
}

/** Hairline tussen de cellen — gedrukte krantentabel, geen losse kaartjes. */
const CELL_HAIRLINE = "1px solid color-mix(in srgb, var(--ink-sepia) 20%, transparent)";

function StatCard({
  label,
  delay,
  isEmpty,
  index,
  children,
}: {
  label: string;
  delay: number;
  isEmpty: boolean;
  /** Positie in het 2×2 raster: bepaalt de interne hairlines + goud-anker. */
  index: number;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col gap-1.5 p-3 opacity-0 min-h-[80px]"
      style={{
        // Kolom 2 krijgt een hairline links, rij 2 een hairline boven.
        // Cel 1 (linksboven) krijgt het gouden anker-randje.
        borderLeft:
          index === 0
            ? "3px solid hsl(var(--vintage-gold))"
            : index % 2 === 1
              ? CELL_HAIRLINE
              : undefined,
        borderTop: index >= 2 ? CELL_HAIRLINE : undefined,
        animation: `ploegStatsFadeIn 0.45s ease-out ${delay}ms forwards`,
      }}
    >
      <span
        className="text-[9px] tracking-[0.25em] uppercase font-mono font-bold leading-none"
        style={{ color: "#8B7355" }}
      >
        {label}
      </span>
      {isEmpty ? (
        <span className="font-display text-3xl font-black leading-none" style={{ color: "#C8B89A" }}>
          —
        </span>
      ) : children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MijnPloegStats() {
  const { user } = useAuth();
  const { data: game } = useCurrentGame();
  const { entry, jokerIds, picksByCategory } = useEntry(game?.id);
  const { data: entries = [] } = useEntries(game?.id);
  const { data: stages = [] } = useStages(game?.id);
  const { data: stageAverages } = useStageAverages(game?.id);
  const { data: myStageRanks } = useMyStageRanks(game?.id, user?.id);
  const { data: schema = [] } = usePointsSchema(game?.id);
  const { subpoules } = useSubpoules(game?.id);
  const firstSubpoule = subpoules[0] ?? null;
  const { data: subpouleMembers = [] } = useSubpouleMembers(firstSubpoule?.id);

  // All picked + joker rider IDs
  const allRiderIds = useMemo(() => {
    const set = new Set<string>();
    for (const arr of picksByCategory.values()) for (const id of arr) set.add(id);
    for (const id of jokerIds) set.add(id);
    return Array.from(set);
  }, [picksByCategory, jokerIds]);

  // All stage results for my riders — needed for best-scorer calc
  const { data: ridersAllResults = [] } = useQuery({
    queryKey: ["my-riders-all-stage-results", entry?.id, allRiderIds.slice().sort().join(",")],
    enabled: Boolean(supabase && entry?.id && allRiderIds.length > 0),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (!supabase || !allRiderIds.length) return [];
      const { data } = await supabase
        .from("stage_results")
        .select("rider_id, finish_position, stage_id, riders(name)")
        .in("rider_id", allRiderIds)
        .not("finish_position", "is", null)
        .range(0, 199999); // anders 1000-rijen cap → late etappes missen
      return (data ?? []) as Array<{
        rider_id: string;
        finish_position: number;
        stage_id: string;
        riders: { name: string } | null;
      }>;
    },
  });

  const myEntry = useMemo(() => entries.find((e) => e.user_id === user?.id), [entries, user?.id]);

  // Stages that actually have any points recorded (server-side gemiddelde > 0)
  const stagesWithData = useMemo(() => {
    return stages.filter((s) => (stageAverages?.get(s.id) ?? 0) > 0);
  }, [stages, stageAverages]);

  // Server-side stand t/m de laatste etappe-met-data → rang-delta voor mijn team.
  const lastStageNum = stagesWithData.length
    ? stagesWithData[stagesWithData.length - 1].stage_number
    : undefined;
  const { data: standRows = [] } = useGameStandings(game?.id, lastStageNum);

  // Subpoule-leden: scoped stage_points (alleen die teams) voor de subpoule-delta.
  const memberEntryIds = useMemo(() => {
    if (!firstSubpoule || !subpouleMembers.length) return [];
    const uids = new Set(subpouleMembers.map((m) => m.user_id));
    return entries.filter((e) => uids.has(e.user_id)).map((e) => e.id);
  }, [firstSubpoule, subpouleMembers, entries]);
  const { data: memberStagePoints = [] } = useStagePointsForEntries(game?.id, memberEntryIds);

  // ── STAT 1: Best stage rank in the full pool (server-side my_stage_ranks) ──
  const bestStageRank = useMemo(() => {
    if (!myStageRanks || myStageRanks.size === 0) return null;
    let best: { rank: number; stageId: string } | null = null;
    myStageRanks.forEach((rank, stageId) => {
      if (!best || rank < best.rank) best = { rank, stageId };
    });
    if (!best) return null;
    const stage = stages.find((s) => s.id === best!.stageId);
    return { rank: best.rank, stage: stage ?? null };
  }, [myStageRanks, stages]);

  // ── STAT 2: Overall pool rank + delta (delta server-side via game_standings) ──
  const overallStat = useMemo(() => {
    if (!myEntry || !entries.length) return null;
    const sorted = [...entries].sort((a, b) => (b.total_points ?? 0) - (a.total_points ?? 0));
    const rank = sorted.findIndex((e) => e.id === myEntry.id) + 1;
    if (!rank) return null;
    const myRow = standRows.find((r) => r.entry_id === myEntry.id);
    const delta = myRow?.delta ?? 0;
    return { rank, total: entries.length, delta };
  }, [myEntry, entries, standRows]);

  // ── STAT 3: Subpoule rank + delta ────────────────────────────────────────
  const subpouleStat = useMemo(() => {
    if (!myEntry || !firstSubpoule || !subpouleMembers.length) return null;

    const memberUserIds = new Set(subpouleMembers.map((m) => m.user_id));
    const memberEntries = entries.filter((e) => memberUserIds.has(e.user_id));
    if (!memberEntries.length) return null;

    const sorted = [...memberEntries].sort((a, b) => (b.total_points ?? 0) - (a.total_points ?? 0));
    const rank = sorted.findIndex((e) => e.id === myEntry.id) + 1;
    if (!rank) return null;

    let delta = 0;
    if (stagesWithData.length >= 2) {
      const memberEntryIds = new Set(memberEntries.map((e) => e.id));
      const lastIdx = stages.indexOf(stagesWithData[stagesWithData.length - 1]);
      const prevIdx = stages.indexOf(stagesWithData[stagesWithData.length - 2]);

      const subCum = (upToIdx: number) => {
        const allowed = new Set(stages.slice(0, upToIdx + 1).map((s) => s.id));
        const m = new Map<string, number>();
        memberStagePoints
          .filter((sp) => allowed.has(sp.stage_id) && memberEntryIds.has(sp.entry_id))
          .forEach((sp) => m.set(sp.entry_id, (m.get(sp.entry_id) ?? 0) + sp.points));
        return m;
      };

      delta = rankInMap(subCum(prevIdx), myEntry.id, memberEntries) - rankInMap(subCum(lastIdx), myEntry.id, memberEntries);
    }

    return { rank, total: memberEntries.length, name: firstSubpoule.name, delta };
  }, [myEntry, firstSubpoule, subpouleMembers, entries, stagesWithData, stages, memberStagePoints]);

  // ── STAT 4: Best scoring rider ───────────────────────────────────────────
  const bestRiderStat = useMemo(() => {
    if (!schema.length || !ridersAllResults.length) return null;

    const jokerSet = new Set(jokerIds);
    const ptsTable = new Map(
      schema.filter((s) => s.classification === "stage").map((s) => [s.position, s.points])
    );

    const riderTotals = new Map<string, { pts: number; name: string }>();
    for (const r of ridersAllResults) {
      const base = ptsTable.get(r.finish_position) ?? 0;
      if (base === 0) continue;
      const pts = jokerSet.has(r.rider_id) ? base * 2 : base;
      const name = (r.riders as { name: string } | null)?.name ?? "—";
      const cur = riderTotals.get(r.rider_id);
      riderTotals.set(r.rider_id, { pts: (cur?.pts ?? 0) + pts, name: cur?.name ?? name });
    }

    let best: { pts: number; name: string } | null = null;
    for (const info of riderTotals.values()) {
      if (!best || info.pts > best.pts) best = info;
    }
    return best?.pts ? best : null;
  }, [schema, ridersAllResults, jokerIds]);

  // ── Animated counters ─────────────────────────────────────────────────────
  const aBestRank     = useCountUp(bestStageRank?.rank ?? 0,  650,   0);
  const aOverallRank  = useCountUp(overallStat?.rank ?? 0,    650,  80);
  const aSubpouleRank = useCountUp(subpouleStat?.rank ?? 0,   650, 160);
  const aRiderPts     = useCountUp(bestRiderStat?.pts ?? 0,   650, 240);

  if (!entry || !user) return null;

  const Num = ({ n, rank }: { n: number; rank: number | null }) => (
    <span className="font-display font-black leading-none tabular-nums" style={{ fontSize: "2rem", color: rankColor(rank) }}>
      {n}<span style={{ fontSize: "1.3rem" }}>e</span>
    </span>
  );

  return (
    <div className="grid grid-cols-2">

      {/* 1 — Meilleure étape */}
      <StatCard label="Meilleure étape" delay={0} index={0} isEmpty={!bestStageRank}>
        {bestStageRank && (
          <>
            <Num n={aBestRank} rank={bestStageRank.rank} />
            <span className="text-[10px] font-mono leading-tight" style={{ color: "#8B7355" }}>
              {bestStageRank.stage
                ? `Rit ${bestStageRank.stage.stage_number}${bestStageRank.stage.name ? ` · ${bestStageRank.stage.name}` : ""}`
                : "—"}
            </span>
          </>
        )}
      </StatCard>

      {/* 2 — Classement général */}
      <StatCard label="Classement général" delay={80} index={1} isEmpty={!overallStat}>
        {overallStat && (
          <>
            <div className="flex items-baseline gap-2">
              <Num n={aOverallRank} rank={overallStat.rank} />
              <Delta n={overallStat.delta} />
            </div>
            <span className="text-[10px] font-mono leading-tight" style={{ color: "#8B7355" }}>
              van {overallStat.total} deelnemers
            </span>
          </>
        )}
      </StatCard>

      {/* 3 — Sous-peloton */}
      <StatCard label="Sous-peloton" delay={160} index={2} isEmpty={!subpouleStat}>
        {subpouleStat && (
          <>
            <div className="flex items-baseline gap-2">
              <Num n={aSubpouleRank} rank={subpouleStat.rank} />
              <Delta n={subpouleStat.delta} />
            </div>
            <span className="text-[10px] font-mono leading-tight truncate" style={{ color: "#8B7355" }}>
              van {subpouleStat.total} · {subpouleStat.name}
            </span>
          </>
        )}
      </StatCard>

      {/* 4 — Coureur étoile */}
      <StatCard label="Coureur étoile" delay={240} index={3} isEmpty={!bestRiderStat}>
        {bestRiderStat && (
          <>
            <span
              className={cn("font-display font-black leading-tight", bestRiderStat.name.length > 12 ? "text-base" : "text-lg")}
              style={{ color: rankColor(1) }}
            >
              {bestRiderStat.name}
            </span>
            <span className="text-[10px] font-mono" style={{ color: "#8B7355" }}>
              +{aRiderPts} pts totaal
            </span>
          </>
        )}
      </StatCard>

    </div>
  );
}
