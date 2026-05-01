import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useCategories } from "@/hooks/useCategories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, ArrowUp, ArrowDown, Minus, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  opponentUserId: string;
  opponentName: string;
};

type EntrySnap = {
  entry_id: string;
  user_id: string;
  total_points: number;
  picks: Map<string, string>; // category_id → rider_id
  jokers: Set<string>;
};

function useTwoEntries(gameId: string | undefined, userIdA: string | undefined, userIdB: string) {
  return useQuery({
    queryKey: ["compare-entries", gameId, userIdA, userIdB],
    enabled: Boolean(supabase && gameId && userIdA),
    queryFn: async (): Promise<{ a: EntrySnap | null; b: EntrySnap | null; ridersById: Map<string, { name: string; team: string | null }> }> => {
      if (!supabase || !gameId || !userIdA) return { a: null, b: null, ridersById: new Map() };

      const { data: rows } = await supabase
        .from("entries")
        .select("id, user_id, total_points, entry_picks(category_id, rider_id), entry_jokers(rider_id)")
        .eq("game_id", gameId)
        .in("user_id", [userIdA, userIdB]);

      const buildSnap = (uid: string): EntrySnap | null => {
        const r = (rows ?? []).find((x) => x.user_id === uid);
        if (!r) return null;
        const picks = new Map<string, string>();
        for (const p of (r.entry_picks ?? []) as Array<{ category_id: string; rider_id: string }>) {
          picks.set(p.category_id, p.rider_id);
        }
        const jokers = new Set<string>(((r.entry_jokers ?? []) as Array<{ rider_id: string }>).map((j) => j.rider_id));
        return { entry_id: r.id, user_id: r.user_id, total_points: r.total_points ?? 0, picks, jokers };
      };

      const a = buildSnap(userIdA);
      const b = buildSnap(userIdB);

      // collect all rider ids
      const ids = new Set<string>();
      for (const snap of [a, b]) {
        if (!snap) continue;
        for (const id of snap.picks.values()) ids.add(id);
        for (const id of snap.jokers) ids.add(id);
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
  // Aggregate stage points per rider for an entry isn't stored directly; we compute via stage_results × picks
  // Simpler: use stage_points (entry-level) is not per-rider. Per-rider points only via stage_results join.
  // For comparison we use entry totals + per-pick rider totals via stage_results join.
  return useQuery({
    queryKey: ["entry-rider-points", entryId],
    enabled: Boolean(supabase && entryId),
    queryFn: async (): Promise<Map<string, number>> => {
      if (!supabase || !entryId) return new Map();
      // Get picks for entry
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

      // Get stage results for those riders in this game's stages
      const { data: stages } = await supabase.from("stages").select("id").eq("game_id", gameId);
      const stageIds = (stages ?? []).map((s) => s.id);
      if (stageIds.length === 0) return new Map();

      const { data: results } = await supabase
        .from("stage_results")
        .select("rider_id, finish_position, gc_position, mountain_position, points_position, youth_position")
        .in("rider_id", riderIds)
        .in("stage_id", stageIds);

      // Get points schema
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

export default function TeamComparison({ opponentUserId, opponentName }: Props) {
  const { user } = useAuth();
  const { data: game } = useCurrentGame();
  const { data: categories = [] } = useCategories(game?.id);

  const { data, isLoading } = useTwoEntries(game?.id, user?.id, opponentUserId);
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
            const myRiderId = me.picks.get(cat.id);
            const oppRiderId = opp.picks.get(cat.id);
            const same = myRiderId && oppRiderId && myRiderId === oppRiderId;
            const myRider = myRiderId ? ridersById.get(myRiderId) : null;
            const oppRider = oppRiderId ? ridersById.get(oppRiderId) : null;
            const myPoints = myRiderId ? myPts?.get(myRiderId) ?? 0 : 0;
            const oppPoints = oppRiderId ? oppPts?.get(oppRiderId) ?? 0 : 0;
            const isMyJoker = myRiderId ? me.jokers.has(myRiderId) : false;
            const isOppJoker = oppRiderId ? opp.jokers.has(oppRiderId) : false;
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
                  {/* My pick */}
                  <div className={cn("text-right", same && "text-primary")}>
                    <p className="text-sm font-medium truncate flex items-center justify-end gap-1">
                      {isMyJoker && <Crown className="h-3 w-3 text-primary shrink-0" />}
                      <span className="truncate">{myRider?.name ?? "—"}</span>
                    </p>
                    {myRider?.team && (
                      <p className="text-[10px] text-muted-foreground truncate">{myRider.team}</p>
                    )}
                    <p className="text-xs font-display font-bold tabular-nums">{myPoints} pt</p>
                  </div>

                  {/* Diff indicator */}
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

                  {/* Opponent pick */}
                  <div className={cn(same && "text-primary")}>
                    <p className="text-sm font-medium truncate flex items-center gap-1">
                      {isOppJoker && <Crown className="h-3 w-3 text-primary shrink-0" />}
                      <span className="truncate">{oppRider?.name ?? "—"}</span>
                    </p>
                    {oppRider?.team && (
                      <p className="text-[10px] text-muted-foreground truncate">{oppRider.team}</p>
                    )}
                    <p className="text-xs font-display font-bold tabular-nums">{oppPoints} pt</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-3 py-2 text-[10px] text-muted-foreground text-center bg-muted/20 border-t border-border">
          <Crown className="h-2.5 w-2.5 inline mr-1" /> = joker (×2 punten)
        </div>
      </CardContent>
    </Card>
  );
}
