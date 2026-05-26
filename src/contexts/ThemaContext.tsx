import { createContext, useContext, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { THEMAS, deriveThemaKey, hexToHsl, readableForeground, type Thema, type ThemaKey } from "@/lib/themas";

type ThemaContextValue = { thema: Thema; key: ThemaKey };

const ThemaContext = createContext<ThemaContextValue>({ thema: THEMAS.roze, key: "roze" });

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

  // Achtergrond / papier + licht getinte cards
  root.style.setProperty("--background", achtergrond);
  root.style.setProperty("--card", kaart);
  root.style.setProperty("--popover", kaart);

  // Tekst
  root.style.setProperty("--foreground", tekst);
  root.style.setProperty("--card-foreground", tekst);
  root.style.setProperty("--popover-foreground", tekst);

  // Retro-gold accent → secundair/accent van het thema
  root.style.setProperty("--vintage-gold", accent);

  root.setAttribute("data-thema", key);
}

export function ThemaProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();

  // Actieve game (live/open), nieuwste eerst — bron van het thema.
  const { data: activeGame } = useQuery({
    queryKey: ["actief-thema-game"],
    queryFn: async () => {
      if (!supabase) return null;
      const { data, error } = await (supabase as any)
        .from("games")
        .select("id, game_type, theme")
        .in("status", ["live", "open"])
        .order("year", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        // theme-kolom bestaat mogelijk nog niet → val terug op game_type
        const { data: fb } = await (supabase as any)
          .from("games")
          .select("id, game_type")
          .in("status", ["live", "open"])
          .order("year", { ascending: false })
          .limit(1)
          .maybeSingle();
        return fb ? { ...fb, theme: null } : null;
      }
      return data as { id: string; game_type: string | null; theme: string | null } | null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const key = deriveThemaKey(activeGame?.theme, activeGame?.game_type);

  useEffect(() => {
    applyThemaTokens(key);
  }, [key]);

  // Realtime: themawissel door admin → direct bij alle clients
  useEffect(() => {
    if (!supabase) return;
    const ch = supabase
      .channel("games-thema")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "games" }, () => {
        qc.invalidateQueries({ queryKey: ["actief-thema-game"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  return <ThemaContext.Provider value={{ thema: THEMAS[key], key }}>{children}</ThemaContext.Provider>;
}

export function useThema(): ThemaContextValue {
  return useContext(ThemaContext);
}
