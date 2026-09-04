import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/**
 * De FM-tuner van de Volgwagen als schaalkiezer voor Rendement per keuze.
 *
 * De kolom naast het dashboard was drie plaatjes met chroom: mooi, maar het
 * deed niets. Nu stuurt de tuner waar het rendement tegen afgezet wordt --
 * je subpoule of de hele poule -- en verspringt de naald mee. Chroom mag
 * blijven zolang het knoppen zijn.
 */
export type Schaal = { id: string | null; label: string };

export default function RadioTuner({
  schalen,
  actiefId,
  onKies,
  className,
}: {
  schalen: Schaal[];
  actiefId: string | null;
  onKies: (id: string | null) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  if (schalen.length < 2) return null;

  const index = Math.max(0, schalen.findIndex((s) => s.id === actiefId));
  // Naald tussen 12 % en 88 %: de uiteinden van een schaal zijn rand, geen stand.
  const naald = schalen.length === 1 ? 50 : 12 + (index / (schalen.length - 1)) * 76;

  return (
    <div
      className={cn(
        "rounded-[9px] border border-black/25 p-2.5",
        "bg-[linear-gradient(#efe6d2,#dcd0b4)]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_6px_rgba(0,0,0,0.35)]",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#5a4f3c]">
          {t("volgwagen.radio.schaalKop")}
        </span>
        <span
          aria-hidden
          className="ml-auto h-[22px] w-[22px] rounded-full"
          style={{ background: "radial-gradient(circle at 32% 28%, #fbf6e9, #a2957a)" }}
        />
      </div>

      {/* Schaalvenster: streepjes als op een radioschaal, de naald op de
          gekozen stand. Decoratie mét betekenis -- hij wijst wat je koos. */}
      <div aria-hidden className="relative mt-2 h-[34px] overflow-hidden rounded bg-[#14110c]">
        {Array.from({ length: 15 }).map((_, i) => (
          <span
            key={i}
            className="absolute bottom-[6px] w-px bg-[rgba(224,163,60,0.55)]"
            style={{ left: `${6 + i * 6}%`, height: i % 3 === 0 ? 14 : 8 }}
          />
        ))}
        <span
          className="absolute bottom-[3px] top-[3px] w-[2px] bg-[#e4796c] transition-[left] duration-300"
          style={{ left: `${naald}%`, boxShadow: "0 0 8px rgba(228,121,108,0.9)" }}
        />
      </div>

      <div role="group" aria-label={t("volgwagen.radio.schaalKop")} className="mt-2 flex gap-1.5">
        {schalen.map((s) => {
          const actief = s.id === actiefId;
          return (
            <button
              key={s.id ?? "poule"}
              type="button"
              onClick={() => onKies(s.id)}
              aria-pressed={actief}
              className={cn(
                "grid min-h-[44px] flex-1 place-items-center rounded border px-1.5",
                "font-mono text-[9.5px] font-bold uppercase tracking-[0.1em] transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D49A1A]",
              )}
              style={
                actief
                  ? { background: "#c8891f", borderColor: "#c8891f", color: "#14110c" }
                  : { borderColor: "rgba(26,22,16,0.25)", color: "#6b5f49" }
              }
            >
              <span className="line-clamp-2 text-center leading-[1.15]">{s.label}</span>
            </button>
          );
        })}
      </div>

      <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.06em] text-[#6b5f49]">
        {t("volgwagen.radio.stuurtRendement")}
      </p>
    </div>
  );
}
