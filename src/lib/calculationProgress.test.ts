import { describe, expect, it } from "vitest";
import { getCalculationProgress, isCalculationActive, isFiatReady, isGcFiatReady } from "./calculationProgress";

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

describe("isGcFiatReady", () => {
  it("laat een klaargezet eindklassement fiatteren, ook zonder batcher", () => {
    // De GC-etappe krijgt geen stage_points en blijft dus op 'idle' staan.
    expect(isGcFiatReady("pending", "idle")).toBe(true);
    expect(isGcFiatReady("pending", "completed")).toBe(true);
  });

  it("wacht zolang er werkelijk gerekend wordt", () => {
    expect(isGcFiatReady("pending", "processing")).toBe(false);
    expect(isGcFiatReady("pending", "finalizing")).toBe(false);
  });

  it("toont geen fiat-knop na een mislukte berekening", () => {
    expect(isGcFiatReady("pending", "failed")).toBe(false);
  });

  it("vraagt nog steeds om klaarzetten", () => {
    expect(isGcFiatReady("draft", "idle")).toBe(false);
    expect(isGcFiatReady("approved", "completed")).toBe(false);
  });
});
