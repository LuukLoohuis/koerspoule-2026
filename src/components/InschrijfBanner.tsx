import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X, ArrowRight, Users } from "lucide-react";
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

  return (
    <div
      className={cn(
        // Vol kleurvlak in de kleur van de aangekondigde koers. Bewust niet de
        // themakleur van de site: deze banner kondigt vaak een ándere game aan
        // dan degene die de bezoeker open heeft staan.
        "relative overflow-hidden rounded-2xl px-5 py-4 text-white shadow-[0_14px_30px_-16px_rgba(0,0,0,0.55)]",
        className,
      )}
      style={{ background: `linear-gradient(112deg, ${donker} 0%, ${kleur} 46%, ${accent} 100%)` }}
      role="note"
    >
      {/* Schuine belijning: geeft het vlak vaart zonder een tweede kleur nodig te
          hebben. Puur decoratief, dus buiten de toegankelijkheidsboom. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "repeating-linear-gradient(114deg, rgba(255,255,255,.07) 0 2px, transparent 2px 26px)",
        }}
      />

      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.22em] text-white/75">
            Inschrijving geopend
          </p>
          <p className="mt-1 font-display text-xl font-black leading-tight md:text-2xl">{game.name}</p>
          <p className="mt-0.5 text-[13px] text-white/85">
            Gratis meedoen · je ploeg samenstellen kost vijf minuten
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Sociaal bewijs alleen als de admin de teller voor deze game aanzette
              én er echt deelnemers zijn — zelfde regel als op de homepage. */}
          {typeof aantal === "number" && aantal > 0 && (
            <span className="hidden text-right sm:block">
              <span className="flex items-center gap-1.5 font-display text-lg font-black leading-none">
                <Users className="h-4 w-4 text-white/70" aria-hidden />
                {aantal}
              </span>
              <span className="mt-1 block font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-white/70">
                deelnemers
              </span>
            </span>
          )}
          <Link
            to={`/team-samenstellen?game=${game.id}`}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-5 py-2.5",
              "font-display text-[13px] font-black shadow-[0_6px_16px_rgba(0,0,0,0.18)]",
              "transition-transform hover:-translate-y-0.5 active:translate-y-px",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2",
            )}
            style={{ color: donker }}
          >
            Doe mee <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          {dismissable && (
            <button
              type="button"
              onClick={dismiss}
              aria-label="Banner sluiten"
              className="-mr-1 shrink-0 self-start rounded p-1 text-white/60 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
