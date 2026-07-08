/**
 * <RiderStageBreakdown>
 *
 * Inline "race-dossier" dat onder een aangeklikte RiderTile openvouwt en de
 * per-etappe punten van die renner toont. Geen popover/modal/Sheet — een
 * accordion die de siblings eronder wegduwt (zelfde smooth max-height-techniek
 * als MonkeyExplainerModal).
 *
 * Data via useRiderStagePoints (lazy: pas wanneer riderId gezet is).
 */

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { StageTypeIcon, type StageType } from "@/components/stages/StageIcons";
import { categoryTone, type RiderCategory } from "./tokens";
import { useRiderStagePoints } from "@/hooks/useRiderStagePoints";

/** DB stage_type (NL/EN) → StageType union voor het icoon. */
function mapStageType(t: string | null | undefined): StageType {
  switch ((t ?? "").toLowerCase()) {
    case "heuvel":
    case "heuvelachtig":
    case "hilly":
      return "hilly";
    case "berg":
    case "bergop":
    case "mountain":
      return "mountain";
    case "tijdrit":
    case "ploegentijdrit":
    case "tt":
    case "timetrial":
      return "timetrial";
    case "vlak":
    case "flat":
    default:
      return "flat";
  }
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type Props = {
  open: boolean;
  riderId: string;
  riderName: string;
  category: RiderCategory;
  gameId?: string;
  entryId?: string | null;
  /** Voor aria-labelledby koppeling met de RiderTile-knop. */
  labelledById?: string;
  panelId?: string;
};

export default function RiderStageBreakdown({
  open,
  riderId,
  riderName,
  category,
  gameId,
  entryId,
  labelledById,
  panelId,
}: Props) {
  const { t } = useTranslation();
  const tone = categoryTone(category);
  const reduce = prefersReducedMotion();

  // Lazy: alleen ophalen wanneer open. riderId=null → enabled=false.
  const { data: rows = [], isLoading, isError } = useRiderStagePoints(
    gameId,
    open ? riderId : null,
    entryId,
  );

  const innerRef = useRef<HTMLDivElement>(null);
  const [maxH, setMaxH] = useState(0);

  useEffect(() => {
    if (!innerRef.current) return;
    setMaxH(open ? innerRef.current.scrollHeight : 0);
  }, [open, rows, isLoading, isError]);

  // Resize-safety zolang open: content kan groeien (font-load, async data).
  useEffect(() => {
    if (!open || !innerRef.current) return;
    const el = innerRef.current;
    const obs = new ResizeObserver(() => setMaxH(el.scrollHeight));
    obs.observe(el);
    return () => obs.disconnect();
  }, [open]);

  const total = rows.reduce((sum, r) => sum + (r.total_points ?? 0), 0);
  const scored = rows.filter((r) => (r.total_points ?? 0) > 0);

  return (
    <div
      id={panelId}
      role="region"
      aria-label={labelledById ? undefined : t("team.breakdown.ariaLabel", { name: riderName })}
      aria-labelledby={labelledById}
      style={{
        overflow: "hidden",
        maxHeight: reduce ? (open ? "none" : 0) : `${open ? maxH : 0}px`,
        opacity: open ? 1 : 0,
        transition: reduce
          ? "none"
          : "max-height 320ms cubic-bezier(0.4,0,0.2,1), opacity 240ms ease, margin 240ms ease",
        marginTop: open ? 6 : 0,
        marginBottom: open ? 4 : 0,
      }}
    >
      <div
        ref={innerRef}
        className="rounded-lg"
        style={{
          background: "#FBF6E9",
          border: "1px solid rgba(58,42,26,0.18)",
          borderTop: `2px solid ${tone.jersey}`,
          padding: "8px 10px 10px",
          marginInline: 4,
        }}
      >
        {/* Kop */}
        <div
          className="font-mono uppercase mb-1.5"
          style={{
            fontSize: "9px",
            letterSpacing: "0.16em",
            color: "#9A8A74",
            fontWeight: 700,
          }}
        >
          {t("team.breakdown.heading")}
        </div>

        {isLoading ? (
          <div className="space-y-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <Skeleton className="h-3.5 flex-1 max-w-[60%]" />
                <Skeleton className="h-3.5 w-7" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <p
            className="italic"
            style={{ fontSize: "12px", color: "#C0392B", fontWeight: 600 }}
          >
            {t("team.breakdown.loadError")}
          </p>
        ) : scored.length === 0 ? (
          <p
            className="italic"
            style={{ fontSize: "12.5px", color: "var(--ink-sepia)", opacity: 0.7 }}
          >
            {t("team.breakdown.noPoints")}
          </p>
        ) : (
          <>
            <ul className="space-y-0.5">
              {scored.map((r) => {
                const jokered = (r.multiplier ?? 1) > 1;
                return (
                  <li
                    key={r.stage_id}
                    className="flex items-center gap-2 py-0.5"
                    style={{ fontSize: "12.5px", color: "var(--ink-sepia)" }}
                  >
                    <span
                      style={{ color: tone.jersey, display: "inline-flex", flex: "0 0 auto" }}
                      aria-hidden
                    >
                      <StageTypeIcon type={mapStageType(r.stage_type)} size={14} />
                    </span>
                    <span className="min-w-0 flex-1 truncate" title={r.stage_name ?? undefined}>
                      <span className="font-semibold">{t("team.breakdown.stage", { stage: r.stage_number })}</span>
                      {r.stage_name ? (
                        <span style={{ color: "#9A8A74" }}> · {r.stage_name}</span>
                      ) : null}
                    </span>
                    {jokered && (
                      <span
                        className="font-mono uppercase shrink-0 rounded px-1"
                        style={{
                          fontSize: "8px",
                          letterSpacing: "0.08em",
                          background: tone.tint,
                          color: tone.ink,
                          border: `1px solid ${tone.jersey}`,
                          fontWeight: 700,
                        }}
                        title={t("team.breakdown.jokerMultiplier", { multiplier: r.multiplier })}
                      >
                        ×{r.multiplier}
                      </span>
                    )}
                    <span
                      className="shrink-0 tabular-nums text-right"
                      style={{
                        fontFamily: "'Source Serif 4','Playfair Display',Georgia,serif",
                        fontWeight: 800,
                        fontSize: "14px",
                        minWidth: 30,
                        color: "var(--ink-sepia)",
                      }}
                    >
                      {r.total_points}
                    </span>
                  </li>
                );
              })}
            </ul>

            {/* Totaal */}
            <div
              className="flex items-center justify-between mt-2 pt-1.5"
              style={{ borderTop: "1px dashed rgba(58,42,26,0.22)" }}
            >
              <span
                className="font-mono uppercase"
                style={{ fontSize: "10px", letterSpacing: "0.12em", color: "#9A8A74", fontWeight: 700 }}
              >
                {t("team.breakdown.total")}
              </span>
              <span
                className="tabular-nums"
                style={{
                  fontFamily: "'Source Serif 4','Playfair Display',Georgia,serif",
                  fontWeight: 900,
                  fontSize: "15px",
                  color: tone.ink,
                }}
              >
                {t("team.sheet.pt", { points: total })}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
