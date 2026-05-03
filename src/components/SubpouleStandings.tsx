import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Trophy, TrendingUp, Crown, Swords, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useEntries, useStages, useStagePoints } from "@/hooks/useResults";
import { useSubpouleMembers } from "@/hooks/useSubpoules";
import TeamComparison from "@/components/TeamComparison";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

type Props = {
  subpouleId: string;
  subpouleName: string;
};

// Bold contrasting palette for max distinguishability
const LINE_COLORS = [
  "#E6194B", "#3CB44B", "#4363D8", "#F58231",
  "#911EB4", "#42D4F4", "#F032E6", "#9A6324",
  "#469990", "#800000", "#808000", "#000075",
  "#FF6F00", "#00BFA5", "#C71585", "#1E88E5",
];

export default function SubpouleStandings({ subpouleId, subpouleName }: Props) {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { data: game } = useCurrentGame();
  const { data: members = [], isLoading: membersLoading, error: membersError } = useSubpouleMembers(subpouleId);
  const { data: entries = [] } = useEntries(game?.id);
  const { data: stages = [] } = useStages(game?.id);
  const { data: stagePoints = [] } = useStagePoints(game?.id);

  // eslint-disable-next-line no-console
  console.log("[SubpouleStandings]", { subpouleId, membersLoading, membersCount: members.length, membersError });

  // Members → entries
  const memberRows = useMemo(() => {
    return members
      .map((m) => {
        const entry = entries.find((e) => e.user_id === m.user_id);
        return {
          user_id: m.user_id,
          display_name: m.display_name,
          team_name: entry?.team_name ?? null,
          entry_id: entry?.id ?? null,
          total_points: entry?.total_points ?? 0,
        };
      })
      .sort((a, b) => b.total_points - a.total_points);
  }, [members, entries]);

  // Default highlight = current user, fallback to leader
  const [highlightId, setHighlightId] = useState<string | null>(null);
  useEffect(() => {
    if (highlightId) return;
    const me = memberRows.find((m) => m.user_id === user?.id);
    setHighlightId(me?.user_id ?? memberRows[0]?.user_id ?? null);
  }, [memberRows, user?.id, highlightId]);

  // Compare opponent
  const [compareId, setCompareId] = useState<string | null>(null);
  const compareMember = memberRows.find((m) => m.user_id === compareId);

  // Visibility per member (default: all visible)
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const toggleVisible = (uid: string) => {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };
  const allHidden = memberRows.length > 0 && memberRows.every((m) => hiddenIds.has(m.user_id));
  const toggleAll = () => {
    if (allHidden) setHiddenIds(new Set());
    else setHiddenIds(new Set(memberRows.map((m) => m.user_id)));
  };
  // Build per-stage ranking data: x = stage, value per member = rank (1=best)
  const chartData = useMemo(() => {
    const sortedStages = [...stages].sort((a, b) => a.stage_number - b.stage_number);
    if (sortedStages.length === 0) return [];

    const ptsByEntryStage = new Map<string, Map<string, number>>();
    for (const sp of stagePoints) {
      if (!ptsByEntryStage.has(sp.entry_id)) ptsByEntryStage.set(sp.entry_id, new Map());
      ptsByEntryStage.get(sp.entry_id)!.set(sp.stage_id, sp.points);
    }

    const cumulative = new Map<string, number>();

    return sortedStages.map((stage) => {
      const row: Record<string, number | string> = {
        stage: `E${stage.stage_number}`,
        stageNumber: stage.stage_number,
        stageName: stage.name ?? "",
      };
      const deltas = new Map<string, number>();
      for (const m of memberRows) {
        const prev = cumulative.get(m.user_id) ?? 0;
        const got = m.entry_id ? ptsByEntryStage.get(m.entry_id)?.get(stage.id) ?? 0 : 0;
        const next = prev + got;
        cumulative.set(m.user_id, next);
        deltas.set(m.user_id, got);
        row[`pts_${m.user_id}`] = next;
        row[`delta_${m.user_id}`] = got;
      }
      // Rank by cumulative pts desc; ties share rank
      const sorted = [...memberRows]
        .map((m) => ({ id: m.user_id, pts: cumulative.get(m.user_id) ?? 0 }))
        .sort((a, b) => b.pts - a.pts);
      let lastPts = -Infinity;
      let lastRank = 0;
      sorted.forEach((s, i) => {
        const rank = s.pts === lastPts ? lastRank : i + 1;
        lastPts = s.pts;
        lastRank = rank;
        row[`rank_${s.id}`] = rank;
      });
      return row;
    });
  }, [stages, stagePoints, memberRows]);

  // Determine current/latest stage = highest stage_number with any points
  const currentStageLabel = useMemo(() => {
    if (chartData.length === 0) return null;
    const stagesWithPts = new Set<number>();
    const stageById = new Map(stages.map((s) => [s.id, s.stage_number]));
    for (const sp of stagePoints) {
      const n = stageById.get(sp.stage_id);
      if (n !== undefined && (sp.points ?? 0) !== 0) stagesWithPts.add(n);
    }
    if (stagesWithPts.size === 0) return null;
    const latest = Math.max(...stagesWithPts);
    return `E${latest}`;
  }, [chartData, stages, stagePoints]);

  if (membersLoading) {
    return (
      <Card className="retro-border">
        <CardContent className="p-6 text-sm text-muted-foreground">Klassement laden…</CardContent>
      </Card>
    );
  }
  if (memberRows.length === 0) {
    return (
      <Card className="retro-border">
        <CardContent className="p-6 text-sm text-muted-foreground">
          Nog geen leden in deze subpoule.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Standings table */}
      <Card className="retro-border">
        <CardHeader className="border-b-2 border-foreground bg-secondary/30">
          <CardTitle className="font-display flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Subpoule klassement — {subpouleName}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {memberRows.map((m, idx) => {
              const isMe = m.user_id === user?.id;
              const isHighlighted = m.user_id === highlightId;
              const isComparing = m.user_id === compareId;
              const colorIdx = memberRows.findIndex((r) => r.user_id === m.user_id) % LINE_COLORS.length;
              return (
                <div
                  key={m.user_id}
                  className={cn(
                    "p-3 flex items-center justify-between gap-3 transition-colors",
                    isHighlighted && "bg-primary/10",
                    isComparing && "bg-accent/10"
                  )}
                >
                  <button
                    onClick={() => setHighlightId(m.user_id)}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left hover:opacity-80"
                  >
                    <span className="font-display text-lg font-bold w-6 text-center text-muted-foreground">
                      {idx + 1}
                    </span>
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: LINE_COLORS[colorIdx] }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{m.display_name}</span>
                        {idx === 0 && <Crown className="h-3 w-3 text-primary" />}
                        {isMe && (
                          <Badge variant="outline" className="text-xs">jij</Badge>
                        )}
                        {!m.entry_id && (
                          <Badge variant="secondary" className="text-xs">geen team</Badge>
                        )}
                      </div>
                      {m.team_name && (
                        <div className="text-xs text-muted-foreground truncate">{m.team_name}</div>
                      )}
                    </div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="font-display font-bold text-lg tabular-nums">
                      {m.total_points}
                      <span className="text-xs font-normal text-muted-foreground ml-1">pt</span>
                    </div>
                    <button
                      onClick={() => toggleVisible(m.user_id)}
                      className={cn(
                        "p-1.5 rounded border border-border hover:bg-secondary transition-colors",
                        hiddenIds.has(m.user_id) ? "opacity-50" : "bg-secondary/40"
                      )}
                      title={hiddenIds.has(m.user_id) ? "Toon in grafiek" : "Verberg uit grafiek"}
                    >
                      {hiddenIds.has(m.user_id)
                        ? <EyeOff className="h-3.5 w-3.5" />
                        : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    {!isMe && m.entry_id && (
                      <button
                        onClick={() => setCompareId(isComparing ? null : m.user_id)}
                        className={cn(
                          "p-1.5 rounded border border-border hover:bg-accent/20 transition-colors",
                          isComparing && "bg-accent/30 border-accent"
                        )}
                        title={isComparing ? "Vergelijking sluiten" : "Vergelijk met jouw team"}
                      >
                        <Swords className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Head-to-head comparison */}
      {compareMember && (
        <TeamComparison
          opponentUserId={compareMember.user_id}
          opponentName={compareMember.display_name}
          subpouleId={subpouleId}
        />
      )}

      {/* Per-stage cumulative line chart */}
      <Card className="retro-border">
        <CardHeader className="border-b-2 border-foreground bg-secondary/30">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="font-display flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Verloop per etappe
            </CardTitle>
            <button
              onClick={toggleAll}
              className="text-xs px-2 py-1 rounded border border-border hover:bg-secondary transition-colors"
            >
              {allHidden ? "Toon alles" : "Verberg alles"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Gebruik <Eye className="inline h-3 w-3" /> bij een lid om die lijn te tonen of verbergen. Klik op een naam om te markeren.
          </p>
          {/* Quick toggles */}
          <div className="flex flex-wrap gap-2 pt-2">
            {memberRows.map((m, idx) => {
              const color = LINE_COLORS[idx % LINE_COLORS.length];
              const visible = !hiddenIds.has(m.user_id);
              return (
                <label
                  key={m.user_id}
                  className={cn(
                    "flex items-center gap-1.5 text-xs px-2 py-1 rounded border cursor-pointer transition-colors",
                    visible ? "border-border bg-background" : "border-border/50 bg-muted/30 opacity-60"
                  )}
                >
                  <Checkbox
                    checked={visible}
                    onCheckedChange={() => toggleVisible(m.user_id)}
                    className="h-3.5 w-3.5"
                  />
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="truncate max-w-[120px]">{m.display_name}</span>
                </label>
              );
            })}
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {chartData.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              Nog geen etappes beschikbaar.
            </div>
          ) : (
            <div className={cn("w-full", isMobile ? "h-72" : "h-96")}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 24, right: isMobile ? 12 : 32, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="stage"
                    tick={{ fontSize: isMobile ? 9 : 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickLine={false}
                    interval={isMobile && chartData.length > 10 ? 1 : 0}
                    padding={{ left: 8, right: 8 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: isMobile ? 9 : 11, fill: "hsl(var(--muted-foreground))" }}
                    width={44}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, (dataMax: number) => {
                      const max = Math.max(10, Math.ceil(dataMax || 0));
                      // round up to a "nice" step
                      const step = max <= 50 ? 10 : max <= 100 ? 20 : max <= 500 ? 50 : max <= 1000 ? 100 : 200;
                      return Math.ceil(max / step) * step;
                    }]}
                    tickCount={isMobile ? 5 : 7}
                    label={{
                      value: "Punten (hoger = beter)",
                      angle: -90,
                      position: "insideLeft",
                      offset: 12,
                      style: { fontSize: 10, fill: "hsl(var(--muted-foreground))", textAnchor: "middle" },
                    }}
                  />
                  {/* Stage markers */}
                  {chartData.map((row) => (
                    <ReferenceLine
                      key={`mark-${row.stage}`}
                      x={row.stage as string}
                      stroke="hsl(var(--border))"
                      strokeDasharray="1 4"
                      ifOverflow="extendDomain"
                    />
                  ))}
                  {/* Highlight current stage */}
                  {currentStageLabel && (
                    <ReferenceLine
                      x={currentStageLabel}
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      label={{
                        value: "Laatste",
                        position: "top",
                        fill: "hsl(var(--primary))",
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    />
                  )}
                  <Tooltip
                    cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1, strokeDasharray: "3 3" }}
                    content={(props: any) => {
                      const { active, payload, label } = props;
                      if (!active || !payload?.length) return null;
                      const row = payload[0].payload as Record<string, any>;
                      const visibleMembers = memberRows.filter((m) => !hiddenIds.has(m.user_id));
                      const sorted = [...visibleMembers].sort(
                        (a, b) => (row[`rank_${a.user_id}`] ?? 999) - (row[`rank_${b.user_id}`] ?? 999)
                      );
                      const stageName = row.stageName as string;
                      return (
                        <div
                          className="rounded-md border border-border bg-card shadow-xl text-xs"
                          style={{ padding: "8px 10px", maxWidth: 260 }}
                        >
                          <div className="font-display font-semibold mb-1.5">
                            Etappe {String(label).replace("E", "")}
                            {stageName ? ` — ${stageName}` : ""}
                          </div>
                          <div className="space-y-0.5">
                            {sorted.map((m) => {
                              const idx = memberRows.findIndex((r) => r.user_id === m.user_id);
                              const color = LINE_COLORS[idx % LINE_COLORS.length];
                              const rank = row[`rank_${m.user_id}`];
                              const pts = row[`pts_${m.user_id}`] ?? 0;
                              const delta = row[`delta_${m.user_id}`] ?? 0;
                              const isMe = m.user_id === user?.id;
                              return (
                                <div
                                  key={m.user_id}
                                  className={cn("flex items-center gap-2", isMe && "font-bold")}
                                >
                                  <span
                                    className="h-2.5 w-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: color }}
                                  />
                                  <span className="w-6 tabular-nums text-muted-foreground">#{rank}</span>
                                  <span className="truncate flex-1">{m.display_name}</span>
                                  <span className="tabular-nums">{pts}pt</span>
                                  {delta > 0 && (
                                    <span className="tabular-nums text-primary">+{delta}</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }}
                  />
                  {memberRows.map((m, idx) => {
                    if (hiddenIds.has(m.user_id)) return null;
                    const color = LINE_COLORS[idx % LINE_COLORS.length];
                    const isHighlighted = m.user_id === highlightId;
                    return (
                      <Line
                        key={m.user_id}
                        type="monotone"
                        dataKey={`pts_${m.user_id}`}
                        name={m.user_id}
                        stroke={color}
                        strokeWidth={isHighlighted ? 3.5 : 2}
                        strokeOpacity={isHighlighted ? 1 : 0.85}
                        dot={{ r: isMobile ? 2 : 3, fill: color, strokeWidth: 0 }}
                        activeDot={{ r: isHighlighted ? 7 : 5, strokeWidth: 2, stroke: "hsl(var(--background))" }}
                        animationDuration={500}
                        connectNulls
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground mt-2 text-center italic">
            Cumulatieve punten per etappe · hoger = beter
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
