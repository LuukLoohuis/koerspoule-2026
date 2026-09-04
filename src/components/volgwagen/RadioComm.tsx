import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useAlternatieven } from "@/hooks/useRendement";

/**
 * De comm-unit als kanaalkiezer voor Le Coup Manqué.
 *
 * Elk kanaal is een renner die jij niet koos in deze categorie, sterkste
 * bovenaan. Wie je hier opzet, staat in het blok ernaast tegenover je eigen
 * keuze. Zo blijft de radiokolom het bedieningspaneel van het dashboard in
 * plaats van behang.
 */
export default function RadioComm({
  entryId,
  categoryId,
  gekozenId,
  onKies,
  className,
}: {
  entryId?: string | null;
  categoryId?: string | null;
  /** null = het sterkste alternatief, zoals Le Coup Manqué zelf ook kiest. */
  gekozenId: string | null;
  onKies: (riderId: string) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const { data: renners = [] } = useAlternatieven(entryId, categoryId);

  const anderen = renners.filter((r) => !r.is_mijn_keuze).slice(0, 3);
  if (anderen.length === 0) return null;

  const actiefId = gekozenId ?? anderen[0].rider_id;

  return (
    <div
      className={cn(
        "rounded-[9px] p-2.5",
        "bg-[linear-gradient(#2a241c,#14110c)] shadow-[0_2px_6px_rgba(0,0,0,0.4)]",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#8e7e5f]">
          {t("volgwagen.radio.kanaalKop")}
        </span>
        <span
          aria-hidden
          className="ml-auto h-[26px] w-[26px] rounded-full"
          style={{ background: "radial-gradient(circle at 32% 28%, #5a5140, #1a1610)" }}
        />
      </div>

      <div role="group" aria-label={t("volgwagen.radio.kanaalKop")} className="mt-1.5">
        {anderen.map((r, i) => {
          const actief = r.rider_id === actiefId;
          return (
            <button
              key={r.rider_id}
              type="button"
              onClick={() => onKies(r.rider_id)}
              aria-pressed={actief}
              className={cn(
                "mt-1.5 flex min-h-[44px] w-full items-center gap-2 rounded px-2.5 text-left",
                "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D49A1A]",
              )}
              style={
                actief
                  ? { background: "#c8891f", color: "#14110c" }
                  : { background: "rgba(255,255,255,0.06)", color: "#b9a279" }
              }
            >
              <span className="truncate text-[12px] font-semibold">{r.rider_name ?? "—"}</span>
              <span className="ml-auto font-mono text-[9.5px] uppercase tracking-[0.1em]">
                {t("volgwagen.radio.kanaal", { nummer: i + 1 })}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.06em] text-[#6b665c]">
        {t("volgwagen.radio.stuurtCoup")}
      </p>
    </div>
  );
}
