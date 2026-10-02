import { describe, expect, it } from "vitest";
import {
  gewogenPunten,
  leesWeging,
  schemaMetWeging,
  nummerReeks,
  wegingLabel,
  wegingPerFactor,
  wegingUitleg,
  wegingVan,
  wegingWoord,
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

describe("wegingWoord en nummerReeks", () => {
  it("noemt de gangbare factoren in één woord", () => {
    expect([2, 1.5, 1, 0.75, 0.5].map(wegingWoord)).toEqual(["Dubbel", "Anderhalf", "Gewoon", "Driekwart", "Half"]);
    expect(wegingWoord(1.25)).toBe("Zwaarder");
    expect(wegingWoord(0.9)).toBe("Lichter");
  });

  it("maakt pas vanaf drie op een rij een reeks", () => {
    expect(nummerReeks([3, 1, 2, 4])).toBe("1 t/m 4");
    expect(nummerReeks([2, 4, 5])).toBe("2, 4 en 5");
    expect(nummerReeks([1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12])).toBe("1 t/m 7 en 9 t/m 12");
    expect(nummerReeks([3, 4])).toBe("3 en 4");
    expect(nummerReeks([8])).toBe("8");
  });
});

describe("wegingPerFactor", () => {
  type Rij = [nr: number, naam: string, soort: string, weging: number];
  const kalender = (rijen: Rij[]) =>
    rijen.map(([stage_number, name, wedstrijd_type, wegingsfactor]) => ({ stage_number, name, wedstrijd_type, wegingsfactor }));

  // De kalender zoals hij op 2026-10-02 bij de mannen op productie stond.
  const MANNEN: Rij[] = [
    [1, "Cup 1 Amsterdam", "cup", 1], [2, "Cup 2 Utrecht", "cup", 1], [3, "Cup 3 Heerenveen", "cup", 1],
    [4, "Cup 4 Heerenveen", "cup", 1], [5, "Cup 5 Haarlem", "cup", 1], [6, "Cup 6 Hoorn", "cup", 1],
    [7, "Cup 7 Den Haag", "cup", 1], [8, "Vierdaagse dag 1 Hoorn", "cup", 0.5], [9, "Vierdaagse dag 2 Alkmaar", "cup", 0.75],
    [10, "Vierdaagse dag 3 Amsterdam", "cup", 1], [11, "Vierdaagse dag 4 Haarlem", "cup", 1.5], [12, "Cup 8 Breda", "cup", 1],
    [13, "Nederlands Kampioenschap", "nk", 1.5], [14, "Cup 9 Tilburg", "cup", 1], [15, "Cup 10 Eindhoven", "cup", 1],
    [16, "Grand Prix 1", "grandprix", 1], [17, "Open Nederlands Kampioenschap", "onk", 2], [18, "Grand Prix 2", "grandprix", 1.5],
    [19, "Grand Prix 3 Alternatieve Elfstedentocht Weissensee", "grandprix", 2], [20, "Cup 11 Alkmaar", "cup", 1],
    [21, "Cup 12 Groningen", "cup", 1], [22, "Cup Finale Leeuwarden", "cup", 1], [23, "Grand Prix 4", "grandprix", 1.5],
    [24, "Grand Prix 5", "grandprix", 1.5], [25, "Grand Prix Finale", "grandprix", 2],
  ];

  it("vat de echte kalender samen per factor, zwaarste eerst", () => {
    expect(wegingPerFactor(kalender(MANNEN))).toEqual([
      { weging: 2, wedstrijden: ["ONK", "Grand Prix 3 Alternatieve Elfstedentocht Weissensee", "Grand Prix Finale"], voorbeeld: "ONK" },
      { weging: 1.5, wedstrijden: ["Vierdaagse dag 4 Haarlem", "NK", "Grand Prix 2, 4 en 5"], voorbeeld: "Vierdaagse dag 4 Haarlem" },
      {
        weging: 1,
        wedstrijden: ["Cup 1 t/m 12", "Vierdaagse dag 3 Amsterdam", "Grand Prix 1", "Cup Finale Leeuwarden"],
        voorbeeld: "Cup 1 Amsterdam",
      },
      { weging: 0.75, wedstrijden: ["Vierdaagse dag 2 Alkmaar"], voorbeeld: "Vierdaagse dag 2 Alkmaar" },
      { weging: 0.5, wedstrijden: ["Vierdaagse dag 1 Hoorn"], voorbeeld: "Vierdaagse dag 1 Hoorn" },
    ]);
  });

  it("trekt wisselende spelling recht en laat een afwijkende naam staan", () => {
    // Zo staan ze bij de vrouwen: "Grand prix", "grand prix 5", "Marathon cup 8 Breda".
    const vrouwen = MANNEN.map(([nr, naam, soort, weging]): Rij => {
      if (nr === 11) return [nr, naam, soort, 1];
      if (nr === 12) return [nr, "Marathon cup 8 Breda", soort, weging];
      if (nr === 24) return [nr, "grand prix 5", soort, weging];
      return [nr, naam.replace("Grand Prix", "Grand prix"), soort, weging];
    });
    const groepen = wegingPerFactor(kalender(vrouwen));
    expect(groepen[0].wedstrijden).toEqual(["ONK", "Grand Prix 3 Alternatieve Elfstedentocht Weissensee", "Grand Prix Finale"]);
    expect(groepen[1].wedstrijden).toEqual(["NK", "Grand Prix 2, 4 en 5"]);
    expect(groepen[2].wedstrijden).toEqual([
      "Cup 1 t/m 7 en 9 t/m 12",
      "Vierdaagse dag 3 en 4",
      "Marathon cup 8 Breda",
      "Grand Prix 1",
      "Cup Finale Leeuwarden",
    ]);
  });

  it("noemt een wedstrijd zonder eigen naam naar zijn soort en slaat het eindklassement over", () => {
    const groepen = wegingPerFactor([
      { stage_number: 1, name: null, wedstrijd_type: "cup" },
      { stage_number: 2, name: "Etappe 2", wedstrijd_type: "cup" },
      { stage_number: 3, name: null, wedstrijd_type: "cup" },
      { stage_number: 22, name: "Eindklassement (GC)", wedstrijd_type: "cup", is_gc: true },
    ]);
    expect(groepen).toEqual([{ weging: 1, wedstrijden: ["Cup 1 t/m 3"], voorbeeld: "Cup 1" }]);
  });
});
