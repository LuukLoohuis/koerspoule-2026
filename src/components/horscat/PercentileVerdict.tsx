/**
 * <PercentileVerdict>
 *
 * Grote percentile-headline + verdict-zin per band, plus muted disclaimer.
 * Bands & copy via verdictConfig.ts — band-tekst hier nooit hardcoden.
 */

import { pickVerdict } from "./verdictConfig";

type Props = {
  /** Percentile 0–100, al berekend uit monkeyScores. */
  percentile: number;
  /** Aantal monkey-simulaties (voor disclaimer). */
  monkeyCount?: number;
  /** Optionele subtitel-regel. */
  hint?: string;
  className?: string;
};

export default function PercentileVerdict({ percentile, monkeyCount = 5000, hint, className }: Props) {
  const v = pickVerdict(percentile);
  return (
    <div
      className={"vintage-paper rounded-2xl p-5 md:p-6 text-center " + (className ?? "")}
      style={{ border: "1.5px solid var(--ink-sepia)", boxShadow: "0 2px 0 rgba(58,42,26,0.18)" }}
    >
      <div
        className="vintage-stamp"
        style={{ color: "var(--ink-faded)", fontSize: "10.5px", letterSpacing: "0.28em" }}
      >
        — De headline —
      </div>
      <div
        className="mt-2 leading-none tabular-nums"
        style={{
          fontFamily: "'Oswald','Bebas Neue','Archivo Black',sans-serif",
          fontWeight: 900,
          color: v.color,
          fontSize: "clamp(40px, 9vw, 64px)",
          textShadow: "2px 2px 0 rgba(58,42,26,0.10)",
        }}
        aria-label={`Je verslaat ${percentile} procent van de apen`}
      >
        {percentile}%
      </div>
      <p
        className="mt-1"
        style={{
          fontFamily: "'Source Serif 4',Georgia,serif",
          fontStyle: "italic",
          color: "var(--ink-sepia)",
          fontSize: "14px",
        }}
      >
        Je verslaat <strong>{percentile}%</strong> van de apen
      </p>
      <p
        className="mt-3 inline-flex items-center gap-2"
        style={{
          fontFamily: "'Oswald','Bebas Neue',sans-serif",
          fontWeight: 800,
          color: v.color,
          fontSize: "16px",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        <span aria-hidden style={{ fontSize: "20px" }}>{v.emoji}</span>
        <span>{v.label}</span>
      </p>
      {hint && (
        <p className="mt-1" style={{ color: "var(--ink-faded)", fontSize: "12px" }}>
          {hint}
        </p>
      )}
      <p
        className="mt-4 italic"
        style={{
          fontFamily: "'Source Serif 4',Georgia,serif",
          color: "var(--ink-faded)",
          fontSize: "11.5px",
          maxWidth: 520,
          margin: "16px auto 0",
        }}
      >
        Eén Tour is variance — hoe meer etappes en hoe meer ploegen, hoe meer betekenis het
        cijfer krijgt. {monkeyCount.toLocaleString("nl-NL")} simulaties houden de schatting
        rustig, maar de wielergoden kunnen alsnog gnuiven.
      </p>
    </div>
  );
}
