import { describe, expect, it } from "vitest";
import {
  clampTier,
  LANE_WIDTH,
  BAAN_OFFSETS,
  baanPositie,
  FINISH_PUNT,
  OMTREK,
  offsetFromCenter,
  placeRiders,
  rinkPath,
  tierLabel,
  rolColor,
  rolTekstColor,
  rondeBadge,
  tiersPresent,
  PATH_KUNSTIJS,
  PATH_NATUURIJS,
} from "@/lib/liveRink";

const groep = (tier: number, ...beennummers: string[]) => ({
  tier,
  leden: beennummers.map((b) => ({ rider: { beennummer: b } })),
});

describe("baanvorm", () => {
  it("kiest de 400m-ovaal voor kunstijs en de standaardlus voor natuurijs", () => {
    expect(rinkPath("kunstijs")).toBe(PATH_KUNSTIJS);
    expect(rinkPath("natuurijs")).toBe(PATH_NATUURIJS);
  });

  it("valt terug op de ovaal als het ijstype nog niet is ingesteld", () => {
    expect(rinkPath(null)).toBe(PATH_KUNSTIJS);
    expect(rinkPath(undefined)).toBe(PATH_KUNSTIJS);
  });
});

describe("plaatsing op de baan", () => {
  it("houdt elke fractie binnen 0..1, ook als groepen voorbij de start draaien", () => {
    const groups = Array.from({ length: 8 }, (_, i) => groep(0, `g${i}`));
    for (const rotation of [0, 0.3, 0.75, 0.99]) {
      const places = placeRiders(groups, { rotation });
      for (const p of places) {
        expect(p.fraction).toBeGreaterThanOrEqual(0);
        expect(p.fraction).toBeLessThan(1);
      }
    }
  });

  it("houdt iedereen binnen de breedte van de baan", () => {
    // Ronde-voorsprong krijgt géén eigen ring meer. Met de echte positie uit
    // `meter` rijden die rijders al ergens anders op het ovaal; een extra ring
    // duwde ze buiten het ijs.
    const places = placeRiders([groep(2, "a"), groep(1, "b"), groep(0, "c"), groep(-1, "d")]);
    for (const p of places) {
      expect(BAAN_OFFSETS).toContain(p.offset);
    }
  });

  it("geeft rijders in dezelfde groep zichtbaar verschillende plekken", () => {
    // In werkelijkheid schelen ze tienden van seconden; op de baan zouden ze
    // dan samenvallen tot één stip.
    const places = placeRiders([groep(0, "a", "b", "c", "d")]);
    const fracties = places.map((p) => p.fraction);
    expect(new Set(fracties).size).toBe(4);
    // Volgorde blijft kloppen: elke volgende rijder ligt verder terug.
    for (let i = 1; i < fracties.length; i++) {
      expect(fracties[i]).toBeLessThan(fracties[i - 1]);
    }
  });

  it("zet opeenvolgende groepen uit elkaar in plaats van op één hoek", () => {
    const places = placeRiders([groep(0, "kop"), groep(0, "tweede"), groep(0, "derde")]);
    const f = (b: string) => places.find((p) => p.beennummer === b)!.fraction;
    expect(f("kop")).toBeGreaterThan(f("tweede"));
    expect(f("tweede")).toBeGreaterThan(f("derde"));
  });

  it("knijpt extreme ronde-verschillen af zodat de banen leesbaar blijven", () => {
    expect(clampTier(14)).toBe(3);
    expect(clampTier(-14)).toBe(-3);
    expect(clampTier(2)).toBe(2);
  });
});

describe("hulpfuncties", () => {
  it("verschuift een punt naar buiten, weg van het middelpunt", () => {
    const buiten = offsetFromCenter({ x: 276, y: 112 }, 10, { x: 176, y: 112 });
    expect(buiten.x).toBeCloseTo(286, 5);
    expect(buiten.y).toBeCloseTo(112, 5);
    const binnen = offsetFromCenter({ x: 276, y: 112 }, -10, { x: 176, y: 112 });
    expect(binnen.x).toBeCloseTo(266, 5);
  });

  it("sorteert de aanwezige ronde-banen van voor naar achter", () => {
    expect(tiersPresent([groep(0, "a"), groep(2, "b"), groep(-1, "c"), groep(2, "d")]))
      .toEqual([2, 0, -1]);
  });

  it("benoemt de banen in het enkelvoud of meervoud", () => {
    expect(tierLabel(2)).toBe("2 ronden voor");
    expect(tierLabel(1)).toBe("1 ronde voor");
    expect(tierLabel(0)).toBe("peloton");
    expect(tierLabel(-1)).toBe("1 ronde achter");
    expect(tierLabel(-3)).toBe("3 ronden achter");
  });
});

const rijder = (been: string, meter: number | null) => ({ rider: { beennummer: been, meter } });

