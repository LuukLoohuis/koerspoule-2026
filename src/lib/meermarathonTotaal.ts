import type { MeermarathonCategorie } from "@/lib/gameTypes";
import { rangtekst } from "@/lib/meermarathonSeizoen";

/**
 * Totaalklassement van de Meermarathon: per speler de punten bij de vrouwen
 * en bij de mannen opgeteld. Wie in één peloton meedoet, telt met dat ene
 * peloton mee. Hier staat de logica zonder React of database, zodat de
 * pelotonbalk en het klassement hetzelfde zeggen.
 */

export type TotaalBronRij = {
  user_id: string;
  display_name: string | null;
  team_name: string | null;
  punten: number;
};

/** De stand van één peloton, zoals het klassement van dat peloton hem toont. */
export type TotaalBron = { categorie: MeermarathonCategorie; rijen: TotaalBronRij[] };

export type PelotonDeel = { punten: number; rank: number };

export type TotaalRij = {
  user_id: string;
  /** De speler, niet een van zijn ploegen: die kunnen per peloton anders heten. */
  naam: string | null;
  vrouwen: PelotonDeel | null;
  mannen: PelotonDeel | null;
  totaal: number;
  rank: number;
};

const NAAM = new Intl.Collator("nl-NL", { sensitivity: "base" });

/** Rang op punten, aflopend; gelijke punten delen de plek (1, 2, 2, 4). */
function rangen(punten: number[]): number[] {
  const volgorde = punten.map((p, i) => ({ p, i })).sort((a, b) => b.p - a.p);
  const uit = new Array<number>(punten.length);
  let vorige: number | null = null;
  let rang = 0;
  volgorde.forEach(({ p, i }, plek) => {
    if (vorige === null || p < vorige) {
      rang = plek + 1;
      vorige = p;
    }
    uit[i] = rang;
  });
  return uit;
}

export function bouwTotaalklassement(bronnen: TotaalBron[]): TotaalRij[] {
  const perSpeler = new Map<string, TotaalRij>();
  for (const bron of bronnen) {
    const plek = rangen(bron.rijen.map((r) => r.punten));
    bron.rijen.forEach((r, i) => {
      const rij = perSpeler.get(r.user_id) ?? {
        user_id: r.user_id,
        naam: null,
        vrouwen: null,
        mannen: null,
        totaal: 0,
        rank: 0,
      };
      rij.naam ??= r.display_name?.trim() || r.team_name?.trim() || null;
      rij[bron.categorie] = { punten: r.punten, rank: plek[i] };
      rij.totaal += r.punten;
      perSpeler.set(r.user_id, rij);
    });
  }

  const rijen = [...perSpeler.values()];
  const plek = rangen(rijen.map((r) => r.totaal));
  rijen.forEach((r, i) => (r.rank = plek[i]));
  return rijen.sort((a, b) => a.rank - b.rank || NAAM.compare(a.naam ?? "", b.naam ?? ""));
}

const AANTAL = new Intl.NumberFormat("nl-NL");

/** "8e van 2.001" voor wie in het totaal staat; anders null. */
export function totaalRegel(rijen: TotaalRij[], userId: string | null | undefined): string | null {
  const mij = userId ? rijen.find((r) => r.user_id === userId) : undefined;
  return mij ? `${rangtekst(mij.rank)} van ${AANTAL.format(rijen.length)}` : null;
}
