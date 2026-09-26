import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { meermarathonCategorieRang } from "@/lib/gameTypes";

export type GameRow = {
  id: string;
  name: string;
  year: number;
  status: "concept" | "draft" | "open" | "open_inschrijving" | "locked" | "live" | "finished" | string;
  game_type: "giro" | "tour" | "tdf" | "vuelta" | "femmes" | string | null;
  /** Meermarathon: "vrouwen" of "mannen". Leeg bij wielergames. */
  categorie?: "vrouwen" | "mannen" | string | null;
  /** Centrale themasleutel; game_type blijft de fallback voor oudere databases. */
  theme?: "roze" | "geel" | "rood" | string | null;
  prizes_visible?: boolean | null;
  admin_testmodus?: boolean | null;
  /** "Inschrijving open"-banner voor deze game (admin, handmatig). */
  inschrijf_banner_visible?: boolean | null;
  /** Hors Categorie-teaser in de Krant (admin, handmatig). */
  hors_banner_visible?: boolean | null;
  /** Deelnemersteller tonen voor deze game (admin, handmatig). */
  deelnemers_teller_visible?: boolean | null;
};

export function useAllGames() {
  return useQuery({
    queryKey: ["all-games"],
    // Status-wissels snel oppikken (realtime-invalidatie zit in useCurrentGame).
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    queryFn: async (): Promise<GameRow[]> => {
      if (!supabase) return [];
      const SELECT_ZONDER_CATEGORIE = "id, name, year, status, game_type, theme, prizes_visible, admin_testmodus, inschrijf_banner_visible, hors_banner_visible, deelnemers_teller_visible";
      const SELECT = `${SELECT_ZONDER_CATEGORIE}, categorie`;
      // Vóór de inschrijf_banner-migratie geeft de volle select een 42703
      // (undefined column) → val terug op de kolomlijst zonder dat veld.
      const SELECT_LEGACY = "id, name, year, status, game_type, prizes_visible, admin_testmodus";
      const fetchWith = (select: string) =>
        supabase!
          .from("games")
          .select(select)
          .order("year", { ascending: false })
          .order("created_at", { ascending: false });
      // Per ontbrekende kolom (42703: nog niet gemigreerd) één stap terug.
      let res = await fetchWith(SELECT);
      for (const fallback of [SELECT_ZONDER_CATEGORIE, SELECT_LEGACY]) {
        if (!(res.error && (res.error as { code?: string }).code === "42703")) break;
        res = await fetchWith(fallback);
      }
      if (res.error) throw res.error;
      const rows = (res.data ?? []) as unknown as GameRow[];
      const typeOrder = (t: string | null | undefined) => {
        const k = (t ?? "").toLowerCase();
        if (k === "giro") return 0;
        if (k === "tour" || k === "tdf") return 1;
        if (k === "femmes") return 2;
        if (k === "vuelta" || k === "vta") return 3;
        if (k === "meermarathon") return 4;
        return 5;
      };
      return [...rows].sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        // Binnen één seizoen staan Meermarathon Vrouwen en Mannen naast elkaar.
        return typeOrder(a.game_type) - typeOrder(b.game_type)
          || meermarathonCategorieRang(a.categorie) - meermarathonCategorieRang(b.categorie);
      });
    },
  });
}

export function gameTheme(type: string | null | undefined): {
  country: "IT" | "FR" | "ES" | "NL";
  colors: string[];
} {
  switch ((type ?? "").toLowerCase()) {
    case "tour":
    case "tdf":
    case "femmes":
      return { country: "FR", colors: ["#002395", "#ffffff", "#ED2939"] };
    case "vuelta":
    case "vta":
      return { country: "ES", colors: ["#AA151B", "#F1BF00", "#AA151B"] };
    case "giro":
      return { country: "IT", colors: ["#009246", "#ffffff", "#CE2B37"] };
    case "meermarathon":
      return { country: "NL", colors: ["#061f4f", "#0b4c91", "#167fbd"] };
    default:
      return { country: "IT", colors: ["#009246", "#ffffff", "#CE2B37"] };
  }
}
