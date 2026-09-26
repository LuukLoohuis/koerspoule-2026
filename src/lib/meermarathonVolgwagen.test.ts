import { describe, expect, it } from "vitest";
import {
  bouwAftelling,
  bouwPloegRijen,
  dagenTussen,
  deadlineBijschrift,
  heeftUitslag,
  ploegActie,
  ploegPunten,
  subpouleRang,
  teambouwerHref,
  volgendeKaart,
  wedstrijdDetail,
  type PloegRijder,
} from "./meermarathonVolgwagen";
import type { MmWedstrijd } from "./meermarathonSeizoen";

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

describe("aftelling", () => {
  const nu = new Date(2026, 10, 11, 17, 18, 0); // wo 11 nov, 17:18

  it("telt af naar het sluitmoment zolang de ploeg nog mag veranderen", () => {
    const deadline = new Date(2026, 10, 13, 23, 59);
    expect(bouwAftelling({ nu, deadline, wijzigbaar: true, wedstrijdDatum: "2026-11-14" })).toEqual({
      soort: "deadline",
      dagen: 2,
      uren: 6,
      minuten: 41,
    });
  });

  it("rondt resterende seconden naar boven af, zodat een open inschrijving niet op 0 staat", () => {
    const deadline = new Date(nu.getTime() + 40_000);
    expect(bouwAftelling({ nu, deadline, wijzigbaar: true, wedstrijdDatum: null })).toEqual({
      soort: "deadline",
      dagen: 0,
      uren: 0,
      minuten: 1,
    });
  });

  it("valt terug op hele dagen tot de wedstrijd als er niets meer te wisselen valt", () => {
    const deadline = new Date(2026, 10, 13, 23, 59);
    expect(bouwAftelling({ nu, deadline, wijzigbaar: false, wedstrijdDatum: "2026-11-14" })).toEqual({ soort: "dagen", dagen: 3 });
    expect(bouwAftelling({ nu, deadline: null, wijzigbaar: true, wedstrijdDatum: "2026-11-14" })).toEqual({ soort: "dagen", dagen: 3 });
  });

  it("negeert een sluitmoment dat al voorbij is", () => {
    const deadline = new Date(2026, 10, 10, 23, 59);
    expect(bouwAftelling({ nu, deadline, wijzigbaar: true, wedstrijdDatum: "2026-11-12" })).toEqual({ soort: "morgen" });
  });

  it("zegt vandaag of morgen in plaats van 0 of 1 dag", () => {
    expect(bouwAftelling({ nu, deadline: null, wijzigbaar: false, wedstrijdDatum: "2026-11-11" })).toEqual({ soort: "vandaag" });
    expect(bouwAftelling({ nu, deadline: null, wijzigbaar: false, wedstrijdDatum: "2026-11-12" })).toEqual({ soort: "morgen" });
  });

  it("telt niet af zonder datum of naar het verleden", () => {
    expect(bouwAftelling({ nu, deadline: null, wijzigbaar: false, wedstrijdDatum: null })).toEqual({ soort: "geen" });
    expect(bouwAftelling({ nu, deadline: null, wijzigbaar: false, wedstrijdDatum: "2026-11-01" })).toEqual({ soort: "geen" });
  });

  it("telt kalenderdagen, ook over de wisseling naar wintertijd", () => {
    expect(dagenTussen("2026-10-24", "2026-10-26")).toBe(2);
    expect(dagenTussen("2026-12-31", "2027-01-01")).toBe(1);
  });
});

describe("volgende wedstrijd", () => {
  it("toont soort, nummer, ondergrond, afstand en dag, zonder locatie of tijd", () => {
    const w = wedstrijd({ stage_number: 3, date: "2026-11-14" });
    expect(volgendeKaart({ volgende: w, wedstrijden: [w] })).toEqual({
      titel: "Cup 3",
      detail: "kunstijs · 80 ronden · za 14 nov",
      gepland: true,
      datum: "2026-11-14",
    });
  });

  it("zegt het eerlijk als een natuurijswedstrijd nog geen datum heeft", () => {
    expect(wedstrijdDetail(wedstrijd({ ijs_type: "natuurijs", distance_km: 60, aantal_rondes: null }))).toBe(
      "natuurijs · 60 km · datum volgt",
    );
  });

  it("onderscheidt een lege kalender van een voorbij seizoen", () => {
    expect(volgendeKaart({ volgende: null, wedstrijden: [] }).titel).toBe("Kalender volgt");
    expect(volgendeKaart({ volgende: null, wedstrijden: [wedstrijd({ results_status: "approved" })] }).titel).toBe("Seizoen voorbij");
  });
});

