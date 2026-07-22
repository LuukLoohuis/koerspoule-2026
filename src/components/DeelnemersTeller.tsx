import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useCurrentGame } from "@/hooks/useCurrentGame";

/**
 * Subtiel sociaal bewijs op de homepage: "Al <N> koersliefhebbers doen mee".
 *
 * Per game: telt via count_deelnemers_game(game_id) de deelnemers van de
 * ACTIEVE game (ingediend of concept-met-keuze), zodat het cijfer elke game
 * opnieuw bij nul begint. Alleen zichtbaar als de admin de teller voor die game
 * heeft aangezet (games.deelnemers_teller_visible) — gaat nooit vanzelf aan.
 * Toont niets tijdens laden of bij 0 → geen layout-sprong, geen lege stand.
 */
export default function DeelnemersTeller({ className }: { className?: string }) {
  const { i18n } = useTranslation();
  const nf = new Intl.NumberFormat(i18n.language === "en" ? "en-GB" : "nl-NL");
  const { data: game } = useCurrentGame({ ignoreSelectedGame: true });
  const gameId = game?.id;
  const enabled = Boolean(game?.deelnemers_teller_visible);

  const { data } = useQuery({
    queryKey: ["count-deelnemers-game", gameId],
    enabled: Boolean(supabase && gameId && enabled),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<number> => {
      if (!supabase || !gameId) return 0;
      const { data, error } = await supabase.rpc("count_deelnemers_game", { p_game_id: gameId });
      if (error) return 0;
      return typeof data === "number" ? data : 0;
    },
  });

  // Alleen tonen als de admin 'm aanzette én er echte deelnemers zijn.
  if (!enabled || !data || data < 1) return null;

  return (
    <div
      className={
        "inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-3.5 py-1.5 text-sm " +
        (className ?? "")
      }
    >
      <Users className="h-4 w-4 text-[hsl(var(--vintage-gold))] shrink-0" aria-hidden />
      <span className="text-muted-foreground">
        <Trans
          i18nKey="shell.teller.count"
          count={data}
          values={{ formatted: nf.format(data) }}
          components={{ strong: <strong className="font-display font-bold tabular-nums text-[hsl(var(--vintage-gold))]" /> }}
        />
      </span>
    </div>
  );
}
