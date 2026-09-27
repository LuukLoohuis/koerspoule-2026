import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import CijferTrui from "@/components/krant/CijferTrui";
import { pickVerdict } from "@/components/horscat/verdictConfig";
import type { HorsScores, HorsTabKey } from "@/components/karavaan/MiniStrip";
import type { HorsTrui } from "@/lib/wielertruien";

/**
 * Hors Catégorie als drie wielertruien op de Krant: Monkey IQ in de kleur
 * van de koers, Emirates in het wit, de Directeur in de bergtrui van het
 * thema. Bestaat de trui als tekening (geel, bolletjes, wit), dan is het die
 * tekening; anders de blanco trui in de kleur van het thema. Het cijfer staat
 * op de borst; het onderschrift is de echte uitleg (de verdict-band uit
 * verdictConfig, de Emirates-memo), geen voorbeeldtekst. Elke trui opent zijn
 * eigen analyse in de bijlage.
 */
export default function HorsTruien({
  scores,
  onOpen,
  className,
}: {
  scores: HorsScores;
  onOpen?: (tab: HorsTabKey) => void;
  className?: string;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en-GB" : "nl-NL";

  const monkey = scores.monkeyBeatPct;
  const emirates = scores.emiratesPct;
  const directeur = scores.directorScore;

  const truien: Array<{
    key: HorsTabKey;
    trui: HorsTrui;
    titel: string;
    aria: string;
    waarde: string | null;
    eenheid?: string;
    uitleg: string;
  }> = [
    {
      key: "dartpijl",
      trui: "leider",
      titel: t("krantC.monkeyIq"),
      aria: t("krantC.monkeyAria", { waarde: monkey ?? "–" }),
      waarde: monkey == null ? null : String(monkey),
      eenheid: "%",
      uitleg: monkey == null ? t("krantC.nogGeenCijfer") : t(`hors.dartpijl.verdict.${pickVerdict(monkey).key}.label`),
    },
    {
      key: "superteam",
      trui: "wit",
      titel: t("krantC.emirates"),
      aria: t("krantC.emiratesAria", { waarde: emirates ?? "–" }),
      waarde: emirates == null ? null : String(emirates),
      eenheid: "%",
      uitleg: emirates == null ? t("krantC.nogGeenCijfer") : t("krantC.emiratesUitleg"),
    },
    {
      key: "wielerdirecteur",
      trui: "berg",
      titel: t("krantC.directeur"),
      aria: t("krantC.directeurAria", { waarde: directeur == null ? "–" : directeur.toLocaleString(locale) }),
      waarde: directeur == null ? null : directeur.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      uitleg: directeur == null ? t("krantC.nogGeenCijfer") : t("krantC.directeurUitleg"),
    },
  ];

  return (
    <div className={cn("grid grid-cols-3 gap-2 px-0 pb-1.5 pt-1", className)}>
      {truien.map((trui) => (
        <button
          key={trui.key}
          type="button"
          onClick={() => onOpen?.(trui.key)}
          aria-label={trui.aria}
          className="flex flex-col items-center gap-1.5 rounded-lg text-foreground transition-transform active:scale-[0.97] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[hsl(var(--vintage-gold))]"
        >
          <CijferTrui trui={trui.trui} waarde={trui.waarde} eenheid={trui.eenheid} />
          <span className="flex flex-col items-center gap-px">
            <span className="text-[12px] font-bold">{trui.titel}</span>
            <span className="text-center font-serif text-[11px] italic leading-[1.25] text-muted-foreground">{trui.uitleg}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
