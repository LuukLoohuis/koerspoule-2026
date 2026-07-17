/**
 * GameSwitcher — compacte pill-rij om de koers te kiezen die je ploeg, subpoules
 * en uitslagen volgt. Actieve pill draagt het vlag-verloop van de race (animeert
 * in bij selectie); een accentlijn onder de rij kleurt mee als brug naar het
 * paginathema. Micro-interacties (hover-lift, press, glans, pulserende live-stip)
 * en volledige prefers-reduced-motion-ondersteuning via .kp-gs-*-klassen in
 * index.css.
 *
 * Alleen renderen voor ingelogde deelnemers op app-pagina's (aanroepende pagina
 * bepaalt dat) en alleen bij >1 zichtbare game. Elke pill toont zijn EIGEN
 * game.status. Geen subtitels (geen jaartal/dames-heren) — alleen naam + status.
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

const raceGradient = (type: string | null | undefined) => {
  const c = gameTheme(type).colors;
  return `linear-gradient(135deg, ${c[0]}, ${c[1]}, ${c[2]})`;
};

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

  const activeGame = ordered.find((g) => g.id === selectedId) ?? ordered[0];
  const accentGradient = raceGradient(activeGame.game_type);

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

            return (
              <button
                key={game.id}
                ref={isActive ? activeRef : undefined}
                type="button"
                onClick={() => onSelect(game.id)}
                aria-pressed={isActive}
                aria-current={isActive ? "true" : undefined}
                aria-label={game.name}
                className={cn(
                  "kp-gs-card group relative snap-start shrink-0 overflow-hidden rounded-full",
                  "min-h-[42px] px-3 py-1.5 outline-none",
                  "focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                  isActive
                    ? "text-white shadow-[2px_2px_0_hsl(var(--foreground))]"
                    : finished
                      ? "kp-gs-finished bg-card border border-border text-foreground/80"
                      : "bg-card border-[1.5px] border-border text-foreground/85 hover:bg-secondary/40",
                )}
                style={{ ["--tw-ring-color" as string]: theme.colors[0] }}
              >
                {/* Vlag-verloop-laag: fade + scale in bij activatie, uit bij deactivatie. */}
                <span
                  aria-hidden
                  className="kp-gs-grad absolute inset-0 rounded-[inherit]"
                  style={{
                    background: raceGradient(game.game_type),
                    opacity: isActive ? 1 : 0,
                    transform: isActive ? "scale(1)" : "scale(0.96)",
                  }}
                />
                {/* Glans die alleen over de actieve pill glijdt. */}
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
                <span className="relative z-10 flex items-center gap-2">
                  <FlagIcon
                    country={theme.country}
                    className={cn("w-7 h-5", isActive ? "ring-1 ring-white/60 border-white/40" : "")}
                  />
                  <span
                    className={cn("font-display text-sm whitespace-nowrap", isActive ? "font-semibold" : "font-bold")}
                    style={isActive ? { color: "#fff", textShadow: "0 1px 2px rgba(10,10,40,0.6)" } : undefined}
                  >
                    {game.name}
                  </span>

                  {/* Status-pill — per kaart, op de eigen game.status. */}
                  <span
                    className={cn(
                      "shrink-0 inline-flex items-center gap-1 rounded-full leading-none",
                      "px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                      isActive
                        ? "bg-white/20 text-white border border-white/40"
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
                        <span className="kp-gs-livedot w-1.5 h-1.5 rounded-full bg-current" /> Live
                      </>
                    ) : badge?.kind === "finished" ? (
                      <>Afgerond</>
                    ) : (
                      badge?.label
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Accentlijn — kleurt mee met de actieve koers (brug naar het paginathema). */}
      <div
        aria-hidden
        className="kp-gs-accent mx-auto mt-2 h-1 w-24 md:w-40 rounded-full"
        style={{ background: accentGradient }}
      />

      {/* Hint onder de rail */}
      <p className="mt-1.5 text-center font-mono text-[9px] md:text-[10px] tracking-[0.18em] uppercase text-muted-foreground/70">
        Tik een koers om te wisselen — je keuze wordt onthouden
      </p>
    </div>
  );
}
