import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useRendement } from "@/hooks/useRendement";

/**
 * Rendement per keuze: jouw punten per categorie tegen het poulegemiddelde.
 *
 * Het streepje in de balk is dat gemiddelde. Zonder die markering is een balk
 * alleen een lengte; mét is het een oordeel -- dit is wat "goede keuze" of
 * "misser" betekent zonder dat er een woord bij hoeft.
 *
 * De schaal is de beste categorie van de poule, niet jouw hoogste: anders
 * verspringt het beeld zodra jij ergens uitschiet.
 */
export default function Rendement({
  entryId,
  onKiesCategorie,
  className,
}: {
  entryId?: string | null;
  /** Tik op een rij → die categorie in Le Coup Manqué. */
  onKiesCategorie?: (categoryId: string) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const { data: regels = [], error, isLoading } = useRendement(entryId);

  // Stil verdwijnen is prima als er geen data ís, maar niet als de query
  // stukloopt: dan sta je naar een gat te kijken zonder te weten waarom.
  if (error) {
    return (
      <p className={cn("font-mono text-[10px] uppercase tracking-[0.14em]", className)} style={{ color: "#B94A48" }}>
        {t("volgwagen.rendement.kop")} — {(error as Error).message}
      </p>
    );
  }
  if (isLoading || regels.length === 0) return null;

  const schaal = Math.max(...regels.map((r) => Math.max(r.poule_beste, r.mijn_punten)), 1);

  return (
    <section className={cn("", className)}>
      <div className="mb-1.5 flex items-center gap-2.5">
        <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "rgba(26,22,18,0.55)" }}>
          {t("volgwagen.rendement.kop")}
        </h3>
        <span aria-hidden className="h-px flex-1" style={{ background: "rgba(26,22,18,0.18)" }} />
      </div>
      <p className="text-[11.5px]" style={{ color: "#6B5640" }}>{t("volgwagen.rendement.uitleg")}</p>

      {regels.map((r) => {
        const delta = r.mijn_punten - r.poule_gemiddelde;
        const boven = delta >= 0;
        const rij = (
          <>
            <div className="flex items-baseline gap-2">
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-bold" style={{ color: "#241C14" }}>
                {r.category_name}
              </span>
              <span className="font-mono text-[13px] font-bold" style={{ color: "#241C14" }}>
                {r.mijn_punten.toLocaleString("nl-NL")}
              </span>
              <span
                className="min-w-[40px] text-right font-mono text-[11.5px] font-bold"
                style={{ color: boven ? "#5C6B3B" : "#B94A48" }}
              >
                {boven ? "+" : "−"}{Math.abs(delta)}
              </span>
            </div>
            <div className="relative mt-1.5 h-[7px] rounded-[2px]" style={{ background: "rgba(26,22,18,0.09)" }}>
              <span
                className="absolute inset-y-0 left-0 rounded-[2px] opacity-80"
                style={{ width: `${(r.mijn_punten / schaal) * 100}%`, background: boven ? "#5C6B3B" : "#B94A48" }}
              />
              <span
                aria-hidden
                className="absolute -top-[3px] -bottom-[3px] w-[2px]"
                style={{ left: `${(r.poule_gemiddelde / schaal) * 100}%`, background: "#241C14" }}
              />
            </div>
            {r.rider_name && (
              <p className="mt-1 text-[11.5px]" style={{ color: "#6B5640" }}>{r.rider_name}</p>
            )}
          </>
        );

        return onKiesCategorie ? (
          <button
            key={r.category_id}
            type="button"
            onClick={() => onKiesCategorie(r.category_id)}
            className="w-full border-t py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D49A1A]"
            style={{ borderColor: "rgba(26,22,18,0.14)", minHeight: 44 }}
          >
            {rij}
          </button>
        ) : (
          <div key={r.category_id} className="border-t py-2" style={{ borderColor: "rgba(26,22,18,0.14)", minHeight: 44 }}>
            {rij}
          </div>
        );
      })}
    </section>
  );
}
