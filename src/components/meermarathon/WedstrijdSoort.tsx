/**
 * De vier wedstrijdsoorten van de Meermarathon, elk met een kleur en een
 * embleem. Gebruikt in de uitslagenbalk, de kalender en de strook boven een
 * uitslag, zodat een Cup overal dezelfde Cup is.
 *
 * De emblemen zijn lijniconen; een getekende versie kan er later voor in de
 * plaats, zolang de namen hieronder blijven.
 */
import { Medal, Snowflake, Star, Trophy, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WedstrijdType } from "@/lib/gameTypes";
import { wegingUitleg } from "@/lib/wegingsfactor";

export const WEDSTRIJD_SOORT: Record<WedstrijdType, { label: string; ondergrond: string; kleur: string; Icon: LucideIcon }> = {
  cup: { label: "Cup", ondergrond: "kunstijs", kleur: "var(--mm-s-cup)", Icon: Trophy },
  grandprix: { label: "Grand Prix", ondergrond: "natuurijs", kleur: "var(--mm-s-gp)", Icon: Snowflake },
  onk: { label: "ONK", ondergrond: "titel op natuurijs", kleur: "var(--mm-s-onk)", Icon: Star },
  nk: { label: "NK", ondergrond: "titel op kunstijs", kleur: "var(--mm-s-nk)", Icon: Medal },
};

/** Rond embleem: papier met een ring en een icoon in de kleur van de soort. */
export function SoortEmbleem({
  soort,
  maat = 34,
  gedempt = false,
  className,
}: {
  soort: WedstrijdType;
  maat?: number;
  /** Voor een wedstrijd die nog komt. */
  gedempt?: boolean;
  className?: string;
}) {
  const { kleur, Icon } = WEDSTRIJD_SOORT[soort];
  return (
    <span
      aria-hidden
      className={cn("grid shrink-0 place-items-center rounded-full bg-card", className)}
      style={{
        width: maat,
        height: maat,
        color: kleur,
        boxShadow: `inset 0 0 0 2px ${kleur}, 0 0 0 2px hsl(var(--card)), 0 2px 4px rgb(10 20 40 / 0.22)`,
        opacity: gedempt ? 0.55 : 1,
      }}
    >
      <Icon style={{ width: maat * 0.5, height: maat * 0.5 }} strokeWidth={2.2} />
    </span>
  );
}

/** Embleem met de naam ernaast: "Cup", "Grand Prix". */
export function SoortLabel({
  soort,
  aantal,
  metOndergrond = false,
  className,
}: {
  soort: WedstrijdType;
  /** Hoeveel er dit seizoen van zijn; zonder blijft het bij de naam. */
  aantal?: number;
  metOndergrond?: boolean;
  className?: string;
}) {
  const { label, ondergrond } = WEDSTRIJD_SOORT[soort];
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold", className)}>
      <SoortEmbleem soort={soort} maat={20} />
      <span>
        {label}
        {/* "(3)" en niet "×3": een ×-getal is de weging van een wedstrijd (×2 = dubbel). */}
        {aantal != null && aantal > 1 && <span className="font-normal text-muted-foreground"> ({aantal})</span>}
        {metOndergrond && <span className="font-normal text-muted-foreground"> · {ondergrond}</span>}
      </span>
    </span>
  );
}

/**
 * "Telt dubbel" bij een wedstrijd die zwaarder telt (lib/wegingsfactor), in
 * de kleur van zijn soort. Niets bij een gewone wedstrijd. Staat in de
 * uitslagenbalk bij de gekozen wedstrijd en in de kalender.
 */
export function WegingPil({ soort, weging, className }: { soort: WedstrijdType; weging: number; className?: string }) {
  const tekst = wegingUitleg(weging);
  if (!tekst) return null;
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded-full border-[1.5px] px-2 text-[11px] font-bold uppercase leading-[18px] tracking-[0.08em]",
        className,
      )}
      style={{ borderColor: WEDSTRIJD_SOORT[soort].kleur }}
    >
      {tekst}
    </span>
  );
}
