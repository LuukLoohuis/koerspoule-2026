import { describe, expect, it } from "vitest";
import { simulateMonkeyTeams } from "@/lib/monkeySimulation";

describe("simulateMonkeyTeams", () => {
  const categories = [{ max_picks: 1, category_riders: [{ riders: { id: "cat-a" } }, { riders: { id: "cat-b" } }] }];
  const riders = [{ id: "cat-a" }, { id: "cat-b" }, { id: "joker-a" }, { id: "joker-b" }];
  const riderPoints = new Map([["cat-a", 10], ["cat-b", 20], ["joker-a", 3], ["joker-b", 5]]);

  it("telt twee unieke jokers met de ingestelde multiplier mee", () => {
    const result = simulateMonkeyTeams({ categories, riders, riderPoints, userScore: 0, jokerMultiplier: 2, simulations: 100, seed: 42 });
    expect(result).not.toBeNull();
    expect(new Set(result!.scores)).toEqual(new Set([26, 36]));
  });

  it("kiest zonder jokers alleen uit de categorieën (Meermarathon)", () => {
    const result = simulateMonkeyTeams({ categories, riders, riderPoints, userScore: 15, jokerMultiplier: 2, jokers: 0, simulations: 100, seed: 42 });
    expect(new Set(result!.scores)).toEqual(new Set([10, 20]));
    // Zonder rijders buiten de categorieën kan de aap nog steeds een ploeg maken.
    const alleenCategorie = simulateMonkeyTeams({
      categories,
      riders: riders.slice(0, 2),
      riderPoints,
      userScore: 15,
      jokerMultiplier: 2,
      jokers: 0,
      simulations: 100,
      seed: 42,
    });
    expect(alleenCategorie).not.toBeNull();
    expect(simulateMonkeyTeams({ categories, riders: riders.slice(0, 2), riderPoints, userScore: 15, jokerMultiplier: 2, simulations: 100, seed: 42 })).toBeNull();
  });

  it("is deterministisch voor dezelfde game-seed", () => {
    const input = { categories, riders, riderPoints, userScore: 30, jokerMultiplier: 2, simulations: 100, seed: 7 };
    expect(simulateMonkeyTeams(input)).toEqual(simulateMonkeyTeams(input));
  });
});
