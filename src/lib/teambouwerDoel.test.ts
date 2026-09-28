import { describe, expect, it } from "vitest";
import { teambouwerDoel } from "./teambouwerDoel";

describe("teambouwerDoel", () => {
  const mannen = { id: "m", year: 2026, game_type: "meermarathon" };
  const vrouwen = { id: "v", year: 2026, game_type: "meermarathon" };

  it("bouwt als de keuze en de inschrijfgame gelijk zijn", () => {
    expect(teambouwerDoel(mannen, mannen, true)).toEqual({ soort: "bouwen", gameId: "m" });
    expect(teambouwerDoel(mannen, null, false)).toEqual({ soort: "bouwen", gameId: "m" });
  });

  it("toont het zelf gekozen andere peloton als dat dicht is", () => {
    expect(teambouwerDoel(mannen, vrouwen, true)).toEqual({ soort: "keuze-dicht", gameId: "v" });
  });

  it("volgt de inschrijfgame zonder eigen keuze, of bij een andere koers of ander seizoen", () => {
    expect(teambouwerDoel(mannen, vrouwen, false)).toEqual({ soort: "volg", gameId: "m" });
    expect(teambouwerDoel(mannen, { id: "t", year: 2026, game_type: "tour" }, true)).toEqual({ soort: "volg", gameId: "m" });
    expect(teambouwerDoel(mannen, { ...vrouwen, id: "v25", year: 2025 }, true)).toEqual({ soort: "volg", gameId: "m" });
  });
});
