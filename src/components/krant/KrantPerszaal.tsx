import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useThema } from "@/contexts/ThemaContext";
import { monogram } from "@/lib/krantC";
import type { KaravaanEtappe } from "@/hooks/useKaravaanFeed";

const MONO = "font-['JetBrains_Mono',monospace]";

/**
 * Tab Perszaal: wat Michel Wuyts en José De Cauwer over de laatste rit zeiden,
 * als twee grote citaten met een monogram-rondje, gescheiden door het
 * ornament. De teksten zijn het bestaande commentaar van de Koerskrant.
 */
export default function KrantPerszaal({ etappe, laden }: { etappe: KaravaanEtappe | null; laden: boolean }) {
  const { t } = useTranslation();
  const { thema } = useThema();

  const citaten = etappe
    ? [
        { naam: "Michel Wuyts", functie: t("krantC.commentator"), tekst: etappe.michel_tekst },
        { naam: "José De Cauwer", functie: t("krantC.analist"), tekst: etappe.jose_tekst },
      ].filter((c): c is { naam: string; functie: string; tekst: string } => Boolean(c.tekst?.trim()))
    : [];

  return (
    <div role="tabpanel" className="flex flex-col gap-[22px]">
      {etappe && (
        <span className="editor-eyebrow">
          {t("krantC.perszaalEyebrow", { etappe: thema.etappe, nummer: etappe.stage_number })}
        </span>
      )}

      {citaten.length === 0 ? (
        <p className={cn("m-0 font-serif text-sm italic text-muted-foreground", laden && "animate-pulse")}>
          {laden ? t("karavaan.etappe.commentaarLoading") : t("krantC.perszaalLeeg")}
        </p>
      ) : (
        citaten.map((c, i) => (
          <Fragment key={c.naam}>
            {i > 0 && (
              <div aria-hidden className="vintage-ornament">
                <span className="vintage-ornament-symbol">⚜</span>
              </div>
            )}
            <figure className="m-0 flex flex-col gap-3">
              <span aria-hidden className="h-7 font-display text-[64px] font-black leading-[0.5] text-primary">
                „
              </span>
              <blockquote className="m-0 font-display text-[21px] italic leading-[1.35] tracking-[-0.01em]">{c.tekst}</blockquote>
              <figcaption className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-foreground font-display text-[12px] font-bold tracking-[0.04em] text-[hsl(var(--vintage-gold))]">
                  {monogram(c.naam)}
                </span>
                <span className="flex flex-col gap-px">
                  <span className="text-[13px] font-bold">{c.naam}</span>
                  <span className={cn(MONO, "text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground")}>{c.functie}</span>
                </span>
              </figcaption>
            </figure>
          </Fragment>
        ))
      )}
    </div>
  );
}
