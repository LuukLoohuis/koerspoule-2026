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
          isFirst && "ring-amber-400 bg-amber-950/60 shadow-lg shadow-amber-500/25",
          isSecond && "ring-zinc-400 bg-zinc-800/60 shadow-md shadow-zinc-400/15",
          isThird && "ring-orange-500 bg-orange-950/60 shadow-md shadow-orange-500/15",
          !isTop && "ring-white/10 bg-white/5"
        )}
      >
        {isFirst && <Crown className="w-3.5 h-3.5 text-amber-300 mb-0.5" />}
        {!isFirst && isSecond && <Star className="w-3 h-3 text-zinc-400 mb-0.5" />}
        {!isFirst && !isSecond && isThird && <Star className="w-3 h-3 text-orange-400 mb-0.5" />}
        <span
          className={cn(
            "leading-none",
            isFirst
              ? "text-xl text-amber-200"
              : isSecond
              ? "text-xl text-zinc-300"
              : isThird
              ? "text-xl text-orange-300"
              : "text-base text-white/50"
          )}
        >
          #{rank}
        </span>
      </div>
      <p className="text-[10px] text-white/30 font-sans">van {total}</p>
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
        <span className="font-display font-bold text-sm text-amber-100 shrink-0">
          Rit {dz.stage_number}
        </span>
        {dz.stage_name && (
          <span className="text-xs text-white/40 truncate hidden sm:block">
            · {dz.stage_name}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-0.5 shrink-0">
        <span className="font-display font-bold text-sm text-amber-400">{dz.points}</span>
        <span className="text-[10px] text-white/30">pt</span>
      </div>
    </div>
  );
}

// ── GameSection ────────────────────────────────────────────────

