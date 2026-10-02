import { describe, expect, it } from "vitest";
import { BALK_ZONDER_PLOEG, bouwWedstrijdBalk, soortenInBalk, type BalkBron } from "./meermarathonBalk";

const w = (stage_number: number, over: Partial<BalkBron> = {}): BalkBron => ({
  id: `s${stage_number}`,
  stage_number,
  name: null,
  date: null,
  is_gc: false,
  results_status: null,
  ijs_type: "kunstijs",
  wedstrijd_type: "cup",
  ...over,
});

const SEIZOEN: BalkBron[] = [
  w(1, { results_status: "approved" }),
  w(2, { results_status: "approved" }),
  w(3, { results_status: "approved" }),
  w(4),
  w(6, { ijs_type: "natuurijs", wedstrijd_type: "grandprix" }),
  w(8, { ijs_type: "natuurijs", wedstrijd_type: "onk" }),
  w(9, { wedstrijd_type: "nk" }),
];

const PUNTEN = new Map([
  ["s1", 54],
  ["s2", 27],
]);

describe("uitslagenbalk van de Meermarathon", () => {
  const { wedstrijden, totaal } = bouwWedstrijdBalk(SEIZOEN, PUNTEN, { heeftPloeg: true });

  it("noemt elke wedstrijd naar zijn soort", () => {
    expect(wedstrijden.map((x) => x.soort)).toEqual(["cup", "cup", "cup", "cup", "grandprix", "onk", "nk"]);
    expect(wedstrijden.map((x) => x.label)).toEqual(["Cup 1", "Cup 2", "Cup 3", "Cup 4", "Grand Prix 6", "ONK", "NK"]);
  });

  it("zet onder een titelwedstrijd de naam in plaats van een nummer", () => {
    expect(wedstrijden.map((x) => x.kort)).toEqual(["1", "2", "3", "4", "6", "ONK", "NK"]);
  });

  it("maakt de balk zo hoog als je score, afgezet tegen je beste wedstrijd", () => {
    expect(wedstrijden[0]).toMatchObject({ gereden: true, punten: 54, fractie: 1 });
    expect(wedstrijden[1]).toMatchObject({ gereden: true, punten: 27, fractie: 0.5 });
  });

  it("onderscheidt nul punten van een wedstrijd die nog komt", () => {
    expect(wedstrijden[2]).toMatchObject({ gereden: true, punten: 0, fractie: 0 });
    expect(wedstrijden[3]).toMatchObject({ gereden: false, punten: null, fractie: null });
  });

  it("telt je punten op, tenzij het klassement een totaal meegeeft", () => {
    expect(totaal).toBe(81);
    expect(bouwWedstrijdBalk(SEIZOEN, PUNTEN, { heeftPloeg: true, totaal: 96 }).totaal).toBe(96);
  });

  it("toont zonder ploeg wel de gereden wedstrijden, maar geen punten", () => {
    const kijker = bouwWedstrijdBalk(SEIZOEN, new Map(), { heeftPloeg: false });
    expect(kijker.totaal).toBeNull();
    expect(kijker.wedstrijden[0]).toMatchObject({ gereden: true, punten: null, fractie: BALK_ZONDER_PLOEG });
    expect(kijker.wedstrijden[3].fractie).toBeNull();
  });

  it("valt zonder gekozen soort terug op de ondergrond", () => {
    const { wedstrijden: oud } = bouwWedstrijdBalk(
      [w(1, { wedstrijd_type: null }), w(2, { wedstrijd_type: null, ijs_type: "natuurijs" })],
      new Map(),
      { heeftPloeg: true },
    );
    expect(oud.map((x) => x.soort)).toEqual(["cup", "grandprix"]);
  });

  it("geeft door hoe zwaar een wedstrijd telt; zonder factor is dat 1", () => {
    const { wedstrijden: rij } = bouwWedstrijdBalk(
      [w(1), w(6, { wedstrijd_type: "grandprix", wegingsfactor: 2 }), w(8, { wegingsfactor: null })],
      new Map(),
      { heeftPloeg: true },
    );
    expect(rij.map((x) => x.weging)).toEqual([1, 2, 1]);
  });

  it("slaat het eindklassement over en sorteert op wedstrijdnummer", () => {
    const { wedstrijden: rij } = bouwWedstrijdBalk([w(3), w(22, { is_gc: true }), w(1)], new Map(), { heeftPloeg: true });
    expect(rij.map((x) => x.nummer)).toEqual([1, 3]);
  });

  it("telt de soorten voor de legenda, in vaste volgorde", () => {
    expect(soortenInBalk(wedstrijden)).toEqual([
      { soort: "cup", aantal: 4 },
      { soort: "grandprix", aantal: 1 },
      { soort: "onk", aantal: 1 },
      { soort: "nk", aantal: 1 },
    ]);
  });
});
