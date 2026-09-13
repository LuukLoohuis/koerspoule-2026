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

/**
 * De oude submit_stage_for_approval eiste dat de GC-bonussen al berekend
 * waren, terwijl die berekening op haar beurt een klaargezette GC eist: wie
 * migratie 20260814140000 niet heeft gedraaid loopt daardoor in een kringetje.
 * Dat is aan de melding te herkennen, dus zeg erbij wat eraan scheelt in
 * plaats van de database-tekst kaal door te geven.
 */
export function gcFiatFoutUitleg(melding: string): string | undefined {
  if (!melding.includes("Bereken eerst de eindklassement")) return undefined;
  return (
    "Deze database draait nog de oude versie van submit_stage_for_approval. " +
    "Draai `npx supabase db push` (migratie 20260814140000_smooth_gc_approval); " +
    "daarna berekent het klaarzetten de bonussen zelf."
  );
}
