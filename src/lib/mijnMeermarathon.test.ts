import { describe, expect, it } from "vitest";
import { bouwGameStatus, type MmEntry, type MmGameLite, type MmKlassement, type MmWedstrijd } from "./meermarathonSeizoen";
import {
  actueleDeadline,
  deadlineRegel,
  kaartActie,
  kaartPil,
  kalenderGameId,
  klassementStat,
  mijnKop,
  ploegStat,
  telwoord,
  uitnodiging,
  volgendeDeadline,
  volgendeStat,
} from "./mijnMeermarathon";

const NU = new Date(2026, 10, 10, 12, 0);
const SLUIT = new Date(2026, 10, 13, 23, 59);

const w = (game_id: string, stage_number: number, over: Partial<MmWedstrijd> = {}): MmWedstrijd => ({
  id: `${game_id}-${stage_number}`,
  game_id,
  stage_number,
  name: null,
  date: null,
  status: null,
  is_gc: false,
  results_status: null,
  ijs_type: "kunstijs",
  wedstrijd_type: "cup",
  aantal_rondes: 80,
  distance_km: null,
  ...over,
});

const kalender = (id: string, uitslagen = 0) => [
  w(id, 1, { date: "2026-10-31", results_status: uitslagen >= 1 ? "approved" : null }),
  w(id, 2, { date: "2026-11-07", results_status: uitslagen >= 2 ? "approved" : null }),
  w(id, 3, { date: "2026-11-14" }),
];

const ingediend: MmEntry = { id: "e", status: "submitted", teamName: "X", picks: 5 };
const concept = (picks: number): MmEntry => ({ id: "e", status: "draft", teamName: null, picks });

function status(
  categorie: "vrouwen" | "mannen" | null,
  over: {
    entry?: MmEntry | null;
    game?: Partial<MmGameLite>;
    klassement?: MmKlassement | null;
    wedstrijden?: MmWedstrijd[];
    vereist?: number;
  } = {},
) {
  const id = categorie ?? "mm";
  return bouwGameStatus({
    game: {
      id,
      name: id,
      year: 2026,
      status: "open_inschrijving",
      game_type: "meermarathon",
      categorie,
      registration_closes_at: SLUIT.toISOString(),
      ...over.game,
    },
    entry: over.entry ?? null,
    vereist: over.vereist ?? 5,
    wedstrijden: over.wedstrijden ?? kalender(id),
    klassement: over.klassement ?? null,
    puntenPerWedstrijd: new Map(),
    vandaag: "2026-11-10",
  });
}

describe("kop", () => {
  it("zegt in hoeveel games je meerijdt, met het seizoen erbij", () => {
    expect(mijnKop([status("vrouwen", { entry: ingediend }), status("mannen", { entry: concept(3) })])).toEqual({
      zin: "Je rijdt mee in beide games",
      uitnodiging: null,
      seizoen: "2026-2027",
    });
    expect(mijnKop([status("vrouwen", { entry: ingediend }), status("mannen")]).zin).toBe("Je rijdt mee bij de Vrouwen");
  });

  it("nodigt uit als je nergens meedoet, met het echte aantal rijders", () => {
    const kop = mijnKop([status("vrouwen"), status("mannen")]);
    expect(kop.zin).toBe("Twee games, één schaatswinter");
    expect(kop.uitnodiging).toBe("Kies vijf rijders voor de Vrouwen, de Mannen of allebei");
    expect(mijnKop([status("vrouwen", { vereist: 5 }), status("mannen", { vereist: 6 })]).uitnodiging).toBe(
      "Kies je rijders voor de Vrouwen, de Mannen of allebei",
    );
  });

  it("nodigt alleen uit voor games waar instappen nog kan", () => {
    const kop = mijnKop([status("vrouwen", { game: { status: "locked" } }), status("mannen")]);
    expect(kop.uitnodiging).toBe("Kies vijf rijders voor de Mannen");
    const dicht = mijnKop([status("vrouwen", { game: { status: "live" } }), status("mannen", { game: { status: "live" } })]);
    expect(dicht).toMatchObject({ zin: "De inschrijving is gesloten", uitnodiging: null });
  });

  it("telt een lege conceptploeg niet als meedoen", () => {
    expect(mijnKop([status("vrouwen", { entry: concept(0) }), status("mannen")]).zin).toBe("Twee games, één schaatswinter");
  });
});

