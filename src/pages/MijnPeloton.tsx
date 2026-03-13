import { useState, useMemo } from "react";
import { mockTeams, mockSubPools } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Plus, Copy, Trophy, TrendingUp, Target, Award, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

/* ── Mock data for games & enriched sub-pools ── */
const myGames = [
  { id: "tdf2024", name: "Tour de France 2024", status: "afgelopen" as const, emoji: "🇫🇷" },
  { id: "giro2025", name: "Giro d'Italia 2025", status: "actief" as const, emoji: "🇮🇹" },
];

const enrichedSubPools = mockSubPools.map((pool) => ({
  ...pool,
  standings: mockTeams
    .filter((t) => pool.members.includes(t.userName))
    .sort((a, b) => b.totalPoints - a.totalPoints),
  pointsHistory: Array.from({ length: 6 }, (_, i) => ({
    stage: `Etappe ${i + 1}`,
    ...Object.fromEntries(
      pool.members.map((name) => [
        name,
        Math.round(40 + Math.random() * 60) * (i + 1),
      ])
    ),
  })),
}));

const MEMBER_COLORS = ["hsl(330 60% 65%)", "hsl(220 55% 45%)", "hsl(38 70% 55%)", "hsl(160 50% 40%)"];

export default function MijnPeloton() {
  const { toast } = useToast();
  const myTeam = mockTeams[0];
  const [selectedGame, setSelectedGame] = useState(myGames[1].id);
  const [selectedPool, setSelectedPool] = useState<string | null>(null);
  const [newPoolName, setNewPoolName] = useState("");
  const [newPoolCode, setNewPoolCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const activePool = useMemo(
    () => enrichedSubPools.find((p) => p.id === selectedPool),
    [selectedPool]
  );

  const chartConfig = useMemo(() => {
    if (!activePool) return {};
    return Object.fromEntries(
      activePool.standings.map((t, i) => [
        t.userName,
        { label: t.userName, color: MEMBER_COLORS[i % MEMBER_COLORS.length] },
      ])
    );
  }, [activePool]);

  /* ── Sub-pool detail view ── */
  if (activePool) {
    return (
      <div className="container mx-auto px-4 py-8 md:py-12">
        <button
          onClick={() => setSelectedPool(null)}
          className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1"
        >
          ← Terug naar overzicht
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">{activePool.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-mono bg-secondary px-2 py-0.5 rounded border border-border">
                {activePool.code}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(activePool.code);
                  toast({ title: "Code gekopieerd!" });
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <span className="text-sm text-muted-foreground font-sans">
            {activePool.standings.length} deelnemers
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stats cards */}
          <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={<Trophy className="h-5 w-5 text-primary" />} label="Leider" value={activePool.standings[0]?.userName || "—"} />
            <StatCard icon={<TrendingUp className="h-5 w-5 text-primary" />} label="Hoogste score" value={`${activePool.standings[0]?.totalPoints || 0} pt`} />
            <StatCard icon={<Target className="h-5 w-5 text-primary" />} label="Gemiddelde" value={`${Math.round(activePool.standings.reduce((s, t) => s + t.totalPoints, 0) / (activePool.standings.length || 1))} pt`} />
            <StatCard icon={<Award className="h-5 w-5 text-primary" />} label="Jouw positie" value={`#${activePool.standings.findIndex((t) => t.id === myTeam.id) + 1}`} />
          </div>

          {/* Standings */}
          <div className="lg:col-span-1">
            <Card className="retro-border">
              <CardHeader className="border-b-2 border-foreground bg-secondary/50 py-3 px-4">
                <CardTitle className="font-display text-base">🏆 Stand</CardTitle>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-border">
                {activePool.standings.map((team, idx) => (
                  <div
                    key={team.id}
                    className={cn(
                      "flex items-center justify-between px-4 py-2.5 text-sm",
                      team.id === myTeam.id && "bg-primary/10"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold w-6 text-center text-muted-foreground">
                        {idx + 1}
                      </span>
                      <span className="font-sans font-medium">{team.userName}</span>
                    </div>
                    <span className="font-display font-bold">{team.totalPoints} pt</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Points chart */}
          <div className="lg:col-span-2">
            <Card className="retro-border">
              <CardHeader className="border-b-2 border-foreground bg-secondary/50 py-3 px-4">
                <CardTitle className="font-display text-base">📈 Puntenverloop</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <ChartContainer config={chartConfig} className="h-[280px] w-full">
                  <LineChart data={activePool.pointsHistory}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="stage" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    {activePool.standings.map((team, i) => (
                      <Line
                        key={team.userName}
                        type="monotone"
                        dataKey={team.userName}
                        stroke={MEMBER_COLORS[i % MEMBER_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    ))}
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Per-player breakdown */}
          <div className="lg:col-span-3">
            <Card className="retro-border">
              <CardHeader className="border-b-2 border-foreground bg-secondary/50 py-3 px-4">
                <CardTitle className="font-display text-base">📊 Statistieken per speler</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30">
                        <th className="text-left px-4 py-2 font-display">Speler</th>
                        <th className="text-center px-4 py-2 font-display">Punten</th>
                        <th className="text-center px-4 py-2 font-display">Renners in Top 10</th>
                        <th className="text-center px-4 py-2 font-display">Beste etappe</th>
                        <th className="text-center px-4 py-2 font-display">Jokers gebruikt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {activePool.standings.map((team) => (
                        <tr key={team.id} className={cn(team.id === myTeam.id && "bg-primary/10")}>
                          <td className="px-4 py-2.5 font-sans font-medium">{team.userName}</td>
                          <td className="text-center px-4 py-2.5 font-display font-bold">{team.totalPoints}</td>
                          <td className="text-center px-4 py-2.5">{Math.floor(Math.random() * 6) + 2}</td>
                          <td className="text-center px-4 py-2.5">Etappe {Math.floor(Math.random() * 3) + 1}</td>
                          <td className="text-center px-4 py-2.5">{team.jokers.length}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main overview ── */
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
          🚴 Mijn Peloton
        </h1>
        <p className="text-muted-foreground font-serif">
          Welkom terug, {myTeam.userName}! Beheer je koersen en subpoules.
        </p>
        <div className="vintage-divider max-w-xs mx-auto mt-4" />
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Game selector */}
        <Tabs value={selectedGame} onValueChange={setSelectedGame} className="mb-8">
          <TabsList className="w-full justify-start">
            {myGames.map((game) => (
              <TabsTrigger key={game.id} value={game.id} className="gap-2">
                <span>{game.emoji}</span>
                <span>{game.name}</span>
                {game.status === "actief" && (
                  <span className="ml-1 w-2 h-2 rounded-full bg-primary animate-pulse" />
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {myGames.map((game) => (
            <TabsContent key={game.id} value={game.id} className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Quick stats */}
                <Card className="retro-border">
                  <CardHeader className="border-b-2 border-foreground bg-secondary/50 py-3 px-4">
                    <CardTitle className="font-display text-base">📊 Jouw resultaat</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground font-sans">Totaal punten</span>
                      <span className="font-display font-bold text-lg">{myTeam.totalPoints} pt</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground font-sans">Renners geselecteerd</span>
                      <span className="font-sans font-medium">{Object.keys(myTeam.picks).length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground font-sans">Jokers</span>
                      <span className="font-sans font-medium">{myTeam.jokers.length}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Sub-pools */}
                <Card className="retro-border">
                  <CardHeader className="border-b-2 border-foreground bg-secondary/50 py-3 px-4 flex flex-row items-center justify-between">
                    <CardTitle className="font-display text-base flex items-center gap-2">
                      <Users className="h-4 w-4" /> Subpoules
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCreateForm(!showCreateForm)}
                      className="h-7 gap-1 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Nieuw
                    </Button>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {showCreateForm && (
                      <div className="p-3 border border-border rounded-md bg-secondary/20 space-y-2">
                        <Input
                          value={newPoolName}
                          onChange={(e) => setNewPoolName(e.target.value)}
                          placeholder="Naam subpoule"
                          className="text-sm"
                        />
                        <Input
                          value={newPoolCode}
                          onChange={(e) => setNewPoolCode(e.target.value.toUpperCase())}
                          placeholder="Kies een code (bijv. KOERS24)"
                          className="text-sm font-mono uppercase"
                        />
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            if (newPoolName && newPoolCode) {
                              toast({ title: "Subpoule aangemaakt!", description: `Code: ${newPoolCode}` });
                              setNewPoolName("");
                              setNewPoolCode("");
                              setShowCreateForm(false);
                            }
                          }}
                        >
                          Aanmaken
                        </Button>
                      </div>
                    )}

                    {enrichedSubPools.map((pool) => (
                      <button
                        key={pool.id}
                        onClick={() => setSelectedPool(pool.id)}
                        className="w-full text-left p-3 bg-secondary/50 rounded-md hover:bg-secondary transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <p className="font-sans font-bold text-sm">{pool.name}</p>
                          <p className="text-xs text-muted-foreground">{pool.members.length} deelnemers</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </button>
                    ))}

                    {/* Join via code */}
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-2 font-sans">
                        Voer een code in om lid te worden:
                      </p>
                      <div className="flex gap-2">
                        <Input
                          value={joinCode}
                          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                          placeholder="CODE"
                          className="text-xs font-mono uppercase"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            toast({ title: "Aangevraagd!", description: `Code: ${joinCode}` });
                            setJoinCode("");
                          }}
                        >
                          Join
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="retro-border">
      <CardContent className="p-4 flex items-center gap-3">
        {icon}
        <div>
          <p className="text-xs text-muted-foreground font-sans">{label}</p>
          <p className="font-display font-bold text-lg">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
