import { describe, expect, it } from "vitest";
import { bouwKalender } from "./meermarathonKalender";
import { bouwGameStatus, type MmWedstrijd } from "./meermarathonSeizoen";

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
  aantal_rondes: null,
  distance_km: null,
  ...over,
});

const status = (id: string, categorie: string, wedstrijden: MmWedstrijd[], punten = new Map<string, number>()) =>
  bouwGameStatus({
    game: { id, name: id, year: 2026, status: "live", game_type: "meermarathon", categorie },
    entry: { id: `e-${id}`, status: "submitted", teamName: "X", picks: 5 },
    vereist: 5,
    wedstrijden,
    klassement: null,
    puntenPerWedstrijd: punten,
    vandaag: "2026-11-10",
  });

describe("wedstrijdkalender", () => {
  const vrouwen = status("v", "vrouwen", [
    w("v", 1, { date: "2026-10-31", aantal_rondes: 80, results_status: "approved" }),
    w("v", 3, { date: "2026-11-14", aantal_rondes: 80 }),
    w("v", 6, { date: "2027-01-09", ijs_type: "natuurijs", wedstrijd_type: "grandprix", distance_km: 60 }),
    w("v", 8, { ijs_type: "natuurijs", wedstrijd_type: "onk" }),
    w("v", 9, { date: "2027-02-06", wedstrijd_type: "nk", aantal_rondes: 100 }),
  ], new Map([["v-1", 54]]));
  const mannen = status("m", "mannen", [
    w("m", 1, { date: "2026-10-31", aantal_rondes: 125, results_status: "approved" }),
    w("m", 3, { date: "2026-11-14", aantal_rondes: 125 }),
    w("m", 6, { date: "2027-01-09", ijs_type: "natuurijs", wedstrijd_type: "grandprix", distance_km: 100 }),
    w("m", 8, { ijs_type: "natuurijs", wedstrijd_type: "onk" }),
    w("m", 9, { date: "2027-02-06", wedstrijd_type: "nk", aantal_rondes: 150 }),
  ]);

  const rijen = bouwKalender([vrouwen, mannen], "v");

  it("zet vrouwen en mannen van dezelfde avond op één regel", () => {
    expect(rijen).toHaveLength(5);
    expect(rijen[0]).toMatchObject({ label: "Cup 1", detail: "Kunstijs · 80 / 125 ronden", date: "2026-10-31" });
    expect(rijen[2].detail).toBe("Natuurijs · 60 / 100 km");
  });

  it("houdt de volgorde van de wedstrijdnummers, ook zonder datum", () => {
    expect(rijen.map((r) => r.label)).toEqual(["Cup 1", "Cup 3", "Grand Prix 6", "ONK", "NK"]);
    expect(rijen[3]).toMatchObject({ date: null, detail: "Natuurijs · als het vriest" });
  });

  it("toont punten en Volgende van de bekeken game", () => {
    expect(rijen[0].punten).toBe(54);
    expect(rijen[1]).toMatchObject({ punten: null, volgende: true });
    expect(bouwKalender([vrouwen, mannen], "m")[0].punten).toBe(0); // uitslag binnen, niets gescoord
  });
});
