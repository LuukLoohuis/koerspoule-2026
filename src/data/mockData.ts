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
  route: string;
  distance: string;
  top20: { position: number; riderName: string; riderNumber: number }[];
}

/* ── Real Giro d'Italia 2025 Stage Results ── */
export const mockStageResults: StageResult[] = [
  {
    stage: 1, type: "hilly", date: "9 mei", route: "Durrës → Tirana", distance: "160 km",
    top20: [
      { position: 1, riderName: "Pedersen", riderNumber: 116 },
      { position: 2, riderName: "Van Aert", riderNumber: 181 },
      { position: 3, riderName: "Aular", riderNumber: 122 },
      { position: 4, riderName: "Busatto", riderNumber: 92 },
      { position: 5, riderName: "Pidcock", riderNumber: 131 },
      { position: 6, riderName: "Ulissi", riderNumber: 221 },
      { position: 7, riderName: "Carapaz", riderNumber: 61 },
      { position: 8, riderName: "Poole", riderNumber: 166 },
      { position: 9, riderName: "Conci", riderNumber: 222 },
      { position: 10, riderName: "Piganzoli", riderNumber: 171 },
      { position: 11, riderName: "Ciccone", riderNumber: 111 },
      { position: 12, riderName: "Tiberi", riderNumber: 31 },
      { position: 13, riderName: "Double", riderNumber: 154 },
      { position: 14, riderName: "Engelhardt", riderNumber: 155 },
      { position: 15, riderName: "Roglič", riderNumber: 1 },
      { position: 16, riderName: "Bardet", riderNumber: 161 },
      { position: 17, riderName: "Hindley", riderNumber: 4 },
      { position: 18, riderName: "Rubio", riderNumber: 127 },
      { position: 19, riderName: "Caruso", riderNumber: 33 },
      { position: 20, riderName: "Del Toro", riderNumber: 204 },
    ],
  },
  {
    stage: 2, type: "itt", date: "10 mei", route: "Tirana → Tirana", distance: "13.7 km",
    top20: [
      { position: 1, riderName: "Tarling", riderNumber: 87 },
      { position: 2, riderName: "Roglič", riderNumber: 1 },
      { position: 3, riderName: "Vine", riderNumber: 207 },
      { position: 4, riderName: "Affini", riderNumber: 182 },
      { position: 5, riderName: "Vacek", riderNumber: 117 },
      { position: 6, riderName: "Hoole", riderNumber: 112 },
      { position: 7, riderName: "Pedersen", riderNumber: 116 },
      { position: 8, riderName: "McNulty", riderNumber: 206 },
      { position: 9, riderName: "Hayter", riderNumber: 145 },
      { position: 10, riderName: "Ayuso", riderNumber: 201 },
      { position: 11, riderName: "Tratnik", riderNumber: 8 },
      { position: 12, riderName: "Del Toro", riderNumber: 204 },
      { position: 13, riderName: "Černý", riderNumber: 143 },
      { position: 14, riderName: "Martínez", riderNumber: 5 },
      { position: 15, riderName: "Arensman", riderNumber: 82 },
      { position: 16, riderName: "Cattaneo", riderNumber: 142 },
      { position: 17, riderName: "Poole", riderNumber: 166 },
      { position: 18, riderName: "Tiberi", riderNumber: 31 },
      { position: 19, riderName: "Storer", riderNumber: 191 },
      { position: 20, riderName: "Gee-West", riderNumber: 101 },
    ],
  },
  {
    stage: 3, type: "hilly", date: "11 mei", route: "Vlorë → Vlorë", distance: "160 km",
    top20: [
      { position: 1, riderName: "Pedersen", riderNumber: 116 },
      { position: 2, riderName: "Strong", riderNumber: 109 },
      { position: 3, riderName: "Aular", riderNumber: 122 },
      { position: 4, riderName: "Rivera", riderNumber: 86 },
      { position: 5, riderName: "Zambanini", riderNumber: 38 },
      { position: 6, riderName: "Oldani", riderNumber: 46 },
      { position: 7, riderName: "Vendrame", riderNumber: 58 },
      { position: 8, riderName: "Fiorelli", riderNumber: 211 },
      { position: 9, riderName: "Scaroni", riderNumber: 228 },
      { position: 10, riderName: "De Pretto", riderNumber: 153 },
      { position: 11, riderName: "Garofoli", riderNumber: 144 },
      { position: 12, riderName: "Ulissi", riderNumber: 221 },
      { position: 13, riderName: "Poole", riderNumber: 166 },
      { position: 14, riderName: "Cattaneo", riderNumber: 142 },
      { position: 15, riderName: "Tjøtta", riderNumber: 28 },
      { position: 16, riderName: "Germani", riderNumber: 75 },
      { position: 17, riderName: "Brenner", riderNumber: 192 },
      { position: 18, riderName: "Engelhardt", riderNumber: 155 },
      { position: 19, riderName: "Lastra", riderNumber: 43 },
      { position: 20, riderName: "Hermans", riderNumber: 12 },
    ],
  },
];

