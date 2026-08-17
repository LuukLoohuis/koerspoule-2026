export const MEERMARATHON_GAME_TYPE = "meermarathon" as const;

export function isMeermarathonGame(gameType: string | null | undefined): boolean {
  return String(gameType ?? "").toLowerCase() === MEERMARATHON_GAME_TYPE;
}

export function meermarathonSeason(startYear: number): string {
  return `${startYear}-${startYear + 1}`;
}

export function parseGameYearInput(gameType: string | null | undefined, value: string): number | null {
  const input = value.trim();

  if (isMeermarathonGame(gameType)) {
    const match = input.match(/^(\d{4})\s*[-–—]\s*(\d{4})$/);
    if (!match) return null;
    const startYear = Number(match[1]);
    const endYear = Number(match[2]);
    return startYear >= 1900 && startYear <= 2099 && endYear === startYear + 1
      ? startYear
      : null;
  }

  if (!/^\d{4}$/.test(input)) return null;
  const year = Number(input);
  return year >= 1900 && year <= 2100 ? year : null;
}

export function gameYearFieldValue(gameType: string | null | undefined, startYear: number): string {
  return isMeermarathonGame(gameType) ? meermarathonSeason(startYear) : String(startYear);
}

export function gameTypeName(gameType: string | null | undefined): string | null {
  switch (String(gameType ?? "").toLowerCase()) {
    case "giro":
      return "Giro d'Italia";
    case "tour":
    case "tdf":
      return "Tour de France";
    case "femmes":
      return "Tour de France Femmes";
    case "vuelta":
    case "vta":
      return "Vuelta a España";
    case MEERMARATHON_GAME_TYPE:
      return "Meermarathon";
    default:
      return null;
  }
}

export function gameSeasonName(gameType: string | null | undefined, year: number): string {
  const name = gameTypeName(gameType);
  if (!name) return String(year);
  return isMeermarathonGame(gameType)
    ? `${name} ${meermarathonSeason(year)}`
    : `${name} ${year}`;
}

// ── Meermarathon: wedstrijdsoorten ────────────────────────────────────────
// Meermarathon rijdt geen etappes maar losse wedstrijden. Cups op kunstijs en
// Grand Prix' op natuurijs lopen door in nummering; ONK en NK staan los en
// krijgen daarom géén nummer achter hun naam.

export const WEDSTRIJD_TYPES = [
  { value: "cup", label: "Cup", genummerd: true },
  { value: "grandprix", label: "Grand Prix", genummerd: true },
  { value: "onk", label: "ONK", genummerd: false },
  { value: "nk", label: "NK", genummerd: false },
] as const;

export type WedstrijdType = typeof WEDSTRIJD_TYPES[number]["value"];

/** Standaardsoort bij een ondergrond: kunstijs rijdt cups, natuurijs Grand Prix'. */
export function defaultWedstrijdType(ijsType: string | null | undefined): WedstrijdType {
  return ijsType === "natuurijs" ? "grandprix" : "cup";
}

/**
 * Hoe een Meermarathon-wedstrijd heet.
 *
 * Een eigen naam wint altijd; anders "Cup 3" / "Grand Prix 5", en voor een
 * titelwedstrijd alleen "ONK" of "NK" — die zijn eenmalig, dus een nummer
 * erachter zou verwarrend zijn.
 */
export function meermarathonStageLabel(stage: {
  name?: string | null;
  stage_number: number;
  wedstrijd_type?: string | null;
  ijs_type?: string | null;
}): string {
  if (stage.name?.trim()) return stage.name.trim();
  const type = (stage.wedstrijd_type as WedstrijdType | null) ?? defaultWedstrijdType(stage.ijs_type);
  const def = WEDSTRIJD_TYPES.find((w) => w.value === type) ?? WEDSTRIJD_TYPES[0];
  return def.genummerd ? `${def.label} ${stage.stage_number}` : def.label;
}

/** De maat van een wedstrijd: ronden op kunstijs, kilometers op natuurijs. */
export function meermarathonAfstandLabel(stage: {
  ijs_type?: string | null;
  aantal_rondes?: number | null;
  distance_km?: number | null;
}): string | null {
  if (stage.ijs_type === "natuurijs") {
    return stage.distance_km != null ? `${stage.distance_km} km` : null;
  }
  return stage.aantal_rondes != null
    ? `${stage.aantal_rondes} ronde${stage.aantal_rondes === 1 ? "" : "n"}`
    : null;
}
