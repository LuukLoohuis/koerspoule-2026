import { describe, expect, it } from "vitest";
import { gameSeasonName, isMeermarathonGame, meermarathonSeason } from "./gameTypes";

describe("Meermarathon game type", () => {
  it("recognises the game type without changing other game types", () => {
    expect(isMeermarathonGame("meermarathon")).toBe(true);
    expect(isMeermarathonGame("MEERMARATHON")).toBe(true);
    expect(isMeermarathonGame("tdf")).toBe(false);
  });

  it("formats the winter season over two calendar years", () => {
    expect(meermarathonSeason(2026)).toBe("26/27");
    expect(meermarathonSeason(2099)).toBe("99/00");
    expect(gameSeasonName("meermarathon", 2026)).toBe("Meermarathon 26/27");
    expect(gameSeasonName("giro", 2026)).toBe("Giro d'Italia 2026");
  });
});
