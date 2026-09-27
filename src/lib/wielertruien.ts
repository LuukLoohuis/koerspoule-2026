// De getekende wielertruien van Krant C en Ploeg C: één snit, per kleur een
// tekening. Hier staat welke klassementstrui van welk thema als tekening
// bestaat; het inkleuren van de rest doet <Wielertrui>.
import type { ThemaKey, TruiType } from "@/lib/themas";
import truiWit from "@/assets/wielertrui-wit.webp";
import truiGeel from "@/assets/wielertrui-geel.webp";
import truiGroen from "@/assets/wielertrui-groen.webp";
import truiBolletjesRood from "@/assets/wielertrui-bolletjes-rood.webp";
import truiBolletjesBlauw from "@/assets/wielertrui-bolletjes-blauw.webp";
import maillotJaune from "@/assets/wielertrui-maillot-jaune.webp";

/** De blanco trui: de witte tekening, ook de terugval voor een ploeg zonder trui. */
export const BLANCO_TRUI = truiWit;

/**
 * De trui op de ploegkaart van Ploeg C: de leiderstrui zoals hij in het echt
 * is, met opdruk en al. Alleen de Tour heeft er een; bij de andere thema's
 * kleurt Wielertrui de blanco trui in met `primary`. `borst` is de plek van
 * het aantal renners, als aandeel van de hoogte: onder de opdruk.
 */
const PLOEGKAART: Partial<Record<ThemaKey, { src: string; borst: number }>> = {
  geel: { src: maillotJaune, borst: 0.56 },
};

export function ploegkaartTrui(thema: ThemaKey): { src: string; borst: number } | null {
  return PLOEGKAART[thema] ?? null;
}

/**
 * Wit is overal wit. Staat een trui er niet bij (roze, azzurra, rood), dan
 * kleurt Wielertrui de blanco trui in: zelfde omlijning en plooien, andere
 * kleur.
 */
const GETEKEND: Record<ThemaKey, Partial<Record<TruiType, string>>> = {
  roze: { jongeren: truiWit },
  geel: { algemeen: truiGeel, punten: truiGroen, berg: truiBolletjesRood, jongeren: truiWit },
  rood: { punten: truiGroen, berg: truiBolletjesBlauw, jongeren: truiWit },
  winter: { jongeren: truiWit },
};

export function getekendeTrui(thema: ThemaKey, type: TruiType): string | null {
  return GETEKEND[thema][type] ?? null;
}
