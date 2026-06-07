/**
 * StageBars — vintage Tour-de-France stage selector.
 *
 * Solid-filled capsule-bars; height (in px) schaalt met earnedPoints.
 * NIET een partial fill: elke bar is altijd volledig gevuld met de type-kleur.
 *
 *   barHeightPx = MIN_H + (points - minPoints) / (maxPoints - minPoints) * (MAX_H - MIN_H)
 *
 * met MIN_H = 70 en MAX_H = 220, alle bars op één gedeelde baseline.
 *
 * API ongewijzigd — hergebruikt door Klassement, Etappes, Punten per etappe.
 * Iconen via src/components/stages/StageIcons.tsx (currentColor → badge erft).
 */

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";
import type { StageRow } from "@/hooks/useResults";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CrownIcon,
  HillsIcon,
  LightningIcon,
  MountainIcon,
  MountainTexture,
  RouteIcon,
  StopwatchIcon,
  type StageType as IconStageType,
} from "./stages/StageIcons";

type StageType = "vlak" | "heuvelachtig" | "bergop" | "tijdrit" | "ploegentijdrit";

/** Gemini-vintage-blauwdruk v2: diepere matte vullingen, zwart border #2B2924. */
const INK = "#2B2924";
const PAPER = "#FAF7F0";
const PAPER_CARD = "#FCFAF5";
const BORDER = "#D4CDBA";
const RULE = "#EBE7DC";
const TEXT_MUTED = "#8C8573";
const TEXT_FAINT = "#A39D8B";

const TYPE_COLOR: Record<StageType, { mid: string; deep: string; texture: string; label: string }> = {
  vlak:           { mid: "#3F8E6E", deep: "#2E7D5C", texture: "#1A4D36", label: "Vlakke rit" },
  heuvelachtig:   { mid: "#D78A2A", deep: "#C97A24", texture: "#7A4511", label: "Heuvelachtig" },
  bergop:         { mid: "#C04968", deep: "#B03A5B", texture: "#6B1F34", label: "Bergrit" },
  tijdrit:        { mid: "#3F7BB0", deep: "#2E6B9E", texture: "#1B4263", label: "Tijdrit" },
  ploegentijdrit: { mid: "#6E55A8", deep: "#5C448C", texture: "#3A2A66", label: "Ploegentijdrit" },
};

const GC_GOLD = { mid: "#E8BB3F", deep: "#DEAF33", ring: INK, label: "Eindklassement" };

/** Mappen onze NL stage_type naar de StageIcons-type-namen (engels). */
function toIconType(t: StageType): IconStageType {
  switch (t) {
    case "vlak":         return "flat";
    case "heuvelachtig": return "hilly";
    case "bergop":       return "mountain";
    case "tijdrit":      return "timetrial";
    case "ploegentijdrit": return "timetrial";
  }
}

/** Inline icoon op basis van NL type — voor in tooltip-headers, etc. */
function inlineIcon(t: StageType, size = 14) {
  const it = toIconType(t);
  switch (it) {
    case "flat":      return <LightningIcon size={size} />;
    case "hilly":     return <HillsIcon size={size} />;
    case "mountain":  return <MountainIcon size={size} />;
    case "timetrial": return <StopwatchIcon size={size} />;
  }
}

const MIN_H = 60;
const MAX_H = 240;
const CONTAINER_H = MAX_H;
const BAR_W = 30; // slim capsule (clamp 26-34 via flex/min/max)

export interface StageBarsProps {
  stages: StageRow[];
  pointsByStageId?: Map<string, number> | Record<string, number>;
  rankByStageId?: Map<string, number> | Record<string, number>;
  selectedStageId?: string;
  onSelectStage?: (stage: StageRow) => void;
  gcUnlocked?: boolean;
  /** Voor backwards-compat genegeerd; we gebruiken MAX_H. */
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

  const stageRows = stages.filter((s) => !s.is_gc);
  const gcStage = stages.find((s) => s.is_gc);

  const { minPts, maxPts } = useMemo(() => {
    let mn = Infinity;
    let mx = -Infinity;
    for (const s of stageRows) {
      const v = getPts(s.id);
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }
    if (!isFinite(mn)) mn = 0;
    if (!isFinite(mx)) mx = 0;
    return { minPts: mn, maxPts: mx };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stages, pointsByStageId]);

