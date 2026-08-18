/**
 * <SwipeHintBar> — eenmalige veeghint per sectie (mobiel-only). Verdwijnt na de
 * eerste geslaagde veeg of na ~6s; de ✕ klikt 'm voorgoed weg.
 *
 * Eén regel op het papier, geen kaart meer. Dit was een banner met eigen rand,
 * schaduw, twee tekstregels en een gebarenicoon van 28px hoog: 52px voor een
 * mededeling die je één keer leest. Nu 15, met dezelfde boodschap.
 *
 * reduced-motion → geen wiebelende pijl (.kp-swipe-nudge).
 */
import { ChevronsLeftRight, X } from "lucide-react";
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
        "md:hidden flex items-center gap-1.5 pt-1 text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground",
        className,
      )}
      role="status"
    >
      <ChevronsLeftRight className="kp-swipe-nudge h-3 w-3 shrink-0 text-primary" />
      <span className="min-w-0 truncate">{t("team.swipeHint.title")}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label={t("team.swipeHint.closeAria")}
        className="-my-1 ml-auto shrink-0 p-1 text-muted-foreground/60 hover:text-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
