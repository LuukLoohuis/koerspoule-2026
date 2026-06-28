import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { ChevronRight } from "lucide-react";

type Dagprijs = {
  titel: string | null;
  sponsor_naam: string | null;
  sponsor_logo_url: string | null;
  afbeelding_url: string | null;
  sponsor_url: string | null;
};

/**
 * Compacte "Dagprijs van vandaag"-strook bovenaan L'Équipe. Toont de dagprijs met
 * is_dagprijs_vandaag=true van de actieve game (max. één). Geen banner = geen
 * actieve dagprijs. Leest alleen publieke prijsvelden (RLS: prizes publiek leesbaar).
 */
export default function DagprijsBanner({ gameId }: { gameId?: string }) {
  const { data } = useQuery({
    queryKey: ["dagprijs-vandaag", gameId],
    enabled: Boolean(supabase && gameId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Dagprijs | null> => {
      if (!supabase || !gameId) return null;
      const { data, error } = await supabase
        .from("prizes")
        .select("titel, sponsor_naam, sponsor_logo_url, afbeelding_url, sponsor_url")
        .eq("game_id", gameId)
        .eq("is_dagprijs_vandaag", true)
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return (data as Dagprijs) ?? null;
    },
  });

  if (!data) return null;

  const logo = data.sponsor_logo_url || data.afbeelding_url;
  const titel = data.titel?.trim() || "Dagprijs van vandaag";

  const logoEl = (
    <div className="h-12 w-16 shrink-0 rounded-md border border-[hsl(var(--vintage-gold)/0.4)] bg-card overflow-hidden flex items-center justify-center">
      {logo ? (
        <img src={logo} alt={data.sponsor_naam ?? "sponsor"} className="h-full w-full object-contain" loading="lazy" />
      ) : (
        <span className="text-[hsl(var(--vintage-gold))] text-lg font-display font-black">🎁</span>
      )}
    </div>
  );

  return (
    <div className="rounded-xl border-2 border-[hsl(var(--vintage-gold)/0.45)] bg-[hsl(var(--paper))] shadow-sm overflow-hidden">
      <div className="bolletjes-rule" aria-hidden />
      <div className="flex items-center gap-3 px-3 py-2.5">
        {data.sponsor_url ? (
          <a
            href={data.sponsor_url}
            target="_blank"
            rel="noopener noreferrer nofollow sponsored"
            aria-label={`Bezoek de website van ${data.sponsor_naam || "de sponsor"}`}
            className="shrink-0 transition-transform hover:-translate-y-px motion-reduce:transform-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--vintage-gold))] rounded-md"
          >
            {logoEl}
          </a>
        ) : (
          logoEl
        )}

        <div className="min-w-0 flex-1">
          <p className="overline-stamp text-[hsl(var(--vintage-gold))] leading-none">Dagprijs van vandaag</p>
          <p className="font-display font-bold leading-tight truncate">{titel}</p>
          {data.sponsor_naam && (
            <p className="hidden sm:block text-[10px] font-mono uppercase tracking-wider text-muted-foreground truncate">
              aangeboden door {data.sponsor_naam}
            </p>
          )}
        </div>

        <Link
          to="/prijzen"
          aria-label="Bekijk alle prijzen"
          className="shrink-0 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-[hsl(var(--vintage-gold))] hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--vintage-gold))] rounded px-1"
        >
          <span className="hidden sm:inline">Alle prijzen</span>
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
