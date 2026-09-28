import { CheckCircle2, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLastApprovedStage } from "@/hooks/useResults";
import { meermarathonStageLabel } from "@/lib/gameTypes";
import { cn } from "@/lib/utils";

export default function ResultsUpdatedBadge({
  gameId,
  meermarathon = false,
  className,
}: {
  gameId?: string;
  /** De Meermarathon rijdt wedstrijden: "t/m Cup 3", niet "t/m etappe 3". */
  meermarathon?: boolean;
  className?: string;
}) {
  const { t, i18n } = useTranslation();
  const { data: last, isLoading } = useLastApprovedStage(gameId);

  if (isLoading) return null;

  const base =
    "inline-flex items-center gap-2 px-3 py-1.5 retro-border bg-card text-xs font-sans";

  if (!last) {
    return (
      <div className={cn(base, "text-muted-foreground", className)}>
        <Clock className="w-3.5 h-3.5" />
        <span>{t("results.updatedBadge.none")}</span>
      </div>
    );
  }

  const datum = last.approved_at
    ? new Date(last.approved_at).toLocaleDateString(
        i18n.language === "en" ? "en-GB" : "nl-NL",
        {
          day: "numeric",
          month: "short",
        },
      )
    : null;

  return (
    <div className={cn(base, className)}>
      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
      <span>
        {t("results.updatedBadge.prefix")}{" "}
        {meermarathon ? (
          // Het label draagt de eigen naam al ("Amsterdam"), anders de soort.
          <strong>{meermarathonStageLabel(last)}</strong>
        ) : (
          <>
            <strong>{t("results.updatedBadge.stage", { number: last.stage_number })}</strong>
            {last.name ? ` — ${last.name}` : ""}
          </>
        )}
        {datum ? ` (${datum})` : ""}
      </span>
    </div>
  );
}
