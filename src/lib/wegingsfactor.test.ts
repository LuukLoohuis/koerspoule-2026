import { describe, expect, it } from "vitest";
import {
  gewogenPunten,
  leesWeging,
  schemaMetWeging,
  wegingLabel,
  wegingUitleg,
  wegingVan,
} from "./wegingsfactor";

describe("wegingVan", () => {
  it("leest de factor van een wedstrijd", () => {
    expect(wegingVan({ wegingsfactor: 2 })).toBe(2);
    expect(wegingVan({ wegingsfactor: 1.5 })).toBe(1.5);
    // PostgREST kan numeric ook als tekst leveren.
    expect(wegingVan({ wegingsfactor: "1.50" })).toBe(1.5);
  });

  it("valt terug op 1 zonder geldige factor", () => {
    expect(wegingVan(null)).toBe(1);
    expect(wegingVan({})).toBe(1);
    expect(wegingVan({ wegingsfactor: null })).toBe(1);
    expect(wegingVan({ wegingsfactor: 0 })).toBe(1);
    expect(wegingVan({ wegingsfactor: "abc" })).toBe(1);
  });
});

describe("gewogenPunten", () => {
  it("vermenigvuldigt de schemapunten met de factor", () => {
    expect(gewogenPunten(50, 1)).toBe(50);
    expect(gewogenPunten(50, 2)).toBe(100);
    expect(gewogenPunten(0, 2)).toBe(0);
  });

  it("rondt x,5 naar boven af, zoals round() in de database", () => {
    expect(gewogenPunten(45, 1.5)).toBe(68);
    expect(gewogenPunten(1, 0.5)).toBe(1);
    // 1,15 is binair net te klein; de stand rekent met 34,50 en komt op 35.
    expect(gewogenPunten(30, 1.15)).toBe(35);
    expect(gewogenPunten(26, 1.25)).toBe(33);
  });
});

describe("wegingLabel en wegingUitleg", () => {
  it("schrijft de factor met een komma", () => {
    expect(wegingLabel(2)).toBe("×2");
    expect(wegingLabel(1.5)).toBe("×1,5");
    expect(wegingLabel(1.25)).toBe("×1,25");
  });

  it("zegt niets bij een gewone wedstrijd", () => {
    expect(wegingUitleg(1)).toBeNull();
    expect(wegingUitleg(2)).toBe("telt dubbel");
    expect(wegingUitleg(3)).toBe("telt ×3");
    expect(wegingUitleg(1.5)).toBe("telt ×1,5");
  });
});

describe("leesWeging", () => {
  it("accepteert een komma of een punt", () => {
    expect(leesWeging("2")).toBe(2);
    expect(leesWeging("1,5")).toBe(1.5);
    expect(leesWeging(" 1.5 ")).toBe(1.5);
    expect(leesWeging("1,234")).toBe(1.23);
  });

  it("weigert leeg, nul, negatief en te groot", () => {
    expect(leesWeging("")).toBeNull();
    expect(leesWeging("0")).toBeNull();
    expect(leesWeging("0,001")).toBeNull();
    expect(leesWeging("-1")).toBeNull();
    expect(leesWeging("11")).toBeNull();
    expect(leesWeging("twee")).toBeNull();
  });
});

describe("schemaMetWeging", () => {
  const schema = new Map([
    [1, 50],
    [2, 45],
    [3, 40],
  ]);

  it("weegt elke plek", () => {
    expect([...schemaMetWeging(schema, 2)]).toEqual([
      [1, 100],
      [2, 90],
      [3, 80],
    ]);
    expect(schemaMetWeging(schema, 1.5).get(2)).toBe(68);
  });

  it("laat het schema met rust bij factor 1", () => {
    expect(schemaMetWeging(schema, 1)).toBe(schema);
  });
});
