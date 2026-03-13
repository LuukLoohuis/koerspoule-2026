export interface TeamEntry {
  id: string;
  userName: string;
  picks: Record<number, { name: string; number: number }>; // categoryId -> rider
  jokers: { name: string; number: number }[];
  predictions: {
    gcPodium: string[];
    pointsJersey: string;
    mountainJersey: string;
    youthJersey: string;
  };
  totalPoints: number;
}

export interface StageResult {
  stage: number;
  type: "flat" | "mountain" | "hilly" | "itt";
  date: string;
  top20: { position: number; riderName: string; riderNumber: number }[];
}

export const mockStageResults: StageResult[] = [
  {
    stage: 1, type: "flat", date: "5 juli",
    top20: [
      { position: 1, riderName: "Girmay", riderNumber: 41 },
      { position: 2, riderName: "Philipsen", riderNumber: 105 },
      { position: 3, riderName: "Milan", riderNumber: 83 },
      { position: 4, riderName: "Meeus", riderNumber: 73 },
      { position: 5, riderName: "Groenewegen", riderNumber: 124 },
      { position: 6, riderName: "Merlier", riderNumber: 24 },
      { position: 7, riderName: "Ackermann", riderNumber: 202 },
      { position: 8, riderName: "Coquard", riderNumber: 163 },
      { position: 9, riderName: "Démare", riderNumber: 134 },
      { position: 10, riderName: "Van Poppel", riderNumber: 78 },
      { position: 11, riderName: "Pogačar", riderNumber: 1 },
      { position: 12, riderName: "Vingegaard", riderNumber: 11 },
      { position: 13, riderName: "Evenepoel", riderNumber: 21 },
      { position: 14, riderName: "Van Aert", riderNumber: 17 },
      { position: 15, riderName: "Roglič", riderNumber: 71 },
      { position: 16, riderName: "Almeida", riderNumber: 2 },
      { position: 17, riderName: "Jorgenson", riderNumber: 15 },
      { position: 18, riderName: "Skjelmose", riderNumber: 81 },
      { position: 19, riderName: "Narváez", riderNumber: 3 },
      { position: 20, riderName: "Healy", riderNumber: 34 },
    ],
  },
  {
    stage: 2, type: "hilly", date: "6 juli",
    top20: [
      { position: 1, riderName: "Pogačar", riderNumber: 1 },
      { position: 2, riderName: "Vingegaard", riderNumber: 11 },
      { position: 3, riderName: "Evenepoel", riderNumber: 21 },
      { position: 4, riderName: "Roglič", riderNumber: 71 },
      { position: 5, riderName: "Van Aert", riderNumber: 17 },
      { position: 6, riderName: "Almeida", riderNumber: 2 },
      { position: 7, riderName: "Jorgenson", riderNumber: 15 },
      { position: 8, riderName: "Vauquelin", riderNumber: 131 },
      { position: 9, riderName: "Buitrago", riderNumber: 51 },
      { position: 10, riderName: "Skjelmose", riderNumber: 81 },
      { position: 11, riderName: "Carlos Rodríguez", riderNumber: 61 },
      { position: 12, riderName: "O'Connor", riderNumber: 121 },
      { position: 13, riderName: "Gall", riderNumber: 151 },
      { position: 14, riderName: "Lipowitz", riderNumber: 72 },
      { position: 15, riderName: "Sivakov", riderNumber: 5 },
      { position: 16, riderName: "Martin", riderNumber: 91 },
      { position: 17, riderName: "Soler", riderNumber: 6 },
      { position: 18, riderName: "Narváez", riderNumber: 3 },
      { position: 19, riderName: "Vlasov", riderNumber: 76 },
      { position: 20, riderName: "Mohorič", riderNumber: 56 },
    ],
  },
  {
    stage: 3, type: "mountain", date: "7 juli",
    top20: [
      { position: 1, riderName: "Vingegaard", riderNumber: 11 },
      { position: 2, riderName: "Pogačar", riderNumber: 1 },
      { position: 3, riderName: "Roglič", riderNumber: 71 },
      { position: 4, riderName: "Evenepoel", riderNumber: 21 },
      { position: 5, riderName: "Buitrago", riderNumber: 51 },
      { position: 6, riderName: "Carlos Rodríguez", riderNumber: 61 },
      { position: 7, riderName: "Almeida", riderNumber: 2 },
      { position: 8, riderName: "Jorgenson", riderNumber: 15 },
      { position: 9, riderName: "O'Connor", riderNumber: 121 },
      { position: 10, riderName: "Lipowitz", riderNumber: 72 },
      { position: 11, riderName: "Vlasov", riderNumber: 76 },
      { position: 12, riderName: "Gall", riderNumber: 151 },
      { position: 13, riderName: "Sivakov", riderNumber: 5 },
      { position: 14, riderName: "Woods", riderNumber: 201 },
      { position: 15, riderName: "Skjelmose", riderNumber: 81 },
      { position: 16, riderName: "Kuss", riderNumber: 16 },
      { position: 17, riderName: "Soler", riderNumber: 6 },
      { position: 18, riderName: "Storer", riderNumber: 117 },
      { position: 19, riderName: "Dunbar", riderNumber: 122 },
      { position: 20, riderName: "Romeo", riderNumber: 147 },
    ],
  },
];

