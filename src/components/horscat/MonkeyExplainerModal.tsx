/**
 * <MonkeyExplainerModal>
 *
 * Klein info-icoon dat een dialog opent met uitleg over de Monte-Carlo
 * "Aap met de dartpijl"-feature: monkey-metafoor → 5000 sims → percentile
 * → wat de uitslag betekent. Friendly Dutch copy, retro-stijl.
 */

import { useState } from "react";
import { Info, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Props = {
  /** Aantal monkey-runs (default 5000) — voor in de tekst. */
  monkeyCount?: number;
  /** Compacte trigger-knop (anders icoon-alleen). */
  variant?: "icon" | "text";
};

export default function MonkeyExplainerModal({ monkeyCount = 5000, variant = "icon" }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === "icon" ? (
          <button
            type="button"
            aria-label="Hoe werkt dit?"
            title="Hoe werkt dit?"
            className="inline-flex items-center justify-center rounded-full transition-colors"
            style={{
              width: 28,
              height: 28,
              border: "1.5px solid var(--ink-sepia)",
              background: "#FBF4DE",
              color: "var(--ink-sepia)",
            }}
          >
            <Info size={14} strokeWidth={2.4} />
          </button>
        ) : (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{
              border: "1.5px solid var(--ink-sepia)",
              background: "#FBF4DE",
              color: "var(--ink-sepia)",
              fontFamily: "'Oswald','Bebas Neue',sans-serif",
              fontWeight: 700,
              fontSize: "11px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            <Info size={13} strokeWidth={2.4} />
            <span>Hoe werkt dit?</span>
          </button>
        )}
      </DialogTrigger>

      <DialogContent
        className="vintage-paper max-w-lg max-h-[88vh] overflow-y-auto"
        style={{ border: "1.5px solid var(--ink-sepia)", color: "var(--ink-sepia)" }}
      >
        <DialogHeader>
          <DialogTitle
            className="text-left flex items-center gap-2"
            style={{
              fontFamily: "'Oswald','Bebas Neue','Archivo Black',sans-serif",
              fontWeight: 800,
              fontSize: "22px",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "var(--ink-sepia)",
            }}
          >
            <span aria-hidden style={{ fontSize: 26 }}>🐒</span>
            De aap met de dartpijl
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-[14px]" style={{ fontFamily: "'Source Serif 4',Georgia,serif", lineHeight: 1.55 }}>
          <p>
            <strong>Centrale vraag:</strong> ben jij beter dan blinde gok? Een aap kiest zijn
            ploeg willekeurig — wij simuleren dat heel vaak en kijken of jij het beter doet.
          </p>

          <div>
            <h3 className="text-[13px] mt-2 mb-1" style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-faded)" }}>
              Hoe werkt het?
            </h3>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li>Een denkbeeldige aap gooit dartpijlen op de startlijst en kiest zo zijn renners.</li>
              <li>Dat herhalen we {monkeyCount.toLocaleString("nl-NL")} keer, met exact dezelfde puntentelling als jij.</li>
              <li>We tellen het percentage apen dat <em>minder</em> punten heeft dan jij.</li>
              <li>Dat is jouw <strong>percentile</strong>: "Je verslaat X% van de apen".</li>
            </ol>
          </div>

          <div>
            <h3 className="text-[13px] mt-2 mb-1" style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-faded)" }}>
              Wat betekent het?
            </h3>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>≥ 85%</strong>: petje af — dit is duidelijk skill, geen toeval.</li>
              <li><strong>60–84%</strong>: netjes — je zit boven het gemiddelde van het toeval.</li>
              <li><strong>40–59%</strong>: gelijkspel — skill en kans houden elkaar in balans.</li>
              <li><strong>&lt; 40%</strong>: de aap had het beter gedaan; bananen voor jou.</li>
            </ul>
          </div>

          <p style={{ color: "var(--ink-faded)", fontSize: "12.5px" }}>
            Eén Tour is een korte steekproef — variance is hoog. Hoe meer etappes (en hoe
            scherper jouw keuzes), hoe meer betekenis het percentage krijgt. {monkeyCount.toLocaleString("nl-NL")} simulaties houden
            de schatting rustig, niet meer dan dat.
          </p>
        </div>

        <div className="flex justify-end mt-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{
              border: "1.5px solid var(--ink-sepia)",
              background: "var(--ink-sepia)",
              color: "var(--paper-light)",
              fontFamily: "'Oswald','Bebas Neue',sans-serif",
              fontWeight: 700,
              fontSize: "11px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            <X size={13} strokeWidth={2.6} />
            Sluiten
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
