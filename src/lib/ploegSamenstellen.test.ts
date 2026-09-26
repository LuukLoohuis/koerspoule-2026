import { describe, expect, it } from "vitest";
import {
  bouwSlots,
  doelSleutel,
  geldigeKeuzes,
  jokerPool,
  jokersNa,
  kandidaten,
  nogOpenTekst,
  ondertitel,
  opsomming,
  pickActies,
  slotLabel,
  sluitReden,
  sorteerRijders,
  teambouwerDoel,
  telling,
  zelfdeDoel,
  type PsCategorie,
  type PsRijder,
} from "./ploegSamenstellen";

const rijder = (id: string, nummer: number | null = null, ploeg: string | null = "Ploeg Friesland"): PsRijder => ({
  id,
  naam: `Rijder ${id.toUpperCase()}`,
  ploeg,
  nummer,
});

const cat = (id: string, naam: string, rijders: PsRijder[], max = 1): PsCategorie => ({ id, naam, max, rijders });

const VIJF: PsCategorie[] = [
  cat("c1", "Toppers", [rijder("a", 3), rijder("b", 1)]),
  cat("c2", "Sprinters", [rijder("c"), rijder("d")]),
  cat("c3", "Natuurijs", [rijder("e")]),
  cat("c4", "Vechters", [rijder("f"), rijder("g")]),
  cat("c5", "Talent", [rijder("h")]),
];

const keuzes = (paren: [string, string[]][]) => new Map(paren);

describe("geldigeKeuzes", () => {
  it("laat rijders buiten de categorie, dubbelen en overschot weg", () => {
    const g = geldigeKeuzes(
      [cat("c1", "Toppers", [rijder("a"), rijder("b")]), cat("c2", "Duo", [rijder("c"), rijder("d"), rijder("e")], 2)],
      keuzes([
        ["c1", ["x", "a", "b"]],
        ["c2", ["c", "c", "d", "e"]],
      ]),
    );
    expect(g.get("c1")).toEqual(["a"]);
    expect(g.get("c2")).toEqual(["c", "d"]);
  });
});

describe("bouwSlots en slotLabel", () => {
  it("geeft één plek per categorie met de gekozen rijder", () => {
    const slots = bouwSlots(VIJF, keuzes([["c2", ["d"]]]));
    expect(slots).toHaveLength(5);
    expect(slots[0].rijder).toBeNull();
    expect(slots[1].rijder?.id).toBe("d");
    expect(slotLabel(slots[3])).toBe("Categorie 4 · Vechters");
  });

  it("geeft meerdere plekken als een categorie er meer toelaat", () => {
    const slots = bouwSlots([cat("c1", "Duo", [rijder("a"), rijder("b")], 2)], keuzes([["c1", ["b"]]]));
    expect(slots.map((s) => s.rijder?.id ?? null)).toEqual(["b", null]);
    expect(slotLabel(slots[1])).toBe("Categorie 1 · Duo · 2/2");
  });
});

describe("telling en nogOpenTekst", () => {
  it("telt gekozen tegen vereist", () => {
    const g = keuzes([
      ["c1", ["a"]],
      ["c2", ["c"]],
      ["c3", ["e"]],
    ]);
    expect(telling(VIJF, g)).toEqual({ gekozen: 3, vereist: 5, compleet: false });
    expect(nogOpenTekst(VIJF, g)).toBe("Nog open: Vechters en Talent");
  });

  it("is compleet als elke plek gevuld is", () => {
    const g = keuzes(VIJF.map((c) => [c.id, [c.rijders[0].id]]));
    expect(telling(VIJF, g).compleet).toBe(true);
    expect(nogOpenTekst(VIJF, g)).toBeNull();
  });

  it("is nooit compleet zonder categorieën", () => {
    expect(telling([], new Map()).compleet).toBe(false);
  });
});

describe("opsomming", () => {
  it("plakt namen aan elkaar zoals je het zegt", () => {
    expect(opsomming([])).toBe("");
    expect(opsomming(["A"])).toBe("A");
    expect(opsomming(["A", "B"])).toBe("A en B");
    expect(opsomming(["A", "B", "C"])).toBe("A, B en C");
  });
});

describe("ondertitel", () => {
  it("zegt één per categorie als dat zo is", () => {
    expect(ondertitel("Meermarathon Mannen", VIJF)).toBe("Meermarathon Mannen · kies 5 rijders, één per categorie");
  });
  it("telt anders als een categorie meer plekken heeft", () => {
    expect(ondertitel("Meermarathon Vrouwen", [...VIJF.slice(0, 2), cat("c9", "Duo", [], 2)])).toBe(
      "Meermarathon Vrouwen · kies 4 rijders uit 3 categorieën",
    );
  });
  it("heeft een regel voor een game zonder categorieën", () => {
    expect(ondertitel("Meermarathon Vrouwen", [])).toBe("Meermarathon Vrouwen · de categorieën volgen nog");
  });
});

