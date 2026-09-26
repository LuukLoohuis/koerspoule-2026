import { describe, expect, it } from "vitest";
import {
  bouwGameStatus,
  isWijzigbaar,
  koersbalkPil,
  meermarathonSeizoenGames,
  meermarathonSeizoenJaar,
  mmDag,
  mmFase,
  mmKorteDatum,
  mmMoment,
  vandaagIso,
  volgendeWedstrijd,
  type MmGameLite,
  type MmWedstrijd,
} from "./meermarathonSeizoen";

const game = (over: Partial<MmGameLite> = {}): MmGameLite => ({
  id: "g-v",
  name: "Meermarathon Vrouwen 2026-2027",
  year: 2026,
  status: "open_inschrijving",
  game_type: "meermarathon",
  categorie: "vrouwen",
  ...over,
});

const wedstrijd = (over: Partial<MmWedstrijd>): MmWedstrijd => ({
  id: `s-${over.stage_number ?? 1}`,
  game_id: "g-v",
  stage_number: 1,
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

describe("seizoen", () => {
  it("pakt de twee games van één seizoen, vrouwen eerst", () => {
    const games = [
      game({ id: "m", categorie: "mannen" }),
      game({ id: "tour", game_type: "tdf", categorie: null }),
      game({ id: "v", categorie: "vrouwen" }),
      game({ id: "oud", year: 2025, categorie: "vrouwen" }),
    ];
    expect(meermarathonSeizoenGames(games, 2026).map((g) => g.id)).toEqual(["v", "m"]);
  });

  it("volgt het seizoen van de gekozen game, anders het nieuwste", () => {
    const games = [game({ year: 2025 }), game({ year: 2026 }), game({ game_type: "giro", year: 2027 })];
    expect(meermarathonSeizoenJaar(games, games[0])).toBe(2025);
    expect(meermarathonSeizoenJaar(games, games[2])).toBe(2026);
    expect(meermarathonSeizoenJaar([], null)).toBeNull();
  });
});

describe("fase", () => {
  it("telt een lege conceptploeg niet als inschrijving", () => {
    expect(mmFase(null)).toBe("niet-ingeschreven");
    expect(mmFase({ id: "e", status: "draft", teamName: null, picks: 0 })).toBe("niet-ingeschreven");
    expect(mmFase({ id: "e", status: "draft", teamName: null, picks: 3 })).toBe("onvolledig");
    expect(mmFase({ id: "e", status: "submitted", teamName: "X", picks: 5 })).toBe("ingeschreven");
  });

  it("sluit wijzigen bij locked, live en finished", () => {
    expect(isWijzigbaar("open_inschrijving")).toBe(true);
    expect(isWijzigbaar("live")).toBe(false);
    expect(isWijzigbaar("finished")).toBe(false);
  });
});

describe("volgende wedstrijd", () => {
  const lijst = [
    wedstrijd({ stage_number: 1, date: "2026-10-31", results_status: "approved" }),
    wedstrijd({ stage_number: 2, date: "2026-11-07" }),
    wedstrijd({ stage_number: 3, date: "2026-11-14" }),
    wedstrijd({ stage_number: 9, is_gc: true, date: "2026-11-08" }),
  ];

  it("neemt vandaag of later, en slaat het eindklassement over", () => {
    expect(volgendeWedstrijd(lijst, "2026-11-08")?.stage_number).toBe(3);
    expect(volgendeWedstrijd(lijst, "2026-11-07")?.stage_number).toBe(2);
  });

  it("valt zonder data terug op de eerste zonder uitslag", () => {
    const zonder = [wedstrijd({ stage_number: 1, results_status: "approved" }), wedstrijd({ stage_number: 2 })];
    expect(volgendeWedstrijd(zonder, "2026-11-08")?.stage_number).toBe(2);
  });
});

describe("koersbalk", () => {
  const status = (over: Parameters<typeof bouwGameStatus>[0]["entry"], g: Partial<MmGameLite> = {}, date = "2026-11-14") =>
    bouwGameStatus({
      game: game(g),
      entry: over,
      vereist: 5,
      wedstrijden: [wedstrijd({ stage_number: 3, date })],
      klassement: null,
      puntenPerWedstrijd: new Map(),
      vandaag: "2026-11-10",
    });

  it("zegt Ingeschreven, Ploeg 3/5 of Inschrijving open", () => {
    expect(koersbalkPil(status({ id: "e", status: "submitted", teamName: "X", picks: 5 }), "2026-11-10").tekst).toBe("Ingeschreven");
    expect(koersbalkPil(status({ id: "e", status: "draft", teamName: null, picks: 3 }), "2026-11-10").tekst).toBe("Ploeg 3/5");
    expect(koersbalkPil(status(null), "2026-11-10")).toEqual({ tekst: "Inschrijving open", soort: "open" });
    expect(koersbalkPil(status(null, { status: "live" }), "2026-11-10").tekst).toBe("Meekijken");
  });

  it("meldt Live alleen op de wedstrijddag van een live game", () => {
    const ingeschreven = { id: "e", status: "submitted", teamName: "X", picks: 5 };
    expect(koersbalkPil(status(ingeschreven, { status: "live" }, "2026-11-10"), "2026-11-10").soort).toBe("live");
    expect(koersbalkPil(status(ingeschreven, { status: "open" }, "2026-11-10"), "2026-11-10").tekst).toBe("Vandaag");
  });

  it("geeft alleen een deadline zolang wijzigen mag", () => {
    const sluit = "2026-11-13T22:59:00Z";
    expect(status(null, { registration_closes_at: sluit }).deadline).toBeInstanceOf(Date);
    expect(status(null, { registration_closes_at: sluit, status: "live" }).deadline).toBeNull();
  });
});

describe("opmaak", () => {
  it("schrijft data zoals de rest van de app", () => {
    expect(mmDag("2026-11-14")).toBe("za 14 nov");
    expect(mmKorteDatum("2026-11-14")).toBe("14 nov");
    expect(mmDag(null)).toBe("n.t.b.");
    expect(mmMoment(new Date(2026, 10, 13, 23, 59))).toBe("vr 13 nov, 23:59");
    expect(vandaagIso(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
