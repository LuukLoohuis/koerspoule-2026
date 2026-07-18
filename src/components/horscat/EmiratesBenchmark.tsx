/**
 * <EmiratesBenchmark> — eigen ploeg vs droomploeg in de superteam-tab.
 *
 * Standaard een compacte rendement-teaser (goud, retro-strip); na een klik klapt
 * op dezelfde plek de volledige categorie-vergelijking uit: perfecte keuzes
 * eerst (goud), daarna de missers aflopend op gemiste punten. Puur presentatie —
 * alle sommen komen uit de emiratesBenchmark-memo in HorsCategorieTab (zelfde
 * riderTotals/scope als het ceiling-totaal, dus teller en noemer kloppen).
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Crown, ChevronDown, X } from "lucide-react";
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

const GOLD = "hsl(var(--vintage-gold))";

/** Compacte naamweergave: "Merlier + Kooij". Kort af zonder de pill te breken. */
const names = (list: Array<{ name: string }>) =>
  list.length === 0 ? "—" : list.map((r) => r.name).join(" + ");

function GoldBar({ pct, tall = false }: { pct: number; tall?: boolean }) {
  return (
    <div className={cn("relative flex-1 rounded-full bg-foreground/10 overflow-visible", tall ? "h-2.5" : "h-1.5")}>
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: GOLD }}
      />
      <Crown
        className={cn("absolute -right-1 top-1/2 -translate-y-1/2", tall ? "h-4 w-4" : "h-3 w-3")}
        style={{ color: GOLD }}
        aria-hidden
      />
    </div>
  );
}

export default function EmiratesBenchmark({ data }: { data: BenchmarkData }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      {/* Teaser-strip */}
      <div className="retro-border no-hover-lift overflow-hidden rounded-xl bg-[hsl(var(--vintage-gold)/0.08)]">
        <div className="flex flex-col gap-2 px-3 py-2.5 md:flex-row md:items-center md:gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <Crown className="h-4 w-4 shrink-0" style={{ color: GOLD }} />
            <span className="font-display text-sm font-bold truncate">
              {t("hors.emirates.bench.teaser", { pct: data.rendement })}
            </span>
            <span className="shrink-0 rounded-full border border-[hsl(var(--vintage-gold)/0.5)] bg-[hsl(var(--vintage-gold)/0.14)] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-foreground/80">
              {t("hors.emirates.bench.perfectCount", { count: data.perfectCount, total: data.totalCats })}
            </span>
          </div>
          <div className="flex items-center gap-3 md:flex-1">
            <GoldBar pct={data.rendement} />
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-full border-2 border-foreground bg-card px-3 py-1.5 font-display text-xs font-bold shadow-[2px_2px_0_hsl(var(--foreground))] transition-transform hover:-translate-y-0.5 active:translate-y-px"
            >
              {open ? <X className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {open ? t("hors.emirates.bench.close") : t("hors.emirates.bench.openCta")}
            </button>
          </div>
        </div>
      </div>

      {/* Volledige vergelijking */}
      {open && (
        <div className="retro-border no-hover-lift rounded-xl bg-card p-3 md:p-4 space-y-3">
          {/* Kop */}
          <div className="text-center space-y-1.5">
            <div className="font-display text-3xl font-black" style={{ color: GOLD }}>
              {data.rendement}%
            </div>
            <p className="font-serif text-sm text-muted-foreground">
              {t("hors.emirates.bench.totalLine", { mine: data.mijnTotaal, dream: data.droomTotaal })}
            </p>
            <div className="flex items-center gap-3 max-w-md mx-auto px-2">
              <GoldBar pct={data.rendement} tall />
            </div>
            <span className="inline-flex rounded-full border border-[hsl(var(--vintage-gold)/0.5)] bg-[hsl(var(--vintage-gold)/0.14)] px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider">
              {t("hors.emirates.bench.perfectCount", { count: data.perfectCount, total: data.totalCats })}
            </span>
          </div>

          {/* Rijen: perfect eerst (goud), dan missers aflopend */}
          <div className="space-y-2">
            {data.rows.map((row) => {
              const isWorst = row.key === data.worstKey;
              const dreamPct = row.dreamPoints > 0 ? 100 : 0;
              const minePct =
                row.dreamPoints > 0 ? Math.min(100, (row.minePoints / row.dreamPoints) * 100) : 0;
              return (
                <div
                  key={row.key}
                  className={cn(
                    "rounded-lg p-2.5",
                    row.perfect
                      ? "border-2"
                      : isWorst
                        ? "border-2 border-red-500/70 bg-red-500/5"
                        : "border border-border bg-secondary/20"
                  )}
                  style={
                    row.perfect
                      ? { borderColor: GOLD, background: "hsl(var(--vintage-gold)/0.10)" }
                      : undefined
                  }
                >
                  {/* Kopregel: categorie links, pill rechts */}
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="min-w-0 truncate font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {row.categoryName}
                    </span>
                    {row.perfect ? (
                      <span
                        className="shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-[#1C1813]"
                        style={{ background: GOLD }}
                      >
                        <Crown className="h-2.5 w-2.5" /> {t("hors.emirates.bench.perfectPill")}
                      </span>
                    ) : isWorst ? (
                      <span className="shrink-0 rounded-full bg-red-600 px-2 py-0.5 font-mono text-[10px] font-bold text-white tabular-nums">
                        {t("hors.emirates.bench.missPoints", { diff: row.diff })}
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-red-500/15 border border-red-500/40 px-2 py-0.5 font-mono text-[10px] font-bold text-red-600 tabular-nums">
                        −{row.diff}
                      </span>
                    )}
                  </div>

                  {/* Twee gelabelde balken op dezelfde schaal: droom boven, jij onder */}
                  <div className="mt-2 grid grid-cols-[64px_minmax(0,1fr)_fit-content(45%)] md:grid-cols-[92px_minmax(0,1fr)_fit-content(45%)] items-center gap-x-2 gap-y-1.5">
                    <span
                      className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: GOLD }}
                    >
                      <Crown className="h-3 w-3 shrink-0" /> {t("hors.emirates.bench.dreamLabel")}
                    </span>
                    <div className="h-[14px] overflow-hidden rounded-full border border-foreground/25 bg-foreground/5">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${dreamPct}%`,
                          background:
                            "linear-gradient(90deg, hsl(var(--vintage-gold)/0.7), hsl(var(--vintage-gold)))",
                        }}
                      />
                    </div>
                    <span className="min-w-0 font-sans text-xs">
                      {names(row.dream)} ·{" "}
                      <span className="font-bold tabular-nums" style={{ color: GOLD }}>
                        {row.dreamPoints}
                      </span>
                    </span>

                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-foreground">
                      {t("hors.emirates.bench.youLabel")}
                    </span>
                    <div className="h-[14px] overflow-hidden rounded-full border border-foreground/25 bg-foreground/5">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${minePct}%`,
                          background: row.perfect
                            ? "linear-gradient(90deg, hsl(var(--vintage-gold)/0.7), hsl(var(--vintage-gold)))"
                            : "hsl(210 45% 52%)",
                        }}
                      />
                    </div>
                    <span className="min-w-0 font-sans text-xs">
                      {names(row.mine)} ·{" "}
                      <span className="font-bold tabular-nums">{row.minePoints}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-center font-mono text-[9px] md:text-[10px] tracking-[0.14em] uppercase text-muted-foreground/70">
            {t("hors.emirates.bench.legend")}
          </p>
        </div>
      )}
    </div>
  );
}
