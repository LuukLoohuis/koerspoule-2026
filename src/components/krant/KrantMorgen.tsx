import { useTranslation } from "react-i18next";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useKoersThema } from "@/contexts/KoersThemaContext";
import { hoogtemeters, wanneer } from "@/lib/krantC";
import type { StageRow } from "@/hooks/useResults";

const MONO = "font-['JetBrains_Mono',monospace]";

const TYPE_LABEL_KEY: Record<string, string> = {
  vlak: "karavaan.voorbeschouwing.typeVlak",
  heuvelachtig: "karavaan.voorbeschouwing.typeHeuvel",
  tijdrit: "karavaan.voorbeschouwing.typeTijdrit",
  bergop: "karavaan.voorbeschouwing.typeBergop",
  ploegentijdrit: "karavaan.voorbeschouwing.typePloegentijdrit",
};

/**
 * Tab Morgen: de eerstvolgende rit als volwaardig artikel. Drie feiten uit de
 * etappe zelf (afstand, hoogtemeters uit het profiel, de datum), daaronder de
 * voorbeschouwing van de redactie als die er is. De favorieten met sterren
 * uit het ontwerp hebben nog geen bron in de app en staan er daarom niet.
 */
export default function KrantMorgen({
  rit,
  tekst,
  profielUrl,
}: {
  rit: StageRow | null;
  tekst: string | null;
  profielUrl: string | null;
}) {
  const { t, i18n } = useTranslation();
  const thema = useKoersThema();
  const locale = i18n.language === "en" ? "en-GB" : "nl-NL";

  if (!rit) {
    return (
      <div role="tabpanel" className="rounded-xl border-2 border-dashed border-foreground/20 bg-card p-6 text-center">
        <p className="font-serif text-sm italic text-muted-foreground">{t("krantC.alleRittenGereden")}</p>
      </div>
    );
  }

  const typeKey = TYPE_LABEL_KEY[String(rit.stage_type)];
  const typeLabel = typeKey ? t(typeKey) : t("karavaan.voorbeschouwing.typeDefault");
  const klim = hoogtemeters(rit.profile_data, locale);
  const datum = wanneer(rit.date, new Date(), locale, {
    vandaag: t("karavaan.voorbeschouwing.vandaag"),
    morgen: t("karavaan.voorbeschouwing.morgen"),
  });
  const feiten: Array<{ waarde: string; label: string }> = [
    ...(rit.distance_km != null ? [{ waarde: `${rit.distance_km.toLocaleString(locale)} km`, label: t("krantC.afstand") }] : []),
    klim ? { waarde: klim, label: t("krantC.hoogtemeters") } : { waarde: typeLabel, label: t("krantC.type") },
    ...(datum ? [{ waarde: datum, label: t("krantC.datum") }] : []),
  ];

  return (
    <div role="tabpanel" className="flex flex-col gap-[18px]">
      <article className="flex flex-col gap-2.5">
        <span className="editor-eyebrow">{t("krantC.voorbeschouwing", { etappe: thema.etappe, nummer: rit.stage_number })}</span>
        <h2 className="kop-gold m-0 pb-2.5 font-display text-[32px] font-black leading-[1.02] tracking-[-0.03em]">
          {rit.name?.trim() || t("karavaan.voorbeschouwing.stage", { number: rit.stage_number })}
        </h2>

        {feiten.length > 0 && (
          <div
            className="grid border-b border-border py-2.5"
            style={{ gridTemplateColumns: `repeat(${feiten.length}, minmax(0, 1fr))` }}
          >
            {feiten.map((f, i) => (
              <span key={f.label} className={cn("flex min-w-0 flex-col gap-0.5", i > 0 && "border-l border-border pl-2.5")}>
                <span className={cn(MONO, "truncate text-[18px] font-bold leading-tight tabular-nums")}>{f.waarde}</span>
                <span className="text-[11px] text-muted-foreground">{f.label}</span>
              </span>
            ))}
          </div>
        )}

        {tekst ? (
          <p className="m-0 font-serif text-[16px] leading-[1.55]">{tekst}</p>
        ) : (
          <p className="m-0 font-serif text-[14px] italic leading-[1.5] text-muted-foreground">{t("krantC.geenVoorbeschouwing")}</p>
        )}

        {profielUrl && (
          <a
            href={profielUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 self-start py-2 text-[13px] font-semibold underline decoration-primary decoration-2 underline-offset-[5px]"
          >
            {t("krantC.profiel")}
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        )}
      </article>
    </div>
  );
}
