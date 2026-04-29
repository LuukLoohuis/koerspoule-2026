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
  const [topEntries, setTopEntries] = useState<Array<{ id: string; name: string; total: number }>>([]);

  async function load() {
    if (!supabase) return;

    const usersRes = await supabase.from("admin_user_overview").select("user_id", { count: "exact", head: true });

    if (!activeGameId) {
      setStats((p) => ({ ...p, users: usersRes.count ?? 0 }));
      return;
    }

    const [entriesRes, ridersRes, stagesRes, doneRes] = await Promise.all([
      supabase.from("entries").select("id", { count: "exact", head: true }).eq("game_id", activeGameId),
      supabase.from("riders").select("id", { count: "exact", head: true }).eq("game_id", activeGameId),
      supabase.from("stages").select("id", { count: "exact", head: true }).eq("game_id", activeGameId),
      supabase
        .from("stages")
        .select("id", { count: "exact", head: true })
        .eq("game_id", activeGameId)
        .eq("status", "finished"),
    ]);

    setStats({
      teams: entriesRes.count ?? 0,
      riders: ridersRes.count ?? 0,
      stagesTotal: stagesRes.count ?? 0,
      stagesDone: doneRes.count ?? 0,
      users: usersRes.count ?? 0,
    });

    // Top inzendingen: alleen ophalen als kolom 'total_points' bestaat in entries.
    // In het huidige schema staat puntenstand op een andere plek; deze block
    // negeert errors en toont gewoon niets bij ontbrekende kolom.
    const { data: topData, error: topErr } = await supabase
      .from("entries")
      .select("id, team_name, total_points")
      .eq("game_id", activeGameId)
      .order("total_points", { ascending: false, nullsFirst: false })
      .limit(5);
    if (topErr) {
      // Stille fail: kolom waarschijnlijk niet aanwezig in user's schema
      setTopEntries([]);
    } else {
      setTopEntries(
        ((topData ?? []) as Array<{ id: string; team_name: string | null; total_points: number | null }>).map((r) => ({
          id: r.id,
          name: r.team_name ?? "(geen naam)",
          total: r.total_points ?? 0,
        }))
      );
    }
  }

  useEffect(() => { load(); }, [activeGameId]);

  const items: Stat[] = [
    { label: "Geregistreerde gebruikers", value: stats.users, icon: <Users className="w-5 h-5" />, testId: "stat-users" },
    { label: "Inzendingen (entries)", value: stats.teams, icon: <Trophy className="w-5 h-5" />, testId: "stat-teams" },
    { label: "Renners in startlijst", value: stats.riders, icon: <Award className="w-5 h-5" />, testId: "stat-riders" },
    { label: "Etappes (afgerond/totaal)", value: `${stats.stagesDone} / ${stats.stagesTotal}`, icon: <Calendar className="w-5 h-5" />, testId: "stat-stages" },
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

      {topEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2"><TrendingUp className="w-5 h-5" />Top 5 inzendingen</CardTitle>
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
                {topEntries.map((t, i) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-bold">{i + 1}</TableCell>
                    <TableCell>{t.name}</TableCell>
                    <TableCell className="text-right tabular-nums font-bold">{t.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
