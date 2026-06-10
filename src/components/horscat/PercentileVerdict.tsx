/**
 * <PercentileVerdict>
 *
 * Grote percentile-headline + verdict-zin per band, plus muted disclaimer.
 * Bands & copy via verdictConfig.ts — band-tekst hier nooit hardcoden.
 */

import { useEffect, useRef, useState } from "react";
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

/** Telt 0 → target in ~1.2s bij mount. Respecteert prefers-reduced-motion
 *  (springt direct naar target). */
function useCountUp(target: number, durationMs = 1200): number {
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [value, setValue] = useState(reduce ? target : 0);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (reduce) {
      setValue(target);
      return;
    }
    let startTs: number | null = null;
    const tick = (ts: number) => {
      if (startTs === null) startTs = ts;
      const t = Math.min(1, (ts - startTs) / durationMs);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(eased * target));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs, reduce]);

  return value;
}

export default function PercentileVerdict({ percentile, monkeyCount = 5000, hint, className }: Props) {
  const v = pickVerdict(percentile);
  const shown = useCountUp(percentile);
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
        {shown}%
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
        className="mt-4"
        style={{
          fontFamily: "'Source Serif 4',Georgia,serif",
          color: "var(--ink-faded)",
          fontSize: "11.5px",
          maxWidth: 540,
          margin: "16px auto 0",
          lineHeight: 1.55,
        }}
      >
        Eén Tour zit vol toeval. Hoe meer etappes en ploegen, hoe sterker dit cijfer staat.
        {" "}{monkeyCount.toLocaleString("nl-NL")} simulaties houden de schatting kalm — maar de wielergoden
        grinniken altijd ergens mee.
      </p>
      {/* Commentator-aside in Wuyts/De Cauwer-stijl — groter, geen byline. */}
      <p
        className="mt-4 italic"
        style={{
          fontFamily: "'Source Serif 4','Playfair Display',Georgia,serif",
          fontStyle: "italic",
          color: "var(--ink-sepia)",
          fontSize: "clamp(18px, 3vw, 22px)",
          maxWidth: 620,
          margin: "16px auto 0",
          borderLeft: "4px solid var(--medal-gold)",
          paddingLeft: 16,
          textAlign: "left",
          lineHeight: 1.4,
          fontWeight: 500,
        }}
      >
        <span aria-hidden style={{ fontFamily: "'Playfair Display',Georgia,serif", color: "var(--medal-gold)", fontSize: "34px", lineHeight: 0, verticalAlign: "-6px", marginRight: 4 }}>
          “
        </span>
        Awel, één Tour, dat is loterij, hé…
      </p>
    </div>
  );
}
