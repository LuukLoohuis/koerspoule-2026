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
