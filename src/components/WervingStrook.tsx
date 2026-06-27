import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Megaphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePromotedSubpoules } from "@/hooks/usePromotedSubpoules";

/**
 * Wegklikbare wervingsstrook op de homepage voor subpoules met
 * promote_on_landing=true. Toont max. één (de nieuwste). "Doe mee" opent de
 * join-flow met de code voorgevuld (?join=<code>, geen auto-submit). Weggeklikt
 * blijft 'ie weg binnen de sessie (sessionStorage).
 */
export default function WervingStrook() {
  const navigate = useNavigate();
  const { data = [] } = usePromotedSubpoules();
  const promo = data[0];
  const dismissKey = promo ? `werving-dismissed:${promo.code}` : "";
  const [dismissed, setDismissed] = useState(
    () => Boolean(promo) && typeof sessionStorage !== "undefined" && sessionStorage.getItem(dismissKey) === "1",
  );

  if (!promo || dismissed) return null;

  const tekst = promo.promote_text?.trim() || `Doe mee met ${promo.name} en strijd mee om de gele trui!`;

  const close = () => {
    try { sessionStorage.setItem(dismissKey, "1"); } catch { /* sessie zonder storage */ }
    setDismissed(true);
  };

  return (
    <section className="container mx-auto px-5 pt-6">
      <div className="retro-border bg-card rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 relative">
        <button
          type="button"
          onClick={close}
          aria-label="Wervingsactie sluiten"
          className="absolute top-2 right-2 text-muted-foreground/60 hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0 pr-6">
          <Megaphone className="h-6 w-6 text-[hsl(var(--vintage-gold))] shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="font-display font-bold leading-tight">{promo.name}</p>
            <p className="text-sm text-muted-foreground font-serif leading-snug">{tekst}</p>
            <p className="mt-1 text-xs font-mono uppercase tracking-wider text-muted-foreground">
              code: <span className="font-bold text-foreground">{promo.code}</span>
            </p>
          </div>
        </div>

        <Button
          className="retro-border-primary font-bold shrink-0 w-full sm:w-auto"
          onClick={() => navigate(`/mijn-peloton?tab=subpoules&join=${encodeURIComponent(promo.code)}`)}
        >
          Doe mee →
        </Button>
      </div>
    </section>
  );
}