describe("stand van de ploeg", () => {
  const gereden = wedstrijd({ id: "a", results_status: "approved" });
  const komend = wedstrijd({ id: "b", stage_number: 2 });

  it("heeft zonder goedgekeurde uitslag nog geen punten", () => {
    const status = { wedstrijden: [komend], klassement: null, puntenPerWedstrijd: new Map() };
    expect(heeftUitslag(status)).toBe(false);
    expect(ploegPunten(status)).toBeNull();
  });

  it("neemt de punten uit het klassement, anders de som van de gereden wedstrijden", () => {
    const punten = new Map([["a", 54], ["b", 99]]);
    expect(ploegPunten({ wedstrijden: [gereden, komend], klassement: { rank: 3, totaal: 9, delta: 0, punten: 60 }, puntenPerWedstrijd: punten })).toBe(60);
    expect(ploegPunten({ wedstrijden: [gereden, komend], klassement: null, puntenPerWedstrijd: punten })).toBe(54);
  });

  it("rekent de subpouleplaats alleen onder leden, met gedeelde plaatsen", () => {
    const standen = [
      { id: "e1", user_id: "u1", total_points: 120 },
      { id: "e2", user_id: "u2", total_points: 146 },
      { id: "e3", user_id: "u3", total_points: 146 },
      { id: "e4", user_id: "u4", total_points: 300 }, // geen lid
    ];
    expect(subpouleRang(standen, ["u1", "u2", "u3"], "e3")).toEqual({ rank: 1, totaal: 3 });
    expect(subpouleRang(standen, ["u1", "u2", "u3"], "e1")).toEqual({ rank: 3, totaal: 3 });
    expect(subpouleRang(standen, ["u1"], "e3")).toBeNull();
  });
});

describe("ploegrijen", () => {
  const categorieen = [
    { id: "top", name: "Toppers", max_picks: 1 },
    { id: "spr", name: "Sprinters", max_picks: 1 },
    { id: "tal", name: "Talent", max_picks: 2 },
  ];
  const rijders = new Map<string, PloegRijder>([
    ["r1", { name: "Lotte Bosma", team: "Team Noordelijk IJs" }],
    ["r2", { name: "Iris Kooistra", team: " ", is_vervallen: true }],
    ["r3", { name: "Noor Visser", team: null }],
  ]);

  it("volgt de categorievolgorde en laat open plekken zien", () => {
    const rijen = bouwPloegRijen({
      categorieen,
      picks: [
        { category_id: "tal", rider_id: "r3" },
        { category_id: "top", rider_id: "r1" },
      ],
      rijders,
      punten: new Map([["r1", 54]]),
    });
    expect(rijen.map((r) => [r.nummer, r.soort, r.categorie])).toEqual([
      [1, "rijder", "Toppers"],
      [2, "open", "Sprinters"],
      [3, "rijder", "Talent"],
      [4, "open", "Talent"],
    ]);
    expect(rijen[0]).toMatchObject({ naam: "Lotte Bosma", ploeg: "Team Noordelijk IJs", punten: 54 });
    expect(rijen[2]).toMatchObject({ naam: "Noor Visser", ploeg: null, punten: 0 });
  });

  it("toont geen punten vóór de eerste uitslag, wel een afmelding", () => {
    const rijen = bouwPloegRijen({ categorieen: categorieen.slice(1, 2), picks: [{ category_id: "spr", rider_id: "r2" }], rijders, punten: null });
    expect(rijen[0]).toMatchObject({ punten: null, afgemeld: true, ploeg: null });
  });

  it("zet losse jokers achteraan en telt een joker die al gekozen is niet dubbel", () => {
    const rijen = bouwPloegRijen({
      categorieen: categorieen.slice(0, 1),
      picks: [{ category_id: "top", rider_id: "r1" }],
      jokers: ["r1", "r3"],
      rijders,
      punten: null,
    });
    expect(rijen.map((r) => r.sleutel)).toEqual(["r1", "r3"]);
    expect(rijen[1]).toMatchObject({ categorie: "Joker", nummer: 2 });
  });
});

describe("actie", () => {
  it("biedt alleen iets aan zolang de ploeg mag veranderen", () => {
    expect(ploegActie({ fase: "ingeschreven", gekozen: 5, vereist: 5, wijzigbaar: false })).toBeNull();
    expect(ploegActie({ fase: "ingeschreven", gekozen: 5, vereist: 5, wijzigbaar: true })).toBe("Wissel rijders");
    expect(ploegActie({ fase: "onvolledig", gekozen: 3, vereist: 5, wijzigbaar: true })).toBe("Maak je ploeg af");
    expect(ploegActie({ fase: "onvolledig", gekozen: 5, vereist: 5, wijzigbaar: true })).toBe("Bevestig je ploeg");
    expect(ploegActie({ fase: "niet-ingeschreven", gekozen: 0, vereist: 5, wijzigbaar: true })).toBe("Stel je ploeg samen");
  });

  it("noemt het sluitmoment naar wat er sluit", () => {
    expect(deadlineBijschrift("ingeschreven")).toBe("Wissels sluiten over");
    expect(deadlineBijschrift("onvolledig")).toBe("Inschrijving sluit over");
  });

  it("linkt naar de teambouwer van precies deze game", () => {
    expect(teambouwerHref("g-v")).toBe("/team-samenstellen?game=g-v");
  });
});
