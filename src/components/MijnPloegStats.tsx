import { useAuth } from "@/hooks/useAuth";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useEntry } from "@/hooks/useEntry";
import { useMijnPloegStats } from "@/hooks/useMijnPloegStats";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown } from "lucide-react";

// Alle data komt uit useMijnPloegStats — één bron, gedeeld met het
// La Salle de Course-dashboard in MyTeamPanel. Hier alleen presentatie.

// ── Animation hook ────────────────────────────────────────────────────────────

// Geen count-up-animatie meer (bewust): toont direct de eindwaarde.
function useCountUp(target: number, _duration = 650, _delay = 0) {
  return target;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Delta({ n }: { n: number }) {
  if (n === 0) return <span className="text-[10px] font-bold tabular-nums" style={{ color: "#9A9A9A" }}>—</span>;
  return (
    <span
      className="inline-flex items-center gap-px text-[10px] font-bold tabular-nums leading-none"
      style={{ color: n > 0 ? "#2E8B57" : "#C0392B" }}
    >
      {n > 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
      {Math.abs(n)}
    </span>
  );
}

function rankColor(rank: number | null): string {
  if (rank === 1) return "hsl(var(--primary))";
  if (rank !== null && rank <= 3) return "hsl(var(--vintage-gold))";
  return "hsl(25 20% 12%)";
}

/** Hairline tussen de cellen — gedrukte krantentabel, geen losse kaartjes. */
const CELL_HAIRLINE = "1px solid color-mix(in srgb, var(--ink-sepia) 20%, transparent)";

function StatCard({
  label,
  delay,
  isEmpty,
  index,
  children,
}: {
  label: string;
  delay: number;
  isEmpty: boolean;
  /** Positie in het 2×2 raster: bepaalt de interne hairlines + goud-anker. */
  index: number;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col gap-1.5 p-3 opacity-0 min-h-[80px]"
      style={{
        // Kolom 2 krijgt een hairline links, rij 2 een hairline boven.
        // Cel 1 (linksboven) krijgt het gouden anker-randje.
        borderLeft:
          index === 0
            ? "3px solid hsl(var(--vintage-gold))"
            : index % 2 === 1
              ? CELL_HAIRLINE
              : undefined,
        borderTop: index >= 2 ? CELL_HAIRLINE : undefined,
        animation: `ploegStatsFadeIn 0.45s ease-out ${delay}ms forwards`,
      }}
    >
      <span
        className="text-[9px] tracking-[0.25em] uppercase font-mono font-bold leading-none"
        style={{ color: "#8B7355" }}
      >
        {label}
      </span>
      {isEmpty ? (
        <span className="font-display text-3xl font-black leading-none" style={{ color: "#C8B89A" }}>
          —
        </span>
      ) : children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MijnPloegStats() {
  const { user } = useAuth();
  const { data: game } = useCurrentGame();
  const { entry } = useEntry(game?.id);
  const { bestStageRank, overall, subpoule, topscorer } = useMijnPloegStats();

  // ── Animated counters ─────────────────────────────────────────────────────
  const aBestRank     = useCountUp(bestStageRank?.rank ?? 0,  650,   0);
  const aOverallRank  = useCountUp(overall?.rank ?? 0,        650,  80);
  const aSubpouleRank = useCountUp(subpoule?.rank ?? 0,       650, 160);
  const aRiderPts     = useCountUp(topscorer?.points ?? 0,    650, 240);

  if (!entry || !user) return null;

  const Num = ({ n, rank }: { n: number; rank: number | null }) => (
    <span className="font-display font-black leading-none tabular-nums" style={{ fontSize: "2rem", color: rankColor(rank) }}>
      {n}<span style={{ fontSize: "1.3rem" }}>e</span>
    </span>
  );

  return (
    <div className="grid grid-cols-2">

      {/* 1 — Meilleure étape */}
      <StatCard label="Meilleure étape" delay={0} index={0} isEmpty={!bestStageRank}>
        {bestStageRank && (
          <>
            <Num n={aBestRank} rank={bestStageRank.rank} />
            <span className="text-[10px] font-mono leading-tight" style={{ color: "#8B7355" }}>
              {bestStageRank.stage
                ? `Rit ${bestStageRank.stage.stage_number}${bestStageRank.stage.name ? ` · ${bestStageRank.stage.name}` : ""}`
                : "—"}
            </span>
          </>
        )}
      </StatCard>

      {/* 2 — Classement général */}
      <StatCard label="Classement général" delay={80} index={1} isEmpty={!overall}>
        {overall && (
          <>
            <div className="flex items-baseline gap-2">
              <Num n={aOverallRank} rank={overall.rank} />
              <Delta n={overall.delta} />
            </div>
            <span className="text-[10px] font-mono leading-tight" style={{ color: "#8B7355" }}>
              van {overall.total} deelnemers
            </span>
          </>
        )}
      </StatCard>

      {/* 3 — Subpoule */}
      <StatCard label="Subpoule" delay={160} index={2} isEmpty={!subpoule}>
        {subpoule && (
          <>
            <div className="flex items-baseline gap-2">
              <Num n={aSubpouleRank} rank={subpoule.rank} />
              <Delta n={subpoule.delta} />
            </div>
            <span className="text-[10px] font-mono leading-tight truncate" style={{ color: "#8B7355" }}>
              van {subpoule.total} · {subpoule.name}
            </span>
          </>
        )}
      </StatCard>

      {/* 4 — Coureur étoile */}
      <StatCard label="Coureur étoile" delay={240} index={3} isEmpty={!topscorer}>
        {topscorer && (
          <>
            <span
              className={cn("font-display font-black leading-tight", topscorer.name.length > 12 ? "text-base" : "text-lg")}
              style={{ color: rankColor(1) }}
            >
              {topscorer.name}
            </span>
            <span className="text-[10px] font-mono" style={{ color: "#8B7355" }}>
              +{aRiderPts} pts totaal
            </span>
          </>
        )}
      </StatCard>

    </div>
  );
}
