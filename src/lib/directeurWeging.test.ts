import { describe, expect, it } from "vitest";
import { directeurRuw, directeurWeging, wegingPct, WEGING_MET_JOKERS, WEGING_ZONDER_JOKERS } from "./directeurWeging";

const som = (w: typeof WEGING_MET_JOKERS) => w.pool + w.monkey + w.joker + w.diff;

describe("weging van het Wielerdirecteur-cijfer", () => {
  it("telt met en zonder jokers op tot het hele cijfer", () => {
    expect(som(WEGING_MET_JOKERS)).toBeCloseTo(1);
    expect(som(WEGING_ZONDER_JOKERS)).toBeCloseTo(1);
  });

  it("laat de jokers weg bij een game zonder jokers", () => {
    expect(directeurWeging(true)).toBe(WEGING_MET_JOKERS);
    expect(directeurWeging(false)).toEqual({ pool: 0.55, monkey: 0.3, joker: 0, diff: 0.15 });
  });

  it("rekent het voorbeeld uit de uitleg na", () => {
    // #8 van 50, 72% apen, jokers 64/100 pt, diff 0.55
    const delen = { pool: 42 / 49, monkey: 0.72, joker: 0.3 + 0.64 * 0.7, diff: 0.55 };
    expect(directeurRuw(delen, WEGING_MET_JOKERS)).toBeCloseTo(0.77, 2);
    expect(directeurRuw(delen, WEGING_ZONDER_JOKERS)).toBeCloseTo(0.77, 2);
  });

  it("laat een joker-deelscore zonder jokers niets uitmaken", () => {
    const zonder = { pool: 0.5, monkey: 0.5, joker: 0, diff: 0.5 };
    expect(directeurRuw(zonder, WEGING_ZONDER_JOKERS)).toBe(directeurRuw({ ...zonder, joker: 1 }, WEGING_ZONDER_JOKERS));
  });

  it("schrijft de weging als heel percentage", () => {
    expect([0.45, 0.25, 0.2, 0.1, 0.55, 0.3, 0.15].map(wegingPct)).toEqual([45, 25, 20, 10, 55, 30, 15]);
  });
});
