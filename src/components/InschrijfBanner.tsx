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
  const isSchaatsen = String(game.game_type ?? "").toLowerCase() === "meermarathon";

  // Eén grijze regel in plaats van een losse tellerkolom: hetzelfde nieuws,
  // een kwart van de hoogte.
  const sub = [
    "Gratis meedoen",
    typeof aantal === "number" && aantal > 0 ? `${aantal} deelnemers` : null,
  ].filter(Boolean).join(" · ");

  return (
    <div
      className={cn(
        "flex items-center gap-3 overflow-hidden rounded-xl border border-border bg-card px-3 py-2.5",
        "shadow-[0_8px_20px_-16px_rgba(0,0,0,0.5)]",
        className,
      )}
      role="note"
    >
      {/* Schildje in plaats van het kleurvlak van 76px met streeppatroon en
          verloop. Zelfde koersidentiteit, een fractie van de inkt. */}
      <span
        aria-hidden
        className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[11px] text-[19px]"
        style={{ background: kleur }}
      >
        {isSchaatsen ? "\u26F8\uFE0F" : "\uD83D\uDEB4"}
      </span>

      <div className="min-w-0 flex-1">
        {/* De rode pil is een rode bovenregel geworden: zelfde signaal, minder
            gewicht, en het scheelt een regel hoogte. */}
        <p
          className="font-mono text-[9px] font-extrabold uppercase leading-none tracking-[0.17em]"
          style={{ color: kleur }}
        >
          Inschrijving geopend
        </p>
        <p className="mt-0.5 truncate font-display text-[15px] font-black leading-tight">{game.name}</p>
        {/* Op smalle schermen weg: daar telt elke pixel en de knop is het doel. */}
        <p className="hidden truncate text-[11.5px] leading-tight text-muted-foreground sm:block">{sub}</p>
      </div>

      <Link
        to={`/team-samenstellen?game=${game.id}`}
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-white",
          "font-display text-[12px] font-black transition-transform",
          "hover:-translate-y-0.5 active:translate-y-px",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        )}
        style={{ background: kleur }}
      >
        Doe mee <ArrowRight className="h-3.5 w-3.5" />
      </Link>

      {dismissable && (
        <button
          type="button"
          onClick={dismiss}
          aria-label="Banner sluiten"
          className="-mr-0.5 shrink-0 rounded p-1 text-muted-foreground/60 transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
