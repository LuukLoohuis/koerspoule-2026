// Geslacht uit de categorie die livemarathon.schaatsen.nl per baan meegeeft.
//
// De bron hergebruikt een trackId per plaats: op 17-10-2026 droeg "Amsterdam"
// eerst Topdivisie Vrouwen en daarna Topdivisie Mannen. Met het geslacht uit
// de categorie kan de sync zien welke game bij de race op de baan hoort, en
// de Live-tab de race van de andere categorie verbergen.
//
// Uitkomst komt overeen met games.categorie ('vrouwen' | 'mannen'). Geen
// herkenbaar geslacht (masters, startgroepen, gemengd) → null: dan kunnen we
// niets uitsluiten en gedragen we ons zoals vóór deze controle.

const VROUWEN = new Set(["vrouwen", "vrouw", "dames"]);
const MANNEN = new Set(["mannen", "man", "heren"]);

export function geslachtVanCategorie(categorie: string | null | undefined): "vrouwen" | "mannen" | null {
  if (!categorie) return null;
  const woorden = categorie.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  const vrouwen = woorden.some((w) => VROUWEN.has(w));
  const mannen = woorden.some((w) => MANNEN.has(w));
  if (vrouwen === mannen) return null;
  return vrouwen ? "vrouwen" : "mannen";
}
