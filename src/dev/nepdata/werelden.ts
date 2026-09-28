/**
 * Verzonnen games voor de ploegbouwer-testbank. De namen zijn bedacht; de
 * echte komen uit de database.
 */
import type { NepCategorie, NepEntry, NepWereld } from "./supabase";

type Rijder = { id: string; name: string; start_number: number; team: string; jeugd?: boolean };

function bouw(opties: {
  games: Record<string, unknown>[];
  ploegen: Record<string, { name: string; short_name: string; game_id: string }>;
  rijders: Rijder[];
  categorieen: Omit<NepCategorie, "sort_order" | "short_name">[];
  entries?: NepEntry[];
}): NepWereld {
  return {
    games: opties.games,
    teams: Object.entries(opties.ploegen).map(([id, p]) => ({ id, jersey_url: null, ...p })),
    riders: opties.rijders.map((r) => ({
      id: r.id,
      name: r.name,
      start_number: r.start_number,
      team_id: r.team,
      is_youth_eligible: Boolean(r.jeugd),
      firstcycling_id: null,
    })),
    categories: opties.categorieen.map((c, i) => ({ ...c, short_name: null, sort_order: i + 1 })),
    entries: opties.entries ?? [],
  };
}

// ── Meermarathon: één game, twee pelotons ─────────────────────────────────

const MM_GAME = {
  name: "Meermarathon 2026-2027",
  year: 2026,
  status: "open_inschrijving",
  game_type: "meermarathon",
  theme: null,
  registration_closes_at: "2026-11-13T23:59:00+01:00",
  created_at: "2026-09-01T12:00:00Z",
};

const MM_PLOEGEN = (game: "v" | "m") => ({
  [`${game}-noord`]: { name: "Team Noordelijk IJs", short_name: "TNI", game_id: `mm-${game}` },
  [`${game}-fries`]: { name: "Ploeg Friesland", short_name: "FRI", game_id: `mm-${game}` },
  [`${game}-west`]: { name: "Schaatsteam West", short_name: "STW", game_id: `mm-${game}` },
  [`${game}-oost`]: { name: "IJsclub Oost", short_name: "IJO", game_id: `mm-${game}` },
});

const r = (id: string, name: string, start_number: number, team: string): Rijder => ({ id, name, start_number, team });

const MANNEN: Rijder[] = [
  r("sjoerd", "Sjoerd de Vries", 1, "m-noord"),
  r("bart", "Bart Hoekstra", 2, "m-fries"),
  r("jorrit", "Jorrit Bosma", 3, "m-west"),
  r("gerben", "Gerben Postma", 11, "m-fries"),
  r("ruud", "Ruud Mulder", 12, "m-oost"),
  r("arjen", "Arjen de Boer", 13, "m-noord"),
  r("wouter", "Wouter Kramer", 21, "m-west"),
  r("klaas", "Klaas Wiersma", 22, "m-fries"),
  r("hessel", "Hessel Visser", 31, "m-west"),
  r("thijs", "Thijs Bakker", 32, "m-noord"),
  r("jelle", "Jelle Smit", 33, "m-fries"),
  r("sem", "Sem Kuipers", 41, "m-oost"),
  r("daan", "Daan Veenstra", 42, "m-fries"),
  r("finn", "Finn Jansen", 43, "m-noord"),
  // Niet in een categorie, wel op de startlijst: ook zij kunnen een klassement winnen.
  r("pieter", "Pieter Dijkstra", 51, "m-oost"),
  r("tjeerd", "Tjeerd Brouwer", 52, "m-west"),
];

const VROUWEN: Rijder[] = [
  r("anouk", "Anouk Visser", 101, "v-noord"),
  r("femke", "Femke Hoekstra", 102, "v-fries"),
  r("lotte", "Lotte de Jong", 103, "v-west"),
  r("iris", "Iris Postma", 111, "v-fries"),
  r("marit", "Marit Kramer", 112, "v-oost"),
  r("sanne", "Sanne Bakker", 113, "v-noord"),
  r("nynke", "Nynke Wiersma", 121, "v-fries"),
  r("jildou", "Jildou Smit", 122, "v-west"),
  r("esmee", "Esmee Mulder", 131, "v-oost"),
  r("roos", "Roos van Dijk", 132, "v-noord"),
  r("tess", "Tess Kuipers", 141, "v-oost"),
  r("lieke", "Lieke Veenstra", 142, "v-fries"),
  r("froukje", "Froukje Hoekstra", 151, "v-west"),
  r("irene", "Irene de Groot", 152, "v-oost"),
];

const mmCategorieen = (game: "v" | "m", indeling: [string, string[]][]) =>
  indeling.map(([name, rijders], i) => ({ id: `${game}-cat${i + 1}`, game_id: `mm-${game}`, name, max_picks: 1, rijders }));

