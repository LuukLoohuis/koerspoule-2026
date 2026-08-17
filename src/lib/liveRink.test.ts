import { describe, expect, it } from "vitest";
import {
  clampTier,
  LANE_WIDTH,
  offsetFromCenter,
  placeRiders,
  rinkPath,
  tierLabel,
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

  it("zet rijders met ronde-voorsprong op een eigen baan naar buiten", () => {
    const places = placeRiders([groep(2, "a"), groep(1, "b"), groep(0, "c"), groep(-1, "d")]);
    const offset = (b: string) => places.find((p) => p.beennummer === b)!.offset;
    // Zigzag is gelijk voor de eerste van elke groep, dus de banen zijn
    // onderling vergelijkbaar: hoger tier ligt verder naar buiten.
    expect(offset("a")).toBeGreaterThan(offset("b"));
    expect(offset("b")).toBeGreaterThan(offset("c"));
    expect(offset("c")).toBeGreaterThan(offset("d"));
    expect(offset("a") - offset("b")).toBeCloseTo(LANE_WIDTH, 5);
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
