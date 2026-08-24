// De simulatie voedt een weergave die er echt uitziet. Deze tests bewaken dat
// de nagebootste stand dezelfde vorm heeft als de echte feed -- anders werkt
// het tabblad wel op simulatie maar niet op een wedstrijdavond.
import { describe, expect, it } from "vitest";
import { simuleerRijders, simuleerRace, simulatieMijnRiderIds, SIM_MIJN_BEENNUMMERS } from "./liveSimulatie";

describe("simuleerRijders", () => {
  it("levert een volledig veld", () => {
    expect(simuleerRijders(0)).toHaveLength(43);
  });

  it("is deterministisch: dezelfde tick geeft dezelfde stand", () => {
    expect(simuleerRijders(7)).toEqual(simuleerRijders(7));
  });

  it("laat het veld vooruit gaan", () => {
    const vroeg = Math.max(...simuleerRijders(0).map((r) => r.aantalRonden));
    const laat = Math.max(...simuleerRijders(50).map((r) => r.aantalRonden));
    expect(laat).toBeGreaterThan(vroeg);
  });

  it("geeft beennummers met voorloopnul, net als de echte bron", () => {
    expect(simuleerRijders(0)[0].beennummer).toBe("01");
  });

  it("houdt de uitlopers vóór het peloton", () => {
    const r = simuleerRijders(0);
    const uitloper = r[0].aantalRonden;
    const achterste = r[r.length - 1].aantalRonden;
    expect(uitloper).toBeGreaterThan(achterste);
  });
});

describe("simuleerRace", () => {
  it("bouwt één baan met groepen", () => {
    const race = simuleerRace(10);
    expect(race.tracks).toHaveLength(1);
    expect(race.tracks[0].groups.length).toBeGreaterThan(1);
  });

  it("telt de ronden niet verder dan de racelengte", () => {
    const race = simuleerRace(100_000);
    expect(race.tracks[0].state?.maxRonden).toBeLessThanOrEqual(125);
    expect(race.tracks[0].state?.rondenTeGaan).toBeGreaterThanOrEqual(0);
  });

  it("koppelt elk beennummer aan een rider_id", () => {
    const t = simuleerRace(0).tracks[0];
    for (const r of t.riders) expect(t.riderIdByBeennummer.get(r.beennummer)).toBe(`sim-${r.beennummer}`);
  });

  it("markeert de standaardselectie als eigen rijders", () => {
    const t = simuleerRace(0).tracks[0];
    const mijn = simulatieMijnRiderIds(SIM_MIJN_BEENNUMMERS);
    const gevonden = t.riders.filter((r) => mijn.has(t.riderIdByBeennummer.get(r.beennummer) ?? ""));
    expect(gevonden).toHaveLength(SIM_MIJN_BEENNUMMERS.length);
  });

  it("is herkenbaar als simulatie en niet als echte etappe", () => {
    // Zodat een simulatiestand nooit voor een echte uitslag kan doorgaan.
    expect(simuleerRace(0).stageId).toBe("simulatie");
  });
});
