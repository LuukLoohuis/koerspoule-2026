import { describe, expect, it } from "vitest";
import { buildGroups, groepsNaam, isUitKoers, pelotonBinnen, type LiveRider } from "./liveMarathon";
import {
  baanPositie,
  BAAN_B,
  GAT_MIN,
  GROUP_SPREAD,
  gatOpBaan,
  groepsGat,
  labelBreedte,
  placeRiders,
  plaatsLabels,
  rondeTijdSeconden,
  type Vak,
} from "./liveRink";
import fixture from "@/test/fixtures/livemarathon-utrecht-beloften.json";

type Rij = {
  beennummer: string;
  naam: string;
  aantal_ronden: number;
  aantal_ronden_kop: number | null;
  tijd_sort: number | null;
  tijd: string | null;
  finished: boolean;
};

function rijders(rijen: Rij[]): LiveRider[] {
  return rijen.map((r) => ({
    beennummer: r.beennummer,
    shownummer: null,
    relatienummer: null,
    naam: r.naam,
    sponsor: null,
    aantalRonden: r.aantal_ronden,
    aantalRondenKop: r.aantal_ronden_kop,
    meter: 0,
    tijdSort: r.tijd_sort,
    tijd: r.tijd,
    lap: null,
    sectie: null,
    fastest: null,
    groep: null,
    punten: null,
    finished: r.finished,
  }));
}

const halverwege = rijders(fixture.ronde43 as Rij[]);
const finish = rijders(fixture.finish as Rij[]);

const indeling = (riders: LiveRider[]) => {
  const groups = buildGroups(riders);
  return groups.map((g, i) => [groepsNaam(groups, i), g.leden.length]);
};

const achternaam = (r: LiveRider) => r.naam.split(" ").slice(-1)[0];

describe("groepen in Utrecht, Cup 2 Beloften (24-10-2026)", () => {
  it("halverwege: vijf uitlopers op één kaart, het peloton, wie eraf is en wie uit koers is", () => {
    expect(indeling(halverwege)).toEqual([
      ["Uitlopers · +1", 5],
      ["Peloton", 59],
      ["Achterblijvers", 2],
      ["Uit koers", 4],
    ]);
  });

  it("halverwege: wie twintig ronden reed staat niet als −22 op de baan", () => {
    const groups = buildGroups(halverwege);
    const uit = groups.find((g) => g.soort === "uitKoers")!;
    // Ter Hoeve reed 41 ronden terwijl de uitlopers op 43 zaten: bij de bron grijs.
    expect(uit.leden.map((l) => achternaam(l.rider))).toEqual(["Hoeve", "Verbeek", "Groenheiden", "Boer"]);
    const opBaan = placeRiders(groups.filter((g) => g.soort !== "uitKoers"));
    expect(opBaan.map((p) => p.beennummer)).not.toContain(uit.leden[3].rider.beennummer);
  });

  it("na de finish is het peloton binnen", () => {
    expect(pelotonBinnen(halverwege)).toBe(false);
    expect(pelotonBinnen(finish)).toBe(true);
  });

  it("na de finish: de uitlopers staan op +1 en niet op +6, het peloton sprintte af", () => {
    expect(indeling(finish)).toEqual([
      ["Uitlopers · +1", 2],
      ["Kopgroep", 2],
      ["Achtervolgers", 2],
      ["Peloton", 14],
      ["Achterblijvers", 21],
      ["Uit koers", 29],
    ]);
    const groups = buildGroups(finish);
    expect(groups[0].leden.map((l) => achternaam(l.rider))).toEqual(["Has", "Verduijn"]);
    expect(groups[1].leden.map((l) => achternaam(l.rider))).toEqual(["Vries", "Wiersma"]);
    expect(groups[2].leden.map((l) => achternaam(l.rider))).toEqual(["Garcia", "Berkhout"]);
    expect(groepsGat(groups, 0)).toBe("+1 ronde");
  });

  it("na de finish volgt de uitslag de klassering van de bron: Ferraz Garcia vijfde, niet Mulder", () => {
    const top = buildGroups(finish)
      .flatMap((g) => g.leden)
      .sort((a, b) => a.positie - b.positie)
      .slice(0, 6)
      .map((l) => achternaam(l.rider));
    expect(top).toEqual(["Has", "Verduijn", "Vries", "Wiersma", "Garcia", "Berkhout"]);
  });

  it.each([340, 460, 800])("namen van eigen rijders raken elkaar niet op een baan van %i px", (breedte) => {
    // Has en De Vries rijden vooraan vlak achter elkaar: op een telefoon vielen
    // hun namen over elkaar.
    const groups = buildGroups(finish);
    const plekken = placeRiders(groups.filter((g) => g.soort !== "uitKoers"));
    const schaal = breedte / BAAN_B;
    const mijn = ["040", "036", "005", "176"];
    const items = plekken
      .filter((p) => mijn.includes(p.beennummer))
      .map((p) => {
        const xy = baanPositie(p.fraction, p.offset);
        return { sleutel: p.beennummer, x: xy.x * schaal, y: xy.y * schaal, b: labelBreedte("Verduijn") };
      });
    const labels = [...plaatsLabels(items, { b: breedte, h: breedte / 2 }).values()];
    const raakt = (a: Vak, b: Vak) =>
      a.left < b.left + b.b && b.left < a.left + a.b && a.top < b.top + b.h && b.top < a.top + a.h;
    for (let i = 0; i < labels.length; i++)
      for (let j = i + 1; j < labels.length; j++) expect(raakt(labels[i], labels[j])).toBe(false);
    for (const l of labels) {
      expect(l.left).toBeGreaterThanOrEqual(0);
      expect(l.left + l.b).toBeLessThanOrEqual(breedte);
    }
  });

  it("uit koers houdt zijn plek in de stand", () => {
    const placings = buildGroups(finish).flatMap((g) => g.leden);
    expect(placings).toHaveLength(70);
    expect(new Set(placings.map((l) => l.positie)).size).toBe(70);
    const boer = placings.find((l) => achternaam(l.rider) === "Boer")!;
    expect(boer.positie).toBe(70);
  });
});

