/** "Sanne de Wit" → "SW"; één woord → de eerste twee letters; leeg → "?". */
export function initialen(naam: string): string {
  const woorden = naam.trim().split(/\s+/).filter(Boolean);
  if (woorden.length === 0) return "?";
  if (woorden.length === 1) return woorden[0].slice(0, 2).toUpperCase();
  return (woorden[0][0] + woorden[woorden.length - 1][0]).toUpperCase();
}
