// De getekende wielertruien van Krant C en Ploeg C: één snit, per kleur een
// tekening. Hier staat welke klassementstrui van welk thema als tekening
// bestaat; het inkleuren van de rest doet <Wielertrui>.
import type { ThemaKey, TruiType } from "@/lib/themas";
import truiWit from "@/assets/wielertrui-wit.webp";
import truiGeel from "@/assets/wielertrui-geel.webp";
import truiGroen from "@/assets/wielertrui-groen.webp";
import truiBolletjesRood from "@/assets/wielertrui-bolletjes-rood.webp";
import truiBolletjesBlauw from "@/assets/wielertrui-bolletjes-blauw.webp";

/** De blanco trui: de witte tekening, ook de terugval voor een ploeg zonder trui. */
export const BLANCO_TRUI = truiWit;

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
