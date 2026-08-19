/**
 * Gesimuleerde cijfers voor Hors Catégorie zolang de koers nog niet rijdt.
 *
 * Waarom niet gewoon leeg laten: vóór de start valt er niets te berekenen, en
 * een leeg paneel leest als een storing. Met voorbeeldcijfers zie je wát je
 * straks krijgt. Ze staan altijd onder een <Voorbeeldmarkering>, zodat niemand
 * ze voor zijn eigen score aanziet.
 *
 * De namen zijn echt — ze komen uit de startlijst van deze koers, die ook vóór
 * de start al bekend is. Alleen de aantallen zijn verzonnen. Dat leest een stuk
 * geloofwaardiger dan verzonnen renners, en het maakt meteen duidelijk welke
 * kolommen straks gevuld worden.
 *
 * Alles is deterministisch (vaste seed): bij elke render dezelfde cijfers, dus
 * geen getallen die tijdens het rondklikken staan te dansen.
 */

export type DemoCategorie = {
  id: string;
  category_riders?: Array<{ rider_id: string; riders?: { id: string; name: string } | null }> | null;
};

export type DemoPickStat = {
  category_id: string;
  rider_id: string;
  pick_count: number;
  total_entries: number;
};

export type DemoJokerStat = { rider_id: string; joker_count: number; total_entries: number };

/** Aantal nepdeelnemers waar de voorbeeldcijfers op gebaseerd zijn. */
export const DEMO_DEELNEMERS = 48;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/**
 * Voorbeeld-pelotonkeuzes: per categorie een geloofwaardige verdeling.
 *
 * Niet uniform verdeeld, want zo kiest een peloton niet. De eerste renners in
 * een categorie zijn doorgaans de favorieten en die worden veel vaker gekozen;
 * daarna zakt het snel weg. Een vlakke verdeling zou de heatmap-achtige
 * kolommen betekenisloos maken.
 */
export function demoPickStats(categories: DemoCategorie[]): DemoPickStat[] {
  const r = rng(20260819);
  const uit: DemoPickStat[] = [];

  for (const cat of categories) {
    const renners = (cat.category_riders ?? []).filter((cr) => cr.riders);
    renners.forEach((cr, i) => {
      // Sterk aflopend: de kopman van de categorie pakt het leeuwendeel.
      const basis = Math.exp(-i / Math.max(2, renners.length / 3));
      const ruis = 0.75 + r() * 0.5;
      const aandeel = Math.min(0.92, basis * ruis);
      const count = Math.round(aandeel * DEMO_DEELNEMERS);
      if (count <= 0) return;
      uit.push({
        category_id: cat.id,
        rider_id: cr.rider_id,
        pick_count: count,
        total_entries: DEMO_DEELNEMERS,
      });
    });
  }
  return uit;
}

/** Voorbeeld-jokers: alleen de bovenste handvol renners krijgt er noemenswaardig. */
export function demoJokerStats(categories: DemoCategorie[]): DemoJokerStat[] {
  const r = rng(20260820);
  const alle = categories.flatMap((c) => (c.category_riders ?? []).filter((cr) => cr.riders));
  return alle.slice(0, 12).map((cr, i) => ({
    rider_id: cr.rider_id,
    joker_count: Math.max(1, Math.round((0.4 - i * 0.03) * DEMO_DEELNEMERS * (0.7 + r() * 0.6))),
    total_entries: DEMO_DEELNEMERS,
  }));
}

export type DemoDeelnemer = { user_id: string; name: string; total: number };

/**
 * Voorbeeld-tegenstanders voor de benchmark.
 *
 * Verzonnen namen, want deelnemersnamen zijn van echte mensen; die mag je niet
 * nabootsen. De punten liggen rond een geloofwaardig midden, met de gebruiker
 * er ergens tussenin zodat de vergelijking iets te zien geeft.
 */
export function demoDeelnemers(eigenNaam: string): DemoDeelnemer[] {
  const r = rng(20260821);
  const namen = [
    "De Vluchters", "Bidonbrigade", "Kasseienkoning", "Team Grupetto",
    "Berggeiten", "Waaierwacht", "Sprintcomité", "Pechvogels",
  ];
  const rij = namen.map((naam, i) => ({
    user_id: `demo-${i}`,
    name: naam,
    total: Math.round(380 + r() * 220),
  }));
  rij.push({ user_id: "demo-ik", name: eigenNaam, total: 486 });
  return rij.sort((a, b) => b.total - a.total);
}
