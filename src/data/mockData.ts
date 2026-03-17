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

export interface ClassificationEntry {
  position: number;
  riderName: string;
  riderNumber: number;
  team: string;
  time?: string;
  points?: number;
}

export interface Classifications {
  gc: ClassificationEntry[];
  points: ClassificationEntry[];
  kom: ClassificationEntry[];
  youth: ClassificationEntry[];
}

/* ── Giro d'Italia 2026 – 21 fictional stages ── */

// All riders that appear across teams + extras for filling top20
const allRiders = [
  { name: "Roglič", number: 1 }, { name: "Aleotti", number: 2 }, { name: "Hindley", number: 4 },
  { name: "Martínez", number: 5 }, { name: "Pellizzari", number: 7 }, { name: "Groves", number: 11 },
  { name: "Tiberi", number: 31 }, { name: "Caruso", number: 33 }, { name: "Carapaz", number: 61 },
  { name: "Gaudu", number: 71 }, { name: "Bernal", number: 81 }, { name: "Arensman", number: 82 },
  { name: "Tarling", number: 87 }, { name: "Busatto", number: 92 }, { name: "Ciccone", number: 111 },
  { name: "Pedersen", number: 116 }, { name: "Vacek", number: 117 }, { name: "Quintana", number: 121 },
  { name: "Aular", number: 122 }, { name: "Rubio", number: 127 }, { name: "Pidcock", number: 131 },
  { name: "Hayter", number: 145 }, { name: "Bardet", number: 161 }, { name: "Poole", number: 166 },
  { name: "Piganzoli", number: 171 }, { name: "Van Aert", number: 181 }, { name: "Kelderman", number: 183 },
  { name: "S. Yates", number: 188 }, { name: "Storer", number: 191 }, { name: "Ayuso", number: 201 },
  { name: "Del Toro", number: 204 }, { name: "Majka", number: 205 }, { name: "McNulty", number: 206 },
  { name: "Vine", number: 207 }, { name: "A. Yates", number: 208 }, { name: "Ulissi", number: 221 },
  { name: "Conci", number: 222 }, { name: "Scaroni", number: 228 }, { name: "Strong", number: 109 },
  { name: "Rivera", number: 86 }, { name: "Zambanini", number: 38 }, { name: "Oldani", number: 46 },
  { name: "Vendrame", number: 58 }, { name: "Fiorelli", number: 211 }, { name: "De Pretto", number: 153 },
  { name: "Garofoli", number: 144 }, { name: "Engelhardt", number: 155 }, { name: "Double", number: 154 },
  { name: "Tratnik", number: 8 }, { name: "Černý", number: 143 }, { name: "Cattaneo", number: 142 },
  { name: "Brenner", number: 192 }, { name: "Tjøtta", number: 28 }, { name: "Germani", number: 75 },
  { name: "Lastra", number: 43 }, { name: "Hermans", number: 12 }, { name: "Hoole", number: 112 },
  { name: "Affini", number: 182 }, { name: "Gee-West", number: 101 },
];

function seededRng(seed: number) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
}

function generateStageTop20(stageIndex: number): { position: number; riderName: string; riderNumber: number }[] {
  const rng = seededRng(stageIndex * 137 + 42);
  const shuffled = [...allRiders].sort(() => rng() - 0.5);
  return shuffled.slice(0, 20).map((r, i) => ({ position: i + 1, riderName: r.name, riderNumber: r.number }));
}

const stageTypes: ("flat" | "mountain" | "hilly" | "itt")[] = [
  "flat", "hilly", "mountain", "flat", "hilly", "mountain", "flat", "itt",
  "mountain", "hilly", "flat", "mountain", "hilly", "flat", "mountain",
  "hilly", "flat", "mountain", "hilly", "mountain", "itt",
];

