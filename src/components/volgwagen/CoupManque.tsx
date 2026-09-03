import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useAlternatieven } from "@/hooks/useRendement";

/**
 * Le Coup Manqué: wat een andere renner uit dezelfde categorie had opgeleverd.
 *
 * De vergelijking is eerlijk gehouden: het alternatief krijgt dezelfde
 * jokervermenigvuldiger die jij op die plek gebruikte, en dezelfde etappes.
 * Het blok is geen strafblad -- staat je eigen keuze boven het alternatief,
 * dan zegt het dat ook.
 *
 * Default is de sterkste niet-gekozen renner; de knoppenrij eronder laat je
 * elke andere kiezen.
 */
export default function CoupManque({
  entryId,
  categoryId,
  categoryName,
  className,
}: {
  entryId?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  className?: string;
}) {
  const { t } = useTranslation();
  const [gekozenId, setGekozenId] = useState<string | null>(null);
  const { data: renners = [], error } = useAlternatieven(entryId, categoryId);

  if (error) {
    return (
      <p className={cn("font-mono text-[10px] uppercase tracking-[0.14em]", className)} style={{ color: "#B94A48" }}>
        {t("volgwagen.coup.kop")} — {(error as Error).message}
      </p>
    );
  }

  const mijn = renners.find((r) => r.is_mijn_keuze) ?? null;
  const anderen = renners.filter((r) => !r.is_mijn_keuze);
  if (!mijn || anderen.length === 0) return null;

  const ander = anderen.find((r) => r.rider_id === gekozenId) ?? anderen[0];
  const saldo = mijn.punten - ander.punten;
  const gewonnen = saldo >= 0;

  return (
    <section
      className={cn(
        "rounded-[9px] border border-white/[0.08] bg-[#1a1a1b] p-[14px]",
        "shadow-[inset_0_2px_8px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.05)]",
        className,
      )}
    >
      <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#d49a1a]">
        {t("volgwagen.coup.kop")}
      </h3>
      <p className="mt-1.5 font-serif text-[12.5px] text-[#a79e8c]">
        {t("volgwagen.coup.uitleg", { categorie: categoryName ?? "" })}
      </p>

      <div className="mt-2.5 grid grid-cols-[1fr_auto_1fr] gap-2.5">
        <div className="rounded-lg border border-white/10 bg-white/[0.06] p-2.5">
          <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#6b665c]">
            {t("volgwagen.coup.jouw")}
          </span>
          <p className="mt-1 truncate text-[14.5px] font-extrabold text-[#f5edd8]">{mijn.rider_name ?? "—"}</p>
          <p className="mt-1 font-mono text-[21px] font-bold text-[#f5edd8]">{mijn.punten}</p>
        </div>
        <div className="grid place-items-center font-mono text-[11px] text-[#6b665c]">vs</div>
        <div
          className="rounded-lg p-2.5"
          style={{
            background: gewonnen ? "rgba(92,107,59,0.12)" : "rgba(185,74,72,0.1)",
            border: `1px solid ${gewonnen ? "rgba(92,107,59,0.5)" : "rgba(185,74,72,0.45)"}`,
          }}
        >
          <span className="font-mono text-[8px] uppercase tracking-[0.14em]" style={{ color: gewonnen ? "#9fb07a" : "#c08a88" }}>
            {t("volgwagen.coup.niet")}
          </span>
          <p className="mt-1 truncate text-[14.5px] font-extrabold text-[#f5edd8]">{ander.rider_name ?? "—"}</p>
          <p className="mt-1 font-mono text-[21px] font-bold" style={{ color: gewonnen ? "#5C6B3B" : "#B94A48" }}>
            {ander.punten}
          </p>
        </div>
      </div>

      <div className="mt-2.5 flex items-baseline border-t border-dashed border-white/[0.18] pt-[9px]">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8a8272]">
          {gewonnen ? t("volgwagen.coup.gewonnen") : t("volgwagen.coup.gemist")}
        </span>
        <span className="ml-auto font-mono text-[17px] font-bold" style={{ color: gewonnen ? "#5C6B3B" : "#B94A48" }}>
          {gewonnen ? "+" : "−"}{Math.abs(saldo)} pt
        </span>
      </div>

      {ander.gekozen_door > 0 && (
        <p className="mt-2 font-serif text-[12.5px] text-[#a79e8c]">
          {t("volgwagen.coup.gekozenDoor", { naam: ander.rider_name ?? "", aantal: ander.gekozen_door })}
        </p>
      )}

      {/* Elke andere renner uit deze categorie; de sterkste staat vooraan. */}
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {anderen.slice(0, 6).map((r) => (
          <button
            key={r.rider_id}
            type="button"
            onClick={() => setGekozenId(r.rider_id)}
            className={cn(
              "grid min-h-[32px] place-items-center rounded-md border px-2.5 py-1.5",
              "font-mono text-[9.5px] uppercase tracking-[0.1em] transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D49A1A]",
            )}
            style={
              r.rider_id === ander.rider_id
                ? { borderColor: "#D49A1A", background: "rgba(212,154,26,0.18)", color: "#f5edd8" }
                : { borderColor: "rgba(255,255,255,0.14)", color: "#a79e8c" }
            }
          >
            {(r.rider_name ?? "—").split(" ").slice(-1)[0]}
          </button>
        ))}
      </div>
    </section>
  );
}
