import { cn } from "@/lib/utils";

type Tone = "ink" | "wine" | "jaune" | "thema";

/**
 * Stempel — typmachine-stijl decoratie voor page-headers en bulletins.
 *
 * <Stamp>Etappe 05 · 21 Mei</Stamp>
 * <Stamp tone="wine" rotation={-3}>Bulletin №12</Stamp>
 */
export default function Stamp({
  children,
  tone = "wine",
  rotation = -3,
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  rotation?: number;
  className?: string;
}) {
  const toneClasses: Record<Tone, string> = {
    ink: "text-foreground border-foreground/70 bg-foreground/[0.04]",
    wine: "text-[hsl(var(--bolletjes-bright))] border-[hsl(var(--bolletjes-bright))/0.7] bg-[hsl(var(--bolletjes-bright))/0.06]",
    jaune: "text-[hsl(var(--maillot-jaune-dark))] border-[hsl(var(--maillot-jaune-dark))/0.7] bg-[hsl(var(--maillot-jaune))/0.12]",
    thema: "text-primary border-primary/70 bg-primary/[0.07]",
  };

  return (
    <span
      className={cn(
        "inline-block font-stamp uppercase tracking-[0.15em] text-[11px] md:text-xs leading-none px-2.5 py-1.5 rounded-sm border-2 border-dashed select-none whitespace-nowrap",
        toneClasses[tone],
        className,
      )}
      style={{ transform: `rotate(${rotation}deg)` }}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}