const MM_CATEGORIEEN = [
  ...mmCategorieen("v", [
    ["Toppers", ["anouk", "femke", "lotte"]],
    ["Sprinters", ["iris", "marit", "sanne"]],
    ["Natuurijs", ["nynke", "jildou"]],
    ["Vechters", ["esmee", "roos"]],
    ["Talent", ["tess", "lieke"]],
  ]),
  ...mmCategorieen("m", [
    ["Toppers", ["sjoerd", "bart", "jorrit"]],
    ["Sprinters", ["gerben", "ruud", "arjen"]],
    ["Natuurijs", ["wouter", "klaas"]],
    ["Vechters", ["hessel", "thijs", "jelle"]],
    ["Talent", ["sem", "daan", "finn"]],
  ]),
];

const entry = (game: string, userId: string, e: Partial<NepEntry>): NepEntry => ({
  id: `entry-${game}`,
  user_id: userId,
  game_id: game,
  status: "draft",
  team_name: null,
  entry_picks: [],
  entry_jokers: [],
  entry_predictions: [],
  ...e,
});

/** Waar je staat bij de vrouwen; bij de mannen doe je (nog) niet mee. */
export type MmStand = "nieuw" | "bezig" | "ingediend";

export function meermarathon(userId: string, stand: MmStand, mannenStatus = "open_inschrijving"): NepWereld {
  const vrouwenEntry =
    stand === "bezig"
      ? entry("mm-v", userId, {
          entry_picks: [
            { category_id: "v-cat1", rider_id: "anouk" },
            { category_id: "v-cat2", rider_id: "iris" },
            { category_id: "v-cat3", rider_id: "nynke" },
          ],
          entry_predictions: [{ classification: "cup", position: 1, rider_id: "femke" }],
        })
      : stand === "ingediend"
        ? entry("mm-v", userId, {
            status: "submitted",
            team_name: "IJspegels",
            entry_picks: [
              { category_id: "v-cat1", rider_id: "anouk" },
              { category_id: "v-cat2", rider_id: "iris" },
              { category_id: "v-cat3", rider_id: "nynke" },
              { category_id: "v-cat4", rider_id: "roos" },
              { category_id: "v-cat5", rider_id: "tess" },
            ],
            entry_predictions: [
              { classification: "cup", position: 1, rider_id: "femke" },
              { classification: "grandprix", position: 1, rider_id: "jildou" },
            ],
          })
        : null;

  return bouw({
    games: [
      { ...MM_GAME, id: "mm-v", categorie: "vrouwen" },
      { ...MM_GAME, id: "mm-m", categorie: "mannen", status: mannenStatus },
    ],
    ploegen: { ...MM_PLOEGEN("v"), ...MM_PLOEGEN("m") },
    rijders: [...VROUWEN, ...MANNEN],
    categorieen: MM_CATEGORIEEN,
    entries: vrouwenEntry ? [vrouwenEntry] : [],
  });
}

// ── Een wielergame, om naast te leggen ────────────────────────────────────

export function tour(userId: string): NepWereld {
  const w = (id: string, name: string, start_number: number, team: string, jeugd = false): Rijder => ({ id, name, start_number, team, jeugd });
  return bouw({
    games: [
      {
        id: "tdf",
        name: "Tour de France 2026",
        year: 2026,
        status: "open_inschrijving",
        game_type: "tour",
        theme: "geel",
        categorie: null,
        registration_closes_at: "2026-07-04T12:00:00+02:00",
        created_at: "2026-05-01T12:00:00Z",
      },
    ],
    ploegen: {
      uae: { name: "UAE Team Emirates", short_name: "UAD", game_id: "tdf" },
      vis: { name: "Team Visma | Lease a Bike", short_name: "TVL", game_id: "tdf" },
      sq: { name: "Soudal Quick-Step", short_name: "SOQ", game_id: "tdf" },
      adc: { name: "Alpecin-Deceuninck", short_name: "ADC", game_id: "tdf" },
    },
    rijders: [
      w("pog", "Tadej Pogačar", 1, "uae"),
      w("vin", "Jonas Vingegaard", 11, "vis"),
      w("evp", "Remco Evenepoel", 21, "sq", true),
      w("jor", "Juan Ayuso", 2, "uae", true),
      w("kus", "Sepp Kuss", 12, "vis"),
      w("mer", "Tim Merlier", 22, "sq"),
      w("phi", "Jasper Philipsen", 31, "adc"),
      w("mvdp", "Mathieu van der Poel", 32, "adc"),
      w("wva", "Wout van Aert", 13, "vis"),
      w("alm", "João Almeida", 3, "uae"),
      w("gro", "Kaden Groves", 33, "adc"),
      w("lan", "Ilan Van Wilder", 23, "sq"),
    ],
    categorieen: [
      { id: "t-cat1", game_id: "tdf", name: "GC Aliens", max_picks: 1, rijders: ["pog", "vin", "evp"] },
      { id: "t-cat2", game_id: "tdf", name: "Sprinters", max_picks: 1, rijders: ["mer", "phi", "gro"] },
      { id: "t-cat3", game_id: "tdf", name: "Klassiekers", max_picks: 2, rijders: ["mvdp", "wva", "lan"] },
    ],
    entries: [entry("tdf", userId, { entry_picks: [{ category_id: "t-cat1", rider_id: "pog" }] })],
  });
}
