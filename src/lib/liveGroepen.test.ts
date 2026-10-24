import { describe, expect, it } from "vitest";
import { buildGroups, groepsNaam, pelotonBinnen, type LiveRider } from "./liveMarathon";
import { baanPositie, BAAN_B, groepsGat, labelBreedte, placeRiders, plaatsLabels, type Vak } from "./liveRink";
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
      ["Achterblijvers", 3],
      ["Uit koers", 3],
    ]);
  });

  it("halverwege: wie twintig ronden reed staat niet als −22 op de baan", () => {
    const groups = buildGroups(halverwege);
    const uit = groups.find((g) => g.soort === "uitKoers")!;
    expect(uit.leden.map((l) => achternaam(l.rider))).toEqual(["Verbeek", "Groenheiden", "Boer"]);
    const opBaan = placeRiders(groups.filter((g) => g.soort !== "uitKoers"));
    expect(opBaan.map((p) => p.beennummer)).not.toContain(uit.leden[2].rider.beennummer);
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
      ["Achterblijvers", 34],
      ["Uit koers", 16],
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
