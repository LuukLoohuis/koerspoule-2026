export type MonkeyCategory = {
  max_picks: number | null;
  category_riders?: Array<{ riders: { id: string } | null }> | null;
};

export type MonkeySimulationResult = {
  scores: number[];
  mean: number;
  median: number;
  beatPct: number;
};

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function pickN<T>(values: T[], count: number, rng: () => number): T[] {
  if (values.length <= count) return [...values];
  const available = [...values];
  const picked: T[] = [];
  for (let i = 0; i < count; i++) {
    picked.push(available.splice(Math.floor(rng() * available.length), 1)[0]);
  }
  return picked;
}

/** Bouw volledige apenteams: categoriekeuzes plus twee unieke geldige jokers. */
export function simulateMonkeyTeams({
  categories,
  riders,
  riderPoints,
  userScore,
  jokerMultiplier,
  simulations = 10_000,
  seed,
}: {
  categories: MonkeyCategory[];
  riders: Array<{ id: string }>;
  riderPoints: ReadonlyMap<string, number>;
  userScore: number;
  jokerMultiplier: number;
  simulations?: number;
  seed: number;
}): MonkeySimulationResult | null {
  const categoryPools = categories.map((category) =>
    (category.category_riders ?? [])
      .map((candidate) => candidate.riders?.id)
      .filter((id): id is string => Boolean(id)),
  );
  if (categoryPools.length === 0 || categoryPools.some((pool) => pool.length === 0)) return null;

  const categoryRiderIds = new Set(categoryPools.flat());
  const jokerPool = riders.map((rider) => rider.id).filter((id) => !categoryRiderIds.has(id));
  if (jokerPool.length < 2) return null;

  const rng = seededRandom(seed);
  const scores: number[] = [];
  for (let i = 0; i < simulations; i++) {
    let score = 0;
    for (let categoryIndex = 0; categoryIndex < categories.length; categoryIndex++) {
      const maxPicks = Math.max(1, categories[categoryIndex].max_picks ?? 1);
      for (const riderId of pickN(categoryPools[categoryIndex], maxPicks, rng)) {
        score += riderPoints.get(riderId) ?? 0;
      }
    }
    for (const jokerId of pickN(jokerPool, 2, rng)) {
      score += (riderPoints.get(jokerId) ?? 0) * jokerMultiplier;
    }
    scores.push(score);
  }

  scores.sort((a, b) => a - b);
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const middle = Math.floor(scores.length / 2);
  const median = scores.length % 2 === 0 ? (scores[middle - 1] + scores[middle]) / 2 : scores[middle];
  const beatPct = (scores.filter((score) => userScore > score).length / scores.length) * 100;
  return { scores, mean, median, beatPct };
}
