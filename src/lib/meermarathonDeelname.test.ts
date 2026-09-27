import { describe, expect, it } from "vitest";
import { bewaarDeelname, deelnameOpties, deelnameSleutel, leesDeelname } from "./meermarathonDeelname";
import { bouwGameStatus, type MmEntry, type MmWedstrijd } from "./meermarathonSeizoen";

const cup = (game_id: string, stage_number: number, date: string | null): MmWedstrijd => ({
  id: `${game_id}-${stage_number}`,
  game_id,
  stage_number,
  name: null,
  date,
  status: null,
  is_gc: false,
  results_status: null,
  ijs_type: "kunstijs",
  wedstrijd_type: "cup",
  aantal_rondes: null,
  distance_km: null,
});

const ingediend: MmEntry = { id: "e", status: "submitted", teamName: "X", picks: 5 };

const peloton = (
  id: "v" | "m",
  over: { entry?: MmEntry | null; status?: string; wedstrijden?: MmWedstrijd[]; vereist?: number } = {},
) =>
  bouwGameStatus({
    game: {
      id,
      name: id,
      year: 2026,
      status: over.status ?? "open_inschrijving",
      game_type: "meermarathon",
      categorie: id === "v" ? "vrouwen" : "mannen",
    },
    entry: over.entry ?? null,
    vereist: over.vereist ?? 5,
    wedstrijden: over.wedstrijden ?? [cup(id, 2, "2026-11-07"), cup(id, 1, "2026-10-31"), cup(id, 8, null)],
    klassement: null,
    puntenPerWedstrijd: new Map(),
    vandaag: "2026-10-01",
  });

describe("kaarten", () => {
  it("zegt per peloton hoe groot de ploeg is en wanneer het begint", () => {
    expect(deelnameOpties([peloton("v"), peloton("m", { vereist: 1, wedstrijden: [cup("m", 1, null)] })])).toEqual([
      {
        id: "v",
        label: "Vrouwen",
        categorie: "vrouwen",
        ploeg: "Ploeg van vijf rijders",
        kalender: "3 wedstrijden · vanaf 31 okt",
        ingeschreven: false,
        gesloten: false,
      },
      {
        id: "m",
        label: "Mannen",
        categorie: "mannen",
        ploeg: "Ploeg van één rijder",
        kalender: "1 wedstrijd",
        ingeschreven: false,
        gesloten: false,
      },
    ]);
    expect(deelnameOpties([peloton("v", { wedstrijden: [], vereist: 0 })])[0]).toMatchObject({
      ploeg: "Eigen ploeg",
      kalender: "De kalender volgt",
    });
  });

  it("weet wat dicht is en waar je al meedoet", () => {
    const opties = deelnameOpties([peloton("v", { entry: ingediend }), peloton("m", { status: "locked" })]);
    expect(opties.map((o) => [o.ingeschreven, o.gesloten])).toEqual([
      [true, false],
      [false, true],
    ]);
    // De beheerder mag altijd bouwen.
    expect(deelnameOpties([peloton("m", { status: "locked" })], true)[0].gesloten).toBe(false);
  });
});

describe("opslag", () => {
  const opslag = () => {
    const data = new Map<string, string>();
    return {
      data,
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    };
  };

  it("bewaart de keuze per speler per seizoen", () => {
    const o = opslag();
    const sleutel = deelnameSleutel("u1", 2026);
    expect(sleutel).not.toBe(deelnameSleutel("u2", 2026));
    expect(sleutel).not.toBe(deelnameSleutel("u1", 2027));
    expect(deelnameSleutel(null, 2026)).toContain("gast");
    bewaarDeelname(o, sleutel, ["v", "m"]);
    expect(leesDeelname(o, sleutel)).toEqual(["v", "m"]);
    expect(leesDeelname(o, deelnameSleutel("u2", 2026))).toBeNull();
  });

  it("leest rommel als 'nog niet gekozen'", () => {
    const o = opslag();
    o.data.set("a", "geen json");
    o.data.set("b", JSON.stringify({ v: true }));
    o.data.set("c", JSON.stringify([1, "", null]));
    expect(leesDeelname(o, "a")).toBeNull();
    expect(leesDeelname(o, "b")).toBeNull();
    expect(leesDeelname(o, "c")).toBeNull();
    expect(leesDeelname(null, "a")).toBeNull();
  });

  it("overleeft een browser die opslag weigert", () => {
    const dicht = {
      getItem: () => {
        throw new Error("geblokkeerd");
      },
      setItem: () => {
        throw new Error("geblokkeerd");
      },
    };
    expect(leesDeelname(dicht, "a")).toBeNull();
    expect(() => bewaarDeelname(dicht, "a", ["v"])).not.toThrow();
  });
});
