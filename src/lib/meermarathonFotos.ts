/**
 * De schaatsfoto's van de Meermarathon: achter de uitslagenbalk en achter de
 * kop van een pagina. Alleen bij de Meermarathon; de wielerkoersen houden hun
 * papier.
 *
 * Avond en kunstijs achter de balken (donker van zichzelf, dus de tekst blijft
 * leesbaar), daglicht en natuurijs achter de koppen.
 *
 * De foto's zijn van Timsimaging, die ze beschikbaar stelde. Bij elke foto
 * hoort daarom de naamsvermelding (FotoCredit).
 */
import type { MeermarathonCategorie } from "@/lib/gameTypes";
import balkMannen from "@/assets/meermarathon-balk-mannen.webp";
import balkVrouwen from "@/assets/meermarathon-balk-vrouwen.webp";
import kopBergen from "@/assets/meermarathon-kop-bergen.webp";
import kopStad from "@/assets/meermarathon-kop-stad.webp";

export type Fotograaf = { naam: string; url: string };

export const TIMSIMAGING: Fotograaf = { naam: "Timsimaging", url: "https://www.timsimaging.nl/" };

export type BalkFoto = {
  src: string;
  /** Welk deel van de foto in beeld blijft (object-position), bv. "50% 62%". */
  positie?: string;
  /** Eigen dimlaag (CSS-background); zonder de standaard. */
  dim?: string;
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
 * De pelotons rijden dichter op de camera dan op een overzichtsfoto; de
 * dimlaag is daarom in het midden iets dichter, zodat de balken de baas
 * blijven.
 */
const DIM_PELOTON =
  "linear-gradient(180deg, rgb(9 17 31 / 0.88) 0%, rgb(9 17 31 / 0.7) 42%, rgb(9 17 31 / 0.8) 72%, rgb(9 17 31 / 0.92) 100%)";

/** Achter de uitslagenbalk: het peloton dat je bekijkt. */
export const BALK_FOTO: Record<MeermarathonCategorie, BalkFoto> = {
  vrouwen: { src: balkVrouwen, positie: "50% 63%", dim: DIM_PELOTON, fotograaf: TIMSIMAGING },
  mannen: { src: balkMannen, positie: "50% 66%", dim: DIM_PELOTON, fotograaf: TIMSIMAGING },
};

/** Achter de kop van een pagina. */
export const KOP_FOTO = {
  /** Uitslagen: het peloton op natuurijs, voor de bergen. */
  uitslagen: { src: kopBergen, positie: "50% 87%", fotograaf: TIMSIMAGING },
  /** Mijn Peloton: het peloton voor de stad, in de mist. */
  peloton: { src: kopStad, positie: "50% 100%", licht: true, fotograaf: TIMSIMAGING },
} satisfies Record<string, KopFoto>;
