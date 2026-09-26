import { describe, expect, it } from "vitest";
import { ploegDagpunten, ploegTotaalTotRit, sorteerRenners, telPunten, topscorerId } from "@/lib/ploegRanglijst";

const etappes = [
  { stage_number: 1, total_points: 10 },
  { stage_number: 2, total_points: 0 },
  { stage_number: 3, total_points: 14 },
  { stage_number: 4, total_points: 6 },
];

describe("telPunten", () => {
  it("telt tot en met de gekozen rit en pakt de dagpunten van die rit", () => {
    expect(telPunten(etappes, 3)).toEqual({ dag: 14, totaal: 24 });
    expect(telPunten(etappes, 4)).toEqual({ dag: 6, totaal: 30 });
  });

  it("geeft nul zonder rit of zonder punten in die rit", () => {
    expect(telPunten(etappes, null)).toEqual({ dag: 0, totaal: 0 });
    expect(telPunten(etappes, 2)).toEqual({ dag: 0, totaal: 10 });
    expect(telPunten([], 3)).toEqual({ dag: 0, totaal: 0 });
  });
});

const renners = [
  { id: "a", naam: "Vingegaard", dag: 14, totaal: 214 },
  { id: "b", naam: "Milan", dag: 0, totaal: 198 },
  { id: "c", naam: "Ciccone", dag: 20, totaal: 176 },
  { id: "d", naam: "Ayuso", dag: 0, totaal: 41 },
];

describe("sorteerRenners", () => {
  it("zet op Punten het totaal voorop", () => {
    expect(sorteerRenners(renners, "punten").map((r) => r.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("zet op Vandaag de scorers van de rit bovenaan, daarbinnen op totaal", () => {
    expect(sorteerRenners(renners, "vandaag").map((r) => r.id)).toEqual(["c", "a", "b", "d"]);
  });

  it("laat de invoer met rust", () => {
    const kopie = [...renners];
    sorteerRenners(renners, "vandaag");
    expect(renners).toEqual(kopie);
  });

  it("breekt gelijke stand op naam", () => {
    const gelijk = [
      { id: "x", naam: "Zonneveld", dag: 0, totaal: 50 },
      { id: "y", naam: "Aerts", dag: 0, totaal: 50 },
    ];
    expect(sorteerRenners(gelijk, "punten").map((r) => r.id)).toEqual(["y", "x"]);
  });
});

describe("topscorerId", () => {
  it("kiest het hoogste totaal", () => {
    expect(topscorerId(renners)).toBe("a");
  });

  it("geeft niets terug zolang niemand scoorde", () => {
    expect(topscorerId(renners.map((r) => ({ ...r, totaal: 0 })))).toBeNull();
  });

  it("kiest bij gelijke stand alfabetisch, los van de volgorde", () => {
    const gelijk = [
      { id: "x", naam: "Zonneveld", dag: 0, totaal: 50 },
      { id: "y", naam: "Aerts", dag: 0, totaal: 50 },
    ];
    expect(topscorerId(gelijk)).toBe("y");
    expect(topscorerId([...gelijk].reverse())).toBe("y");
  });
});

describe("ploegpunten", () => {
  const punten = [
    { stage_id: "s1", points: 30 },
    { stage_id: "s2", points: 48 },
    { stage_id: "s3", points: 12 },
  ];
  const nummers = new Map([
    ["s1", 1],
    ["s2", 2],
    ["s3", 3],
  ]);

  it("telt de ploeg tot en met de rit", () => {
    expect(ploegTotaalTotRit(punten, nummers, 2)).toBe(78);
    expect(ploegTotaalTotRit(punten, nummers, null)).toBe(0);
  });

  it("geeft de dagpunten van één rit", () => {
    expect(ploegDagpunten(punten, "s2")).toBe(48);
    expect(ploegDagpunten(punten, null)).toBe(0);
  });
});
