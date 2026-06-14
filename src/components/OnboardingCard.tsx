/**
 * <OnboardingCard> — korte 3-stappen-start voor nieuwe gebruikers bovenaan
 * Mijn Peloton. Vinkt mee op voortgang (heeft ploeg? zit in subpoule?),
 * verdwijnt automatisch zodra ploeg + subpoule rond zijn, en is wegklikbaar
 * (localStorage, try/catch). Retro-stijl.
 */
import { useState } from "react";
import { Check, X, Users, Share2, LineChart } from "lucide-react";
import { cn } from "@/lib/utils";

const KEY = "kp_onboarding_dismissed";

type Step = { label: string; hint: string; done: boolean; cta: string; Icon: typeof Users; onClick: () => void };

export default function OnboardingCard({
  hasTeam,
  inSubpoule,
  liveTracking,
  onTeam,
  onSubpoule,
  onResults,
}: {
  hasTeam: boolean;
  inSubpoule: boolean;
  liveTracking: boolean;
  onTeam: () => void;
  onSubpoule: () => void;
  onResults: () => void;
}) {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
  });

  // Klaar zodra ploeg + subpoule rond zijn → kaart weg.
  if (dismissed || (hasTeam && inSubpoule)) return null;

  const close = () => {
    setDismissed(true);
    try { localStorage.setItem(KEY, "1"); } catch { /* negeer */ }
  };

  const steps: Step[] = [
    { label: "Stel je ploeg samen", hint: "Kies je renners per categorie.", done: hasTeam, cta: "Naar de ploeg", Icon: Users, onClick: onTeam },
    { label: "Daag je vrienden uit", hint: "Start een eigen subpoule.", done: inSubpoule, cta: "Maak een subpoule", Icon: Share2, onClick: onSubpoule },
    { label: "Volg je punten live", hint: "Vanaf de eerste etappe.", done: liveTracking, cta: "Bekijk uitslagen", Icon: LineChart, onClick: onResults },
  ];

  return (
    <div className="retro-border bg-[hsl(var(--vintage-gold)/0.12)] p-4 mb-4 relative">
      <button
        type="button"
        onClick={close}
        aria-label="Onboarding sluiten"
        className="absolute top-2 right-2 p-1 text-muted-foreground/70 hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <p className="overline-stamp mb-0.5">— Welkom in het peloton —</p>
      <h2 className="font-display font-black text-lg md:text-xl mb-3">Zo ben je in 3 stappen weg</h2>
      <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {steps.map((s, i) => (
          <li
            key={s.label}
            className={cn(
              "rounded-lg border-2 p-3 flex flex-col gap-2 bg-card",
              s.done ? "border-primary/60" : "border-foreground/15",
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center text-xs font-display font-black shrink-0",
                  s.done ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
                )}
              >
                {s.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className="font-display font-bold text-sm leading-tight">{s.label}</span>
            </div>
            <p className="text-xs text-muted-foreground font-serif">{s.hint}</p>
            {!s.done && (
              <button
                type="button"
                onClick={s.onClick}
                className="mt-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-bold border-2 border-foreground shadow-[2px_2px_0_hsl(var(--foreground))] active:translate-y-px transition-all"
              >
                <s.Icon className="h-3.5 w-3.5" />
                {s.cta}
              </button>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
