/**
 * GameSwitcher — horizontal, scroll-snap game selector.
 * Replaces the old wrapping flex of buttons in MijnPeloton.
 * - One row, edge-fade masks, hidden scrollbar.
 * - Auto-centers active card on selection.
 */
import { useEffect, useRef } from "react";
import { Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import FlagIcon from "@/components/FlagIcon";
import { gameTheme, type GameRow } from "@/hooks/useAllGames";
import { isVisibleToUser, statusBadge, statusOrderRank } from "@/lib/gameStatus";

type Props = {
  games: GameRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** concept/draft-games alleen tonen aan admins. */
  isAdmin?: boolean;
  className?: string;
};

export default function GameSwitcher({ games, selectedId, onSelect, isAdmin = false, className }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // concept/draft verbergen voor niet-admins; daarna sorteren op fase.
  const ordered = [...games]
    .filter((g) => isVisibleToUser(g.status, isAdmin))
    .sort((a, b) => statusOrderRank(a.status) - statusOrderRank(b.status));

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
          className="relative py-2.5 transition-all duration-200"
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
              const badge = statusBadge(game.status);
              const isDraft = badge?.kind === "concept";

              return (
                <button
                  key={game.id}
                  ref={isActive ? activeRef : undefined}
                  type="button"
                  onClick={() => onSelect(game.id)}
                  className={cn(
                    "group snap-start flex items-center gap-2 rounded-lg border-2 shrink-0",
                    "font-display font-bold transition-all duration-200",
                    "min-h-[44px] px-2.5 py-1.5 text-sm",
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
                    {game.name}
                  </span>
                  {badge && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full leading-none",
                        "px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                        isActive
                          ? "bg-white/25 text-white"
                          : badge.kind === "live"
                            ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                            : badge.kind === "registration"
                              ? "bg-emerald-500/15 text-emerald-700 border border-emerald-500/40"
                              : badge.kind === "concept" || badge.kind === "preview"
                                ? "bg-[hsl(var(--vintage-gold)/0.16)] text-[hsl(var(--vintage-gold))] border border-[hsl(var(--vintage-gold)/0.45)]"
                                : "bg-secondary text-muted-foreground border border-border",
                      )}
                    >
                      {badge.kind === "live" && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
                      {badge.kind === "concept" && <Wrench className="w-2.5 h-2.5" />}
                      {badge.label}
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
