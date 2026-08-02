import { describe, expect, it } from "vitest";
import { getCalculationProgress, isCalculationActive, isFiatReady } from "./calculationProgress";

describe("calculation progress", () => {
  it("calculates and clamps measurable progress", () => {
    expect(getCalculationProgress(159, 248)).toBe(64);
    expect(getCalculationProgress(-2, 10)).toBe(0);
    expect(getCalculationProgress(12, 10)).toBe(100);
  });

  it("uses an indeterminate state when totals are unavailable", () => {
    expect(getCalculationProgress(0, 0)).toBeNull();
    expect(getCalculationProgress(1, Number.NaN)).toBeNull();
  });

  it("only permits fiat for a completed pending result", () => {
    expect(isFiatReady("pending", "completed")).toBe(true);
    expect(isFiatReady("pending", "finalizing")).toBe(false);
    expect(isFiatReady("draft", "completed")).toBe(false);
  });

  it("recognizes only processing and finalizing as active", () => {
    expect(isCalculationActive("processing")).toBe(true);
    expect(isCalculationActive("finalizing")).toBe(true);
    expect(isCalculationActive("failed")).toBe(false);
  });
});
