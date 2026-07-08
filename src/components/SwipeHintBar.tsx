/**
 * <SwipeHintBar> — eenmalige swipe-coachmark per sectie (mobiel-only). Een
 * geanimeerd hand-/pijl-gebaar + heldere tekst. Duidelijk zichtbaar maar
 * smaakvol-retro. Verdwijnt na de eerste succesvolle swipe of na ~6s; ✕ klikt
 * 'm voorgoed weg. reduced-motion → geen icoon-animatie (.kp-swipe-nudge).
 */
import { ChevronLeft, ChevronRight, Hand, X } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  if (!visible) return null;
  return (
    <div
      className={cn(
        "md:hidden flex items-center gap-3 rounded-xl border-2 border-primary/40 bg-primary/[0.07] px-3.5 py-2.5 shadow-[2px_2px_0_hsl(var(--foreground)/0.15)]",
        className,
      )}
      role="status"
    >
      {/* Geanimeerd gebaar: pijlen + wiebelende hand. */}
      <span className="relative flex h-7 w-12 shrink-0 items-center justify-center text-primary">
        <ChevronLeft className="absolute left-0 h-4 w-4 opacity-70" />
        <Hand className="kp-swipe-nudge h-5 w-5" />
        <ChevronRight className="absolute right-0 h-4 w-4 opacity-70" />
      </span>
      <span className="min-w-0 flex-1 text-[13px] leading-tight">
        <span className="block font-display font-bold text-foreground">{t("team.swipeHint.title")}</span>
        <span className="block text-[11px] font-serif italic text-muted-foreground">
          {t("team.swipeHint.subtitle")}
        </span>
      </span>
      <button
        type="button"
        onClick={onClose}
        aria-label={t("team.swipeHint.closeAria")}
        className="-mr-1 shrink-0 self-start p-1 text-muted-foreground/70 hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