describe("gat tussen groepen op de baan", () => {
  it("leest de rondetijd van de bron", () => {
    expect(rondeTijdSeconden("32.730")).toBeCloseTo(32.73);
    expect(rondeTijdSeconden("1:05.719")).toBeCloseTo(65.719);
    expect(rondeTijdSeconden(null)).toBeNull();
    expect(rondeTijdSeconden("—")).toBeNull();
  });

  it("volgt de tijd: 4,1 s op een ronde van 32,7 s is een achtste van de baan", () => {
    expect(gatOpBaan(4.1, 32.73)).toBeCloseTo(0.125, 2);
    expect(gatOpBaan(0.5, 32.73)).toBe(GAT_MIN);
    expect(gatOpBaan(4.1, null)).toBe(GROUP_SPREAD);
    expect(gatOpBaan(null, 32.73)).toBe(GROUP_SPREAD);
  });

  it("zet een kopgroep op 4,1 s ook zo ver voor het peloton", () => {
    const rijder = (b: string) => ({ rider: { beennummer: b } });
    const groups = [
      { tier: 0, gapToPrev: null, leden: [rijder("1"), rijder("2")] },
      { tier: 0, gapToPrev: 4.1, leden: [rijder("3"), rijder("4"), rijder("5")] },
    ];
    const p = new Map(placeRiders(groups, { rondeTijd: 32.73 }).map((x) => [x.beennummer, x.fraction]));
    expect(p.get("2")! - p.get("3")!).toBeCloseTo(4.1 / 32.73, 3);
    const zonder = new Map(placeRiders(groups).map((x) => [x.beennummer, x.fraction]));
    expect(zonder.get("2")! - zonder.get("3")!).toBeCloseTo(GROUP_SPREAD, 3);
  });

  it("past het veld altijd rond de baan, ook met grote gaten", () => {
    const rijder = (b: string) => ({ rider: { beennummer: b } });
    const groups = Array.from({ length: 6 }, (_, g) => ({
      tier: 0,
      gapToPrev: g === 0 ? null : 30,
      leden: Array.from({ length: 10 }, (_, i) => rijder(`${g}-${i}`)),
    }));
    const f = placeRiders(groups, { rondeTijd: 32.73 }).map((x) => x.fraction);
    // Van de kop rugwaarts gemeten: niemand mag de kop weer inhalen.
    const kop = f[0];
    const achter = f.map((x) => (((kop - x) % 1) + 1) % 1);
    expect(Math.max(...achter)).toBeLessThan(0.95);
  });
});

describe("uit koers zoals de bron het grijs zet", () => {
  // Vrouwen, Utrecht, 24-10-2026, leider in ronde 17. Bij de bron zwart:
  // Fransen op één ronde. Grijs: Van Gammeren (twee), Boonstra (vier) en een
  // transponder zonder naam (twaalf).
  const r = (naam: string, ronden: number, finished = false): LiveRider => ({
    beennummer: naam,
    shownummer: null,
    relatienummer: null,
    naam,
    sponsor: null,
    aantalRonden: ronden,
    aantalRondenKop: ronden,
    meter: 0,
    tijdSort: 1,
    tijd: null,
    lap: null,
    sectie: null,
    fastest: null,
    groep: 0,
    punten: 0,
    finished,
  });
  const leider = r("Cox", 17);

  it.each([
    ["Fransen", 16, false],
    ["Van Gammeren", 15, true],
    ["Boonstra", 13, true],
    ["CV-07249", 5, true],
  ])("%s met %i ronden: uit koers %s", (naam, ronden, verwacht) => {
    expect(isUitKoers(r(naam, ronden), leider, 17)).toBe(verwacht);
  });

  it("wie gefinisht is, is nooit uit koers", () => {
    expect(isUitKoers(r("Binnen", 10, true), leider, 17)).toBe(false);
  });

  it("met uitlopers op twee ronden blijft het peloton in koers", () => {
    expect(isUitKoers(r("Peloton", 15), r("Uitloper", 17), 15)).toBe(false);
    expect(isUitKoers(r("Gedubbeld", 14), r("Uitloper", 17), 15)).toBe(true);
  });
});
