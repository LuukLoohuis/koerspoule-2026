import { Mountain, Users, Crown, Star, Trophy } from "lucide-react";
import FlagIcon from "@/components/FlagIcon";
import { usePalmares, type PalmaresGame, type PalmaresSubpoule, type StageDagzege } from "@/hooks/usePalmares";
import { cn } from "@/lib/utils";

function gameTypeToCountry(type: string | null): "IT" | "FR" | "ES" {
  const k = (type ?? "").toLowerCase();
  if (k === "tour" || k === "tdf") return "FR";
  if (k === "vuelta" || k === "vta") return "ES";
  return "IT";
}

// ── RankBadge ──────────────────────────────────────────────────

function RankBadge({ rank, total }: { rank: number; total: number }) {
  const isFirst = rank === 1;
  const isSecond = rank === 2;
  const isThird = rank === 3;
  const isTop = rank <= 3;

  return (
    <div className="flex flex-col items-center gap-1.5 shrink-0">
      <div
        className={cn(
          "relative flex flex-col items-center justify-center rounded-full font-display font-black w-16 h-16 ring-2",
          isFirst && "ring-amber-400 bg-amber-50 shadow-lg shadow-amber-500/25",
          isSecond && "ring-zinc-400 bg-zinc-100 shadow-md shadow-zinc-400/15",
          isThird && "ring-orange-500 bg-orange-50 shadow-md shadow-orange-500/15",
          !isTop && "ring-border bg-secondary/40"
        )}
      >
        {isFirst && <Crown className="w-3.5 h-3.5 text-amber-700 mb-0.5" />}
        {!isFirst && isSecond && <Star className="w-3 h-3 text-zinc-400 mb-0.5" />}
        {!isFirst && !isSecond && isThird && <Star className="w-3 h-3 text-orange-400 mb-0.5" />}
        <span
          className={cn(
            "leading-none",
            isFirst
              ? "text-xl text-amber-700"
              : isSecond
              ? "text-xl text-zinc-600"
              : isThird
              ? "text-xl text-orange-600"
              : "text-base text-muted-foreground"
          )}
        >
          #{rank}
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground/70 font-sans">van {total}</p>
    </div>
  );
}

// ── DagzegeRow ─────────────────────────────────────────────────

