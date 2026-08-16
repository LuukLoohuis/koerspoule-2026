import { createContext, useContext, useEffect, useMemo } from "react";
import { THEMAS, deriveThemaKey, hexToHsl, readableForeground, type Thema, type ThemaKey } from "@/lib/themas";
import { useSelectedGame } from "@/context/SelectedGameContext";

type ThemaContextValue = { thema: Thema; key: ThemaKey; ready: boolean };

const ThemaContext = createContext<ThemaContextValue>({ thema: THEMAS.roze, key: "roze", ready: false });

/** Zet de thema-kleuren op de bestaande HSL-tokens → hele site herkleurt. */
function applyThemaTokens(key: ThemaKey) {
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

  // Achtergrond/papier + tekst blijven NEUTRAAL (base-tokens) — gebruiker vond
  // de getinte roze/gele/rode achtergrond te fel. Alleen accenten zijn themed.
  root.style.removeProperty("--background");
  root.style.removeProperty("--card");
  root.style.removeProperty("--popover");
  root.style.removeProperty("--foreground");
  root.style.removeProperty("--card-foreground");
  root.style.removeProperty("--popover-foreground");
  // referenties behouden (lint) zonder ze toe te passen
  void achtergrond; void kaart; void tekst;

  // Retro-gold accent → secundair/accent van het thema
  root.style.setProperty("--vintage-gold", accent);

  root.setAttribute("data-thema", key);

  // Favicon en homescreen-icon behouden het compacte witte-fiets-ontwerp in de
  // racekleur. De zichtbare app-logo's worden door KoerspouleLogo bijgewerkt.
  document
    .querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]')
    .forEach((link) => { link.href = t.favicon; });

  // Persisteer de toegepaste accent-tokens zodat het no-flash-script in
  // index.html ze bij een volgend bezoek vóór de eerste paint kan zetten.
  try {
    localStorage.setItem(
      THEMA_TOKENS_LS_KEY,
      JSON.stringify({ "--primary": primair, "--primary-foreground": primairFg, "--ring": primair, "--jersey-pink": primair, "--vintage-gold": accent }),
    );
  } catch { /* ignore */ }
}

const THEMA_LS_KEY = "koerspoule:themaKey";
const THEMA_TOKENS_LS_KEY = "koerspoule:themaTokens";

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
    return v && v in THEMAS ? (v as ThemaKey) : null;
  } catch {
    return null;
  }
}

export function ThemaProvider({ children }: { children: React.ReactNode }) {
  // Eén bron voor de hele deelnemer-app: exact dezelfde opgeloste game als de
  // GameSwitcher, useCurrentGame en de overige game-scoped schermen.
  const { selectedGame: activeGame, loading } = useSelectedGame();
  const isFetched = !loading;

  // Laatst-bekende thema uit localStorage → terugkerende bezoekers zien meteen
  // het juiste thema (geen flits). Eénmalig per mount gelezen.
  const cachedKey = useMemo(() => readCachedKey(), []);

  // Definitief thema zodra de bron geladen is; daarvóór de cache (indien er is).
  const fetchedKey = isFetched
    ? deriveThemaKey(activeGame?.theme, activeGame?.game_type)
    : null;
  const resolvedKey: ThemaKey | null = fetchedKey ?? cachedKey;
  const key: ThemaKey = resolvedKey ?? "roze";
  // ready voor de hero: zodra we een betrouwbaar thema hebben (fetch of cache).
  const ready = isFetched || cachedKey != null;

  useEffect(() => {
    if (isFetched && fetchedKey) {
      applyThemaTokens(fetchedKey);
      try { localStorage.setItem(THEMA_LS_KEY, fetchedKey); } catch { /* ignore */ }
    } else if (cachedKey) {
      applyThemaTokens(cachedKey);
    } else {
      // Eerste bezoek, nog geen data → race-neutrale accenten i.p.v. Giro-roze.
      neutralizeAccent();
    }
  }, [isFetched, fetchedKey, cachedKey]);

  return <ThemaContext.Provider value={{ thema: THEMAS[key], key, ready }}>{children}</ThemaContext.Provider>;
}

export function useThema(): ThemaContextValue {
  return useContext(ThemaContext);
}