const stageRoutes = [
  "Torino → Novara", "Novara → Milano", "Milano → Bergamo", "Bergamo → Brescia",
  "Brescia → Verona", "Verona → Trento", "Trento → Bolzano", "Bolzano → Bolzano (ITT)",
  "Bolzano → Cortina d'Ampezzo", "Cortina → Belluno", "Belluno → Treviso", "Treviso → Trieste",
  "Trieste → Udine", "Udine → Padova", "Padova → Asiago", "Asiago → Vicenza",
  "Vicenza → Bologna", "Bologna → Firenze", "Firenze → Siena", "Siena → Roma",
  "Roma → Roma (ITT)",
];

const stageDates = [
  "9 mei", "10 mei", "11 mei", "13 mei", "14 mei", "15 mei", "16 mei",
  "17 mei", "18 mei", "20 mei", "21 mei", "22 mei", "23 mei", "24 mei",
  "25 mei", "27 mei", "28 mei", "29 mei", "30 mei", "31 mei", "1 jun",
];

const stageDistances = [
  "175 km", "160 km", "195 km", "180 km", "170 km", "205 km", "155 km", "15.2 km",
  "190 km", "165 km", "148 km", "210 km", "178 km", "152 km", "185 km",
  "168 km", "145 km", "200 km", "175 km", "195 km", "17.4 km",
];

export const mockStageResults: StageResult[] = Array.from({ length: 21 }, (_, i) => ({
  stage: i + 1,
  type: stageTypes[i],
  date: stageDates[i],
  route: stageRoutes[i],
  distance: stageDistances[i],
  top20: generateStageTop20(i),
}));
/* ── Teams with real Giro 2026 riders ── */
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

