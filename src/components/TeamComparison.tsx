import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useCategories } from "@/hooks/useCategories";
import {
  useSubpouleEntries,
  useGameEntries,
  type PredictionEntry,
  type SubpouleEntry,
} from "@/hooks/useSubpouleEntries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, ArrowUp, ArrowDown, Crown, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchAllRows } from "@/lib/fetchAll";

// ── Gedeelde stijl voor "zelfde keuze"-rijen in álle head-to-head/benchmark-
//    weergaven (TeamComparison is de enige vergelijkingscomponent; CompareSetup
//    en SubpouleStandings gebruiken 'm beide). Zachte retro-gold rij + donkere
//    leesbare tekst; het label blijft als licht doorschijnend pilletje. ──────────
const SAME_ROW_CLASS = "bg-[hsl(var(--vintage-gold)/0.18)]";
const SAME_TEXT = "text-[#4a3c0e]"; // donker goud-bruin, leesbaar op de gele rij
const SAME_BADGE_CLASS =
  "bg-white/70 text-[#4a3c0e] border-[hsl(var(--vintage-gold)/0.55)]";

type Props = {
  opponentUserId: string;
  opponentName: string;
  subpouleId?: string;
  /** Game van de subpoule (bv. afgeronde Giro). Valt terug op de live game. */
  gameId?: string;
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

/**
 * Basispunten per renner (zonder joker-multiplier), berekend uit de PUBLIEKE
 * stage_results + points_schema. Joker × 2 wordt per speler toegepast, zodat
 * dit ook voor de tegenstander klopt (entry_picks zelf is RLS-afgeschermd).
 */
export function useRiderBasePoints(gameId: string | undefined) {
  return useQuery({
    queryKey: ["rider-base-points", gameId],
    enabled: Boolean(supabase && gameId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Map<string, number>> => {
      if (!supabase || !gameId) return new Map();
      const { data: stages } = await supabase.from("stages").select("id").eq("game_id", gameId);
      const stageIds = (stages ?? []).map((s) => s.id);
      if (stageIds.length === 0) return new Map();

      // Gepagineerd: één grote range kapt alsnog op de Max rows-serverlimiet.
      const results = await fetchAllRows<{
        rider_id: string;
        finish_position: number | null;
        gc_position: number | null;
        mountain_position: number | null;
        points_position: number | null;
        youth_position: number | null;
      }>((from, to) =>
        supabase!
          .from("stage_results")
          .select("rider_id, finish_position, gc_position, mountain_position, points_position, youth_position")
          .in("stage_id", stageIds)
          .order("rider_id")
          .range(from, to),
      );

      const { data: schema } = await supabase
        .from("points_schema")
        .select("classification, position, points")
        .eq("game_id", gameId);
      const schemaMap = new Map<string, number>();
      for (const s of (schema ?? []) as Array<{ classification: string; position: number; points: number }>) {
        schemaMap.set(`${s.classification}:${s.position}`, s.points);
      }
      const lookup = (cls: string, pos: number | null) => (pos ? schemaMap.get(`${cls}:${pos}`) ?? 0 : 0);

      const totals = new Map<string, number>();
      for (const r of results) {
        const base =
          lookup("stage", r.finish_position) +
          lookup("gc", r.gc_position) +
          lookup("kom", r.mountain_position) +
          lookup("points", r.points_position) +
          lookup("youth", r.youth_position);
        totals.set(r.rider_id, (totals.get(r.rider_id) ?? 0) + base);
      }
      return totals;
    },
  });
}

export default function TeamComparison({ opponentUserId, opponentName, subpouleId, gameId }: Props) {
  const { user } = useAuth();
  const { data: curGame } = useCurrentGame();
  const game = gameId ? { id: gameId } : curGame;
  const { data: categories = [] } = useCategories(game?.id);

  // Detaildata via SECURITY DEFINER RPC's (cross-user leesbaar):
  // subpoule-scope of game-breed.
  const { data: subpouleData, isLoading: subpouleLoading } = useSubpouleEntries(subpouleId, game?.id);
  const { data: gameData, isLoading: gameLoading } = useGameEntries(subpouleId ? undefined : game?.id);
  const detail = subpouleId ? subpouleData : gameData;
  const isLoading = subpouleId ? subpouleLoading : gameLoading;

  const { data: basePts } = useRiderBasePoints(game?.id);

  const me = useMemo<SubpouleEntry | null>(
    () => detail?.entries.find((e) => e.user_id === user?.id) ?? null,
    [detail, user?.id]
  );
  const opp = useMemo<SubpouleEntry | null>(
    () => detail?.entries.find((e) => e.user_id === opponentUserId) ?? null,
    [detail, opponentUserId]
  );

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

  if (!me?.entry_id || !opp?.entry_id) {
    return (
      <Card className="retro-border">
        <CardContent className="p-4 text-sm text-muted-foreground">
          {!me?.entry_id ? "Jij hebt nog geen team in deze koers." : `${opponentName} heeft nog geen team ingediend.`}
        </CardContent>
      </Card>
    );
  }

  const ridersById = detail!.ridersById;
  const pointFor = (id: string, jokers: Set<string>) => (basePts?.get(id) ?? 0) * (jokers.has(id) ? 2 : 1);

  const myTotal = me.total_points;
  const oppTotal = opp.total_points;
  const diff = myTotal - oppTotal;

  const myJokerIds = Array.from(me.jokers);
  const oppJokerIds = Array.from(opp.jokers);
  const myJokerPoints = myJokerIds.reduce((sum, id) => sum + pointFor(id, me.jokers), 0);
  const oppJokerPoints = oppJokerIds.reduce((sum, id) => sum + pointFor(id, opp.jokers), 0);

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
        {/* Scorebord-kop met balansbalk */}
        <div className="px-3 py-3 border-b-2 border-foreground bg-muted/30">
          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Jij</p>
              <p className="text-2xl font-display font-bold tabular-nums">{myTotal} <span className="text-[10px] font-normal text-muted-foreground">pt</span></p>
            </div>
            <div className="h-8 w-8 rounded-full border-2 border-foreground bg-card flex items-center justify-center text-[10px] font-bold">VS</div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{opponentName}</p>
              <p className="text-2xl font-display font-bold tabular-nums">{oppTotal} <span className="text-[10px] font-normal text-muted-foreground">pt</span></p>
            </div>
          </div>
          {(() => {
            const sum = myTotal + oppTotal;
            const myShare = sum > 0 ? (myTotal / sum) * 100 : 50;
            return (
              <>
                <div className="relative mt-2.5 h-2.5 rounded-full overflow-hidden border border-foreground/30 flex">
                  <div style={{ width: `${myShare}%` }} className="bg-primary" />
                  <div style={{ width: `${100 - myShare}%` }} className="bg-foreground/20" />
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-card" />
                </div>
                <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted-foreground">
                  <span>{myShare.toFixed(1)}%</span><span>{(100 - myShare).toFixed(1)}%</span>
                </div>
              </>
            );
          })()}
        </div>

        {/* Category rows */}
        <div className="divide-y divide-border">
          {sortedCategories.map((cat) => {
            const myRiderIds = me.picks.get(cat.id) ?? [];
            const oppRiderIds = opp.picks.get(cat.id) ?? [];
            // "Zelfde keuze" (goud) alleen bij VOLLEDIG gelijke set — een
            // gedeeltelijke overlap moet groen/rood kleuren, niet goud.
            const same =
              myRiderIds.length > 0 &&
              myRiderIds.length === oppRiderIds.length &&
              myRiderIds.every((id) => oppRiderIds.includes(id));
            const myPoints = myRiderIds.reduce((sum, id) => sum + pointFor(id, me.jokers), 0);
            const oppPoints = oppRiderIds.reduce((sum, id) => sum + pointFor(id, opp.jokers), 0);
            const localDiff = myPoints - oppPoints;

            return (
              <div key={cat.id} className={cn("px-3 py-2.5", same && SAME_ROW_CLASS)}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={cn("text-[11px] uppercase tracking-wider font-medium", same ? SAME_TEXT : "text-muted-foreground")}>
                    {cat.short_name || cat.name}
                  </span>
                  {same && (
                    <Badge variant="outline" className={cn("text-[10px] gap-1 h-4 px-1.5", SAME_BADGE_CLASS)}>
                      <Star className="h-2.5 w-2.5" /> zelfde keuze
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                  <div className="text-right">
                    {myRiderIds.length === 0 ? (
                      <p className="text-sm font-medium text-muted-foreground">—</p>
                    ) : myRiderIds.map((id) => {
                      const rider = ridersById.get(id);
                      return (
                        <p key={id} className="text-sm font-medium truncate flex items-center justify-end gap-1 text-foreground">
                          {me.jokers.has(id) && <Crown className="h-3 w-3 text-primary shrink-0" />}
                          <span className="truncate">{rider?.name ?? "—"}</span>
                        </p>
                      );
                    })}
                    <p className="text-base font-display font-bold tabular-nums">{myPoints} <span className="text-[10px] font-normal text-muted-foreground">pt</span></p>
                  </div>

                  <span
                    className={cn(
                      "inline-flex items-center justify-center gap-0.5 rounded-full border-[1.5px]",
                      "px-2.5 py-0.5 text-[13px] font-mono font-bold tabular-nums min-w-[52px] shrink-0 self-center",
                      same
                        ? "border-[hsl(var(--vintage-gold))] bg-[hsl(var(--vintage-gold))/0.18] " + SAME_TEXT
                        : localDiff > 0
                          ? "border-emerald-600 bg-emerald-500/25 text-emerald-800 dark:text-emerald-300"
                          : localDiff < 0
                            ? "border-red-600 bg-red-500/25 text-red-800 dark:text-red-300"
                            : "border-border bg-secondary/60 text-muted-foreground"
                    )}
                  >
                    {localDiff > 0 && <ArrowUp className="h-3 w-3" />}
                    {localDiff < 0 && <ArrowDown className="h-3 w-3" />}
                    {localDiff > 0 ? "+" : ""}{localDiff}
                  </span>

                  <div>
                    {oppRiderIds.length === 0 ? (
                      <p className="text-sm font-medium text-muted-foreground">—</p>
                    ) : oppRiderIds.map((id) => {
                      const rider = ridersById.get(id);
                      return (
                        <p key={id} className="text-sm font-medium truncate flex items-center gap-1 text-foreground">
                          {opp.jokers.has(id) && <Crown className="h-3 w-3 text-primary shrink-0" />}
                          <span className="truncate">{rider?.name ?? "—"}</span>
                        </p>
                      );
                    })}
                    <p className="text-base font-display font-bold tabular-nums">{oppPoints} <span className="text-[10px] font-normal text-muted-foreground">pt</span></p>
                  </div>
                </div>
                {/* Divergerende balk: links jij, rechts tegenstander (winnaar in kleur) */}
                {(() => {
                  const maxPts = Math.max(myPoints, oppPoints, 1);
                  return (
                    <div className="mt-1.5 grid grid-cols-2 gap-0.5">
                      <div className="flex justify-end">
                        <div
                          className={cn("h-1.5 rounded-l-full", same ? "bg-[hsl(var(--vintage-gold))]" : myPoints > oppPoints ? "bg-emerald-600" : myPoints < oppPoints ? "bg-foreground/20" : "bg-secondary")}
                          style={{ width: `${(myPoints / maxPts) * 100}%` }}
                        />
                      </div>
                      <div>
                        <div
                          className={cn("h-1.5 rounded-r-full", same ? "bg-[hsl(var(--vintage-gold))]" : oppPoints > myPoints ? "bg-emerald-600" : oppPoints < myPoints ? "bg-foreground/20" : "bg-secondary")}
                          style={{ width: `${(oppPoints / maxPts) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>

        {/* Jokers section */}
        <div className="border-t-2 border-foreground bg-muted/10">
          <div className="px-3 py-2 flex items-center gap-2 border-b border-border">
            <Crown className="h-4 w-4 text-primary" />
            <span className="font-display text-sm font-bold">Jokers</span>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 px-3 py-2.5 items-center">
            <div className="text-right space-y-0.5">
              {myJokerIds.length === 0 ? (
                <p className="text-sm text-muted-foreground">—</p>
              ) : (
                myJokerIds.map((id) => {
                  const shared = opp.jokers.has(id);
                  return (
                    <p key={id} className={cn("text-sm font-medium truncate text-foreground", shared && "text-primary")}>
                      {ridersById.get(id)?.name ?? "—"}
                    </p>
                  );
                })
              )}
              <p className="text-base font-display font-bold tabular-nums">{myJokerPoints} <span className="text-[10px] font-normal text-muted-foreground">pt</span></p>
            </div>
            {(() => {
              const jDiff = myJokerPoints - oppJokerPoints;
              // Zelfde jokers (goud) alleen bij volledig gelijke set.
              const jokerSame =
                myJokerIds.length > 0 &&
                myJokerIds.length === oppJokerIds.length &&
                myJokerIds.every((id) => opp.jokers.has(id));
              return (
                <span
                  className={cn(
                    "inline-flex items-center justify-center gap-0.5 rounded-full border-[1.5px]",
                    "px-2.5 py-0.5 text-[13px] font-mono font-bold tabular-nums min-w-[52px] shrink-0 self-center",
                    jokerSame
                      ? "border-[hsl(var(--vintage-gold))] bg-[hsl(var(--vintage-gold))/0.18] " + SAME_TEXT
                      : jDiff > 0
                        ? "border-emerald-600 bg-emerald-500/25 text-emerald-800 dark:text-emerald-300"
                        : jDiff < 0
                          ? "border-red-600 bg-red-500/25 text-red-800 dark:text-red-300"
                          : "border-border bg-secondary/60 text-muted-foreground"
                  )}
                >
                  {jDiff > 0 && <ArrowUp className="h-3 w-3" />}
                  {jDiff < 0 && <ArrowDown className="h-3 w-3" />}
                  {jDiff > 0 ? "+" : ""}{jDiff}
                </span>
              );
            })()}
            <div className="space-y-0.5">
              {oppJokerIds.length === 0 ? (
                <p className="text-sm text-muted-foreground">—</p>
              ) : (
                oppJokerIds.map((id) => {
                  const shared = me.jokers.has(id);
                  return (
                    <p key={id} className={cn("text-sm font-medium truncate text-foreground", shared && "text-primary")}>
                      {ridersById.get(id)?.name ?? "—"}
                    </p>
                  );
                })
              )}
              <p className="text-base font-display font-bold tabular-nums">{oppJokerPoints} <span className="text-[10px] font-normal text-muted-foreground">pt</span></p>
            </div>
          </div>
          {/* Divergerende balk voor de jokerpunten */}
          {(() => {
            const maxPts = Math.max(myJokerPoints, oppJokerPoints, 1);
            return (
              <div className="px-3 pb-2.5 -mt-1 grid grid-cols-2 gap-0.5">
                <div className="flex justify-end">
                  <div
                    className={cn("h-1.5 rounded-l-full", myJokerPoints >= oppJokerPoints ? "bg-primary" : "bg-foreground/20")}
                    style={{ width: `${(myJokerPoints / maxPts) * 100}%` }}
                  />
                </div>
                <div>
                  <div
                    className={cn("h-1.5 rounded-r-full", oppJokerPoints >= myJokerPoints ? "bg-primary" : "bg-foreground/20")}
                    style={{ width: `${(oppJokerPoints / maxPts) * 100}%` }}
                  />
                </div>
              </div>
            );
          })()}
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
                            <div key={`${cls}-me-${p.position}`} className={cn("truncate text-foreground", shared && "text-primary font-medium")}>
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
                            <div key={`${cls}-opp-${p.position}`} className={cn("truncate text-foreground", shared && "text-primary font-medium")}>
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
      </CardContent>
    </Card>
  );
}
