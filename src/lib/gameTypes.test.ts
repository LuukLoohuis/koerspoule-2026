import { describe, expect, it } from "vitest";
import { gameSeasonName, gameYearFieldValue, isMeermarathonGame, meermarathonSeason, parseGameYearInput } from "./gameTypes";

describe("Meermarathon game type", () => {
  it("recognises the game type without changing other game types", () => {
    expect(isMeermarathonGame("meermarathon")).toBe(true);
    expect(isMeermarathonGame("MEERMARATHON")).toBe(true);
    expect(isMeermarathonGame("tdf")).toBe(false);
  });

  it("formats the winter season over two calendar years", () => {
    expect(meermarathonSeason(2026)).toBe("2026-2027");
    expect(meermarathonSeason(2099)).toBe("2099-2100");
    expect(gameSeasonName("meermarathon", 2026)).toBe("Meermarathon 2026-2027");
    expect(gameSeasonName("giro", 2026)).toBe("Giro d'Italia 2026");
  });

  it("parses a season only for Meermarathon and a year for grand tours", () => {
    expect(parseGameYearInput("meermarathon", "2026-2027")).toBe(2026);
    expect(parseGameYearInput("meermarathon", "2026–2027")).toBe(2026);
    expect(parseGameYearInput("meermarathon", "2026-2028")).toBeNull();
    expect(parseGameYearInput("tdf", "2026")).toBe(2026);
    expect(parseGameYearInput("tdf", "2026-2027")).toBeNull();
  });

  it("formats the admin year field for the selected game type", () => {
    expect(gameYearFieldValue("meermarathon", 2026)).toBe("2026-2027");
    expect(gameYearFieldValue("giro", 2026)).toBe("2026");
  });
});
