import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import TruiBadge from "@/components/retro/TruiBadge";
import { SoortEmbleem, WEDSTRIJD_SOORT } from "@/components/meermarathon/WedstrijdSoort";
import type { TruiType } from "@/lib/themas";
import type { Prediction } from "@/hooks/useEntry";
import type { KlassementUitslag } from "@/hooks/useKlassementUitslag";
import { KLASSEMENT_PUNTEN } from "@/lib/klassementVoorspelling";

export type Voorspelling = Prediction;

export type PronoRenner = { name: string; team?: string | null; is_dnf?: boolean | null };

type Badge = { label: string; bg: string; color: string; border: string };

// Zelfde badges en kleuren als de Pronostiek in MyTeamPanel: dit is dezelfde
// pagina, alleen zonder de zware datalaag eromheen.
const JERSEY_BADGE: Record<"gc" | "points" | "kom" | "youth", Badge> = {
  gc: { label: "GC", bg: "#FFF0F7", color: "#C4185A", border: "#E8336D" },
  points: { label: "PNT", bg: "#EFF3FF", color: "#1D4A9E", border: "#2E5BA8" },
  kom: { label: "KOM", bg: "#EDF7F1", color: "#1E6B40", border: "#2E8B57" },
  youth: { label: "YNG", bg: "#F8F4EE", color: "#7A5610", border: "#B59240" },
};

/**
 * Meermarathon: de twee klassementen, in de kleur van hun wedstrijdsoort
 * (dezelfde als het embleem op de uitslagenbalk en de kalender).
 */
const MM_KLASSEMENTEN: ReadonlyArray<{ key: "cup" | "grandprix"; labelKey: string; badge: Badge }> = [
  {
    key: "cup",
    labelKey: "team.panel.mmCupKlassement",
    badge: {
      label: "CUP",
      bg: `color-mix(in srgb, ${WEDSTRIJD_SOORT.cup.kleur} 10%, white)`,
      color: WEDSTRIJD_SOORT.cup.kleur,
      border: WEDSTRIJD_SOORT.cup.kleur,
    },
  },
  {
    key: "grandprix",
    labelKey: "team.panel.mmGpKlassement",
    badge: {
      label: "GP",
      bg: `color-mix(in srgb, ${WEDSTRIJD_SOORT.grandprix.kleur} 10%, white)`,
      color: WEDSTRIJD_SOORT.grandprix.kleur,
      border: WEDSTRIJD_SOORT.grandprix.kleur,
    },
  },
];

const TRUI_LABEL: Record<"points" | "kom" | "youth", { labelKey: string; trui: TruiType }> = {
  points: { labelKey: "team.panel.jerseyPoints", trui: "punten" },
  kom: { labelKey: "team.panel.jerseyKom", trui: "berg" },
  youth: { labelKey: "team.panel.jerseyYouth", trui: "jongeren" },
};

const MEDAILLES = ["🥇", "🥈", "🥉"];

function PronoRij({
  pos,
  icon,
  renner,
  badge,
  laatste,
  opgave = false,
}: {
  pos: number;
  icon: ReactNode;
  renner: PronoRenner | null;
  badge: Badge;
  laatste: boolean;
  opgave?: boolean;
}) {
  const { t } = useTranslation();
  const bg = (pos - 1) % 2 === 0 ? "#FAF7F2" : "#F4EFE6";
  return (
    <div
      className="flex items-center"
      style={{ background: opgave ? "#FFF0F0" : bg, minHeight: "40px", borderBottom: !laatste ? "1px solid #EDE8DE" : undefined }}
    >
      <div className="shrink-0 border-r px-2 text-right" style={{ width: "44px", borderColor: "#E0D8CC" }}>
        <span className="font-mono text-[17px] font-black leading-none tabular-nums" style={{ color: opgave ? "#C0392B" : "#C8A020" }}>
          {String(pos).padStart(3, " ")}
        </span>
      </div>
      <div className="w-8 shrink-0 select-none text-center text-sm leading-none">{opgave ? "❌" : icon}</div>
      <div className="min-w-0 flex-1 px-1.5 py-2">
        {renner ? (
          <>
            <span
              className="block truncate font-display font-bold"
              style={{ fontSize: "14px", color: opgave ? "#8B4040" : "#2C2416", lineHeight: 1.2, textDecoration: opgave ? "line-through" : undefined }}
            >
              {renner.name}
            </span>
            {opgave ? (
              <span className="block font-mono text-[9px]" style={{ color: "#C0392B" }}>
                {t("team.panel.dnfNoPoints")}
              </span>
            ) : renner.team ? (
              <span className="block truncate font-mono text-[9px]" style={{ color: "#8B7355" }}>
                {renner.team}
              </span>
            ) : null}
          </>
        ) : (
          <em className="font-serif text-sm text-muted-foreground">{t("team.panel.noChoice")}</em>
        )}
      </div>
      <div className="shrink-0 px-2 py-1">
        {opgave ? (
          <span
            className="rounded px-1.5 py-0.5 font-mono text-[8px] font-black uppercase"
            style={{ background: "#FFEBEB", color: "#C0392B", border: "1px solid #E74C3C", letterSpacing: "0.1em" }}
          >
            DNF
          </span>
        ) : (
          <span
            className="rounded px-1.5 py-0.5 font-mono text-[8px] font-black uppercase"
            style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, letterSpacing: "0.1em" }}
          >
            {badge.label}
          </span>
        )}
      </div>
    </div>
  );
}

