import { describe, expect, it } from "vitest";
import { dagrangVan, metGedeeldeRang, rangVan } from "./rang";

describe("rangVan", () => {
  it("telt alleen wie meer punten heeft", () => {
    expect(rangVan(80, [100, 80, 80, 50])).toBe(2);
    expect(rangVan(50, [100, 80, 80, 50])).toBe(4);
    expect(rangVan(100, [100, 80])).toBe(1);
  });

  it("geeft 1 in een lege lijst", () => {
    expect(rangVan(10, [])).toBe(1);
  });
});

describe("metGedeeldeRang", () => {
  it("laat gelijke punten de plek delen en slaat daarna over", () => {
    const rijen = [{ id: "a", p: 30 }, { id: "b", p: 20 }, { id: "c", p: 20 }, { id: "d", p: 10 }];
    expect(metGedeeldeRang(rijen, (r) => r.p).map((r) => r.rank)).toEqual([1, 2, 2, 4]);
  });

  it("houdt de volgorde van de invoer aan", () => {
    const rijen = [{ id: "x", p: 5 }, { id: "y", p: 5 }];
    expect(metGedeeldeRang(rijen, (r) => r.p).map((r) => r.id)).toEqual(["x", "y"]);
  });

  it("komt overeen met rangVan voor elke rij", () => {
    const punten = [90, 90, 70, 70, 70, 10, 0];
    const rijen = punten.map((p, i) => ({ i, p }));
    for (const r of metGedeeldeRang(rijen, (x) => x.p)) {
      expect(r.rank).toBe(rangVan(r.p, punten));
    }
  });
});

describe("dagrangVan", () => {
  it("geeft geen dagrang zonder punten", () => {
    expect(dagrangVan(0, [10, 0, 0])).toBeNull();
  });

  it("rangschikt wie punten pakte", () => {
    expect(dagrangVan(10, [25, 10, 10, 0])).toBe(2);
  });
});
