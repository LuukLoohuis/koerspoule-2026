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
};

const ThemaContext = createContext<ThemaContextValue>({
  thema: THEMAS.roze,
  key: "roze",
  ready: false,
  canPreview: false,
  previewKey: null,
  setPreviewKey: () => {},
});

type ThemeGame = {
  game_type?: string | null;
  status?: string | null;
  theme?: string | null;
} | null;

/** Meermarathon voert de globale winterstijl uitsluitend tijdens de livefase. */
export function resolveSiteThemaKey(game: ThemeGame): ThemaKey {
  if (game?.game_type === "meermarathon") {
    return game.status === "live" ? "winter" : "roze";
  }
  return deriveThemaKey(game?.theme, game?.game_type);
}

/** Zet de thema-kleuren op de bestaande HSL-tokens → hele site herkleurt. */
function applyThemaTokens(key: ThemaKey, opts: { persist?: boolean } = {}) {
  const persist = opts.persist ?? true;
  const t = THEMAS[key];
  const root = document.documentElement;
  const k = t.kleuren;

  const primair = hexToHsl(k.primair);
  const primairFg = readableForeground(k.primair);
  const achtergrond = hexToHsl(k.achtergrond);
  const kaart = hexToHsl(k.kaart ?? k.achtergrond);
  const tekst = hexToHsl(k.tekst);
  const accent = hexToHsl(k.accent);

  // Brand / primair
  root.style.setProperty("--primary", primair);
  root.style.setProperty("--primary-foreground", primairFg);
  root.style.setProperty("--ring", primair);
  root.style.setProperty("--jersey-pink", primair);
  root.style.setProperty("--sidebar-primary", primair);
  root.style.setProperty("--sidebar-ring", primair);
  root.style.setProperty("--sidebar-primary-foreground", primairFg);

  if (key === "winter") {
    // Meermarathon is het enige thema met een volledige recolor (achtergrond +
    // kaart + tekst) — de koersthema's blijven bewust op het neutrale
    // crème-papier (een getinte achtergrond vond de gebruiker daar te fel).
    root.style.setProperty("--background", achtergrond);
    root.style.setProperty("--card", kaart);
    root.style.setProperty("--popover", kaart);
    root.style.setProperty("--foreground", tekst);
    root.style.setProperty("--card-foreground", tekst);
    root.style.setProperty("--popover-foreground", tekst);
  } else {
    root.style.removeProperty("--background");
    root.style.removeProperty("--card");
    root.style.removeProperty("--popover");
    root.style.removeProperty("--foreground");
    root.style.removeProperty("--card-foreground");
    root.style.removeProperty("--popover-foreground");
  }

  // Retro-gold accent → secundair/accent van het thema
  root.style.setProperty("--vintage-gold", accent);

  root.setAttribute("data-thema", key);

  // Favicon en homescreen-icon behouden het compacte witte-fiets-ontwerp in de
  // racekleur. De zichtbare app-logo's worden door KoerspouleLogo bijgewerkt.
  document
    .querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]')
    .forEach((link) => { link.href = t.favicon; });

  // Admin-preview past de tokens alleen visueel toe — nooit in de no-flash-
  // cache, anders zien andere bezoekers (of de admin zelf later) per ongeluk
  // de preview i.p.v. het echte thema.
  if (!persist) return;

  // Persisteer de toegepaste accent-tokens zodat het no-flash-script in
  // index.html ze bij een volgend bezoek vóór de eerste paint kan zetten.
  try {
    if (key === "winter") {
      // Winter mag bij een volgende start niet uit cache verschijnen als de
      // Meermarathon inmiddels niet meer live staat.
      localStorage.removeItem(THEMA_TOKENS_LS_KEY);
    } else {
      localStorage.setItem(
        THEMA_TOKENS_LS_KEY,
        JSON.stringify({ "--primary": primair, "--primary-foreground": primairFg, "--ring": primair, "--jersey-pink": primair, "--vintage-gold": accent }),
      );
    }
  } catch { /* ignore */ }
}

const THEMA_LS_KEY = "koerspoule:themaKey";
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

  return (
    <ThemaContext.Provider value={{ thema: THEMAS[key], key, ready, canPreview, previewKey, setPreviewKey }}>
      {children}
    </ThemaContext.Provider>
  );
}

export function useThema(): ThemaContextValue {
  return useContext(ThemaContext);
}
