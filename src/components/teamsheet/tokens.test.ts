// De gele balk "Jacht op geel" hoort ALLE klassementsrenners te tonen.
// Eerder stond hier een exacte lijst, en die miste de categorie die in de
// praktijk "Aliens" heet -- Pogacar verdween daardoor naar een eigen blok.
import { describe, expect, it } from "vitest";
import { hoortBijJachtOpGeel } from "./tokens";

describe("hoortBijJachtOpGeel", () => {
  it("herkent Alien in enkelvoud en meervoud", () => {
    expect(hoortBijJachtOpGeel({ short_name: "ALIEN" })).toBe(true);
    expect(hoortBijJachtOpGeel({ short_name: "ALIENS" })).toBe(true);
    expect(hoortBijJachtOpGeel({ name: "Aliens" })).toBe(true);
    expect(hoortBijJachtOpGeel({ name: "GC Alien" })).toBe(true);
  });

  it("herkent GC1 tot en met GC4, ook met een spatie", () => {
    for (const v of ["GC1", "GC2", "GC3", "GC4"]) {
      expect(hoortBijJachtOpGeel({ short_name: v })).toBe(true);
    }
    expect(hoortBijJachtOpGeel({ short_name: "GC 2" })).toBe(true);
    expect(hoortBijJachtOpGeel({ short_name: "gc3" })).toBe(true);
  });

  it("kijkt naar de naam als de korte code niets zegt", () => {
    expect(hoortBijJachtOpGeel({ short_name: "", name: "Aliens" })).toBe(true);
    expect(hoortBijJachtOpGeel({ short_name: null, name: "ALIEN" })).toBe(true);
  });

  it("laat andere categorieen met rust", () => {
    for (const v of ["SPR1", "KLIM1", "PUN2", "MVP", "JOKER", "ONTSNAPPERS", "GRIJZE TRUI"]) {
      expect(hoortBijJachtOpGeel({ short_name: v, name: v })).toBe(false);
    }
  });

  it("trekt GC5 en een kale GC er niet bij", () => {
    // Alleen GC1 t/m GC4 zijn klassementsplekken in de ploeg.
    expect(hoortBijJachtOpGeel({ short_name: "GC5" })).toBe(false);
    expect(hoortBijJachtOpGeel({ short_name: "GC" })).toBe(false);
  });

  it("gaat om met lege invoer", () => {
    expect(hoortBijJachtOpGeel({})).toBe(false);
    expect(hoortBijJachtOpGeel({ name: null, short_name: null })).toBe(false);
  });
});
