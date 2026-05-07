import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useCategories } from "@/hooks/useCategories";
import { useSubpouleEntries, type PredictionEntry } from "@/hooks/useSubpouleEntries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, ArrowUp, ArrowDown, Minus, Crown, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  opponentUserId: string;
  opponentName: string;
  subpouleId?: string;
};

type EntrySnap = {
  entry_id: string;
  user_id: string;
  total_points: number;
  picks: Map<string, string[]>;
  jokers: Set<string>;
  predictions: PredictionEntry[];
};

const CLASSIFICATION_LABELS: Record<string, string> = {
  gc: "Eindpodium",
  points: "Puntentrui",
  kom: "Bergtrui",
  youth: "Jongerentrui",
};
const CLASSIFICATION_ORDER = ["gc", "points", "kom", "youth"] as const;

function predictionsByClass(list: PredictionEntry[]) {
  const map = new Map<string, PredictionEntry[]>();
  for (const p of list) {
    const arr = map.get(p.classification) ?? [];
    arr.push(p);
    map.set(p.classification, arr);
  }
  for (const arr of map.values()) arr.sort((a, b) => a.position - b.position);
  return map;
}

function useTwoEntries(gameId: string | undefined, userIdA: string | undefined, userIdB: string) {
  return useQuery({
    queryKey: ["compare-entries", gameId, userIdA, userIdB],
    enabled: Boolean(supabase && gameId && userIdA),
    queryFn: async (): Promise<{ a: EntrySnap | null; b: EntrySnap | null; ridersById: Map<string, { name: string; team: string | null }> }> => {
      if (!supabase || !gameId || !userIdA) return { a: null, b: null, ridersById: new Map() };

      const { data: rows } = await supabase
        .from("entries")
        .select("id, user_id, total_points, entry_picks(category_id, rider_id), entry_jokers(rider_id), entry_predictions(classification, position, rider_id)")
        .eq("game_id", gameId)
        .in("user_id", [userIdA, userIdB]);

      const buildSnap = (uid: string): EntrySnap | null => {
        const r = (rows ?? []).find((x) => x.user_id === uid);
        if (!r) return null;
        const picks = new Map<string, string[]>();
        for (const p of (r.entry_picks ?? []) as Array<{ category_id: string; rider_id: string }>) {
          const existing = picks.get(p.category_id) ?? [];
          picks.set(p.category_id, [...existing, p.rider_id]);
        }
        const jokers = new Set<string>(((r.entry_jokers ?? []) as Array<{ rider_id: string }>).map((j) => j.rider_id));
        const predictions = ((r.entry_predictions ?? []) as PredictionEntry[]);
        return { entry_id: r.id, user_id: r.user_id, total_points: r.total_points ?? 0, picks, jokers, predictions };
      };

      const a = buildSnap(userIdA);
      const b = buildSnap(userIdB);

      const ids = new Set<string>();
      for (const snap of [a, b]) {
        if (!snap) continue;
        for (const pickIds of snap.picks.values()) for (const id of pickIds) ids.add(id);
        for (const id of snap.jokers) ids.add(id);
        for (const p of snap.predictions) ids.add(p.rider_id);
      }
      let ridersById = new Map<string, { name: string; team: string | null }>();
      if (ids.size > 0) {
        const { data: rs } = await supabase
          .from("riders")
          .select("id, name, team, teams(name)")
          .in("id", Array.from(ids));
        ridersById = new Map(
          ((rs ?? []) as Array<{ id: string; name: string; team: string | null; teams: { name: string } | null }>).map(
            (r) => [r.id, { name: r.name, team: r.teams?.name ?? r.team ?? null }]
          )
        );
      }

      return { a, b, ridersById };
    },
  });
}

