/**
 * Wedstrijdkalender van het seizoen: één regel per wedstrijdavond, met de
 * afstanden van Vrouwen en Mannen samen. Rechts je punten, of "Volgende".
 * Gebruikt op de Krant (desktop: "Komende wedstrijden") en onder Uitslagen.
 */
import { cn } from "@/lib/utils";
import { mmKorteDatum } from "@/lib/meermarathonSeizoen";
import type { KalenderRij } from "@/lib/meermarathonKalender";

export default function WedstrijdKalender({
  rijen,
  titel = "Kalender",
  ondertitel,
  className,
}: {
  rijen: KalenderRij[];
  titel?: string;
  ondertitel?: string;
  className?: string;
}) {
  return (
    <section className={cn("space-y-2", className)} aria-label={titel}>
      <h3 className="heading-oswald section-rule text-xl md:text-2xl">{titel}</h3>
      {ondertitel && <p className="text-sm text-muted-foreground">{ondertitel}</p>}
      {rijen.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">De kalender volgt zodra de bond de wedstrijden bekendmaakt.</p>
      ) : (
        <ol className="divide-y divide-border">
          {rijen.map((rij) => (
            <li
              key={rij.sleutel}
              aria-current={rij.volgende ? "true" : undefined}
              className={cn("flex items-center gap-3 py-3", rij.volgende && "-mx-2 rounded-lg bg-secondary px-2")}
            >
              <span className="w-14 shrink-0 font-oswald text-[15px] text-muted-foreground">{mmKorteDatum(rij.date)}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold leading-tight">{rij.label}</span>
                {rij.detail && <span className="block text-sm text-muted-foreground">{rij.detail}</span>}
              </span>
              {rij.volgende ? (
                <span className="sticker shrink-0">Volgende</span>
              ) : rij.punten != null ? (
                <span className="shrink-0 text-right leading-tight">
                  <span className="block font-bold tabular-nums">+{rij.punten}</span>
                  <span className="block text-xs text-muted-foreground">jouw pnt</span>
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
