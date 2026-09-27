import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import Wielertrui, { TruiBorst } from "@/components/retro/Wielertrui";
import { useKoersThema } from "@/contexts/KoersThemaContext";
import { readableForeground } from "@/lib/themas";
import { BLANCO_TRUI, getekendeTrui } from "@/lib/wielertruien";
import { pickVerdict } from "@/components/horscat/verdictConfig";
import type { HorsScores, HorsTabKey } from "@/components/karavaan/MiniStrip";

/** Inkt op een witte trui; los van het sitethema, want de trui blijft wit. */
const INKT_OP_WIT = `hsl(${readableForeground("#FFFFFF")})`;
const GLOED = "0 0 1px #fff, 0 0 2px #fff, 0 0 2px #fff, 0 0 3px #fff, 0 0 3px #fff";

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
  const thema = useKoersThema();
  const locale = i18n.language === "en" ? "en-GB" : "nl-NL";

  const leider = getekendeTrui(thema.key, "algemeen");
  const berg = thema.truien.berg;
  const bergBolletjes = berg.patroon === "bolletjes" ? berg.bolletjeKleur ?? null : null;
  const bergTekst = bergBolletjes ? INKT_OP_WIT : `hsl(${readableForeground(berg.kleur)})`;

  const monkey = scores.monkeyBeatPct;
  const emirates = scores.emiratesPct;
  const directeur = scores.directorScore;

  const truien: Array<{
    key: HorsTabKey;
    titel: string;
    aria: string;
    waarde: string | null;
    eenheid?: string;
    uitleg: string;
    /** De getekende trui; zonder tekening kleurt `kleur` de blanco trui. */
    src: string | null;
    kleur: string;
    bolletjes?: string | null;
    tekst: string;
    /** Witte gloed om het cijfer: houdt het los van de bolletjes. */
    gloed?: boolean;
  }> = [
    {
      key: "dartpijl",
      titel: t("krantC.monkeyIq"),
      aria: t("krantC.monkeyAria", { waarde: monkey ?? "–" }),
      waarde: monkey == null ? null : String(monkey),
      eenheid: "%",
      uitleg: monkey == null ? t("krantC.nogGeenCijfer") : t(`hors.dartpijl.verdict.${pickVerdict(monkey).key}.label`),
      src: leider,
      kleur: "hsl(var(--primary))",
      tekst: leider ? `hsl(${readableForeground(thema.truien.algemeen.kleur)})` : "hsl(var(--primary-foreground))",
    },
    {
      key: "superteam",
      titel: t("krantC.emirates"),
      aria: t("krantC.emiratesAria", { waarde: emirates ?? "–" }),
      waarde: emirates == null ? null : String(emirates),
      eenheid: "%",
      uitleg: emirates == null ? t("krantC.nogGeenCijfer") : t("krantC.emiratesUitleg"),
      src: BLANCO_TRUI,
      kleur: "hsl(var(--maillot-wit))",
      tekst: INKT_OP_WIT,
    },
    {
      key: "wielerdirecteur",
      titel: t("krantC.directeur"),
      aria: t("krantC.directeurAria", { waarde: directeur == null ? "–" : directeur.toLocaleString(locale) }),
      waarde: directeur == null ? null : directeur.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      uitleg: directeur == null ? t("krantC.nogGeenCijfer") : t("krantC.directeurUitleg"),
      src: getekendeTrui(thema.key, "berg"),
      kleur: berg.kleur,
      bolletjes: bergBolletjes,
      tekst: bergTekst,
      gloed: Boolean(bergBolletjes),
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
          {/* De tekening heeft zelf een dikke omlijning; met de 2,5 px schaduw
              van de handoff erbij wordt de rechterrand een balk. */}
          <Wielertrui breedte={96} hoogte={108} src={trui.src} kleur={trui.kleur} bolletjes={trui.bolletjes}>
            <TruiBorst>
              <span
                className="font-display text-[24px] font-black leading-none tracking-[-0.02em] tabular-nums"
                style={{ color: trui.tekst, textShadow: trui.gloed ? GLOED : undefined }}
              >
                {trui.waarde ?? "–"}
                {trui.waarde != null && trui.eenheid && <span className="text-[12px] font-bold">{trui.eenheid}</span>}
              </span>
            </TruiBorst>
          </Wielertrui>
          <span className="flex flex-col items-center gap-px">
            <span className="text-[12px] font-bold">{trui.titel}</span>
            <span className="text-center font-serif text-[11px] italic leading-[1.25] text-muted-foreground">{trui.uitleg}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