function useEntryRiderPoints(entryId: string | undefined) {
  return useQuery({
    queryKey: ["entry-rider-points", entryId],
    enabled: Boolean(supabase && entryId),
    queryFn: async (): Promise<Map<string, number>> => {
      if (!supabase || !entryId) return new Map();
      const { data: picks } = await supabase
        .from("entry_picks")
        .select("rider_id, entries!inner(game_id)")
        .eq("entry_id", entryId);
      const { data: jokers } = await supabase
        .from("entry_jokers")
        .select("rider_id")
        .eq("entry_id", entryId);
      type PickRow = { rider_id: string; entries: { game_id: string } };
      const rows = (picks ?? []) as unknown as PickRow[];
      if (rows.length === 0) return new Map();
      const gameId = rows[0].entries.game_id;
      const riderIds = Array.from(new Set([...rows.map((r) => r.rider_id), ...((jokers ?? []) as Array<{ rider_id: string }>).map((j) => j.rider_id)]));
      const jokerSet = new Set(((jokers ?? []) as Array<{ rider_id: string }>).map((j) => j.rider_id));

      const { data: stages } = await supabase.from("stages").select("id").eq("game_id", gameId);
      const stageIds = (stages ?? []).map((s) => s.id);
      if (stageIds.length === 0) return new Map();

      const { data: results } = await supabase
        .from("stage_results")
        .select("rider_id, finish_position, gc_position, mountain_position, points_position, youth_position")
        .in("rider_id", riderIds)
        .in("stage_id", stageIds);

      const { data: schema } = await supabase.from("points_schema").select("classification, position, points").eq("game_id", gameId);
      const schemaMap = new Map<string, number>();
      for (const s of (schema ?? []) as Array<{ classification: string; position: number; points: number }>) {
        schemaMap.set(`${s.classification}:${s.position}`, s.points);
      }
      const lookup = (cls: string, pos: number | null) => (pos ? schemaMap.get(`${cls}:${pos}`) ?? 0 : 0);

      const totals = new Map<string, number>();
      for (const r of (results ?? []) as Array<{
        rider_id: string;
        finish_position: number | null;
        gc_position: number | null;
        mountain_position: number | null;
        points_position: number | null;
        youth_position: number | null;
      }>) {
        const base =
          lookup("stage", r.finish_position) +
          lookup("gc", r.gc_position) +
          lookup("kom", r.mountain_position) +
          lookup("points", r.points_position) +
          lookup("youth", r.youth_position);
        const mult = jokerSet.has(r.rider_id) ? 2 : 1;
        totals.set(r.rider_id, (totals.get(r.rider_id) ?? 0) + base * mult);
      }
      return totals;
    },
  });
}

