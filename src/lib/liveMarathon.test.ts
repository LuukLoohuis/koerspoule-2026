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
  groepsNaam,
  groepsRol,
  groepsKopje,
  virtueleUitslag,
  type LiveGroup,
  type LiveRider,
  type RawStandDoc,
  type RiderPlacing,
  type PointsSchema,
} from "@/lib/liveMarathon";
import fixture from "@/test/fixtures/livemarathon-haaksbergen.json";

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

// ── Echte brondata ─────────────────────────────────────────────────────────
// Onderstaande fixture is de letterlijke DDP-payload van Haaksbergen
// (Marathon Inline Cup 4). Testen op verzonnen data zou de eigenaardigheden
// van de bron missen: getallen als string, beennummers met voorloopnul, en
// rijders met ronde-achterstand die een lágere kloktijd hebben dan de leider.
describe("echte payload van Haaksbergen", () => {
  const riders = fixture.stand
    .map((d) => normalizeRider(d as RawStandDoc))
    .filter((r): r is NonNullable<typeof r> => r !== null);

  it("leest alle 25 rijders in", () => {
    expect(fixture.stand).toHaveLength(25);
    expect(riders).toHaveLength(25);
  });

  it("geeft dezelfde volgorde als de website", () => {
    const top5 = sortStandings(riders).slice(0, 5);
    expect(top5.map((r) => `${r.beennummer} ${r.naam}`)).toEqual([
      "134 Jorian ten Cate",
      "032 Kevin van der Horst",
      "023 Casper de Gier",
      "538 Joël Haasjes",
      "007 Luc ter Haar",
    ]);
  });

  it("laat een rijder op ronde-achterstand niet omhoog vallen door zijn lagere kloktijd", () => {
    const sorted = sortStandings(riders);
    const hoolwerf = sorted.findIndex((r) => r.beennummer === "214");
    const cate = sorted.findIndex((r) => r.beennummer === "134");
    // Hoolwerf staat op 43:18.285 tegenover 46:06.353 van de leider, maar heeft
    // 17 ronden tegen 18: hij hoort dus áchter de hele kopgroep.
    expect(hoolwerf).toBeGreaterThan(cate);
    expect(sorted[hoolwerf].aantalRonden).toBe(17);
    expect(sorted[13].beennummer).toBe("214");
  });

  it("herkent de grootste ronde-groep als peloton", () => {
    // 13 van de 25 rijders zitten op 18 ronden.
    expect(pelotonLaps(riders)).toBe(18);
  });

  it("zet rijders met ronde-achterstand op een negatieve tier", () => {
    const groups = buildGroups(riders);
    const tiers = new Map(
      groups.flatMap((g) => g.leden.map((l) => [l.rider.beennummer, l.tier] as const)),
    );
    expect(tiers.get("134")).toBe(0);   // peloton-ronde, kopgroep
    expect(tiers.get("214")).toBe(-1);  // één ronde achter
    expect(tiers.get("184")).toBe(-2);  // twee ronden achter
    expect(tiers.get("165")).toBe(-14); // ver terug
  });

  it("normaliseert de string-getallen uit het race-document", () => {
    const race = normalizeRace(fixture.race);
    expect(race.totaalRonden).toBe(21);
    expect(race.rondeLengte).toBe(1800);
    expect(race.rondenTeGaan).toBe(2);
    expect(race.aantalRijders).toBe(25);
    expect(race.snelsteRondeNaam).toBe("Ronald Haasjes");
  });

  it("slaat de premies plat en laat de lege plekken vallen", () => {
    const premies = fixture.premies
      .map((p) => normalizePremie(p as never))
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .sort((a, b) => a.volgnr - b.volgnr);
    expect(premies.map((p) => p.volgnr)).toEqual([1, 2, 3]);
    // Nr4..Nr10 zijn null en horen te verdwijnen.
    expect(premies.every((p) => p.posities.length === 3)).toBe(true);
    expect(premies[0].posities[0].naam).toBe("Ronald Haasjes");
  });

  it("koppelt op relatienummer, ook bij een afwijkend geschreven naam", () => {
    const ariens = riders.find((r) => r.beennummer === "005")!;
    expect(ariens.naam).toBe("Crispijn Ariëns");
    const match = matchRider(ariens, [
      { id: "juist", name: "Crispijn Ariens", knsbRelatienummer: "10154217" },
      { id: "fout", name: "Crispijn Ariëns", knsbRelatienummer: "99999999" },
    ]);
    expect(match?.id).toBe("juist");
  });
});

describe("groepsRol", () => {
  const groep = (n: number, tier = 0): LiveGroup => ({
    index: 0,
    tier,
    gapToPrev: null,
    leden: Array.from({ length: n }, (_, i): RiderPlacing => ({
      rider: { beennummer: String(i), naam: `R${i}` } as LiveRider,
      positie: i + 1,
      tier,
      gapInGroup: 0,
    })),
  });

  it("geeft alles vóór het peloton dezelfde rol", () => {
    // Kopgroep en eerste achtervolgers krijgen één kleur; het onderscheid
    // zit in de naam, niet in het palet.
    const g = [groep(3), groep(5), groep(20)];
    expect(groepsRol(g, 0)).toBe("kop");
    expect(groepsRol(g, 1)).toBe("kop");
    expect(groepsRol(g, 2)).toBe("peloton");
  });

  it("noemt alles ná het peloton gelost", () => {
    const g = [groep(20), groep(4), groep(2)];
    expect(groepsRol(g, 1)).toBe("gelost");
    expect(groepsRol(g, 2)).toBe("gelost");
  });

  it("houdt een groep met ronde-voorsprong bij de kop", () => {
    // Dit is de kern van de kleurkeuze: +1 en +2 ronden krijgen géén eigen
    // kleur meer, dat verschil staat als badge naast het schijfje.
    const g = [groep(2, 2), groep(3, 1), groep(30)];
    expect(groepsRol(g, 0)).toBe("kop");
    expect(groepsRol(g, 1)).toBe("kop");
  });

  it("valt terug op peloton bij een onbekende index", () => {
    expect(groepsRol([], 0)).toBe("peloton");
  });
});

