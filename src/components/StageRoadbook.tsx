import { useMemo } from "react";
import { mockStageResults } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { Mountain, TrendingUp, Timer, Route } from "lucide-react";

const stageTypeConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  flat: { icon: <Route className="h-3.5 w-3.5" />, label: "Vlak", color: "bg-emerald-500" },
  hilly: { icon: <TrendingUp className="h-3.5 w-3.5" />, label: "Heuvel", color: "bg-amber-500" },
  mountain: { icon: <Mountain className="h-3.5 w-3.5" />, label: "Berg", color: "bg-red-500" },
  itt: { icon: <Timer className="h-3.5 w-3.5" />, label: "Tijdrit", color: "bg-blue-500" },
};

interface StageRoadbookProps {
  selectedStage: number;
  onSelectStage: (index: number) => void;
  /** Points per stage to show as bars. If omitted, bars are hidden. */
  stagePoints?: number[];
  /** Whether to include a GC button before the stages */
  showGcButton?: boolean;
  /** Whether GC is currently selected (only relevant if showGcButton=true) */
  gcSelected?: boolean;
  /** Callback when GC button is clicked */
  onSelectGc?: () => void;
  /** Compact mode for inline use (e.g. inside compare views) */
  compact?: boolean;
}

export default function StageRoadbook({
  selectedStage,
  onSelectStage,
  stagePoints,
  showGcButton,
  gcSelected,
  onSelectGc,
  compact,
}: StageRoadbookProps) {
  const maxPts = useMemo(() => Math.max(...(stagePoints || [0]), 1), [stagePoints]);

  if (compact) {
    return (
      <div className="overflow-x-auto">
        <div className="flex items-end gap-1 min-w-max">
          {showGcButton && (
            <button
              onClick={onSelectGc}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-1.5 rounded-md transition-all min-w-[3rem]",
                gcSelected
                  ? "bg-primary/10 ring-2 ring-primary"
                  : "hover:bg-secondary/50"
              )}
            >
              <span className={cn("text-[10px] font-bold", gcSelected ? "text-primary" : "text-muted-foreground")}>GC</span>
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center",
                gcSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              )}>
                🏆
              </div>
            </button>
          )}
          {mockStageResults.map((stage, i) => {
            const cfg = stageTypeConfig[stage.type] || stageTypeConfig.flat;
            const pts = stagePoints?.[i];
            const barHeight = pts != null ? Math.max(8, (pts / maxPts) * 40) : undefined;
            const isSelected = !gcSelected && selectedStage === i;

            return (
              <button
                key={stage.stage}
                onClick={() => onSelectStage(i)}
                className={cn(
                  "group flex flex-col items-center gap-0.5 px-1 py-1 rounded-md transition-all min-w-[2.5rem]",
                  isSelected ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-secondary/50"
                )}
                title={`${stage.route} • ${stage.distance}`}
              >
                {barHeight != null && (
                  <>
                    <span className={cn(
                      "text-[9px] font-bold tabular-nums",
                      isSelected ? "text-primary" : "text-muted-foreground",
                      (pts ?? 0) > 0 ? "opacity-100" : "opacity-40"
                    )}>
                      {(pts ?? 0) > 0 ? pts : "–"}
                    </span>
                    <div className="w-5 flex items-end justify-center" style={{ height: 40 }}>
                      <div
                        className={cn("w-full rounded-t transition-all", isSelected ? cfg.color : "bg-muted")}
                        style={{ height: barHeight }}
                      />
                    </div>
                  </>
                )}
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center transition-all text-[10px]",
                  isSelected ? cn(cfg.color, "text-white") : "bg-secondary text-muted-foreground"
                )}>
                  {cfg.icon}
                </div>
                <span className={cn(
                  "text-[9px] font-display font-bold",
                  isSelected ? "text-primary" : "text-muted-foreground"
                )}>
                  {stage.stage}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Full mode with legend header
  return (
    <div className="retro-border bg-card overflow-hidden">
      <div className="p-3 border-b-2 border-foreground bg-secondary/50 flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-display text-sm font-bold uppercase tracking-wider">Routekaart</h2>
        <div className="flex gap-3 text-xs">
          {Object.entries(stageTypeConfig).map(([key, cfg]) => (
            <span key={key} className="flex items-center gap-1 text-muted-foreground">
              <span className={cn("w-2 h-2 rounded-full", cfg.color)} />
              {cfg.label}
            </span>
          ))}
        </div>
      </div>
      <div className="p-3 overflow-x-auto">
        <div className="flex items-end gap-1 min-w-max">
          {showGcButton && (
            <button
              onClick={onSelectGc}
              className={cn(
                "group flex flex-col items-center gap-1 px-1 py-1.5 rounded-md transition-all min-w-[3rem]",
                gcSelected ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-secondary/50"
              )}
            >
              {stagePoints && <span className="text-[10px] font-bold text-muted-foreground">&nbsp;</span>}
              {stagePoints && <div className="w-6" style={{ height: 56 }} />}
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs",
                gcSelected ? "bg-primary text-primary-foreground shadow-md" : "bg-secondary text-muted-foreground"
              )}>
                🏆
              </div>
              <span className={cn("text-[10px] font-display font-bold", gcSelected ? "text-primary" : "text-muted-foreground")}>GC</span>
            </button>
          )}
          {mockStageResults.map((stage, i) => {
            const cfg = stageTypeConfig[stage.type] || stageTypeConfig.flat;
            const pts = stagePoints?.[i];
            const barHeight = pts != null ? Math.max(8, (pts / maxPts) * 56) : undefined;
            const isSelected = !gcSelected && selectedStage === i;

            return (
              <button
                key={stage.stage}
                onClick={() => onSelectStage(i)}
                className={cn(
                  "group flex flex-col items-center gap-1 px-1 py-1.5 rounded-md transition-all relative min-w-[3rem]",
                  isSelected ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-secondary/50"
                )}
                title={`${stage.route} • ${stage.distance}`}
              >
                {barHeight != null && (
                  <>
                    <span className={cn(
                      "text-[10px] font-bold tabular-nums",
                      isSelected ? "text-primary" : "text-muted-foreground",
                      (pts ?? 0) > 0 ? "opacity-100" : "opacity-40"
                    )}>
                      {(pts ?? 0) > 0 ? pts : "–"}
                    </span>
                    <div className="w-6 flex items-end justify-center" style={{ height: 56 }}>
                      <div
                        className={cn("w-full rounded-t transition-all", isSelected ? cfg.color : "bg-muted", isSelected && "shadow-sm")}
                        style={{ height: barHeight }}
                      />
                    </div>
                  </>
                )}
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                  isSelected ? cn(cfg.color, "text-white shadow-md") : "bg-secondary text-muted-foreground group-hover:bg-muted"
                )}>
                  {cfg.icon}
                </div>
                <span className={cn(
                  "text-[10px] font-display font-bold",
                  isSelected ? "text-primary" : "text-muted-foreground"
                )}>
                  {stage.stage}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
