import { describe, expect, it } from "vitest";
import { eenSegmentPerSeizoen } from "./GameSwitcher";

const g = (id: string, game_type: string, year: number, categorie: string | null = null) => ({ id, game_type, year, categorie });

describe("GameSwitcher: één Meermarathon-segment per seizoen", () => {
  const games = [
    g("tour", "tdf", 2026),
    g("mm-m", "meermarathon", 2026, "mannen"),
    g("mm-v", "meermarathon", 2026, "vrouwen"),
    g("mm-oud", "meermarathon", 2025, "vrouwen"),
  ];

  it("laat vrouwen staan als niets uit het seizoen gekozen is", () => {
    expect(eenSegmentPerSeizoen(games, "tour").map((x) => x.id)).toEqual(["tour", "mm-v", "mm-oud"]);
  });

  it("laat de gekozen categorie staan, zodat het segment actief oplicht", () => {
    expect(eenSegmentPerSeizoen(games, "mm-m").map((x) => x.id)).toEqual(["tour", "mm-m", "mm-oud"]);
  });
});
