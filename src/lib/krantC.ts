/**
 * Hulpfuncties voor Krant C, de mobiele Koerskrant. Los van de componenten
 * zodat de keuzes (wie staat in het podium, welke rit is "morgen") te
 * toetsen zijn zonder een feed op te tuigen.
 */

/** "La Gazzetta" voor de Giro; de andere koersen heten al voluit. */
export function krantNaam(thema: { krant: string; krantVoluit?: string }): string {
  return thema.krantVoluit?.trim() || thema.krant;
}

/** Monogram voor het rondje bij een citaat: "MW", "JDC". */
export function monogram(naam: string): string {
  return naam
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((d) => d[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);
}

/**
 * De eerste drie van een stand, met jouw regel erachter als je daar niet
 * bij staat. Een daguitslag zonder jezelf erin zegt je niets.
 */
export function podiumMetMij<T extends { isMij: boolean }>(stand: readonly T[], aantal = 3): T[] {
  const top = stand.slice(0, aantal);
  if (top.some((r) => r.isMij)) return top;
  const mij = stand.find((r) => r.isMij);
  return mij ? [...top, mij] : top;
}

/**
 * De rit van morgen: de laagste die nog niet gefiatteerd is, GC-rit
 * uitgezonderd. Alles gefiatteerd → niets meer te voorbeschouwen.
 */
export function volgendeRit<T extends { stage_number: number; is_gc: boolean; results_status: string | null }>(
  stages: readonly T[],
): T | null {
  return (
    [...stages]
      .filter((s) => !s.is_gc)
      .sort((a, b) => a.stage_number - b.stage_number)
      .find((s) => String(s.results_status) !== "approved") ?? null
  );
}

/** Hoogtemeters als "4.250 m"; null als het profiel ze niet kent. */
export function hoogtemeters(profile: { climbMeters?: number } | null | undefined, locale: string): string | null {
  const m = profile?.climbMeters;
  if (typeof m !== "number" || !Number.isFinite(m) || m <= 0) return null;
  return `${Math.round(m).toLocaleString(locale)} m`;
}

function ymdLokaal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "Vandaag", "Morgen" of de datum in woorden; null zonder datum. */
export function wanneer(
  datum: string | null | undefined,
  nu: Date,
  locale: string,
  woorden: { vandaag: string; morgen: string },
): string | null {
  if (!datum) return null;
  if (datum === ymdLokaal(nu)) return woorden.vandaag;
  if (datum === ymdLokaal(new Date(nu.getTime() + 86_400_000))) return woorden.morgen;
  try {
    return new Date(`${datum}T00:00:00`).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
  } catch {
    return datum;
  }
}

/** Verschil met de vorige rit als pijl: "▲ 2", "▼ 3", of null bij gelijk. */
export function stijging(delta: number | null | undefined): { teken: "▲" | "▼"; aantal: number } | null {
  if (!delta) return null;
  return { teken: delta > 0 ? "▲" : "▼", aantal: Math.abs(delta) };
}
