import { describe, expect, it } from "vitest";
import {
  buildGroups,
  matchRider,
  normalizeName,
  normalizePremie,
  normalizeRace,
  normalizeRider,
  pelotonLaps,
  projectPoints,
  sortStandings,
  type LiveRider,
  type RawStandDoc,
} from "@/lib/liveMarathon";

/** Bouw een live rijder; tijd in seconden voor leesbaarheid (bron: ms). */
function rider(
  beennummer: string,
  naam: string,
  ronden: number,
  seconden: number,
  extra: Partial<LiveRider> = {},
): LiveRider {
  return {
    beennummer,
    shownummer: beennummer,
    relatienummer: null,
    naam,
    sponsor: null,
    aantalRonden: ronden,
    aantalRondenKop: ronden,
    meter: null,
    tijdSort: Math.round(seconden * 1000),
    tijd: null,
    lap: null,
    sectie: null,
    fastest: null,
    groep: null,
    punten: null,
    finished: false,
    ...extra,
  };
}

describe("normalisatie van de DDP-documenten", () => {
  it("leest een stand-document met gemengde string- en getaltypes", () => {
    // Exact zoals de bron 'm levert: Beennummer is een string met voorloopnul,
    // AantalRonden een getal.
    const doc: RawStandDoc = {
      Beennummer: "033",
      Shownummer: "033",
      Relatienummer: "10156648",
      Naam: "Ronald Haasjes",
      Sponsor: "Team Haasjes",
      AantalRonden: 17,
      AantalRondenKop: 17,
      Meter: 0,
      TijdSort: 2599725,
      Tijd: "43:19.725",
      Groep: 0,
      Punten: 0,
      Finished: false,
    };
    const r = normalizeRider(doc);
    expect(r).not.toBeNull();
    expect(r!.beennummer).toBe("033");
    expect(r!.relatienummer).toBe("10156648");
    expect(r!.aantalRonden).toBe(17);
    expect(r!.tijdSort).toBe(2599725);
    expect(r!.finished).toBe(false);
  });

  it("weigert een rijder zonder beennummer of naam", () => {
    expect(normalizeRider({ Naam: "Zonder nummer" })).toBeNull();
    expect(normalizeRider({ Beennummer: "12" })).toBeNull();
  });

  it("zet de string-getallen uit races om naar echte nummers", () => {
    const race = normalizeRace({
      TotaalAantalRonden: "21",
      RondeLengte: "1800",
      RondebordRonden: "2",
      NrRijders: "25",
      SnelsteRondeNr: "5",
      RaceTime: "1:21:17",
      GemiddeldeRondeSnelheid: "42,2km/u",
    });
    expect(race.totaalRonden).toBe(21);
    expect(race.rondeLengte).toBe(1800);
    expect(race.rondenTeGaan).toBe(2);
    expect(race.aantalRijders).toBe(25);
    expect(race.snelsteRondeNr).toBe(5);
    expect(race.raceTime).toBe("1:21:17");
    // Snelheid blijft tekst: de bron gebruikt een komma als decimaalteken.
    expect(race.gemRondeSnelheid).toBe("42,2km/u");
  });

  it("slaat Nr1..Nr10 plat en laat lege premieplekken vallen", () => {
    const p = normalizePremie({
      Volgnr: 3,
      Ronde: 0,
      AantalRonden: 1,
      Vastgesteld: true,
      Nr1: "134", Naam1: "Jorian ten Cate",
      Nr2: "032", Naam2: "Kevin van der Horst",
      Nr3: "166", Naam3: "Ruben Ligtenberg",
      Nr4: null, Naam4: "",
      Nr5: null, Naam5: "",
    });
    expect(p).not.toBeNull();
    expect(p!.volgnr).toBe(3);
    expect(p!.vastgesteld).toBe(true);
    expect(p!.posities).toHaveLength(3);
    expect(p!.posities[0]).toEqual({ positie: 1, beennummer: "134", naam: "Jorian ten Cate" });
  });
});

