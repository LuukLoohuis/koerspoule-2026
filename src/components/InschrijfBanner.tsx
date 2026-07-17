import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Megaphone, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
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

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border-2 border-primary/50 bg-card shadow-[3px_3px_0_hsl(var(--foreground)/0.15)]",
        className,
      )}
      role="note"
    >
      <div className="h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary" />
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-primary/40 bg-primary/10 text-primary">
          <Megaphone className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold leading-tight">
            De inschrijving voor {game.name} is open!
          </p>
          <p className="text-xs text-muted-foreground font-serif italic">
            Stel gratis je ploeg samen en speel met vrienden.
          </p>
        </div>
        <Link
          to={`/team-samenstellen?game=${game.id}`}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-md border-2 border-foreground bg-primary px-3 py-1.5 text-xs font-display font-bold text-primary-foreground shadow-[2px_2px_0_hsl(var(--foreground))] transition-transform hover:-translate-y-0.5 active:translate-y-px"
        >
          Doe mee <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        {dismissable && (
          <button
            type="button"
            onClick={dismiss}
            aria-label="Banner sluiten"
            className="-mr-1 shrink-0 self-start p-1 text-muted-foreground/60 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
