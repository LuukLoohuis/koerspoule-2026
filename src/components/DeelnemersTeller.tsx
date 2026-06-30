import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { supabase } from "@/lib/supabase";

// Onder deze drempel tonen we de teller niet (lage beginstand schrikt af).
// Makkelijk aanpasbaar.
const MIN_DEELNEMERS_TONEN = 100;

const nlFormat = new Intl.NumberFormat("nl-NL");

/**
 * Subtiel sociaal bewijs op de homepage (variant C): "Al <N> koersliefhebbers
 * doen mee". Getal komt via de veilige count_deelnemers()-RPC (alleen een
 * integer, geen persoonsdata). Toont niets tijdens laden of onder de drempel →
 * geen layout-sprong, geen afschrikkende lage stand.
 */
export default function DeelnemersTeller({ className }: { className?: string }) {
  const { data } = useQuery({
    queryKey: ["count-deelnemers"],
    enabled: Boolean(supabase),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<number> => {
      if (!supabase) return 0;
      const { data, error } = await supabase.rpc("count_deelnemers");
      if (error) return 0;
      return typeof data === "number" ? data : 0;
    },
  });

  if (!data || data < MIN_DEELNEMERS_TONEN) return null;

  return (
    <div
      className={
        "inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-3.5 py-1.5 text-sm " +
        (className ?? "")
      }
    >
      <Users className="h-4 w-4 text-[hsl(var(--vintage-gold))] shrink-0" aria-hidden />
      <span className="text-muted-foreground">
        Al <strong className="font-display font-bold tabular-nums text-[hsl(var(--vintage-gold))]">{nlFormat.format(data)}</strong> koersliefhebbers doen mee
      </span>
    </div>
  );
}
