import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Swords, ArrowUp, ArrowDown, Flag } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useEntries, useStages, useStagePoints } from "@/hooks/useResults";
import { useSubpouleMembers } from "@/hooks/useSubpoules";
import TeamComparison from "@/components/TeamComparison";
import SubpouleEvolutionChart from "@/components/SubpouleEvolutionChart";
import { cn } from "@/lib/utils";

type Props = {
  subpouleId: string;
  subpouleName: string;
};

export default function SubpouleStandings({ subpouleId, subpouleName }: Props) {
  const { user } = useAuth();
  const { data: game } = useCurrentGame();
  const { data: members = [], isLoading: membersLoading } = useSubpouleMembers(subpouleId);
  const { data: entries = [] } = useEntries(game?.id);
  const { data: stages = [] } = useStages(game?.id);
  const { data: stagePoints = [] } = useStagePoints(game?.id);

  const [compareId, setCompareId] = useState<string | null>(null);

  // Last stage that has any points recorded
  const lastStageInfo = useMemo(() => {
    const totals = new Map<string, number>();
    stagePoints.forEach((sp) => totals.set(sp.stage_id, (totals.get(sp.stage_id) ?? 0) + sp.points));
    for (let i = stages.length - 1; i >= 0; i--) {
      if ((totals.get(stages[i].id) ?? 0) > 0) return { stage: stages[i], idx: i };
    }
    return null;
  }, [stages, stagePoints]);

  // Member rows: rank, stage_points, delta — built from real stage data
  const memberRows = useMemo(() => {
    // No stage data yet: fall back to entry total_points
    if (!lastStageInfo) {
      return members
        .map((m) => {
          const entry = entries.find((e) => e.user_id === m.user_id);
          return {
            user_id: m.user_id,
            display_name: m.display_name,
            team_name: entry?.team_name ?? null,
            entry_id: entry?.id ?? null,
            total_points: entry?.total_points ?? 0,
            stage_points: 0,
            rank: 0,
            delta: null as number | null,
          };
        })
        .sort((a, b) => b.total_points - a.total_points)
        .map((r, i) => ({ ...r, rank: i + 1 }));
    }

    const { stage: lastStage, idx: lastIdx } = lastStageInfo;

    // Cumulative pts per entry_id up to stage[upToIdx]
    const cumUpTo = (upToIdx: number) => {
      const allowed = new Set(stages.slice(0, upToIdx + 1).map((s) => s.id));
      const m = new Map<string, number>();
      stagePoints
        .filter((sp) => allowed.has(sp.stage_id))
        .forEach((sp) => m.set(sp.entry_id, (m.get(sp.entry_id) ?? 0) + sp.points));
      return m;
    };

    const curMap = cumUpTo(lastIdx);
    const prevMap = lastIdx > 0 ? cumUpTo(lastIdx - 1) : new Map<string, number>();

    // Stage pts for the last stage per entry_id
    const lastStagePts = new Map<string, number>();
    stagePoints
      .filter((sp) => sp.stage_id === lastStage.id)
      .forEach((sp) => lastStagePts.set(sp.entry_id, (lastStagePts.get(sp.entry_id) ?? 0) + sp.points));

    // Previous ranks by user_id
    const prevRankByUser = new Map(
      [...members]
        .map((m) => {
          const entry = entries.find((e) => e.user_id === m.user_id);
          return { user_id: m.user_id, pts: entry ? (prevMap.get(entry.id) ?? 0) : 0 };
        })
        .sort((a, b) => b.pts - a.pts)
        .map((r, i) => [r.user_id, i + 1] as [string, number])
    );

    // Build + sort by cumulative pts
    const rows = members
      .map((m) => {
        const entry = entries.find((e) => e.user_id === m.user_id);
        return {
          user_id: m.user_id,
          display_name: m.display_name,
          team_name: entry?.team_name ?? null,
          entry_id: entry?.id ?? null,
          total_points: entry ? (curMap.get(entry.id) ?? entry.total_points ?? 0) : 0,
          stage_points: entry ? (lastStagePts.get(entry.id) ?? 0) : 0,
        };
      })
      .sort((a, b) => b.total_points - a.total_points);

    return rows.map((row, i) => {
      const rank = i + 1;
      const prevRank = prevRankByUser.get(row.user_id);
      const delta = lastIdx > 0 && prevRank != null ? prevRank - rank : null;
      return { ...row, rank, delta };
    });
  }, [members, entries, stagePoints, stages, lastStageInfo]);

  // Highest stage pts in this subpoule (for badge color thresholds)
  const maxStagePts = useMemo(
    () => Math.max(0, ...memberRows.map((r) => r.stage_points)),
    [memberRows]
  );

  const compareMember = memberRows.find((m) => m.user_id === compareId);

  if (membersLoading) {
    return (
      <Card className="retro-border">
        <CardContent className="p-4 text-sm text-muted-foreground">Klassement laden…</CardContent>
      </Card>
    );
  }
  if (memberRows.length === 0) {
    return (
      <Card className="retro-border">
        <CardContent className="p-4 text-sm text-muted-foreground">
          Nog geen leden in deze subpoule.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Standings table — exact Uitslagen/Klassement design ── */}
      <div className="retro-border bg-card overflow-hidden">
        {/* Giro gradient rule (identical to Uitslagen) */}
        <div className="h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary" />

        {/* Header */}
        <div className="p-4 border-b-2 border-foreground bg-secondary/50 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-[hsl(var(--vintage-gold))]" />
            {subpouleName}
          </h2>
          {lastStageInfo && (
            <span className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider">
              Rit {lastStageInfo.stage.stage_number}
              {lastStageInfo.stage.name ? ` — ${lastStageInfo.stage.name}` : ""}
            </span>
          )}
        </div>

        {/* Rows */}
        <div className="max-h-[600px] overflow-y-auto">
          {memberRows.map((m) => {
            const isMe = m.user_id === user?.id;
            const isComparing = m.user_id === compareId;

            // Rank number color — identical to Uitslagen
            const rankNumCls =
              m.rank === 1 ? "text-amber-400"
              : m.rank === 2 ? "text-zinc-400"
              : m.rank === 3 ? "text-orange-400"
              : "text-muted-foreground/40";

            // Left border accent — identical to Uitslagen
            const rowAccentCls =
              m.rank === 1 ? "border-l-[3px] border-amber-400/70 bg-amber-500/[0.04]"
              : m.rank === 2 ? "border-l-[3px] border-zinc-400/50 bg-zinc-500/[0.03]"
              : m.rank === 3 ? "border-l-[3px] border-orange-400/50 bg-orange-500/[0.03]"
              : "border-l-[3px] border-transparent";

            // Stage pts badge color — analogous to dagRank badge in Uitslagen
            const stageBadgeCls =
              m.stage_points === 0 ? null
              : m.stage_points === maxStagePts
                ? "bg-amber-500/15 border-amber-400/50 text-amber-500"
              : m.stage_points >= maxStagePts * 0.65
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
              : m.stage_points >= maxStagePts * 0.35
                ? "bg-sky-500/15 border-sky-400/30 text-sky-400"
              : "bg-secondary/80 border-border text-muted-foreground/60";

            return (
              <div
                key={m.user_id}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 border-b border-border/40 transition-colors",
                  rowAccentCls,
                  isMe && "bg-primary/[0.08] ring-1 ring-inset ring-primary/30",
                  isComparing && "bg-accent/10"
                )}
              >
                {/* ① Rank number */}
                <div className={cn(
                  "shrink-0 font-display font-black tabular-nums leading-none text-center",
                  m.rank <= 3 ? "text-2xl w-9" : "text-sm w-7",
                  rankNumCls
                )}>
                  {m.rank}
                </div>

                {/* ② Name + positiewijziging (delta) */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      "font-sans text-sm truncate",
                      isMe
                        ? "font-bold text-primary"
                        : m.rank <= 3
                        ? "font-semibold"
                        : "font-medium"
                    )}>
                      {m.team_name ?? m.display_name ?? "—"}
                    </span>
                    {isMe && (
                      <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/30 rounded px-1 py-px leading-4">
                        jij
                      </span>
                    )}
                    {!m.entry_id && (
                      <Badge variant="secondary" className="text-xs">geen team</Badge>
                    )}
                  </div>
                  {/* Delta — groen omhoog, rood omlaag; zelfde stijl als Uitslagen */}
                  {m.delta != null && m.delta !== 0 && (
                    <div className={cn(
                      "flex items-center gap-0.5 text-[10px] font-semibold tabular-nums mt-0.5 leading-none",
                      m.delta > 0 ? "text-emerald-500" : "text-rose-500"
                    )}>
                      {m.delta > 0
                        ? <ArrowUp className="w-2.5 h-2.5" />
                        : <ArrowDown className="w-2.5 h-2.5" />}
                      {Math.abs(m.delta)}
                    </div>
                  )}
                </div>

                {/* ③ Etappepunten badge — analogous to dagRank badge in Uitslagen */}
                {stageBadgeCls && (
                  <div className={cn(
                    "shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
                    stageBadgeCls
                  )}>
                    <Flag className="w-2.5 h-2.5 shrink-0" />
                    <span className="text-[10px] font-bold tabular-nums">{m.stage_points}</span>
                  </div>
                )}

                {/* ④ Totaalpunten */}
                <div className="shrink-0 text-right min-w-[3rem]">
                  <span className={cn(
                    "font-display font-bold tabular-nums",
                    m.rank === 1 ? "text-xl text-amber-500" : "text-base"
                  )}>
                    {m.total_points}
                  </span>
                  <span className="text-[9px] text-muted-foreground font-mono ml-0.5">pt</span>
                </div>

                {/* ⑤ Vergelijkknop (Swords) */}
                {!isMe && m.entry_id && (
                  <button
                    onClick={() => setCompareId(isComparing ? null : m.user_id)}
                    className={cn(
                      "shrink-0 p-1.5 rounded border border-border hover:bg-accent/20 transition-colors",
                      isComparing && "bg-accent/30 border-accent"
                    )}
                    title={isComparing ? "Vergelijking sluiten" : "Vergelijk met jouw team"}
                  >
                    <Swords className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Head-to-head vergelijking */}
      {compareMember && ["live", "locked", "finished", "closed"].includes(String(game?.status ?? "")) && (
        <TeamComparison
          opponentUserId={compareMember.user_id}
          opponentName={compareMember.display_name}
          subpouleId={subpouleId}
        />
      )}

      {/* Cumulatieve evolutiegrafiek */}
      <SubpouleEvolutionChart subpouleId={subpouleId} />
    </div>
  );
}