/* ── Teams with real Giro 2025 riders ── */
export const mockTeams: TeamEntry[] = [
  {
    id: "1",
    userName: "Jan-Willem",
    picks: {
      1: { name: "Roglič", number: 1 },
      2: { name: "Tiberi", number: 31 },
      3: { name: "Van Aert", number: 181 },
      4: { name: "Ayuso", number: 201 },
      5: { name: "Carapaz", number: 61 },
      6: { name: "Pellizzari", number: 7 },
      7: { name: "Pedersen", number: 116 },
      8: { name: "Groves", number: 11 },
      9: { name: "Ciccone", number: 111 },
      10: { name: "Pidcock", number: 131 },
      11: { name: "Bardet", number: 161 },
      12: { name: "McNulty", number: 206 },
      13: { name: "Poole", number: 166 },
      14: { name: "Martínez", number: 5 },
      15: { name: "Del Toro", number: 204 },
      16: { name: "Arensman", number: 82 },
      17: { name: "Bernal", number: 81 },
      18: { name: "S. Yates", number: 188 },
      19: { name: "Hindley", number: 4 },
      20: { name: "Ulissi", number: 221 },
      21: { name: "Tarling", number: 87 },
    },
    jokers: [
      { name: "Roglič", number: 1 },
      { name: "Van Aert", number: 181 },
    ],
    predictions: {
      gcPodium: ["Roglič", "Tiberi", "Ayuso"],
      pointsJersey: "Pedersen",
      mountainJersey: "Roglič",
      youthJersey: "Tiberi",
    },
    totalPoints: 312,
  },
  {
    id: "2",
    userName: "Pieter",
    picks: {
      1: { name: "Tiberi", number: 31 },
      2: { name: "A. Yates", number: 208 },
      3: { name: "Pedersen", number: 116 },
      4: { name: "Carapaz", number: 61 },
      5: { name: "Storer", number: 191 },
      6: { name: "Gaudu", number: 71 },
      7: { name: "Groves", number: 11 },
      8: { name: "Aular", number: 122 },
      9: { name: "Quintana", number: 121 },
      10: { name: "Bernal", number: 81 },
      11: { name: "Kelderman", number: 183 },
      12: { name: "Roglič", number: 1 },
      13: { name: "Vine", number: 207 },
      14: { name: "Vacek", number: 117 },
      15: { name: "Conci", number: 222 },
      16: { name: "Bardet", number: 161 },
      17: { name: "Rubio", number: 127 },
      18: { name: "Pellizzari", number: 7 },
      19: { name: "Tarling", number: 87 },
      20: { name: "Scaroni", number: 228 },
      21: { name: "Pidcock", number: 131 },
    },
    jokers: [
      { name: "Tiberi", number: 31 },
      { name: "Pedersen", number: 116 },
    ],
    predictions: {
      gcPodium: ["Tiberi", "Roglič", "A. Yates"],
      pointsJersey: "Pedersen",
      mountainJersey: "Tiberi",
      youthJersey: "Tiberi",
    },
    totalPoints: 286,
  },
  {
    id: "3",
    userName: "Sophie",
    picks: {
      1: { name: "Ayuso", number: 201 },
      2: { name: "Roglič", number: 1 },
      3: { name: "S. Yates", number: 188 },
      4: { name: "McNulty", number: 206 },
      5: { name: "Poole", number: 166 },
      6: { name: "Del Toro", number: 204 },
      7: { name: "Aular", number: 122 },
      8: { name: "Pedersen", number: 116 },
      9: { name: "Ciccone", number: 111 },
      10: { name: "Ulissi", number: 221 },
      11: { name: "Hindley", number: 4 },
      12: { name: "Caruso", number: 33 },
      13: { name: "Martínez", number: 5 },
      14: { name: "Aleotti", number: 2 },
      15: { name: "Majka", number: 205 },
      16: { name: "Piganzoli", number: 171 },
      17: { name: "Busatto", number: 92 },
      18: { name: "Gaudu", number: 71 },
      19: { name: "Hayter", number: 145 },
      20: { name: "Storer", number: 191 },
      21: { name: "Tarling", number: 87 },
    },
    jokers: [
      { name: "Ayuso", number: 201 },
      { name: "Pedersen", number: 116 },
    ],
    predictions: {
      gcPodium: ["Ayuso", "Roglič", "Tiberi"],
      pointsJersey: "Pedersen",
      mountainJersey: "Ayuso",
      youthJersey: "Ayuso",
    },
    totalPoints: 274,
  },
];

export const mockSubPools = [
  { id: "1", name: "De Koersvrienden", members: ["Jan-Willem", "Pieter", "Sophie"], code: "KOERS24" },
  { id: "2", name: "Kantoor Peloton", members: ["Jan-Willem", "Pieter"], code: "KANTOOR" },
];
