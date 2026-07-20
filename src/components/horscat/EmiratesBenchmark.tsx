/**
 * <EmiratesBenchmark> — eigen ploeg vs droomploeg als goud-op-navy dashboard.
 *
 * Standaard een compacte donkere teaser-strip; na een klik klapt op dezelfde
 * plek het volledige dashboard uit: hero met rendement, de grootste gemiste
 * kans als uitgelichte rode kaart, daarna perfecte categorieën (goud) en de
 * overige missers aflopend op gemiste punten. Puur presentatie — alle sommen
 * komen uit de emiratesBenchmark-memo in HorsCategorieTab (zelfde
 * riderTotals/scope als het ceiling-totaal, dus teller en noemer kloppen).
 */
import { useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Crown, ChevronDown, Flame, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type BenchmarkRow = {
  key: string;
  categoryName: string;
  mine: Array<{ name: string; points: number }>;
  dream: Array<{ name: string; points: number }>;
  minePoints: number;
  dreamPoints: number;
  diff: number;
  perfect: boolean;
};

export type BenchmarkData = {
  rows: BenchmarkRow[];
  mijnTotaal: number;
  droomTotaal: number;
  rendement: number;
  perfectCount: number;
  totalCats: number;
  worstKey: string | null;
};

const NAVY_GRADIENT = "linear-gradient(160deg, hsl(222 42% 15%), hsl(222 38% 11%))";
const NAVY_SHADOW = "3px 4px 0 hsl(222 40% 8%)";
const GOLD_BORDER = "hsl(43 60% 38%)";
const GOLD_TEXT = "hsl(43 65% 62%)";
const GOLD_BAR = "linear-gradient(90deg, hsl(43 70% 50%), hsl(45 85% 62%))";
const BLUE_BAR = "linear-gradient(90deg, hsl(210 55% 50%), hsl(210 60% 60%))";
const BAR_HIGHLIGHT = "inset 0 1px 0 rgba(255,255,255,.4)";
const TRACK_BG = "hsl(222 30% 22%)";
const TEXT_LIGHT = "hsl(222 15% 82%)";

/** Compacte naamweergave: "Merlier + Kooij". */
const names = (list: Array<{ name: string }>) =>
  list.length === 0 ? "—" : list.map((r) => r.name).join(" + ");

function usePrefersReducedMotion() {
  const [reduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  return reduced;
}

/** Ingroeiende breedte: start op 0 en groeit naar pct; direct bij reduced motion. */
function useGrownPct(pct: number) {
  const reduced = usePrefersReducedMotion();
  const [w, setW] = useState(reduced ? pct : 0);
  useEffect(() => {
    if (reduced) {
      setW(pct);
      return;
    }
    const id = requestAnimationFrame(() => setW(pct));
    return () => cancelAnimationFrame(id);
  }, [pct, reduced]);
  return {
    w,
    transition: reduced ? undefined : "width 500ms ease-out, flex-basis 500ms ease-out",
  };
}

/** Balk als flex-item (flex-basis = pct%), naam plakt er rechts naast. */
function CatBar({ pct, fill }: { pct: number; fill: string | null }) {
  const { w, transition } = useGrownPct(pct);
  return (
    <div
      className="h-[13px] rounded-full"
      style={{
        flex: `0 1 ${w}%`,
        minWidth: 18,
        transition,
        background: fill ?? "transparent",
        border: fill ? "1px solid rgba(0,0,0,.25)" : "1px solid hsl(222 25% 40%)",
        boxShadow: fill ? BAR_HIGHLIGHT : undefined,
      }}
    />
  );
}

/** Twee-balken-grid: DROOM (goud, 100%) boven JIJ (blauw, pct). */
function BarsGrid({ row }: { row: BenchmarkRow }) {
  const { t } = useTranslation();
  const dreamPct = row.dreamPoints > 0 ? 100 : 0;
  const minePct =
    row.dreamPoints > 0 ? Math.min(100, (row.minePoints / row.dreamPoints) * 100) : 0;
  return (
    <div className="grid grid-cols-[64px_minmax(0,1fr)] md:grid-cols-[74px_minmax(0,1fr)] items-center gap-x-2.5 gap-y-1.5">
      <span
        className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider"
        style={{ color: GOLD_TEXT }}
      >
        <Crown className="h-3 w-3 shrink-0" /> {t("hors.emirates.bench.dreamLabel")}
      </span>
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 md:flex-nowrap">
        <CatBar pct={dreamPct} fill={dreamPct > 0 ? GOLD_BAR : null} />
        <span
          className="w-full min-w-0 font-sans text-xs font-semibold md:w-auto md:max-w-[55%] md:shrink-0 md:text-sm"
          style={{ color: GOLD_TEXT }}
        >
          {names(row.dream)} · <span className="tabular-nums">{row.dreamPoints}</span>
        </span>
      </div>

      <span
        className="font-mono text-[10px] font-bold uppercase tracking-wider"
        style={{ color: TEXT_LIGHT }}
      >
        {t("hors.emirates.bench.youLabel")}
      </span>
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 md:flex-nowrap">
        <CatBar pct={minePct} fill={minePct > 0 ? BLUE_BAR : null} />
        <span
          className="w-full min-w-0 font-sans text-xs font-semibold md:w-auto md:max-w-[55%] md:shrink-0 md:text-sm"
          style={{ color: TEXT_LIGHT }}
        >
          {names(row.mine)} · <span className="tabular-nums">{row.minePoints}</span>
        </span>
      </div>
    </div>
  );
}

export default function EmiratesBenchmark({ data }: { data: BenchmarkData }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const worst = data.rows.find((r) => r.key === data.worstKey) ?? null;
  const rest = data.rows.filter((r) => r.key !== data.worstKey);

  return (
    <div className="space-y-3">
      {/* ── Teaser-strip ── */}
      <div
        className="overflow-hidden rounded-xl"
        style={{ background: NAVY_GRADIENT, border: `2px solid ${GOLD_BORDER}`, boxShadow: NAVY_SHADOW }}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
          <Crown className="h-4 w-4 shrink-0" style={{ color: GOLD_TEXT }} />
          <span className="font-display text-sm font-bold" style={{ color: "hsl(43 40% 92%)" }}>
            {t("hors.emirates.bench.teaserShort", { pct: data.rendement })}
          </span>
          <div
            className="relative h-2 w-24 overflow-hidden rounded-full"
            style={{ background: TRACK_BG, border: `1px solid ${GOLD_BORDER}` }}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, data.rendement))}%`, background: GOLD_BAR }}
            />
          </div>
          <span
            className="font-mono text-[10px] font-bold uppercase tracking-wider"
            style={{ color: GOLD_TEXT }}
          >
            {t("hors.emirates.bench.perfectShort", { count: data.perfectCount, total: data.totalCats })}
          </span>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-display text-xs font-bold transition-colors hover:bg-[hsl(43_60%_45%/0.15)]"
            style={{ border: `1.5px solid ${GOLD_BORDER}`, color: GOLD_TEXT }}
          >
            {open ? <X className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {open ? t("hors.emirates.bench.close") : t("hors.emirates.bench.openCta")}
          </button>
        </div>
      </div>

      {/* ── Dashboard ── */}
      {open && (
        <div
          className="overflow-hidden rounded-xl"
          style={{ background: NAVY_GRADIENT, border: `2px solid ${GOLD_BORDER}`, boxShadow: NAVY_SHADOW }}
        >
          {/* 2a. Kopstrip */}
          <div
            className="flex items-center gap-2 px-4 py-2.5"
            style={{
              background: "hsl(43 60% 45% / 0.08)",
              borderBottom: "1px solid hsl(43 60% 38% / 0.35)",
            }}
          >
            <Crown className="h-4 w-4 shrink-0" style={{ color: GOLD_TEXT }} />
            <span
              className="font-mono text-[11px] font-bold uppercase"
              style={{ color: GOLD_TEXT, letterSpacing: "0.22em" }}
            >
              {t("hors.emirates.bench.vsTitle")}
            </span>
          </div>

          <div className="space-y-3 p-3 md:p-4">
            {/* 2b. Hero */}
            <div className="grid gap-3 md:grid-cols-[auto_1fr] md:items-center md:gap-6">
              <div>
                <div
                  className="font-display leading-none"
                  style={{
                    fontSize: 52,
                    fontWeight: 800,
                    background: "linear-gradient(180deg, hsl(45 90% 68%), hsl(40 75% 46%))",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    color: "transparent",
                  }}
                >
                  {data.rendement}%
                </div>
                <div
                  className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em]"
                  style={{ color: TEXT_LIGHT }}
                >
                  {t("hors.emirates.bench.rendementLabel")}
                </div>
              </div>
              <div className="min-w-0 space-y-2">
                <HeroBar pct={data.rendement} />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-sans text-xs md:text-sm" style={{ color: TEXT_LIGHT }}>
                    <Trans
                      i18nKey="hors.emirates.bench.totalLineRich"
                      values={{ mine: data.mijnTotaal, dream: data.droomTotaal }}
                      components={{ gold: <span className="font-bold" style={{ color: GOLD_TEXT }} /> }}
                    />
                  </span>
                  <span
                    className="rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      border: `1px solid ${GOLD_BORDER}`,
                      background: "hsl(43 60% 45% / 0.10)",
                      color: GOLD_TEXT,
                    }}
                  >
                    ★ {t("hors.emirates.bench.perfectShort", { count: data.perfectCount, total: data.totalCats })}
                  </span>
                </div>
              </div>
            </div>

            {/* 2c. Uitgelicht: grootste gemiste kans */}
            {worst && (
              <div
                className="rounded-lg p-3"
                style={{
                  border: "1.5px solid hsl(0 65% 52% / 0.7)",
                  background: "linear-gradient(160deg, hsl(0 45% 20%), hsl(222 35% 14%))",
                }}
              >
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <span className="inline-flex min-w-0 items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-red-400">
                    <Flame className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {t("hors.emirates.bench.biggestMiss")} · {worst.categoryName}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-bold text-white tabular-nums" style={{ background: "hsl(0 65% 48%)" }}>
                    −{worst.diff}
                  </span>
                </div>
                <div className="mt-2.5">
                  <BarsGrid row={worst} />
                </div>
              </div>
            )}

            {/* 2d. Overige categorieën: perfect eerst (goud), dan missers aflopend */}
            <div className="space-y-2">
              {rest.map((row) =>
                row.perfect ? (
                  <div
                    key={row.key}
                    className="rounded-lg p-3"
                    style={{
                      border: `1px solid ${GOLD_BORDER}`,
                      background: "hsl(43 60% 45% / 0.10)",
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <span
                        className="min-w-0 truncate font-mono text-[11px] font-bold uppercase tracking-wider"
                        style={{ color: GOLD_TEXT }}
                      >
                        {row.categoryName}
                      </span>
                      <span
                        className="shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider"
                        style={{
                          border: `1px solid ${GOLD_BORDER}`,
                          background: "hsl(43 60% 45% / 0.12)",
                          color: GOLD_TEXT,
                        }}
                      >
                        <Crown className="h-3 w-3" /> {t("hors.emirates.bench.perfect")}
                      </span>
                    </div>
                    {/* Eén gecombineerde regel: jij én de droomploeg zijn identiek */}
                    <div className="mt-2.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 md:flex-nowrap">
                      <CatBar pct={row.dreamPoints > 0 ? 100 : 0} fill={row.dreamPoints > 0 ? GOLD_BAR : null} />
                      <span
                        className="w-full min-w-0 font-sans text-xs font-semibold md:w-auto md:max-w-[60%] md:shrink-0 md:text-sm"
                        style={{ color: GOLD_TEXT }}
                      >
                        {t("hors.emirates.bench.perfectCombined", {
                          names: names(row.dream),
                          points: row.dreamPoints,
                        })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    key={row.key}
                    className="rounded-lg p-3"
                    style={{ background: "hsl(222 30% 17%)", border: "1px solid hsl(222 25% 32%)" }}
                  >
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <span
                        className="min-w-0 truncate font-mono text-[11px] font-bold uppercase tracking-wider"
                        style={{ color: TEXT_LIGHT }}
                      >
                        {row.categoryName}
                      </span>
                      <span className="shrink-0 rounded-full border border-red-500/50 bg-red-500/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-red-400 tabular-nums">
                        −{row.diff}
                      </span>
                    </div>
                    <div className="mt-2.5">
                      <BarsGrid row={row} />
                    </div>
                  </div>
                ),
              )}
            </div>

            {/* 2e. Legenda */}
            <p
              className="text-center font-mono text-[9px] md:text-[10px] uppercase tracking-[0.14em]"
              style={{ color: "hsl(222 15% 60%)" }}
            >
              {t("hors.emirates.bench.legend")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/** Hero-voortgangsbalk met kroontje op het 100%-uiteinde. */
function HeroBar({ pct }: { pct: number }) {
  const { w, transition } = useGrownPct(Math.min(100, Math.max(0, pct)));
  return (
    <div className="flex items-center gap-2">
      <div
        className="relative h-3 flex-1 overflow-hidden rounded-full"
        style={{ background: TRACK_BG, border: `1px solid ${GOLD_BORDER}` }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${w}%`, transition, background: GOLD_BAR, boxShadow: BAR_HIGHLIGHT }}
        />
      </div>
      <Crown className="h-4 w-4 shrink-0" style={{ color: GOLD_TEXT }} aria-hidden />
    </div>
  );
}
