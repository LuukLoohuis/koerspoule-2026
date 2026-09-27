// De getekende wielertruien van Krant C en Ploeg C. Twee sets: de blanco trui
// van Ploeg C, en de truien die de Hors-cijfers dragen. Hier staat welke trui
// van welk thema als tekening bestaat; het inkleuren van de rest doen
// <Wielertrui> en <CijferTrui>.
import { readableForeground, type Thema, type ThemaKey } from "@/lib/themas";
import truiWit from "@/assets/wielertrui-wit.webp";
import maillotJaune from "@/assets/wielertrui-maillot-jaune.webp";
import horsGeel from "@/assets/hors-trui-geel.webp";
import horsWit from "@/assets/hors-trui-wit.webp";
import horsBolletjesRood from "@/assets/hors-trui-bolletjes-rood.webp";
import horsBolletjesBlauw from "@/assets/hors-trui-bolletjes-blauw.webp";
import horsMasker from "@/assets/hors-trui-masker.webp";

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
 * De trui die een Hors-cijfer draagt: Monkey IQ de leiderstrui (de kleur van
 * de koers), Emirates de witte, de Directeur de bergtrui van het thema.
 */
export type HorsTrui = "leider" | "wit" | "berg";

/** De witte Hors-trui en het masker van zijn stof, voor het inkleuren. */
export const HORS_BLANCO = horsWit;
export const HORS_MASKER = horsMasker;

/**
 * Hors-truien die als tekening bestaan. Staat een trui er niet bij (roze,
 * azzurra, rood), dan kleurt CijferTrui de witte trui in: zelfde omlijning en
 * plooien, andere kleur.
 */
const HORS_GETEKEND: Record<ThemaKey, Partial<Record<HorsTrui, string>>> = {
  roze: {},
  geel: { leider: horsGeel, berg: horsBolletjesRood },
  rood: { berg: horsBolletjesBlauw },
  winter: {},
};

export type TruiOpmaak = {
  /** De getekende trui; zonder tekening kleurt `kleur` de witte trui in. */
  src: string | null;
  kleur: string;
  /** Kleur van de opdruk. */
  inkt: string;
};

/** Inkt op een lichte trui; los van het sitethema, want de trui blijft licht. */
const INKT = `hsl(${readableForeground("#FFFFFF")})`;

export function horsTrui(thema: Thema, soort: HorsTrui): TruiOpmaak {
  if (soort === "wit") return { src: horsWit, kleur: "hsl(var(--maillot-wit))", inkt: INKT };

  const src = HORS_GETEKEND[thema.key][soort] ?? null;
  if (soort === "leider") {
    return {
      src,
      kleur: "hsl(var(--primary))",
      inkt: src ? `hsl(${readableForeground(thema.truien.algemeen.kleur)})` : "hsl(var(--primary-foreground))",
    };
  }
  const berg = thema.truien.berg;
  // Bolletjes zijn wit met bollen: de opdruk staat op het wit.
  const ondergrond = berg.patroon === "bolletjes" ? "#FFFFFF" : berg.kleur;
  return { src, kleur: berg.kleur, inkt: `hsl(${readableForeground(ondergrond)})` };
}
