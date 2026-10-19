import { describe, expect, it } from "vitest";
import { geslachtVanCategorie } from "../../supabase/functions/_shared/categorie";
import { hoortBijGame } from "./liveMarathon";

describe("geslachtVanCategorie", () => {
  it.each([
    ["Topdivisie Vrouwen", "vrouwen"],
    ["Topdivisie Mannen", "mannen"],
    ["Vrouwen", "vrouwen"],
    ["Mannen", "mannen"],
    ["ONK Dames", "vrouwen"],
    ["Heren", "mannen"],
  ])("%s → %s", (categorie, verwacht) => {
    expect(geslachtVanCategorie(categorie)).toBe(verwacht);
  });

  it.each([
    "masters",
    "alle deelnemers",
    "Startgroep 4",
    "Categorie 5",
    "Mannen en Vrouwen",
    "",
  ])("%s → onbekend", (categorie) => {
    expect(geslachtVanCategorie(categorie)).toBeNull();
  });

  it.each([
    ["Beloften Divisie Mannen", "anders"],
    ["Junioren Vrouwen", "anders"],
    ["Masters Heren", "anders"],
    ["Top Divisie Vrouwen", "vrouwen"],
  ])("%s → %s (andere divisie telt niet als de top)", (categorie, verwacht) => {
    expect(geslachtVanCategorie(categorie)).toBe(verwacht);
  });

  it("geeft onbekend zonder categorie", () => {
    expect(geslachtVanCategorie(null)).toBeNull();
    expect(geslachtVanCategorie(undefined)).toBeNull();
  });
});

describe("hoortBijGame", () => {
  it("houdt de mannenrace weg bij de vrouwengame", () => {
    expect(hoortBijGame("mannen", "vrouwen")).toBe(false);
  });

  it("houdt een beloftenrace weg bij de mannengame", () => {
    expect(hoortBijGame("anders", "mannen")).toBe(false);
  });

  it("toont de race van de eigen categorie", () => {
    expect(hoortBijGame("vrouwen", "vrouwen")).toBe(true);
  });

  it("toont zoals voorheen als een van beide kanten onbekend is", () => {
    expect(hoortBijGame(null, "vrouwen")).toBe(true);
    expect(hoortBijGame("mannen", null)).toBe(true);
    expect(hoortBijGame(undefined, undefined)).toBe(true);
  });
});