  const gcTotal = useMemo(
    () => stageRows.reduce((s, st) => s + getPts(st.id), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stages, pointsByStageId],
  );

  if (stages.length === 0) {
    return <div className="text-center py-8 text-sm text-muted-foreground italic">{emptyLabel}</div>;
  }

  /** Bar-hoogte in pixels. Bij geen data: ruime uniforme hoogte
   *  (zoals de referentie-poster) i.p.v. stubby min-hoogte. */
  function barHeight(points: number): number {
    if (maxPts === 0) return Math.round(MAX_H * 0.78);
    if (maxPts === minPts) return Math.round(MAX_H * 0.85);
    const ratio = (points - minPts) / (maxPts - minPts);
    // Optisch fijner: schaal van 55%→100% van MAX_H i.p.v. MIN_H→MAX_H.
    const lo = Math.round(MAX_H * 0.55);
    return Math.round(lo + ratio * (MAX_H - lo));
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn("w-full relative", className)}>
        <FranceLineArt />

        <div className="flex items-end relative">
          {/* Sticky links: STAGE / EARNED POINTS rij-labels — staan stil bij scroll. */}
          <div
            className="hidden md:flex flex-col justify-end shrink-0 sticky left-0 z-20 pr-3 pb-1"
            style={{
              minHeight: CONTAINER_H + 80,
              background: PAPER_CARD,
              boxShadow: "10px 0 10px -10px rgba(0,0,0,0.05)",
            }}
          >
            <div className="flex flex-col items-start gap-2" style={{ color: TEXT_FAINT }}>
              <span style={{ fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "'Oswald','Bebas Neue',sans-serif", fontWeight: 700, borderBottom: `1px solid ${RULE}`, paddingBottom: 4, width: "100%" }}>Stage</span>
              <span style={{ fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "'Oswald','Bebas Neue',sans-serif", fontWeight: 700 }}>Earned points</span>
            </div>
          </div>

          {/* Scrollbare bar-rij — bredere gaps tussen slanke capsules. */}
          <div
            className="flex-1 min-w-0 flex items-end overflow-x-auto pb-2 px-1 snap-x snap-mandatory"
            style={{ scrollbarWidth: "thin", gap: "16px" }}
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
                  barHeightPx={barHeight(pts)}
                  selected={isSelected}
                  onClick={() => onSelectStage?.(s)}
                  showPoints={showPoints}
                />
              );
            })}
          </div>

          {gcStage && (
            <GcColumn
              total={gcTotal}
              locked={!gcUnlocked}
              selected={gcStage.id === selectedStageId}
              onClick={() => gcUnlocked && onSelectStage?.(gcStage)}
            />
          )}
        </div>

        {/* Decoratieve scroll-indicator onderaan — esthetisch lijntje. */}
        <div className="w-full h-1 rounded-full mt-2 relative" style={{ background: RULE }}>
          <div className="absolute left-[30%] w-1/4 h-full rounded-full" style={{ background: BORDER }} />
        </div>
      </div>
    </TooltipProvider>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

/** Subtiele lage-contrast Frankrijk-omtrek rechtsboven (decoratief). */
function FranceLineArt() {
  return (
    <svg
      aria-hidden
      className="absolute top-0 right-0 pointer-events-none"
      width="260"
      height="220"
      viewBox="0 0 260 220"
      style={{ opacity: 0.14, color: "var(--ink-sepia)" }}
    >
      <path
        d="M70 30 Q90 18 120 22 L150 30 L172 26 L188 38 L196 56 L208 74 L214 96 L220 116 L208 138 L196 154 L186 174 L168 190 L142 198 L118 200 L96 198 L78 188 L66 170 L58 150 L52 130 L48 112 L46 92 L52 70 L60 50 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M90 50 L150 90 L200 130" stroke="currentColor" strokeWidth="1" fill="none" strokeDasharray="3 4" />
      <path d="M70 130 L130 160 L180 170" stroke="currentColor" strokeWidth="1" fill="none" strokeDasharray="3 4" />
      <circle cx="120" cy="60" r="3" fill="currentColor" />
      <circle cx="170" cy="110" r="3" fill="currentColor" />
      <circle cx="130" cy="150" r="3" fill="currentColor" />
      <circle cx="180" cy="170" r="3" fill="currentColor" />
    </svg>
  );
}

