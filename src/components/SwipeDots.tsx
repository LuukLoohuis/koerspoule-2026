/**
 * <SwipeDots> — stippen-indicator (mobiel-only) die toont dat er méér onderdelen
 * zijn. Naast de stippen een zelfverklarend label: de naam van de actieve tab
 * (activeLabel) of anders een subtiele "x / N". De actieve stip is langer +
 * thema-kleur; de rest gedempt.
 */
import { cn } from "@/lib/utils";

export default function SwipeDots({
  count,
  activeIndex,
  activeLabel,
  className,
}: {
  count: number;
  activeIndex: number;
  /** Naam van de actieve tab — naast de stippen getoond (zelfverklarend). */
  activeLabel?: string;
  className?: string;
}) {
  if (count <= 1) return null;
  return (
    <div
      className={cn("md:hidden flex items-center justify-center gap-2 py-1.5", className)}
    >
      <div aria-hidden className="flex items-center gap-1.5">
        {Array.from({ length: count }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all duration-200",
              i === activeIndex ? "w-4 bg-primary" : "w-1.5 bg-foreground/20",
            )}
          />
        ))}
      </div>
      <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/80">
        {activeLabel ? (
          <>
            <span className="font-bold text-foreground/70">{activeLabel}</span>
            <span className="mx-1 opacity-50">·</span>
            {activeIndex + 1}/{count}
          </>
        ) : (
          <>
            {activeIndex + 1} / {count}
          </>
        )}
      </span>
    </div>
  );
}