export const mockTeams: TeamEntry[] = [
  {
    id: "1",
    userName: "Jan-Willem",
    picks: {
      1: { name: "Pogačar", number: 1 },
      2: { name: "Evenepoel", number: 21 },
      3: { name: "Van Aert", number: 17 },
      4: { name: "Buitrago", number: 51 },
      5: { name: "Martin", number: 91 },
      6: { name: "O'Connor", number: 121 },
      7: { name: "Sivakov", number: 5 },
      8: { name: "Almeida", number: 2 },
      9: { name: "A. Yates", number: 8 },
      10: { name: "Girmay", number: 41 },
      11: { name: "Philipsen", number: 105 },
      12: { name: "Meeus", number: 73 },
      13: { name: "Albanese", number: 31 },
      14: { name: "Ackermann", number: 202 },
      15: { name: "Vauquelin", number: 131 },
      16: { name: "Narváez", number: 3 },
      17: { name: "V. Paret-Peintre", number: 25 },
      18: { name: "Healy", number: 34 },
      19: { name: "Woods", number: 201 },
      20: { name: "Wellens", number: 7 },
      21: { name: "Teunissen", number: 177 },
    },
    jokers: [
      { name: "Cavendish", number: 133 },
      { name: "Bardet", number: 181 },
    ],
    predictions: {
      gcPodium: ["Pogačar", "Vingegaard", "Evenepoel"],
      pointsJersey: "Girmay",
      mountainJersey: "Pogačar",
      youthJersey: "Evenepoel",
    },
    totalPoints: 312,
  },
  {
    id: "2",
    userName: "Pieter",
    picks: {
      1: { name: "Vingegaard", number: 11 },
      2: { name: "Roglič", number: 71 },
      3: { name: "Van der Poel", number: 101 },
      4: { name: "Carlos Rodríguez", number: 61 },
      5: { name: "Gall", number: 151 },
      6: { name: "Vlasov", number: 76 },
      7: { name: "Soler", number: 6 },
      8: { name: "Jorgenson", number: 15 },
      9: { name: "S. Yates", number: 18 },
      10: { name: "Milan", number: 83 },
      11: { name: "Merlier", number: 24 },
      12: { name: "Groenewegen", number: 124 },
      13: { name: "Dainese", number: 112 },
      14: { name: "Waerenskjold", number: 228 },
      15: { name: "Grégoire", number: 94 },
      16: { name: "Alaphilippe", number: 111 },
      17: { name: "A. Paret-Peintre", number: 156 },
      18: { name: "Cort", number: 223 },
      19: { name: "Storer", number: 117 },
      20: { name: "Stuyven", number: 87 },
      21: { name: "Mick van Dijke", number: 77 },
    },
    jokers: [
      { name: "Bardet", number: 181 },
      { name: "Pidcock", number: 66 },
    ],
    predictions: {
      gcPodium: ["Vingegaard", "Pogačar", "Roglič"],
      pointsJersey: "Milan",
      mountainJersey: "Vingegaard",
      youthJersey: "Pogačar",
    },
    totalPoints: 286,
  },
  {
    id: "3",
    userName: "Sophie",
    picks: {
      1: { name: "Pogačar", number: 1 },
      2: { name: "Roglič", number: 71 },
      3: { name: "Ganna", number: 64 },
      4: { name: "Skjelmose", number: 81 },
      5: { name: "Onley", number: 191 },
      6: { name: "Geraint Thomas", number: 67 },
      7: { name: "Kuss", number: 16 },
      8: { name: "Lipowitz", number: 72 },
      9: { name: "S. Yates", number: 18 },
      10: { name: "Girmay", number: 41 },
      11: { name: "Merlier", number: 24 },
      12: { name: "Groves", number: 103 },
      13: { name: "Coquard", number: 163 },
      14: { name: "Bauhaus", number: 52 },
      15: { name: "Nys", number: 84 },
      16: { name: "Schachmann", number: 27 },
      17: { name: "V. Paret-Peintre", number: 25 },
      18: { name: "Mohorič", number: 56 },
      19: { name: "Lutsenko", number: 206 },
      20: { name: "Benoot", number: 14 },
      21: { name: "Pascal Eenkhoorn", number: 23 },
    },
    jokers: [
      { name: "Laporte", number: 13 },
      { name: "Gaudu", number: 92 },
    ],
    predictions: {
      gcPodium: ["Pogačar", "Roglič", "Vingegaard"],
      pointsJersey: "Girmay",
      mountainJersey: "Pogačar",
      youthJersey: "Pogačar",
    },
    totalPoints: 274,
  },
];

export const mockSubPools = [
  { id: "1", name: "De Koersvrienden", members: ["Jan-Willem", "Pieter", "Sophie"], code: "KOERS24" },
  { id: "2", name: "Kantoor Peloton", members: ["Jan-Willem", "Pieter"], code: "KANTOOR" },
];
