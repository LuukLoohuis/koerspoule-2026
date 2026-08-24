import { describe, expect, it } from "vitest";
import { legendeDelen, legendeKicker, legendeBron } from "@/lib/legende";

describe("legendeDelen", () => {
  it("zet de eerste alinea vooraan en de rest erachter", () => {
    const { teaser, rest } = legendeDelen("Eerste stuk.\n\nTweede stuk.\n\nDerde stuk.");
    expect(teaser).toBe("Eerste stuk.");
    expect(rest).toEqual(["Tweede stuk.", "Derde stuk."]);
  });

  it("laat niets uitklappen bij een verhaal van één alinea", () => {
    expect(legendeDelen("Alleen dit.")).toEqual({ teaser: "Alleen dit.", rest: [] });
  });

  it("haalt de sterretjes van nadruk weg", () => {
    // Een verhaal kan geplakt zijn; dan hoort **zo** niet op het scherm.
    expect(legendeDelen("Een **held** op de fiets.").teaser).toBe("Een held op de fiets.");
  });

  it("gaat om met lege invoer", () => {
    expect(legendeDelen("")).toEqual({ teaser: "", rest: [] });
    expect(legendeDelen(null)).toEqual({ teaser: "", rest: [] });
  });
});

describe("legendeKicker", () => {
  it("plakt het jaartal achter de rubrieknaam", () => {
    expect(legendeKicker("De Legende", "1913")).toBe("De Legende · 1913");
  });

  it("laat de punt weg zonder jaartal", () => {
    expect(legendeKicker("De Legende", null)).toBe("De Legende");
    expect(legendeKicker("De Legende", "  ")).toBe("De Legende");
  });
});

describe("legendeBron", () => {
  it("neemt een losse naam over zonder link", () => {
    expect(legendeBron("Tourarchief")).toEqual({ tekst: "Tourarchief", url: null });
  });

  it("maakt van een url een link zonder protocol in de tekst", () => {
    expect(legendeBron("https://letour.fr/archief")).toEqual({
      tekst: "letour.fr/archief",
      url: "https://letour.fr/archief",
    });
  });

  it("weigert een javascript-url", () => {
    // veiligeUrl laat alleen http(s) door; de rest blijft platte tekst.
    expect(legendeBron("javascript:alert(1)")?.url).toBeNull();
  });

  it("geeft niets terug zonder bron", () => {
    expect(legendeBron("")).toBeNull();
  });
});
