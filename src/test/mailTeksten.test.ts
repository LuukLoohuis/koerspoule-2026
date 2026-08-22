// Toetst de aanhef en het escapen in de mailteksten. Beide gaan over inhoud
// die deelnemers zelf bepalen (profielnaam, ploegnaam, ritnaam) en die
// ongefilterd in de HTML van andermans mail belandde.
import { describe, it, expect } from "vitest";
import { aanhef, esc, registratieHtml, ploegIngediendHtml, etappeAfgeslotenHtml } from "../lib/sendEmail";

describe("aanhef", () => {
  it("gebruikt een echte naam", () => {
    expect(aanhef("Luuk")).toBe("Luuk");
    expect(aanhef("  Jan Willem  ")).toBe("Jan Willem");
  });

  it("groet neutraal bij een leeg veld", () => {
    for (const leeg of ["", "   ", null, undefined]) {
      expect(aanhef(leeg)).toBe("koersliefhebber");
    }
  });

  it("zet nooit een mailadres in de aanhef", () => {
    expect(aanhef("johnfransen01@gmail.com")).toBe("koersliefhebber");
    expect(aanhef("  luuk.loohuis@gmail.com ")).toBe("koersliefhebber");
  });

  it("escapet een naam met HTML erin", () => {
    expect(aanhef('<img src=x onerror="alert(1)">')).not.toContain("<img");
  });
});

describe("esc", () => {
  it("neutraliseert de tekens die HTML sturen", () => {
    expect(esc('<script>&"')).toBe("&lt;script&gt;&amp;&quot;");
  });

  it("laat gewone tekst en accenten met rust", () => {
    expect(esc("Vuelta a España — rit 3")).toBe("Vuelta a España — rit 3");
  });
});

describe("mailteksten", () => {
  it("registratie groet met de naam, niet met het adres", () => {
    expect(registratieHtml("Luuk")).toContain("Beste Luuk,");
    expect(registratieHtml("luuk@x.nl")).toContain("Beste koersliefhebber,");
  });

  it("ploeg ingediend toont de ploegnaam vetgedrukt", () => {
    const html = ploegIngediendHtml("Luuk", "Tour de Vuurtoren");
    expect(html).toContain("<strong>Tour de Vuurtoren</strong>");
    expect(html).toContain("Beste Luuk,");
  });

  it("ploeg ingediend valt terug op 'je ploeg' zonder naam", () => {
    for (const leeg of ["", "   ", null, undefined]) {
      expect(ploegIngediendHtml("Luuk", leeg)).toContain("je ploeg is succesvol");
    }
  });

  it("een ploegnaam met HTML komt er niet als HTML in", () => {
    const html = ploegIngediendHtml("Luuk", '<script>alert(1)</script>');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("etappe-mail escapet de ritnaam en groet netjes", () => {
    expect(etappeAfgeslotenHtml("Luuk", 3, "Monaco > Nice")).toContain("Rit 3 — Monaco &gt; Nice");
    expect(etappeAfgeslotenHtml("l@x.nl", 3, null)).toContain("Beste koersliefhebber,");
    expect(etappeAfgeslotenHtml("Luuk", 3, "  ")).toContain("<strong>Rit 3</strong>");
  });
});
