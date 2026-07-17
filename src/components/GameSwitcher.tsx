/**
 * GameSwitcher — "vertrekbord": kies de koers die je ploeg, subpoules en
 * uitslagen volgt. Gecentreerd in de contentkolom; op desktop vier startkaartjes
 * naast elkaar zonder scroll, op mobiel een horizontaal scrollbare snap-rij met
 * edge-fade + auto-center van de actieve kaart.
 *
 * Alleen renderen voor ingelogde deelnemers op app-pagina's (de aanroepende
 * pagina bepaalt dat) en alleen bij >1 zichtbare game. Het klik-thema
 * (gameTheme-achtergrond op de actieve kaart) blijft ongewijzigd.
 */
import { useEffect, useRef } from "react";
import { Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import FlagIcon from "@/components/FlagIcon";
import { gameTheme, type GameRow } from "@/hooks/useAllGames";
import { isVisibleToUser, isAdminOnlyStatus, statusBadge, statusOrderRank } from "@/lib/gameStatus";

type Props = {
  games: GameRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** concept/draft-games alleen tonen aan admins. */
  isAdmin?: boolean;
  className?: string;
};

function toRoman(n: number): string {
  const map: [number, string][] = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
    [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let r = "";
  let x = n;
  for (const [v, sym] of map) while (x >= v) { r += sym; x -= v; }
  return r;
}

export default function GameSwitcher({ games, selectedId, onSelect, isAdmin = false, className }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  const ordered = [...games]
    .filter((g) => isVisibleToUser(g.status, isAdmin))
    .sort((a, b) => statusOrderRank(a.status) - statusOrderRank(b.status));

  // Actieve kaart centreren (mobiel; op desktop no-op want geen scroll).
  useEffect(() => {
    const el = activeRef.current;
    const box = scrollRef.current;
    if (!el || !box) return;
    const left = el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2;
    box.scrollTo({ left, behavior: "smooth" });
  }, [selectedId]);

  if (ordered.length <= 1) return null;

  return (
    <div className={cn("w-full", className)}>
      {/* Kop */}
      <div className="text-center mb-2.5">
        <div className="flex items-center justify-center gap-3">
          <span className="h-px w-8 md:w-14 bg-gradient-to-r from-transparent to-foreground/30" aria-hidden />
          <span className="font-mono text-[10px] md:text-[11px] tracking-[0.28em] uppercase text-muted-foreground font-bold whitespace-nowrap">
            Grand Départ · Kies je koers
          </span>
          <span className="h-px w-8 md:w-14 bg-gradient-to-l from-transparent to-foreground/30" aria-hidden />
        </div>
        <p className="mt-1 font-serif italic text-xs md:text-sm text-muted-foreground">
          Je ploeg, subpoules en uitslagen volgen de koers die je hier kiest.
        </p>
      </div>

      {/* Rail: mobiel scroll-snap + edge-fade; desktop wrap + center, geen fade. */}
      <div
        className="relative py-1 md:[mask-image:none]"
        style={{
          maskImage:
            "linear-gradient(to right, transparent 0%, black 16px, black calc(100% - 16px), transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 16px, black calc(100% - 16px), transparent 100%)",
        }}
      >
        <div
          ref={scrollRef}
          className="flex gap-2.5 overflow-x-auto px-3 md:flex-wrap md:justify-center md:overflow-visible md:px-0"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none", scrollSnapType: "x mandatory" }}
        >
          {ordered.map((game) => {
            const theme = gameTheme(game.game_type);
            const isActive = selectedId === game.id;
            const concept = isAdminOnlyStatus(game.status);
            const badge = statusBadge(game.status);
            const finished = badge?.kind === "finished";
            const isFemmes = String(game.game_type).toLowerCase() === "femmes";
            const sub = `${toRoman(game.year)}${isFemmes ? " · Dames" : ""}`;

            return (
              <button
                key={game.id}
                ref={isActive ? activeRef : undefined}
                type="button"
                onClick={() => onSelect(game.id)}
                aria-pressed={isActive}
                aria-label={game.name}
                className={cn(
                  "group relative snap-start shrink-0 md:flex-1 md:max-w-[240px] md:min-w-0",
                  "flex items-center gap-2.5 rounded-xl text-left transition-all duration-200",
                  "min-h-[58px] px-3 py-2",
                  isActive
                    ? "text-white shadow-[2px_2px_0_hsl(var(--foreground))]"
                    : finished
                      ? "bg-card border border-border text-foreground/70 opacity-[0.65] hover:opacity-100"
                      : "bg-card border-[1.5px] border-border text-foreground/85 hover:border-foreground/30 hover:bg-secondary/50",
                )}
                style={
                  isActive
                    ? {
                        background: `linear-gradient(135deg, ${theme.colors[0]}, ${theme.colors[1]}, ${theme.colors[2]})`,
                        border: `2px solid ${theme.colors[0]}`,
                      }
                    : undefined
                }
              >
                {/* "Actief"-stempeltje op de bovenrand */}
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute -top-2 right-3 -rotate-6 rounded-sm bg-[hsl(var(--foreground))] px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-widest text-[hsl(var(--background))] shadow-sm"
                  >
                    Actief
                  </span>
                )}

                <FlagIcon
                  country={theme.country}
                  className={cn("w-8 h-5", isActive ? "ring-1 ring-white/60 border-white/40" : "")}
                />

                <span className="min-w-0 flex-1">
                  <span
                    className="block font-display font-bold text-sm truncate"
                    style={isActive ? { textShadow: "0 1px 2px rgba(0,0,0,0.45)" } : undefined}
                  >
                    {game.name}
                  </span>
                  <span
                    className={cn(
                      "block font-mono text-[10px] tracking-wider uppercase truncate",
                      isActive ? "text-white/75" : "text-muted-foreground",
                    )}
                  >
                    {sub}
                  </span>
                </span>

                {/* Status-pill rechtsonder */}
                <span
                  className={cn(
                    "shrink-0 inline-flex items-center gap-1 rounded-full leading-none",
                    "px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                    isActive
                      ? "bg-white/25 text-white"
                      : concept
                        ? "bg-[hsl(var(--vintage-gold)/0.16)] text-[hsl(var(--vintage-gold))] border border-[hsl(var(--vintage-gold)/0.45)]"
                        : badge?.kind === "live"
                          ? "bg-red-500/15 text-red-600 border border-red-500/40"
                          : badge?.kind === "registration"
                            ? "bg-emerald-500/15 text-emerald-700 border border-emerald-500/40"
                            : badge?.kind === "preview"
                              ? "bg-[hsl(var(--vintage-gold)/0.16)] text-[hsl(var(--vintage-gold))] border border-[hsl(var(--vintage-gold)/0.45)]"
                              : "bg-secondary text-muted-foreground border border-border",
                  )}
                >
                  {concept ? (
                    <>
                      <Wrench className="w-2.5 h-2.5" /> Concept
                    </>
                  ) : badge?.kind === "live" ? (
                    <>
                      <span className={cn("w-1.5 h-1.5 rounded-full bg-current", !isActive && "animate-pulse")} /> Live
                    </>
                  ) : badge?.kind === "finished" ? (
                    <>Afgerond · bekijk</>
                  ) : (
                    badge?.label
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hint onder de rail */}
      <p className="mt-1.5 text-center font-mono text-[9px] md:text-[10px] tracking-[0.18em] uppercase text-muted-foreground/70">
        Tik een koers om te wisselen — je keuze wordt onthouden
      </p>
    </div>
  );
}
