/**
 * <SwipeHintBar> — eenmalige swipe-coachmark (mobiel-only). Een klein geanimeerd
 * gebaar (hand die links↔rechts wiebelt tussen twee pijlen) + uitleg. Verdwijnt
 * na de eerste succesvolle swipe of na ~5s; ✕ klikt 'm voorgoed weg. Retro,
 * reduced-motion → geen icoon-animatie.
 */
import { ChevronLeft, ChevronRight, Hand, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SwipeHintBar({
  visible,
  onClose,
  className,
}: {
  visible: boolean;
  onClose: () => void;
  className?: string;
}) {
  if (!visible) return null;
  return (
    <div
      className={cn(
        "md:hidden flex items-center gap-2.5 rounded-lg border-2 border-foreground/20 bg-card px-3 py-2 text-xs text-muted-foreground shadow-sm",
        className,
      )}
      role="status"
    >
      {/* Geanimeerd gebaar: pijlen + wiebelende hand. */}
      <span className="relative flex h-6 w-10 shrink-0 items-center justify-center text-primary">
        <ChevronLeft className="absolute left-0 h-3.5 w-3.5 opacity-60" />
        <Hand className="kp-swipe-nudge h-4 w-4" />
        <ChevronRight className="absolute right-0 h-3.5 w-3.5 opacity-60" />
      </span>
      <span className="font-sans leading-tight">
        Veeg naar links of rechts om te wisselen
      </span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Hint sluiten"
        className="ml-auto -mr-1 shrink-0 p-1 text-muted-foreground/70 hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
