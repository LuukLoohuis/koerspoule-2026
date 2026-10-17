/**
 * GameSwitcher — de "koersbalk": één retro-omkaderd segmented control met een
 * segment per LOPENDE game (geen losse kaarten). Altijd één regel; op smalle
 * schermen horizontaal scrollbaar met snap. Het actieve segment draagt het
 * vlag-verloop van zijn race van rand tot rand (animeert in bij selectie) met
 * een witte onderstreep als "je bent hier"-marker; een glans glijdt eroverheen.
 * Micro-interacties + prefers-reduced-motion via .kp-gs-*-klassen in index.css.
 *
 * De balk staat er alleen als er iets te kiezen valt tussen LOPENDE koersen
 * (bijvoorbeeld Tour en Tour Femmes tegelijk). Afgeronde koersen staan er niet
 * in: die vervuilden de telefoon (vier segmenten "Afgerond" naast de ene
 * lopende koers) en staan nu in het archief op /profiel (Oude spellen). Kijk je
 * zo'n oude koers terug, dan staat hier de TerugkijkStrip in plaats van de balk.
 *
 * Alleen renderen voor ingelogde deelnemers op app-pagina's (aanroepende pagina
 * bepaalt dat). Elke pill toont zijn EIGEN game.status. Geen subtitels.
 */
import { useEffect, useRef } from "react";
import { Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { gameTheme, type GameRow } from "@/hooks/useAllGames";
import { isVisibleToUser, isAdminOnlyStatus, statusBadge, statusOrderRank, isFinishedLike } from "@/lib/gameStatus";
import { isMeermarathonGame } from "@/lib/gameTypes";
import TerugkijkStrip from "@/components/TerugkijkStrip";
import { KoersIcoon, eenSegmentPerSeizoen, raceGradient, segmentName, splitsOudeKoersen } from "@/components/koersSegment";

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

  const ordered = eenSegmentPerSeizoen(
    [...games].filter((g) => isVisibleToUser(g.status, isAdmin)),
    selectedId,
  ).sort((a, b) => statusOrderRank(a.status) - statusOrderRank(b.status));
  const { actief, oud } = splitsOudeKoersen(ordered);
  const gekozenOud = oud.find((g) => g.id === selectedId) ?? null;

  // Actieve segment in beeld scrollen (mobiel; desktop no-op want geen scroll).
  useEffect(() => {
    const el = activeRef.current;
    const box = scrollRef.current;
    if (!el || !box) return;
    // Alleen centreren als de balk daadwerkelijk scrollt (mobiel); op desktop
    // past alles en zou scrollen segmenten uit beeld schuiven.
    if (box.scrollWidth <= box.clientWidth + 4) return;
    const left = el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2;
    box.scrollTo({ left, behavior: "smooth" });
  }, [selectedId]);

  // Terugkijken naar een oude koers: geen balk, wel de strook met de weg terug.
  if (gekozenOud) {
    return <TerugkijkStrip game={gekozenOud} terugNaar={actief[0] ?? null} onSelect={onSelect} className={className} />;
  }
  if (actief.length <= 1) return null;

  return (
    <div className={cn("w-full", className)}>
      {/* Koersbalk: retro-omkaderd segmented control. Mask fadet alleen bij
          horizontale scroll (mobiel); op desktop uit. overflow-x-auto +
          overflow-y-hidden klipt óók naar de afgeronde hoeken. */}
      <div
        ref={scrollRef}
        className={cn(
          // Mobiel: horizontale scroll met snap. Desktop (md+): GEEN scroll —
          // alle segmenten passen altijd binnen de balk (shrink + truncate).
          "flex overflow-x-auto overflow-y-hidden rounded-xl border-2 border-foreground",
          "md:overflow-x-hidden",
          "bg-secondary/40 shadow-[3px_3px_0_hsl(var(--foreground))] divide-x divide-foreground/25",
          "md:mask-none",
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
        {actief.map((game) => {
          const theme = gameTheme(game.game_type);
          const meermarathon = isMeermarathonGame(game.game_type);
          const isActive = selectedId === game.id;
          const segmentLabel = meermarathon ? `Meermarathon ${game.year}-${game.year + 1}` : game.name;
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
              aria-label={segmentLabel}
              className={cn(
                // Mobiel: zo breed als zijn inhoud, groeit mee tot de balk vol is
                // (flex-auto) en krimpt nooit (shrink-0) — passen de segmenten
                // niet, dan scrollt de balk. Desktop: gelijke delen, altijd passend.
                // overflow-hidden: de glans (-inset-x-1/4) blijft binnen zijn
                // segment en telt niet mee als scrollbreedte van de balk.
                "kp-gs-seg relative overflow-hidden snap-start flex-auto shrink-0 min-w-[150px] md:min-w-0 md:shrink md:flex-1",
                "flex items-center justify-center px-2.5 md:px-3 pt-[11px] pb-3 outline-hidden",
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

              {/* Inhoud boven de lagen: verticale stapel — vlag+naam boven, pill eronder. */}
              <span className="relative z-10 flex flex-col items-center justify-center gap-[5px] min-w-0 max-w-full">
                {/* Bovenste regel: vlag + racenaam op één lijn. */}
                <span className="flex items-center gap-[7px] min-w-0 max-w-full">
                  <KoersIcoon game={game} actief={isActive} />
                  <span
                    className={cn("font-display text-[13px] min-w-0 truncate whitespace-nowrap", isActive ? "font-semibold" : "font-bold")}
                    style={isActive ? { color: "#fff", textShadow: "0 1px 2px rgba(10,10,40,0.6)" } : undefined}
                  >
                    {name}
                  </span>
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
        <span className="h-px w-8 md:w-14 bg-linear-to-r from-transparent to-foreground/25" aria-hidden />
        <span className="font-mono text-[9px] md:text-[10px] tracking-[0.18em] uppercase text-muted-foreground/70 text-center leading-snug md:whitespace-nowrap">
          Tik een koers om te wisselen — je keuze wordt onthouden
        </span>
        <span className="h-px w-8 md:w-14 bg-linear-to-l from-transparent to-foreground/25" aria-hidden />
      </div>
    </div>
  );
}
