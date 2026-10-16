/**
 * ProfielKop — de rennerslicentie bovenaan /profiel. Papieren kaart met
 * retro-rand en harde schaduw (zelfde familie als de terugkijk-strook), links
 * een rugnummer met vier speldjes waarop je initialen staan, rechts je naam,
 * sinds wanneer je meedoet en één regel met je loopbaan in cijfers.
 */
import { useTranslation } from "react-i18next";
import { initialen } from "@/lib/initialen";
import { cn } from "@/lib/utils";

export type ProfielSamenvatting = {
  koersen: number;
  dagzeges: number;
  besteRang: number | null;
};

export type ProfielKopProps = {
  naam: string;
  email?: string | null;
  /** ISO-datum van het aanmaken van het profiel. */
  lidSinds?: string | null;
  woonplaats?: string | null;
  samenvatting?: ProfielSamenvatting;
  className?: string;
};

/** Rugnummer: wit vlak met inktrand en een speldje in elke hoek. */
function Rugnummer({ tekst }: { tekst: string }) {
  return (
    <div
      aria-hidden
      className="relative grid h-[68px] w-[78px] shrink-0 place-items-center rounded-[6px] border-2 border-foreground bg-white text-neutral-900 md:h-[84px] md:w-[96px]"
    >
      {["left-1.5 top-1.5", "right-1.5 top-1.5", "left-1.5 bottom-1.5", "right-1.5 bottom-1.5"].map((plek) => (
        <span key={plek} className={cn("absolute h-[5px] w-[5px] rounded-full border border-neutral-500 bg-neutral-300", plek)} />
      ))}
      <span className="font-oswald text-[30px] font-bold leading-none tracking-[0.02em] md:text-[38px]">{tekst}</span>
    </div>
  );
}

export default function ProfielKop({ naam, email, lidSinds, woonplaats, samenvatting, className }: ProfielKopProps) {
  const { t, i18n } = useTranslation();
  const sinds = lidSinds
    ? new Date(lidSinds).toLocaleDateString(i18n.language, { month: "long", year: "numeric" })
    : null;
  const cijfers = samenvatting
    ? [
        t("profiel.samenvatting.koersen", { count: samenvatting.koersen }),
        t("profiel.samenvatting.dagzeges", { count: samenvatting.dagzeges }),
        samenvatting.besteRang ? t("profiel.samenvatting.beste", { rang: samenvatting.besteRang.toLocaleString(i18n.language) }) : null,
      ].filter(Boolean)
    : [];

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[12px] border-2 border-foreground bg-card shadow-[3px_3px_0_hsl(var(--foreground))]",
        className,
      )}
    >
      {/* Kopstrook van de licentie, in de kleur van het thema. */}
      <div className="flex items-center justify-between gap-3 border-b-2 border-foreground bg-primary px-4 py-1.5 text-primary-foreground md:px-5">
        <span className="font-stamp text-[11px] uppercase tracking-[0.18em]">{t("profiel.licentie")}</span>
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] opacity-80">KoersPoule</span>
      </div>

      <div className="flex items-center gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-5">
        <Rugnummer tekst={initialen(naam)} />
        <div className="min-w-0 flex-1">
          <h2 className="heading-oswald truncate text-[26px] leading-none md:text-[36px]">{naam}</h2>
          <p className="mt-1.5 truncate font-serif text-[13px] italic text-muted-foreground md:text-[15px]">
            {[sinds && t("profiel.lidSinds", { datum: sinds }), woonplaats].filter(Boolean).join(" · ")}
          </p>
          {email && <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground/80">{email}</p>}
        </div>
      </div>

      {cijfers.length > 0 && (
        <p className="border-t border-dashed border-foreground/35 px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground/80 md:px-6 md:text-[12px]">
          {cijfers.join("  ·  ")}
        </p>
      )}
    </section>
  );
}
