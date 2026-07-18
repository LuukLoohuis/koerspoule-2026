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
              const totalForBar = Math.max(1, row.minePoints + row.dreamPoints);
              return row.perfect ? (
                <div
                  key={row.key}
                  className="rounded-lg border-2 p-2.5"
                  style={{ borderColor: GOLD, background: "hsl(var(--vintage-gold)/0.10)" }}
                >
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="font-display text-sm font-bold truncate">
                      {names(row.mine)} · {row.minePoints}
                    </span>
                    <span className="shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-[#1C1813]" style={{ background: GOLD }}>
                      <Crown className="h-2.5 w-2.5" /> {t("hors.emirates.bench.perfect")}
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                    {t("hors.emirates.bench.perfectSub", { category: row.categoryName })}
                  </p>
                </div>
              ) : (
                <div key={row.key} className="rounded-lg border border-border bg-secondary/20 p-2.5">
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="min-w-0 flex-1 font-sans text-xs md:text-sm truncate">
                      {names(row.mine)} · <span className="font-bold tabular-nums">{row.minePoints}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-red-500/15 border border-red-500/40 px-2 py-0.5 font-mono text-[10px] font-bold text-red-600 tabular-nums">
                      −{row.diff}
                    </span>
                    <span className="min-w-0 flex-1 text-right font-sans text-xs md:text-sm truncate">
                      {names(row.dream)} · <span className="font-bold tabular-nums" style={{ color: GOLD }}>{row.dreamPoints}</span>
                    </span>
                  </div>
                  {/* Tweezijdig balkje: mijn aandeel grijs, droom goud */}
                  <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-foreground/5">
                    <div className="h-full bg-foreground/30" style={{ width: `${(row.minePoints / totalForBar) * 100}%` }} />
                    <div className="h-full" style={{ width: `${(row.dreamPoints / totalForBar) * 100}%`, background: GOLD }} />
                  </div>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                    {row.categoryName}
                    {isWorst && (
                      <span className="ml-1.5 text-red-600 font-bold">· {t("hors.emirates.bench.biggestMiss")}</span>
                    )}
                  </p>
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