export default function TeamComparison({ opponentUserId, opponentName, subpouleId }: Props) {
  const { user } = useAuth();
  const { data: game } = useCurrentGame();
  const { data: categories = [] } = useCategories(game?.id);

  const { data: directData, isLoading: directLoading } = useTwoEntries(game?.id, subpouleId ? undefined : user?.id, opponentUserId);
  const { data: subpouleData, isLoading: subpouleLoading } = useSubpouleEntries(subpouleId, game?.id);

  const subpouleCompareData = useMemo(() => {
    if (!subpouleData || !user?.id) return null;
    const toSnap = (uid: string): EntrySnap | null => {
      const row = subpouleData.entries.find((entry) => entry.user_id === uid);
      if (!row?.entry_id) return null;
      return {
        entry_id: row.entry_id,
        user_id: row.user_id,
        total_points: row.total_points,
        picks: row.picks,
        jokers: row.jokers,
        predictions: row.predictions,
      };
    };
    return { a: toSnap(user.id), b: toSnap(opponentUserId), ridersById: subpouleData.ridersById };
  }, [subpouleData, user?.id, opponentUserId]);

  const data = subpouleId ? subpouleCompareData : directData;
  const isLoading = subpouleId ? subpouleLoading : directLoading;
  const { data: myPts } = useEntryRiderPoints(data?.a?.entry_id);
  const { data: oppPts } = useEntryRiderPoints(data?.b?.entry_id);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [categories]
  );

  if (isLoading) {
    return (
      <Card className="retro-border">
        <CardContent className="p-4 text-sm text-muted-foreground">Vergelijking laden…</CardContent>
      </Card>
    );
  }

  if (!data?.a || !data?.b) {
    return (
      <Card className="retro-border">
        <CardContent className="p-4 text-sm text-muted-foreground">
          {!data?.a ? "Jij hebt nog geen team in deze koers." : `${opponentName} heeft nog geen team ingediend.`}
        </CardContent>
      </Card>
    );
  }

  const me = data.a;
  const opp = data.b;
  const ridersById = data.ridersById;

  const myTotal = me.total_points;
  const oppTotal = opp.total_points;
  const diff = myTotal - oppTotal;

  const myJokerIds = Array.from(me.jokers);
  const oppJokerIds = Array.from(opp.jokers);
  const myJokerPoints = myJokerIds.reduce((sum, id) => sum + (myPts?.get(id) ?? 0), 0);
  const oppJokerPoints = oppJokerIds.reduce((sum, id) => sum + (oppPts?.get(id) ?? 0), 0);

  const myPredMap = predictionsByClass(me.predictions);
  const oppPredMap = predictionsByClass(opp.predictions);
  const hasPredictions = me.predictions.length > 0 || opp.predictions.length > 0;

  return (
    <Card className="retro-border">
      <CardHeader className="border-b-2 border-foreground bg-secondary/30 py-3">
        <CardTitle className="font-display text-base flex items-center justify-between gap-2">
          <span>Head-to-head</span>
          <Badge variant={diff >= 0 ? "default" : "destructive"} className="font-mono">
            {diff >= 0 ? "+" : ""}{diff} pt
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 px-3 py-3 border-b-2 border-foreground bg-muted/30">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Jij</p>
            <p className="font-display font-bold text-lg tabular-nums">{myTotal} pt</p>
          </div>
          <div className="text-center text-xs text-muted-foreground self-center">vs</div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{opponentName}</p>
            <p className="font-display font-bold text-lg tabular-nums">{oppTotal} pt</p>
          </div>
        </div>

        {/* Category rows */}
        <div className="divide-y divide-border">
          {sortedCategories.map((cat) => {
            const myRiderIds = me.picks.get(cat.id) ?? [];
            const oppRiderIds = opp.picks.get(cat.id) ?? [];
            const shared = myRiderIds.filter((id) => oppRiderIds.includes(id));
            const same = shared.length > 0;
            const myPoints = myRiderIds.reduce((sum, id) => sum + (myPts?.get(id) ?? 0), 0);
            const oppPoints = oppRiderIds.reduce((sum, id) => sum + (oppPts?.get(id) ?? 0), 0);
            const localDiff = myPoints - oppPoints;

            return (
              <div key={cat.id} className="px-3 py-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                    {cat.short_name || cat.name}
                  </span>
                  {same && (
                    <Badge variant="outline" className="text-[10px] gap-1 h-4 px-1.5">
                      <Star className="h-2.5 w-2.5" /> zelfde keuze
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                  <div className={cn("text-right", same && "text-primary")}>
                    {myRiderIds.length === 0 ? (
                      <p className="text-sm font-medium text-muted-foreground">—</p>
                    ) : myRiderIds.map((id) => {
                      const rider = ridersById.get(id);
                      return (
                        <p key={id} className="text-sm font-medium truncate flex items-center justify-end gap-1 text-slate-800">
                          {me.jokers.has(id) && <Crown className="h-3 w-3 text-primary shrink-0" />}
                          <span className="truncate">{rider?.name ?? "—"}</span>
                        </p>
                      );
                    })}
                    <p className="text-xs font-display font-bold tabular-nums">{myPoints} pt</p>
                  </div>

                  <div className="text-xs flex flex-col items-center justify-center min-w-[36px]">
                    {localDiff > 0 ? (
                      <ArrowUp className="h-3 w-3 text-primary" />
                    ) : localDiff < 0 ? (
                      <ArrowDown className="h-3 w-3 text-destructive" />
                    ) : (
                      <Minus className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span
                      className={cn(
                        "text-[10px] font-mono font-bold",
                        localDiff > 0 && "text-primary",
                        localDiff < 0 && "text-destructive",
                        localDiff === 0 && "text-muted-foreground"
                      )}
                    >
                      {localDiff > 0 ? "+" : ""}{localDiff}
                    </span>
                  </div>

                  <div className={cn(same && "text-primary")}>
                    {oppRiderIds.length === 0 ? (
                      <p className="text-sm font-medium text-muted-foreground">—</p>
                    ) : oppRiderIds.map((id) => {
                      const rider = ridersById.get(id);
                      return (
                        <p key={id} className="text-sm font-medium truncate flex items-center gap-1 text-slate-800">
                          {opp.jokers.has(id) && <Crown className="h-3 w-3 text-primary shrink-0" />}
                          <span className="truncate">{rider?.name ?? "—"}</span>
                        </p>
                      );
                    })}
                    <p className="text-xs font-display font-bold tabular-nums">{oppPoints} pt</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Jokers section */}
        <div className="border-t-2 border-foreground bg-muted/10">
          <div className="px-3 py-2 flex items-center gap-2 border-b border-border">
            <Crown className="h-4 w-4 text-primary" />
            <span className="font-display text-sm font-bold">Jokers (×2 punten)</span>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 px-3 py-2.5 items-center">
            <div className="text-right space-y-0.5">
              {myJokerIds.length === 0 ? (
                <p className="text-sm text-muted-foreground">—</p>
              ) : (
                myJokerIds.map((id) => {
                  const shared = opp.jokers.has(id);
                  return (
                    <p key={id} className={cn("text-sm font-medium truncate text-slate-800", shared && "text-primary")}>
                      {ridersById.get(id)?.name ?? "—"}
                    </p>
                  );
                })
              )}
              <p className="text-xs font-display font-bold tabular-nums">{myJokerPoints} pt</p>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground min-w-[36px] text-center">Joker</span>
            <div className="space-y-0.5">
              {oppJokerIds.length === 0 ? (
                <p className="text-sm text-muted-foreground">—</p>
              ) : (
                oppJokerIds.map((id) => {
                  const shared = me.jokers.has(id);
                  return (
                    <p key={id} className={cn("text-sm font-medium truncate text-slate-800", shared && "text-primary")}>
                      {ridersById.get(id)?.name ?? "—"}
                    </p>
                  );
                })
              )}
              <p className="text-xs font-display font-bold tabular-nums">{oppJokerPoints} pt</p>
            </div>
          </div>
        </div>

        {/* Predictions section: GC podium + jersey winners */}
        {hasPredictions && (
          <div className="border-t-2 border-foreground bg-muted/10">
            <div className="px-3 py-2 flex items-center gap-2 border-b border-border">
              <Trophy className="h-4 w-4 text-primary" />
              <span className="font-display text-sm font-bold">Truien & eindklassementen</span>
            </div>
            <div className="divide-y divide-border">
              {CLASSIFICATION_ORDER.map((cls) => {
                const myList = myPredMap.get(cls) ?? [];
                const oppList = oppPredMap.get(cls) ?? [];
                if (myList.length === 0 && oppList.length === 0) return null;
                return (
                  <div key={cls} className="grid grid-cols-[1fr_auto_1fr] gap-2 px-3 py-2 text-sm items-center">
                    <div className="text-right space-y-0.5">
                      {myList.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        myList.map((p) => {
                          const shared = oppList.some((o) => o.position === p.position && o.rider_id === p.rider_id);
                          return (
                            <div key={`${cls}-me-${p.position}`} className={cn("truncate text-slate-800", shared && "text-primary font-medium")}>
                              {cls === "gc" ? `${p.position}. ` : ""}{ridersById.get(p.rider_id)?.name ?? "—"}
                            </div>
                          );
                        })
                      )}
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground min-w-[80px] text-center">
                      {CLASSIFICATION_LABELS[cls]}
                    </span>
                    <div className="space-y-0.5">
                      {oppList.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        oppList.map((p) => {
                          const shared = myList.some((m2) => m2.position === p.position && m2.rider_id === p.rider_id);
                          return (
                            <div key={`${cls}-opp-${p.position}`} className={cn("truncate text-slate-800", shared && "text-primary font-medium")}>
                              {cls === "gc" ? `${p.position}. ` : ""}{ridersById.get(p.rider_id)?.name ?? "—"}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="px-3 py-2 text-[10px] text-muted-foreground text-center bg-muted/20 border-t border-border">
          <Crown className="h-2.5 w-2.5 inline mr-1" /> = joker (×2 punten)
        </div>
      </CardContent>
    </Card>
  );
}
