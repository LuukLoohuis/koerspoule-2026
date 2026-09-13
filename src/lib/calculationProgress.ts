export type CalculationStatus = "idle" | "processing" | "finalizing" | "completed" | "failed";

export function getCalculationProgress(processed: number, total: number): number | null {
  if (!Number.isFinite(processed) || !Number.isFinite(total) || total <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((processed / total) * 100)));
}

export function isFiatReady(resultsStatus: string, calculationStatus: CalculationStatus): boolean {
  return resultsStatus === "pending" && calculationStatus === "completed";
}

export function isCalculationActive(status: CalculationStatus): boolean {
  return status === "processing" || status === "finalizing";
}

/**
 * De GC-etappe scoort via entry_prediction_points en loopt nooit door de
 * gewone puntenbatcher. Daar betekent 'idle' dus niet "nog niet berekend",
 * en de strengere isFiatReady liet de fiat-knop bij een klaargezet
 * eindklassement eeuwig op "Punten berekenen..." staan. De echte controle
 * zit in approve_stage_results: die weigert zonder voorspellingpunten en
 * markeert de etappe zelf als berekend.
 */
export function isGcFiatReady(resultsStatus: string, calculationStatus: CalculationStatus): boolean {
  if (resultsStatus !== "pending") return false;
  return !isCalculationActive(calculationStatus) && calculationStatus !== "failed";
}
