import { useState, useMemo } from "react";
import koerspouleLogo from "@/assets/koerspoule-logo.png";
import { mockTeams, mockSubPools, mockStageResults, mockClassifications } from "@/data/mockData";
import { pointsTable, riderCategories } from "@/data/riders";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Plus, Copy, Trophy, TrendingUp, Target, Award, ChevronRight, Medal, User, Mountain, Zap, Baby, ArrowLeftRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent } from
"@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";

/* ── Mock data for games & enriched sub-pools ── */
const myGames = [
{ id: "tdf2024", name: "Tour de France 2024", status: "afgelopen" as const, emoji: "🇫🇷" },
{ id: "giro2025", name: "Giro d'Italia 2025", status: "actief" as const, emoji: "🇮🇹" }];


const enrichedSubPools = mockSubPools.map((pool) => ({
  ...pool,
  standings: mockTeams.
  filter((t) => pool.members.includes(t.userName)).
  sort((a, b) => b.totalPoints - a.totalPoints),
  pointsHistory: Array.from({ length: 3 }, (_, i) => ({
    stage: `Rit ${i + 1}`,
    ...Object.fromEntries(
      pool.members.map((name) => [
      name,
      Math.round(40 + Math.random() * 60) * (i + 1)]
      )
    )
  }))
}));

const MEMBER_COLORS = ["hsl(330 60% 65%)", "hsl(220 55% 45%)", "hsl(38 70% 55%)", "hsl(160 50% 40%)"];

