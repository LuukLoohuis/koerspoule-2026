import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import PloegCWeergave from "@/components/ploeg/PloegCWeergave";
import { usePloegRanglijst } from "@/hooks/usePloegRanglijst";
import { useToast } from "@/hooks/use-toast";
import { entryErrorMessage } from "@/hooks/useEntry";

/**
 * Ploeg C: Mijn ploeg op een telefoon (docs/design/krant-ploeg-c). Dit is
 * de container: data uit usePloegRanglijst, de laad- en lege staat, en het
 * opslaan van de ploegnaam. De opmaak staat in PloegCWeergave.
 */
export default function PloegC({
  gameId,
  focusNameSignal,
  className,
}: {
  gameId?: string;
  /** Bump om de naam-editor te openen (deep-link ?edit=naam, de nudge-balk). */
  focusNameSignal?: number;
  className?: string;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const data = usePloegRanglijst(gameId);

  const naamOpslaan = async (naam: string): Promise<boolean> => {
    try {
      await data.saveTeamName.mutateAsync({ entryId: data.entry?.id, teamName: naam });
      toast({ title: t("ploegC.naamOpgeslagen") });
      return true;
    } catch (err) {
      toast({ title: t("ploegC.naamMislukt"), description: entryErrorMessage(err), variant: "destructive" });
      return false;
    }
  };

  if (data.laden) {
    return (
      <div data-eigen-typografie className={cn("font-inter", className)} aria-busy>
        <div className="retro-border bg-card flex animate-pulse items-center gap-3.5 px-3.5 py-3">
          <div className="h-[63px] w-[56px] rounded bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-2/3 rounded bg-muted" />
            <div className="h-7 w-1/3 rounded bg-muted" />
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">{t("ploegC.laden")}</p>
      </div>
    );
  }

  if (!data.heeftPloeg) {
    return (
      <div data-eigen-typografie className={cn("font-inter retro-border bg-card p-5 text-center", className)}>
        <div className="mb-2 text-4xl" aria-hidden>🚴‍♂️</div>
        <p className="font-display text-xl font-bold">{t("ploegC.geenPloegTitel")}</p>
        <p className="mt-1 font-serif text-sm italic text-muted-foreground">{t("ploegC.geenPloegTekst")}</p>
        <Link
          to="/team-samenstellen"
          className="mt-4 inline-flex h-10 items-center rounded-full border-[1.5px] border-foreground px-4 text-[13px] font-bold shadow-[1.5px_1.5px_0_hsl(var(--foreground))]"
        >
          {t("ploegC.naarPloegbouwer")}
        </Link>
      </div>
    );
  }

  return (
    <PloegCWeergave
      className={className}
      ploegnaam={data.teamName}
      onNaamOpslaan={naamOpslaan}
      naamBezig={data.saveTeamName.isPending}
      focusNameSignal={focusNameSignal}
      renners={data.renners}
      ritten={data.ritten}
      ploegPunten={data.ploegPunten}
      officieelTotaal={data.officieelTotaal}
    />
  );
}
