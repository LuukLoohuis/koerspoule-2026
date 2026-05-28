import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import TruiBadge from "@/components/retro/TruiBadge";

export type PodiumEntry = { rank: number; name: string; points: number; isMe?: boolean };

// Visuele plaatsing: 2 — 1 — 3
const SLOT_ORDER = [2, 1, 3];

// Trap-hoogte per rang (1 hoogste)
const STEP_H: Record<number, string> = { 1: "h-24", 2: "h-16", 3: "h-12" };

// Goud / zilver / brons verloop
const STEP_BG: Record<number, string> = {
  1: "bg-gradient-to-b from-[#F8DC6E] via-[#E5B021] to-[#9A6F0E]",
  2: "bg-gradient-to-b from-[#EFEFEF] via-[#BFC4CB] to-[#7E848C]",
  3: "bg-gradient-to-b from-[#D89668] via-[#A86A3D] to-[#6E4422]",
};

const STEP_RING: Record<number, string> = {
  1: "ring-1 ring-amber-200/60",
  2: "ring-1 ring-zinc-200/60",
  3: "ring-1 ring-orange-200/50",
};

// Sequentieel reveal: 3 eerst, dan 2, dan 1
const REVEAL_DELAY: Record<number, number> = { 3: 0, 2: 0.2, 1: 0.4 };

// Oswald-cijfer-grootte per rang (op de podium-trap)
const NUM_SIZE: Record<number, string> = { 1: "text-[3.25rem]", 2: "text-[2.5rem]", 3: "text-[2rem]" };

/** Klassiek 3-trap podium met sequentieel reveal, goud-shine op #1 en
 *  pulserende leiderstrui. Verschijnt boven het algemeen klassement. */
export default function Podium({ entries }: { entries: PodiumEntry[] }) {
  const byRank = new Map(entries.map((e) => [e.rank, e]));
  if (!byRank.has(1)) return null;

  return (
    <div className="relative px-3 pt-8 pb-3 border-b border-border/40 overflow-hidden">
      {/* Spotlight bovenaan */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-10 h-36"
        style={{
          background:
            "radial-gradient(closest-side, hsl(var(--vintage-gold) / 0.25), transparent 70%)",
        }}
      />

      {/* Vloer-schaduw */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-1 w-[78%] h-3 rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, hsl(var(--foreground) / 0.22), transparent 70%)",
        }}
      />

      <div className="relative flex items-end justify-center gap-2 max-w-md mx-auto">
        {SLOT_ORDER.map((rank) => {
          const e = byRank.get(rank);
          if (!e) return <div key={rank} className="flex-1" />;

          return (
            <motion.div
              key={rank}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: REVEAL_DELAY[rank], ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 flex flex-col items-center min-w-0"
            >
              {/* Leiderstrui op winnaar — pulseert subtiel */}
              {rank === 1 && (
                <motion.div
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: 1.1 }}
                  className="mb-1.5"
                >
                  <TruiBadge type="algemeen" formaat="medium" />
                </motion.div>
              )}

              {/* Naam + punten kaartje boven de trap */}
              <div
                className={cn(
                  "w-full max-w-[120px] rounded-md px-1.5 py-1 text-center mb-1 bg-card/85 backdrop-blur-sm border border-border/60",
                  e.isMe && "ring-1 ring-inset ring-primary/40 border-primary/50",
                )}
              >
                <p
                  className={cn(
                    "text-xs leading-tight truncate font-semibold",
                    e.isMe && "text-primary",
                  )}
                  title={e.name}
                >
                  {e.name}
                </p>
                <p className="font-display font-black tabular-nums text-sm leading-none mt-0.5">
                  {e.points}
                  <span className="text-[8px] text-muted-foreground font-mono ml-0.5">pt</span>
                </p>
              </div>

              {/* Podium-trap (3-trap met metaal-verloop, glans op #1) */}
              <div
                className={cn(
                  "relative w-full overflow-hidden rounded-t-md border-t border-x border-foreground/15",
                  // dubbele inset-shadow voor diepte (hoogwit + bodemschaduw)
                  "shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-3px_8px_rgba(0,0,0,0.18)]",
                  STEP_H[rank],
                  STEP_BG[rank],
                  STEP_RING[rank],
                )}
              >
                {/* Goud-shine alleen op #1 */}
                {rank === 1 && <span className="podium-shine" aria-hidden />}

                {/* BIG Oswald-cijfer op de trap */}
                <span
                  className={cn(
                    "absolute inset-0 flex items-center justify-center font-oswald font-black select-none text-white/85",
                    "drop-shadow-[0_2px_2px_rgba(0,0,0,0.35)]",
                    NUM_SIZE[rank],
                  )}
                  aria-hidden
                >
                  {rank}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
