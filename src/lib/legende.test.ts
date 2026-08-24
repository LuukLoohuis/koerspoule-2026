import { describe, expect, it } from "vitest";
import { legendeDelen, legendeKicker, legendeBron } from "@/lib/legende";

describe("legendeDelen", () => {
  it("zet een korte opening vooraan en het hele verhaal erachter", () => {
    const { teaser, rest, meer } = legendeDelen("Eerste stuk.\n\nTweede stuk.\n\nDerde stuk.");
    expect(teaser).toBe("Eerste stuk.");
    expect(rest).toEqual(["Eerste stuk.", "Tweede stuk.", "Derde stuk."]);
    expect(meer).toBe(true);
  });

  it("laat niets uitklappen bij een verhaal van één korte alinea", () => {
    expect(legendeDelen("Alleen dit.")).toEqual({
      teaser: "Alleen dit.",
      rest: ["Alleen dit."],
      meer: false,
    });
  });

  it("kort één lange alinea in tot een opening", () => {
    // Dit ging mis: een geplakt verhaal van één alinea stond compleet
    // dichtgeklapt in de kolom en er viel niets te lezen achter de knop.
    const lang =
      "Ávila. De Vuelta rijdt richting Ávila en Frank Vandenbroucke heeft die ochtend maar één doel: winnen. " +
      "Het wordt een bedevaartsoord voor VDB-fans. La Doyenne was sportief gezien misschien wel de mooiste prestatie, " +
      "maar de Vuelta van '99 was op zich het mooiste verhaal.";
    const { teaser, meer } = legendeDelen(lang);
    expect(teaser.length).toBeLessThanOrEqual(195);
    expect(teaser.endsWith("…")).toBe(true);
    expect(meer).toBe(true);
  });

  it("haalt de sterretjes van nadruk weg", () => {
    // Een verhaal kan geplakt zijn; dan hoort **zo** niet op het scherm.
    expect(legendeDelen("Een **held** op de fiets.").teaser).toBe("Een held op de fiets.");
  });

  it("houdt de opening kort ook als er lege regels in staan", () => {
    const tekst =
      "Eerste alinea die vrij lang is en doorloopt tot ver voorbij de tweehonderd tekens, " +
      "want zo schrijft een mens nu eenmaal als hij eenmaal op dreef is en niet meer stopt " +
      "met typen voordat het hele verhaal eruit is.\n\nTweede alinea.";
    const { teaser, rest } = legendeDelen(tekst);
    expect(teaser.endsWith("…")).toBe(true);
    expect(rest).toHaveLength(2);
  });

  it("splitst ook op enkele regeleindes", () => {
    // Zonder deze terugval telt een verhaal met enkele regeleindes als één
    // alinea en staat het compleet dichtgeklapt op de voorpagina.
    const tekst = [
      "Federico Bahamontes, bijgenaamd de Adelaar van Toledo, was een legendarische Spaanse wielrenner.",
      "Tijdens de Tour van 1954 reed hij als eerste naar de top van een col.",
      "Daar kreeg hij een lekke band.",
    ].join("\n");
    const { teaser, rest } = legendeDelen(tekst);
    expect(teaser).toBe(
      "Federico Bahamontes, bijgenaamd de Adelaar van Toledo, was een legendarische Spaanse wielrenner.",
    );
    // De staart wordt één blok: tien alinea's van één zin lezen als een lijstje.
    expect(rest).toEqual([
      "Federico Bahamontes, bijgenaamd de Adelaar van Toledo, was een legendarische Spaanse wielrenner.",
      "Tijdens de Tour van 1954 reed hij als eerste naar de top van een col. Daar kreeg hij een lekke band.",
    ]);
  });

  it("plakt korte openingszinnen aan elkaar tot een leesbare intro", () => {
    const { teaser } = legendeDelen("Kort.\nOok kort.\nNog steeds kort.\nEn dan de rest van het verhaal.");
    expect(teaser.startsWith("Kort. Ook kort.")).toBe(true);
  });

  it("houdt lege regels voor als die er zijn", () => {
    const { teaser, rest } = legendeDelen("Kop van het stuk.\nZelfde alinea.\n\nNieuwe alinea.");
    expect(teaser).toBe("Kop van het stuk. Zelfde alinea.");
    expect(rest).toEqual(["Kop van het stuk. Zelfde alinea.", "Nieuwe alinea."]);
  });

  it("gaat om met lege invoer", () => {
    expect(legendeDelen("")).toEqual({ teaser: "", rest: [], meer: false });
    expect(legendeDelen(null)).toEqual({ teaser: "", rest: [], meer: false });
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
