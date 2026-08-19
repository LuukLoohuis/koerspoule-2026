import { describe, it, expect } from "vitest";
import { normaliseer, pastBijZoek, telPerPloeg, ploegenGesorteerd } from "./ploegZoek";

describe("normaliseer", () => {
  it("haalt accenten weg zodat je ze niet hoeft te typen", () => {
    expect(normaliseer("Pogačar")).toBe("pogacar");
    expect(normaliseer("Intermarché")).toBe("intermarche");
    expect(normaliseer("  Groupama-FDJ ")).toBe("groupama-fdj");
  });
});

describe("pastBijZoek", () => {
  it("vindt op rennernaam", () => {
    expect(pastBijZoek("Tadej Pogacar", "UAE", "poga")).toBe(true);
    expect(pastBijZoek("Tadej Pogacar", "UAE", "vinge")).toBe(false);
  });

  it("vindt op ploegnaam — de reden dat dit er is", () => {
    expect(pastBijZoek("Olav Kooij", "Visma", "visma")).toBe(true);
    expect(pastBijZoek("Olav Kooij", "Visma", "VISMA")).toBe(true);
  });

  it("vindt ook zonder de juiste accenten", () => {
    expect(pastBijZoek("Tadej Pogačar", "UAE", "pogacar")).toBe(true);
    expect(pastBijZoek("Biniam Girmay", "Intermarché", "intermarche")).toBe(true);
  });

  it("laat alles door bij een lege of witruimte-zoekterm", () => {
    expect(pastBijZoek("Wie dan ook", "Ploeg", "")).toBe(true);
    expect(pastBijZoek("Wie dan ook", "Ploeg", "   ")).toBe(true);
  });

  it("valt niet om zonder ploegnaam", () => {
    expect(pastBijZoek("Losse Renner", undefined, "losse")).toBe(true);
    expect(pastBijZoek("Losse Renner", undefined, "visma")).toBe(false);
  });
});

describe("telPerPloeg", () => {
  const ploegen = new Map([
    ["a", "Visma"], ["b", "Visma"], ["c", "Visma"], ["d", "UAE"], ["e", "EF"],
  ]);

  it("telt per ploeg over de hele selectie", () => {
    const t = telPerPloeg(["a", "b", "c", "d"], ploegen);
    expect(t.get("Visma")).toBe(3);
    expect(t.get("UAE")).toBe(1);
    expect(t.has("EF")).toBe(false);
  });

  it("negeert renners zonder bekende ploeg", () => {
    expect(telPerPloeg(["a", "onbekend"], ploegen).get("Visma")).toBe(1);
    expect(telPerPloeg(["onbekend"], ploegen).size).toBe(0);
  });

  it("werkt met een Set, want zo staat de selectie in de bouwer", () => {
    expect(telPerPloeg(new Set(["a", "b"]), ploegen).get("Visma")).toBe(2);
  });
});

describe("ploegenGesorteerd", () => {
  it("zet de grootste concentratie bovenaan", () => {
    const t = new Map([["UAE", 1], ["Visma", 3], ["EF", 2]]);
    expect(ploegenGesorteerd(t)).toEqual([["Visma", 3], ["EF", 2], ["UAE", 1]]);
  });

  it("sorteert bij gelijk aantal op naam", () => {
    const t = new Map([["Visma", 2], ["Alpecin", 2]]);
    expect(ploegenGesorteerd(t).map(([n]) => n)).toEqual(["Alpecin", "Visma"]);
  });
});
