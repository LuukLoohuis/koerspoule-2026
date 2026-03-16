import { riderCategories } from "./riders";
import type { TeamEntry } from "./mockData";

// 10 participants for "Het Grote Peloton" subpool, each with picks from all 21 rider categories
// Picks reference riders from riderCategories (riders.ts)

type SubpoolPick = { name: string; number: number };

interface SubpoolTeam {
  id: string;
  userName: string;
  picks: Record<number, SubpoolPick>; // categoryId -> rider
  jokers: SubpoolPick[];
  predictions: {
    gcPodium: string[];
    pointsJersey: string;
    mountainJersey: string;
    youthJersey: string;
  };
  totalPoints: number;
}

// Deterministic picks per participant per category (index into category riders array)
const pickMatrix: number[][] = [
  // Each row = 1 participant, 21 values = index into each category's riders array
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Jan-Willem - favorieten
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // Pieter - underdogs
  [0, 0, 2, 2, 2, 2, 2, 2, 0, 0, 0, 2, 2, 2, 2, 2, 0, 2, 2, 2, 2], // Sophie - mix
  [1, 0, 0, 1, 3, 0, 3, 0, 1, 1, 0, 3, 3, 0, 3, 3, 1, 3, 3, 3, 3], // Thomas - eigenwijs
  [0, 1, 1, 0, 0, 1, 0, 2, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], // Lisa - safe bets
  [1, 0, 2, 2, 4, 2, 4, 1, 1, 1, 1, 4, 4, 3, 1, 4, 1, 6, 6, 4, 6], // Daan - wildcards
  [0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 1, 1], // Emma - trending
  [1, 1, 2, 1, 3, 1, 2, 2, 1, 1, 1, 2, 2, 2, 2, 2, 1, 4, 4, 2, 4], // Ruben - contrarian
  [0, 0, 1, 2, 0, 2, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 5, 5, 0, 5], // Fleur - gut feeling
  [1, 1, 0, 0, 2, 0, 3, 0, 1, 1, 1, 3, 3, 3, 3, 3, 1, 2, 0, 3, 0], // Bas - data driven
];

const names = ["Jan-Willem", "Pieter", "Sophie", "Thomas", "Lisa", "Daan", "Emma", "Ruben", "Fleur", "Bas"];
const totalPts = [312, 286, 274, 298, 305, 245, 290, 268, 278, 295];

export const subpoolTeams: SubpoolTeam[] = names.map((name, pIdx) => {
  const picks: Record<number, SubpoolPick> = {};
  riderCategories.forEach((cat, cIdx) => {
    const riderIdx = pickMatrix[pIdx][cIdx] % cat.riders.length;
    picks[cat.id] = { name: cat.riders[riderIdx].name, number: cat.riders[riderIdx].number };
  });

  // Jokers: first two picks
  const jokers = [picks[1], picks[2]];

  // Predictions vary
  const gcOptions = [
    ["Pogačar", "Evenepoel", "Vingegaard"],
    ["Vingegaard", "Pogačar", "Roglič"],
    ["Pogačar", "Roglič", "Evenepoel"],
    ["Evenepoel", "Vingegaard", "Pogačar"],
    ["Pogačar", "Vingegaard", "Evenepoel"],
    ["Roglič", "Pogačar", "Vingegaard"],
    ["Pogačar", "Evenepoel", "Roglič"],
    ["Vingegaard", "Roglič", "Pogačar"],
    ["Pogačar", "Vingegaard", "Roglič"],
    ["Evenepoel", "Pogačar", "Vingegaard"],
  ];
  const pointsOptions = ["Girmay", "Milan", "Philipsen", "Merlier", "Groves", "Girmay", "Milan", "Philipsen", "Girmay", "Milan"];
  const komOptions = ["Pogačar", "Vingegaard", "Pogačar", "Evenepoel", "Pogačar", "Roglič", "Pogačar", "Vingegaard", "Pogačar", "Evenepoel"];
  const youthOptions = ["Pogačar", "Pogačar", "Evenepoel", "Pogačar", "Pogačar", "Pogačar", "Evenepoel", "Pogačar", "Pogačar", "Pogačar"];

  return {
    id: `sp-${pIdx + 1}`,
    userName: name,
    picks,
    jokers,
    predictions: {
      gcPodium: gcOptions[pIdx],
      pointsJersey: pointsOptions[pIdx],
      mountainJersey: komOptions[pIdx],
      youthJersey: youthOptions[pIdx],
    },
    totalPoints: totalPts[pIdx],
  };
});

export const expandedSubPool = {
  id: "3",
  name: "Het Grote Peloton",
  members: names,
  code: "PELOTON10",
};

/**
 * Compute uniqueness score per pick in a subpool.
 * Returns a map: participantName -> categoryId -> uniqueness (0 = everyone picked it, 1 = only you)
 */
export function computeUniqueness(teams: SubpoolTeam[]): Map<string, Map<number, number>> {
  const result = new Map<string, Map<number, number>>();
  const catIds = riderCategories.map((c) => c.id);

  for (const catId of catIds) {
    // Count how many times each rider was picked in this category
    const pickCounts = new Map<number, number>();
    for (const team of teams) {
      const riderNum = team.picks[catId]?.number;
      if (riderNum !== undefined) {
        pickCounts.set(riderNum, (pickCounts.get(riderNum) || 0) + 1);
      }
    }

    // Assign uniqueness: 1 - (count-1)/(total-1)
    // If only 1 person picked it: uniqueness = 1
    // If everyone picked it: uniqueness = 0
    for (const team of teams) {
      if (!result.has(team.userName)) result.set(team.userName, new Map());
      const riderNum = team.picks[catId]?.number;
      const count = pickCounts.get(riderNum!) || 1;
      const uniqueness = 1 - (count - 1) / (teams.length - 1);
      result.get(team.userName)!.set(catId, uniqueness);
    }
  }

  return result;
}
