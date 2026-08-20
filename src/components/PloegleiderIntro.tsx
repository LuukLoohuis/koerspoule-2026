import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export type PloegleiderSleutel = "kastelein" | "lefevere";

/**
 * Kennismaking met degene die je rapport schrijft: Douwe Kastelein bij de
 * Meermarathon, Patrick Lefevere bij de wielergames.
 *
 * Vaste tekst, bewust niet gegenereerd. Iemand die zich elk bezoek anders
 * voorstelt is geen personage meer, en het scheelt bij elke paginalading een
 * OpenAI-call. Voor Lefevere telt daar iets bij op: hij bestaat echt, dus een
 * model dat hier vrij mag praten zou hem zomaar een verzonnen levensloop
 * toedichten. Deze tekst blijft bij zijn publieke rol en verzint geen
 * privégeschiedenis.
 */
export default function PloegleiderIntro({
  persona,
  className,
}: {
  persona: PloegleiderSleutel;
  className?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const alinea = ["p1", "p2", "p3", "p4", "p5", "p6"] as const;
  const v = (sleutel: string) => t(`hors.ploegleider.${persona}.${sleutel}`);

  return (
    <div className={cn("mt-4", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`ploegleider-intro-${persona}`}
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
          {v("initialen")}
        </span>
        <span className="font-display text-[12.5px] font-bold">{v("knop")}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div
          id={`ploegleider-intro-${persona}`}
          className="mt-3 rounded-r-xl border-l-[3px] border-[hsl(var(--vintage-gold))] bg-secondary/40 px-4 py-3.5"
        >
          <div className="mb-2.5 flex items-center gap-2.5">
            <span
              aria-hidden
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-foreground font-display text-[13px] font-black text-background"
            >
              {v("initialen")}
            </span>
            <span>
              <span className="block font-display text-[15px] font-bold leading-tight">{v("naam")}</span>
              <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {v("rol")}
              </span>
            </span>
          </div>
          {alinea.map((k) => v(k)).filter(Boolean).map((tekst, i) => (
            <p key={i} className="mb-2 font-serif text-[13.5px] leading-relaxed text-foreground/85 last:mb-0">
              {tekst}
            </p>
          ))}
          <p className="mt-2.5 font-serif text-[13.5px] font-bold italic text-[hsl(var(--vintage-gold))]">
            {v("slot")}
          </p>
        </div>
      )}
    </div>
  );
}
