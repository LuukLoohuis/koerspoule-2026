import { describe, expect, it } from "vitest";
import { alineas, leestijdMinuten, intro, bronregel, veiligeUrl, telZinnen, LENGTE_MIN, LENGTE_MAX, splitsNadruk, zonderNadruk } from "./verslag";

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

describe("telZinnen", () => {
  it("telt gewone zinnen", () => {
    expect(telZinnen("Van der Poel won. Philipsen werd tweede. Van Aert derde.")).toBe(3);
  });

  it("telt uitroep- en vraagtekens mee", () => {
    expect(telZinnen("Wat een sprint! Wie had dat gedacht? Niemand.")).toBe(3);
  });

  it("telt een afkorting middenin niet als zinseinde", () => {
    // "z.t." staat in elke uitslag; dat mag geen extra zinnen opleveren.
    expect(telZinnen("Philipsen finishte op z.t. van de winnaar.")).toBe(1);
  });

  it("laat zich niet foppen door meerdere leestekens achter elkaar", () => {
    expect(telZinnen("Ongelooflijk!! En toen?? Stilte.")).toBe(3);
  });

  it("telt een zin zonder slotpunt ook mee", () => {
    expect(telZinnen("Pogacar reed weg op de slotklim")).toBe(1);
  });

  it("is nul bij lege invoer", () => {
    expect(telZinnen("")).toBe(0);
    expect(telZinnen("   \n  ")).toBe(0);
  });

  it("herkent een verslag van tien zinnen als binnen bereik", () => {
    const tien = Array.from({ length: 10 }, (_, i) => `Zin nummer ${i + 1}.`).join(" ");
    expect(telZinnen(tien)).toBe(10);
    expect(telZinnen(tien)).toBeLessThanOrEqual(LENGTE_MAX);
    expect(telZinnen(tien)).toBeGreaterThanOrEqual(LENGTE_MIN);
  });
});

describe("telZinnen — koersteksten", () => {
  it("telt initialen niet als zinseinde", () => {
    expect(telZinnen("M. van der Poel won voor J. Philipsen.")).toBe(1);
  });

  it("telt een uitslagregel met z.t. als één zin", () => {
    expect(telZinnen("Philipsen kwam op z.t. binnen. Van Aert volgde op vier tellen.")).toBe(2);
  });

  it("laat afkortingen als bijv. en nr. met rust", () => {
    expect(telZinnen("De favorieten, bijv. Pogacar, bleven uit de wind.")).toBe(1);
    expect(telZinnen("Hij eindigde als nr. drie in de daguitslag.")).toBe(1);
  });

  it("telt wel gewoon door bij een echte zinsovergang", () => {
    expect(telZinnen("Pogacar reed weg op de Angliru. Vingegaard kon niet volgen. Roglic verloor een minuut.")).toBe(3);
  });

  it("telt een zin die op een naam met accent eindigt", () => {
    expect(telZinnen("De zege ging naar Pogačar. Daarna viel het stil.")).toBe(2);
  });
});

describe("splitsNadruk", () => {
  it("haalt een deelnemersnaam eruit", () => {
    expect(splitsNadruk("Vandaag won **Marieke de Groot** de dag.")).toEqual([
      { tekst: "Vandaag won ", vet: false },
      { tekst: "Marieke de Groot", vet: true },
      { tekst: " de dag.", vet: false },
    ]);
  });

  it("kan meerdere namen aan", () => {
    const s = splitsNadruk("**Anna** ging voor **Bram**.");
    expect(s.filter((x) => x.vet).map((x) => x.tekst)).toEqual(["Anna", "Bram"]);
  });

  it("laat tekst zonder opmaak ongemoeid", () => {
    expect(splitsNadruk("Gewoon een zin.")).toEqual([{ tekst: "Gewoon een zin.", vet: false }]);
  });

  it("laat een los sterretje met rust", () => {
    expect(splitsNadruk("Punten * 2 telt dubbel.")).toEqual([{ tekst: "Punten * 2 telt dubbel.", vet: false }]);
  });

  it("laat een niet-gesloten markering staan als tekst", () => {
    expect(splitsNadruk("Halverwege **Anna zonder eind")).toEqual([
      { tekst: "Halverwege **Anna zonder eind", vet: false },
    ]);
  });

  it("levert nooit HTML op, alleen tekststukken", () => {
    // Een geplakt verslag mag nooit als HTML landen; dit blijft platte tekst.
    const stukken = splitsNadruk("Kijk uit: **<img src=x onerror=alert(1)>** einde.");
    expect(stukken.find((s) => s.vet)?.tekst).toBe("<img src=x onerror=alert(1)>");
    expect(stukken.every((s) => typeof s.tekst === "string")).toBe(true);
  });
});

describe("zonderNadruk", () => {
  it("haalt de markeringen weg", () => {
    expect(zonderNadruk("**Anna** pakte 118 punten.")).toBe("Anna pakte 118 punten.");
  });

  it("telt opmaak niet mee in zinnen, leestijd en intro", () => {
    expect(telZinnen("**Anna** won. **Bram** volgde.")).toBe(2);
    expect(intro("**Anna de Vries** pakte de dagzege.")).toBe("Anna de Vries pakte de dagzege.");
  });
});
