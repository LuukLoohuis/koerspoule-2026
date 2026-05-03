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
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LabelList,
} from "recharts";
import { cn } from "@/lib/utils";

type Props = {
  subpouleId: string;
  subpouleName: string;
};

// Stable color palette for member lines (HSL via design tokens where possible)
const LINE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(0 70% 50%)",
  "hsl(140 60% 40%)",
  "hsl(45 90% 45%)",
  "hsl(200 70% 45%)",
  "hsl(280 55% 50%)",
  "hsl(20 80% 50%)",
  "hsl(170 55% 40%)",
  "hsl(310 60% 50%)",
];

export default function SubpouleStandings({ subpouleId, subpouleName }: Props) {
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
  // Build cumulative line graph data: x = stage_number, one series per member
  const chartData = useMemo(() => {
    const sortedStages = [...stages].sort((a, b) => a.stage_number - b.stage_number);
    if (sortedStages.length === 0) return [];

    // entry_id → { stage_id → points }
    const ptsByEntryStage = new Map<string, Map<string, number>>();
    for (const sp of stagePoints) {
      if (!ptsByEntryStage.has(sp.entry_id)) ptsByEntryStage.set(sp.entry_id, new Map());
      ptsByEntryStage.get(sp.entry_id)!.set(sp.stage_id, sp.points);
    }

    const cumulative = new Map<string, number>(); // user_id → running total

    return sortedStages.map((stage) => {
      const row: Record<string, number | string> = {
        stage: `E${stage.stage_number}`,
        stageNumber: stage.stage_number,
      };
      for (const m of memberRows) {
        const prev = cumulative.get(m.user_id) ?? 0;
        const got = m.entry_id ? ptsByEntryStage.get(m.entry_id)?.get(stage.id) ?? 0 : 0;
        const next = prev + got;
        cumulative.set(m.user_id, next);
        row[m.user_id] = next;
      }
      return row;
    });
  }, [stages, stagePoints, memberRows]);

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
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 24, right: 32, left: 0, bottom: 8 }}>
                  <defs>
                    {memberRows.map((m, idx) => {
                      const color = LINE_COLORS[idx % LINE_COLORS.length];
                      return (
                        <linearGradient key={m.user_id} id={`grad-${m.user_id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                          <stop offset="100%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                      );
                    })}
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="stage"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tickLine={false}
                    interval="preserveStartEnd"
                    padding={{ left: 8, right: 8 }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    width={40}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1, strokeDasharray: "3 3" }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                      fontSize: "12px",
                      boxShadow: "0 8px 24px -8px hsl(var(--foreground) / 0.25)",
                      padding: "8px 12px",
                    }}
                    labelStyle={{ fontFamily: "Playfair Display, serif", fontWeight: 600, marginBottom: 4 }}
                    formatter={(value: number, name: string) => {
                      const m = memberRows.find((r) => r.user_id === name);
                      return [`${value} pt`, m?.display_name ?? name];
                    }}
                    itemSorter={(item: any) => -(item.value as number)}
                  />
                  {highlightId && !hiddenIds.has(highlightId) && (
                    <Area
                      type="monotone"
                      dataKey={highlightId}
                      stroke="none"
                      fill={`url(#grad-${highlightId})`}
                      isAnimationActive={false}
                    />
                  )}
                  {memberRows.map((m, idx) => {
                    if (hiddenIds.has(m.user_id)) return null;
                    const color = LINE_COLORS[idx % LINE_COLORS.length];
                    const isHighlighted = m.user_id === highlightId;
                    const dim = highlightId && !isHighlighted;
                    return (
                      <Line
                        key={m.user_id}
                        type="monotone"
                        dataKey={m.user_id}
                        name={m.user_id}
                        stroke={color}
                        strokeWidth={isHighlighted ? 3 : 1.75}
                        strokeOpacity={dim ? 0.28 : 1}
                        dot={false}
                        activeDot={{ r: isHighlighted ? 6 : 4, strokeWidth: 2, stroke: "hsl(var(--background))" }}
                        animationDuration={600}
                      >
                        {isHighlighted && (
                          <LabelList
                            dataKey={m.user_id}
                            content={(props: any) => {
                              const { x, y, value, index } = props;
                              if (index !== chartData.length - 1) return null;
                              return (
                                <g>
                                  <rect x={x - 24} y={y - 22} rx={4} ry={4} width={48} height={18} fill={color} />
                                  <text x={x} y={y - 9} fill="hsl(var(--primary-foreground))" fontSize={11} fontWeight={700} textAnchor="middle">
                                    {value} pt
                                  </text>
                                </g>
                              );
                            }}
                          />
                        )}
                      </Line>
                    );
                  })}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
