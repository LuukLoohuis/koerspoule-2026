/**
 * De schaatsfoto's van de Meermarathon: achter de uitslagenbalk en achter de
 * kop van een pagina. Alleen bij de Meermarathon; de wielerkoersen houden hun
 * papier.
 *
 * Achter de balken het peloton in de mist: licht van zichzelf, met een witte
 * waas en de inkt van het thema (de avondfoto's vond de user te donker).
 * Achter de koppen daglicht en natuurijs.
 *
 * De foto's zijn van Timsimaging, die ze beschikbaar stelde. Bij elke foto
 * hoort daarom de naamsvermelding (FotoCredit).
 */
import balkMist from "@/assets/meermarathon-balk-mist.webp";
import kopBergen from "@/assets/meermarathon-kop-bergen.webp";
import kopStad from "@/assets/meermarathon-kop-stad.webp";

export type Fotograaf = { naam: string; url: string };

export const TIMSIMAGING: Fotograaf = { naam: "Timsimaging", url: "https://www.timsimaging.nl/" };

export type BalkFoto = {
  src: string;
  /** Welk deel van de foto in beeld blijft (object-position), bv. "50% 62%". */
  positie?: string;
  /**
   * Een lichte foto (mist, sneeuw): witte waas, de inhoud houdt de kleuren van
   * het thema. Zonder: een donkere dimlaag en de nachtkleuren.
   */
  licht?: boolean;
  /** Wie de foto maakte; staat als naamsvermelding op de foto. */
  fotograaf?: Fotograaf;
};

export type KopFoto = {
  src: string;
  /** Welk deel van de foto in beeld blijft (object-position), bv. "50% 60%". */
  positie?: string;
  /** Wie de foto maakte; staat als naamsvermelding op de foto. */
  fotograaf?: Fotograaf;
  /**
   * Een lichte foto (mist, sneeuw) met een witte waas en donkere tekst. In de
   * nacht krijgt ook die de donkere waas: daar is de tekst licht.
   */
  licht?: boolean;
};

/**
 * Achter de uitslagenbalk: het peloton voor de stad, in de mist. Alleen de
 * onderste strook van de foto, zodat de schaatsers achter de balken rijden en
 * de sneeuw achter de nummers en punten ligt.
 */
export const BALK_FOTO: BalkFoto = { src: balkMist, positie: "50% 75%", licht: true, fotograaf: TIMSIMAGING };

/** Achter de kop van een pagina. */
export const KOP_FOTO = {
  /** Uitslagen: het peloton op natuurijs, voor de bergen. */
  uitslagen: { src: kopBergen, positie: "50% 87%", fotograaf: TIMSIMAGING },
  /** Mijn Peloton: het peloton voor de stad, in de mist. */
  peloton: { src: kopStad, positie: "50% 100%", licht: true, fotograaf: TIMSIMAGING },
} satisfies Record<string, KopFoto>;
