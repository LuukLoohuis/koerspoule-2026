/**
 * StageBars — vintage Tour-de-France stage selector.
 *
 * Volledig visuele upgrade: capsule-vormige staven met type-kleur, height
 * gebaseerd op earnedPoints, circulair badge-icoon bovenaan en bold points
 * onder elke staaf. GC krijgt een gouden capsule met kroon-badge.
 *
 * API ongewijzigd — wordt hergebruikt door Klassement-tab, Etappes-tab en
 * Mijn Peloton → Punten per etappe.
 *
 * Reusable sub-components (intern): <StageBadge>, <StageBar>, <GcColumn>.
 * Tokens uit src/index.css (--ink-sepia, --paper-light, --medal-gold).
 */

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Zap, Mountain, MountainSnow, Timer, Crown, Lock, Route } from "lucide-react";
import type { StageRow } from "@/hooks/useResults";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type StageType = "vlak" | "heuvelachtig" | "bergop" | "tijdrit" | "ploegentijdrit";

const TYPE_COLOR: Record<StageType, { mid: string; deep: string; ring: string; label: string }> = {
  vlak:           { mid: "#3FA76A", deep: "#2E8B57", ring: "#1F6B3F", label: "Vlak" },
  heuvelachtig:   { mid: "#E0A411", deep: "#C0851A", ring: "#8E600F", label: "Heuvelachtig" },
  bergop:         { mid: "#D04A66", deep: "#A82C49", ring: "#7A1F36", label: "Bergrit" },
  tijdrit:        { mid: "#4E81B2", deep: "#2E5E8C", ring: "#1F4368", label: "Tijdrit" },
  ploegentijdrit: { mid: "#7E5BB2", deep: "#5C3F8C", ring: "#3F2A66", label: "Ploegentijdrit" },
};

function typeIcon(t: StageType, size = 14) {
  switch (t) {
    case "vlak":         return <Zap size={size} strokeWidth={2.4} />;
    case "heuvelachtig": return <Mountain size={size} strokeWidth={2.4} />;
    case "bergop":       return <MountainSnow size={size} strokeWidth={2.4} />;
    case "tijdrit":      return <Timer size={size} strokeWidth={2.4} />;
    case "ploegentijdrit": return <Timer size={size} strokeWidth={2.4} />;
  }
}

export interface StageBarsProps {
  stages: StageRow[];
  pointsByStageId?: Map<string, number> | Record<string, number>;
  rankByStageId?: Map<string, number> | Record<string, number>;
  selectedStageId?: string;
  onSelectStage?: (stage: StageRow) => void;
  gcUnlocked?: boolean;
  /** Visuele hoogte van het track in px. */
  trackHeight?: number;
  className?: string;
  showPoints?: boolean;
  emptyLabel?: string;
}

