/**
 * GameSwitcher — horizontal, scroll-snap game selector.
 * Replaces the old wrapping flex of buttons in MijnPeloton.
 * - One row, edge-fade masks, hidden scrollbar.
 * - Auto-centers active card on selection.
 */
import { useEffect, useRef } from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import FlagIcon from "@/components/FlagIcon";
import { gameTheme, type GameRow } from "@/hooks/useAllGames";

type Props = {
  games: GameRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  className?: string;
};

const LIVE = ["open", "live", "locked"];
const DRAFT = ["draft", "concept"];

function orderRank(status: string): number {
  if (LIVE.includes(status)) return 0;
  if (DRAFT.includes(status)) return 1;
  if (status === "finished") return 2;
  return 3;
}

export default function GameSwitcher({ games, selectedId, onSelect, className }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Sort: live first, draft, finished
  const ordered = [...games].sort((a, b) => {
    const r = orderRank(a.status) - orderRank(b.status);
    if (r !== 0) return r;
    return 0;
  });

  // Center active card
  useEffect(() => {
    const el = activeRef.current;
    const box = scrollRef.current;
    if (!el || !box) return;
    const left = el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2;
    box.scrollTo({ left, behavior: "smooth" });
  }, [selectedId]);

  return (
    <div
      className={cn(
        "bg-card/95 backdrop-blur-sm border-b border-border/60",
        className,
      )}
    >
      <div className="px-3 md:px-5">

        {/* Scroll-snap rail met edge-fade */}
        <div
          className={cn(
            "relative transition-all duration-200",
            compact ? "py-1.5" : "py-2.5",
          )}
          style={{
            maskImage:
              "linear-gradient(to right, transparent 0%, black 16px, black calc(100% - 16px), transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0%, black 16px, black calc(100% - 16px), transparent 100%)",
          }}
        >
          <div
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto px-3"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              scrollSnapType: "x mandatory",
            }}
          >
            {ordered.map((game) => {
              const theme = gameTheme(game.game_type);
              const isActive = selectedId === game.id;
              const isLive = LIVE.includes(game.status);
              const isDraft = DRAFT.includes(game.status);
              const label = compact ? shortName(game.name) : game.name;

              return (
                <button
                  key={game.id}
                  ref={isActive ? activeRef : undefined}
                  type="button"
                  onClick={() => onSelect(game.id)}
                  className={cn(
                    "group snap-start flex items-center gap-2 rounded-lg border-2 shrink-0",
                    "font-display font-bold transition-all duration-200",
                    "min-h-[44px]",
                    compact ? "px-2 py-1 text-xs" : "px-2.5 py-1.5 text-sm",
                    isActive
                      ? "text-white shadow-md"
                      : "bg-card border-border text-foreground/80 hover:border-foreground/30 hover:bg-secondary/50",
                    isDraft && !isActive && "opacity-80",
                  )}
                  style={
                    isActive
                      ? {
                          background: `linear-gradient(135deg, ${theme.colors[0]}, ${theme.colors[1]}, ${theme.colors[2]})`,
                          borderColor: theme.colors[0],
                        }
                      : undefined
                  }
                  aria-pressed={isActive}
                  aria-label={game.name}
                >
                  <span
                    className={cn(
                      "inline-flex items-center justify-center rounded-md overflow-hidden ring-1 shrink-0",
                      isActive ? "ring-white/60" : "ring-border",
                    )}
                  >
                    <FlagIcon country={theme.country} />
                  </span>
                  <span
                    className="whitespace-nowrap"
                    style={isActive ? { textShadow: "0 1px 2px rgba(0,0,0,0.45)" } : undefined}
                  >
                    {label}
                  </span>
                  {isLive && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full leading-none",
                        compact ? "px-1 py-0.5 text-[8px]" : "px-1.5 py-0.5 text-[9px]",
                        "font-bold uppercase tracking-wider",
                        isActive
                          ? "bg-white/25 text-white"
                          : "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30",
                      )}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                      {!compact && "Live"}
                    </span>
                  )}
                  {isDraft && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full leading-none",
                        compact ? "px-1 py-0.5" : "px-1.5 py-0.5 text-[9px]",
                        "font-bold uppercase tracking-wider",
                        isActive
                          ? "bg-white/25 text-white"
                          : "bg-secondary text-muted-foreground border border-border",
                      )}
                    >
                      <Lock className="w-2.5 h-2.5" />
                      {!compact && "Concept"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
