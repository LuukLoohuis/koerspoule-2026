import { describe, expect, it } from "vitest";
import { buildScreenshotImportPreview, type ScreenshotExtraction } from "./screenshotResultImport";

const riders = [
  { id: "ayuso", name: "Juan Ayuso", start_number: 11 },
  { id: "roglic", name: "Primož Roglič", start_number: 21 },
  { id: "bernal", name: "Egan Bernal", start_number: 31 },
  { id: "wlodarczyk", name: "Dominika Wlodarczyk", start_number: 41 },
  { id: "waerenskjold", name: "Søren Wærenskjold", start_number: 51 },
  { id: "grossschartner", name: "Felix Großschartner", start_number: 61 },
];

function extraction(overrides: Partial<ScreenshotExtraction> = {}): ScreenshotExtraction {
  return {
    classification: "stage",
    stage_number: 9,
    source_title: "Giro d'Italia 2026 — Stage 9 result",
    warnings: [],
    rows: [
      { position: 1, bib: 11, name: "Juan Ayuso", confidence: 0.99 },
      { position: 2, bib: 21, name: "Primoz Roglic", confidence: 0.98 },
    ],
    ...overrides,
  };
}

function preview(value: ScreenshotExtraction) {
  return buildScreenshotImportPreview({
    extraction: value,
    riders,
    expectedClassification: "stage",
    expectedStageNumber: 9,
    filename: "pcs-stage-9.png",
  });
}

describe("buildScreenshotImportPreview", () => {
  it("matcht rugnummers en accentloze namen", () => {
    const result = preview(extraction());
    expect(result.matched.stage.map((row) => row.rider_id)).toEqual(["ayuso", "roglic"]);
    expect(result.unmatched.stage).toEqual([]);
  });

  it.each([
    ["WŁODARCZYK Dominika", "wlodarczyk"],
    ["WAERENSKJOLD Soeren", "waerenskjold"],
    ["GROSSSCHARTNER Felix", "grossschartner"],
  ])("matcht buitenlandse naamvarianten: %s", (name, riderId) => {
    const result = preview(extraction({
      rows: [{ position: 1, bib: null, name, confidence: 0.99 }],
    }));

    expect(result.matched.stage[0]?.rider_id).toBe(riderId);
    expect(result.unmatched.stage).toEqual([]);
  });

  it("valt bij een rugnummerconflict veilig terug op de naam", () => {
    const result = preview(extraction({
      rows: [{ position: 1, bib: 21, name: "Juan Ayuso", confidence: 0.99 }],
    }));
    expect(result.matched.stage[0].rider_id).toBe("ayuso");
  });

  it("stuurt lage beeldzekerheid naar handmatige controle", () => {
    const result = preview(extraction({
      rows: [{ position: 1, bib: 11, name: "Juan Ayuso", confidence: 0.61 }],
    }));
    expect(result.matched.stage).toEqual([]);
    expect(result.unmatched.stage).toHaveLength(1);
    expect(result.warnings.some((warning) => warning.includes("lage beeldzekerheid"))).toBe(true);
  });

  it("blokkeert een screenshot van de verkeerde etappe", () => {
    const result = preview(extraction({ stage_number: 8 }));
    expect(result.blocking_warnings).toEqual([
      "Screenshot lijkt bij etappe 8 te horen, niet bij etappe 9.",
    ]);
  });

  it("gebruikt het automatisch herkende klassement", () => {
    const result = preview(extraction({ classification: "gc" }));
    expect(result.matched.gc).toHaveLength(2);
    expect(result.counts.gc.total).toBe(2);
    expect(result.warnings.some((warning) => warning.includes("herkend als gc"))).toBe(true);
  });

  it("accepteert de eind-GC na rit 21 voor de speciale GC-etappe", () => {
    const result = buildScreenshotImportPreview({
      extraction: extraction({ classification: "gc", stage_number: 21 }),
      riders,
      expectedClassification: "gc",
      expectedStageNumber: 22,
      filename: "final-gc.png",
    });
    expect(result.blocking_warnings).toEqual([]);
  });
});