describe("groepsKopje", () => {
  const groep = (n: number, tier = 0): LiveGroup => ({
    index: 0,
    tier,
    gapToPrev: null,
    leden: Array.from({ length: n }, (_, i): RiderPlacing => ({
      rider: { beennummer: String(i), naam: `R${i}` } as LiveRider,
      positie: i + 1,
      tier,
      gapInGroup: 0,
    })),
  });

  it("laat het ronde-verschil uit de naam weg", () => {
    const g = [groep(2, 2), groep(30)];
    expect(groepsNaam(g, 0)).toBe("Kopgroep · +2");
    expect(groepsKopje(g, 0)).toBe("Kopgroep");
  });

  it("laat een naam zonder verschil ongemoeid", () => {
    const g = [groep(3), groep(20)];
    expect(groepsKopje(g, 1)).toBe("Peloton");
  });
});

describe("groepsNaam", () => {
  const groep = (n: number, tier = 0): LiveGroup => ({
    index: 0,
    tier,
    gapToPrev: null,
    leden: Array.from({ length: n }, (_, i): RiderPlacing => ({
      rider: { beennummer: String(i), naam: `R${i}` } as LiveRider,
      positie: i + 1,
      tier,
      gapInGroup: 0,
    })),
  });

  it("noemt de grootste groep het peloton", () => {
    const g = [groep(3), groep(20), groep(4)];
    expect(groepsNaam(g, 1)).toBe("Peloton");
  });

  it("noemt alles vóór het peloton kop", () => {
    const g = [groep(3), groep(5), groep(20)];
    expect(groepsNaam(g, 0)).toBe("Kopgroep");
    expect(groepsNaam(g, 1)).toBe("Eerste achtervolgers");
  });

  it("noemt alles ná het peloton gelost", () => {
    const g = [groep(20), groep(4), groep(2)];
    expect(groepsNaam(g, 1)).toBe("Gelost");
    expect(groepsNaam(g, 2)).toBe("Gelost");
  });

  it("noemt één enkele groep het peloton, niet de kopgroep", () => {
    // Rijdt het veld samen, dan is er geen kopgroep om over te praten.
    expect(groepsNaam([groep(44)], 0)).toBe("Peloton");
  });

  it("noemt het peloton geen achtervolgers als er één groepje voorligt", () => {
    // Dit ging eerder mis: op index 1 stond altijd "Eerste achtervolgers".
    const g = [groep(4), groep(38)];
    expect(groepsNaam(g, 1)).toBe("Peloton");
  });

  it("laat een ronde voorsprong voorgaan op de indeling", () => {
    const g = [groep(2, 2), groep(30)];
    expect(groepsNaam(g, 0)).toBe("Kopgroep · +2");
  });

  it("gaat om met een lege lijst", () => {
    expect(groepsNaam([], 0)).toBe("Groep");
  });
});

describe("virtueleUitslag", () => {
  const plaatsing = (positie: number, been: string): RiderPlacing => ({
    rider: { beennummer: been, naam: `Rijder ${been}` } as LiveRider,
    positie,
    tier: 0,
    gapInGroup: 0,
  });

  const schema: PointsSchema = new Map([[1, 50], [2, 40], [3, 32]]);

  it("sorteert op positie en kent de punten uit het schema toe", () => {
    const r = virtueleUitslag([plaatsing(3, "c"), plaatsing(1, "a"), plaatsing(2, "b")], {
      schema,
      mineRiderIds: new Set(),
      riderIdByBeennummer: new Map(),
    });
    expect(r.map((x) => x.positie)).toEqual([1, 2, 3]);
    expect(r.map((x) => x.punten)).toEqual([50, 40, 32]);
  });

  it("geeft 0 punten buiten het schema", () => {
    const r = virtueleUitslag([plaatsing(21, "z")], {
      schema,
      mineRiderIds: new Set(),
      riderIdByBeennummer: new Map(),
    });
    expect(r[0].punten).toBe(0);
  });

  it("markeert je eigen rijders via de beennummer-koppeling", () => {
    const r = virtueleUitslag([plaatsing(1, "a"), plaatsing(2, "b")], {
      schema,
      mineRiderIds: new Set(["rider-a"]),
      riderIdByBeennummer: new Map([["a", "rider-a"]]),
    });
    expect(r[0].isMine).toBe(true);
    expect(r[1].isMine).toBe(false);
  });

  it("kapt af op de limiet", () => {
    const veel = Array.from({ length: 44 }, (_, i) => plaatsing(i + 1, String(i)));
    expect(virtueleUitslag(veel, { schema, mineRiderIds: new Set(), riderIdByBeennummer: new Map() })).toHaveLength(20);
  });

  it("gaat om met een leeg veld", () => {
    expect(virtueleUitslag([], { schema, mineRiderIds: new Set(), riderIdByBeennummer: new Map() })).toEqual([]);
  });
});
