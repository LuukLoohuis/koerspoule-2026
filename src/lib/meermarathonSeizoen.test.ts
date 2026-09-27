import { describe, expect, it } from "vitest";
import {
  bouwGameStatus,
  isWijzigbaar,
  meermarathonSeizoenGames,
  meermarathonSeizoenJaar,
  mmDag,
  mmFase,
  mmKorteDatum,
  mmMoment,
  pelotonRegel,
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

describe("pelotonbalk", () => {
  const ingediend = { id: "e", status: "submitted", teamName: "X", picks: 5 };
  const status = (
    entry: Parameters<typeof bouwGameStatus>[0]["entry"],
    over: { game?: Partial<MmGameLite>; klassement?: Parameters<typeof bouwGameStatus>[0]["klassement"]; date?: string } = {},
  ) =>
    bouwGameStatus({
      game: game(over.game),
      entry,
      vereist: 5,
      wedstrijden: [wedstrijd({ stage_number: 3, date: over.date ?? "2026-11-14" })],
      klassement: over.klassement ?? null,
      puntenPerWedstrijd: new Map(),
      vandaag: "2026-11-10",
    });

  it("noemt je plek zodra er een klassement is", () => {
    const stand = { rank: 12, totaal: 1204, delta: 4, punten: 146 };
    expect(pelotonRegel(status(ingediend, { klassement: stand }), "2026-11-10")).toEqual({
      soort: "meedoen",
      regel: "12e van 1.204",
      moment: null,
    });
    expect(pelotonRegel(status(ingediend), "2026-11-10").regel).toBe("Ingeschreven");
  });

  it("telt een halve ploeg af", () => {
    expect(pelotonRegel(status({ id: "e", status: "draft", teamName: null, picks: 3 }), "2026-11-10")).toMatchObject({
      soort: "let-op",
      regel: "Ploeg 3/5",
    });
  });

  it("nodigt uit zolang instappen kan, en zegt 'ook' als je elders al meedoet", () => {
    expect(pelotonRegel(status(null), "2026-11-10")).toMatchObject({ soort: "uitnodiging", regel: "Doe mee" });
    expect(pelotonRegel(status(null), "2026-11-10", true).regel).toBe("Doe ook mee");
    expect(pelotonRegel(status(null, { game: { status: "live" } }), "2026-11-10")).toMatchObject({
      soort: "meekijken",
      regel: "Meekijken",
    });
  });

  it("meldt live alleen op de wedstrijddag van een live game", () => {
    expect(pelotonRegel(status(ingediend, { game: { status: "live" }, date: "2026-11-10" }), "2026-11-10").moment).toBe("live");
    expect(pelotonRegel(status(ingediend, { game: { status: "live" } }), "2026-11-10").moment).toBeNull();
  });

  it("zegt Vandaag op een wedstrijddag waarop je meedoet", () => {
    expect(pelotonRegel(status(ingediend, { date: "2026-11-10" }), "2026-11-10").moment).toBe("vandaag");
    expect(pelotonRegel(status(null, { date: "2026-11-10" }), "2026-11-10").moment).toBeNull();
  });
});

describe("deadline", () => {
  const status = (g: Partial<MmGameLite>) =>
    bouwGameStatus({
      game: game(g),
      entry: null,
      vereist: 5,
      wedstrijden: [wedstrijd({ stage_number: 3, date: "2026-11-14" })],
      klassement: null,
      puntenPerWedstrijd: new Map(),
      vandaag: "2026-11-10",
    });

  it("geeft alleen een deadline zolang wijzigen mag", () => {
    const sluit = "2026-11-13T22:59:00Z";
    expect(status({ registration_closes_at: sluit }).deadline).toBeInstanceOf(Date);
    expect(status({ registration_closes_at: sluit, status: "live" }).deadline).toBeNull();
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
