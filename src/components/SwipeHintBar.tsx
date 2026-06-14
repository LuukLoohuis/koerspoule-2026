/**
 * <SwipeHintBar> — duidelijke, wegklikbare swipe-hint (mobiel-only). Verschijnt
 * één keer en verdwijnt na ✕ of na de eerste succesvolle swipe.
 */
import { ArrowLeftRight, X } from "lucide-react";
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
        "md:hidden flex items-center justify-center gap-2 rounded-lg border border-foreground/20 bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-sm",
        className,
      )}
      role="status"
    >
      <ArrowLeftRight className="h-3.5 w-3.5 shrink-0 text-primary" />
      <span className="font-sans">Veeg om te wisselen</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Hint sluiten"
        className="ml-1 -mr-1 p-1 text-muted-foreground/70 hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