/* ── Real Giro d'Italia 2025 Classifications (after stage 21) ── */
export const mockClassifications: Classifications = {
  gc: [
    { position: 1, riderName: "Pedersen", riderNumber: 116, team: "Lidl - Trek", time: "7:46:11" },
    { position: 2, riderName: "Roglič", riderNumber: 1, team: "Red Bull - BORA - hansgrohe", time: "+0:01" },
    { position: 3, riderName: "Aular", riderNumber: 122, team: "Movistar Team", time: "+0:06" },
    { position: 4, riderName: "McNulty", riderNumber: 206, team: "UAE Team Emirates - XRG", time: "+0:12" },
    { position: 5, riderName: "Ayuso", riderNumber: 201, team: "UAE Team Emirates - XRG", time: "+0:16" },
    { position: 6, riderName: "Tiberi", riderNumber: 31, team: "Bahrain - Victorious", time: "+0:25" },
    { position: 7, riderName: "Poole", riderNumber: 166, team: "Team Picnic PostNL", time: "+0:24" },
    { position: 8, riderName: "Storer", riderNumber: 191, team: "Tudor Pro Cycling Team", time: "+0:27" },
    { position: 9, riderName: "Pellizzari", riderNumber: 7, team: "Red Bull - BORA - hansgrohe", time: "+0:31" },
    { position: 10, riderName: "Kelderman", riderNumber: 183, team: "Team Visma | Lease a Bike", time: "+0:32" },
    { position: 11, riderName: "Del Toro", riderNumber: 204, team: "UAE Team Emirates - XRG", time: "+0:17" },
    { position: 12, riderName: "Martínez", riderNumber: 5, team: "Red Bull - BORA - hansgrohe", time: "+1:18" },
    { position: 13, riderName: "Pidcock", riderNumber: 131, team: "Q36.5 Pro Cycling Team", time: "+0:10" },
    { position: 14, riderName: "Ulissi", riderNumber: 221, team: "XDS Astana Team", time: "+0:10" },
    { position: 15, riderName: "Carapaz", riderNumber: 61, team: "EF Education - EasyPost", time: "+0:10" },
    { position: 16, riderName: "Bardet", riderNumber: 161, team: "Team Picnic PostNL", time: "+0:10" },
    { position: 17, riderName: "Hindley", riderNumber: 4, team: "Red Bull - BORA - hansgrohe", time: "+0:10" },
    { position: 18, riderName: "Ciccone", riderNumber: 111, team: "Lidl - Trek", time: "+0:10" },
    { position: 19, riderName: "Bernal", riderNumber: 81, team: "INEOS Grenadiers", time: "+0:10" },
    { position: 20, riderName: "Vacek", riderNumber: 117, team: "Lidl - Trek", time: "+0:06" },
  ],
  points: [
    { position: 1, riderName: "Kooij", riderNumber: 184, team: "Team Visma | Lease a Bike", points: 180 },
    { position: 2, riderName: "Groves", riderNumber: 11, team: "Alpecin - Deceuninck", points: 130 },
    { position: 3, riderName: "Moschetti", riderNumber: 136, team: "Q36.5 Pro Cycling Team", points: 95 },
    { position: 4, riderName: "Pedersen", riderNumber: 116, team: "Lidl - Trek", points: 80 },
    { position: 5, riderName: "Lamperti", riderNumber: 147, team: "Soudal Quick-Step", points: 60 },
    { position: 6, riderName: "Kanter", riderNumber: 224, team: "XDS Astana Team", points: 45 },
    { position: 7, riderName: "Baroncini", riderNumber: 203, team: "UAE Team Emirates - XRG", points: 40 },
    { position: 8, riderName: "Aular", riderNumber: 122, team: "Movistar Team", points: 35 },
    { position: 9, riderName: "Zanoncello", riderNumber: 218, team: "VF Group - Bardiani CSF", points: 30 },
    { position: 10, riderName: "Lonardi", riderNumber: 174, team: "Team Polti VisitMalta", points: 25 },
  ],
  kom: [
    { position: 1, riderName: "Pedersen", riderNumber: 116, team: "Lidl - Trek", points: 18 },
    { position: 2, riderName: "Strong", riderNumber: 109, team: "Israel - Premier Tech", points: 14 },
    { position: 3, riderName: "Aular", riderNumber: 122, team: "Movistar Team", points: 10 },
    { position: 4, riderName: "Rivera", riderNumber: 86, team: "INEOS Grenadiers", points: 8 },
    { position: 5, riderName: "Zambanini", riderNumber: 38, team: "Bahrain - Victorious", points: 6 },
    { position: 6, riderName: "Oldani", riderNumber: 46, team: "Cofidis", points: 4 },
    { position: 7, riderName: "Vendrame", riderNumber: 58, team: "Decathlon AG2R", points: 3 },
    { position: 8, riderName: "Fiorelli", riderNumber: 211, team: "VF Group - Bardiani CSF", points: 2 },
    { position: 9, riderName: "Scaroni", riderNumber: 228, team: "XDS Astana Team", points: 1 },
    { position: 10, riderName: "De Pretto", riderNumber: 153, team: "Team Jayco AlUla", points: 1 },
  ],
  youth: [
    { position: 1, riderName: "Poole", riderNumber: 166, team: "Team Picnic PostNL", time: "+0:24" },
    { position: 2, riderName: "Pellizzari", riderNumber: 7, team: "Red Bull - BORA - hansgrohe", time: "+0:31" },
    { position: 3, riderName: "Del Toro", riderNumber: 204, team: "UAE Team Emirates - XRG", time: "+0:17" },
    { position: 4, riderName: "Ayuso", riderNumber: 201, team: "UAE Team Emirates - XRG", time: "+0:16" },
    { position: 5, riderName: "Tiberi", riderNumber: 31, team: "Bahrain - Victorious", time: "+0:25" },
    { position: 6, riderName: "Vacek", riderNumber: 117, team: "Lidl - Trek", time: "+0:06" },
    { position: 7, riderName: "Busatto", riderNumber: 92, team: "Intermarché - Wanty", time: "+0:10" },
    { position: 8, riderName: "Piganzoli", riderNumber: 171, team: "Team Polti VisitMalta", time: "+0:10" },
    { position: 9, riderName: "Aleotti", riderNumber: 2, team: "Red Bull - BORA - hansgrohe", time: "+0:10" },
    { position: 10, riderName: "Brenner", riderNumber: 192, team: "Tudor Pro Cycling Team", time: "+19:44" },
  ],
};
