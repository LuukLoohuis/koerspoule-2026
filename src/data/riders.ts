export interface Rider {
  name: string;
  number: number;
}

export interface Category {
  id: number;
  name: string;
  riders: Rider[];
  pick: number; // how many to pick
}

export const riderCategories: Category[] = [
  {
    id: 1, name: "GC Aliens", pick: 1,
    riders: [
      { name: "Pogačar", number: 1 },
      { name: "Vingegaard", number: 11 },
    ],
  },
  {
    id: 2, name: "God of 'n ex-Alien?", pick: 1,
    riders: [
      { name: "Evenepoel", number: 21 },
      { name: "Roglič", number: 71 },
    ],
  },
  {
    id: 3, name: "Klassieke Aliens & Ganna", pick: 1,
    riders: [
      { name: "Van Aert", number: 17 },
      { name: "Ganna", number: 64 },
      { name: "Van der Poel", number: 101 },
    ],
  },
  {
    id: 4, name: "Doen leuk mee", pick: 1,
    riders: [
      { name: "Buitrago", number: 51 },
      { name: "Carlos Rodríguez", number: 61 },
      { name: "Skjelmose", number: 81 },
    ],
  },
  {
    id: 5, name: "Deze willen ook leuk meedoen", pick: 1,
    riders: [
      { name: "Martin", number: 91 },
      { name: "Gall", number: 151 },
      { name: "Onley", number: 191 },
      { name: "T. Johannessen", number: 221 },
      { name: "Van Eeltvelt", number: 222 },
    ],
  },
  {
    id: 6, name: "Geef ze nog een kans!", pick: 1,
    riders: [
      { name: "Vlasov", number: 76 },
      { name: "O'Connor", number: 121 },
      { name: "Geraint Thomas", number: 67 },
    ],
  },
  {
    id: 7, name: "Superknecht", pick: 1,
    riders: [
      { name: "Sivakov", number: 5 },
      { name: "Soler", number: 6 },
      { name: "Kuss", number: 16 },
      { name: "Van Wilder", number: 29 },
      { name: "Arensman", number: 62 },
    ],
  },
  {
    id: 8, name: "Super superknecht", pick: 1,
    riders: [
      { name: "Almeida", number: 2 },
      { name: "Jorgenson", number: 15 },
      { name: "Lipowitz", number: 72 },
    ],
  },
  {
    id: 9, name: "Tweelingenexperiment", pick: 1,
    riders: [
      { name: "A. Yates", number: 8 },
      { name: "S. Yates", number: 18 },
    ],
  },
  {
    id: 10, name: "Supersprinter", pick: 1,
    riders: [
      { name: "Girmay", number: 41 },
      { name: "Milan", number: 83 },
    ],
  },
  {
    id: 11, name: "Super supersprinter", pick: 1,
    riders: [
      { name: "Merlier", number: 24 },
      { name: "Philipsen", number: 105 },
    ],
  },
  {
    id: 12, name: "Sprinter", pick: 1,
    riders: [
      { name: "Meeus", number: 73 },
      { name: "Groenewegen", number: 124 },
      { name: "Groves", number: 103 },
      { name: "Andresen", number: 192 },
      { name: "Van Poppel", number: 78 },
    ],
  },
  {
    id: 13, name: "Nog 'n sprinter", pick: 1,
    riders: [
      { name: "Albanese", number: 31 },
      { name: "Dainese", number: 112 },
      { name: "Démare", number: 134 },
      { name: "Coquard", number: 163 },
      { name: "Cees Bol", number: 173 },
    ],
  },
  {
    id: 14, name: "EN NOG EEN?!", pick: 1,
    riders: [
      { name: "Ackermann", number: 202 },
      { name: "Waerenskjold", number: 228 },
      { name: "Bauhaus", number: 52 },
      { name: "Jeannière", number: 186 },
    ],
  },
  {
    id: 15, name: "Puncheurs 1", pick: 1,
    riders: [
      { name: "Vauquelin", number: 131 },
      { name: "Grégoire", number: 94 },
      { name: "Nys", number: 84 },
      { name: "Martínez", number: 55 },
    ],
  },
  {
    id: 16, name: "Puncheurs 2", pick: 1,
    riders: [
      { name: "Narváez", number: 3 },
      { name: "Schachmann", number: 27 },
      { name: "Van den Berg", number: 38 },
      { name: "Pithie", number: 75 },
      { name: "Alaphilippe", number: 111 },
    ],
  },
  {
    id: 17, name: "Paret-Peintre of Paret-Peintre?", pick: 1,
    riders: [
      { name: "V. Paret-Peintre", number: 25 },
      { name: "A. Paret-Peintre", number: 156 },
    ],
  },
  {
    id: 18, name: "Rittenkapers", pick: 1,
    riders: [
      { name: "Healy", number: 34 },
      { name: "Powless", number: 35 },
      { name: "Valgren", number: 37 },
      { name: "Mohorič", number: 56 },
      { name: "Simmons", number: 85 },
      { name: "Cort", number: 223 },
      { name: "Hirschi", number: 114 },
    ],
  },
  {
    id: 19, name: "Klimmers", pick: 1,
    riders: [
      { name: "Aranburu", number: 161 },
      { name: "Storer", number: 117 },
      { name: "Dunbar", number: 122 },
      { name: "Romeo", number: 147 },
      { name: "Tejada", number: 171 },
      { name: "Woods", number: 201 },
      { name: "Lutsenko", number: 206 },
    ],
  },
  {
    id: 20, name: "Klassieke Belg", pick: 1,
    riders: [
      { name: "Wellens", number: 7 },
      { name: "Benoot", number: 14 },
      { name: "Stuyven", number: 87 },
      { name: "Naesen", number: 155 },
      { name: "De Lie", number: 214 },
    ],
  },
  {
    id: 21, name: "Nederlander om aan te moedigen", pick: 1,
    riders: [
      { name: "Pascal Eenkhoorn", number: 23 },
      { name: "Roel van Sintmaartensdijk", number: 47 },
      { name: "Mick van Dijke", number: 77 },
      { name: "Elmar Reinders", number: 127 },
      { name: "Teunissen", number: 177 },
      { name: "Tim Naberman", number: 197 },
      { name: "Van den Broek", number: 198 },
    ],
  },
];

export const pointsTable: Record<number, number> = {
  1: 50, 2: 40, 3: 32, 4: 26, 5: 22,
  6: 20, 7: 18, 8: 16, 9: 14, 10: 12,
  11: 10, 12: 9, 13: 8, 14: 7, 15: 6,
  16: 5, 17: 4, 18: 3, 19: 2, 20: 1,
};

export const classificationPoints = {
  correctPositionCorrectRider: 50,
  correctRiderWrongPosition: 25,
  correctJerseyWinner: 25,
};
