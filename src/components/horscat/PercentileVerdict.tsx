/**
 * <PercentileVerdict> — de Monkey IQ-hero.
 *
 * Minimale, premium hero boven de distributie: eyebrow "MONKEY IQ",
 * gigantische percentile, één regel uitleg, verdict-zin per band en een
 * vergelijkingsblok in dagklassement-stijl (Jij vs gem. aap, met de
 * voorsprong-cue). Afgesloten met de commentator-quote.
 *
 * Bands & copy via verdictConfig.ts — band-tekst hier nooit hardcoden.
 * Alle cijfers via props; niets hardcoded.
 */

import { Trans, useTranslation } from "react-i18next";
import { pickVerdict } from "./verdictConfig";

type Props = {
  /** Percentile 0–100, al berekend uit monkeyScores. */
  percentile: number;
  /** Jouw puntentotaal. */
  userPoints: number;
  /** Gemiddelde score van de gesimuleerde aap (afgerond). */
  monkeyAvg: number;
  /** Optionele aap-illustratie, gerenderd BINNEN de kaart (rechts desktop / onder mobiel). */
  illustrationSrc?: string;
  className?: string;
};

/** Geen count-up meer (bewust): toont direct de eindwaarde, niets telt op. */
function useCountUp(target: number): number {
  return target;
}

