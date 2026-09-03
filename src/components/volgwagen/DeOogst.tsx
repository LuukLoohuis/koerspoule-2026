import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useOogst, oogstSlotzin, type OogstRegel } from "@/hooks/useOogst";

/**
 * De oogst: waar de punten van deze etappe vandaan kwamen.
 *
 * Dit is het blok dat de Krant principieel niet kan tonen. Die weet wélk cijfer
 * je scoorde -- de Volgwagen weet welke renner het bracht, met de rekensom
 * erbij: 26 × 2 leest anders dan 52.
 *
 * Standaard alleen de renners die scoorden: dat is de oogst. Wie op nul bleef
 * staat achter "toon alles" -- die informatie is er wel, maar hij hoort niet
 * boven de renners die het werk deden. Bij twintig deelnemers is dat het
 * verschil tussen vijf regels en een scrollend scherm.
 *
 * Donkere inzet in het cockpitframe, zoals de spoel-terugbalk eronder.
 */
function Regel({ regel }: { regel: OogstRegel }) {
  const uitgevallen = !regel.did_finish;
  const basis = uitgevallen
    ? "uitgevallen"
    : regel.finish_position == null || regel.base_points === 0
      ? "0"
      : `${regel.base_points} × ${regel.multiplier}`;

  return (
    <tr className="border-b border-white/[0.055] last:border-b-0">
      <td className="py-[7px] align-baseline">
        <span className="block truncate text-[13.5px] font-bold text-[#f5edd8]">
          {regel.rider_name ?? "—"}
        </span>
        <span className="block font-mono text-[8px] uppercase tracking-[0.1em] text-[#6b665c]">
          {regel.is_joker ? "joker" : regel.category_name ?? "—"}
        </span>
      </td>
      <td className="w-[42px] py-[7px] text-right align-baseline font-mono text-[12px] text-[#a79e8c]">
        {uitgevallen ? "—" : regel.finish_position != null ? `${regel.finish_position}e` : "—"}
      </td>
      <td className="w-[64px] py-[7px] text-right align-baseline font-mono text-[11px] text-[#6b665c]">
        {basis}
      </td>
      <td
        className={cn(
          "w-[46px] py-[7px] text-right align-baseline font-mono text-[14px] font-bold",
          regel.total_points > 0 ? "text-[#d49a1a]" : "text-[#6b665c]",
        )}
      >
        {regel.total_points}
      </td>
    </tr>
  );
}

export default function DeOogst({
  entryId,
  stageId,
  stageNumber,
  stageName,
  className,
}: {
  entryId?: string | null;
  stageId?: string | null;
  stageNumber?: number | null;
  stageName?: string | null;
  className?: string;
}) {
  const { t } = useTranslation();
  const [toonAlles, setToonAlles] = useState(false);
  const { data: regels = [], isLoading } = useOogst(entryId, stageId);

  // Geen etappe gekozen of nog niets gefiatteerd: geen leeg kader tonen.
  if (!stageId || (!isLoading && regels.length === 0)) return null;

  const totaal = regels.reduce((som, r) => som + r.total_points, 0);
  const slot = oogstSlotzin(regels);
  const scorend = regels.filter((r) => r.total_points > 0);
  const stil = regels.length - scorend.length;
  const zichtbaar = toonAlles || scorend.length === 0 ? regels : scorend;
  const helft = Math.ceil(zichtbaar.length / 2);

  return (
    <section
      className={cn(
        "rounded-[9px] border border-white/[0.08] bg-[#1a1a1b] px-[14px] pb-[14px] pt-[13px]",
        "shadow-[inset_0_2px_8px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.05)]",
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#d49a1a]">
          {t("volgwagen.oogst.kop")}
        </h3>
        {stageName && (
          <span className="font-serif text-[12.5px] italic text-[#a79e8c]">{stageName}</span>
        )}
      </div>

      {isLoading ? (
        <p className="mt-3 font-mono text-[11px] text-[#6b665c]">…</p>
      ) : (
        <>
          {/* Op de webversie twee kolommen naast elkaar: acht renners onder
              elkaar maakt van een oogst een lijst. Elke kolom is een eigen
              tabel, zodat de kolombreedtes binnen die helft uitlijnen. */}
          <div className="mt-2.5 lg:grid lg:grid-cols-2 lg:gap-x-7">
            {[zichtbaar.slice(0, helft), zichtbaar.slice(helft)]
              .filter((deel) => deel.length > 0)
              .map((deel, kolom) => (
                <table key={kolom} className="w-full border-collapse">
                  <thead>
                    {/* De tweede kop staat er alleen om de rijen op dezelfde
                        hoogte te laten beginnen. */}
                    <tr
                      className={cn("border-b border-white/[0.08]", kolom === 1 && "invisible max-lg:hidden")}
                      aria-hidden={kolom === 1 || undefined}
                    >
                      <th className="pb-[5px] text-left font-mono text-[8px] font-normal uppercase tracking-[0.14em] text-[#6b665c]">
                        {t("volgwagen.oogst.renner")}
                      </th>
                      <th className="pb-[5px] text-right font-mono text-[8px] font-normal uppercase tracking-[0.14em] text-[#6b665c]">
                        {t("volgwagen.oogst.rit")}
                      </th>
                      <th className="pb-[5px] text-right font-mono text-[8px] font-normal uppercase tracking-[0.14em] text-[#6b665c]">
                        {t("volgwagen.oogst.basis")}
                      </th>
                      <th className="pb-[5px] text-right font-mono text-[8px] font-normal uppercase tracking-[0.14em] text-[#6b665c]">
                        {t("volgwagen.oogst.punten")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {deel.map((r) => (
                      <Regel key={`${r.rider_id}-${r.is_joker}`} regel={r} />
                    ))}
                  </tbody>
                </table>
              ))}
          </div>

          <div className="mt-2 flex items-baseline gap-2.5 border-t border-dashed border-white/20 pt-[9px]">
            <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#8a8272]">
              {stageNumber != null
                ? t("volgwagen.oogst.totaalEtappe", { nummer: stageNumber })
                : t("volgwagen.oogst.totaal")}
            </span>
            <span className="ml-auto font-mono text-[21px] font-bold text-[#d49a1a] [text-shadow:0_0_12px_rgba(212,154,26,0.45)]">
              {totaal}
            </span>
          </div>

          {stil > 0 && (
            <button
              type="button"
              onClick={() => setToonAlles((v) => !v)}
              aria-expanded={toonAlles}
              className={cn(
                "mt-2.5 inline-flex min-h-[32px] items-center gap-1 font-mono text-[9.5px] uppercase tracking-[0.14em]",
                "text-[#8a8272] transition-colors hover:text-[#d49a1a]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D49A1A]",
              )}
            >
              {toonAlles ? t("volgwagen.oogst.verbergNul") : t("volgwagen.oogst.toonNul", { aantal: stil })}
              <ChevronDown className={cn("h-3 w-3 transition-transform", toonAlles && "rotate-180")} aria-hidden />
            </button>
          )}

          {slot && <p className="mt-2.5 font-serif text-[12.5px] text-[#a79e8c]">{slot}</p>}
        </>
      )}
    </section>
  );
}
