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
 * Nulscores en uitvallers blijven staan. Een lege dag van je sprinter is
 * informatie; hem verbergen maakt het dagtotaal onverklaarbaar.
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
  const { data: regels = [], isLoading } = useOogst(entryId, stageId);

  // Geen etappe gekozen of nog niets gefiatteerd: geen leeg kader tonen.
  if (!stageId || (!isLoading && regels.length === 0)) return null;

  const totaal = regels.reduce((som, r) => som + r.total_points, 0);
  const slot = oogstSlotzin(regels);

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
          <table className="mt-2.5 w-full border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08]">
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
              {regels.map((r) => (
                <Regel key={`${r.rider_id}-${r.is_joker}`} regel={r} />
              ))}
            </tbody>
          </table>

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

          {slot && <p className="mt-2.5 font-serif text-[12.5px] text-[#a79e8c]">{slot}</p>}
        </>
      )}
    </section>
  );
}
