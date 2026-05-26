import { cn } from "@/lib/utils";
import TruiBadge from "@/components/retro/TruiBadge";

export type PodiumEntry = { rank: number; name: string; points: number; isMe?: boolean };

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

// Visuele volgorde: 2 — 1 — 3
const SLOT_ORDER = [2, 1, 3];
const BLOK_H: Record<number, string> = { 1: "h-16", 2: "h-12", 3: "h-9" };
const RAND: Record<number, string> = {
  1: "border-amber-400/70",
  2: "border-zinc-400/60",
  3: "border-orange-400/60",
};

/** Gestileerd top-3 podium met de leiderstrui van het actieve thema op plek 1. */
export default function Podium({ entries }: { entries: PodiumEntry[] }) {
  const byRank = new Map(entries.map((e) => [e.rank, e]));
  if (!byRank.has(1)) return null;

  return (
    <div className="px-3 pt-4 pb-2 bg-gradient-to-b from-primary/[0.06] to-transparent border-b border-border/40">
      <div className="flex items-end justify-center gap-2 max-w-md mx-auto">
        {SLOT_ORDER.map((rank) => {
          const e = byRank.get(rank);
          if (!e) return <div key={rank} className="flex-1" />;
          return (
            <div key={rank} className="flex-1 flex flex-col items-center min-w-0">
              {rank === 1 && <TruiBadge type="algemeen" formaat="klein" className="mb-1" />}
              <span className="text-lg leading-none mb-1" aria-hidden>{MEDAL[rank]}</span>
              <span
                className={cn(
                  "text-xs text-center truncate max-w-full px-1",
                  e.isMe ? "font-bold text-primary" : "font-semibold",
                )}
                title={e.name}
              >
                {e.name}
              </span>
              <span className="font-display font-black tabular-nums text-sm leading-tight">
                {e.points}
                <span className="text-[8px] text-muted-foreground font-mono ml-0.5">pt</span>
              </span>
              <div
                className={cn(
                  "w-full rounded-t-md border-t-2 border-x mt-1 bg-gradient-to-b from-primary/15 to-primary/[0.03]",
                  BLOK_H[rank],
                  RAND[rank],
                  e.isMe && "ring-1 ring-inset ring-primary/40",
                )}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
