/**
 * Team Sheet — shared design tokens.
 *
 * Eén bron voor de retro-stijl van Mijn Renners. Wordt hergebruikt door
 * <Cyclist>, <RiderTile>, <CategoryPanel> en <TeamSheet>. De papier-/inkt-
 * basis komt uit src/index.css (.vintage-paper, --ink-sepia, --ink-faded,
 * --paper-light, --vintage-red).
 *
 * Categorie-detectie gebeurt op naam (NL/EN/FR) zodat hetzelfde token-systeem
 * ook werkt voor andere games dan TdF.
 */

export type RiderCategory =
  | "ALIEN"
  | "GC"
  | "SPRINT"
  | "KLIM"
  | "TIJDRIT"
  | "AANVAL"
  | "PUNCH"
  | "KLASSIEK"
  | "TALENT"
  | "OUD"
  | "JOKER"
  | "OVERIG";

export type RiderStatus = "active" | "DNF" | "SUP";

export type CategoryTone = {
  /** Effen truikleur in het silhouet. */
  jersey: string;
  /** Donkere broek (contrast). */
  shorts: string;
  /** Sepia/donkere variant — voor caps/labels. */
  ink: string;
  /** Lichte tint voor labels-vlakken (optioneel). */
  tint: string;
  /** Korte label (caps). */
  label: string;
};

const TONES: Record<RiderCategory, CategoryTone> = {
  ALIEN:    { jersey: "#7A3FA0", shorts: "#2A1A2A", ink: "#5B2D78", tint: "#F2EAF8", label: "ALIEN" },
  GC:       { jersey: "#C0395B", shorts: "#3A1A26", ink: "#892641", tint: "#FCEDF1", label: "GC" },
  SPRINT:   { jersey: "#2E5E8C", shorts: "#1A2A3A", ink: "#1F4368", tint: "#ECF1F8", label: "SPRINT" },
  KLIM:     { jersey: "#2E6A4F", shorts: "#1A2E26", ink: "#1F4D38", tint: "#EBF3EE", label: "KLIM" },
  TIJDRIT:  { jersey: "#1A1A1A", shorts: "#0A0A0A", ink: "#1A1A1A", tint: "#ECE9E2", label: "TIJDRIT" },
  AANVAL:   { jersey: "#C2691C", shorts: "#3A1E10", ink: "#8C4810", tint: "#FAEFE4", label: "AANVAL" },
  PUNCH:    { jersey: "#D0792A", shorts: "#3A2010", ink: "#9C551A", tint: "#FCEFE0", label: "PUNCH" },
  KLASSIEK: { jersey: "#8A6A2A", shorts: "#3A2A10", ink: "#6A4F18", tint: "#F5EDDA", label: "KLASSIEK" },
  TALENT:   { jersey: "#EAE0CC", shorts: "#3A2A1A", ink: "#7A6650", tint: "#F8F3E5", label: "TALENT" },
  OUD:      { jersey: "#8A6A2A", shorts: "#3A2A10", ink: "#6A4F18", tint: "#F5EDDA", label: "OUD" },
  JOKER:    { jersey: "#7B3FA0", shorts: "#2A1A2A", ink: "#5B2D78", tint: "#F2EAF8", label: "JOKER" },
  OVERIG:   { jersey: "#5A4A38", shorts: "#2A2218", ink: "#3A2A1A", tint: "#F4ECD8", label: "OVERIG" },
};

/** Categorie-icoon (klein, gespatieerd). Strings i.p.v. JSX zodat het token-bestand
 *  framework-onafhankelijk blijft. */
const ICONS: Record<RiderCategory, string> = {
  ALIEN:    "👽",
  GC:       "⭐",
  SPRINT:   "⚡",
  KLIM:     "🏔️",
  TIJDRIT:  "🏁",
  AANVAL:   "🎯",
  PUNCH:    "💥",
  KLASSIEK: "🪨",
  TALENT:   "🌱",
  OUD:      "👴",
  JOKER:    "🃏",
  OVERIG:   "🚴",
};

/** Volgorde in het peloton: kopman -> staart. */
const RANK: Record<RiderCategory, number> = {
  ALIEN: 0,
  GC: 1,
  SPRINT: 2,
  KLIM: 3,
  AANVAL: 4,
  PUNCH: 5,
  KLASSIEK: 6,
  TIJDRIT: 7,
  TALENT: 8,
  OUD: 9,
  JOKER: 10,
  OVERIG: 11,
};

/** Heuristiek om een vrij-tekst categorienaam (NL/EN/FR/IT) naar een vaste
 *  RiderCategory te mappen. Detectie houdt rekening met "GC Alien" e.d. */
export function detectCategory(name: string | null | undefined): RiderCategory {
  const n = (name ?? "").toLowerCase();
  if (/(gc\s*alien|^alien|\balien\b)/.test(n)) return "ALIEN";
  if (/joker/.test(n)) return "JOKER";
  if (/(kop|leider|leader|gc|algemeen|klassement|general\s+classification|maglia\s+rosa|maillot\s+jaune)/.test(n)) return "GC";
  if (/(sprint|spurt|fastman|sprinter)/.test(n)) return "SPRINT";
  if (/(klim|berg|grimpeur|mountain|climber|escalador)/.test(n)) return "KLIM";
  if (/(aanval|attack|baroud)/.test(n)) return "AANVAL";
  if (/\bpunch\b/.test(n)) return "PUNCH";
  if (/(klassiek|classic|cobble|kassei|cobblestone)/.test(n)) return "KLASSIEK";
  if (/(tijd|chrono|time\s*trial|\btt\b|cronoman)/.test(n)) return "TIJDRIT";
  if (/(talent|baby\s*giro|baby|young|youngster|jongere|jeune)/.test(n)) return "TALENT";
  if (/(\boud\b|veteraan|oldie|veteran|old|guard)/.test(n)) return "OUD";
  // Landen worden buiten dit systeem gerenderd (vlag-icoon), val hier op OUD-bruintinten.
  if (/(\bnl\b|nederland|dutch|belg|belgi|france|italia|espana|spain)/.test(n)) return "OVERIG";
  return "OVERIG";
}

export function categoryTone(c: RiderCategory): CategoryTone {
  return TONES[c];
}
export function categoryIcon(c: RiderCategory): string {
  return ICONS[c];
}
export function categoryRank(c: RiderCategory): number {
  return RANK[c];
}

/** Stabiel sorteren in peloton-orde. */
export function sortByPelotonOrder<T extends { category: RiderCategory }>(items: T[]): T[] {
  return [...items].sort((a, b) => categoryRank(a.category) - categoryRank(b.category));
}

/** Genormaliseerde renner-shape voor TeamSheet. */
export type SheetRider = {
  id: string;
  name: string;
  startNumber: number | null;
  category: RiderCategory;
  status: RiderStatus;
  team?: string | null;
};

/** Alle categorieën die in een lijst voorkomen, in peloton-orde. */
export function uniqueCategoriesInOrder(riders: SheetRider[]): RiderCategory[] {
  const seen = new Set<RiderCategory>();
  const out: RiderCategory[] = [];
  for (const r of [...riders].sort((a, b) => categoryRank(a.category) - categoryRank(b.category))) {
    if (seen.has(r.category)) continue;
    seen.add(r.category);
    out.push(r.category);
  }
  return out;
}
