/**
 * ProfielKop — de rennerslicentie bovenaan /profiel: een kaartje dat aan een
 * koord hangt (twee gaatjes in de kopstrook), met een dubbele kaderlijn en
 * licht papier. Links een rugnummer met perforatierand waarop je initialen
 * staan; rechts je naam, een licentienummer in typemachine en sinds wanneer
 * je meedoet. Onderin drie vakjes met je loopbaan in cijfers.
 */
import { useTranslation } from "react-i18next";
import Medaillon from "@/components/profiel/Medaillon";
import { initialen } from "@/lib/initialen";
import { licentieNummer } from "@/lib/licentieNummer";
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

/** Rugnummer: wit vlak met inktrand, perforatielijntje en een speldje in elke hoek. */
function Rugnummer({ tekst }: { tekst: string }) {
  return (
    <div
      aria-hidden
      className="relative grid h-[68px] w-[78px] shrink-0 place-items-center rounded-[6px] border-2 border-foreground bg-white text-neutral-900 md:h-[84px] md:w-[96px]"
    >
      <span className="pointer-events-none absolute inset-[3px] rounded-[3px] border border-dashed border-neutral-400" />
      {["left-1.5 top-1.5", "right-1.5 top-1.5", "left-1.5 bottom-1.5", "right-1.5 bottom-1.5"].map((plek) => (
        <span key={plek} className={cn("absolute h-[5px] w-[5px] rounded-full border border-neutral-500 bg-neutral-300", plek)} />
      ))}
      <span className="relative font-oswald text-[30px] font-bold leading-none tracking-[0.02em] md:text-[38px]">{tekst}</span>
    </div>
  );
}

function Vak({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col px-3 py-2 md:px-5", className)}>
      {/* Label boven, cijfer onder: op de telefoon wordt een label twee regels
          en dan blijven de cijfers van de drie vakjes toch op één lijn. */}
      <dt className="flex-1 font-mono text-[9.5px] font-bold uppercase leading-tight tracking-[0.14em] text-muted-foreground md:text-[10.5px]">{label}</dt>
      <dd className="mt-0.5 flex items-center gap-1.5 font-oswald text-[20px] font-bold leading-tight md:text-[24px]">{children}</dd>
    </div>
  );
}

export default function ProfielKop({ naam, email, lidSinds, woonplaats, samenvatting, className }: ProfielKopProps) {
  const { t, i18n } = useTranslation();
  const sinds = lidSinds
    ? new Date(lidSinds).toLocaleDateString(i18n.language, { month: "long", year: "numeric" })
    : null;

  return (
    <section
      className={cn(
        "vintage-texture relative overflow-hidden rounded-[12px] border-2 border-foreground bg-card shadow-[3px_3px_0_hsl(var(--foreground))]",
        className,
      )}
    >
      {/* Kopstrook van de licentie in de kleur van het thema, met twee gaatjes
          voor het koord. */}
      <div className="relative flex items-center justify-between gap-3 border-b-2 border-foreground bg-primary px-4 py-1.5 text-primary-foreground md:px-5">
        <span className="font-stamp text-[11px] uppercase tracking-[0.18em]">{t("profiel.licentie")}</span>
        <span aria-hidden className="absolute left-1/2 top-[7px] flex -translate-x-1/2 gap-5">
          {[0, 1].map((i) => (
            <span key={i} className="h-3 w-3 rounded-full border-2 border-foreground bg-background shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)]" />
          ))}
        </span>
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] opacity-80">KoersPoule</span>
      </div>

      <div className="flex items-center gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-5">
        <Rugnummer tekst={initialen(naam)} />
        <div className="min-w-0 flex-1">
          <h2 className="heading-oswald truncate text-[26px] leading-none md:text-[36px]">{naam}</h2>
          <p className="mt-1.5 truncate font-stamp text-[11px] uppercase tracking-[0.16em] text-foreground/75 md:text-[12px]">
            {t("profiel.licentieNummer", { nummer: licentieNummer(naam, lidSinds) })}
          </p>
          <p className="mt-1 truncate font-serif text-[13px] italic text-muted-foreground md:text-[15px]">
            {[sinds && t("profiel.lidSinds", { datum: sinds }), woonplaats].filter(Boolean).join(" · ")}
          </p>
          {email && <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground/80">{email}</p>}
        </div>
      </div>

      {samenvatting && (
        <dl className="grid grid-cols-3 border-t-2 border-foreground">
          <Vak label={t("profiel.samenvatting.koersenLabel")}>{samenvatting.koersen}</Vak>
          <Vak label={t("profiel.samenvatting.dagzegesLabel")} className="border-l border-foreground/25">{samenvatting.dagzeges}</Vak>
          <Vak label={t("profiel.samenvatting.besteLabel")} className="border-l border-foreground/25">
            {samenvatting.besteRang ? (
              <>
                <Medaillon rang={1} aria-hidden className="h-4 w-4 md:h-5 md:w-5" />
                <span>#{samenvatting.besteRang.toLocaleString(i18n.language)}</span>
              </>
            ) : (
              "—"
            )}
          </Vak>
        </dl>
      )}

      {/* Dubbele kaderlijn: een dunne tweede lijn net binnen de rand. */}
      <span aria-hidden className="pointer-events-none absolute inset-[3px] rounded-[9px] border border-foreground/60" />
    </section>
  );
}