describe("deadline", () => {
  it("toont alleen een sluitmoment dat nog komt", () => {
    const s = status("vrouwen");
    expect(actueleDeadline(s, NU)).toEqual(SLUIT);
    expect(actueleDeadline(s, new Date(2026, 10, 14))).toBeNull();
    expect(actueleDeadline(status("vrouwen", { game: { status: "locked" } }), NU)).toBeNull();
  });

  it("neemt voor de kop de vroegste deadline", () => {
    const later = new Date(2026, 10, 20, 18, 0);
    const statussen = [status("vrouwen", { game: { registration_closes_at: later.toISOString() } }), status("mannen")];
    expect(volgendeDeadline(statussen, NU)).toEqual(SLUIT);
    expect(volgendeDeadline([status("vrouwen", { game: { registration_closes_at: null } })], NU)).toBeNull();
  });
});

describe("kaart van een game waarin je meedoet", () => {
  it("toont je plek, en de stijging pas vanaf de tweede uitslag", () => {
    const klassement = { rank: 12, totaal: 1204, delta: 4, punten: 92 };
    expect(klassementStat(status("vrouwen", { entry: ingediend, klassement, wedstrijden: kalender("vrouwen", 2) }))).toEqual({
      soort: "stand",
      rang: "12e",
      totaal: "1.204",
      delta: 4,
    });
    expect(klassementStat(status("vrouwen", { entry: ingediend, klassement: { ...klassement, delta: -11 }, wedstrijden: kalender("vrouwen", 1) })))
      .toMatchObject({ delta: null });
  });

  it("zegt eerlijk dat er nog geen klassement is", () => {
    expect(klassementStat(status("vrouwen", { entry: ingediend }))).toEqual({ soort: "leeg", toelichting: "na de eerste uitslag" });
    expect(klassementStat(status("vrouwen", { entry: ingediend, wedstrijden: kalender("vrouwen", 1) }))).toMatchObject({
      toelichting: "nog niet bekend",
    });
  });

  it("telt de rijders van een halve ploeg", () => {
    expect(ploegStat(status("mannen", { entry: concept(3) }))).toEqual({ waarde: "3/5", sub: "nog 2 rijders kiezen" });
    expect(ploegStat(status("mannen", { entry: concept(4) })).sub).toBe("nog 1 rijder kiezen");
    expect(ploegStat(status("mannen", { entry: concept(5) })).sub).toBe("nog bevestigen");
  });

  it("noemt de volgende wedstrijd zonder baan of starttijd", () => {
    expect(volgendeStat(status("vrouwen"), "2026-11-10")).toEqual({ waarde: "Cup 3", sub: "za 14 nov · 80 ronden" });
    expect(volgendeStat(status("vrouwen"), "2026-11-14").sub).toBe("vandaag · 80 ronden");
    expect(volgendeStat(status("vrouwen", { wedstrijden: [] }), "2026-11-10").waarde).toBe("Nog niet bekend");
    expect(volgendeStat(status("vrouwen", { wedstrijden: kalender("vrouwen").slice(0, 2) }), "2026-11-10")).toEqual({
      waarde: "Geen",
      sub: "alle wedstrijden zijn gereden",
    });
  });

  it("geeft wissels tot de inschrijving sluit, en daarna niets", () => {
    expect(deadlineRegel(status("vrouwen", { entry: ingediend }), NU)).toEqual({
      toon: "neutraal",
      voor: "Wissels tot ",
      moment: "vr 13 nov, 23:59",
      na: "",
    });
    expect(deadlineRegel(status("vrouwen", { entry: ingediend, game: { status: "live" } }), NU)).toBeNull();
  });

  it("waarschuwt dat een halve ploeg niet meetelt", () => {
    expect(deadlineRegel(status("mannen", { entry: concept(3) }), NU)).toEqual({
      toon: "alert",
      voor: "Compleet vóór ",
      moment: "vr 13 nov, 23:59",
      na: ", anders tel je niet mee",
    });
    expect(deadlineRegel(status("mannen", { entry: concept(5) }), NU)?.voor).toBe("Bevestig je ploeg vóór ");
    expect(deadlineRegel(status("mannen", { entry: concept(3), game: { status: "locked" } }), NU)).toMatchObject({
      toon: "alert",
      moment: null,
    });
  });

  it("heeft één knop die past bij waar je staat", () => {
    expect(kaartActie(status("vrouwen", { entry: ingediend })).tekst).toBe("Naar je Volgwagen");
    expect(kaartActie(status("mannen", { entry: concept(3) }))).toEqual({ soort: "teambouwer", tekst: "Maak je ploeg af" });
    expect(kaartActie(status("mannen", { entry: concept(5) })).tekst).toBe("Bevestig je ploeg");
    expect(kaartActie(status("mannen", { entry: concept(3), game: { status: "live" } })).soort).toBe("klassement");
  });

  it("zegt in de pil wat er mis is, niet alleen met kleur", () => {
    expect(kaartPil(status("vrouwen", { entry: ingediend })).tekst).toBe("Ingeschreven");
    expect(kaartPil(status("mannen", { entry: concept(3) })).tekst).toBe("Ploeg niet compleet");
    expect(kaartPil(status("mannen", { entry: concept(5) })).tekst).toBe("Nog niet bevestigd");
  });
});