function GameSection({ g }: { g: PalmaresGame }) {
  const country = gameTypeToCountry(g.game_type);
  const isLive = ["active", "live", "open", "locked"].includes(g.status);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-[hsl(var(--v-card))] via-[hsl(var(--v-card))] to-[hsl(var(--v-dark))] p-4 md:p-5">
      {/* Game header */}
      <div className="flex items-center gap-3 mb-4">
        <FlagIcon country={country} className="w-7 h-5 rounded-sm shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-sm text-white truncate">{g.game_name}</h3>
          <p className="text-[10px] text-white/40">
            {isLive ? "🟢 Lopend" : g.year ? `${g.year}` : "Afgelopen"}
          </p>
        </div>
        {g.my_rank === 1 && (
          <span className="shrink-0 text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
            Leider
          </span>
        )}
      </div>

      {/* Rank + stats row */}
      <div className="flex items-start gap-4 mb-4">
        <RankBadge rank={g.my_rank} total={g.total_participants} />
        <div className="flex-1 grid grid-cols-3 gap-2 pt-1">
          <div className="rounded-xl border border-white/10 bg-white/5 py-2.5 px-1 text-center">
            <p className="font-display text-xl font-black text-amber-400">{g.stage_wins}</p>
            <p className="text-[10px] text-white/40 leading-tight mt-0.5">Dagzeges</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 py-2.5 px-1 text-center">
            <p className="font-display text-xl font-black text-white">{g.stage_podiums}</p>
            <p className="text-[10px] text-white/40 leading-tight mt-0.5">Podia</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 py-2.5 px-1 text-center">
            <p className="font-display text-xl font-black text-white">{g.approved_points}</p>
            <p className="text-[10px] text-white/40 leading-tight mt-0.5">Punten</p>
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
        <p className="text-xs text-white/25 italic font-serif text-center py-1">
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
    <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-[hsl(var(--v-card))] via-[hsl(var(--v-card))] to-[hsl(var(--v-dark))] p-4 md:p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        {medal ? (
          <span className="text-xl w-8 text-center shrink-0">{medal}</span>
        ) : (
          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[11px] font-bold text-white/40 shrink-0">
            #{s.my_rank}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-sm text-white truncate">{s.subpoule_name}</h3>
          <p className="text-[10px] text-white/40 inline-flex items-center gap-1">
            <FlagIcon country={country} className="w-3.5 h-2.5 inline" /> {s.game_name}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p
            className={cn(
              "font-display font-bold text-sm",
              s.my_rank <= 3 ? "text-amber-400" : "text-white/60"
            )}
          >
            #{s.my_rank}
          </p>
          <p className="text-[10px] text-white/30">/ {s.total_members}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-2">
        <div className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-center">
          <p className="font-display font-bold text-amber-400">{s.stage_wins}</p>
          <p className="text-[10px] text-white/40">Dagzeges</p>
        </div>
        <div className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-center">
          <p className="font-display font-bold text-white">{s.stage_podiums}</p>
          <p className="text-[10px] text-white/40">Podia</p>
        </div>
      </div>
    </div>
  );
}

// ── Skeleton loader ────────────────────────────────────────────

function PalmaresSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-44 animate-pulse bg-white/5 rounded-2xl" />
      {[1, 2].map((i) => (
        <div key={i} className="h-36 animate-pulse bg-white/5 rounded-2xl" />
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
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[hsl(var(--v-deep))] via-[hsl(var(--v-dark))] to-[hsl(var(--v-deep))] dark-grain p-8 text-center">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(to right,white 1px,transparent 1px),linear-gradient(to bottom,white 1px,transparent 1px)", backgroundSize: "32px 32px" }} />
        <Trophy className="w-12 h-12 mx-auto text-white/15 mb-3" />
        <p className="font-display font-bold text-white/50 mb-1">Nog geen palmares</p>
        <p className="text-sm text-white/30 italic font-serif">
          Speel een koers mee om hier je erelijst te zien.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Hero card ── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[hsl(var(--v-deep))] via-[hsl(var(--v-dark))] to-[hsl(var(--v-deep))] dark-grain shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)] p-6 md:p-8">
        {/* Grid overlay */}
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(to right,white 1px,transparent 1px),linear-gradient(to bottom,white 1px,transparent 1px)", backgroundSize: "32px 32px" }} />
        {/* Glow blob */}
        <div aria-hidden className="pointer-events-none absolute -top-32 -right-24 h-80 w-80 rounded-full blur-3xl opacity-25"
          style={{ background: "radial-gradient(circle, #f59e0b 0%, transparent 70%)" }} />

        <div className="relative">
          <div className="flex items-baseline gap-2 mb-1">
            <h2 className="font-display font-black text-2xl md:text-3xl text-white tracking-wide uppercase">
              🏆 PALMARES
            </h2>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-6">Erelijst</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Total dagzeges */}
            <div className="text-center p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="font-display font-black text-2xl text-amber-400">{totalDagzeges}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mt-1">Dagzeges</p>
            </div>
            {/* Total podiums */}
            <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
              <p className="font-display font-black text-2xl text-white">{totalPodiums}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mt-1">Podia</p>
            </div>
            {/* Best pool rank */}
            <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
              <p className="font-display font-black text-2xl text-white">
                {bestPoolRank ? `#${bestPoolRank}` : "—"}
              </p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mt-1">Beste stand</p>
            </div>
            {/* Subpoule wins */}
            <div className="text-center p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="font-display font-black text-2xl text-emerald-400">{subWins}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mt-1">Subpoule­wins</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Poule Klassement ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Mountain className="w-3.5 h-3.5 text-white/40" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
            Poule Klassement
          </span>
          <span className="ml-auto text-[10px] text-white/25">
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
          <Users className="w-3.5 h-3.5 text-white/40" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Subpoules</span>
          {subpoules.length > 0 && (
            <span className="ml-auto text-[10px] text-white/25">
              {subpoules.length} subpoule{subpoules.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
        {subpoules.length > 0 ? (
          subpoules.map((s) => <SubpouleSection key={s.subpoule_id} s={s} />)
        ) : (
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
            <Users className="w-8 h-8 mx-auto text-white/15 mb-2" />
            <p className="text-xs text-white/30 italic font-serif">
              Word lid van een subpoule om hier je ranking te zien.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
