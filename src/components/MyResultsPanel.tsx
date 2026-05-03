import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useEntry } from "@/hooks/useEntry";
import { useStages, useStageResults, useStagePoints, useEntries } from "@/hooks/useResults";
import { cn } from "@/lib/utils";
import { Trophy, ListOrdered, Mountain, Activity, Clock } from "lucide-react";

const STAGE_TYPE_META: Record<string, { label: string; color: string; icon: JSX.Element }> = {
  vlak: { label: "Vlak", color: "bg-emerald-500", icon: <Activity className="w-4 h-4" /> },
  heuvelachtig: { label: "Heuvelachtig", color: "bg-amber-500", icon: <Mountain className="w-4 h-4" /> },
  bergop: { label: "Bergop", color: "bg-rose-600", icon: <Mountain className="w-4 h-4" /> },
  bergachtig: { label: "Bergachtig", color: "bg-rose-600", icon: <Mountain className="w-4 h-4" /> },
  tijdrit: { label: "Tijdrit", color: "bg-sky-500", icon: <Clock className="w-4 h-4" /> },
  ploegentijdrit: { label: "Ploegentijdrit", color: "bg-violet-500", icon: <Clock className="w-4 h-4" /> },
};

type View = "etappes" | "poule";

export default function MyResultsPanel() {
  const { user } = useAuth();
  const { data: game } = useCurrentGame();
  const { entry } = useEntry(game?.id);
  const { data: stages = [] } = useStages(game?.id);
  const { data: entries = [] } = useEntries(game?.id);

  const [view, setView] = useState<View>("etappes");
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

  // Auto-select most recent stage with results
  const finishedStages = useMemo(
    () => stages.filter((s) => s.status === "finished" || s.status === "live"),
    [stages]
  );
  const activeStageId =
    selectedStageId ?? finishedStages[finishedStages.length - 1]?.id ?? stages[0]?.id ?? null;

  const { data: stageResults = [] } = useStageResults(activeStageId ?? undefined);
  const { data: allStagePoints = [] } = useStagePoints(game?.id);
  const stagePoints = useMemo(
    () => allStagePoints.filter((sp) => sp.stage_id === activeStageId),
    [allStagePoints, activeStageId]
  );

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => (b.total_points ?? 0) - (a.total_points ?? 0)),
    [entries]
  );

  const stagePointsByEntry = useMemo(
    () => Object.fromEntries(stagePoints.map((sp) => [sp.entry_id, sp.points])),
    [stagePoints]
  );

  const stageRanking = useMemo(
    () => [...entries]
      .map((e) => ({ ...e, points: stagePointsByEntry[e.id] ?? 0 }))
      .sort((a, b) => b.points - a.points),
    [entries, stagePointsByEntry]
  );

  if (!game) return <div className="retro-border bg-card p-6 text-muted-foreground">Geen actieve koers.</div>;

  const myEntryId = entry?.id;

  return (
    <div className="space-y-5">
      {/* Sub-nav */}
      <div className="flex gap-2 flex-wrap">
        {([
          { id: "etappes", label: "📋 Etappes", icon: ListOrdered },
          { id: "poule", label: "🏅 Deelnemers", icon: Trophy },
        ] as const).map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={cn(
              "px-4 py-2 text-sm font-bold rounded-md border-2 transition-all",
              view === v.id ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-muted-foreground"
            )}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === "etappes" && (
        <>
          {/* Stage selector */}
          <Card className="retro-border">
            <CardContent className="p-3 overflow-x-auto">
              <div className="flex gap-1 min-w-max">
                {stages.map((s) => {
                  const isActive = s.id === activeStageId;
                  const meta = STAGE_TYPE_META[s.stage_type ?? "vlak"];
                  const pts = stagePointsByEntry[myEntryId ?? ""] && s.id === activeStageId
                    ? stagePointsByEntry[myEntryId ?? ""]
                    : 0;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStageId(s.id)}
                      className={cn(
                        "flex flex-col items-center gap-1 px-2 py-1.5 rounded transition min-w-[44px]",
                        isActive ? "bg-primary text-primary-foreground" : "hover:bg-secondary",
                        s.status === "draft" && "opacity-60"
                      )}
                    >
                      <span className="text-[10px] font-bold tabular-nums">{s.stage_number}</span>
                      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white", meta?.color ?? "bg-muted")}>
                        {meta?.icon}
                      </div>
                      <span className="text-[9px] tabular-nums opacity-70">{pts || ""}</span>
                    </button>
                  );
                })}
                {stages.length === 0 && <span className="text-sm text-muted-foreground p-2">Geen etappes.</span>}
              </div>
            </CardContent>
          </Card>

          {/* Pool ranking for this stage */}
          <Card className="retro-border">
            <CardHeader className="border-b-2 border-foreground bg-secondary/30 py-3">
              <CardTitle className="font-display text-base">Rangschikking alle deelnemers — deze etappe</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
                {stageRanking.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground text-center">Nog geen punten.</div>
                ) : (
                  stageRanking.map((e, i) => {
                    const isMe = e.id === myEntryId;
                    return (
                      <div key={e.id} className={cn("p-3 flex items-center justify-between gap-3", isMe && "bg-primary/10")}>
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-mono text-xs text-muted-foreground w-8 shrink-0 tabular-nums">#{i + 1}</span>
                          <span className="font-medium truncate">{e.team_name ?? "Ploeg"}</span>
                          {isMe && <Badge variant="outline" className="text-xs">jij</Badge>}
                        </div>
                        <span className="font-display text-base font-bold tabular-nums">{e.points} pt</span>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Race results for this stage */}
          {stageResults.length > 0 && (
            <Card className="retro-border">
              <CardHeader className="border-b-2 border-foreground bg-secondary/30 py-3">
                <CardTitle className="font-display text-base">🏁 Etappe uitslag</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
                  {[...stageResults]
                    .filter((r) => r.finish_position != null)
                    .sort((a, b) => (a.finish_position ?? 999) - (b.finish_position ?? 999))
                    .slice(0, 30)
                    .map((r) => (
                      <div key={r.id} className="p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-mono text-xs text-muted-foreground w-8 shrink-0 tabular-nums">#{r.finish_position}</span>
                          <span className="font-medium truncate">{r.rider_name ?? r.riders?.name ?? "Renner"}</span>
                          {r.riders?.teams?.name && (
                            <span className="text-xs text-muted-foreground truncate">{r.riders.teams.name}</span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {view === "poule" && (
        <Card className="retro-border">
          <CardHeader className="border-b-2 border-foreground bg-secondary/30">
            <CardTitle className="font-display flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" /> Algemeen klassement alle deelnemers
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
              {sortedEntries.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground text-center">Nog geen ingediende teams.</div>
              ) : (
                sortedEntries.map((e, i) => {
                  const isMe = e.id === myEntryId;
                  return (
                    <div key={e.id} className={cn("p-3 flex items-center justify-between gap-3", isMe && "bg-primary/10")}>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-xs text-muted-foreground w-8 shrink-0 tabular-nums">#{i + 1}</span>
                        <span className="font-medium truncate">{e.team_name ?? "Ploeg"}</span>
                        {isMe && <Badge variant="outline" className="text-xs">jij</Badge>}
                      </div>
                      <span className="font-display text-lg font-bold tabular-nums">{e.total_points ?? 0}</span>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {view === "gc" && (
        <Card className="retro-border">
          <CardHeader className="border-b-2 border-foreground bg-secondary/30">
            <CardTitle className="font-display flex items-center gap-2">
              <Mountain className="h-5 w-5 text-primary" /> Algemeen klassement (laatste etappe)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
              {stageResults.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground text-center">Geen GC-data beschikbaar.</div>
              ) : (
                [...stageResults]
                  .filter((r) => r.gc_position != null)
                  .sort((a, b) => (a.gc_position ?? 999) - (b.gc_position ?? 999))
                  .slice(0, 50)
                  .map((r) => (
                    <div key={r.id} className="p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-xs text-muted-foreground w-8 shrink-0 tabular-nums">#{r.gc_position}</span>
                        <span className="font-medium truncate">{r.rider_name ?? r.riders?.name ?? "Renner"}</span>
                        {r.riders?.teams?.name && (
                          <span className="text-xs text-muted-foreground truncate">{r.riders.teams.name}</span>
                        )}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
