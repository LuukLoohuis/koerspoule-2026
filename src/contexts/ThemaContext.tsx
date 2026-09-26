import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { THEMAS, deriveThemaKey, hexToHsl, readableForeground, type Thema, type ThemaKey } from "@/lib/themas";
import { useSelectedGame } from "@/context/SelectedGameContext";
import { resolveDefaultGameId } from "@/lib/gameStatus";
import { useAuth } from "@/hooks/useAuth";

type ThemaContextValue = {
  thema: Thema;
  key: ThemaKey;
  ready: boolean;
  /** Admin mag het site-brede thema forceren, los van de live-status van games. */
  canPreview: boolean;
  previewKey: ThemaKey | null;
  setPreviewKey: (key: ThemaKey | null) => void;
  /** Nachtmodus ("Nachtijs") bestaat alleen voor het winterthema. */
  modus: Modus;
  setModus: (modus: Modus) => void;
};

export type Modus = "licht" | "nacht";

const ThemaContext = createContext<ThemaContextValue>({
  thema: THEMAS.roze,
  key: "roze",
  ready: false,
  canPreview: false,
  previewKey: null,
  setPreviewKey: () => {},
  modus: "licht",
  setModus: () => {},
});

type ThemeGame = {
  game_type?: string | null;
  status?: string | null;
  theme?: string | null;
} | null;

/**
 * Meermarathon voert de globale winterstijl vanaf de inschrijving tot het
 * einde van de livefase (locked is de oude naam voor live). Een sneak preview,
 * concept of afgerond seizoen kleurt de site niet winters.
 */
const WINTER_STATUSSEN = ["open_inschrijving", "live", "locked"];

export function resolveSiteThemaKey(game: ThemeGame): ThemaKey {
  if (game?.game_type === "meermarathon") {
    return WINTER_STATUSSEN.includes(String(game.status ?? "")) ? "winter" : "roze";
  }
  return deriveThemaKey(game?.theme, game?.game_type);
}

/** Papier en inkt: alleen winter kleurt die, en dat doet de CSS. */
const PAPIER_TOKENS = ["--background", "--card", "--popover", "--foreground", "--card-foreground", "--popover-foreground"];
/** Alles wat applyThemaTokens ooit inline zet. */
const INLINE_TOKENS = [
  "--primary", "--primary-foreground", "--ring", "--jersey-pink",
  "--sidebar-primary", "--sidebar-ring", "--sidebar-primary-foreground",
  "--vintage-gold", ...PAPIER_TOKENS,
];

/** Zet de thema-kleuren op de bestaande HSL-tokens → hele site herkleurt. */
function applyThemaTokens(key: ThemaKey, opts: { persist?: boolean } = {}) {
  const persist = opts.persist ?? true;
  const t = THEMAS[key];
  const root = document.documentElement;
  const k = t.kleuren;

  if (key === "winter") {
    // Winter haalt al zijn kleuren uit styles/meermarathon-thema.css, licht én
    // nacht. Inline op <html> zou daarvan winnen, dus hier alles weg.
    for (const token of INLINE_TOKENS) root.style.removeProperty(token);
  } else {
    const primair = hexToHsl(k.primair);
    const primairFg = readableForeground(k.primair);

    // Brand / primair
    root.style.setProperty("--primary", primair);
    root.style.setProperty("--primary-foreground", primairFg);
    root.style.setProperty("--ring", primair);
    root.style.setProperty("--jersey-pink", primair);
    root.style.setProperty("--sidebar-primary", primair);
    root.style.setProperty("--sidebar-ring", primair);
    root.style.setProperty("--sidebar-primary-foreground", primairFg);

    // De koersthema's blijven bewust op het neutrale crème-papier (een
    // getinte achtergrond vond de gebruiker daar te fel).
    for (const token of PAPIER_TOKENS) root.style.removeProperty(token);

    // Retro-gold accent → secundair/accent van het thema
    root.style.setProperty("--vintage-gold", hexToHsl(k.accent));
  }

  root.setAttribute("data-thema", key);

  // Favicon en homescreen-icon behouden het compacte witte-fiets-ontwerp in de
  // racekleur. De zichtbare app-logo's worden door KoerspouleLogo bijgewerkt.
  // index.html heeft twee icon-links (SVG + PNG-fallback). Zet bij het wisselen
  // ook het type mee, anders serveren we een SVG onder type="image/png" en
  // negeren sommige browsers het icoon.
  document
    .querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]')
    .forEach((link) => {
      link.href = t.favicon;
      if (link.rel !== "apple-touch-icon") {
        link.type = t.favicon.endsWith(".svg") ? "image/svg+xml" : "image/png";
      }
    });

  // Admin-preview past de tokens alleen visueel toe — nooit in de no-flash-
  // cache, anders zien andere bezoekers (of de admin zelf later) per ongeluk
  // de preview i.p.v. het echte thema.
  if (!persist) return;

  // Persisteer de toegepaste accent-tokens zodat het no-flash-script in
  // index.html ze bij een volgend bezoek vóór de eerste paint kan zetten.
  try {
    if (key === "winter") {
      // Winter mag bij een volgende start niet uit cache verschijnen als de
      // Meermarathon inmiddels is afgelopen.
      localStorage.removeItem(THEMA_TOKENS_LS_KEY);
    } else {
      const primair = hexToHsl(k.primair);
      localStorage.setItem(
        THEMA_TOKENS_LS_KEY,
        JSON.stringify({ "--primary": primair, "--primary-foreground": readableForeground(k.primair), "--ring": primair, "--jersey-pink": primair, "--vintage-gold": hexToHsl(k.accent) }),
      );
    }
  } catch { /* ignore */ }
}

