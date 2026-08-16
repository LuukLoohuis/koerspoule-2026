type SelectableStage = {
  is_gc?: boolean | null;
  results_status?: string | null;
};

/** Kies de eind-GC voor een expliciete deep-link, anders de laatste gefiatteerde rit. */
export function getInitialResultsStageIndex(stages: SelectableStage[], preferGc: boolean): number {
  if (preferGc) {
    const gcIndex = stages.findIndex(
      (stage) => stage.is_gc === true && stage.results_status === "approved",
    );
    if (gcIndex >= 0) return gcIndex;
  }

  for (let index = stages.length - 1; index >= 0; index--) {
    if (stages[index].results_status === "approved" && !stages[index].is_gc) return index;
  }
  return 0;
}

/** Parseer de fiat-deep-link: `gc` kiest de eindstand, een positief nummer een rit. */
export function parseResultsStageParam(stageParam: string | null): {
  preferGc: boolean;
  stageNumber: number | null;
} {
  if (stageParam === "gc") return { preferGc: true, stageNumber: null };
  if (stageParam && /^\d+$/.test(stageParam)) {
    const stageNumber = Number(stageParam);
    if (stageNumber > 0) return { preferGc: false, stageNumber };
  }
  return { preferGc: false, stageNumber: null };
}