describe("klassement", () => {
  it("sorteert op ronden vóór tijd, zodat een rijder op achterstand niet omhoog valt", () => {
    // De rijder met een ronde achterstand heeft de LAAGSTE kloktijd. Zou je op
    // tijd sorteren, dan stond hij bovenaan — precies de val die we vermijden.
    const veld = [
      rider("214", "Bart Hoolwerf", 17, 2598.2),
      rider("134", "Jorian ten Cate", 18, 2766.3),
      rider("032", "Kevin van der Horst", 18, 2777.0),
    ];
    expect(sortStandings(veld).map((r) => r.naam)).toEqual([
      "Jorian ten Cate",
      "Kevin van der Horst",
      "Bart Hoolwerf",
    ]);
  });

  it("neemt de grootste groep als peloton, niet de kopgroep", () => {
    const veld = [
      rider("1", "Kop A", 17, 100),
      rider("2", "Kop B", 17, 100.4),
      rider("3", "Pel A", 15, 160),
      rider("4", "Pel B", 15, 160.3),
      rider("5", "Pel C", 15, 160.8),
      rider("6", "Pel D", 15, 161.1),
    ];
    expect(pelotonLaps(veld)).toBe(15);
  });

  it("splitst het veld op ronde-verschil én op een tijdgat binnen dezelfde ronde", () => {
    const veld = [
      // 2 ronden voor
      rider("134", "Kop een", 17, 2462.1),
      rider("033", "Kop twee", 17, 2462.4),
      // 1 ronde voor
      rider("538", "Tussen een", 16, 2480.0),
      rider("023", "Tussen twee", 16, 2480.3),
      // peloton
      rider("511", "Pel een", 15, 2504.2),
      rider("405", "Pel twee", 15, 2504.5),
      // zelfde ronde, maar 30 s eraf gereden → eigen groep
      rider("184", "Los een", 15, 2534.9),
    ];
    const groups = buildGroups(veld);
    expect(groups.map((g) => g.leden.length)).toEqual([2, 2, 2, 1]);
    expect(groups.map((g) => g.tier)).toEqual([2, 1, 0, 0]);
    // Binnen dezelfde ronde is het gat een tijd; over een ronde-grens niet.
    expect(groups[1].gapToPrev).toBeNull();
    expect(groups[3].gapToPrev).toBeCloseTo(30.4, 1);
  });

  it("houdt één groep heel als iedereen dicht bij elkaar rijdt", () => {
    const veld = [
      rider("1", "A", 15, 100),
      rider("2", "B", 15, 100.5),
      rider("3", "C", 15, 101.2),
    ];
    const groups = buildGroups(veld);
    expect(groups).toHaveLength(1);
    expect(groups[0].leden.map((l) => l.positie)).toEqual([1, 2, 3]);
    expect(groups[0].leden[2].gapInGroup).toBeCloseTo(1.2, 1);
  });

  it("geeft een leeg veld geen groepen", () => {
    expect(buildGroups([])).toEqual([]);
  });
});

describe("virtuele punten", () => {
  const schema = new Map([[1, 25], [2, 20], [3, 16], [4, 13], [5, 11]]);

  it("telt alleen eigen rijders en verdubbelt de joker", () => {
    const veld = [
      rider("134", "Mijn kopman", 15, 100),
      rider("032", "Andermans rijder", 15, 100.5),
      rider("538", "Mijn tweede", 15, 101),
    ];
    const groups = buildGroups(veld);
    const placings = groups.flatMap((g) => g.leden);

    const p = projectPoints(placings, {
      schema,
      riderIdByBeennummer: new Map([["134", "r1"], ["032", "r2"], ["538", "r3"]]),
      mineRiderIds: new Set(["r1", "r3"]),
      jokerRiderIds: new Set(["r1"]),
    });

    expect(p.rijders.map((r) => r.rider.naam)).toEqual(["Mijn kopman", "Mijn tweede"]);
    expect(p.rijders[0].punten).toBe(50); // plek 1 = 25, joker ×2
    expect(p.rijders[1].punten).toBe(16); // plek 3
    expect(p.ritPunten).toBe(66);
  });

  it("scoort niets buiten plek 20 — net als calculate_stage_scores", () => {
    const veld = Array.from({ length: 22 }, (_, i) =>
      rider(String(i + 1), `Rijder ${i + 1}`, 15, 100 + i * 0.4),
    );
    const placings = buildGroups(veld).flatMap((g) => g.leden);
    const laatste = placings[placings.length - 1];
    expect(laatste.positie).toBe(22);

    const p = projectPoints(placings, {
      schema: new Map([[21, 99], [22, 99]]), // zelfs mét schema mag dit niet tellen
      riderIdByBeennummer: new Map([[laatste.rider.beennummer, "r-last"]]),
      mineRiderIds: new Set(["r-last"]),
    });
    expect(p.rijders[0].basis).toBe(0);
    expect(p.ritPunten).toBe(0);
  });
});

describe("rennerkoppeling", () => {
  it("koppelt op KNSB-relatienummer, ook als de naam anders geschreven is", () => {
    const live = rider("033", "R. Haasjes", 15, 100, { relatienummer: "10156648" });
    const match = matchRider(live, [
      { id: "a", name: "Iemand anders", knsbRelatienummer: "999" },
      { id: "b", name: "Ronald Haasjes", knsbRelatienummer: "10156648" },
    ]);
    expect(match?.id).toBe("b");
  });

  it("valt terug op de naam als het relatienummer ontbreekt", () => {
    const live = rider("005", "Crispijn Ariëns", 15, 100);
    const match = matchRider(live, [{ id: "c", name: "crispijn ariens" }]);
    expect(match?.id).toBe("c");
  });

  it("koppelt niet bij twee gelijke namen — liever niets dan een gokje", () => {
    const live = rider("016", "Jan Haasjes", 15, 100);
    const match = matchRider(live, [
      { id: "x", name: "Jan Haasjes" },
      { id: "y", name: "Jan Haasjes" },
    ]);
    expect(match).toBeNull();
  });

  it("koppelt niet op beennummer: dat wisselt per wedstrijd", () => {
    const live = rider("134", "Onbekende Rijder", 15, 100);
    expect(matchRider(live, [{ id: "z", name: "Andere Naam" }])).toBeNull();
  });

  it("normaliseert diakrieten en leestekens weg", () => {
    expect(normalizeName("Crispijn Ariëns")).toBe("crispijn ariens");
    expect(normalizeName("Sanne in 't Hof")).toBe("sanne in t hof");
  });
});