function PronoSectie({ icon, label, badge, children }: { icon: ReactNode; label: string; badge: Badge; children: ReactNode }) {
  return (
    <div className="border-b" style={{ borderColor: "#E8DDD0" }}>
      <div className="flex items-center gap-2 px-3 py-2" style={{ background: "#F0EBE1", borderBottom: `1px solid ${badge.border}` }}>
        <span className="shrink-0 text-sm leading-none">{icon}</span>
        <span className="shrink-0 font-mono text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: badge.color }}>
          {label}
        </span>
        <div className="h-px flex-1" style={{ background: badge.border, opacity: 0.3 }} />
      </div>
      {children}
    </div>
  );
}

/**
 * Pronostiek, de presentatie: je voorspellingen voor het eindklassement en de
 * truien. Eén-op-één de weergave uit MyTeamPanel, maar zonder de datahaken
 * van de Volgwagen: zo mount hij licht als buur in de veegcarrousel op een
 * telefoon, in plaats van eerst vijftien queries en een simulatie af te wachten.
 *
 * Bij de Meermarathon zijn het twee winnaars per peloton: het Cup-klassement
 * (kunstijs) en het Grand Prix-klassement (natuurijs).
 */
export default function PronostiekWeergave({
  gameName,
  predictions,
  ridersById,
  dnfZichtbaar,
  meermarathon = false,
  bouwerPad,
  uitslag = null,
  className,
}: {
  gameName: string;
  predictions: Voorspelling[];
  ridersById: Record<string, PronoRenner | undefined>;
  /** Opgaves pas tonen zodra de koers rijdt of gereden is. */
  dnfZichtbaar: boolean;
  meermarathon?: boolean;
  /** Waar je je voorspellingen kiest; alleen zolang dat nog kan. */
  bouwerPad?: string | null;
  /** Meermarathon: de klassementswinnaars en je punten, zodra die er zijn. */
  uitslag?: KlassementUitslag | null;
  className?: string;
}) {
  const { t } = useTranslation();
  const podium = [1, 2, 3].map((pos) => predictions.find((p) => p.classification === "gc" && p.position === pos) ?? null);
  // Een schaatser heeft een team; bij de Meermarathon staan wielervoorspellingen
  // niet op dit scherm en andersom.
  const getoond = predictions.filter((p) =>
    meermarathon ? p.classification === "cup" || p.classification === "grandprix" : p.classification !== "cup" && p.classification !== "grandprix",
  );

  return (
    <div className={cn("pb-4", className)}>
      {getoond.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="m-0 text-sm italic text-muted-foreground">
            {t("team.panel.noPredictions", { context: meermarathon ? "mm" : undefined })}
          </p>
          {bouwerPad && (
            <Link
              to={bouwerPad}
              className="inline-flex h-10 items-center rounded-full border-[1.5px] border-foreground px-4 text-[13px] font-bold shadow-[1.5px_1.5px_0_hsl(var(--foreground))]"
            >
              {t("team.panel.naarPronostiek")}
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border-2" style={{ borderColor: "#C8A020", background: "#FAF7F2" }}>
          <div className="flex items-center justify-between border-b-2 px-4 py-3" style={{ background: "#2C2416", borderColor: "#C8A020" }}>
            <div>
              <div className="mb-0.5 font-mono text-[9px] uppercase tracking-[0.4em]" style={{ color: "#C8A020", opacity: 0.75 }}>
                {t("team.panel.pronoHeader", { name: gameName })}
              </div>
              <h2 className="font-display text-xl font-black leading-none tracking-tight text-white">{t("team.panel.pronoTitle")}</h2>
            </div>
            <div className="text-right">
              <div className="font-mono text-[9px] uppercase tracking-widest" style={{ color: "#C8A020", opacity: 0.6 }}>
                {t("team.panel.choicesLabel")}
              </div>
              <div className="font-display text-2xl font-black tabular-nums" style={{ color: "#C8A020" }}>
                {getoond.length}
              </div>
              <div className="font-mono text-[9px]" style={{ color: "#C8A020", opacity: 0.5 }}>
                {t("team.panel.predictedLabel")}
              </div>
            </div>
          </div>

          {meermarathon &&
            MM_KLASSEMENTEN.map(({ key, labelKey, badge }) => {
              const item = getoond.find((p) => p.classification === key && p.position === 1);
              const r = item ? ridersById[item.rider_id] : undefined;
              const winnaar = uitslag?.winnaars[key] ?? null;
              const goed = Boolean(winnaar && item?.rider_id === winnaar);
              return (
                <PronoSectie key={key} icon={<SoortEmbleem soort={key} maat={20} />} label={t(labelKey)} badge={badge}>
                  <PronoRij
                    pos={1}
                    icon={MEDAILLES[0]}
                    renner={r ? { name: r.name, team: r.team } : null}
                    badge={badge}
                    laatste
                  />
                  {/* Het klassement is beslist: goed voorspeld, of wie het wel won. */}
                  {winnaar && (
                    <div
                      className="flex items-center justify-between gap-2 px-3 py-1.5 text-[12px]"
                      style={{ background: goed ? "#EDF7F1" : "#F4EFE6", color: goed ? "#1E6B40" : "#6B5B45", borderTop: "1px solid #EDE8DE" }}
                    >
                      <span className="min-w-0 truncate font-semibold">
                        {goed
                          ? t("team.panel.mmGoedVoorspeld")
                          : t("team.panel.mmWinnaar", { naam: ridersById[winnaar]?.name ?? "—" })}
                      </span>
                      <span className="shrink-0 font-mono font-bold tabular-nums">
                        {goed ? `+${uitslag?.punten[key] ?? KLASSEMENT_PUNTEN}` : "0"} {t("ploegC.pt")}
                      </span>
                    </div>
                  )}
                </PronoSectie>
              );
            })}

          {!meermarathon && podium.some(Boolean) && (
            <PronoSectie icon={<TruiBadge type="algemeen" formaat="klein" />} label={t("team.panel.gcTop3")} badge={JERSEY_BADGE.gc}>
              {podium.map((p, idx) => {
                const r = p ? ridersById[p.rider_id] : undefined;
                return (
                  <PronoRij
                    key={idx}
                    pos={idx + 1}
                    icon={MEDAILLES[idx]}
                    renner={r ? { name: r.name, team: r.team } : null}
                    badge={JERSEY_BADGE.gc}
                    laatste={idx === 2}
                    opgave={dnfZichtbaar && Boolean(r?.is_dnf)}
                  />
                );
              })}
            </PronoSectie>
          )}

          {!meermarathon && (["points", "kom", "youth"] as const).map((cls) => {
            const item = predictions.find((p) => p.classification === cls && p.position === 1);
            const r = item ? ridersById[item.rider_id] : undefined;
            return (
              <PronoSectie
                key={cls}
                icon={<TruiBadge type={TRUI_LABEL[cls].trui} formaat="klein" />}
                label={t(TRUI_LABEL[cls].labelKey)}
                badge={JERSEY_BADGE[cls]}
              >
                <PronoRij
                  pos={1}
                  icon={MEDAILLES[0]}
                  renner={r ? { name: r.name, team: r.team } : null}
                  badge={JERSEY_BADGE[cls]}
                  laatste
                  opgave={dnfZichtbaar && Boolean(r?.is_dnf)}
                />
              </PronoSectie>
            );
          })}

          {meermarathon && bouwerPad && (
            <div className="flex justify-end border-b px-3 py-2" style={{ borderColor: "#E8DDD0" }}>
              <Link
                to={bouwerPad}
                className="text-[12px] font-semibold underline decoration-primary decoration-2 underline-offset-4"
              >
                {t("team.panel.pronostiekWijzigen")}
              </Link>
            </div>
          )}

          <div className="h-1" style={{ background: "linear-gradient(90deg, transparent, #C8A020 30%, #E8336D 50%, #C8A020 70%, transparent)" }} />
        </div>
      )}
    </div>
  );
}