export default function MijnPeloton() {
  const { toast } = useToast();
  const myTeam = mockTeams[0];
  const [selectedGame, setSelectedGame] = useState(myGames[1].id);
  const [gameTab, setGameTab] = useState("team");
  const [selectedPool, setSelectedPool] = useState<string | null>(null);
  const [newPoolName, setNewPoolName] = useState("");
  const [newPoolCode, setNewPoolCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedStage, setSelectedStage] = useState(0);
  const [comparePlayerName, setComparePlayerName] = useState("");
  const [subpoolComparePlayer, setSubpoolComparePlayer] = useState("");

  const activePool = useMemo(
    () => enrichedSubPools.find((p) => p.id === selectedPool),
    [selectedPool]
  );

  const chartConfig = useMemo(() => {
    if (!activePool) return {};
    return Object.fromEntries(
      activePool.standings.map((t, i) => [
      t.userName,
      { label: t.userName, color: MEMBER_COLORS[i % MEMBER_COLORS.length] }]
      )
    );
  }, [activePool]);

  const myRiderNumbers = useMemo(
    () => new Set(Object.values(myTeam.picks).map((p) => p.number)),
    []
  );

  const myStagePoints = useMemo(() => {
    const stage = mockStageResults[selectedStage];
    const scoringRiders = stage.top20.
    filter((r) => myRiderNumbers.has(r.riderNumber)).
    map((r) => ({ ...r, points: pointsTable[r.position] || 0 }));
    const total = scoringRiders.reduce((sum, r) => sum + r.points, 0);
    return { scoringRiders, total };
  }, [selectedStage, myRiderNumbers]);

  const getCategoryName = (catId: number) =>
  riderCategories.find((c) => c.id === catId)?.name || `Cat ${catId}`;

  /* ── Sub-pool detail view ── */
  if (activePool) {
    const subpoolCompareTeam = mockTeams.find(
      (t) => t.userName === subpoolComparePlayer && t.id !== myTeam.id
    );
    return (
      <div className="container mx-auto px-4 py-8 md:py-12">
        <button
          onClick={() => setSelectedPool(null)}
          className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1">
          
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
                className="text-muted-foreground hover:text-foreground">
                
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
                {activePool.standings.map((team, idx) =>
                <div
                  key={team.id}
                  className={cn(
                    "flex items-center justify-between px-4 py-2.5 text-sm",
                    team.id === myTeam.id && "bg-primary/10"
                  )}>
                  
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold w-6 text-center text-muted-foreground">
                        {idx + 1}
                      </span>
                      <span className="font-sans font-medium">{team.userName}</span>
                    </div>
                    <span className="font-display font-bold">{team.totalPoints} pt</span>
                  </div>
                )}
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
                    {activePool.standings.map((team, i) =>
                    <Line
                      key={team.userName}
                      type="monotone"
                      dataKey={team.userName}
                      stroke={MEMBER_COLORS[i % MEMBER_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }} />

                    )}
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Team comparison */}
          <div className="lg:col-span-3">
            <Card className="retro-border">
              <CardHeader className="border-b-2 border-foreground bg-secondary/50 py-3 px-4">
                <CardTitle className="font-display text-base flex items-center gap-2">
                  <ArrowLeftRight className="h-5 w-5 text-primary" />
                  Vergelijk jouw team
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-muted-foreground font-sans">Vergelijk met:</span>
                  <div className="flex gap-2 flex-wrap">
                    {activePool.standings
                      .filter((t) => t.id !== myTeam.id)
                      .map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setSubpoolComparePlayer(subpoolComparePlayer === t.userName ? "" : t.userName)}
                          className={cn(
                            "px-3 py-1.5 text-sm font-bold rounded-md border-2 transition-all",
                            subpoolComparePlayer === t.userName
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border hover:border-muted-foreground"
                          )}
                        >
                          {t.userName}
                        </button>
                      ))}
                  </div>
                </div>

                {subpoolCompareTeam ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-secondary/30">
                          <th className="text-left px-4 py-2 font-display">Categorie</th>
                          <th className="text-left px-4 py-2 font-display">{myTeam.userName} (jij)</th>
                          <th className="text-left px-4 py-2 font-display">{subpoolCompareTeam.userName}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {Object.entries(myTeam.picks).map(([catId, rider]) => {
                          const otherRider = subpoolCompareTeam.picks[Number(catId)];
                          const isSame = otherRider?.number === rider.number;
                          return (
                            <tr key={catId} className={cn(isSame && "bg-accent/10")}>
                              <td className="px-4 py-2 text-xs text-muted-foreground">{getCategoryName(Number(catId))}</td>
                              <td className="px-4 py-2 font-sans font-medium">
                                {rider.name} <span className="text-muted-foreground">#{rider.number}</span>
                              </td>
                              <td className="px-4 py-2 font-sans font-medium">
                                {otherRider?.name || "—"}{" "}
                                {otherRider && <span className="text-muted-foreground">#{otherRider.number}</span>}
                                {isSame && <span className="ml-1 text-xs text-accent">★</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div className="mt-3 flex justify-between px-4 py-2 bg-secondary/30 rounded-md text-sm font-display font-bold">
                      <span>{myTeam.userName}: {myTeam.totalPoints} pt</span>
                      <span>{subpoolCompareTeam.userName}: {subpoolCompareTeam.totalPoints} pt</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground font-sans">Kies een speler om teams te vergelijken.</p>
                )}
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
                        <th className="text-center px-4 py-2 font-display">Jokers</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {activePool.standings.map((team) =>
                      <tr key={team.id} className={cn(team.id === myTeam.id && "bg-primary/10")}>
                          <td className="px-4 py-2.5 font-sans font-medium">{team.userName}</td>
                          <td className="text-center px-4 py-2.5 font-display font-bold">{team.totalPoints}</td>
                          <td className="text-center px-4 py-2.5">{Math.floor(Math.random() * 6) + 2}</td>
                          <td className="text-center px-4 py-2.5">Rit {Math.floor(Math.random() * 3) + 1}</td>
                          <td className="text-center px-4 py-2.5">{team.jokers.length}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>);

  }

  /* ── Main overview ── */
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="text-center mb-8">
         
         <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Mijn Peloton

        </h1>
        <p className="text-muted-foreground font-serif">
          Welkom terug, {myTeam.userName}! Beheer je koersen en subpoules.
        </p>
        <div className="vintage-divider max-w-xs mx-auto mt-4" />
      </div>

      <div className="max-w-5xl mx-auto">
        {/* Game selector */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {myGames.map((game) =>
          <button
            key={game.id}
            onClick={() => setSelectedGame(game.id)}
            className={cn(
              "px-4 py-2 rounded-md font-display font-bold text-sm border-2 transition-all flex items-center gap-2",
              selectedGame === game.id ?
              "border-primary bg-primary text-primary-foreground" :
              "border-border hover:border-muted-foreground"
            )}>
            
              <span>{game.emoji}</span>
              {game.name}
              {game.status === "actief" &&
            <span className="w-2 h-2 rounded-full bg-primary-foreground animate-pulse" />
            }
            </button>
          )}
        </div>

        {/* Inner tabs: Team / Uitslagen / Subpoules */}
        <Tabs value={gameTab} onValueChange={setGameTab}>
          <TabsList className="w-full retro-border">
            <TabsTrigger value="team" className="flex-1 font-display">
              🚴 Mijn Team
            </TabsTrigger>
            <TabsTrigger value="uitslagen" className="flex-1 font-display">
              📋 Uitslagen
            </TabsTrigger>
            <TabsTrigger value="klassement" className="flex-1 font-display">
              🏅 GC
            </TabsTrigger>
            <TabsTrigger value="subpoules" className="flex-1 font-display">
              👥 Subpoules
            </TabsTrigger>
          </TabsList>

          {/* ── TAB: Mijn Team ── */}
          <TabsContent value="team" className="mt-6">
            {(() => {
              const compareTeam = mockTeams.find(
                (t) => t.userName.toLowerCase() === comparePlayerName.trim().toLowerCase() && t.id !== myTeam.id
              );
              return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card className="retro-border">
                  <CardHeader className="border-b-2 border-foreground bg-secondary/50 py-3 px-4 flex flex-row items-center justify-between">
                    <CardTitle className="font-display text-base">🚴 Mijn selectie</CardTitle>
                    <span className="font-display text-xl font-bold text-accent">{myTeam.totalPoints} pt</span>
                  </CardHeader>
                  
                  {/* Compare input */}
                  <div className="p-3 border-b border-border bg-secondary/20">
                    <div className="flex items-center gap-2">
                      <ArrowLeftRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm text-muted-foreground font-sans whitespace-nowrap">Vergelijk met:</span>
                      <Input
                        value={comparePlayerName}
                        onChange={(e) => setComparePlayerName(e.target.value)}
                        placeholder="Typ spelersnaam..."
                        className="h-8 text-sm max-w-[200px]"
                      />
                      {comparePlayerName && !compareTeam && (
                        <span className="text-xs text-destructive whitespace-nowrap">Niet gevonden</span>
                      )}
                      {compareTeam && (
                        <span className="text-xs text-primary font-bold whitespace-nowrap">{compareTeam.totalPoints} pt</span>
                      )}
                    </div>
                  </div>

                  <CardContent className="p-0 divide-y divide-border">
                    {Object.entries(myTeam.picks).map(([catId, rider]) => {
                      const otherRider = compareTeam?.picks[Number(catId)];
                      const isSame = otherRider?.number === rider.number;
                      return (
                    <div key={catId} className="flex items-center gap-3 px-4 py-2 text-sm">
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-muted-foreground block truncate">
                            {getCategoryName(Number(catId))}
                          </span>
                          <span className="font-medium font-sans">
                            {rider.name} <span className="text-muted-foreground">#{rider.number}</span>
                          </span>
                        </div>
                        {compareTeam && (
                          <div className={cn(
                            "flex-1 min-w-0 text-right",
                            isSame ? "text-accent" : "text-muted-foreground"
                          )}>
                            <span className="text-xs block truncate">{compareTeam.userName}</span>
                            <span className="font-medium font-sans">
                              {otherRider?.name || "—"}{" "}
                              {otherRider && <span className="text-muted-foreground">#{otherRider.number}</span>}
                            </span>
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                {/* Jokers */}
                <Card className="retro-border">
                  <CardHeader className="border-b-2 border-foreground bg-secondary/50 py-3 px-4">
                    <CardTitle className="font-display text-base">🃏 Jokers</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {myTeam.jokers.map((j) =>
                      <span key={j.number} className="jersey-badge bg-primary text-primary-foreground">
                          {j.name} #{j.number}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Predictions */}
                <Card className="retro-border">
                  <CardHeader className="border-b-2 border-foreground bg-secondary/50 py-3 px-4">
                    <CardTitle className="font-display text-base">🏆 Voorspellingen</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2 text-sm font-sans">
                    <div>
                      <span className="text-xs text-muted-foreground">Podium:</span>
                      <p className="font-medium">{myTeam.predictions.gcPodium.join(", ")}</p>
                    </div>
                    <p><span className="w-2 h-2 rounded-full bg-jersey-purple inline-block mr-1" /> {myTeam.predictions.pointsJersey}</p>
                    <p><span className="w-2 h-2 rounded-full bg-jersey-blue inline-block mr-1" /> {myTeam.predictions.mountainJersey}</p>
                    <p><span className="w-2 h-2 rounded-full bg-jersey-white border inline-block mr-1" /> {myTeam.predictions.youthJersey}</p>
                  </CardContent>
                </Card>

                {/* Quick stats */}
                <Card className="retro-border">
                  <CardHeader className="border-b-2 border-foreground bg-secondary/50 py-3 px-4">
                    <CardTitle className="font-display text-base">📊 Overzicht</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground font-sans">Totaal punten</span>
                      <span className="font-display font-bold">{myTeam.totalPoints} pt</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground font-sans">Renners</span>
                      <span className="font-sans font-medium">{Object.keys(myTeam.picks).length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground font-sans">Jokers</span>
                      <span className="font-sans font-medium">{myTeam.jokers.length}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
              );
            })()}
          </TabsContent>

          {/* ── TAB: Uitslagen ── */}
          <TabsContent value="uitslagen" className="mt-6">
            {/* Stage selector */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {mockStageResults.map((stage, i) =>
              <button
                key={stage.stage}
                onClick={() => setSelectedStage(i)}
                className={cn(
                  "px-3 py-1.5 text-sm font-bold rounded-md border-2 transition-all",
                  selectedStage === i ?
                  "border-primary bg-primary text-primary-foreground" :
                  "border-border hover:border-muted-foreground"
                )}>
                
                  Rit {stage.stage}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Live stage results */}
              <Card className="retro-border">
                <CardHeader className="border-b-2 border-foreground bg-secondary/50 py-3 px-4">
                  <CardTitle className="font-display text-base flex items-center gap-2">
                    <Medal className="h-5 w-5 text-accent" />
                    Rit {mockStageResults[selectedStage].stage} — {mockStageResults[selectedStage].route}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="jersey-badge bg-accent text-accent-foreground">
                      {mockStageResults[selectedStage].type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {mockStageResults[selectedStage].distance} • {mockStageResults[selectedStage].date}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-0 divide-y divide-border">
                  {mockStageResults[selectedStage].top20.map((result) => {
                    const isInMyTeam = myRiderNumbers.has(result.riderNumber);
                    return (
                      <div
                        key={result.position}
                        className={cn(
                          "flex items-center justify-between px-4 py-2 text-sm",
                          result.position <= 3 && "bg-primary/5",
                          isInMyTeam && "ring-1 ring-inset ring-primary/30 bg-primary/10"
                        )}>
                        
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                            result.position === 1 && "bg-primary text-primary-foreground",
                            result.position === 2 && "bg-muted text-foreground",
                            result.position === 3 && "bg-vintage-gold text-primary-foreground",
                            result.position > 3 && "text-muted-foreground"
                          )}>
                            {result.position}
                          </span>
                          <span className="font-sans">
                            <span className="text-xs text-muted-foreground mr-1">#{result.riderNumber}</span>
                            <span className={cn("font-medium", isInMyTeam && "text-primary")}>{result.riderName}</span>
                          </span>
                        </div>
                        <span className="font-bold text-accent text-xs">
                          {pointsTable[result.position] || 0} pt
                        </span>
                      </div>);

                  })}
                </CardContent>
              </Card>

              {/* My team points for this stage */}
              <Card className="retro-border h-fit">
                <CardHeader className="border-b-2 border-foreground bg-primary/10 py-3 px-4">
                  <CardTitle className="font-display text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      Jouw punten deze rit
                    </span>
                    <span className="font-display text-xl text-primary">
                      {myStagePoints.total} pt
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {myStagePoints.scoringRiders.length > 0 ?
                  <div className="divide-y divide-border">
                      {myStagePoints.scoringRiders.map((r) =>
                    <div key={r.riderNumber} className="flex items-center justify-between px-4 py-2.5 text-sm">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                              {r.position}
                            </span>
                            <span className="font-sans font-medium">{r.riderName}</span>
                          </div>
                          <span className="font-bold text-primary">{r.points} pt</span>
                        </div>
                    )}
                    </div> :

                  <div className="p-6 text-center text-muted-foreground font-sans text-sm">
                      Geen van jouw renners scoorde punten in deze rit.
                    </div>
                  }
                </CardContent>

                {/* Cumulative per-stage summary */}
                <div className="border-t-2 border-foreground bg-secondary/30 p-4">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Punten per rit
                  </h3>
                  <div className="flex gap-2 flex-wrap">
                    {mockStageResults.map((stage, i) => {
                      const stageRiderNums = myRiderNumbers;
                      const stageTotal = stage.top20.
                      filter((r) => stageRiderNums.has(r.riderNumber)).
                      reduce((sum, r) => sum + (pointsTable[r.position] || 0), 0);
                      return (
                        <div
                          key={stage.stage}
                          className={cn(
                            "text-center p-2 rounded-md border min-w-[60px]",
                            i === selectedStage ? "border-primary bg-primary/10" : "border-border"
                          )}>
                          
                          <p className="text-xs text-muted-foreground">Rit {stage.stage}</p>
                          <p className="font-display font-bold">{stageTotal}</p>
                        </div>);

                    })}
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* ── TAB: Subpoules ── */}
          <TabsContent value="subpoules" className="mt-6">
            <div className="max-w-xl">
              <Card className="retro-border">
                <CardHeader className="border-b-2 border-foreground bg-secondary/50 py-3 px-4 flex flex-row items-center justify-between">
                  <CardTitle className="font-display text-base flex items-center gap-2">
                    <Users className="h-4 w-4" /> Subpoules
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="h-7 gap-1 text-xs">
                    
                    <Plus className="h-3.5 w-3.5" />
                    Nieuw
                  </Button>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {showCreateForm &&
                  <div className="p-3 border border-border rounded-md bg-secondary/20 space-y-2">
                      <Input
                      value={newPoolName}
                      onChange={(e) => setNewPoolName(e.target.value)}
                      placeholder="Naam subpoule"
                      className="text-sm" />
                    
                      <Input
                      value={newPoolCode}
                      onChange={(e) => setNewPoolCode(e.target.value.toUpperCase())}
                      placeholder="Kies een code (bijv. KOERS24)"
                      className="text-sm font-mono uppercase" />
                    
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
                      }}>
                      
                        Aanmaken
                      </Button>
                    </div>
                  }

                  {enrichedSubPools.map((pool) =>
                  <button
                    key={pool.id}
                    onClick={() => setSelectedPool(pool.id)}
                    className="w-full text-left p-3 bg-secondary/50 rounded-md hover:bg-secondary transition-colors flex items-center justify-between group">
                    
                      <div>
                        <p className="font-sans font-bold text-sm">{pool.name}</p>
                        <p className="text-xs text-muted-foreground">{pool.members.length} deelnemers</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </button>
                  )}

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
                        className="text-xs font-mono uppercase" />
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          toast({ title: "Aangevraagd!", description: `Code: ${joinCode}` });
                          setJoinCode("");
                        }}>
                        
                        Join
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── TAB: Klassement (Poule stand) ── */}
          <TabsContent value="klassement" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Poule standings */}
              <div className="lg:col-span-2">
                <Card className="retro-border">
                  <CardHeader className="border-b-2 border-foreground bg-secondary/50 py-3 px-4">
                    <CardTitle className="font-display text-base flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-primary" />
                      Poule Klassement
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 divide-y divide-border">
                    {[...mockTeams].
                    sort((a, b) => b.totalPoints - a.totalPoints).
                    map((team, idx) => {
                      const isMe = team.id === myTeam.id;
                      return (
                        <div
                          key={team.id}
                          className={cn(
                            "flex items-center justify-between px-4 py-3 text-sm",
                            idx < 3 && "bg-primary/5",
                            isMe && "ring-1 ring-inset ring-primary/30 bg-primary/10"
                          )}>
                          
                            <div className="flex items-center gap-3">
                              <span className={cn(
                              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                              idx === 0 && "bg-primary text-primary-foreground",
                              idx === 1 && "bg-muted text-foreground",
                              idx === 2 && "bg-vintage-gold text-primary-foreground",
                              idx > 2 && "text-muted-foreground"
                            )}>
                                {idx + 1}
                              </span>
                              <div>
                                <span className={cn("font-sans font-bold", isMe && "text-primary")}>
                                  {team.userName}
                                  {isMe && <span className="ml-1 text-xs text-muted-foreground">(jij)</span>}
                                </span>
                                <p className="text-xs text-muted-foreground">
                                  {Object.keys(team.picks).length} renners • {team.jokers.length} jokers
                                </p>
                              </div>
                            </div>
                            <span className="font-display font-bold text-lg text-accent">
                              {team.totalPoints} pt
                            </span>
                          </div>);

                    })}
                  </CardContent>
                </Card>
              </div>

              {/* Side panel: race classifications */}
              <div className="space-y-4">
                <ClassificationTabs myRiderNumbers={myRiderNumbers} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>);

}

const CLASSIFICATION_TABS = [
{ key: "gc", label: "🏆 Algemeen", jersey: "bg-jersey-pink", valueKey: "time" as const },
{ key: "points", label: "🟣 Punten", jersey: "bg-jersey-purple", valueKey: "points" as const },
{ key: "kom", label: "🔵 Berg", jersey: "bg-jersey-blue", valueKey: "points" as const },
{ key: "youth", label: "⚪ Jongeren", jersey: "bg-jersey-white border", valueKey: "time" as const }] as
const;

function ClassificationTabs({ myRiderNumbers }: {myRiderNumbers: Set<number>;}) {
  const [activeClassification, setActiveClassification] = useState("gc");

  const activeTab = CLASSIFICATION_TABS.find((t) => t.key === activeClassification) || CLASSIFICATION_TABS[0];
  const data = mockClassifications[activeClassification as keyof typeof mockClassifications];

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {CLASSIFICATION_TABS.map((tab) =>
        <button
          key={tab.key}
          onClick={() => setActiveClassification(tab.key)}
          className={cn(
            "px-3 py-1.5 text-sm font-bold rounded-md border-2 transition-all flex items-center gap-2",
            activeClassification === tab.key ?
            "border-primary bg-primary text-primary-foreground" :
            "border-border hover:border-muted-foreground"
          )}>
          
            {tab.label}
          </button>
        )}
      </div>

      <Card className="retro-border">
        <CardHeader className="border-b-2 border-foreground bg-secondary/50 py-3 px-4">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <span className={cn("w-4 h-4 rounded-full", activeTab.jersey)} />
            {activeTab.label} Klassement
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-border">
          {data.map((entry) => {
            const isInMyTeam = myRiderNumbers.has(entry.riderNumber);
            return (
              <div
                key={entry.position}
                className={cn(
                  "flex items-center justify-between px-4 py-2.5 text-sm",
                  entry.position <= 3 && "bg-primary/5",
                  isInMyTeam && "ring-1 ring-inset ring-primary/30 bg-primary/10"
                )}>
                
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                    entry.position === 1 && "bg-primary text-primary-foreground",
                    entry.position === 2 && "bg-muted text-foreground",
                    entry.position === 3 && "bg-vintage-gold text-primary-foreground",
                    entry.position > 3 && "text-muted-foreground"
                  )}>
                    {entry.position}
                  </span>
                  <div>
                    <span className={cn("font-sans font-medium", isInMyTeam && "text-primary")}>
                      {entry.riderName}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">#{entry.riderNumber}</span>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">{entry.team}</p>
                  </div>
                </div>
                <span className="font-display font-bold text-accent">
                  {activeTab.valueKey === "points" ? `${entry.points} pt` : entry.time}
                </span>
              </div>);

          })}
        </CardContent>
      </Card>
    </div>);

}

function StatCard({ icon, label, value }: {icon: React.ReactNode;label: string;value: string;}) {
  return (
    <Card className="retro-border">
      <CardContent className="p-4 flex items-center gap-3">
        {icon}
        <div>
          <p className="text-xs text-muted-foreground font-sans">{label}</p>
          <p className="font-display font-bold text-lg">{value}</p>
        </div>
      </CardContent>
    </Card>);

}