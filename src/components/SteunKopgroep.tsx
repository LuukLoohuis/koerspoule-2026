/**
 * Eén bron voor de "Steun de kopgroep" (Buy Me a Coffee)-donatie.
 *
 *  - STEUN_URL: de gedeelde donatie-URL (header, Rules, steun-momenten).
 *  - <SteunKopgroepPill>: de warme, retro header-knop. Zichtbaar + tikbaar op
 *    mobiel (icoon), met label op ≥sm. Subtiel stoom-wiebeltje op het koffie-
 *    icoon bij hover/focus (CSS .kp-coffee-steam; reduced-motion → geen animatie).
 *  - <SteunMoment>: een rustige, wegklikbare steun-regel voor goodwill-momenten
 *    (ploeg ingezonden, ná een ritzege). Onthoudt het wegklikken in localStorage
 *    (try/catch) en komt daarna niet meer terug. Nooit een modal of overlay.
 */
import { useEffect, useState } from "react";
import { Coffee, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const STEUN_URL = "https://www.buymeacoffee.com/luukloohuis";

export function SteunKopgroepPill({ className }: { className?: string }) {
  return (
    <a
      href={STEUN_URL}
      target="_blank"
      rel="noopener noreferrer"
      title="Steun de kopgroep"
      aria-label="Steun de kopgroep via Buy Me a Coffee"
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10",
        "min-h-[36px] px-2.5 py-1 text-primary text-[11px] font-serif italic",
        "transition-colors hover:bg-primary/15 focus-visible:bg-primary/15 focus-visible:outline-none",
        className,
      )}
    >
      <Coffee className="kp-coffee-steam h-4 w-4 shrink-0" />
      <span className="hidden sm:inline">Steun de kopgroep</span>
    </a>
  );
}

export function SteunMoment({
  storageKey,
  text = "Vond je dit leuk? Trakteer de kopgroep op een koffie",
  className,
}: {
  storageKey: string;
  text?: string;
  className?: string;
}) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    let dismissed = true;
    try {
      dismissed = localStorage.getItem(storageKey) === "1";
    } catch {
      dismissed = true; // localStorage geblokkeerd → niet tonen (geen crash)
    }
    setHidden(dismissed);
  }, [storageKey]);

  if (hidden) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* negeer */
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border border-primary/30 bg-primary/[0.07] px-3 py-2",
        "text-xs text-muted-foreground font-serif italic",
        className,
      )}
      role="note"
    >
      <Coffee className="h-3.5 w-3.5 shrink-0 text-primary" />
      <a
        href={STEUN_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 flex-1 truncate text-primary not-italic font-sans font-semibold hover:underline"
      >
        {text}
      </a>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Steun-tip sluiten"
        className="-mr-1 shrink-0 p-1 text-muted-foreground/60 hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