export default function StageBars({
  stages,
  pointsByStageId,
  rankByStageId,
  selectedStageId,
  onSelectStage,
  gcUnlocked = false,
  trackHeight = 180,
  className,
  showPoints = true,
  emptyLabel = "Nog geen etappes",
}: StageBarsProps) {
  const getPts = (id: string): number => {
    if (!pointsByStageId) return 0;
    if (pointsByStageId instanceof Map) return pointsByStageId.get(id) ?? 0;
    return pointsByStageId[id] ?? 0;
  };
  const getRank = (id: string): number | undefined => {
    if (!rankByStageId) return undefined;
    if (rankByStageId instanceof Map) return rankByStageId.get(id);
    return rankByStageId[id];
  };

  /** Maximum punten over alle non-GC stages → schaalfactor voor balk-hoogte. */
  const maxPts = useMemo(
    () => stages.filter((s) => !s.is_gc).reduce((m, s) => Math.max(m, getPts(s.id)), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stages, pointsByStageId],
  );
  /** GC-totaal = som van alle stage-points. */
  const gcTotal = useMemo(
    () => stages.filter((s) => !s.is_gc).reduce((s, st) => s + getPts(st.id), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stages, pointsByStageId],
  );

  if (stages.length === 0) {
    return <div className="text-center py-8 text-sm text-muted-foreground italic">{emptyLabel}</div>;
  }

  // Splits stages en GC zodat de GC-kolom visueel apart staat.
  const stageRows = stages.filter((s) => !s.is_gc);
  const gcStage = stages.find((s) => s.is_gc);

  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn("w-full", className)}>
        {/* Stage-rij met links rij-labels, midden scrollbare balken, rechts GC */}
        <div className="flex items-stretch gap-3 md:gap-4">
          {/* Rij-labels (STAGE / EARNED POINTS) — alleen op desktop, anders teveel ruimte op mobiel */}
          <div
            className="hidden md:flex flex-col justify-end shrink-0 pb-1"
            style={{ minHeight: trackHeight + 60 }}
          >
            <div className="flex flex-col items-start gap-2 pr-2" style={{ color: "var(--ink-faded)" }}>
              <span style={{ fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "'Oswald','Bebas Neue',sans-serif", fontWeight: 700 }}>
                Stage
              </span>
              <span style={{ fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "'Oswald','Bebas Neue',sans-serif", fontWeight: 700 }}>
                Earned points
              </span>
            </div>
          </div>

          {/* Scrollbare bar-rij */}
          <div
            className="flex-1 min-w-0 flex items-end gap-2 sm:gap-2.5 overflow-x-auto pb-2 px-1 snap-x snap-mandatory"
            style={{ scrollbarWidth: "thin" }}
          >
            {stageRows.map((s) => {
              const pts = getPts(s.id);
              const rank = getRank(s.id);
              const isSelected = s.id === selectedStageId;
              const type = (s.stage_type ?? "vlak") as StageType;

              return (
                <StageBar
                  key={s.id}
                  stage={s}
                  type={type}
                  points={pts}
                  rank={rank}
                  maxPoints={maxPts}
                  trackHeight={trackHeight}
                  selected={isSelected}
                  onClick={() => onSelectStage?.(s)}
                  showPoints={showPoints}
                />
              );
            })}
          </div>

          {/* GC-kolom, visueel apart */}
          {gcStage && (
            <GcColumn
              stage={gcStage}
              total={gcTotal}
              locked={!gcUnlocked}
              selected={gcStage.id === selectedStageId}
              trackHeight={trackHeight}
              onClick={() => gcUnlocked && onSelectStage?.(gcStage)}
            />
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

function StageBadge({ type, color }: { type: StageType; color: string }) {
  return (
    <span
      aria-hidden
      className="inline-flex items-center justify-center"
      style={{
        width: 26,
        height: 26,
        borderRadius: "9999px",
        background: "#FBF4DE",
        border: `2px solid ${color}`,
        color,
        boxShadow: "0 1px 0 rgba(58,42,26,0.18)",
      }}
    >
      {typeIcon(type, 13)}
    </span>
  );
}

function StageBar({
  stage,
  type,
  points,
  rank,
  maxPoints,
  trackHeight,
  selected,
  onClick,
  showPoints,
}: {
  stage: StageRow;
  type: StageType;
  points: number;
  rank?: number;
  maxPoints: number;
  trackHeight: number;
  selected: boolean;
  onClick: () => void;
  showPoints: boolean;
}) {
  const tone = TYPE_COLOR[type] ?? TYPE_COLOR.vlak;
  // Min 22% hoogte (zelfs zonder punten), max 100% bij top-score.
  const heightPct = maxPoints > 0 ? Math.max(22, (points / maxPoints) * 100) : 28;
  const km = stage.distance_km ?? 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "snap-start group relative shrink-0 flex flex-col items-center justify-end",
            "w-12 sm:w-14 md:w-[58px] rounded-2xl px-1 pt-3 pb-1 transition-all duration-300 ease-out",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--medal-gold)]",
            selected && "bg-[hsl(var(--vintage-gold)/0.10)] ring-2 ring-[var(--medal-gold)] shadow-[0_0_22px_-4px_rgba(232,185,35,0.7)]",
          )}
          style={{
            // Voorkomt dat de badge wordt weggesneden bij hoogte=0
            paddingTop: 22,
          }}
          aria-pressed={selected}
        >
          {/* Bar-baseline + capsule */}
          <div className="relative w-full flex items-end justify-center" style={{ height: trackHeight }}>
            {/* Subtiel papier-baseline-vlak */}
            <div
              className="absolute inset-x-1 bottom-0 top-0 rounded-full"
              style={{ background: "rgba(58,42,26,0.04)", border: "1px solid rgba(58,42,26,0.06)" }}
            />
            {/* De gekleurde capsule */}
            <div
              className="relative w-full rounded-full transition-[height] duration-500 ease-out"
              style={{
                height: `${heightPct}%`,
                background: `linear-gradient(180deg, ${tone.mid} 0%, ${tone.deep} 100%)`,
                border: `1.5px solid ${tone.ring}`,
                boxShadow: "0 2px 0 rgba(58,42,26,0.15), inset 0 -6px 0 rgba(0,0,0,0.12), inset 0 2px 0 rgba(255,255,255,0.18)",
                // Lichte bergsilhouet binnen bergrit-balken
                backgroundImage:
                  type === "bergop"
                    ? `linear-gradient(180deg, ${tone.mid} 0%, ${tone.deep} 100%), url("data:image/svg+xml;utf8,${encodeURIComponent(
                        `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 60'><path d='M0 60 L20 30 L34 42 L52 18 L66 36 L84 22 L100 50 L100 60 Z' fill='rgba(0,0,0,0.18)'/></svg>`,
                      )}")`
                    : undefined,
                backgroundBlendMode: type === "bergop" ? "multiply" : undefined,
                backgroundSize: type === "bergop" ? "auto, 100% 60%" : undefined,
                backgroundPosition: type === "bergop" ? "top, bottom" : undefined,
                backgroundRepeat: "no-repeat, no-repeat",
              }}
            />
            {/* Top-badge (icoon) — bovenaan de capsule */}
            <div
              className="absolute left-1/2 -translate-x-1/2"
              style={{ top: `calc(${100 - heightPct}% - 14px)` }}
            >
              <StageBadge type={type} color={tone.deep} />
            </div>
          </div>

          {/* Stage-nummer met thin underline */}
          <div
            className="mt-2 font-mono tabular-nums leading-none"
            style={{ color: "var(--ink-faded)", fontSize: "11px", fontWeight: 600 }}
          >
            <span style={{ borderBottom: "1px solid rgba(58,42,26,0.35)", paddingBottom: 1 }}>
              {stage.stage_number}
            </span>
          </div>

          {/* Earned points — BOLD groot */}
          {showPoints && (
            <div
              className="mt-1.5 tabular-nums leading-none"
              style={{
                color: points > 0 ? "var(--ink-sepia)" : "rgba(58,42,26,0.45)",
                fontFamily: "'Oswald','Bebas Neue','Archivo Black',sans-serif",
                fontWeight: 800,
                fontSize: points > 0 ? "20px" : "16px",
                letterSpacing: "0.02em",
              }}
            >
              {points > 0 ? points : "—"}
            </div>
          )}
        </button>
      </TooltipTrigger>

      {/* Tooltip-kaart (zwevende info bij geselecteerde rit) */}
      <TooltipContent side="top" className="px-3 py-2 rounded-xl border" style={{ borderColor: "var(--ink-sepia)", background: "var(--paper-light)", color: "var(--ink-sepia)" }}>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[12px] font-bold">
            {typeIcon(type, 14)}
            <span>{tone.label}</span>
          </div>
          {km > 0 && (
            <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--ink-faded)" }}>
              <Route size={13} />
              <span>{km} km</span>
            </div>
          )}
          {points > 0 ? (
            <div
              className="text-[13px]"
              style={{
                fontFamily: "'Oswald','Bebas Neue',sans-serif",
                fontWeight: 800,
                color: "var(--medal-gold)",
              }}
            >
              {points} pt
            </div>
          ) : (
            <div className="text-[11px]" style={{ color: "var(--ink-faded)" }}>0 pt</div>
          )}
          {rank != null && (
            <div className="text-[10px]" style={{ color: "var(--ink-faded)" }}>
              Positie #{rank}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function GcColumn({
  stage,
  total,
  locked,
  selected,
  trackHeight,
  onClick,
}: {
  stage: StageRow;
  total: number;
  locked: boolean;
  selected: boolean;
  trackHeight: number;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={locked}
          className={cn(
            "shrink-0 flex flex-col items-center justify-end ml-1 md:ml-2 rounded-2xl px-1 pt-3 pb-1 transition-all duration-300",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--medal-gold)]",
            selected && !locked && "bg-[hsl(var(--vintage-gold)/0.18)] ring-2 ring-[var(--medal-gold)] shadow-[0_0_24px_-4px_rgba(232,185,35,0.8)]",
            locked && "opacity-55 cursor-not-allowed",
          )}
          style={{
            width: 60,
            paddingTop: 22,
            borderLeft: "1px dashed rgba(58,42,26,0.25)",
          }}
          aria-pressed={selected}
        >
          <div className="relative w-full flex items-end justify-center" style={{ height: trackHeight }}>
            {/* Gouden capsule */}
            <div
              className="relative w-full rounded-full"
              style={{
                height: "100%",
                background: "linear-gradient(180deg, #F2C955 0%, #C58A12 100%)",
                border: "1.5px solid #8E600F",
                boxShadow:
                  "0 2px 0 rgba(58,42,26,0.18), inset 0 -8px 0 rgba(0,0,0,0.12), inset 0 2px 0 rgba(255,255,255,0.22)",
              }}
            />
            {/* Crown-badge bovenop */}
            <div className="absolute left-1/2 -translate-x-1/2" style={{ top: -14 }}>
              <span
                aria-hidden
                className="inline-flex items-center justify-center"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "9999px",
                  background: "#FBF4DE",
                  border: "2px solid #8E600F",
                  color: "#8E600F",
                  boxShadow: "0 1px 0 rgba(58,42,26,0.18)",
                }}
              >
                {locked ? <Lock size={14} strokeWidth={2.4} /> : <Crown size={14} strokeWidth={2.4} />}
              </span>
            </div>
          </div>

          {/* GC label */}
          <div
            className="mt-2 leading-none"
            style={{
              color: "#8E600F",
              fontFamily: "'Oswald','Bebas Neue','Archivo Black',sans-serif",
              fontWeight: 800,
              fontSize: "12px",
              letterSpacing: "0.14em",
              borderBottom: "1px solid rgba(142,96,15,0.45)",
              paddingBottom: 1,
            }}
          >
            GC
          </div>
          {/* Totaal */}
          <div
            className="mt-1.5 tabular-nums leading-none"
            style={{
              color: "#8E600F",
              fontFamily: "'Oswald','Bebas Neue','Archivo Black',sans-serif",
              fontWeight: 800,
              fontSize: "20px",
            }}
          >
            {locked ? "—" : total}
          </div>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="px-3 py-2 rounded-xl border" style={{ borderColor: "var(--ink-sepia)", background: "var(--paper-light)", color: "var(--ink-sepia)" }}>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[12px] font-bold">
            <Crown size={14} />
            <span>Eindklassement</span>
          </div>
          <div className="text-[11px]" style={{ color: "var(--ink-faded)" }}>
            {locked ? "Vergrendeld" : `Totaal: ${total} pt`}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