/** Cirkelvormig badge bovenop een capsule. Kleur wordt via parent's `color`
 *  doorgegeven; het icoon erft via currentColor. */
function StageBadge({ type, color }: { type: StageType; color: string }) {
  return (
    <span
      aria-hidden
      className="inline-flex items-center justify-center"
      style={{
        width: 30,
        height: 30,
        borderRadius: "9999px",
        background: PAPER,
        border: `2px solid ${INK}`,
        color, // icoon erft hier deze kleur
        boxShadow: "0 1px 0 rgba(30,30,30,0.18)",
      }}
    >
      {inlineIcon(type, 15)}
    </span>
  );
}

function StageBar({
  stage,
  type,
  points,
  rank,
  barHeightPx,
  selected,
  onClick,
  showPoints,
}: {
  stage: StageRow;
  type: StageType;
  points: number;
  rank?: number;
  barHeightPx: number;
  selected: boolean;
  onClick: () => void;
  showPoints: boolean;
}) {
  const tone = TYPE_COLOR[type] ?? TYPE_COLOR.vlak;
  const km = stage.distance_km ?? 0;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "snap-start group relative shrink-0 flex flex-col items-center justify-end",
            "rounded-2xl px-0 pb-1 transition-all duration-300 ease-out",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--medal-gold)]",
            selected && "bg-[hsl(var(--vintage-gold)/0.10)] ring-2 ring-[var(--medal-gold)] shadow-[0_0_22px_-4px_rgba(232,185,35,0.7)]",
          )}
          style={{ paddingTop: 22, width: BAR_W + 14, minWidth: BAR_W + 14 }}
          aria-pressed={selected}
        >
          {/* Bar-container, badge sticks out boven dankzij top:-14px */}
          <div className="relative flex items-end justify-center" style={{ height: CONTAINER_H, width: BAR_W }}>
            {/* Solid capsule — verticale gradient, niet partial. Top fully
                rounded (BAR_W/2), bottom modest rounded (6-8px) zoals reference. */}
            <div
              className="relative w-full"
              style={{
                height: `${barHeightPx}px`,
                background: `linear-gradient(180deg, ${tone.mid} 0%, ${tone.deep} 100%)`,
                border: `2px solid ${INK}`,
                borderTopLeftRadius: BAR_W,
                borderTopRightRadius: BAR_W,
                borderBottomLeftRadius: 14,
                borderBottomRightRadius: 14,
                boxShadow:
                  "0 2px 0 rgba(58,42,26,0.15), inset 0 -6px 0 rgba(0,0,0,0.12), inset 0 2px 0 rgba(255,255,255,0.22)",
                overflow: "hidden",
                color: tone.texture,
              }}
            >
              {/* Mountain texture: alleen op bergrit-balken. */}
              {type === "bergop" && (
                <MountainTexture
                  className="absolute left-0 right-0 bottom-0 w-full"
                  opacity={0.28}
                />
              )}
            </div>
            {/* Top-badge — overlapt capsule-top */}
            <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: `${barHeightPx - 14}px` }}>
              <StageBadge type={type} color={tone.deep} />
            </div>
          </div>

          {/* Stage-nummer — muted grey met dunne underline */}
          <div
            className="mt-2 font-mono tabular-nums leading-none"
            style={{ color: TEXT_MUTED, fontSize: "11px", fontWeight: 600 }}
          >
            <span style={{ borderBottom: `1px solid ${TEXT_MUTED}55`, paddingBottom: 1 }}>
              {stage.stage_number}
            </span>
          </div>

          {/* Earned points — BOLD donker */}
          {showPoints && (
            <div
              className="mt-1.5 tabular-nums leading-none"
              style={{
                color: points > 0 ? INK : TEXT_MUTED,
                fontFamily: "'Oswald','Bebas Neue','Archivo Black',sans-serif",
                fontWeight: 900,
                fontSize: points > 0 ? "20px" : "16px",
                letterSpacing: "0.02em",
              }}
            >
              {points > 0 ? points : "—"}
            </div>
          )}
        </button>
      </TooltipTrigger>

      <TooltipContent side="top" className="px-3 py-2 rounded-xl border" style={{ borderColor: "var(--ink-sepia)", background: "var(--paper-light)", color: "var(--ink-sepia)" }}>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[12px] font-bold" style={{ color: tone.deep }}>
            {inlineIcon(type, 14)}
            <span>{tone.label}</span>
          </div>
          {km > 0 && (
            <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--ink-faded)" }}>
              <RouteIcon size={13} />
              <span>{km} km</span>
            </div>
          )}
          {points > 0 ? (
            <div className="text-[13px]" style={{ fontFamily: "'Oswald','Bebas Neue',sans-serif", fontWeight: 800, color: "var(--medal-gold)" }}>
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
  total,
  locked,
  selected,
  onClick,
}: {
  total: number;
  locked: boolean;
  selected: boolean;
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
            "shrink-0 flex flex-col items-center justify-end ml-1 md:ml-2 rounded-2xl px-1 pb-1 transition-all duration-300",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--medal-gold)]",
            selected && !locked && "bg-[hsl(var(--vintage-gold)/0.18)] ring-2 ring-[var(--medal-gold)] shadow-[0_0_24px_-4px_rgba(232,185,35,0.8)]",
            locked && "opacity-55 cursor-not-allowed",
          )}
          style={{ width: BAR_W + 16, paddingTop: 22, borderLeft: "1px dashed rgba(58,42,26,0.25)" }}
          aria-pressed={selected}
        >
          <div className="relative flex items-end justify-center" style={{ height: CONTAINER_H, width: BAR_W }}>
            <div
              className="relative w-full"
              style={{
                height: `${MAX_H}px`,
                background: `linear-gradient(180deg, ${GC_GOLD.mid} 0%, ${GC_GOLD.deep} 100%)`,
                border: `2px solid ${INK}`,
                borderTopLeftRadius: BAR_W,
                borderTopRightRadius: BAR_W,
                borderBottomLeftRadius: 14,
                borderBottomRightRadius: 14,
                boxShadow:
                  "0 2px 0 rgba(58,42,26,0.18), inset 0 -8px 0 rgba(0,0,0,0.12), inset 0 2px 0 rgba(255,255,255,0.22)",
              }}
            />
            <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: `${MAX_H - 14}px` }}>
              <span
                aria-hidden
                className="inline-flex items-center justify-center"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "9999px",
                  background: GC_GOLD.deep,
                  border: `2px solid ${INK}`,
                  color: INK,
                  boxShadow: "0 1px 0 rgba(30,30,30,0.18)",
                }}
              >
                {locked ? <Lock size={14} strokeWidth={2.4} /> : <CrownIcon size={16} />}
              </span>
            </div>
          </div>

          <div
            className="mt-2 leading-none"
            style={{
              color: GC_GOLD.deep,
              fontFamily: "'Oswald','Bebas Neue','Archivo Black',sans-serif",
              fontWeight: 800,
              fontSize: "12px",
              letterSpacing: "0.14em",
              borderBottom: `1px solid ${GC_GOLD.deep}55`,
              paddingBottom: 1,
            }}
          >
            GC
          </div>
          <div
            className="mt-1.5 tabular-nums leading-none"
            style={{
              color: INK,
              fontFamily: "'Oswald','Bebas Neue','Archivo Black',sans-serif",
              fontWeight: 900,
              fontSize: "20px",
            }}
          >
            {locked ? "—" : total}
          </div>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="px-3 py-2 rounded-xl border" style={{ borderColor: "var(--ink-sepia)", background: "var(--paper-light)", color: "var(--ink-sepia)" }}>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[12px] font-bold" style={{ color: GC_GOLD.ring }}>
            <CrownIcon size={14} />
            <span>{GC_GOLD.label}</span>
          </div>
          <div className="text-[11px]" style={{ color: "var(--ink-faded)" }}>
            {locked ? "Vergrendeld" : `Totaal: ${total} pt`}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
