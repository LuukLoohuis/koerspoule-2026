/**
 * <OnboardingCard> — "Aan de slag": compacte checklist met voortgangsbalk in de
 * zijkolom van Mijn Peloton.
 *
 * Was een brede kaart met drie kolommen naast elkaar; die past niet in een
 * kolom van 268px. Nu één regel per stap, zodat er ook meer stappen bij kunnen
 * dan alleen de drie verplichte: statistieken en de krant zijn de plekken die
 * deelnemers uit zichzelf zelden vinden, en een regel in deze lijst is de
 * goedkoopste manier om ze er toch heen te sturen.
 *
 * Afgeronde stappen blijven staan met een vinkje — ze tonen voortgang. De kaart
 * verdwijnt vanzelf zodra alles rond is, en is wegklikbaar (localStorage).
 */
import { useState } from "react";
import { Check, X, Users, Share2, LineChart, Mountain, Newspaper, Compass } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export const ONBOARDING_KEY = "kp_onboarding_dismissed";

/** Is de kaart eerder weggeklikt? Nodig om een lege zijkolom te voorkomen. */
export function onboardingWeggeklikt(): boolean {
  try { return localStorage.getItem(ONBOARDING_KEY) === "1"; } catch { return false; }
}

type Stap = {
  label: string;
  actie: string;
  done: boolean;
  Icon: typeof Users;
  onClick: () => void;
};

export default function OnboardingCard({
  hasTeam,
  inSubpoule,
  liveTracking,
  statsBekeken,
  krantBekeken,
  onTeam,
  onSubpoule,
  onResults,
  onStats,
  onKrant,
  onRondleiding,
  onDismissed,
}: {
  hasTeam: boolean;
  inSubpoule: boolean;
  liveTracking: boolean;
  /** Heeft de deelnemer Hors Catégorie al geopend? */
  statsBekeken?: boolean;
  /** Heeft de deelnemer de krant al geopend? */
  krantBekeken?: boolean;
  onTeam: () => void;
  onSubpoule: () => void;
  onResults: () => void;
  onStats?: () => void;
  onKrant?: () => void;
  /** Start de rondleiding. Weglaten = geen knop. */
  onRondleiding?: () => void;
  /** Vuurt bij wegklikken, zodat een omliggende kolom kan inklappen. */
  onDismissed?: () => void;
}) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(() => onboardingWeggeklikt());

  const stappen: Stap[] = [
    { label: t("common.onboarding.step1Label"), actie: t("common.onboarding.step1Cta"), done: hasTeam, Icon: Users, onClick: onTeam },
    { label: t("common.onboarding.step2Label"), actie: t("common.onboarding.step2Cta"), done: inSubpoule, Icon: Share2, onClick: onSubpoule },
    { label: t("common.onboarding.step3Label"), actie: t("common.onboarding.step3Cta"), done: liveTracking, Icon: LineChart, onClick: onResults },
    ...(onStats ? [{ label: t("common.onboarding.step4Label"), actie: t("common.onboarding.step4Cta"), done: Boolean(statsBekeken), Icon: Mountain, onClick: onStats }] : []),
    ...(onKrant ? [{ label: t("common.onboarding.step5Label"), actie: t("common.onboarding.step5Cta"), done: Boolean(krantBekeken), Icon: Newspaper, onClick: onKrant }] : []),
  ];

  const klaar = stappen.filter((s) => s.done).length;

  // Alles gedaan → de kaart heeft geen functie meer.
  if (dismissed || klaar === stappen.length) return null;

  const close = () => {
    setDismissed(true);
    try { localStorage.setItem(ONBOARDING_KEY, "1"); } catch { /* negeer */ }
    onDismissed?.();
  };

  // De eerstvolgende open stap krijgt nadruk; de rest blijft rustig, zodat er
  // altijd één duidelijke volgende handeling is.
  const volgendeIndex = stappen.findIndex((s) => !s.done);

  return (
    <div className="retro-border bg-card p-3.5">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-sm font-black uppercase tracking-wide">
          {t("common.onboarding.heading")}
        </h2>
        <button
          type="button"
          onClick={close}
          aria-label={t("common.onboarding.close")}
          className="ml-auto -mr-1 p-1 text-muted-foreground/70 hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-2 mb-2.5 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${(klaar / stappen.length) * 100}%` }}
          />
        </div>
        <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
          {klaar}/{stappen.length}
        </span>
      </div>

      <ol className="flex flex-col">
        {stappen.map((s, i) => {
          const volgende = i === volgendeIndex;
          return (
            <li key={s.label}>
              <button
                type="button"
                onClick={s.onClick}
                className={cn(
                  "flex w-full items-start gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  volgende ? "bg-primary/[0.07]" : "hover:bg-foreground/[0.04]",
                )}
              >
                <span
                  className={cn(
                    "mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-display font-black",
                    s.done
                      ? "bg-primary text-primary-foreground"
                      : volgende
                        ? "bg-primary/20 text-primary"
                        : "border border-foreground/20 text-muted-foreground",
                  )}
                >
                  {s.done ? <Check className="h-2.5 w-2.5" /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-xs leading-tight",
                      s.done ? "text-muted-foreground line-through" : volgende ? "font-bold" : "font-medium",
                    )}
                  >
                    {s.label}
                  </span>
                  {!s.done && (
                    <span className="mt-0.5 block text-[11px] font-semibold text-primary">
                      {s.actie} →
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* De checklist zegt wát je moet doen, de rondleiding waar het staat.
          Vooral op de webversie is dat de brug: daar zijn de namen in de
          tabbalk hetzelfde wielerjargon als op mobiel. */}
      {onRondleiding && (
        <button
          type="button"
          onClick={onRondleiding}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-foreground/20 px-2 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Compass className="h-3 w-3" aria-hidden />
          {t("rondleiding.starten")}
        </button>
      )}
    </div>
  );
}
