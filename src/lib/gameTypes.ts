export const MEERMARATHON_GAME_TYPE = "meermarathon" as const;

export function isMeermarathonGame(gameType: string | null | undefined): boolean {
  return String(gameType ?? "").toLowerCase() === MEERMARATHON_GAME_TYPE;
}

export function meermarathonSeason(startYear: number): string {
  const shortYear = (year: number) => String(year % 100).padStart(2, "0");
  return `${shortYear(startYear)}/${shortYear(startYear + 1)}`;
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