describe("uitnodiging", () => {
  it("vraagt of je ook bij de andere game wilt meedoen", () => {
    expect(uitnodiging(status("mannen"), true, NU)).toEqual({
      titel: "Ook meedoen met de Mannen?",
      tekst: "Eigen ploeg van vijf rijders, eigen klassement. Instappen kan tot vr 13 nov, 23:59.",
      actie: { soort: "teambouwer", tekst: "Schrijf je in voor de Mannen" },
      rondkijken: true,
    });
    expect(uitnodiging(status("vrouwen"), false, NU)).toMatchObject({
      titel: "Doe mee bij de Vrouwen",
      actie: { tekst: "Stel je Vrouwen-ploeg samen" },
    });
  });

  it("belooft geen sluitmoment dat er niet is", () => {
    expect(uitnodiging(status("mannen", { game: { registration_closes_at: null } }), true, NU).tekst).toContain(
      "Instappen kan zolang de inschrijving open is.",
    );
  });

  it("biedt geen inschrijving meer aan als de game dicht is", () => {
    const dicht = uitnodiging(status("mannen", { game: { status: "locked" } }), true, NU);
    expect(dicht).toMatchObject({ titel: "Kijk mee bij de Mannen", actie: { soort: "klassement" }, rondkijken: false });
    expect(uitnodiging(status("mannen", { game: { status: "finished" } }), true, NU).tekst).toMatch(/^Het seizoen zit erop/);
  });
});

describe("kalender", () => {
  const v = status("vrouwen", { entry: ingediend });
  const m = status("mannen");

  it("toont je eigen game, ook als de keuze op een andere staat", () => {
    expect(kalenderGameId([v, m], "vrouwen")).toBe("vrouwen");
    expect(kalenderGameId([v, m], "mannen")).toBe("vrouwen");
    expect(kalenderGameId([status("vrouwen"), m], "mannen")).toBe("mannen");
    expect(kalenderGameId([status("vrouwen"), m], null)).toBe("vrouwen");
    expect(kalenderGameId([], null)).toBeNull();
  });
});

it("schrijft kleine aantallen voluit", () => {
  expect(telwoord(5)).toBe("vijf");
  expect(telwoord(1)).toBe("één");
  expect(telwoord(15)).toBe("15");
});
