/**
 * GameSwitcher — de "koersbalk": één retro-omkaderd segmented control met een
 * segment per game (geen losse kaarten). Altijd één regel; op smalle schermen
 * horizontaal scrollbaar met snap. Het actieve segment draagt het vlag-verloop
 * van zijn race van rand tot rand (animeert in bij selectie) met een witte
 * onderstreep als "je bent hier"-marker; een glans glijdt eroverheen. Micro-
 * interacties + prefers-reduced-motion via .kp-gs-*-klassen in index.css.
 *
 * Alleen renderen voor ingelogde deelnemers op app-pagina's (aanroepende pagina
 * bepaalt dat) en alleen bij >1 zichtbare game. Elke pill toont zijn EIGEN
 * game.status. Geen subtitels.
 */
import { useEffect, useRef } from "react";
import { Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import FlagIcon from "@/components/FlagIcon";
import { gameTheme, type GameRow } from "@/hooks/useAllGames";
import { isVisibleToUser, isAdminOnlyStatus, statusBadge, statusOrderRank, isFinishedLike } from "@/lib/gameStatus";

type Props = {
  games: GameRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** concept/draft-games alleen tonen aan admins. */
  isAdmin?: boolean;
  className?: string;
};

const raceGradient = (type: string | null | undefined) => {
  const c = gameTheme(type).colors;
  return `linear-gradient(135deg, ${c[0]}, ${c[1]}, ${c[2]})`;
};

/** Segment-naam: afgeronde games kort (Giro 2026), overige compact-vol. */
function segmentName(game: GameRow, finished: boolean): string {
  const y = game.year;
  const t = String(game.game_type ?? "").toLowerCase();
  if (finished) {
    if (t === "giro") return `Giro ${y}`;
    if (t === "vuelta" || t === "vta") return `Vuelta ${y}`;
    if (t === "femmes") return `Tour Femmes ${y}`;
    return `Tour ${y}`;
  }
  if (t === "giro") return `Giro d'Italia ${y}`;
  if (t === "vuelta" || t === "vta") return `Vuelta ${y}`;
  if (t === "femmes") return `Tour Femmes ${y}`;
  return `Tour de France ${y}`;
}

export default function GameSwitcher({ games, selectedId, onSelect, isAdmin = false, className }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  const ordered = [...games]
    .filter((g) => isVisibleToUser(g.status, isAdmin))
    .sort((a, b) => statusOrderRank(a.status) - statusOrderRank(b.status));

  // Actieve segment in beeld scrollen (mobiel; desktop no-op want geen scroll).
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
      {/* Koersbalk: retro-omkaderd segmented control. Mask fadet alleen bij
          horizontale scroll (mobiel); op desktop uit. overflow-x-auto +
          overflow-y-hidden klipt óók naar de afgeronde hoeken. */}
      <div
        ref={scrollRef}
        className={cn(
          "flex overflow-x-auto overflow-y-hidden rounded-xl border-2 border-foreground",
          "bg-secondary/40 shadow-[3px_3px_0_hsl(var(--foreground))] divide-x divide-foreground/25",
          "md:[mask-image:none]",
        )}
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          scrollSnapType: "x mandatory",
          maskImage:
            "linear-gradient(to right, transparent 0, black 14px, black calc(100% - 14px), transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0, black 14px, black calc(100% - 14px), transparent 100%)",
        }}
      >
        {ordered.map((game) => {
          const theme = gameTheme(game.game_type);
          const isActive = selectedId === game.id;
          const concept = isAdminOnlyStatus(game.status);
          const badge = statusBadge(game.status);
          const finished = isFinishedLike(game.status);
          const name = segmentName(game, finished);

          return (
            <button
              key={game.id}
              ref={isActive ? activeRef : undefined}
              type="button"
              onClick={() => onSelect(game.id)}
              aria-current={isActive ? "true" : undefined}
              aria-label={game.name}
              className={cn(
                "kp-gs-seg relative snap-start shrink-0 min-w-[150px] md:min-w-0 md:flex-1",
                "flex items-center justify-center gap-2 px-3 py-[13px] outline-none",
                "focus-visible:ring-2 focus-visible:ring-inset",
                isActive
                  ? "md:flex-[1.15] text-white"
                  : finished
                    ? "kp-gs-finished text-foreground/80 hover:bg-secondary/70"
                    : "text-foreground/85 hover:bg-secondary/70",
              )}
              style={{ ["--tw-ring-color" as string]: theme.colors[0] }}
            >
              {/* Vlag-verloop-laag: fade + scale in bij activatie. */}
              <span
                aria-hidden
                className="kp-gs-grad absolute inset-0"
                style={{
                  background: raceGradient(game.game_type),
                  opacity: isActive ? 1 : 0,
                  transform: isActive ? "scale(1)" : "scale(0.97)",
                }}
              />
              {/* Glans over het actieve segment. */}
              {isActive && (
                <span
                  aria-hidden
                  className="kp-gs-shine absolute inset-y-0 -inset-x-1/4 pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.35) 50%, transparent 65%)",
                  }}
                />
              )}

              {/* Inhoud boven de lagen. */}
              <span className="relative z-10 flex items-center gap-2 min-w-0">
                <FlagIcon
                  country={theme.country}
                  className={cn("w-6 h-[17px] shrink-0", isActive ? "ring-1 ring-white/60 border-white/40" : "")}
                />
                <span
                  className={cn("font-display text-[13px] truncate", isActive ? "font-semibold" : "font-bold")}
                  style={isActive ? { color: "#fff", textShadow: "0 1px 2px rgba(10,10,40,0.6)" } : undefined}
                >
                  {name}
                </span>

                {/* Status-pill — per segment, op de eigen game.status. */}
                <span
                  className={cn(
                    "shrink-0 inline-flex items-center gap-1 rounded-full leading-none",
                    "px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                    isActive
                      ? "text-white border border-white/45"
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
                  style={
                    isActive
                      ? { background: badge?.kind === "live" ? "rgba(160,20,25,0.92)" : "rgba(255,255,255,0.20)" }
                      : undefined
                  }
                >
                  {concept ? (
                    <>
                      <Wrench className="w-2.5 h-2.5" /> Concept
                    </>
                  ) : badge?.kind === "live" ? (
                    <>
                      <span className="kp-gs-livedot w-1.5 h-1.5 rounded-full bg-current" /> Live
                    </>
                  ) : badge?.kind === "finished" ? (
                    <>Afgerond</>
                  ) : (
                    badge?.label
                  )}
                </span>
              </span>

              {/* Witte onderstreep — "je bent hier" op het actieve segment. */}
              {isActive && (
                <span aria-hidden className="absolute inset-x-0 bottom-0 z-10 h-[3px] bg-white" />
              )}
            </button>
          );
        })}
      </div>

      {/* Hint onder de balk, met dunne sierlijnen. */}
      <div className="mt-2 flex items-center justify-center gap-3">
        <span className="h-px w-8 md:w-14 bg-gradient-to-r from-transparent to-foreground/25" aria-hidden />
        <span className="font-mono text-[9px] md:text-[10px] tracking-[0.18em] uppercase text-muted-foreground/70 whitespace-nowrap">
          Tik een koers om te wisselen — je keuze wordt onthouden
        </span>
        <span className="h-px w-8 md:w-14 bg-gradient-to-l from-transparent to-foreground/25" aria-hidden />
      </div>
    </div>
  );
}
