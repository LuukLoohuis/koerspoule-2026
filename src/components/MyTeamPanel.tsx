import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useEntry } from "@/hooks/useEntry";
import { useCategories } from "@/hooks/useCategories";
import { useStages, useEntries } from "@/hooks/useResults";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Trophy, Sparkles, Users, Target, Pencil } from "lucide-react";

type StagePoint = { stage_id: string; entry_id: string; points: number };

function useMyStagePoints(entryId?: string) {
  return useQuery({
    queryKey: ["my-stage-points", entryId],
    enabled: Boolean(supabase && entryId),
    queryFn: async (): Promise<StagePoint[]> => {
      if (!supabase || !entryId) return [];
      const { data, error } = await supabase
        .from("stage_points")
        .select("stage_id, entry_id, points")
        .eq("entry_id", entryId);
      if (error) throw error;
      return (data ?? []) as StagePoint[];
    },
  });
}

function useRiders(ids: string[]) {
  const sorted = useMemo(() => [...new Set(ids)].sort(), [ids]);
  return useQuery({
    queryKey: ["riders-by-ids", sorted],
    enabled: Boolean(supabase && sorted.length > 0),
    queryFn: async () => {
      if (!supabase || sorted.length === 0) return [];
      const { data, error } = await supabase
        .from("riders")
        .select("id, name, team, country_code, start_number")
        .in("id", sorted);
      if (error) throw error;
      return data ?? [];
    },
  });
}

const STAGE_TYPE_ICON: Record<string, string> = {
  vlak: "🏁",
  heuvelachtig: "⛰️",
  bergachtig: "🏔️",
  tijdrit: "⏱️",
  ploegentijdrit: "⏱️👥",
};

