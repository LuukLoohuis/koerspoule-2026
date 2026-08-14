import { describe, expect, it } from "vitest";
import { getInitialResultsStageIndex } from "./resultSelection";

const stages = [
  { is_gc: false, results_status: "approved" },
  { is_gc: false, results_status: "approved" },
  { is_gc: true, results_status: "approved" },
];

describe("getInitialResultsStageIndex", () => {
  it("selecteert de goedgekeurde GC voor de fiat-deep-link", () => {
    expect(getInitialResultsStageIndex(stages, true)).toBe(2);
  });

  it("houdt standaard de laatste gewone etappe geselecteerd", () => {
    expect(getInitialResultsStageIndex(stages, false)).toBe(1);
  });

  it("valt terug op de laatste gewone etappe zolang de GC niet is goedgekeurd", () => {
    expect(getInitialResultsStageIndex([
      stages[0],
      stages[1],
      { is_gc: true, results_status: "pending" },
    ], true)).toBe(1);
  });
});