describe("placeRiders", () => {
  it("zet een rijder op zijn echte plek in de ronde", () => {
    // 100 m in een ronde van 400 m is een kwart rond.
    const p = placeRiders([{ tier: 0, leden: [rijder("01", 100)] }], { rondeLengte: 400 });
    expect(p[0].fraction).toBeCloseTo(0.25, 5);
  });

  it("spreidt een veld over het hele ovaal in plaats van één boog", () => {
    const leden = [rijder("01", 20), rijder("02", 200), rijder("03", 380)];
    const p = placeRiders([{ tier: 0, leden }], { rondeLengte: 400 });
    const fracties = p.map((x) => x.fraction).sort((a, b) => a - b);
    expect(fracties[fracties.length - 1] - fracties[0]).toBeGreaterThan(0.8);
  });

  it("valt terug op een nette spreiding zonder meters", () => {
    const p = placeRiders([{ tier: 0, leden: [rijder("01", null), rijder("02", null)] }], { rondeLengte: 400 });
    expect(p[0].fraction).not.toBe(p[1].fraction);
    expect(p.every((x) => x.fraction >= 0 && x.fraction < 1)).toBe(true);
  });

  it("valt ook terug als de rondelengte ontbreekt", () => {
    const p = placeRiders([{ tier: 0, leden: [rijder("01", 100)] }]);
    expect(p[0].fraction).toBeGreaterThanOrEqual(0);
    expect(p[0].fraction).toBeLessThan(1);
  });

  it("houdt fracties binnen 0..1 bij meer dan een hele ronde", () => {
    const p = placeRiders([{ tier: 0, leden: [rijder("01", 900)] }], { rondeLengte: 400 });
    expect(p[0].fraction).toBeGreaterThanOrEqual(0);
    expect(p[0].fraction).toBeLessThan(1);
    expect(p[0].fraction).toBeCloseTo(0.25, 5);
  });

  it("waaiert een pak over de breedte van de baan uit", () => {
    // Drie rijders op vrijwel dezelfde plek moeten drie verschillende banen
    // krijgen, anders vallen de schijfjes op elkaar.
    const leden = [rijder("01", 100), rijder("02", 101), rijder("03", 102)];
    const offsets = placeRiders([{ tier: 0, leden }], { rondeLengte: 400 }).map((p) => p.offset);
    expect(new Set(offsets).size).toBe(3);
  });

  it("knijpt het aantal banen af", () => {
    expect(clampTier(9)).toBe(3);
    expect(clampTier(-9)).toBe(-3);
  });
});

describe("baanPositie", () => {
  it("legt fractie 0 op de finish, aan het eind van een recht stuk", () => {
    const p = baanPositie(0);
    expect(p.x).toBeCloseTo(FINISH_PUNT.x, 3);
    expect(p.y).toBeCloseTo(FINISH_PUNT.y, 3);
  });

  it("rijdt linksom: vanaf de finish de bocht in en omhoog", () => {
    // Een klein stukje na de finish moet de rijder hoger op het scherm staan
    // (kleinere y) en verder naar rechts -- dat is de rechterbocht omhoog.
    const na = baanPositie(0.05);
    expect(na.y).toBeLessThan(FINISH_PUNT.y);
    expect(na.x).toBeGreaterThan(FINISH_PUNT.x);
  });

  it("komt na een halve ronde aan de andere kant uit", () => {
    const halve = baanPositie(0.5);
    expect(halve.x).toBeLessThan(400);
    expect(halve.y).toBeLessThan(200);
  });

  it("is rond: fractie 0 en 1 vallen samen", () => {
    const a = baanPositie(0);
    const b = baanPositie(1);
    expect(b.x).toBeCloseTo(a.x, 6);
    expect(b.y).toBeCloseTo(a.y, 6);
  });

  it("houdt negatieve en te grote fracties binnen de baan", () => {
    for (const f of [-0.3, 1.7, 12.25]) {
      const p = baanPositie(f);
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(800);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(400);
    }
  });

  it("legt een positieve offset naar buiten, weg van het midden", () => {
    // Op het onderste rechte stuk is naar buiten omlaag op het scherm.
    expect(baanPositie(0.9, 26).y).toBeGreaterThan(baanPositie(0.9, 0).y);
    // In de bocht is naar buiten verder van het middelpunt.
    const binnen = baanPositie(0.1, 0);
    const buiten = baanPositie(0.1, 26);
    expect(Math.hypot(buiten.x - 600, buiten.y - 200)).toBeGreaterThan(
      Math.hypot(binnen.x - 600, binnen.y - 200),
    );
  });

  it("heeft een omtrek die klopt met twee rechte stukken en twee bochten", () => {
    expect(OMTREK).toBeCloseTo(2 * 400 + 2 * Math.PI * 150, 6);
  });
});

describe("rolColor", () => {
  it("geeft elke rol één vaste kleur", () => {
    expect(rolColor("kop")).toBe("#e2a11b");
    expect(rolColor("peloton")).toBe("#2f6ba8");
    expect(rolColor("gelost")).toBe("#c0392b");
  });

  it("zet donkere tekst op geel, wit op de rest", () => {
    // Wit op #e2a11b haalt geen leesbaar contrast; daar moet het cijfer donker.
    expect(rolTekstColor("kop")).toBe("#3a2703");
    expect(rolTekstColor("peloton")).toBe("#ffffff");
    expect(rolTekstColor("gelost")).toBe("#ffffff");
  });
});

describe("badge per groep", () => {
  it("markeert alleen de eerste rijder van elke groep", () => {
    // Anders krijgt een gelost groepje van tien rijders tien keer "−1".
    const p = placeRiders([
      { tier: 1, leden: [rijder("01", 100), rijder("02", 90)] },
      { tier: 0, leden: [rijder("03", 80), rijder("04", 70)] },
    ], { rondeLengte: 400 });
    expect(p.map((x) => x.eersteInGroep)).toEqual([true, false, true, false]);
  });
});

describe("rondeBadge", () => {
  it("geeft niets terug zonder ronde-verschil", () => {
    // Een gewone koers hoort helemaal zonder badges te blijven.
    expect(rondeBadge(0)).toBeNull();
  });

  it("schrijft voorsprong met een plus", () => {
    expect(rondeBadge(1)).toBe("+1");
    expect(rondeBadge(2)).toBe("+2");
  });

  it("schrijft achterstand met een echt minteken", () => {
    expect(rondeBadge(-1)).toBe("\u22121");
  });
});
