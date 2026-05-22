import { ArrowUp, ArrowDown, Minus, Target, Crown, ClipboardList, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MiniStripData } from "@/hooks/useKaravaanFeed";

export type HorsTabKey = "dartpijl" | "pelotonkeuzes" | "wielerdirecteur" | "superteam" | "benchmark";

/**
 * Score-strip bovenaan Gazetta.
 * Cellen 1-3 (positie/punten) → klik op de groep navigeert naar Volgwagen (Mijn Ploeg).
 * Cellen 4-6 (Hors Catégorie shortcuts) → elk apart klikbaar naar hun eigen tab.
 * Desktop: één rij van 6. Mobiel: twee rijen van 3.
 */
export default function MiniStrip({
  data,
  onClickProfile,
  onOpenHors,
}: {
  data: MiniStripData;
  onClickProfile?: () => void;
  onOpenHors?: (tab: HorsTabKey) => void;
}) {
  return (
    <div className="retro-border bg-card overflow-hidden">
      <div className="grid grid-cols-3 md:grid-cols-6">
        {/* Categorie 1 — positie & punten → Volgwagen (elke cel zelfde actie) */}
        <DataCell value={`${data.subpoule.rank}ᵉ`} label="subpoule" delta={data.subpoule.delta} onClick={onClickProfile} ariaLabel="Bekijk je volledige ploeg" />
        <DataCell value={`${data.overall.rank}ᵉ`} label="overall" delta={data.overall.delta} onClick={onClickProfile} ariaLabel="Bekijk je volledige ploeg" />
        <DataCell value={data.points} label="punten" onClick={onClickProfile} ariaLabel="Bekijk je volledige ploeg" />

        {/* Categorie 2 — Hors Catégorie shortcuts (dikke scheiding op desktop) */}
        <NavCell
          Icon={Target}
          label="Monkey IQ"
          onClick={() => onOpenHors?.("dartpijl")}
          ariaLabel="Open Dartpijl (Monkey IQ)"
          thickLeftBorder
        />
        <NavCell
          Icon={Crown}
          label="Emirates"
          onClick={() => onOpenHors?.("superteam")}
          ariaLabel="Open The Emirates (droomploeg)"
        />
        <NavCell
          Icon={ClipboardList}
          label="Wielerdir."
          onClick={() => onOpenHors?.("wielerdirecteur")}
          ariaLabel="Open De Wielerdirecteur (rapport)"
        />
      </div>

      {onClickProfile && (
        <button
          type="button"
          onClick={onClickProfile}
          className="block w-full px-3 py-2 text-[10px] font-stamp uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground border-t border-foreground/15 transition-colors"
        >
          → bekijk je volledige ploeg
        </button>
      )}
    </div>
  );
}

function DataCell({
  value,
  label,
  delta,
  onClick,
  ariaLabel,
}: {
  value: string | number;
  label: string;
  delta?: number;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label={ariaLabel}
      className="px-2 md:px-3 py-3 md:py-4 text-center min-h-[80px] flex flex-col justify-center border-r border-foreground/10 transition-colors enabled:hover:bg-[hsl(var(--paper-dark))]"
    >
      <div className="flex items-center justify-center gap-1">
        <span className="font-oswald font-bold text-2xl md:text-3xl tabular-nums leading-none text-foreground uppercase">
          {value}
        </span>
        {typeof delta === "number" && <DeltaIndicator delta={delta} />}
      </div>
      <p className="overline-stamp mt-1.5">{label}</p>
    </button>
  );
}

function NavCell({
  Icon,
  label,
  onClick,
  ariaLabel,
  thickLeftBorder,
}: {
  Icon: typeof Target;
  label: string;
  onClick: () => void;
  ariaLabel: string;
  thickLeftBorder?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "group px-2 md:px-3 py-3 md:py-4 min-h-[80px] flex flex-col items-center justify-center gap-1.5 text-center transition-colors hover:bg-[hsl(var(--paper-dark))] border-r border-foreground/10 last:border-r-0",
        // dikke scheiding tussen categorie 1 en 2: links op cel 4 (desktop) / boven (mobiel)
        thickLeftBorder && "border-l-2 border-l-foreground/30 md:border-t-0 border-t-2 border-t-foreground/30 md:col-start-4",
      )}
    >
      <Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" strokeWidth={1.75} />
      <span className="overline-stamp leading-tight">{label}</span>
      <ChevronRight className="h-3 w-3 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-0.5 transition-transform" />
    </button>
  );
}

function DeltaIndicator({ delta }: { delta: number }) {
  if (delta === 0) return <Minus className="h-3 w-3 text-muted-foreground" />;
  if (delta > 0) {
    return (
      <span className="flex items-center gap-0.5 text-[hsl(var(--maillot-groen))] text-xs font-display font-bold tabular-nums">
        <ArrowUp className="h-3 w-3" />
        {delta}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-[hsl(var(--bolletjes-bright))] text-xs font-display font-bold tabular-nums">
      <ArrowDown className="h-3 w-3" />
      {Math.abs(delta)}
    </span>
  );
}