function DagzegeRow({ dz }: { dz: StageDagzege }) {
  return (
    <div className="flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
      <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-amber-500/15 border border-amber-500/30">
        <Trophy className="w-3.5 h-3.5 text-amber-400" />
      </div>
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className="font-display font-bold text-sm text-amber-700 shrink-0">
          Rit {dz.stage_number}
        </span>
        {dz.stage_name && (
          <span className="text-xs text-muted-foreground truncate hidden sm:block">
            · {dz.stage_name}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-0.5 shrink-0">
        <span className="font-display font-bold text-sm text-amber-600">{dz.points}</span>
        <span className="text-[10px] text-muted-foreground/70">pt</span>
      </div>
    </div>
  );
}

// ── GameSection ────────────────────────────────────────────────

function GameSection({ g }: { g: PalmaresGame }) {
  const country = gameTypeToCountry(g.game_type);
  const isLive = ["active", "live", "open", "open_inschrijving", "locked"].includes(g.status);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 md:p-5">
      {/* Game header */}
      <div className="flex items-center gap-3 mb-4">
        <FlagIcon country={country} className="w-7 h-5 rounded-sm shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-sm text-foreground truncate">{g.game_name}</h3>
          <p className="text-[10px] text-muted-foreground">
            {isLive ? "🟢 Lopend" : g.year ? `${g.year}` : "Afgelopen"}
          </p>
        </div>
        {g.my_rank === 1 && (
          <span className="shrink-0 text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/30">
            Leider
          </span>
        )}
      </div>

      {/* Rank + stats row */}
      <div className="flex items-start gap-4 mb-4">
        <RankBadge rank={g.my_rank} total={g.total_participants} />
        <div className="flex-1 grid grid-cols-3 gap-2 pt-1">
          <div className="rounded-xl border border-border/70 bg-secondary/50 py-2.5 px-1 text-center">
            <p className="font-display text-xl font-black text-amber-600">{g.stage_wins}</p>
            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Dagzeges</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-secondary/50 py-2.5 px-1 text-center">
            <p className="font-display text-xl font-black text-foreground">{g.stage_podiums}</p>
            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Podia</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-secondary/50 py-2.5 px-1 text-center">
            <p className="font-display text-xl font-black text-foreground">{g.approved_points}</p>
            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Punten</p>
          </div>
        </div>
      </div>

      {/* Dagzeges list */}
      {g.dagzeges.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5 text-amber-500/70" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-amber-500/60">
              Dagzeges · Poule
            </span>
          </div>
          <div className="space-y-1.5">
            {g.dagzeges.map((dz) => (
              <DagzegeRow key={dz.stage_id} dz={dz} />
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground/60 italic font-serif text-center py-1">
          Nog geen dagzeges — maar elke rit is een nieuwe kans.
        </p>
      )}
    </div>
  );
}

// ── SubpouleSection ────────────────────────────────────────────

function SubpouleSection({ s }: { s: PalmaresSubpoule }) {
  const country = gameTypeToCountry(s.game_type);
  const medal =
    s.my_rank === 1 ? "🥇" : s.my_rank === 2 ? "🥈" : s.my_rank === 3 ? "🥉" : null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 md:p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        {medal ? (
          <span className="text-xl w-8 text-center shrink-0">{medal}</span>
        ) : (
          <div className="w-8 h-8 rounded-full bg-secondary/40 border border-border flex items-center justify-center text-[11px] font-bold text-muted-foreground shrink-0">
            #{s.my_rank}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-sm text-foreground truncate">{s.subpoule_name}</h3>
          <p className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
            <FlagIcon country={country} className="w-3.5 h-2.5 inline" /> {s.game_name}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p
            className={cn(
              "font-display font-bold text-sm",
              s.my_rank <= 3 ? "text-amber-600" : "text-foreground/70"
            )}
          >
            #{s.my_rank}
          </p>
          <p className="text-[10px] text-muted-foreground/70">/ {s.total_members}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-2">
        <div className="flex-1 rounded-xl border border-border/70 bg-secondary/50 py-2 text-center">
          <p className="font-display font-bold text-amber-600">{s.stage_wins}</p>
          <p className="text-[10px] text-muted-foreground">Dagzeges</p>
        </div>
        <div className="flex-1 rounded-xl border border-border/70 bg-secondary/50 py-2 text-center">
          <p className="font-display font-bold text-foreground">{s.stage_podiums}</p>
          <p className="text-[10px] text-muted-foreground">Podia</p>
        </div>
      </div>
    </div>
  );
}

// ── Skeleton loader ────────────────────────────────────────────

function PalmaresSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-44 animate-pulse bg-secondary/50 rounded-2xl" />
      {[1, 2].map((i) => (
        <div key={i} className="h-36 animate-pulse bg-secondary/50 rounded-2xl" />
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────

export default function PalmaresPanel() {
  const { data, isLoading } = usePalmares();
  const games = data?.games ?? [];
  const subpoules = data?.subpoules ?? [];

  const totalDagzeges = games.reduce((s, g) => s + g.stage_wins, 0);
  const totalPodiums = games.reduce((s, g) => s + g.stage_podiums, 0);
  const bestPoolRank = games.length
    ? Math.min(...games.map((g) => g.my_rank).filter((r) => r > 0))
    : 0;
  const subWins = subpoules.filter((s) => s.is_winner).length;

  if (isLoading) return <PalmaresSkeleton />;

  if (games.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 text-center">
        <Trophy className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
        <p className="font-display font-bold text-muted-foreground mb-1">Nog geen palmares</p>
        <p className="text-sm text-muted-foreground/70 italic font-serif">
          Speel een koers mee om hier je erelijst te zien.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Hero card ── */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] p-6 md:p-8">
        <div className="relative">
          <div className="flex items-baseline gap-2 mb-1">
            <h2 className="font-display font-black text-2xl md:text-3xl text-foreground tracking-wide uppercase">
              🏆 PALMARES
            </h2>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-6">Erelijst</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Total dagzeges */}
            <div className="text-center p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="font-display font-black text-2xl text-amber-600">{totalDagzeges}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">Dagzeges</p>
            </div>
            {/* Total podiums */}
            <div className="text-center p-3 rounded-xl bg-secondary/50 border border-border/70">
              <p className="font-display font-black text-2xl text-foreground">{totalPodiums}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">Podia</p>
            </div>
            {/* Best pool rank */}
            <div className="text-center p-3 rounded-xl bg-secondary/50 border border-border/70">
              <p className="font-display font-black text-2xl text-foreground">
                {bestPoolRank ? `#${bestPoolRank}` : "—"}
              </p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">Beste stand</p>
            </div>
            {/* Subpoule wins */}
            <div className="text-center p-3 rounded-xl bg-emerald-50 border border-emerald-500/20">
              <p className="font-display font-black text-2xl text-emerald-600">{subWins}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">Subpoule­wins</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Poule Klassement ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Mountain className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Poule Klassement
          </span>
          <span className="ml-auto text-[10px] text-muted-foreground/60">
            {games.length} koers{games.length === 1 ? "" : "en"}
          </span>
        </div>
        {games.map((g) => (
          <GameSection key={g.game_id} g={g} />
        ))}
      </div>

      {/* ── Subpoules ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Subpoules</span>
          {subpoules.length > 0 && (
            <span className="ml-auto text-[10px] text-muted-foreground/60">
              {subpoules.length} subpoule{subpoules.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
        {subpoules.length > 0 ? (
          subpoules.map((s) => <SubpouleSection key={s.subpoule_id} s={s} />)
        ) : (
          <div className="relative overflow-hidden rounded-2xl border border-border bg-secondary/40 p-6 text-center">
            <Users className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground/70 italic font-serif">
              Word lid van een subpoule om hier je ranking te zien.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