describe("sorteerRijders en kandidaten", () => {
  it("sorteert op beennummer, zonder nummer achteraan", () => {
    expect(sorteerRijders([rijder("z"), rijder("a", 3), rijder("b", 1)]).map((r) => r.id)).toEqual(["b", "a", "z"]);
  });

  it("markeert de huidige en bezette rijders en filtert op naam of ploeg", () => {
    const lijst = [rijder("a", 1, "Schaatsteam West"), rijder("b", 2, "Ploeg Friesland"), rijder("c", 3, "Schaatsteam West")];
    const rijen = kandidaten(lijst, { huidig: "a", bezet: new Set(["c"]), zoek: "" });
    expect(rijen.map((r) => r.status)).toEqual(["huidig", "kies", "bezet"]);
    expect(kandidaten(lijst, { huidig: null, bezet: new Set(), zoek: "west" }).map((r) => r.rijder.id)).toEqual(["a", "c"]);
  });
});

describe("pickActies", () => {
  it("vervangt in één stap bij één plek", () => {
    expect(pickActies({ max: 1, inCategorie: ["a"], oud: "a", nieuw: "b" })).toEqual([{ soort: "vervang", rijderId: "b" }]);
    expect(pickActies({ max: 1, inCategorie: [], oud: null, nieuw: "b" })).toEqual([{ soort: "vervang", rijderId: "b" }]);
  });

  it("haalt bij meer plekken eerst de oude eruit", () => {
    expect(pickActies({ max: 2, inCategorie: ["a", "c"], oud: "a", nieuw: "b" })).toEqual([
      { soort: "aan-uit", rijderId: "a" },
      { soort: "aan-uit", rijderId: "b" },
    ]);
    expect(pickActies({ max: 2, inCategorie: ["a"], oud: null, nieuw: "b" })).toEqual([{ soort: "aan-uit", rijderId: "b" }]);
  });

  it("doet niets als de rijder er al staat of de categorie vol is", () => {
    expect(pickActies({ max: 1, inCategorie: ["a"], oud: "a", nieuw: "a" })).toEqual([]);
    expect(pickActies({ max: 2, inCategorie: ["a", "b"], oud: "a", nieuw: "b" })).toEqual([]);
    expect(pickActies({ max: 2, inCategorie: ["a", "b"], oud: null, nieuw: "c" })).toEqual([]);
  });
});

describe("jokers", () => {
  it("haalt categorierijders uit de pool", () => {
    const pool = jokerPool([rijder("a"), rijder("x", 9), rijder("y", 2)], VIJF);
    expect(pool.map((r) => r.id)).toEqual(["y", "x"]);
  });

  it("zet en wist één jokerplek", () => {
    expect(jokersNa([], 0, "x")).toEqual(["x"]);
    expect(jokersNa(["x"], 1, "y")).toEqual(["x", "y"]);
    expect(jokersNa(["x", "y"], 0, "z")).toEqual(["z", "y"]);
    expect(jokersNa(["x", "y"], 0, null)).toEqual(["y"]);
    expect(jokersNa(["x", "y"], 1, "x")).toEqual(["x"]);
  });
});

describe("doelen", () => {
  it("vergelijkt kiesdoelen op plek", () => {
    expect(doelSleutel({ soort: "categorie", categorieId: "c1", plek: 0 })).toBe("c1:0");
    expect(zelfdeDoel({ soort: "joker", plek: 1 }, { soort: "joker", plek: 1 })).toBe(true);
    expect(zelfdeDoel({ soort: "joker", plek: 1 }, null)).toBe(false);
  });
});

describe("teambouwerDoel", () => {
  const mannen = { id: "m", year: 2026, game_type: "meermarathon" };
  const vrouwen = { id: "v", year: 2026, game_type: "meermarathon" };

  it("bouwt als de keuze en de inschrijfgame gelijk zijn", () => {
    expect(teambouwerDoel(mannen, mannen, true)).toEqual({ soort: "bouwen", gameId: "m" });
    expect(teambouwerDoel(mannen, null, false)).toEqual({ soort: "bouwen", gameId: "m" });
  });

  it("toont de zelf gekozen andere categorie als die dicht is", () => {
    expect(teambouwerDoel(mannen, vrouwen, true)).toEqual({ soort: "keuze-dicht", gameId: "v" });
  });

  it("volgt de inschrijfgame zonder eigen keuze, of bij een andere koers of ander seizoen", () => {
    expect(teambouwerDoel(mannen, vrouwen, false)).toEqual({ soort: "volg", gameId: "m" });
    expect(teambouwerDoel(mannen, { id: "t", year: 2026, game_type: "tour" }, true)).toEqual({ soort: "volg", gameId: "m" });
    expect(teambouwerDoel(mannen, { ...vrouwen, id: "v25", year: 2025 }, true)).toEqual({ soort: "volg", gameId: "m" });
  });
});

describe("sluitReden", () => {
  it("onderscheidt nog niet open van dicht", () => {
    expect(sluitReden("open")).toBe("nog-niet-open");
    expect(sluitReden("draft")).toBe("nog-niet-open");
    expect(sluitReden("locked")).toBe("gesloten");
    expect(sluitReden("finished")).toBe("gesloten");
  });
});
