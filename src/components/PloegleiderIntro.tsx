import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/**
 * Kennismaking met Douwe Kastelein, de ploegleider van de Meermarathon.
 *
 * Vaste tekst, bewust niet gegenereerd: hij hoort zich elke keer hetzelfde voor
 * te stellen. Een model dat zijn eigen jeugd per bezoek anders vertelt is geen
 * personage meer.
 *
 * Alleen bij Meermarathon — de wielergames hebben Patrick Lefevere en die stelt
 * zich niet voor.
 */
export default function PloegleiderIntro({ className }: { className?: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const alinea = ["p1", "p2", "p3", "p4", "p5", "p6"] as const;

  return (
    <div className={cn("mt-4", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="ploegleider-intro"
        className={cn(
          "inline-flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 transition-colors",
          "border-[hsl(var(--vintage-gold))/0.55] bg-[hsl(var(--vintage-gold))/0.12] hover:bg-[hsl(var(--vintage-gold))/0.22]",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--vintage-gold))]",
        )}
      >
        <span
          aria-hidden
          className="grid h-7 w-7 place-items-center rounded-full bg-foreground font-display text-[11px] font-black text-background"
        >
          DK
        </span>
        <span className="font-display text-[12.5px] font-bold">{t("hors.ploegleider.knop")}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div
          id="ploegleider-intro"
          className="mt-3 rounded-r-xl border-l-[3px] border-[hsl(var(--vintage-gold))] bg-secondary/40 px-4 py-3.5"
        >
          <div className="mb-2.5 flex items-center gap-2.5">
            <span
              aria-hidden
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-foreground font-display text-[13px] font-black text-background"
            >
              DK
            </span>
            <span>
              <span className="block font-display text-[15px] font-bold leading-tight">Douwe Kastelein</span>
              <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {t("hors.ploegleider.rol")}
              </span>
            </span>
          </div>
          {alinea.map((k) => (
            <p key={k} className="mb-2 font-serif text-[13.5px] leading-relaxed text-foreground/85 last:mb-0">
              {t(`hors.ploegleider.${k}`)}
            </p>
          ))}
          <p className="mt-2.5 font-serif text-[13.5px] font-bold italic text-[hsl(var(--vintage-gold))]">
            {t("hors.ploegleider.slot")}
          </p>
        </div>
      )}
    </div>
  );
}
