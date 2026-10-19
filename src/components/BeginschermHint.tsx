/**
 * <BeginschermHint> — één regel boven de onderbalk: "Zet Koerspoule op je
 * beginscherm". Tik opent de uitleg (iPhone) of de installatievraag (Android);
 * de ✕ klikt 'm voor 60 dagen weg.
 *
 * Zelfde stem als SwipeHintBar: mono, klein, geen kaart. Hij hoort bij de
 * onderbalk en schuift dus mee weg terwijl je leest. Wanneer hij mag, staat in
 * lib/beginscherm (tweede bezoek, nog niet als app, cookiebanner weg).
 */
import { useEffect } from "react";
import { ChevronRight, Download, Share, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useBeginscherm } from "@/hooks/useBeginscherm";
import { captureEvent } from "@/lib/posthog";

export default function BeginschermHint() {
  const { t } = useTranslation();
  const { hintZichtbaar, kanInstalleren, platform, open, verbergHint } = useBeginscherm();

  useEffect(() => {
    if (hintZichtbaar) captureEvent("beginscherm_hint_getoond", { platform });
  }, [hintZichtbaar, platform]);

  if (!hintZichtbaar) return null;

  const Icoon = kanInstalleren ? Download : Share;
  return (
    <div className="flex items-center gap-1 border-t border-border/40 bg-card px-4 text-[10px] font-mono tracking-[0.12em] text-muted-foreground motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      <button
        type="button"
        onClick={() => open("hint")}
        // Hoogte komt van de mobiele tapmaat voor knoppen (36px, index.css).
        className="flex min-w-0 flex-1 items-center gap-1.5 text-left hover:text-foreground"
      >
        <Icoon className="h-3 w-3 shrink-0 text-primary" strokeWidth={2.25} aria-hidden />
        {/* uppercase hier: de knop-reset van Tailwind zet text-transform terug */}
        <span className="min-w-0 truncate uppercase">
          {t(kanInstalleren ? "shell.beginscherm.hintInstalleer" : "shell.beginscherm.hint")}
        </span>
        <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
      </button>
      <button
        type="button"
        onClick={verbergHint}
        aria-label={t("shell.beginscherm.hintSluiten")}
        className="-mr-1.5 shrink-0 p-1.5 text-muted-foreground/60 hover:text-foreground"
      >
        <X className="h-3 w-3" aria-hidden />
      </button>
    </div>
  );
}