export default function MyTeamPanel() {
  const { user } = useAuth();
  const { data: game } = useCurrentGame();
  const { entry, picksByCategory, jokerIds, predictions, isLoading } = useEntry(game?.id);
  const { data: categories = [] } = useCategories(game?.id);
  const { data: stages = [] } = useStages(game?.id);
  const { data: entries = [] } = useEntries(game?.id);
  const { data: stagePoints = [] } = useMyStagePoints(entry?.id);

  const allRiderIds = useMemo(() => {
    const set = new Set<string>();
    for (const id of picksByCategory.values()) set.add(id);
    for (const id of jokerIds) set.add(id);
    for (const p of predictions) set.add(p.rider_id);
    return Array.from(set);
  }, [picksByCategory, jokerIds, predictions]);
  const { data: riders = [] } = useRiders(allRiderIds);
  const ridersById = useMemo(() => Object.fromEntries(riders.map((r) => [r.id, r])), [riders]);

  const totalPoints = stagePoints.reduce((sum, sp) => sum + sp.points, 0);

  // Pool ranking: where am I in the global standings?
  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => (b.total_points ?? 0) - (a.total_points ?? 0)),
    [entries]
  );
  const myRank = entry ? sortedEntries.findIndex((e) => e.id === entry.id) + 1 : 0;

  const stagePointsByStageId = useMemo(
    () => Object.fromEntries(stagePoints.map((sp) => [sp.stage_id, sp.points])),
    [stagePoints]
  );

  if (!user) {
    return <div className="retro-border bg-card p-6 text-muted-foreground">Log in om je team te bekijken.</div>;
  }
  if (isLoading) {
    return <div className="retro-border bg-card p-6">Team laden…</div>;
  }
  if (!game) {
    return <div className="retro-border bg-card p-6 text-muted-foreground">Geen actieve koers gevonden.</div>;
  }
  if (!entry || picksByCategory.size === 0) {
    return (
      <Card className="retro-border">
        <CardContent className="p-6 text-center space-y-3">
          <p className="font-display text-lg">Je hebt nog geen team samengesteld.</p>
          <p className="text-sm text-muted-foreground">Ga naar de TeamBuilder om je renners te kiezen.</p>
        </CardContent>
      </Card>
    );
  }

  const isSubmitted = entry.status === "submitted";
  const gameLocked = Boolean(game?.status && ["closed", "locked", "live", "finished"].includes(game.status as string));

  return (
    <div className="space-y-6">
      {/* Wijzig-CTA — alleen tonen als koers nog niet op slot staat */}
      {!gameLocked && (
        <div
          className={cn(
            "retro-border p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3",
            isSubmitted ? "bg-emerald-500/10 border-emerald-500/40" : "bg-amber-500/10 border-amber-500/40"
          )}
        >
          <div className="text-sm">
            {isSubmitted ? (
              <>✅ <strong>Team ingediend.</strong> Wil je je selectie nog aanpassen? Dat kan tot de admin de koers op deadline zet.</>
            ) : (
              <>⚠️ <strong>Team nog niet ingediend.</strong> Vergeet niet je inzending te bevestigen.</>
            )}
          </div>
          <Button asChild size="sm" variant={isSubmitted ? "outline" : "default"}>
            <Link to="/team">
              <Pencil className="h-4 w-4 mr-2" />
              {isSubmitted ? "Wijzigen" : "Naar teambuilder"}
            </Link>
          </Button>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="retro-border">
          <CardContent className="p-4 text-center">
            <Trophy className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-xs text-muted-foreground font-sans">Totaal punten</p>
            <p className="font-display text-2xl font-bold">{totalPoints}</p>
          </CardContent>
        </Card>
        <Card className="retro-border">
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-xs text-muted-foreground font-sans">Positie in poule</p>
            <p className="font-display text-2xl font-bold">
              {myRank > 0 ? `#${myRank}` : "—"}
              {entries.length > 0 && (
                <span className="text-xs text-muted-foreground font-sans ml-1">/{entries.length}</span>
              )}
            </p>
          </CardContent>
        </Card>
        <Card className="retro-border">
          <CardContent className="p-4 text-center">
            <Target className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-xs text-muted-foreground font-sans">Categorieën</p>
            <p className="font-display text-2xl font-bold">{picksByCategory.size}/{categories.length}</p>
          </CardContent>
        </Card>
        <Card className="retro-border">
          <CardContent className="p-4 text-center">
            <Sparkles className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-xs text-muted-foreground font-sans">Status</p>
            <p className="font-display text-base font-bold">
              {isSubmitted ? "Ingediend" : "Concept"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Renner-overzicht */}
      <Card className="retro-border">
        <CardHeader className="border-b-2 border-foreground bg-secondary/30">
          <CardTitle className="font-display flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" /> Mijn renners
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {categories.map((cat) => {
              const riderId = picksByCategory.get(cat.id);
              const rider = riderId ? ridersById[riderId] : null;
              const isJoker = riderId ? jokerIds.includes(riderId) : false;
              return (
                <div key={cat.id} className="p-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-sans">{cat.short_name ?? cat.name}</p>
                    {rider ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-bold">{rider.name}</span>
                        {rider.start_number && (
                          <span className="text-xs font-mono text-muted-foreground">#{rider.start_number}</span>
                        )}
                        {rider.team && (
                          <span className="text-xs text-muted-foreground">{rider.team}</span>
                        )}
                        {isJoker && <Badge variant="secondary" className="text-xs">Joker ×2</Badge>}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground italic">Niet gekozen</span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Jokers die nog niet in een categorie zitten */}
            {jokerIds.filter((jid) => !Array.from(picksByCategory.values()).includes(jid)).map((jid) => {
              const rider = ridersById[jid];
              return (
                <div key={`joker-${jid}`} className="p-3 flex items-center justify-between gap-3 bg-primary/5">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-sans">Joker (×2 punten)</p>
                    {rider ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-bold">{rider.name}</span>
                        {rider.start_number && (
                          <span className="text-xs font-mono text-muted-foreground">#{rider.start_number}</span>
                        )}
                        {rider.team && <span className="text-xs text-muted-foreground">{rider.team}</span>}
                        <Badge variant="secondary" className="text-xs">🃏</Badge>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground italic">Onbekend</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Punten per etappe */}
      <Card className="retro-border">
        <CardHeader className="border-b-2 border-foreground bg-secondary/30">
          <CardTitle className="font-display">📊 Punten per etappe</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {stages.map((stage) => {
              const pts = stagePointsByStageId[stage.id] ?? 0;
              const hasResults = pts > 0;
              return (
                <div key={stage.id} className={cn("p-3 flex items-center justify-between", hasResults && "bg-primary/5")}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs text-muted-foreground w-10 shrink-0">R{stage.stage_number}</span>
                    <span className="text-base">{STAGE_TYPE_ICON[stage.stage_type] ?? "🚴"}</span>
                    <span className="font-sans text-sm truncate">{stage.name ?? `Etappe ${stage.stage_number}`}</span>
                  </div>
                  <span className="font-display text-lg font-bold tabular-nums">{pts}</span>
                </div>
              );
            })}
            {stages.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground text-center">Nog geen etappes ingepland.</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Voorspellingen */}
      {predictions.length > 0 && (
        <Card className="retro-border">
          <CardHeader className="border-b-2 border-foreground bg-secondary/30">
            <CardTitle className="font-display">🎯 Mijn voorspellingen</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {(["gc", "points", "kom", "youth"] as const).map((cls) => {
              const items = predictions.filter((p) => p.classification === cls).sort((a, b) => a.position - b.position);
              if (items.length === 0) return null;
              const label = cls === "gc" ? "Eindklassement" : cls === "points" ? "Puntentrui" : cls === "kom" ? "Bergtrui" : "Jongerentrui";
              return (
                <div key={cls}>
                  <p className="text-xs text-muted-foreground font-sans mb-1">{label}</p>
                  <div className="flex flex-wrap gap-2">
                    {items.map((p) => {
                      const r = ridersById[p.rider_id];
                      return (
                        <Badge key={`${cls}-${p.position}`} variant="outline">
                          {cls === "gc" ? `${p.position}.` : ""} {r?.name ?? "…"}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
