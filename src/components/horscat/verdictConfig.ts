/**
 * Verdict-bands voor de "Aap met de dartpijl"-percentiel.
 * Eén plek om de tekst & emoji per band aan te passen.
 *
 * Percentile = aantal monkey-runs strikt < user-score, gedeeld door totaal × 100.
 */

export type VerdictBand = {
  /** Inclusief minimum percentile (≥). */
  min: number;
  label: string;
  hint: string;
  emoji: string;
  /** Kleur-token of CSS-kleur voor de headline. */
  color: string;
};

export const VERDICT_BANDS: VerdictBand[] = [
  { min: 85, label: "Kopman van het peloton — de aap lost in de eerste klim.", hint: "Pure koerskennis: jij stuurt, de dartpijl ziet enkel je achterwiel.", emoji: "🏆", color: "#2E6A4F" },
  { min: 60, label: "Mee in de kopgroep, vóór de apen.",                       hint: "Boven het toeval — geen meeval, gewoon ploegleidersinzicht.",       emoji: "💪", color: "#2E6A4F" },
  { min: 40, label: "Schouder aan schouder met de aap in het peloton.",        hint: "5.000 willekeurige ploegen, en jij rijdt er middenin. Skill ≈ geluk deze ronde.", emoji: "🐒", color: "#C2691C" },
  { min: 0,  label: "De aap met de dartpijl rijdt jou uit het wiel.",          hint: "Een blind geprikte ploeg scoort beter — tijd voor een tactische heroverweging.", emoji: "🍌", color: "#C0395B" },
];

export function pickVerdict(percentile: number): VerdictBand {
  for (const b of VERDICT_BANDS) if (percentile >= b.min) return b;
  return VERDICT_BANDS[VERDICT_BANDS.length - 1];
}

/** Bereken percentile uit een lijst monkey-scores + de user-score. */
export function computePercentile(monkeyScores: number[], userScore: number): number {
  if (monkeyScores.length === 0) return 0;
  let below = 0;
  for (const m of monkeyScores) if (m < userScore) below++;
  return Math.round((below / monkeyScores.length) * 100);
}
