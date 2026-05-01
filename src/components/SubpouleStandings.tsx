import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Crown, Swords } from "lucide-react";
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
  Legend,
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
  const { data: members = [] } = useSubpouleMembers(subpouleId);
  const { data: entries = [] } = useEntries(game?.id);
  const { data: stages = [] } = useStages(game?.id);
  const { data: stagePoints = [] } = useStagePoints(game?.id);

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

      {/* Per-stage cumulative line chart */}
      <Card className="retro-border">
        <CardHeader className="border-b-2 border-foreground bg-secondary/30">
          <CardTitle className="font-display flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Verloop per etappe
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Klik op een lid in de ranglijst om die lijn te markeren.
          </p>
        </CardHeader>
        <CardContent className="p-4">
          {chartData.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              Nog geen etappes beschikbaar.
            </div>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="stage"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "2px solid hsl(var(--foreground))",
                      borderRadius: "0.375rem",
                      fontSize: "12px",
                    }}
                    formatter={(value: number, name: string) => {
                      const m = memberRows.find((r) => r.user_id === name);
                      return [`${value} pt`, m?.display_name ?? name];
                    }}
                  />
                  <Legend
                    formatter={(value: string) => {
                      const m = memberRows.find((r) => r.user_id === value);
                      return m?.display_name ?? value;
                    }}
                    wrapperStyle={{ fontSize: "11px" }}
                  />
                  {memberRows.map((m, idx) => {
                    const color = LINE_COLORS[idx % LINE_COLORS.length];
                    const isHighlighted = m.user_id === highlightId;
                    return (
                      <Line
                        key={m.user_id}
                        type="monotone"
                        dataKey={m.user_id}
                        name={m.user_id}
                        stroke={color}
                        strokeWidth={isHighlighted ? 3 : 1.5}
                        strokeOpacity={highlightId && !isHighlighted ? 0.35 : 1}
                        dot={false}
                        activeDot={{ r: 5 }}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
