/**
 * Eén bron voor de "Steun Koerspoule" (Ko-fi)-donatie.
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
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export const STEUN_URL = "https://ko-fi.com/koerspoule";

export function SteunKopgroepPill({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <a
      href={STEUN_URL}
      target="_blank"
      rel="noopener noreferrer"
      title={t("shell.steun.title")}
      aria-label={t("shell.steun.aria")}
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10",
        "min-h-[36px] px-2.5 py-1 text-primary text-[11px] font-serif italic",
        "transition-colors hover:bg-primary/15 focus-visible:bg-primary/15 focus-visible:outline-none",
        className,
      )}
    >
      <Coffee className="kp-coffee-steam h-5 w-5 sm:h-4 sm:w-4 shrink-0" />
      {/* Label altijd zichtbaar (ook op mobiel). Merknaam — identiek in beide talen. */}
      <span className="whitespace-nowrap">{t("shell.steun.title")}</span>
    </a>
  );
}

export function SteunMoment({
  storageKey,
  text,
  className,
}: {
  storageKey: string;
  text?: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const shownText = text ?? t("shell.steun.coffeeTip");
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
        {shownText}
      </a>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("shell.steun.tipClose")}
        className="-mr-1 shrink-0 p-1 text-muted-foreground/60 hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/**
 * <SteunBanner> — rustige, retro "Steun Koerspoule"-banner (mobiel + web). Wordt
 * alléén getoond als de admin 'm handmatig heeft aangezet (via stages); MijnPeloton
 * bepaalt de zichtbaarheid. Wegklikbaar per gebruiker; de dismiss-key bevat de
 * laatste updated_at (revKey), zodat 'ie terugkomt als de admin 'm opnieuw aanzet.
 * Geen modal/overlay.
 */
export function SteunBanner({ revKey, className }: { revKey?: string | null; className?: string }) {
  const { t } = useTranslation();
  const storageKey = `kp_steun_banner_dismissed_v1:${revKey ?? "default"}`;
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    let dismissed = true;
    try {
      dismissed = localStorage.getItem(storageKey) === "1";
    } catch {
      dismissed = true;
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
        "relative overflow-hidden rounded-xl border-2 border-primary/40 bg-card shadow-[3px_3px_0_hsl(var(--foreground)/0.15)]",
        className,
      )}
      role="note"
    >
      <div className="h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary" />
      {/* Gestapeld, niet als rij: de banner staat in een kolom van ~268px en
          daar brak de tekst naast een knop na bijna elk woord af. */}
      <div className="px-3.5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-primary/40 bg-primary/10 text-primary">
            <Coffee className="h-4 w-4" />
          </span>
          <p className="min-w-0 flex-1 font-display text-sm font-bold leading-tight">
            {t("shell.steun.bannerTitle")}
          </p>
          <button
            type="button"
            onClick={dismiss}
            aria-label={t("shell.steun.bannerClose")}
            className="-mr-1 shrink-0 self-start p-1 text-muted-foreground/60 hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="mt-2 text-pretty font-serif text-xs italic leading-relaxed text-muted-foreground">
          {t("shell.steun.bannerBody")}
        </p>
        <a
          href={STEUN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-md border-2 border-foreground bg-primary px-3 py-1.5 text-xs font-display font-bold text-primary-foreground shadow-[2px_2px_0_hsl(var(--foreground))] transition-transform hover:-translate-y-0.5 active:translate-y-px"
        >
          <Coffee className="h-3.5 w-3.5" aria-hidden />
          {t("shell.steun.treat")}
        </a>
      </div>
    </div>
  );
}
