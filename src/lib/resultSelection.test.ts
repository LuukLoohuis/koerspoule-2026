import { describe, expect, it } from "vitest";
import { getInitialResultsStageIndex, parseResultsStageParam } from "./resultSelection";

const stages = [
  { is_gc: false, results_status: "approved" },
  { is_gc: false, results_status: "approved" },
  { is_gc: true, results_status: "approved" },
];

describe("getInitialResultsStageIndex", () => {
  it("selecteert de goedgekeurde GC voor de fiat-deep-link", () => {
    expect(getInitialResultsStageIndex(stages, true)).toBe(2);
  });

  it("kiest de laatste gewone etappe wanneer GC niet gevraagd wordt", () => {
    // Dit pad geldt nog voor een rit-deeplink; de pagina zelf vraagt nu om GC.
    expect(getInitialResultsStageIndex(stages, false)).toBe(1);
  });

  it("slaat etappes zonder fiat over", () => {
    expect(getInitialResultsStageIndex([
      { is_gc: false, results_status: "approved" },
      { is_gc: false, results_status: "pending" },
      { is_gc: true, results_status: "pending" },
    ], true)).toBe(0);
  });

  it("kiest GC ook als die niet de laatste rij is", () => {
    expect(getInitialResultsStageIndex([
      { is_gc: true, results_status: "approved" },
      { is_gc: false, results_status: "approved" },
    ], true)).toBe(0);
  });

  it("valt terug op de laatste gewone etappe zolang de GC niet is goedgekeurd", () => {
    expect(getInitialResultsStageIndex([
      stages[0],
      stages[1],
      { is_gc: true, results_status: "pending" },
    ], true)).toBe(1);
  });
});

describe("parseResultsStageParam", () => {
  it("herkent de eindklassement-deep-link", () => {
    expect(parseResultsStageParam("gc")).toEqual({ preferGc: true, stageNumber: null });
  });

  it("opent een gefiatteerde normale etappe op ritnummer", () => {
    expect(parseResultsStageParam("9")).toEqual({ preferGc: false, stageNumber: 9 });
  });

  it("negeert ongeldige of lege waarden", () => {
    expect(parseResultsStageParam("0")).toEqual({ preferGc: false, stageNumber: null });
    expect(parseResultsStageParam("etappe-9")).toEqual({ preferGc: false, stageNumber: null });
    expect(parseResultsStageParam(null)).toEqual({ preferGc: false, stageNumber: null });
  });
});
