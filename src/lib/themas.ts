// Thema-systeem: roze (Giro) / geel (Tour) / rood (Vuelta).
// Bevat per thema: kleuren (hex), teksten, quotes en klassements-truien.
// De ThemaProvider zet de kleuren om naar de bestaande HSL-tokens, zodat de
// hele site automatisch herkleurt.

export type ThemaKey = "roze" | "geel" | "rood";

export type TruiType = "algemeen" | "punten" | "berg" | "jongeren";

export type TruiDef = {
  naam: string;
  kleur: string;           // hex
  patroon: "effen" | "bolletjes";
  bolletjeKleur?: string;  // hex, alleen bij patroon "bolletjes"
  rand?: string;           // hex, optionele rand (witte truien)
};

export type ThemaKleuren = {
  primair: string;
  secundair: string;
  achtergrond: string;
  kaart: string;       // lichte thema-waas voor cards (subtiel anders dan achtergrond)
  tekst: string;
  accent: string;
};

export type Thema = {
  key: ThemaKey;
  kleuren: ThemaKleuren;
  krant: string;
  koers: string;
  etappe: string;
  startlijst: string;
  supporters: string;
  homepage_titel: string;
  homepage_subtitel: string;
  login_welkom: string;   // begroeting bij inloggen (in de koers-taal)
  login_meedoen: string;  // titel bij registreren
  quotes: string[];
  truien: Record<TruiType, TruiDef>;
};

const WIT_RAND = "#C8B89A";

export const THEMAS: Record<ThemaKey, Thema> = {
  roze: {
    key: "roze",
    kleuren: { primair: "#E8336D", secundair: "#C8A020", achtergrond: "#FAF7F2", kaart: "#FDF2F6", tekst: "#2C2416", accent: "#C8A020" },
    krant: "Gazzetta",
    koers: "Giro d'Italia",
    etappe: "Tappa",
    startlijst: "Lista di Partenza",
    supporters: "Tifosi",
    homepage_titel: "Giro d'Italia 2026",
    homepage_subtitel: "La Corsa Rosa",
    login_welkom: "Bentornato!",
    login_meedoen: "Doe mee aan de Corsa!",
    quotes: [
      "Il ciclismo è poesia in movimento.",
      "La strada è lunga, ma la gloria aspetta.",
      "Ogni tappa è una nuova avventura.",
      "Il Giro, è la vita stessa.",
      "Forza, sempre avanti!",
    ],
    truien: {
      algemeen: { naam: "Maglia Rosa", kleur: "#E8336D", patroon: "effen" },
      punten: { naam: "Maglia Ciclamino", kleur: "#9B59B6", patroon: "effen" },
      berg: { naam: "Maglia Azzurra", kleur: "#3498DB", patroon: "effen" },
      jongeren: { naam: "Maglia Bianca", kleur: "#FFFFFF", patroon: "effen", rand: WIT_RAND },
    },
  },
  geel: {
    key: "geel",
    kleuren: { primair: "#E0A411", secundair: "#1a1a1a", achtergrond: "#FFFDF0", kaart: "#FFF8E6", tekst: "#1a1a1a", accent: "#C0851A" },
    krant: "L'Équipe",
    koers: "Tour de France",
    etappe: "Étape",
    startlijst: "Liste de Départ",
    supporters: "Les Supporters",
    homepage_titel: "Tour de France 2026",
    homepage_subtitel: "La Grande Boucle",
    login_welkom: "Bon retour !",
    login_meedoen: "Rejoins la Grande Boucle !",
    quotes: [
      "Le Tour, c'est la vie.",
      "La route est longue, mais la gloire attend.",
      "Chaque étape est une nouvelle aventure.",
      "Il était une fois un maillot jaune...",
      "Allez, toujours de l'avant!",
    ],
    truien: {
      algemeen: { naam: "Maillot Jaune", kleur: "#F5C518", patroon: "effen" },
      punten: { naam: "Maillot Vert", kleur: "#27AE60", patroon: "effen" },
      berg: { naam: "Maillot à Pois", kleur: "#FFFFFF", patroon: "bolletjes", bolletjeKleur: "#CC0000" },
      jongeren: { naam: "Maillot Blanc", kleur: "#FFFFFF", patroon: "effen", rand: WIT_RAND },
    },
  },
  rood: {
    key: "rood",
    kleuren: { primair: "#CC0000", secundair: "#F5A623", achtergrond: "#FFF9F5", kaart: "#FFF1EC", tekst: "#2C1810", accent: "#F5A623" },
    krant: "Marca",
    koers: "Vuelta a España",
    etappe: "Etapa",
    startlijst: "Lista de Salida",
    supporters: "La Afición",
    homepage_titel: "Vuelta a España 2026",
    homepage_subtitel: "La Vuelta",
    login_welkom: "¡Bienvenido de nuevo!",
    login_meedoen: "¡Únete a la Vuelta!",
    quotes: [
      "La Vuelta es pasión pura.",
      "El camino es duro, pero la gloria espera.",
      "Cada etapa es una nueva batalla.",
      "Viva la Vuelta, viva el ciclismo!",
      "Adelante, siempre adelante!",
    ],
    truien: {
      algemeen: { naam: "Maillot Rojo", kleur: "#CC0000", patroon: "effen" },
      punten: { naam: "Maillot Verde", kleur: "#27AE60", patroon: "effen" },
      berg: { naam: "Maillot de Lunares", kleur: "#FFFFFF", patroon: "bolletjes", bolletjeKleur: "#2E5BA8" },
      jongeren: { naam: "Maillot Blanco", kleur: "#FFFFFF", patroon: "effen", rand: WIT_RAND },
    },
  },
};

/** Leid een themasleutel af uit een (optionele) theme-kolom + game_type-fallback. */
export function deriveThemaKey(theme: string | null | undefined, gameType: string | null | undefined): ThemaKey {
  if (theme === "roze" || theme === "geel" || theme === "rood") return theme;
  switch (gameType) {
    case "tdf":
    case "tour":
      return "geel";
    case "vuelta":
      return "rood";
    case "giro":
    default:
      return "roze";
  }
}

/** hex (#RRGGBB) → "H S% L%" triplet voor de bestaande hsl(var(--x))-tokens. */
export function hexToHsl(hex: string): string {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let s = 0;
  let hue = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hue = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: hue = (b - r) / d + 2; break;
      default: hue = (r - g) / d + 4;
    }
    hue /= 6;
  }
  return `${Math.round(hue * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Leesbare voorgrondkleur (zwart/wit triplet) op basis van luminantie. */
export function readableForeground(hex: string): string {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "240 12% 11%" : "0 0% 100%";
}
