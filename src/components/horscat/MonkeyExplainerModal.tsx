/**
 * <MonkeyExplainerModal>
 *
 * Inline accordion (geen overlay/modal): klik op "Hoe werkt dit?" → uitleg
 * schuift onder de knop open en duwt content eronder weg. Klik opnieuw → dicht.
 *
 * De naam is om backwards-compat redenen ongewijzigd; gedrag = accordion.
 */

import { useEffect, useRef, useState } from "react";
import { Info, ChevronDown } from "lucide-react";

type Props = {
  monkeyCount?: number;
  /** Compacte trigger-knop (icon-only) of "text" met label. */
  variant?: "icon" | "text";
};

export default function MonkeyExplainerModal({ monkeyCount = 5000, variant = "icon" }: Props) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [maxH, setMaxH] = useState<number>(0);

  // Bereken doel-hoogte voor het uitvouw-paneel (smooth transition zonder
  // "hard cut" — vereist een numerieke maxHeight i.p.v. auto).
  useEffect(() => {
    if (!panelRef.current) return;
    if (open) {
      setMaxH(panelRef.current.scrollHeight);
    } else {
      setMaxH(0);
    }
  }, [open]);

  // Resize-safety: als het paneel open is en de inhoud verandert (font load,
  // etc.) updaten we de maxHeight zodat 'ie niet afgeknipt blijft.
  useEffect(() => {
    if (!open || !panelRef.current) return;
    const el = panelRef.current;
    const obs = new ResizeObserver(() => setMaxH(el.scrollHeight));
    obs.observe(el);
    return () => obs.disconnect();
  }, [open]);

  return (
    <div className="w-full">
      {/* Trigger */}
      <button
        type="button"
        aria-expanded={open}
        aria-controls="monkey-explainer-panel"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full transition-colors"
        style={
          variant === "icon"
            ? {
                width: 30,
                height: 30,
                justifyContent: "center",
                border: "1.5px solid var(--ink-sepia)",
                background: "#FBF4DE",
                color: "var(--ink-sepia)",
                borderRadius: 9999,
              }
            : {
                padding: "6px 12px",
                border: "1.5px solid var(--ink-sepia)",
                background: "#FBF4DE",
                color: "var(--ink-sepia)",
                fontFamily: "'Oswald','Bebas Neue',sans-serif",
                fontWeight: 700,
                fontSize: "11px",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }
        }
        aria-label="Hoe werkt dit?"
        title="Hoe werkt dit?"
      >
        <Info size={variant === "icon" ? 14 : 13} strokeWidth={2.4} />
        {variant === "text" && (
          <>
            <span>Hoe werkt dit?</span>
            <ChevronDown
              size={13}
              strokeWidth={2.4}
              style={{
                transition: "transform 250ms ease",
                transform: open ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          </>
        )}
      </button>

      {/* Inline expanding panel */}
      <div
        id="monkey-explainer-panel"
        role="region"
        aria-label="Uitleg Aap met de dartpijl"
        style={{
          overflow: "hidden",
          maxHeight: `${maxH}px`,
          transition: "max-height 320ms ease, opacity 240ms ease, margin-top 240ms ease",
          opacity: open ? 1 : 0,
          marginTop: open ? 12 : 0,
        }}
      >
        <div
          ref={panelRef}
          className="vintage-paper rounded-2xl p-4 md:p-5"
          style={{
            border: "1.5px solid var(--ink-sepia)",
            color: "var(--ink-sepia)",
            boxShadow: "0 2px 0 rgba(58,42,26,0.14)",
          }}
        >
          <h3
            className="flex items-center gap-2 mb-2"
            style={{
              fontFamily: "'Oswald','Bebas Neue','Archivo Black',sans-serif",
              fontWeight: 800,
              fontSize: "16px",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--ink-sepia)",
            }}
          >
            <span aria-hidden style={{ fontSize: 18 }}>🐒</span>
            De aap met de dartpijl — uitleg
          </h3>

          <div className="space-y-3 text-[13.5px]" style={{ fontFamily: "'Source Serif 4',Georgia,serif", lineHeight: 1.55 }}>
            <p>
              <strong>Centrale vraag:</strong> ben jij beter dan blinde gok? Een aap kiest zijn
              ploeg willekeurig — wij simuleren dat heel vaak en kijken of jij het beter doet.
            </p>

            <div>
              <h4 className="text-[12px] mt-1 mb-1" style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-faded)" }}>
                Hoe werkt het?
              </h4>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Een denkbeeldige aap gooit dartpijlen op de startlijst en kiest zo zijn renners.</li>
                <li>Dat herhalen we {monkeyCount.toLocaleString("nl-NL")} keer, met exact dezelfde puntentelling als jij.</li>
                <li>We tellen het percentage apen dat <em>minder</em> punten heeft dan jij.</li>
                <li>Dat is jouw <strong>percentile</strong>: "Je verslaat X% van de apen".</li>
              </ol>
            </div>

            <div>
              <h4 className="text-[12px] mt-1 mb-1" style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-faded)" }}>
                Wat betekent het?
              </h4>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>≥ 85%</strong>: petje af — dit is duidelijk skill, geen toeval.</li>
                <li><strong>60–84%</strong>: netjes — je zit boven het gemiddelde van het toeval.</li>
                <li><strong>40–59%</strong>: gelijkspel — skill en kans houden elkaar in balans.</li>
                <li><strong>&lt; 40%</strong>: de aap had het beter gedaan; bananen voor jou.</li>
              </ul>
            </div>

            <p style={{ color: "var(--ink-faded)", fontSize: "12px" }}>
              Eén Tour is een korte steekproef — variance is hoog. Hoe meer etappes en hoe
              scherper jouw keuzes, hoe meer betekenis het percentage krijgt. {monkeyCount.toLocaleString("nl-NL")} simulaties houden
              de schatting kalm, niet meer dan dat.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
