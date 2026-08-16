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
