/**
 * <BeginschermPaneel> — uitleg in drie stappen: Koerspoule als app op je
 * beginscherm. Opent vanuit de hint boven de onderbalk of vanuit het menu.
 *
 * Elke stap toont het knopje zoals je het in de browser terugziet (Deel, ⋮),
 * zodat je niet hoeft te zoeken naar wat er bedoeld wordt. De ingebouwde
 * browser van Instagram en co. kan het niet; daar eerst naar Safari.
 */
import type { ReactNode } from "react";
import { Compass, EllipsisVertical, KeyRound, Plus, Share, SquarePlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useBeginscherm } from "@/hooks/useBeginscherm";
import type { Platform } from "@/lib/beginscherm";
import { cn } from "@/lib/utils";

type Stap = { sleutel: string; icoon: ReactNode };

const ICOON = "h-[18px] w-[18px]";

function stappenVoor(platform: Platform, voegToe: string): Stap[] {
  const deel: Stap[] = [
    { sleutel: "deel", icoon: <Share className={ICOON} aria-hidden /> },
    { sleutel: "zetOpBeginscherm", icoon: <SquarePlus className={ICOON} aria-hidden /> },
    // Zoals de knop rechtsboven in Safari: blauw woord, geen icoon.
    { sleutel: "voegToe", icoon: <span className="text-[13px] font-semibold">{voegToe}</span> },
  ];
  if (platform === "ios-inapp") {
    return [{ sleutel: "openInSafari", icoon: <Compass className={ICOON} aria-hidden /> }, ...deel];
  }
  if (platform === "android") {
    return [
      { sleutel: "androidMenu", icoon: <EllipsisVertical className={ICOON} aria-hidden /> },
      { sleutel: "androidInstalleer", icoon: <Plus className={ICOON} aria-hidden /> },
      { sleutel: "androidBevestig", icoon: null },
    ];
  }
  return deel;
}

export default function BeginschermPaneel() {
  const { t } = useTranslation();
  const { paneelOpen, sluit, platform } = useBeginscherm();
  const stappen = stappenVoor(platform, t("shell.beginscherm.voegToeKnop"));
  const ios = platform !== "android";

  return (
    <Sheet open={paneelOpen} onOpenChange={(open) => !open && sluit()}>
      <SheetContent
        side="bottom"
        className="mx-auto max-w-lg rounded-t-2xl border-x-2 border-t-2 border-foreground bg-card px-5 pt-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
      >
        <SheetHeader className="space-y-1 text-left">
          <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
            {t(ios ? "shell.beginscherm.overlineIos" : "shell.beginscherm.overlineAndroid")}
          </p>
          <SheetTitle className="font-display text-2xl leading-tight">
            {t("shell.beginscherm.titel")}
          </SheetTitle>
          <SheetDescription className="font-serif text-[15px] leading-snug">
            {t("shell.beginscherm.intro")}
          </SheetDescription>
        </SheetHeader>

        <ol className="mt-5 space-y-3">
          {stappen.map((stap, i) => (
            <li key={stap.sleutel} className="flex items-start gap-3">
              <span
                className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-foreground font-oswald text-[12px] font-bold leading-none tabular-nums"
                aria-hidden
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-snug">{t(`shell.beginscherm.stap.${stap.sleutel}.titel`)}</p>
                <p className="text-sm leading-snug text-muted-foreground">
                  {t(`shell.beginscherm.stap.${stap.sleutel}.uitleg`)}
                </p>
              </div>
              {stap.icoon && (
                <span
                  // iOS-blauw: zo herken je het knopje in Safari terug.
                  className={cn(
                    "grid h-9 min-w-9 shrink-0 place-items-center rounded-lg border border-border bg-background px-2",
                    ios ? "text-[#007AFF]" : "text-foreground",
                  )}
                  aria-hidden
                >
                  {stap.icoon}
                </span>
              )}
            </li>
          ))}
        </ol>

        {ios && (
          <p className="mt-4 flex items-start gap-2 border-t border-border/60 pt-3 text-xs leading-snug text-muted-foreground">
            <KeyRound className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
            {t("shell.beginscherm.opnieuwInloggen")}
          </p>
        )}

        <Button className="retro-border-primary mt-4 w-full font-bold" onClick={sluit}>
          {t("shell.beginscherm.begrepen")}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
