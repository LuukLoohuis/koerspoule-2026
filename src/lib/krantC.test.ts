import { describe, expect, it } from "vitest";
import { hoogtemeters, krantNaam, monogram, podiumMetMij, stijging, volgendeRit, wanneer } from "@/lib/krantC";

describe("krantNaam", () => {
  it("zegt La Gazzetta voor de Giro en laat de rest zoals het thema", () => {
    expect(krantNaam({ krant: "Gazzetta", krantVoluit: "La Gazzetta" })).toBe("La Gazzetta");
    expect(krantNaam({ krant: "L'Équipe" })).toBe("L'Équipe");
    expect(krantNaam({ krant: "Marca", krantVoluit: " " })).toBe("Marca");
  });
});

describe("monogram", () => {
  it("neemt de beginletters, tussenvoegsels inbegrepen", () => {
    expect(monogram("Michel Wuyts")).toBe("MW");
    expect(monogram("José De Cauwer")).toBe("JDC");
    expect(monogram("  Patrick   Lefevere ")).toBe("PL");
  });
});

describe("podiumMetMij", () => {
  const stand = [
    { naam: "Marieke", isMij: false },
    { naam: "Luuk", isMij: true },
    { naam: "Jeroen", isMij: false },
    { naam: "Kees", isMij: false },
  ];

  it("houdt het bij drie als je er zelf bij staat", () => {
    expect(podiumMetMij(stand).map((r) => r.naam)).toEqual(["Marieke", "Luuk", "Jeroen"]);
  });

  it("hangt jouw regel eronder als je buiten het podium valt", () => {
    const lager = [stand[0], stand[2], stand[3], stand[1]];
    expect(podiumMetMij(lager).map((r) => r.naam)).toEqual(["Marieke", "Jeroen", "Kees", "Luuk"]);
  });

  it("doet niets bijzonders zonder eigen regel", () => {
    expect(podiumMetMij(stand.filter((r) => !r.isMij))).toHaveLength(3);
  });
});

describe("volgendeRit", () => {
  const ritten = [
    { stage_number: 2, is_gc: false, results_status: "approved" },
    { stage_number: 1, is_gc: false, results_status: "approved" },
    { stage_number: 4, is_gc: false, results_status: "draft" },
    { stage_number: 3, is_gc: false, results_status: "pending" },
    { stage_number: 99, is_gc: true, results_status: null },
  ];

  it("pakt de laagste rit die nog niet gefiatteerd is", () => {
    expect(volgendeRit(ritten)?.stage_number).toBe(3);
  });

  it("slaat de GC-rit over en geeft niets als alles gereden is", () => {
    const klaar = ritten.map((r) => (r.is_gc ? r : { ...r, results_status: "approved" }));
    expect(volgendeRit(klaar)).toBeNull();
  });
});

describe("hoogtemeters", () => {
  it("rondt af en zet er een m achter", () => {
    expect(hoogtemeters({ climbMeters: 4250.4 }, "nl-NL")).toBe("4.250 m");
  });

  it("geeft niets zonder bruikbaar getal", () => {
    expect(hoogtemeters({ climbMeters: 0 }, "nl-NL")).toBeNull();
    expect(hoogtemeters(null, "nl-NL")).toBeNull();
    expect(hoogtemeters({}, "nl-NL")).toBeNull();
  });
});

describe("wanneer", () => {
  const nu = new Date(2026, 4, 23, 15, 0, 0);
  const woorden = { vandaag: "Vandaag", morgen: "Morgen" };

  it("herkent vandaag en morgen", () => {
    expect(wanneer("2026-05-23", nu, "nl-NL", woorden)).toBe("Vandaag");
    expect(wanneer("2026-05-24", nu, "nl-NL", woorden)).toBe("Morgen");
  });

  it("schrijft andere dagen uit en zwijgt zonder datum", () => {
    expect(wanneer("2026-05-26", nu, "nl-NL", woorden)).toMatch(/26/);
    expect(wanneer(null, nu, "nl-NL", woorden)).toBeNull();
  });
});

describe("stijging", () => {
  it("geeft een pijl met aantal, en niets bij gelijk", () => {
    expect(stijging(2)).toEqual({ teken: "▲", aantal: 2 });
    expect(stijging(-37)).toEqual({ teken: "▼", aantal: 37 });
    expect(stijging(0)).toBeNull();
    expect(stijging(null)).toBeNull();
  });
});
