/**
 * <SwipeDots> — subtiele stippen-indicator (mobiel-only) die het aantal tabs en
 * de actieve tab toont, en meebeweegt bij swipe/menu/pill-wissel. De actieve
 * stip is langer + thema-kleur; de rest gedempt.
 */
import { cn } from "@/lib/utils";

export default function SwipeDots({
  count,
  activeIndex,
  className,
}: {
  count: number;
  activeIndex: number;
  className?: string;
}) {
  if (count <= 1) return null;
  return (
    <div
      aria-hidden
      className={cn("md:hidden flex items-center justify-center gap-1.5 py-1.5", className)}
    >
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
  );
}
