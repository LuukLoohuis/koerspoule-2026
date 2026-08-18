/**
 * <StatusBlok> — "hoe sta ik ervoor", bovenaan de Krant op mobiel.
 *
 * Waarom: op een telefoon opent iedereen de Krant en scrollt langs nieuws
 * zonder ooit zijn eigen stand te zien; daarvoor moest je eerst naar de
 * Volgwagen of naar Uitslagen. Vier getallen bovenaan nemen die omweg weg.
 *
 * Bewust vier en niet meer: plek in de poule, wat de laatste etappe opleverde,
 * plek in je subpoule, en het totaal. Alles wat verder gaat hoort thuis in de
 * Volgwagen — dit blok is een wegwijzer, geen dashboard.
 *
 * Alleen mobiel. Op de desktop staat het Salle-de-Course-dashboard al in de
 * Volgwagen, en die layout is net opnieuw ingedeeld; daar hoort niets bij.
 */
import { ArrowUp, ArrowDown, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMijnPloegStats, type MijnPloegStatsData } from "@/hooks/useMijnPloegStats";

function Delta({ n }: { n: number }) {
  if (n === 0) return null;
  return (
    <span
      className="inline-flex items-center gap-px text-[11px] font-bold tabular-nums leading-none"
      style={{ color: n > 0 ? "#2E8B57" : "#C0392B" }}
    >
      {n > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(n)}
    </span>
  );
}

function Cel({ label, waarde, bij }: { label: string; waarde: React.ReactNode; bij?: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-foreground/[0.045] px-2.5 py-2">
      <div className="font-mono text-[8.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 flex items-baseline gap-1.5 font-display text-[26px] font-black leading-none">
        {waarde}
        {bij}
      </div>
    </div>
  );
}

export default function StatusBlok({ onOpenKlassement }: { onOpenKlassement: () => void }) {
  const { overall, subpoule, totaalPunten, laatsteEtappe } = useMijnPloegStats();
  return (
    <StatusBlokView
      overall={overall}
      subpoule={subpoule}
      totaalPunten={totaalPunten}
      laatsteEtappe={laatsteEtappe}
      onOpenKlassement={onOpenKlassement}
    />
  );
}

/** Losgetrokken van de data zodat de opmaak in de testbank te beoordelen is. */
export function StatusBlokView({
  overall,
  subpoule,
  totaalPunten,
  laatsteEtappe,
  onOpenKlassement,
}: Pick<MijnPloegStatsData, "overall" | "subpoule" | "totaalPunten" | "laatsteEtappe"> & {
  onOpenKlassement: () => void;
}) {
  const { t } = useTranslation();

  // Zonder stand valt er niets te melden; een blok met vier streepjes is
  // slechter dan geen blok.
  if (!overall) return null;

  return (
    <div className="md:hidden mb-3 overflow-hidden rounded-xl border-2 border-foreground bg-card shadow-[3px_3px_0_hsl(var(--foreground))]">
      <div className="h-1 bg-gradient-to-r from-[hsl(var(--primary))] via-[hsl(var(--vintage-gold))] to-[hsl(var(--primary))]" />
      <div className="p-3">
        <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
          {laatsteEtappe
            ? t("statusblok.eyebrowNaEtappe", { nummer: laatsteEtappe.stageNumber })
            : t("statusblok.eyebrow")}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <Cel
            label={t("statusblok.algemeen")}
            waarde={<>#{overall.rank}</>}
            bij={<Delta n={overall.delta} />}
          />
          <Cel
            label={t("statusblok.laatsteRit")}
            waarde={laatsteEtappe?.rank ? <>{laatsteEtappe.rank}e</> : <>—</>}
            bij={
              laatsteEtappe ? (
                <span className="text-[11px] font-bold text-muted-foreground">
                  {t("statusblok.punten", { count: laatsteEtappe.points })}
                </span>
              ) : undefined
            }
          />
          {subpoule ? (
            <Cel
              label={t("statusblok.subpoule")}
              waarde={<>#{subpoule.rank}</>}
              bij={
                <span className="text-[11px] font-bold text-muted-foreground">
                  {t("statusblok.vanTotaal", { totaal: subpoule.total })}
                </span>
              }
            />
          ) : (
            <Cel
              label={t("statusblok.deelnemers")}
              waarde={<>{overall.total}</>}
            />
          )}
          <Cel
            label={t("statusblok.totaal")}
            waarde={<>{totaalPunten ?? 0}</>}
            bij={<span className="text-[11px] font-bold text-muted-foreground">{t("statusblok.pt")}</span>}
          />
        </div>

        <button
          type="button"
          onClick={onOpenKlassement}
          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-foreground bg-primary px-3 py-2 font-display text-[13px] font-bold text-primary-foreground shadow-[2px_2px_0_hsl(var(--foreground))] active:translate-y-px"
        >
          {t("statusblok.naarKlassement")}
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
