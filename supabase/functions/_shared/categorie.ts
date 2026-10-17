// Geslacht uit de categorie die livemarathon.schaatsen.nl per baan meegeeft.
//
// De bron hergebruikt een trackId per plaats: op 17-10-2026 droeg "Amsterdam"
// eerst Topdivisie Vrouwen, daarna Topdivisie Mannen en daarna Beloften
// Divisie Mannen. Met het geslacht uit de categorie kan de sync zien welke
// game bij de race op de baan hoort, en de Live-tab de race van een andere
// categorie verbergen.
//
// Uitkomst komt overeen met games.categorie ('vrouwen' | 'mannen'). Een andere
// divisie dan de top (beloften, junioren, masters, …) geeft 'anders': die race
// hoort bij geen enkele game. Geen herkenbaar geslacht (startgroepen, gemengd)
// → null: dan kunnen we niets uitsluiten en gedragen we ons zoals vóór deze
// controle.

const VROUWEN = new Set(["vrouwen", "vrouw", "dames"]);
const MANNEN = new Set(["mannen", "man", "heren"]);
const ANDERE_DIVISIE = new Set([
  "beloften", "junioren", "jeugd", "masters", "veteranen", "recreanten", "recreatief", "divisie",
]);

export function geslachtVanCategorie(
  categorie: string | null | undefined,
): "vrouwen" | "mannen" | "anders" | null {
  if (!categorie) return null;
  const woorden = categorie.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  const vrouwen = woorden.some((w) => VROUWEN.has(w));
  const mannen = woorden.some((w) => MANNEN.has(w));
  if (vrouwen === mannen) return null;
  // "Top Divisie" is de top; "divisie" zonder "top" ervoor niet.
  const top = woorden.includes("topdivisie") || woorden.includes("top");
  if (woorden.some((w) => ANDERE_DIVISIE.has(w) && !(w === "divisie" && top))) return "anders";
  return vrouwen ? "vrouwen" : "mannen";
}