const THEMA_LS_KEY = "koerspoule:themaKey";
const MODUS_LS_KEY = "koerspoule:modus";

/**
 * Standaard licht, ook als het systeem donker staat: alleen de Meermarathon-
 * schermen zijn voor de nacht ontworpen. Wie hem aanzet, houdt hem aan.
 */
function readModus(): Modus {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(MODUS_LS_KEY) === "nacht" ? "nacht" : "licht";
  } catch {
    return "licht";
  }
}
const THEMA_TOKENS_LS_KEY = "koerspoule:themaTokens";
const PREVIEW_SS_KEY = "koerspoule:adminThemaPreview";

/** Admin-only: gelezen uit sessionStorage → verdwijnt vanzelf als de tab sluit. */
function readPreviewKey(): ThemaKey | null {
  try {
    const v = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(PREVIEW_SS_KEY) : null;
    return v && v in THEMAS ? (v as ThemaKey) : null;
  } catch {
    return null;
  }
}

/** Neutrale accent-tokens tijdens het laden (eerste bezoek, geen cache) —
 *  voorkomt de Giro-roze base-flits zonder een specifiek race-thema te tonen. */
function neutralizeAccent() {
  const root = document.documentElement;
  const neutral = "38 10% 55%"; // warm-grijs, race-neutraal
  root.style.setProperty("--primary", neutral);
  root.style.setProperty("--ring", neutral);
  root.style.setProperty("--jersey-pink", neutral);
  root.style.setProperty("--sidebar-primary", neutral);
  root.style.setProperty("--sidebar-ring", neutral);
  root.setAttribute("data-thema", "loading");
}

function readCachedKey(): ThemaKey | null {
  try {
    const v = typeof localStorage !== "undefined" ? localStorage.getItem(THEMA_LS_KEY) : null;
    return v && v in THEMAS && v !== "winter" ? (v as ThemaKey) : null;
  } catch {
    return null;
  }
}

export function ThemaProvider({ children }: { children: React.ReactNode }) {
  // De site-identiteit volgt de statusgestuurde default-game uit het admin-
  // dashboard. Een keuze in de GameSwitcher wisselt alleen de game-inhoud en
  // mag het globale logo, de layoutkleur en de favicon niet veranderen.
  const { games, loading } = useSelectedGame();
  const { role } = useAuth();
  const canPreview = role === "admin";
  const isFetched = !loading;
  const activeGame = useMemo(() => {
    const activeGameId = resolveDefaultGameId(games);
    return games.find((game) => game.id === activeGameId) ?? null;
  }, [games]);

  // Laatst-bekende thema uit localStorage → terugkerende bezoekers zien meteen
  // het juiste thema (geen flits). Eénmalig per mount gelezen.
  const cachedKey = useMemo(() => readCachedKey(), []);

  // Admin-only preview-override: forceert een thema los van de live-status,
  // enkel zichtbaar in de browsersessie van de admin zelf (sessionStorage,
  // nooit in de gedeelde no-flash-cache — zie applyThemaTokens persist:false).
  const [previewKey, setPreviewKeyState] = useState<ThemaKey | null>(() => readPreviewKey());
  const setPreviewKey = (next: ThemaKey | null) => {
    setPreviewKeyState(next);
    try {
      if (next) sessionStorage.setItem(PREVIEW_SS_KEY, next);
      else sessionStorage.removeItem(PREVIEW_SS_KEY);
    } catch { /* ignore */ }
  };
  const isPreviewing = canPreview && previewKey != null;

  const [modus, setModusState] = useState<Modus>(() => readModus());
  const setModus = (next: Modus) => {
    setModusState(next);
    try {
      if (next === "nacht") localStorage.setItem(MODUS_LS_KEY, next);
      else localStorage.removeItem(MODUS_LS_KEY);
    } catch { /* ignore */ }
  };

  // Definitief thema zodra de bron geladen is; daarvóór de cache (indien er is).
  const liveKey = isFetched ? resolveSiteThemaKey(activeGame) : null;
  const fetchedKey = isPreviewing ? previewKey : liveKey;
  const resolvedKey: ThemaKey | null = fetchedKey ?? cachedKey;
  const key: ThemaKey = resolvedKey ?? "roze";
  // ready voor de hero: zodra we een betrouwbaar thema hebben (fetch of cache).
  const ready = isFetched || cachedKey != null;

  useEffect(() => {
    if (isPreviewing) {
      applyThemaTokens(previewKey!, { persist: false });
      return;
    }
    if (isFetched && liveKey) {
      applyThemaTokens(liveKey);
      try {
        if (liveKey === "winter") localStorage.removeItem(THEMA_LS_KEY);
        else localStorage.setItem(THEMA_LS_KEY, liveKey);
      } catch { /* ignore */ }
    } else if (cachedKey) {
      applyThemaTokens(cachedKey);
    } else {
      // Eerste bezoek, nog geen data → race-neutrale accenten i.p.v. Giro-roze.
      neutralizeAccent();
    }
  }, [isPreviewing, previewKey, isFetched, liveKey, cachedKey]);

  // De tokens voor de nacht hangen aan [data-thema="winter"][data-modus="nacht"];
  // buiten winter mag het attribuut dus ook niet blijven hangen.
  useEffect(() => {
    const root = document.documentElement;
    if (key === "winter" && modus === "nacht") root.setAttribute("data-modus", "nacht");
    else root.removeAttribute("data-modus");
  }, [key, modus]);

  return (
    <ThemaContext.Provider value={{ thema: THEMAS[key], key, ready, canPreview, previewKey, setPreviewKey, modus, setModus }}>
      {children}
    </ThemaContext.Provider>
  );
}

export function useThema(): ThemaContextValue {
  return useContext(ThemaContext);
}
