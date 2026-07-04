import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown } from "lucide-react";
import { useDuelSummary, type DuelRow } from "@/hooks/useDuelSummary";

// Verschil-pil — exact dezelfde kleurregel als TeamComparison (goud bij same,
// emerald bij winst, red bij verlies, neutraal bij 0).
function diffPillClass(diff: number, same: boolean): string {
  if (same) return "border-[hsl(var(--vintage-gold))] bg-[hsl(var(--vintage-gold))/0.18] text-[#4a3c0e]";
  if (diff > 0) return "border-emerald-600 bg-emerald-500/25 text-emerald-800 dark:text-emerald-300";
  if (diff < 0) return "border-red-600 bg-red-500/25 text-red-800 dark:text-red-300";
  return "border-border bg-secondary/60 text-muted-foreground";
}

type Props = {
  myTotal: number;
  oppTotal: number;
  opponentName: string;
  rows: DuelRow[];
  onOpenFull: () => void;
};

/** Presentational compacte duel-samenvatting — geen data-fetch. */
export default function DuelSummary({ myTotal, oppTotal, opponentName, rows, onOpenFull }: Props) {
  const sum = myTotal + oppTotal;
  const myShare = sum > 0 ? (myTotal / sum) * 100 : 50;
  return (
    <div className="p-3 space-y-3">
      <p className="text-xs font-display font-bold">
        Jij <span className="text-muted-foreground">vs</span> <span className="truncate">{opponentName}</span>
      </p>

      {/* Totalen + balansbalk */}
      <div>
        <div className="flex items-end justify-between gap-2">
          <span className="text-2xl font-display font-bold tabular-nums">{myTotal}<span className="text-[10px] font-normal text-muted-foreground"> pt</span></span>
          <span className="text-2xl font-display font-bold tabular-nums">{oppTotal}<span className="text-[10px] font-normal text-muted-foreground"> pt</span></span>
        </div>
        <div className="relative mt-1.5 h-2.5 rounded-full overflow-hidden border border-foreground/30 flex">
          <div style={{ width: `${myShare}%` }} className="bg-primary" />
          <div style={{ width: `${100 - myShare}%` }} className="bg-foreground/20" />
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-card" />
        </div>
      </div>

      {/* Per-categorie verschil */}
      <ul className="space-y-1">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate text-muted-foreground uppercase tracking-wider text-[10px]">{r.label}</span>
            <span
              className={cn(
                "inline-flex items-center justify-center gap-0.5 rounded-full border-[1.5px] px-2 py-0.5",
                "text-[11px] font-mono font-bold tabular-nums shrink-0",
                diffPillClass(r.diff, r.same),
              )}
            >
              {!r.same && r.diff > 0 && <ArrowUp className="h-3 w-3" />}
              {!r.same && r.diff < 0 && <ArrowDown className="h-3 w-3" />}
              {r.same ? "=" : `${r.diff > 0 ? "+" : ""}${r.diff}`}
            </span>
          </li>
        ))}
      </ul>

      <Button size="sm" variant="outline" className="w-full" onClick={onOpenFull}>
        Volledig duel
      </Button>
    </div>
  );
}

/**
 * Connected variant: berekent de cijfers via useDuelSummary en rendert de
 * presentational DuelSummary. Alleen gemount wanneer de popover open is.
 */
export function DuelSummaryPanel({
  subpouleId,
  gameId,
  myUserId,
  opponentUserId,
  opponentName,
  onOpenFull,
}: {
  subpouleId?: string;
  gameId?: string;
  myUserId?: string;
  opponentUserId: string;
  opponentName: string;
  onOpenFull: () => void;
}) {
  const d = useDuelSummary(subpouleId, gameId, myUserId, opponentUserId);
  if (!d.ready) {
    return (
      <div className="p-4 text-xs text-muted-foreground">
        {d.isLoading ? "Vergelijking laden…" : `${opponentName} heeft nog geen team.`}
      </div>
    );
  }
  return (
    <DuelSummary
      myTotal={d.myTotal}
      oppTotal={d.oppTotal}
      opponentName={opponentName}
      rows={d.rows}
      onOpenFull={onOpenFull}
    />
  );
}
