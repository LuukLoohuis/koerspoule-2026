import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export type OntwikkelingEtappe = {
  stageId: string;
  stageNumber: number;
  punten: number;
};

/**
 * Ontwikkeling: je dagscores naast elkaar, met je beste en slechtste dag
 * gemarkeerd en het rangverloop eronder.
 *
 * Bewust staven en geen lijn: een dagscore is een losse gebeurtenis, geen
 * doorlopende meting. De hoogte gaat over de hoogste dag, niet over een vast
 * plafond -- anders wordt een rustige ronde één streep boven de as.
 *
 * De staven zijn tegelijk de etappekiezer: tikken zet de oogst op die dag.
 * Daarmee vervalt de losse spoel-terugbalk -- twee bedieningen voor hetzelfde
 * is er één te veel, en op de grafiek is meteen te zien wát je kiest.
 */
export default function Ontwikkeling({
  etappes,
  rangVan,
  rangNaar,
  actiefStageId,
  onKies,
  className,
}: {
  etappes: OntwikkelingEtappe[];
  /** Rang bij de eerste gefiatteerde etappe en nu; beide optioneel. */
  rangVan?: number | null;
  rangNaar?: number | null;
  /** Welke etappe de oogst laat zien. */
  actiefStageId?: string | null;
  onKies?: (stageId: string) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  if (etappes.length < 2) return null;

  const max = Math.max(...etappes.map((e) => e.punten), 1);
  const beste = etappes.reduce((a, b) => (b.punten > a.punten ? b : a));
  const slechtste = etappes.reduce((a, b) => (b.punten < a.punten ? b : a));
  const laatste = etappes[etappes.length - 1];
  const winst = rangVan != null && rangNaar != null ? rangVan - rangNaar : null;

  return (
    <section className={cn("", className)}>
      <div className="mb-2.5 flex items-center gap-2.5">
        <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "rgba(26,22,18,0.55)" }}>
          {t("volgwagen.ontwikkeling.kop")}
        </h3>
        <span aria-hidden className="h-px flex-1" style={{ background: "rgba(26,22,18,0.18)" }} />
        <span className="font-mono text-[9px]" style={{ color: "#8A7A5E" }}>
          {onKies ? t("volgwagen.ontwikkeling.kiesHint") : t("volgwagen.ontwikkeling.aantal", { aantal: etappes.length })}
        </span>
      </div>

      <div className="flex h-[96px] items-end gap-1" style={{ borderBottom: "1px solid rgba(26,22,18,0.3)" }}>
        {etappes.map((e) => {
          const isBeste = e.stageId === beste.stageId && beste.punten > 0;
          const isSlechtste = e.stageId === slechtste.stageId && slechtste.punten < beste.punten;
          const isLaatste = e.stageId === laatste.stageId;
          const isActief = actiefStageId ? e.stageId === actiefStageId : isLaatste;
          const kleur = isActief
            ? "hsl(var(--vintage-gold))"
            : isBeste
              ? "#5C6B3B"
              : isSlechtste
                ? "#B94A48"
                : "rgba(26,22,18,0.4)";

          const staaf = (
            <span
              className="block w-full rounded-t-[2px] transition-[filter,transform] duration-150"
              // Minimaal een streepje: een nuldag moet zichtbaar blijven,
              // anders lijkt de etappe niet gereden.
              style={{ height: `${Math.max(4, (e.punten / max) * 100)}%`, background: kleur }}
            />
          );

          const label = (isBeste || isSlechtste || isActief) && (
            <span
              className="absolute -top-[13px] left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[7.5px] font-bold"
              style={{ color: "#241C14" }}
            >
              {e.punten}
            </span>
          );

          if (!onKies) {
            return (
              <div key={e.stageId} className="relative flex h-full flex-1 items-end">
                {label}
                {staaf}
              </div>
            );
          }

          return (
            <button
              key={e.stageId}
              type="button"
              onClick={() => onKies(e.stageId)}
              aria-pressed={isActief}
              aria-label={t("volgwagen.ontwikkeling.tooltip", { nummer: e.stageNumber, punten: e.punten })}
              title={t("volgwagen.ontwikkeling.tooltip", { nummer: e.stageNumber, punten: e.punten })}
              className={cn(
                "group relative flex h-full flex-1 cursor-pointer items-end",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D49A1A]",
              )}
            >
              {label}
              <span
                className={cn(
                  "block w-full rounded-t-[2px] transition-[filter,box-shadow] duration-150",
                  "group-hover:brightness-110",
                  // De gekozen dag krijgt een lichte gloed: hij is het
                  // onderwerp van de oogst eronder, niet zomaar een staaf.
                  isActief && "shadow-[0_0_0_1px_rgba(212,154,26,0.9),0_0_10px_rgba(212,154,26,0.35)]",
                )}
                style={{ height: `${Math.max(4, (e.punten / max) * 100)}%`, background: kleur }}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-1 flex gap-1">
        {etappes.map((e) => {
          const isActief = actiefStageId ? e.stageId === actiefStageId : e.stageId === laatste.stageId;
          return (
            <span
              key={e.stageId}
              className={cn("flex-1 text-center font-mono text-[8px]", isActief && "font-bold")}
              style={{ color: isActief ? "#241C14" : "#8A7A5E" }}
            >
              {e.stageNumber}
            </span>
          );
        })}
      </div>

      <div className="mt-3 flex border-t pt-2" style={{ borderColor: "rgba(26,22,18,0.14)" }}>
        <div className="flex-1">
          <span className="block font-mono text-[8.5px] uppercase tracking-[0.14em]" style={{ color: "#8A7A5E" }}>
            {t("volgwagen.ontwikkeling.beste")}
          </span>
          <span className="mt-0.5 block text-[15px] font-extrabold" style={{ color: "#5C6B3B" }}>
            {t("volgwagen.ontwikkeling.etappePunten", { nummer: beste.stageNumber, punten: beste.punten })}
          </span>
        </div>
        <div className="flex-1 border-l pl-2.5" style={{ borderColor: "rgba(26,22,18,0.14)" }}>
          <span className="block font-mono text-[8.5px] uppercase tracking-[0.14em]" style={{ color: "#8A7A5E" }}>
            {t("volgwagen.ontwikkeling.slechtste")}
          </span>
          <span className="mt-0.5 block text-[15px] font-extrabold" style={{ color: "#B94A48" }}>
            {t("volgwagen.ontwikkeling.etappePunten", { nummer: slechtste.stageNumber, punten: slechtste.punten })}
          </span>
        </div>
        {winst != null && (
          <div className="flex-1 border-l pl-2.5" style={{ borderColor: "rgba(26,22,18,0.14)" }}>
            <span className="block font-mono text-[8.5px] uppercase tracking-[0.14em]" style={{ color: "#8A7A5E" }}>
              {t("volgwagen.ontwikkeling.rang", { van: rangVan, naar: rangNaar })}
            </span>
            <span className="mt-0.5 block text-[15px] font-extrabold"
                  style={{ color: winst >= 0 ? "#5C6B3B" : "#B94A48" }}>
              {winst >= 0 ? "▲" : "▼"} {Math.abs(winst)}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
