// Mock pool standings with 1350 participants
// In production this would come from the database

export interface PoolParticipant {
  rank: number;
  userName: string;
  stagePoints?: number;
  totalPoints: number;
}

const dutchFirstNames = [
  "Jan", "Pieter", "Sophie", "Kees", "Emma", "Daan", "Lars", "Femke", "Bas", "Lotte",
  "Thijs", "Sanne", "Wouter", "Nienke", "Bram", "Iris", "Joris", "Anouk", "Ruben", "Fleur",
  "Stijn", "Eva", "Jeroen", "Mila", "Tim", "Anna", "Niels", "Lisa", "Rick", "Julia",
  "Tom", "Nina", "Mark", "Sara", "Luuk", "Maria", "Stefan", "Lieke", "Dennis", "Roos",
];

const dutchLastNames = [
  "de Jong", "Jansen", "de Vries", "van Dijk", "Bakker", "Visser", "Smit", "Meijer",
  "de Boer", "Mulder", "de Groot", "Bos", "Vos", "Peters", "Hendriks", "van Leeuwen",
  "Dekker", "Brouwer", "de Wit", "Dijkstra", "Smits", "de Graaf", "van der Berg",
];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function generatePoolParticipants(count: number, seed: number): PoolParticipant[] {
  const rng = seededRandom(seed);
  const participants: PoolParticipant[] = [];
  
  for (let i = 0; i < count; i++) {
    const firstName = dutchFirstNames[Math.floor(rng() * dutchFirstNames.length)];
    const lastName = dutchLastNames[Math.floor(rng() * dutchLastNames.length)];
    participants.push({
      rank: 0,
      userName: `${firstName} ${lastName}`,
      totalPoints: Math.floor(rng() * 500 + 50),
    });
  }
  
  // Sort by totalPoints descending and assign ranks
  participants.sort((a, b) => b.totalPoints - a.totalPoints);
  participants.forEach((p, i) => p.rank = i + 1);
  
  return participants;
}

// Generate stable pool of 1350 participants
export const allPoolParticipants = generatePoolParticipants(1350, 42);

// Insert "Jan-Willem" (our user) at a specific rank
const myEntry: PoolParticipant = {
  rank: 120,
  userName: "Jan-Willem",
  totalPoints: 312,
};

// Remove whoever is at rank 120 and insert our user
allPoolParticipants.splice(119, 1, myEntry);
// Re-sort and re-rank
allPoolParticipants.sort((a, b) => b.totalPoints - a.totalPoints);
allPoolParticipants.forEach((p, i) => p.rank = i + 1);

// Find our actual rank after re-sorting
export const myPoolRank = allPoolParticipants.findIndex(p => p.userName === "Jan-Willem") + 1;

// Generate per-stage pool standings
export function getStagePoolStandings(stageIndex: number): PoolParticipant[] {
  const rng = seededRandom(stageIndex * 1000 + 7);
  const stageParticipants = allPoolParticipants.map(p => ({
    ...p,
    stagePoints: Math.floor(rng() * 80),
  }));
  
  stageParticipants.sort((a, b) => (b.stagePoints || 0) - (a.stagePoints || 0));
  stageParticipants.forEach((p, i) => p.rank = i + 1);
  
  return stageParticipants;
}

/**
 * Returns top N + gap + user's position (if not already in top N)
 */
export function getTruncatedStandings(
  standings: PoolParticipant[],
  topN: number,
  myName: string
): { top: PoolParticipant[]; myEntry: PoolParticipant | null; showGap: boolean; totalParticipants: number } {
  const top = standings.slice(0, topN);
  const myIdx = standings.findIndex(p => p.userName === myName);
  const isInTop = myIdx < topN;
  
  return {
    top,
    myEntry: isInTop ? null : standings[myIdx] || null,
    showGap: !isInTop && myIdx >= topN,
    totalParticipants: standings.length,
  };
}
