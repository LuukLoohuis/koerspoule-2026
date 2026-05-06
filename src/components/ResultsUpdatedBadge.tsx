import { CheckCircle2, Clock } from "lucide-react";
import { useLastApprovedStage } from "@/hooks/useResults";
import { cn } from "@/lib/utils";

export default function ResultsUpdatedBadge({
  gameId,
  className,
}: {
  gameId?: string;
  className?: string;
}) {
  const { data: last, isLoading } = useLastApprovedStage(gameId);

  if (isLoading) return null;

  const base =
    "inline-flex items-center gap-2 px-3 py-1.5 retro-border bg-card text-xs font-sans";

  if (!last) {
    return (
      <div className={cn(base, "text-muted-foreground", className)}>
        <Clock className="w-3.5 h-3.5" />
        <span>Nog geen uitslagen bijgewerkt.</span>
      </div>
    );
  }

  const datum = last.approved_at
    ? new Date(last.approved_at).toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "short",
      })
    : null;

  return (
    <div className={cn(base, className)}>
      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
      <span>
        Bijgewerkt t/m <strong>etappe {last.stage_number}</strong>
        {last.name ? ` — ${last.name}` : ""}
        {datum ? ` (${datum})` : ""}
      </span>
    </div>
  );
}