export default function PercentileVerdict({ percentile, userPoints, monkeyAvg, illustrationSrc, className }: Props) {
  const { t, i18n } = useTranslation();
  const numLocale = i18n.language === "en" ? "en-GB" : "nl-NL";
  const v = pickVerdict(percentile);
  const shown = useCountUp(percentile);

  // Voorsprong-cue: wie rijdt er voor, en met hoeveel?
  const diff = monkeyAvg - userPoints; // > 0 → de aap rijdt voor
  const apeLeads = diff > 0;
  const youLead = diff < 0;
  const cue = apeLeads
    ? t("hors.dartpijl.cueApeLeads", { diff })
    : youLead
      ? t("hors.dartpijl.cueYouLead", { diff: Math.abs(diff) })
      : t("hors.dartpijl.cueTie");

  const GOLD = "var(--medal-gold)";
  const INK = "var(--ink-sepia)";
  const FADED = "var(--ink-faded)";

  /** Eén kant van de vergelijking, gezet als dagklassement-regel. */
  const Side = ({ label, points, leads }: { label: string; points: number; leads: boolean }) => (
    <div className="flex-1 px-4 py-3.5 text-center">
      <div
        className="uppercase"
        style={{
          fontFamily: "'JetBrains Mono',monospace",
          fontSize: 10,
          letterSpacing: "0.22em",
          fontWeight: 700,
          color: leads ? GOLD : FADED,
        }}
      >
        {leads ? "● " : ""}{label}
      </div>
      <div
        className="tabular-nums leading-none mt-1.5"
        style={{
          fontFamily: "'Oswald','Bebas Neue','Archivo Black',sans-serif",
          fontWeight: 900,
          fontSize: "clamp(34px, 7vw, 48px)",
          color: leads ? GOLD : INK,
          textShadow: leads ? "1px 1px 0 rgba(58,42,26,0.12)" : undefined,
        }}
      >
        {points.toLocaleString(numLocale)}
        <span style={{ fontSize: "0.4em", fontWeight: 700, marginLeft: 4, color: FADED }}>pt</span>
      </div>
    </div>
  );

  return (
    <div
      className={"vintage-paper rounded-2xl px-5 py-5 md:py-6 text-center " + (className ?? "")}
      style={{ border: "1.5px solid var(--ink-sepia)", boxShadow: "0 2px 0 rgba(58,42,26,0.18)" }}
    >
      {/* Hero-inhoud links, aap-illustratie rechts (desktop) / onder (mobiel) — binnen de kaart. */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
        <div className="flex-1 min-w-0">
      {/* Score links, vergelijking rechts — compacte hero (mobiel gestapeld) */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-10">
        {/* Links: Monkey IQ + percentage */}
        <div className="text-center shrink-0">
          <div
            className="vintage-stamp uppercase"
            style={{ color: FADED, fontSize: "11px", letterSpacing: "0.32em" }}
          >
            {t("hors.dartpijl.monkeyIq")}
          </div>
          <div
            className="mt-1 leading-none tabular-nums"
            style={{
              fontFamily: "'Oswald','Bebas Neue','Archivo Black',sans-serif",
              fontWeight: 900,
              color: v.color,
              fontSize: "clamp(56px, 11vw, 92px)",
              textShadow: "3px 3px 0 rgba(58,42,26,0.10)",
            }}
            aria-label={t("hors.dartpijl.monkeyIqAria", { percentile })}
          >
            {shown}%
          </div>
          <p
            className="mt-1"
            style={{
              fontFamily: "'Source Serif 4',Georgia,serif",
              fontStyle: "italic",
              color: INK,
              fontSize: "14px",
            }}
          >
            <Trans i18nKey="hors.dartpijl.youBeat" values={{ percentile }} components={{ strong: <strong /> }} />
          </p>
        </div>

        {/* Rechts: vergelijking — dagklassement-stijl */}
        <div
          className="w-full max-w-md md:w-auto md:min-w-[340px] rounded-xl overflow-hidden"
          style={{
            border: "1.5px solid rgba(58,42,26,0.45)",
            background: "#FBF6E9",
            boxShadow: "0 2px 0 rgba(58,42,26,0.12)",
          }}
          role="group"
          aria-label={t("hors.dartpijl.compareAria", { userPoints, monkeyAvg })}
        >
          <div className="flex items-stretch">
            <Side label={t("hors.dartpijl.you")} points={userPoints} leads={youLead} />
            <div
              className="self-stretch flex items-center px-1"
              style={{
                borderLeft: "1px solid rgba(58,42,26,0.18)",
                borderRight: "1px solid rgba(58,42,26,0.18)",
              }}
            >
              <span
                style={{
                  fontFamily: "'Source Serif 4',Georgia,serif",
                  fontStyle: "italic",
                  color: FADED,
                  fontSize: 13,
                  padding: "0 6px",
                }}
              >
                {t("hors.dartpijl.vs")}
              </span>
            </div>
            <Side label={t("hors.dartpijl.monkeyAvg")} points={monkeyAvg} leads={apeLeads} />
          </div>
          {/* Voorsprong-cue */}
          <div
            className="py-1.5 text-center"
            style={{
              borderTop: "1px dashed rgba(58,42,26,0.25)",
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 10.5,
              letterSpacing: "0.08em",
              color: FADED,
            }}
          >
            {cue}
          </div>
        </div>
      </div>

      {/* Verdict-zin per band */}
      <p
        className="mt-4 inline-flex items-center gap-2"
        style={{
          fontFamily: "'Oswald','Bebas Neue',sans-serif",
          fontWeight: 800,
          color: v.color,
          fontSize: "15px",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        <span aria-hidden style={{ fontSize: "20px" }}>{v.emoji}</span>
        <span>{t(`hors.dartpijl.verdict.${v.key}.label`)}</span>
      </p>

      {/* Commentator-quote */}
      <p
        className="mt-3 italic mx-auto"
        style={{
          fontFamily: "'Source Serif 4','Playfair Display',Georgia,serif",
          fontStyle: "italic",
          color: INK,
          fontSize: "clamp(16px, 2.4vw, 19px)",
          maxWidth: 520,
          lineHeight: 1.4,
          fontWeight: 500,
        }}
      >
        <span
          aria-hidden
          style={{
            fontFamily: "'Playfair Display',Georgia,serif",
            color: GOLD,
            fontSize: "28px",
            lineHeight: 0,
            verticalAlign: "-5px",
            marginRight: 4,
          }}
        >
          “
        </span>
        {t("hors.dartpijl.quote")}
      </p>
        </div>
        {illustrationSrc && (
          <img
            src={illustrationSrc}
            alt=""
            aria-hidden
            className="select-none pointer-events-none h-auto shrink-0 w-[130px] mx-auto md:mx-0 md:w-[170px] lg:w-[210px]"
            style={{ filter: "drop-shadow(0 8px 14px rgba(58,42,26,0.18))" }}
          />
        )}
      </div>
    </div>
  );
}
