import { describe, it, expect } from "vitest";
import { achternaam, kopNoemtWinnaar, aankomstplaats, bouwKop, kopNoemtPoulenaam } from "./krantKop";

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

describe("krantKop — gevallen uit de echte data", () => {
  it("houdt tussenvoegsels met hoofdletters bij elkaar", () => {
    // Startlijsten schrijven het net zo vaak zo; eerder gaf dit "Poel".
    expect(achternaam("Mathieu Van Der Poel")).toBe("Van Der Poel");
    expect(achternaam("Wout Van Aert")).toBe("Van Aert");
    expect(achternaam("mathieu van der poel")).toBe("van der poel");
  });

  it("snijdt de etappenaam ook op het chevron-teken", () => {
    // "Thoiry › Paris" (U+203A) bleef eerder in zijn geheel staan.
    expect(aankomstplaats("Thoiry › Paris")).toBe("Paris");
    expect(aankomstplaats("Thoiry » Paris")).toBe("Paris");
  });

  it("levert daarmee de juiste kop voor deze etappe", () => {
    expect(bouwKop({ winnaar: "Mathieu Van Der Poel", etappeNaam: "Thoiry › Paris" }))
      .toBe("Van Der Poel wint in Paris");
  });

  it("laat een naam zonder tussenvoegsel met rust", () => {
    expect(achternaam("Tadej Pogacar")).toBe("Pogacar");
    expect(achternaam("Jasper De Buyst")).toBe("De Buyst");
  });
});

describe("kopNoemtPoulenaam", () => {
  it("herkent een ploegnaam in de kop", () => {
    expect(kopNoemtPoulenaam("Pogacar zet JWielerteam op kop", ["JWielerteam"])).toBe(true);
  });

  it("is ongevoelig voor hoofdletters en accenten", () => {
    expect(kopNoemtPoulenaam("Roglic verslaat Team Pogačar", ["team pogacar"])).toBe(true);
  });

  it("laat een zuivere koerskop door", () => {
    expect(kopNoemtPoulenaam("Roglic slaat toe op de Angliru", ["JWielerteam", "Voor de apen"])).toBe(false);
  });

  it("negeert namen korter dan drie tekens", () => {
    // Een ploeg die "AB" heet mag niet elke kop afkeuren.
    expect(kopNoemtPoulenaam("Van Aert wint in Parijs", ["AB", "De"])).toBe(false);
  });

  it("gaat om met lege invoer", () => {
    expect(kopNoemtPoulenaam("", ["JWielerteam"])).toBe(false);
    expect(kopNoemtPoulenaam("Pogacar wint", [null, undefined, ""])).toBe(false);
  });
});

describe("bouwKop weert poulenamen", () => {
  const basis = { winnaar: "Tadej Pogačar", etappeNaam: "Monaco>Monaco", etappeNummer: 1 };

  it("valt terug op het sjabloon als de kop een ploegnaam noemt", () => {
    expect(bouwKop({ ...basis, gegenereerd: "Pogacar zet JWielerteam op kop", poulenamen: ["JWielerteam"] }))
      .toBe("Pogačar wint in Monaco");
  });

  it("houdt de gegenereerde kop als die alleen over de koers gaat", () => {
    expect(bouwKop({ ...basis, gegenereerd: "Pogacar wint de openingstijdrit", poulenamen: ["JWielerteam"] }))
      .toBe("Pogacar wint de openingstijdrit");
  });

  it("werkt zonder poulenamen precies als voorheen", () => {
    expect(bouwKop({ ...basis, gegenereerd: "Pogacar slaat meteen toe" })).toBe("Pogacar slaat meteen toe");
  });
});
