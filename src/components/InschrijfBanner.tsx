import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { deriveThemaKey, THEMAS } from "@/lib/themas";
import { useDeelnemersAantal } from "@/hooks/useDeelnemersAantal";
import type { GameRow } from "@/hooks/useAllGames";

/**
 * "Inschrijving open"-banner voor één game. Bewust op GameRow-props (niet
 * useCurrentGame), zodat een NIET-gekozen game ook aangekondigd kan worden.
 *
 * Rendert alleen als de admin-vlag aan staat ÉN de game daadwerkelijk
 * open_inschrijving is (dubbele guard — de vlag alleen is niet genoeg). De
 * "Doe mee"-knop zet via ?game=<id> de SelectedGameContext op deze game, zodat
 * de bezoeker meteen in de juiste inschrijving landt.
 *
 * dismissable=true (in-app): wegklikken onthouden per game in localStorage.
 * Homepage gebruikt dismissable=false → blijft staan zolang de vlag aan is.
 */
/** Donkerder variant van de koerskleur, voor de linkerkant van het verloop. */
function schaduw(hex: string): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const mix = (v: number) => Math.round(v * 0.55);
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => mix(v).toString(16).padStart(2, "0")).join("")}`;
}

export default function InschrijfBanner({
  game,
  dismissable = false,
  className,
}: {
  game: GameRow;
  dismissable?: boolean;
  className?: string;
}) {
  const storageKey = `inschrijf_banner_dismissed:${game.id}`;
  const [hidden, setHidden] = useState(dismissable);

  useEffect(() => {
    if (!dismissable) {
      setHidden(false);
      return;
    }
    let d = false;
    try {
      d = localStorage.getItem(storageKey) === "1";
    } catch {
      d = false;
    }
    setHidden(d);
  }, [dismissable, storageKey]);

  // Deelnemersaantal: zelfde admin-vlag als de teller op de homepage, zodat
  // dit cijfer nooit vanzelf ergens opduikt. Hook staat vóór de guards, want
  // hooks mogen niet achter een early return.
  const { data: aantal } = useDeelnemersAantal(game.id, Boolean(game.deelnemers_teller_visible));

  // Dubbele guard: vlag aan én status daadwerkelijk open_inschrijving.
  if (String(game.status) !== "open_inschrijving" || !game.inschrijf_banner_visible) return null;
  if (hidden) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
  };

  const thema = THEMAS[deriveThemaKey(game.theme, game.game_type)];
  const kleur = thema.kleuren.primair;
  const accent = thema.kleuren.secundair;
  const donker = schaduw(kleur);
  const isSchaatsen = String(game.game_type ?? "").toLowerCase() === "meermarathon";

  return (
    <div
      className={cn(
        "flex overflow-hidden rounded-2xl border border-border bg-card",
        "shadow-[0_14px_30px_-18px_rgba(0,0,0,0.6)]",
        className,
      )}
      role="note"
    >
      {/* Kleurpaneel links: geeft de banner gewicht zonder dat de tekst op een
          kleurvlak komt te staan. De koersnaam blijft daardoor het scherpst
          leesbare onderdeel, en dat is waar het om draait. */}
      <div
        className="relative grid w-[68px] shrink-0 place-items-center sm:w-[76px]"
        style={{ background: `linear-gradient(150deg, ${kleur} 0%, ${donker} 100%)` }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "repeating-linear-gradient(114deg, rgba(255,255,255,.10) 0 2px, transparent 2px 20px)",
          }}
        />
        <span aria-hidden className="relative text-[26px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
          {isSchaatsen ? "\u26F8\uFE0F" : "\uD83D\uDEB4"}
        </span>
      </div>

      <div
        className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-5"
        style={{ borderLeft: `3px solid ${accent}` }}
      >
        <div className="min-w-0">
          <span
            className="inline-block rounded-full px-2.5 py-1 font-mono text-[9.5px] font-extrabold uppercase tracking-[0.2em] text-white"
            style={{ background: kleur }}
          >
            Inschrijving geopend
          </span>
          <p className="mt-1.5 font-display text-lg font-black leading-tight sm:text-xl">{game.name}</p>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            Gratis meedoen · samenstellen kost vijf minuten
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Sociaal bewijs achter dezelfde admin-vlag als de homepage-teller;
              op smalle schermen weg zodat de knop niet in de verdrukking komt. */}
          {typeof aantal === "number" && aantal > 0 && (
            <span className="hidden text-right sm:block">
              <span className="block font-display text-lg font-black leading-none">{aantal}</span>
              <span className="mt-1 block font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                deelnemers
              </span>
            </span>
          )}
          <Link
            to={`/team-samenstellen?game=${game.id}`}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-5 py-2.5 text-white",
              "font-display text-[13px] font-black transition-transform",
              "hover:-translate-y-0.5 active:translate-y-px",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            )}
            style={{ background: kleur, boxShadow: `0 8px 18px -6px ${kleur}` }}
          >
            Doe mee <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          {dismissable && (
            <button
              type="button"
              onClick={dismiss}
              aria-label="Banner sluiten"
              className="-mr-1 shrink-0 self-start rounded p-1 text-muted-foreground/60 transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
