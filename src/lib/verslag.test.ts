import { describe, expect, it } from "vitest";
import { alineas, leestijdMinuten, intro, bronregel, veiligeUrl } from "./verslag";

describe("alineas", () => {
  it("splitst op lege regels", () => {
    expect(alineas("Eerste stuk.\n\nTweede stuk.")).toEqual(["Eerste stuk.", "Tweede stuk."]);
  });

  it("trekt losse regelafbrekingen binnen een alinea samen", () => {
    expect(alineas("Van der Poel\nsprintte weg.")).toEqual(["Van der Poel sprintte weg."]);
  });

  it("negeert extra witruimte en lege blokken", () => {
    expect(alineas("  Een.  \n\n\n\n   \n\n Twee. ")).toEqual(["Een.", "Twee."]);
  });

  it("levert niets op bij een lege tekst", () => {
    expect(alineas("")).toEqual([]);
    expect(alineas("   \n\n  ")).toEqual([]);
  });
});

describe("leestijdMinuten", () => {
  it("rondt naar boven af", () => {
    expect(leestijdMinuten(Array(201).fill("woord").join(" "))).toBe(2);
  });

  it("is minimaal een minuut voor een korte tekst", () => {
    expect(leestijdMinuten("Kort verslag.")).toBe(1);
  });

  it("is nul zonder tekst", () => {
    expect(leestijdMinuten("   ")).toBe(0);
  });
});

describe("intro", () => {
  it("laat een korte eerste alinea ongemoeid", () => {
    expect(intro("Van der Poel won.\n\nDaarna feest.")).toBe("Van der Poel won.");
  });

  it("knipt op een woordgrens en sluit af met een beletselteken", () => {
    const lang = "Mathieu van der Poel sprintte op de Champs-Elysees naar zijn tweede ritzege van deze Tour en hield daarbij ploeggenoot Jasper Philipsen nipt achter zich in een chaotische massasprint.";
    const kort = intro(lang, 60);
    expect(kort.length).toBeLessThanOrEqual(61);
    expect(kort.endsWith("…")).toBe(true);
    // Geen half woord: het stuk voor het beletselteken staat ook in de bron.
    expect(lang.startsWith(kort.slice(0, -1))).toBe(true);
  });

  it("laat geen leesteken voor het beletselteken staan", () => {
    expect(intro("Pogacar won, Vingegaard volgde op ruime afstand na een lange klim.", 20)).not.toMatch(/[,;:.]…$/);
  });

  it("is leeg bij een lege tekst", () => {
    expect(intro("")).toBe("");
  });
});

describe("bronregel", () => {
  it("schrijft de bron toe", () => {
    expect(bronregel("WielerFlits")).toBe("Met toestemming overgenomen van WielerFlits");
  });

  it("laat de regel weg bij eigen tekst", () => {
    expect(bronregel(null)).toBeNull();
    expect(bronregel("")).toBeNull();
    expect(bronregel("   ")).toBeNull();
  });
});

describe("veiligeUrl", () => {
  it("laat http en https door", () => {
    expect(veiligeUrl("https://wielerflits.nl/nieuws/123")).toBe("https://wielerflits.nl/nieuws/123");
    expect(veiligeUrl(" http://example.org/a ")).toBe("http://example.org/a");
  });

  it("weigert schema's die code kunnen uitvoeren", () => {
    // Een verslag wordt geplakt; een javascript:-link mag nooit in een href komen.
    expect(veiligeUrl("javascript:alert(1)")).toBeNull();
    expect(veiligeUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(veiligeUrl("vbscript:msgbox(1)")).toBeNull();
  });

  it("weigert onzin en leegte", () => {
    expect(veiligeUrl("zomaar tekst")).toBeNull();
    expect(veiligeUrl(null)).toBeNull();
    expect(veiligeUrl("")).toBeNull();
  });
});
