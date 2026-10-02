import { Check, Loader2, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  /** Het indienen loopt: draaier in plaats van het icoon, knop op slot. */
  bezig?: boolean;
  /** Ploeg compleet en nog in te dienen (of gewijzigd): de knop nodigt uit. */
  klaar?: boolean;
  /** Ingediend zonder openstaande wijziging: ruststand, geen actie meer. */
  ingediend?: boolean;
  /** Smalle uitvoering voor de sticky onderbalk op mobiel. */
  compact?: boolean;
  title?: string;
  className?: string;
};

/**
 * De indienknop van de ploegbouwer.
 *
 * Een knop met dikte die je indrukt, op elke plek met dezelfde tekst. Drie
 * gezichten: uitnodigend zodra de ploeg klaar is (gouden gloed om de rand, de
 * knop zelf blijft vol van kleur), bezig tijdens het indienen en een groene
 * ruststand zodra alles binnen is.
 */
export default function IndienKnop({
  label,
  onClick,
  disabled,
  bezig,
  klaar,
  ingediend,
  compact,
  title,
  className,
}: Props) {
  const { t } = useTranslation();
  const Icoon = bezig ? Loader2 : ingediend ? Check : Send;

  return (
    <Button
      type="button"
      size={compact ? "sm" : "lg"}
      onClick={onClick}
      disabled={disabled || bezig}
      aria-busy={bezig || undefined}
      title={title}
      className={cn(
        "font-display font-bold tracking-wide",
        compact ? "h-10 px-4 text-sm" : "h-12 px-6 text-base",
        ingediend
          ? "rounded-[9px] border-2 border-emerald-600/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 disabled:opacity-100"
          : "kp-indien",
        bezig && "disabled:opacity-90",
        klaar && !bezig && "kp-indien-klaar",
        className,
      )}
    >
      <Icoon className={cn(bezig && "animate-spin")} aria-hidden />
      {bezig ? t("team.builder.submitting") : label}
    </Button>
  );
}
