// De getekende wielertruien van Krant C en Ploeg C: één snit, per kleur een
// tekening. Hier staat welke klassementstrui van welk thema als tekening
// bestaat; het inkleuren van de rest doet <Wielertrui>.
import { readableForeground, type Thema, type ThemaKey, type TruiType } from "@/lib/themas";
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
 * kleurt Wielertrui de blanco trui in met `primary`.
 */
const PLOEGKAART: Partial<Record<ThemaKey, string>> = {
  geel: maillotJaune,
};

export function ploegkaartTrui(thema: ThemaKey): string | null {
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

/**
 * De trui die een Hors-cijfer draagt: Monkey IQ de leiderstrui (de kleur van
 * de koers), Emirates de witte, de Directeur de bergtrui van het thema.
 */
export type HorsTrui = "leider" | "wit" | "berg";

export type TruiOpmaak = {
  /** De getekende trui; zonder tekening kleurt `kleur` de blanco trui. */
  src: string | null;
  kleur: string;
  bolletjes: string | null;
  /** Kleur van het cijfer op de borst. */
  tekst: string;
  /** Witte gloed om het cijfer: houdt het los van de bolletjes. */
  gloed: boolean;
};

/** Inkt op een witte trui; los van het sitethema, want de trui blijft wit. */
const INKT_OP_WIT = `hsl(${readableForeground("#FFFFFF")})`;

export function horsTrui(thema: Thema, soort: HorsTrui): TruiOpmaak {
  if (soort === "wit") {
    return { src: BLANCO_TRUI, kleur: "hsl(var(--maillot-wit))", bolletjes: null, tekst: INKT_OP_WIT, gloed: false };
  }
  if (soort === "leider") {
    const src = getekendeTrui(thema.key, "algemeen");
    return {
      src,
      kleur: "hsl(var(--primary))",
      bolletjes: null,
      tekst: src ? `hsl(${readableForeground(thema.truien.algemeen.kleur)})` : "hsl(var(--primary-foreground))",
      gloed: false,
    };
  }
  const berg = thema.truien.berg;
  const bolletjes = berg.patroon === "bolletjes" ? berg.bolletjeKleur ?? null : null;
  return {
    src: getekendeTrui(thema.key, "berg"),
    kleur: berg.kleur,
    bolletjes,
    tekst: bolletjes ? INKT_OP_WIT : `hsl(${readableForeground(berg.kleur)})`,
    gloed: Boolean(bolletjes),
  };
}
