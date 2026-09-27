import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import CijferTrui from "@/components/krant/CijferTrui";
import { pickVerdict } from "@/components/horscat/verdictConfig";
import type { HorsScores, HorsTabKey } from "@/components/karavaan/MiniStrip";
import type { HorsTrui } from "@/lib/wielertruien";

/**
 * Hors Catégorie als drie wielertruien: Monkey IQ in de kleur van de koers,
 * Emirates in het wit, de Directeur in de bergtrui van het thema. Cijfer en
 * label staan als opdruk op de borst. Daaronder alleen de uitleg (de
 * verdict-band uit verdictConfig, de Emirates-memo): de naam staat al op de
 * trui, een titel eronder zegt het twee keer. Elke trui opent zijn eigen
 * analyse in de bijlage.
 *
 * De truien hangen tegen elkaar, mouw over mouw, zoals in het ontwerp: de
 * buitenste twee vóór de middelste. Daarom is elke trui iets breder dan zijn
 * kolom en schuiven de buitenste naar binnen.
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
    /** De opdruk onder het cijfer. */
    label: string;
    aria: string;
    waarde: string | null;
    eenheid?: string;
    uitleg: string;
    /** Waar de trui in zijn kolom hangt, en of hij vóór zijn buren valt. */
    plek: string;
  }> = [
    {
      key: "dartpijl",
      trui: "leider",
      label: t("krantC.truiMonkey"),
      aria: t("krantC.monkeyAria", { waarde: monkey ?? "–" }),
      waarde: monkey == null ? null : String(monkey),
      eenheid: "%",
      uitleg: monkey == null ? t("krantC.nogGeenCijfer") : t(`hors.dartpijl.verdict.${pickVerdict(monkey).key}.label`),
      plek: "z-10 self-start",
    },
    {
      key: "superteam",
      trui: "wit",
      label: t("krantC.truiRendement"),
      aria: t("krantC.emiratesAria", { waarde: emirates ?? "–" }),
      waarde: emirates == null ? null : String(emirates),
      eenheid: "%",
      uitleg: emirates == null ? t("krantC.nogGeenCijfer") : t("krantC.emiratesUitleg"),
      plek: "z-0 self-center",
    },
    {
      key: "wielerdirecteur",
      trui: "berg",
      label: t("krantC.truiRapport"),
      aria: t("krantC.directeurAria", { waarde: directeur == null ? "–" : directeur.toLocaleString(locale) }),
      waarde: directeur == null ? null : directeur.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      uitleg: directeur == null ? t("krantC.nogGeenCijfer") : t("krantC.directeurUitleg"),
      plek: "z-10 self-end",
    },
  ];

  return (
    <div className={cn("grid grid-cols-3 pb-1.5 pt-1", className)}>
      {truien.map((trui) => (
        <button
          key={trui.key}
          type="button"
          onClick={() => onOpen?.(trui.key)}
          aria-label={trui.aria}
          className="flex min-w-0 flex-col gap-2 rounded-lg text-foreground transition-transform active:scale-[0.97] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[hsl(var(--vintage-gold))]"
        >
          <CijferTrui
            trui={trui.trui}
            waarde={trui.waarde}
            eenheid={trui.eenheid}
            label={trui.label}
            className={cn("w-[106%] shrink-0", trui.plek)}
          />
          <span className="self-stretch px-1 text-center font-serif text-[11px] italic leading-[1.25] text-muted-foreground">
            {trui.uitleg}
          </span>
        </button>
      ))}
    </div>
  );
}
