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
  { min: 85, label: "Petje af — de aap kan inpakken.", hint: "Top-tier insight.",                emoji: "🏆", color: "#2E6A4F" },
  { min: 60, label: "Netjes, je zit boven het toeval.", hint: "Solide skill-signaal.",            emoji: "💪", color: "#2E6A4F" },
  { min: 40, label: "Gelijkspel met de dobbelsteen.",   hint: "Skill ≈ kans deze ronde.",         emoji: "🎲", color: "#C2691C" },
  { min: 0,  label: "Au. De aap had het beter gedaan.", hint: "Bananen voor jou, glorie voor 'm.", emoji: "🍌", color: "#C0395B" },
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
