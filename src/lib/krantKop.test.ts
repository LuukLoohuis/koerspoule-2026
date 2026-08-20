import { describe, it, expect } from "vitest";
import { achternaam, kopNoemtWinnaar, aankomstplaats, bouwKop } from "./krantKop";

describe("achternaam", () => {
  it("pakt het laatste woord", () => {
    expect(achternaam("Primoz Roglic")).toBe("Roglic");
    expect(achternaam("Tadej Pogacar")).toBe("Pogacar");
  });

  it("houdt tussenvoegsels erbij", () => {
    expect(achternaam("Mathieu van der Poel")).toBe("van der Poel");
    expect(achternaam("Wout van Aert")).toBe("van Aert");
  });

  it("valt niet om op rommel", () => {
    expect(achternaam("Merckx")).toBe("Merckx");
    expect(achternaam(null)).toBe("");
    expect(achternaam("   ")).toBe("");
  });
});

describe("kopNoemtWinnaar", () => {
  it("accepteert een kop met de winnaar erin", () => {
    expect(kopNoemtWinnaar("Roglic slaat toe op de Angliru", "Primoz Roglic")).toBe(true);
  });

  it("negeert accenten, want die typt een model niet altijd mee", () => {
    expect(kopNoemtWinnaar("Roglič slaat toe", "Primoz Roglic")).toBe(true);
    expect(kopNoemtWinnaar("Roglic slaat toe", "Primoz Roglič")).toBe(true);
  });

  it("wijst een kop af die de verkeerde renner noemt", () => {
    // Dit is de hele reden dat deze controle bestaat.
    expect(kopNoemtWinnaar("Vingegaard slaat toe op de Angliru", "Primoz Roglic")).toBe(false);
  });

  it("wijst lege invoer af", () => {
    expect(kopNoemtWinnaar("", "Roglic")).toBe(false);
    expect(kopNoemtWinnaar("Iemand wint", null)).toBe(false);
  });
});

describe("aankomstplaats", () => {
  it("pakt het deel na de pijl of het streepje", () => {
    expect(aankomstplaats("Monaco>Monaco")).toBe("Monaco");
    expect(aankomstplaats("Oviedo - Alto de El Angliru")).toBe("Alto de El Angliru");
    expect(aankomstplaats("Barcelona → Girona")).toBe("Girona");
  });

  it("geeft null bij niets bruikbaars", () => {
    expect(aankomstplaats(null)).toBeNull();
    expect(aankomstplaats("  ")).toBeNull();
  });
});

describe("bouwKop", () => {
  it("gebruikt de gegenereerde kop als die de winnaar noemt", () => {
    expect(bouwKop({ gegenereerd: "Roglic slaat toe op de Angliru", winnaar: "Primoz Roglic" }))
      .toBe("Roglic slaat toe op de Angliru");
  });

  it("valt terug op het sjabloon als de kop de verkeerde naam noemt", () => {
    expect(bouwKop({
      gegenereerd: "Vingegaard slaat toe", winnaar: "Primoz Roglic", etappeNaam: "Oviedo - Angliru",
    })).toBe("Roglic wint in Angliru");
  });

  it("valt terug op het etappenummer zonder bruikbare plaats", () => {
    expect(bouwKop({ winnaar: "Primoz Roglic", etappeNummer: 4 })).toBe("Roglic wint etappe 4");
  });

  it("geeft null zonder winnaar, zodat de voorpagina de voorbeschouwing kan tonen", () => {
    expect(bouwKop({ gegenereerd: "Prachtige etappe!", winnaar: null })).toBeNull();
    expect(bouwKop({})).toBeNull();
  });
});
