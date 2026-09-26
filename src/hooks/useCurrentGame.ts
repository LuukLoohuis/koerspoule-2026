import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useSelectedGame } from "@/context/SelectedGameContext";

/**
 * Huidige game met focus-/interval-refresh: status-wissels (open→live→locked)
 * worden opgepikt bij terugkeer naar de tab of na max 15s (staleTime).
 *
 * Géén realtime-subscription: `games` staat niet in de realtime-publicatie, dus
 * een postgres_changes-channel ving toch niks en kostte bij veel gelijktijdige
 * sessies alleen open kanalen. Focus/reconnect-refetch dekt de status-wissels.
 */

export type Game = {
  id: string;
  name: string;
  year: number;
  status: "draft" | "open" | "open_inschrijving" | "locked" | "live" | "finished";
  game_type?: "giro" | "tdf" | "tour" | "femmes" | "vuelta" | "meermarathon" | null;
  /** Meermarathon: "vrouwen" of "mannen". Leeg bij wielergames. */
  categorie?: "vrouwen" | "mannen" | null;
  homepage_quote?: string | null;
  homepage_quote_author?: string | null;
  /** Fontgrootte (px) van de hero-quote; null = frontend-default (34). */
  homepage_quote_size?: number | null;
  /** Prijzen-tab zichtbaar voor deelnemers (per game). */
  prizes_visible?: boolean | null;
  /** Admin-only testmodus: admin ziet alles ongeacht status (geen effect op deelnemers). */
  admin_testmodus?: boolean | null;
  /** Homepage-deelnemersteller aan/uit voor deze game (admin, handmatig). */
  deelnemers_teller_visible?: boolean | null;
  /** Hors Categorie-teaser in de Krant aan/uit (admin, handmatig). */
  hors_banner_visible?: boolean | null;
};

const SELECT_ZONDER_CATEGORIE =
  "id, name, year, status, game_type, homepage_quote, homepage_quote_author, homepage_quote_size, prizes_visible, admin_testmodus, deelnemers_teller_visible, hors_banner_visible";
const SELECT = `${SELECT_ZONDER_CATEGORIE}, categorie`;
// Zolang de homepage_quote_size-migratie nog niet op de DB staat zou de
// volle SELECT een 42703 (undefined column) geven en heel current-game
// breken. Dan vallen we terug op de oude kolomlijst.
const SELECT_LEGACY =
  "id, name, year, status, game_type, homepage_quote, homepage_quote_author";

export function useCurrentGame(
  { ignoreSelectedGame = false, preferRegistration = false }:
  { ignoreSelectedGame?: boolean; preferRegistration?: boolean } = {},
) {
  // De gedeelde gamekeuze (expliciet of de centraal opgeloste default).
  const { selectedGameId, selectedGame } = useSelectedGame();
  // De publieke homepage moet altijd de live-first default tonen. Een historische
  // sessiekeuze uit Mijn Peloton mag daar niet de quote, status of teller bepalen.
  //
  // De teambouwer volgt de keuze alleen als die game zelf open staat voor
  // inschrijving. Nodig zodra er twee tegelijk openstaan (Meermarathon
  // Vrouwen en Mannen): de switcher of de "Doe mee"-link (?game=) bepaalt dan
  // voor welke van de twee je een ploeg bouwt.
  const effectiveSelectedGameId = ignoreSelectedGame
    ? null
    : preferRegistration
      ? (selectedGame?.status === "open_inschrijving" ? selectedGame.id : null)
      : selectedGameId ?? selectedGame?.id ?? null;

  return useQuery({
    // De opgeloste game-id in de key → zowel de default als een expliciete
    // gamewissel hertriggert alle verbruikers met exact dezelfde game.
    queryKey: [
      "current-game",
      effectiveSelectedGameId,
      preferRegistration ? "registration-first" : ignoreSelectedGame ? "live-default" : "selected",
    ],
    // Status-wissels (open→live→locked) snel oppikken, ook bij terugkeer naar de tab.
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    queryFn: async (): Promise<Game | null> => {
      if (!supabase) return null;

      // Expliciet gekozen game: haal precies die op. Bestaat 'ie niet (meer),
      // val door naar de default-logica zodat er nooit een lege staat is.
      const fetchById = async (select: string, id: string) => {
        const { data, error } = await supabase!
          .from("games")
          .select(select)
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;
        return (data as unknown as Game | null) ?? null;
      };

      // Nieuwste eerst. Binnen één jaar vrouwen vóór mannen, zodat de keuze
      // tussen de twee Meermarathon-games niet van de databasevolgorde afhangt
      // (DESC: "vrouwen" > "mannen", wielergames zonder categorie achteraan).
      const fetchNewest = async (select: string, statuses?: string[]) => {
        let query = supabase!.from("games").select(select);
        if (statuses) query = query.in("status", statuses);
        query = query.order("year", { ascending: false });
        if (select === SELECT) query = query.order("categorie", { ascending: false, nullsFirst: false });
        const { data, error } = await query.limit(1).maybeSingle();
        if (error) throw error;
        return (data as unknown as Game | null) ?? null;
      };

      const fetchWith = async (select: string) => {
        if (effectiveSelectedGameId) {
          const chosen = await fetchById(select, effectiveSelectedGameId);
          if (chosen) return chosen;
        }

        // De teambouwer hoort altijd bij de koers waarvoor deelnemers zich nú
        // kunnen inschrijven, onafhankelijk van een eerder gekozen live/archiefgame.
        if (preferRegistration) {
          const registration = await fetchNewest(select, ["open_inschrijving"]);
          if (registration) return registration;
        }

        // Eerst een lopende game. Daarna telt een concept/draft-game ook als
        // "actief", zodat de subpoule-/dashboard-context al laadt voordat de
        // inschrijving opengaat. Anders de meest recente, welke status ook.
        return (
          (await fetchNewest(select, ["open", "open_inschrijving", "locked", "live"])) ??
          (await fetchNewest(select, ["concept", "draft"])) ??
          (await fetchNewest(select))
        );
      };

      // Per ontbrekende kolom (42703: nog niet gemigreerd) één stap terug.
      const selects = [SELECT, SELECT_ZONDER_CATEGORIE, SELECT_LEGACY];
      for (let i = 0; ; i++) {
        try {
          return await fetchWith(selects[i]);
        } catch (e) {
          const code = (e as { code?: string })?.code;
          if (code !== "42703" || i === selects.length - 1) throw e;
        }
      }
    },
  });
}
