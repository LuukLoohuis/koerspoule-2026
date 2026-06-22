import { createContext, useContext, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { THEMAS, deriveThemaKey, hexToHsl, readableForeground, type Thema, type ThemaKey } from "@/lib/themas";

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
}

export function ThemaProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();

  // Thema-bron: de nieuwste NIET-afgeronde game (concept/draft/open/locked/live)
  // bepaalt de site-stijl. Een afgeronde game levert géén site-thema. Is er geen
  // niet-afgeronde game, dan valt het terug op de meest recente (afgeronde) game.
  const { data: activeGame, isFetched } = useQuery({
    queryKey: ["actief-thema-game"],
    queryFn: async () => {
      if (!supabase) return null;
      const pick = async (withTheme: boolean) => {
        const cols = withTheme ? "id, game_type, theme" : "id, game_type";
        // 1) Nieuwste niet-afgeronde game
        const active = await (supabase as any)
          .from("games")
          .select(cols)
          .neq("status", "finished")
          .order("year", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (active.error) return { error: active.error };
        if (active.data) return { data: active.data };
        // 2) Fallback: meest recente game (incl. afgerond)
        const any = await (supabase as any)
          .from("games")
          .select(cols)
          .order("year", { ascending: false })
          .limit(1)
          .maybeSingle();
        return { data: any.data ?? null, error: any.error };
      };
      const res = await pick(true);
      if (res.error) {
        // theme-kolom bestaat mogelijk nog niet → val terug op game_type
        const fb = await pick(false);
        return fb.data ? { ...fb.data, theme: null } : null;
      }
      return res.data as { id: string; game_type: string | null; theme: string | null } | null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const key = deriveThemaKey(activeGame?.theme, activeGame?.game_type);
  // Pas thema-tokens (accent/primair) PAS toe als de bron geladen is — anders
  // flitst kort het default-thema (Giro/roze) voordat het juiste bekend is.
  const ready = isFetched;

  useEffect(() => {
    if (ready) applyThemaTokens(key);
  }, [key, ready]);

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

  return <ThemaContext.Provider value={{ thema: THEMAS[key], key, ready }}>{children}</ThemaContext.Provider>;
}

export function useThema(): ThemaContextValue {
  return useContext(ThemaContext);
}
