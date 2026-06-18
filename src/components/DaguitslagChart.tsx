import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Flag, Medal } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useEntries, useStages, useStagePointsForEntries } from "@/hooks/useResults";
import { useSubpouleMembers } from "@/hooks/useSubpoules";
import { cn } from "@/lib/utils";
import DaguitslagCelebration, { type Celebration } from "@/components/DaguitslagCelebration";

type Props = {
  subpouleId: string;
  subpouleName: string;
  gameId?: string;
  gameStatus?: string;
};

/**
 * Daguitslag — horizontale bar chart van etappepunten per subpoulelid voor
 * de meest recent gefiatteerde (results_status='approved') rit. Retro krant-stijl.
 */
export default function DaguitslagChart({ subpouleId, subpouleName, gameId, gameStatus }: Props) {
  const { user } = useAuth();
  const { data: curGame } = useCurrentGame();
  const game = gameId ? { id: gameId, status: gameStatus } : curGame;

  const { data: members = [], isLoading: membersLoading } = useSubpouleMembers(subpouleId);
  const { data: entries = [] } = useEntries(game?.id);
  const { data: stages = [], isLoading: stagesLoading } = useStages(game?.id);

  const memberEntryIds = useMemo(() => {
    const memberUserIds = new Set(members.map((m) => m.user_id));
    return entries.filter((e) => memberUserIds.has(e.user_id)).map((e) => e.id);
  }, [members, entries]);
  const { data: stagePoints = [], isLoading: pointsLoading } =
    useStagePointsForEntries(game?.id, memberEntryIds);

  // Laatste rit met approved results (en geen GC-row).
  const approvedStages = useMemo(
    () => stages.filter((s) => !s.is_gc && s.results_status === "approved"),
    [stages],
  );
  const latestApproved = approvedStages.length
    ? approvedStages[approvedStages.length - 1]
    : null;

  const [stageIdx, setStageIdx] = useState<number>(-1);
  useEffect(() => {
    if (latestApproved) {
      const i = approvedStages.findIndex((s) => s.id === latestApproved.id);
      setStageIdx(i);
    }
  }, [latestApproved?.id, approvedStages.length]);

  const selectedStage = stageIdx >= 0 ? approvedStages[stageIdx] : null;

  // Rijen voor de geselecteerde rit
  const rows = useMemo(() => {
    if (!selectedStage) return [];
    const pts = new Map<string, number>();
    stagePoints
      .filter((sp) => sp.stage_id === selectedStage.id)
      .forEach((sp) => pts.set(sp.entry_id, (pts.get(sp.entry_id) ?? 0) + sp.points));

    return members
      .map((m) => {
        const entry = entries.find((e) => e.user_id === m.user_id);
        return {
          user_id: m.user_id,
          display_name: m.display_name ?? "—",
          team_name: entry?.team_name ?? null,
          points: entry ? (pts.get(entry.id) ?? 0) : 0,
        };
      })
      .sort((a, b) => b.points - a.points);
  }, [members, entries, stagePoints, selectedStage?.id]);

  const scorers = rows.filter((r) => r.points > 0);
  const zeros = rows.filter((r) => r.points === 0);
  const maxPts = scorers[0]?.points ?? 0;

  // ── Feestje: ben ik zélf dagwinnaar/podium in de geselecteerde rit? ──
  // Rang onder de scorers (alleen wie punten heeft telt mee).
  const myStageRank = useMemo(() => {
    if (!user?.id) return 0;
    const ranked = rows.filter((r) => r.points > 0);
    const idx = ranked.findIndex((r) => r.user_id === user.id);
    return idx >= 0 ? idx + 1 : 0;
  }, [rows, user?.id]);

  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const closeCelebration = useCallback(() => setCelebration(null), []);
  const stageId = selectedStage?.id;
  useEffect(() => {
    // Alleen echte, gefiatteerde uitslagen (selectedStage komt uit approvedStages),
    // alleen als ik écht in de uitslag sta op het podium, en hooguit de getoonde
    // (default = meest recente) rit — geen stapel confetti.
    if (!stageId || myStageRank < 1 || myStageRank > 3) return;
    const scope = subpouleId || `game-${game?.id ?? ""}`;
    const key = `kp_celebrated:${scope}:${stageId}:${myStageRank}`;
    let already = true;
    try {
      already = localStorage.getItem(key) === "1";
    } catch {
      already = true; // localStorage geblokkeerd → niet vieren (geen spam/crash)
    }
    if (already) return;
    try {
      localStorage.setItem(key, "1");
    } catch {
      /* negeer */
    }
    setCelebration({ type: myStageRank === 1 ? "win" : "podium", rank: myStageRank });
  }, [stageId, myStageRank, subpouleId, game?.id]);

  // Animatie: bars groeien van 0 → eindwaarde bij mount/refresh.
  const [animate, setAnimate] = useState(false);
  const animKey = `${subpouleId}:${selectedStage?.id ?? "none"}`;
  const prevKey = useRef<string>("");
  useEffect(() => {
    if (prevKey.current === animKey) return;
    prevKey.current = animKey;
    setAnimate(false);
    const t = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(t);
  }, [animKey]);

  const loading = membersLoading || stagesLoading || pointsLoading;

  // ── Skeleton ─────────────────────────────────────────────
  if (loading) {
    return (
      <Card className="retro-border overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary" />
        <CardContent className="p-4 space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-6 rounded bg-secondary/60 animate-pulse" style={{ width: `${90 - i * 15}%` }} />
          ))}
        </CardContent>
      </Card>
    );
  }

  // ── Empty state ──────────────────────────────────────────
  if (!selectedStage) {
    return (
      <Card className="retro-border overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary" />
        <CardContent className="p-5 text-center space-y-2">
          <Flag className="h-7 w-7 text-muted-foreground/50 mx-auto" />
          <p className="font-display font-bold">Nog geen daguitslag</p>
          <p className="text-sm text-muted-foreground">
            De eerste rit moet nog gefiatteerd worden.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <DaguitslagCelebration celebration={celebration} onClose={closeCelebration} />
    <Card className="retro-border overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary" />

      {/* Header */}
      <div className="p-4 border-b-2 border-foreground bg-secondary/50">
        <div className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-muted-foreground">
          — Daguitslag —
        </div>
        <div className="flex items-baseline justify-between gap-3 mt-1">
          <h2 className="font-display text-lg font-bold leading-tight">
            Rit {selectedStage.stage_number}
            {selectedStage.name ? <span className="text-muted-foreground"> — {selectedStage.name}</span> : null}
          </h2>
          <span className="shrink-0 text-[11px] font-mono uppercase tracking-wider text-muted-foreground truncate">
            {subpouleName}
          </span>
        </div>
        {approvedStages.length > 1 && (
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            <button
              type="button"
              onClick={() => setStageIdx((i) => Math.max(0, i - 1))}
              disabled={stageIdx <= 0}
              className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border border-border rounded disabled:opacity-30 hover:bg-secondary"
            >
              ← vorige
            </button>
            <button
              type="button"
              onClick={() => setStageIdx((i) => Math.min(approvedStages.length - 1, i + 1))}
              disabled={stageIdx >= approvedStages.length - 1}
              className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border border-border rounded disabled:opacity-30 hover:bg-secondary"
            >
              volgende →
            </button>
          </div>
        )}
      </div>

      {/* Bars */}
      <CardContent className="p-3 sm:p-4">
        {scorers.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-4">
            Niemand scoorde punten in deze rit.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {scorers.map((r, i) => {
              const rank = i + 1;
              const isWinner = rank === 1;
              const isMe = r.user_id === user?.id;
              const widthPct = maxPts > 0 ? Math.max(6, (r.points / maxPts) * 100) : 0;

              const rankColorCls =
                rank === 1 ? "text-amber-400"
                : rank === 2 ? "text-zinc-400"
                : rank === 3 ? "text-orange-400"
                : "text-muted-foreground/60";

              const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;

              return (
                <li
                  key={r.user_id}
                  className={cn(
                    "flex items-center gap-2 py-1 px-1 rounded transition-colors",
                    isMe && "bg-primary/[0.06]",
                  )}
                >
                  {/* Rank */}
                  <div className={cn(
                    "shrink-0 w-7 text-center font-display font-black tabular-nums text-sm leading-none",
                    rankColorCls,
                  )}>
                    {medal ?? rank}
                  </div>

                  {/* Name */}
                  <div className="shrink-0 w-[7.5rem] sm:w-40 min-w-0 flex items-center gap-1">
                    <span className={cn(
                      "font-sans text-[13px] truncate",
                      isMe ? "font-bold text-primary" : isWinner ? "font-bold" : rank <= 3 ? "font-semibold" : "font-medium",
                    )}>
                      {r.team_name ?? r.display_name}
                    </span>
                    {isMe && (
                      <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/30 rounded px-1 py-px leading-4">
                        jij
                      </span>
                    )}
                  </div>

                  {/* Bar + label */}
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <div className="flex-1 h-5 sm:h-6 bg-secondary/40 border border-border/60 rounded-sm overflow-hidden relative">
                      <div
                        className={cn(
                          "h-full border-r-2 motion-safe:transition-[width] motion-safe:duration-[400ms] motion-safe:ease-out",
                          isWinner
                            ? "bg-primary/80 border-primary"
                            : "bg-[hsl(var(--vintage-paper-dark,30_25%_55%))] border-foreground/40",
                          isMe && !isWinner && "border-l-[3px] border-l-[hsl(var(--vintage-gold))]",
                        )}
                        style={{
                          width: animate ? `${widthPct}%` : "0%",
                          backgroundImage: isWinner
                            ? undefined
                            : "repeating-linear-gradient(45deg, hsl(var(--foreground)/0.06) 0 2px, transparent 2px 6px)",
                        }}
                      >
                        {isWinner && (
                          <Medal className="absolute left-1 top-1/2 -translate-y-1/2 w-3 h-3 text-primary-foreground/90" />
                        )}
                      </div>
                    </div>
                    <span className={cn(
                      "shrink-0 font-display font-bold tabular-nums text-[13px] min-w-[3.25rem] text-right",
                      isWinner ? "text-primary" : "text-foreground",
                    )}>
                      +{r.points} pt
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {zeros.length > 0 && (
          <p className="mt-3 pt-3 border-t border-dashed border-border text-[11px] font-mono text-muted-foreground/70 italic">
            <span className="uppercase tracking-wider not-italic font-bold mr-1">Geen punten:</span>
            {zeros.map((z) => z.team_name ?? z.display_name).join(", ")}
          </p>
        )}
      </CardContent>
    </Card>
    </>
  );
}
