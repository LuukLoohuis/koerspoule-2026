import { useEffect, useMemo, useState } from "react";
import ResultsView from "@/components/ResultsView";
import FlagIcon from "@/components/FlagIcon";
import { useAllGames, gameTheme } from "@/hooks/useAllGames";
import { cn } from "@/lib/utils";

export default function Results() {
  const { data: games = [] } = useAllGames();

  // Standaard-game voor de uitslagen: een lopende game heeft voorrang, anders de
  // meest recente afgeronde game (afgerond ≠ verborgen — de uitslagen blijven zo
  // beschikbaar). games is al gesorteerd op jaar (desc) en type (giro eerst).
  const defaultGameId = useMemo(() => {
    const live = games.find((g) => ["open", "live", "locked"].includes(g.status));
    if (live) return live.id;
    const finished = games.find((g) => g.status === "finished");
    return (finished ?? games[0])?.id ?? null;
  }, [games]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    if (!selectedId && defaultGameId) setSelectedId(defaultGameId);
  }, [defaultGameId, selectedId]);

  const selectedGame = games.find((g) => g.id === selectedId) ?? null;

  return (
    <div className="container mx-auto px-5 py-4 md:py-6">
      {games.length > 1 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {games.map((game) => {
            const theme = gameTheme(game.game_type);
            const isActive = selectedId === game.id;
            const isLive = ["open", "live", "locked"].includes(game.status);
            const isDraftBtn = ["draft", "concept"].includes(game.status);
            return (
              <button
                key={game.id}
                onClick={() => setSelectedId(game.id)}
                className={cn(
                  "group flex items-center gap-2.5 rounded-lg border-2 pl-2 pr-3 py-1.5 font-display font-bold text-sm transition-all",
                  isActive
                    ? "text-white shadow-md"
                    : "bg-card border-border text-foreground/80 hover:border-foreground/30 hover:bg-secondary/50",
                  isDraftBtn && !isActive && "opacity-80",
                )}
                style={
                  isActive
                    ? {
                        background: `linear-gradient(135deg, ${theme.colors[0]}, ${theme.colors[1]}, ${theme.colors[2]})`,
                        borderColor: theme.colors[0],
                      }
                    : undefined
                }
              >
                <span
                  className={cn(
                    "inline-flex items-center justify-center rounded-md overflow-hidden ring-1 shrink-0",
                    isActive ? "ring-white/60" : "ring-border",
                  )}
                >
                  <FlagIcon country={theme.country} />
                </span>
                <span style={isActive ? { textShadow: "0 1px 2px rgba(0,0,0,0.45)" } : undefined}>
                  {game.name}
                </span>
                {isLive && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider leading-none",
                      isActive
                        ? "bg-white/25 text-white"
                        : "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30",
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    live
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <ResultsView showHeader gameId={selectedGame?.id} gameName={selectedGame?.name} />
    </div>
  );
}
