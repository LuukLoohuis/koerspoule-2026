import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Calendar, Award, TrendingUp } from "lucide-react";
import type { Game } from "./GamesTab";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Stat = { label: string; value: number | string; icon: React.ReactNode; testId: string };

export default function DashboardTab({
  activeGameId,
  activeGame,
}: {
  activeGameId: string;
  activeGame: Game | null;
}) {
  const [stats, setStats] = useState<{
    teams: number;
    riders: number;
    stagesDone: number;
    stagesTotal: number;
    users: number;
  }>({ teams: 0, riders: 0, stagesDone: 0, stagesTotal: 0, users: 0 });
  const [topTeams, setTopTeams] = useState<Array<{ team_id: string; name: string; total_points: number }>>([]);

  async function load() {
    if (!supabase) return;

    const [usersRes] = await Promise.all([
      supabase.from("admin_user_overview").select("user_id", { count: "exact", head: true }),
    ]);

    if (!activeGameId) {
      setStats((prev) => ({ ...prev, users: usersRes.count ?? 0 }));
      return;
    }

    const [teamsRes, ridersRes, stagesRes, doneRes, topRes] = await Promise.all([
      supabase.from("user_teams").select("id", { count: "exact", head: true }).eq("game_id", activeGameId),
      supabase.from("game_riders").select("id", { count: "exact", head: true }).eq("game_id", activeGameId),
      supabase.from("stages").select("id", { count: "exact", head: true }).eq("game_id", activeGameId),
      supabase
        .from("classification_results")
        .select("stage_id, stages!inner(game_id)", { count: "exact", head: true })
        .eq("classification", "stage")
        .eq("stages.game_id", activeGameId),
      supabase
        .from("total_points")
        .select("team_id, total_points, user_teams!inner(name, game_id)")
        .eq("user_teams.game_id", activeGameId)
        .order("total_points", { ascending: false })
        .limit(5),
    ]);

    setStats({
      teams: teamsRes.count ?? 0,
      riders: ridersRes.count ?? 0,
      stagesTotal: stagesRes.count ?? 0,
      stagesDone: doneRes.count ?? 0,
      users: usersRes.count ?? 0,
    });

    setTopTeams(
      ((topRes.data ?? []) as Array<{ team_id: string; total_points: number; user_teams: { name: string | null } | null }>).map((r) => ({
        team_id: r.team_id,
        name: r.user_teams?.name ?? "(geen naam)",
        total_points: r.total_points,
      }))
    );
  }

  useEffect(() => { load(); }, [activeGameId]);

  const items: Stat[] = [
    { label: "Geregistreerde gebruikers", value: stats.users, icon: <Users className="w-5 h-5" />, testId: "stat-users" },
    { label: "Teams in deze game", value: stats.teams, icon: <Trophy className="w-5 h-5" />, testId: "stat-teams" },
    { label: "Renners in startlijst", value: stats.riders, icon: <Award className="w-5 h-5" />, testId: "stat-riders" },
    { label: "Etappes verwerkt", value: `${stats.stagesDone} / ${stats.stagesTotal}`, icon: <Calendar className="w-5 h-5" />, testId: "stat-stages" },
  ];

  return (
    <div className="space-y-6">
      {activeGame && (
        <Card className="bg-secondary/30">
          <CardContent className="py-5 flex items-center gap-4">
            <div className="text-3xl">🏆</div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Actieve game</p>
              <h2 className="text-2xl font-display font-bold">{activeGame.name}</h2>
            </div>
            <Badge className="capitalize">{activeGame.status}</Badge>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {items.map((s) => (
          <Card key={s.label} data-testid={s.testId}>
            <CardContent className="py-5 flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-md text-primary">{s.icon}</div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold tabular-nums">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2"><TrendingUp className="w-5 h-5" />Top 5 teams</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="text-right">Punten</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topTeams.map((t, i) => (
                <TableRow key={t.team_id}>
                  <TableCell className="font-bold">{i + 1}</TableCell>
                  <TableCell>{t.name}</TableCell>
                  <TableCell className="text-right tabular-nums font-bold">{t.total_points}</TableCell>
                </TableRow>
              ))}
              {topTeams.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Nog geen scores. Voer uitslagen in en bereken om hier de top 5 te zien.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
