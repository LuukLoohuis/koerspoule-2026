import { useState, useMemo } from "react";
import koerspouleLogo from "@/assets/koerspoule-logo.png";
import { mockTeams, mockSubPools, mockStageResults, mockClassifications } from "@/data/mockData";
import { subpoolTeams, expandedSubPool, computeUniqueness, computePickCounts } from "@/data/subpoolData";
import { allPoolParticipants, getStagePoolStandings, getTruncatedStandings } from "@/data/poolStandings";
import { pointsTable, classificationPoints, riderCategories } from "@/data/riders";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Users, Plus, Copy, Trophy, TrendingUp, Target, Award, ChevronRight, Medal, User, Mountain, Zap, Baby, ArrowLeftRight } from "lucide-react";
import StageRoadbook from "@/components/StageRoadbook";
import PelotonChat from "@/components/PelotonChat";
import { useToast } from "@/hooks/use-toast";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent } from
"@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, ReferenceLine, Cell } from "recharts";

/* ── Mock data for games & enriched sub-pools ── */
const myGames = [
{ id: "giro2026", name: "Giro d'Italia 2026", status: "actief" as const, emoji: "🇮🇹", colors: ["#009246", "#ffffff", "#CE2B37"] },
{ id: "tdf2026", name: "Tour de France 2026", status: "afgelopen" as const, emoji: "🇫🇷", colors: ["#002395", "#ffffff", "#ED2939"] },
{ id: "vuelta2026", name: "Vuelta a España 2026", status: "afgelopen" as const, emoji: "🇪🇸", colors: ["#AA151B", "#F1BF00", "#AA151B"] }];

const getRiderPoints = (riderNumber: number) => {
  return mockStageResults.reduce((total, stage) => {
    const result = stage.top20.find((r) => r.riderNumber === riderNumber);
    return total + (result ? pointsTable[result.position] || 0 : 0);
  }, 0);
};

const allSubPools = [...mockSubPools, expandedSubPool];

const enrichedSubPools = allSubPools.map((pool) => {
  const isExpanded = pool.id === expandedSubPool.id;
  const standings = isExpanded ?
  [...subpoolTeams].sort((a, b) => b.totalPoints - a.totalPoints) :
  mockTeams.filter((t) => pool.members.includes(t.userName)).sort((a, b) => b.totalPoints - a.totalPoints);

  return {
    ...pool,
    standings,
    isExpanded,
    pointsHistory: Array.from({ length: 21 }, (_, i) => ({
      stage: `Rit ${i + 1}`,
      ...Object.fromEntries(
        pool.members.map((name) => [
        name,
        Math.round(40 + Math.random() * 60) * (i + 1)]
        )
      )
    }))
  };
});

const MEMBER_COLORS = [
"hsl(330 60% 65%)", "hsl(220 55% 45%)", "hsl(38 70% 55%)", "hsl(160 50% 40%)",
"hsl(280 50% 55%)", "hsl(15 75% 55%)", "hsl(190 60% 45%)", "hsl(95 45% 45%)",
"hsl(350 70% 50%)", "hsl(55 65% 50%)"];


export default function MijnPeloton() {
  const { toast } = useToast();
  const myTeam = mockTeams[0];
  const [selectedGame, setSelectedGame] = useState(myGames[0].id);
  const [gameTab, setGameTab] = useState("team");
  const [uitslagenView, setUitslagenView] = useState<"etappes" | "poule" | "giro">("etappes");
  const [selectedPool, setSelectedPool] = useState<string | null>(null);
  const [newPoolName, setNewPoolName] = useState("");
  const [newPoolCode, setNewPoolCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedStage, setSelectedStage] = useState(0);
  const [comparePlayerName, setComparePlayerName] = useState("");
  const [subpoolComparePlayer, setSubpoolComparePlayer] = useState("");
  const [compareView, setCompareView] = useState<"gc" | number>("gc");
  const [subpoolCompareView, setSubpoolCompareView] = useState<"gc" | number>("gc");

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

  // Compute stage pool standings for current stage
  const stagePoolData = useMemo(() => {
    const standings = getStagePoolStandings(selectedStage);
    return getTruncatedStandings(standings, 10, myTeam.userName);
  }, [selectedStage]);

  // Overall pool standings (top10 + user)
  const overallPoolData = useMemo(() => {
    return getTruncatedStandings(allPoolParticipants, 10, myTeam.userName);
  }, []);

  const getCategoryName = (catId: number) =>
  riderCategories.find((c) => c.id === catId)?.name || `Cat ${catId}`;

  /* ── Sub-pool detail view ── */
  if (activePool) {
    const subpoolCompareTeam = activePool.isExpanded ?
    subpoolTeams.find((t) => t.userName === subpoolComparePlayer && t.userName !== myTeam.userName) :
    mockTeams.find((t) => t.userName === subpoolComparePlayer && t.id !== myTeam.id);
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
          <div className="lg:col-span-3 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <StatCard icon={<Trophy className="h-5 w-5 text-primary" />} label="Leider" value={activePool.standings[0]?.userName || "—"} />
            <StatCard icon={<TrendingUp className="h-5 w-5 text-primary" />} label="Hoogste score" value={`${activePool.standings[0]?.totalPoints || 0} pt`} />
            <StatCard icon={<Target className="h-5 w-5 text-primary" />} label="Gemiddelde" value={`${Math.round(activePool.standings.reduce((s, t) => s + t.totalPoints, 0) / (activePool.standings.length || 1))} pt`} />
            <StatCard icon={<Award className="h-5 w-5 text-primary" />} label="Jouw positie" value={`#${activePool.standings.findIndex((t) => t.userName === myTeam.userName) + 1}`} />
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
                    team.userName === myTeam.userName && "bg-primary/10"
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
                    <ChartTooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const sorted = [...payload].
                        filter((p) => p.value != null).
                        sort((a, b) => (b.value as number) - (a.value as number));
                        return (
                          <div className="rounded-md border border-border bg-background p-2.5 shadow-lg text-xs min-w-[140px]">
                            <p className="font-display font-bold mb-1.5 text-sm">{label}</p>
                            {sorted.map((entry, idx) =>
                            <div key={entry.dataKey} className="flex items-center justify-between gap-3 py-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-display font-bold text-muted-foreground w-4 text-right">{idx + 1}.</span>
                                  <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: entry.color }} />
                                
                                  <span className="font-sans font-medium">{entry.dataKey}</span>
                                </div>
                                <span className="font-display font-bold tabular-nums">{entry.value} pt</span>
                              </div>
                            )}
                          </div>);

                      }} />
                    
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

          {/* Team comparison - same format as Mijn Team */}
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
                    {activePool.standings.
                    filter((t) => t.id !== myTeam.id).
                    map((t) =>
                    <button
                      key={t.id}
                      onClick={() => {
                        setSubpoolComparePlayer(subpoolComparePlayer === t.userName ? "" : t.userName);
                        setSubpoolCompareView("gc");
                      }}
                      className={cn(
                        "px-3 py-1.5 text-sm font-bold rounded-md border-2 transition-all",
                        subpoolComparePlayer === t.userName ?
                        "border-primary bg-primary text-primary-foreground" :
                        "border-border hover:border-muted-foreground"
                      )}>
                      
                          {t.userName}
                        </button>
                    )}
                  </div>
                </div>

                {subpoolCompareTeam ? (() => {
                  const getSubpoolPointsForView = (riderNumber: number) => {
                    if (subpoolCompareView === "gc") return getRiderPoints(riderNumber);
                    const stage = mockStageResults[subpoolCompareView];
                    if (!stage) return 0;
                    const result = stage.top20.find((r) => r.riderNumber === riderNumber);
                    return result ? pointsTable[result.position] || 0 : 0;
                  };

                  const riderRows = Object.entries(myTeam.picks).
                  map(([catId, rider]) => {
                    const myPts = getSubpoolPointsForView(rider.number);
                    const otherRider = subpoolCompareTeam.picks[Number(catId)];
                    const otherPts = otherRider ? getSubpoolPointsForView(otherRider.number) : 0;
                    const isSame = otherRider?.number === rider.number;
                    return { catId, rider, myPts, otherRider, otherPts, isSame };
                  }).
                  sort((a, b) => b.myPts - a.myPts);

                  const myTotal = riderRows.reduce((s, r) => s + r.myPts, 0);
                  const otherTotal = riderRows.reduce((s, r) => s + r.otherPts, 0);

                  const stageBreakdown = mockStageResults.map((stage, idx) => {
                    const myPts = Object.values(myTeam.picks).reduce((sum, rider) => {
                      const r = stage.top20.find((s) => s.riderNumber === rider.number);
                      return sum + (r ? pointsTable[r.position] || 0 : 0);
                    }, 0);
                    const otherPts = Object.values(subpoolCompareTeam.picks).reduce((sum, rider) => {
                      const r = stage.top20.find((s) => s.riderNumber === rider.number);
                      return sum + (r ? pointsTable[r.position] || 0 : 0);
                    }, 0);
                    return { stage: stage.stage, idx, myPts, otherPts, type: stage.type };
                  });

                  // Joker points
                  const myJokerRows = myTeam.jokers.map((j) => ({
                    ...j,
                    pts: getSubpoolPointsForView(j.number)
                  }));
                  const otherJokerRows = subpoolCompareTeam.jokers.map((j) => ({
                    ...j,
                    pts: getSubpoolPointsForView(j.number)
                  }));
                  const myJokerTotal = myJokerRows.reduce((s, j) => s + j.pts, 0);
                  const otherJokerTotal = otherJokerRows.reduce((s, j) => s + j.pts, 0);

                  return (
                    <div className="space-y-4">
                      {/* Score header */}
                      <div className="grid grid-cols-2 gap-3 md:gap-4">
                        <Card className={cn("retro-border", myTotal >= otherTotal && "ring-2 ring-primary")}>
                          <CardContent className="p-4 text-center">
                            <p className="text-xs text-muted-foreground font-sans mb-1">Jouw team</p>
                            <p className="font-display text-2xl md:text-3xl font-bold text-primary">{myTeam.userName}</p>
                            <p className="font-display text-3xl md:text-4xl font-bold text-accent mt-1">{myTotal} pt</p>
                            {myTotal > otherTotal && <span className="text-xs font-sans text-primary mt-1 inline-block">🏆 Winnaar</span>}
                          </CardContent>
                        </Card>
                        <Card className={cn("retro-border", otherTotal > myTotal && "ring-2 ring-primary")}>
                          <CardContent className="p-4 text-center">
                            <p className="text-xs text-muted-foreground font-sans mb-1">Tegenstander</p>
                            <p className="font-display text-2xl md:text-3xl font-bold text-foreground">{subpoolCompareTeam.userName}</p>
                            <p className="font-display text-3xl md:text-4xl font-bold text-accent mt-1">{otherTotal} pt</p>
                            {otherTotal > myTotal && <span className="text-xs font-sans text-primary mt-1 inline-block">🏆 Winnaar</span>}
                          </CardContent>
                        </Card>
                      </div>

                      {/* GC / Stage selector */}
                      <StageRoadbook
                        selectedStage={typeof subpoolCompareView === "number" ? subpoolCompareView : 0}
                        onSelectStage={(i) => setSubpoolCompareView(i)}
                        showGcButton
                        gcSelected={subpoolCompareView === "gc"}
                        onSelectGc={() => setSubpoolCompareView("gc")}
                        compact />
                      

                      {/* Combined comparison card */}
                      <Card className="retro-border overflow-hidden">
                        <CardHeader className="border-b-2 border-foreground bg-secondary/50 py-2 px-3 md:py-3 md:px-4">
                          <CardTitle className="font-display text-sm md:text-base">
                            {subpoolCompareView === "gc" ? "🚴 Vergelijking — Algemeen Klassement" : `🚴 Vergelijking — Rit ${mockStageResults[subpoolCompareView as number]?.stage}`}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                          {/* Column headers */}
                          <div className="grid grid-cols-[1fr_auto_1fr] text-xs font-display border-b border-border bg-muted/30">
                            <div className="px-3 py-2 text-left">{myTeam.userName}</div>
                            <div className="px-2 py-2 text-center text-muted-foreground">Categorie</div>
                            <div className="px-3 py-2 text-right">{subpoolCompareTeam.userName}</div>
                          </div>

                          {/* Stage-by-stage rows (GC only) */}
                          {subpoolCompareView === "gc" &&
                          <>
                              <div className="px-3 py-2 bg-secondary/40 border-b border-border">
                                <span className="text-xs font-display font-bold text-muted-foreground uppercase tracking-wider">📊 Punten per etappe</span>
                              </div>
                              {stageBreakdown.map(({ stage, idx, myPts, otherPts, type }, i) => {
                              const diff = myPts - otherPts;
                              const stageIcon = type === "mountain" ? "⛰️" : type === "itt" ? "⏱️" : type === "flat" ? "🏁" : "〰️";
                              return (
                                <button
                                  key={stage}
                                  onClick={() => setSubpoolCompareView(idx)}
                                  className={cn(
                                    "w-full grid grid-cols-[1fr_auto_1fr] items-center text-sm border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors",
                                    i % 2 === 0 ? "bg-background" : "bg-muted/20"
                                  )}>
                                  
                                    <div className="px-3 py-2.5 text-right">
                                      <span className={cn("font-display font-bold tabular-nums text-base",

                                    myPts > otherPts ? "text-primary" : myPts < otherPts ? "text-destructive" : "text-muted-foreground"
                                    )}>{myPts} pt</span>
                                    </div>
                                    <div className="px-2 py-2 flex flex-col items-center min-w-[90px]">
                                      <span className="font-display font-bold text-base">{stageIcon} Rit {stage}</span>
                                      {diff !== 0 &&
                                    <span className={cn("font-display font-bold px-2 py-0.5 rounded-full mt-0.5 text-base",

                                    diff > 0 ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"
                                    )}>{diff > 0 ? `+${diff}` : diff}</span>
                                    }
                                    </div>
                                    <div className="px-3 py-2.5 text-left">
                                      <span className={cn("font-display font-bold tabular-nums text-base",

                                    otherPts > myPts ? "text-primary" : otherPts < myPts ? "text-destructive" : "text-muted-foreground"
                                    )}>{otherPts} pt</span>
                                    </div>
                                  </button>);

                            })}
                            </>
                          }

                          {/* Rider-by-rider section */}
                          <div className="px-3 py-2 bg-secondary/40 border-b border-border border-t-2 border-t-foreground">
                            <span className="text-xs font-display font-bold text-muted-foreground uppercase tracking-wider">
                              🚴 Renner voor renner {subpoolCompareView !== "gc" && `— Rit ${mockStageResults[subpoolCompareView as number]?.stage}`}
                            </span>
                          </div>

                          {riderRows.map(({ catId, rider, myPts, otherRider, otherPts, isSame }, idx) => {
                            const diff = myPts - otherPts;
                            return (
                              <div
                                key={catId}
                                className={cn(
                                  "grid grid-cols-[1fr_auto_1fr] items-center text-sm border-b border-border last:border-b-0",
                                  idx % 2 === 0 ? "bg-background" : "bg-muted/20",
                                  isSame && "bg-accent/10"
                                )}>
                                
                                <div className="px-3 py-2.5 flex items-center gap-2">
                                  <div className="flex-1 min-w-0">
                                    <span className="font-sans font-medium text-sm block truncate">
                                      {rider.name} <span className="text-muted-foreground">#{rider.number}</span>
                                    </span>
                                  </div>
                                  <span className={cn("font-display font-bold shrink-0 tabular-nums text-base",

                                  diff > 0 ? "text-primary" : diff < 0 ? "text-destructive" : "text-muted-foreground"
                                  )}>{myPts} pt</span>
                                </div>
                                <div className="px-1 md:px-2 py-2 flex flex-col items-center gap-0.5 min-w-[70px] md:min-w-[90px]">
                                  <span className="text-muted-foreground font-sans truncate max-w-full text-center text-sm">
                                    {getCategoryName(Number(catId))}
                                  </span>
                                  {isSame ?
                                  <span className="jersey-badge bg-accent text-accent-foreground text-xs px-1.5 py-0.5">🤝 Zelfde</span> :
                                  diff !== 0 ?
                                  <span className={cn("font-display font-bold px-2 py-0.5 rounded-full text-base",

                                  diff > 0 ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"
                                  )}>{diff > 0 ? `+${diff}` : diff}</span> :
                                  null}
                                </div>
                                <div className="px-3 py-2.5 flex items-center gap-2 justify-end">
                                  <span className={cn("font-display font-bold shrink-0 tabular-nums text-base",

                                  otherPts > myPts ? "text-primary" : otherPts < myPts ? "text-destructive" : "text-muted-foreground"
                                  )}>{otherPts} pt</span>
                                  <div className="flex-1 min-w-0 text-right">
                                    <span className="font-sans font-medium text-sm block truncate">
                                      {otherRider?.name || "—"} {otherRider && <span className="text-muted-foreground">#{otherRider.number}</span>}
                                    </span>
                                  </div>
                                </div>
                              </div>);

                          })}

                          {/* Rider totals */}
                          <div className="grid grid-cols-[1fr_auto_1fr] items-center bg-secondary/50 border-t-2 border-foreground">
                            <div className="px-3 py-3 text-right">
                              <span className="font-display font-bold text-base md:text-lg text-accent">{myTotal} pt</span>
                            </div>
                            <div className="px-2 py-3 text-center">
                              <span className={cn(
                                "font-display font-bold text-base px-2 py-1 rounded-md",
                                myTotal > otherTotal ? "bg-primary/15 text-primary" : myTotal < otherTotal ? "bg-destructive/15 text-destructive" : "text-muted-foreground"
                              )}>{myTotal - otherTotal > 0 ? `+${myTotal - otherTotal}` : myTotal - otherTotal}</span>
                            </div>
                            <div className="px-3 py-3 text-left">
                              <span className="font-display font-bold text-base md:text-lg text-accent">{otherTotal} pt</span>
                            </div>
                          </div>

                          {/* Jokers section */}
                          <div className="px-3 py-2 bg-secondary/40 border-b border-border border-t-2 border-t-foreground">
                            <span className="text-xs font-display font-bold text-muted-foreground uppercase tracking-wider">🃏 Jokers</span>
                          </div>
                          {myJokerRows.map((j, idx) => {
                            const otherJ = otherJokerRows[idx];
                            const diff = otherJ ? j.pts - otherJ.pts : 0;
                            return (
                              <div
                                key={j.number}
                                className={cn(
                                  "grid grid-cols-[1fr_auto_1fr] items-center text-sm border-b border-border",
                                  idx % 2 === 0 ? "bg-background" : "bg-muted/20"
                                )}>
                                
                                <div className="px-3 py-2.5 flex items-center gap-2">
                                  <div className="flex-1 min-w-0">
                                    <span className="font-sans font-medium text-sm block truncate">
                                      {j.name} <span className="text-muted-foreground">#{j.number}</span>
                                    </span>
                                  </div>
                                  <span className={cn(
                                    "font-display font-bold text-sm shrink-0 tabular-nums",
                                    diff > 0 ? "text-primary" : diff < 0 ? "text-destructive" : "text-muted-foreground"
                                  )}>{j.pts} pt</span>
                                </div>
                                <div className="px-1 md:px-2 py-2 flex flex-col items-center gap-0.5 min-w-[70px] md:min-w-[90px]">
                                  <span className="text-xs text-muted-foreground font-sans">Joker {idx + 1}</span>
                                  {otherJ && diff !== 0 &&
                                  <span className={cn(
                                    "text-sm font-display font-bold px-2 py-0.5 rounded-full",
                                    diff > 0 ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"
                                  )}>{diff > 0 ? `+${diff}` : diff}</span>
                                  }
                                </div>
                                <div className="px-3 py-2.5 flex items-center gap-2 justify-end">
                                  {otherJ ?
                                  <>
                                      <span className={cn(
                                      "font-display font-bold text-sm shrink-0 tabular-nums",
                                      otherJ.pts > j.pts ? "text-primary" : otherJ.pts < j.pts ? "text-destructive" : "text-muted-foreground"
                                    )}>{otherJ.pts} pt</span>
                                      <div className="flex-1 min-w-0 text-right">
                                        <span className="font-sans font-medium text-sm block truncate">
                                          {otherJ.name} <span className="text-muted-foreground">#{otherJ.number}</span>
                                        </span>
                                      </div>
                                    </> :

                                  <span className="text-muted-foreground">—</span>
                                  }
                                </div>
                              </div>);

                          })}
                          {/* Show extra jokers from opponent if they have more */}
                          {otherJokerRows.slice(myJokerRows.length).map((j, idx) =>
                          <div
                            key={j.number}
                            className={cn(
                              "grid grid-cols-[1fr_auto_1fr] items-center text-sm border-b border-border",
                              (myJokerRows.length + idx) % 2 === 0 ? "bg-background" : "bg-muted/20"
                            )}>
                            
                              <div className="px-3 py-2.5 text-muted-foreground">—</div>
                              <div className="px-1 md:px-2 py-2 flex flex-col items-center gap-0.5 min-w-[70px] md:min-w-[90px]">
                                <span className="text-xs text-muted-foreground font-sans">Joker {myJokerRows.length + idx + 1}</span>
                              </div>
                              <div className="px-3 py-2.5 flex items-center gap-2 justify-end">
                                <span className="font-display font-bold text-sm shrink-0 tabular-nums text-primary">{j.pts} pt</span>
                                <div className="flex-1 min-w-0 text-right">
                                  <span className="font-sans font-medium text-xs md:text-sm block truncate">
                                    {j.name} <span className="text-muted-foreground">#{j.number}</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Joker totals */}
                          <div className="grid grid-cols-[1fr_auto_1fr] items-center bg-secondary/50 border-t-2 border-foreground">
                            <div className="px-3 py-3 text-right">
                              <span className="font-display font-bold text-base md:text-lg text-accent">{myJokerTotal} pt</span>
                            </div>
                            <div className="px-2 py-3 text-center">
                              <span className={cn(
                                "font-display font-bold text-base px-2 py-1 rounded-md",
                                myJokerTotal > otherJokerTotal ? "bg-primary/15 text-primary" : myJokerTotal < otherJokerTotal ? "bg-destructive/15 text-destructive" : "text-muted-foreground"
                              )}>{myJokerTotal - otherJokerTotal > 0 ? `+${myJokerTotal - otherJokerTotal}` : myJokerTotal - otherJokerTotal}</span>
                            </div>
                            <div className="px-3 py-3 text-left">
                              <span className="font-display font-bold text-base md:text-lg text-accent">{otherJokerTotal} pt</span>
                            </div>
                          </div>

                          {/* Predictions section */}
                          <div className="px-3 py-2 bg-secondary/40 border-b border-border border-t-2 border-t-foreground">
                            <span className="text-xs font-display font-bold text-muted-foreground uppercase tracking-wider">🏆 Voorspellingen</span>
                          </div>
                          {(() => {
                            // Check predictions against actual classifications
                            const gcTop3 = mockClassifications.gc.slice(0, 3).map((r) => r.riderName);
                            const actualPointsJersey = mockClassifications.points[0]?.riderName || "";
                            const actualMountainJersey = mockClassifications.kom[0]?.riderName || "";
                            const actualYouthJersey = mockClassifications.youth[0]?.riderName || "";

                            const calcGcPts = (pick: string, position: number) => {
                              if (gcTop3[position] === pick) return classificationPoints.correctPositionCorrectRider;
                              if (gcTop3.includes(pick)) return classificationPoints.correctRiderWrongPosition;
                              return 0;
                            };

                            const calcJerseyPts = (pick: string, actual: string) => {
                              return pick === actual ? classificationPoints.correctJerseyWinner : 0;
                            };

                            const predictionRows = [
                            ...myTeam.predictions.gcPodium.map((name, i) => {
                              const myPts = calcGcPts(name, i);
                              const otherName = subpoolCompareTeam.predictions.gcPodium[i] || "";
                              const otherPts = calcGcPts(otherName, i);
                              return {
                                label: i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉",
                                myPick: name,
                                otherPick: otherName || "—",
                                myPts,
                                otherPts
                              };
                            }),
                            {
                              label: "🟢 Puntentrui",
                              myPick: myTeam.predictions.pointsJersey,
                              otherPick: subpoolCompareTeam.predictions.pointsJersey,
                              myPts: calcJerseyPts(myTeam.predictions.pointsJersey, actualPointsJersey),
                              otherPts: calcJerseyPts(subpoolCompareTeam.predictions.pointsJersey, actualPointsJersey)
                            },
                            {
                              label: "🔴 Bergtrui",
                              myPick: myTeam.predictions.mountainJersey,
                              otherPick: subpoolCompareTeam.predictions.mountainJersey,
                              myPts: calcJerseyPts(myTeam.predictions.mountainJersey, actualMountainJersey),
                              otherPts: calcJerseyPts(subpoolCompareTeam.predictions.mountainJersey, actualMountainJersey)
                            },
                            {
                              label: "⚪ Jongerentrui",
                              myPick: myTeam.predictions.youthJersey,
                              otherPick: subpoolCompareTeam.predictions.youthJersey,
                              myPts: calcJerseyPts(myTeam.predictions.youthJersey, actualYouthJersey),
                              otherPts: calcJerseyPts(subpoolCompareTeam.predictions.youthJersey, actualYouthJersey)
                            }];


                            const myPredTotal = predictionRows.reduce((s, r) => s + r.myPts, 0);
                            const otherPredTotal = predictionRows.reduce((s, r) => s + r.otherPts, 0);

                            return (
                              <>
                                {predictionRows.map((row, idx) => {
                                  const isSame = row.myPick === row.otherPick;
                                  const diff = row.myPts - row.otherPts;
                                  return (
                                    <div
                                      key={row.label}
                                      className={cn(
                                        "grid grid-cols-[1fr_auto_1fr] items-center text-sm border-b border-border",
                                        idx % 2 === 0 ? "bg-background" : "bg-muted/20",
                                        isSame && "bg-accent/10"
                                      )}>
                                      
                                      <div className="px-3 py-2.5 flex items-center gap-2">
                                        <div className="flex-1 min-w-0">
                                          <span className="font-sans font-medium text-sm block truncate">
                                            {row.myPick}
                                          </span>
                                        </div>
                                        <span className={cn(
                                          "font-display font-bold text-sm shrink-0 tabular-nums",
                                          diff > 0 ? "text-primary" : diff < 0 ? "text-destructive" : "text-muted-foreground"
                                        )}>{row.myPts} pt</span>
                                      </div>
                                      <div className="px-1 md:px-2 py-2 flex flex-col items-center gap-0.5 min-w-[70px] md:min-w-[100px]">
                                        <span className="text-muted-foreground font-sans text-center text-sm">
                                          {row.label}
                                        </span>
                                        {isSame ?
                                        <span className="jersey-badge bg-accent text-accent-foreground text-xs px-1.5 py-0.5">🤝 Zelfde</span> :
                                        diff !== 0 ?
                                        <span className={cn(
                                          "text-sm font-display font-bold px-2 py-0.5 rounded-full",
                                          diff > 0 ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"
                                        )}>{diff > 0 ? `+${diff}` : diff}</span> :
                                        null}
                                      </div>
                                      <div className="px-3 py-2.5 flex items-center gap-2 justify-end">
                                        <span className={cn(
                                          "font-display font-bold text-sm shrink-0 tabular-nums",
                                          row.otherPts > row.myPts ? "text-primary" : row.otherPts < row.myPts ? "text-destructive" : "text-muted-foreground"
                                        )}>{row.otherPts} pt</span>
                                        <div className="flex-1 min-w-0 text-right">
                                          <span className="font-sans font-medium text-sm block truncate">
                                            {row.otherPick}
                                          </span>
                                        </div>
                                      </div>
                                    </div>);

                                })}
                                {/* Prediction totals */}
                                <div className="grid grid-cols-[1fr_auto_1fr] items-center bg-secondary/50 border-t-2 border-foreground">
                                  <div className="px-3 py-3 text-right">
                                    <span className="font-display font-bold text-base md:text-lg text-accent">{myPredTotal} pt</span>
                                  </div>
                                  <div className="px-2 py-3 text-center">
                                    <span className={cn(
                                      "font-display font-bold text-base px-2 py-1 rounded-md",
                                      myPredTotal > otherPredTotal ? "bg-primary/15 text-primary" : myPredTotal < otherPredTotal ? "bg-destructive/15 text-destructive" : "text-muted-foreground"
                                    )}>{myPredTotal - otherPredTotal > 0 ? `+${myPredTotal - otherPredTotal}` : myPredTotal - otherPredTotal}</span>
                                  </div>
                                  <div className="px-3 py-3 text-left">
                                    <span className="font-display font-bold text-base md:text-lg text-accent">{otherPredTotal} pt</span>
                                  </div>
                                </div>
                              </>);

                          })()}
                        </CardContent>
                      </Card>
                    </div>);

                })() :
                <p className="text-sm text-muted-foreground font-sans">Kies een speler om teams te vergelijken.</p>
                }
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

          {/* Panache Score heatmap */}
          {activePool.isExpanded && (() => {
            const uniqueness = computeUniqueness(subpoolTeams);
            const pickCounts = computePickCounts(subpoolTeams);
            const sortedTeams = activePool.standings;
            const categories = riderCategories;
            const totalPlayers = subpoolTeams.length;

            const avgUniqueness = sortedTeams.map((t) => {
              const playerMap = uniqueness.get(t.userName);
              if (!playerMap) return { name: t.userName, avg: 0 };
              const vals = Array.from(playerMap.values());
              return { name: t.userName, avg: vals.reduce((a, b) => a + b, 0) / vals.length };
            });

            // Higher contrast color function
            const getCellBg = (score: number) => {
              if (score >= 0.9) return "hsl(150 70% 30%)"; // dark green — unique
              if (score >= 0.7) return "hsl(150 55% 42%)"; // medium green
              if (score >= 0.5) return "hsl(45 70% 55%)"; // amber — middle
              if (score >= 0.3) return "hsl(15 70% 65%)"; // orange — common
              return "hsl(0 65% 75%)"; // light red — very common
            };

            return (
              <div className="lg:col-span-3">
                <Card className="retro-border">
                  <CardHeader className="border-b-2 border-foreground bg-secondary/50 py-3 px-4">
                    <CardTitle className="font-display text-base flex items-center gap-2">
                      🎯 Panache Score
                    </CardTitle>
                    <p className="text-xs text-muted-foreground font-sans mt-1">
                      Hoe uniek zijn jouw keuzes? Donkerder = jij bent de enige met die renner. Lichter = populaire keuze.
                    </p>
                  </CardHeader>
                  <CardContent className="p-4">
                    {/* Legend */}
                    <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground font-sans">
                      <span>Populair</span>
                      <div className="flex gap-0.5">
                        {[0, 0.15, 0.35, 0.6, 0.8, 1].map((v) =>
                        <div
                          key={v}
                          className="w-5 h-3 rounded-sm"
                          style={{ backgroundColor: getCellBg(v) }} />

                        )}
                      </div>
                      <span>Uniek</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr>
                            <th className="text-left px-2 py-1.5 font-display text-muted-foreground sticky left-0 bg-background z-10 min-w-[120px]">
                              Categorie
                            </th>
                            {sortedTeams.map((t) =>
                            <th
                              key={t.id}
                              className={cn(
                                "px-1 py-1.5 font-display text-center min-w-[60px] max-w-[80px]",
                                t.userName === myTeam.userName && "text-primary"
                              )}>
                              
                                <span className="block truncate">{t.userName}</span>
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {categories.map((cat) =>
                          <tr key={cat.id} className="border-t border-border/50">
                              <td className="text-left px-2 py-1 font-sans text-muted-foreground sticky left-0 bg-background z-10 truncate max-w-[120px]" title={cat.name}>
                                {cat.name}
                              </td>
                              {sortedTeams.map((t) => {
                              const playerMap = uniqueness.get(t.userName);
                              const score = playerMap?.get(cat.id) ?? 0;
                              const pick = t.picks[cat.id];
                              const catCounts = pickCounts.get(cat.id);
                              const count = pick ? catCounts?.get(pick.number) ?? 1 : 0;
                              const othersCount = count - 1;
                              return (
                                <td key={t.id} className="px-0.5 py-0.5 text-center">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div
                                        className="rounded-sm px-1 py-1.5 flex items-center justify-center cursor-default transition-colors"
                                        style={{ backgroundColor: getCellBg(score) }}>
                                        
                                          <span
                                          className={cn(
                                            "truncate block text-[9px] md:text-[10px] font-bold leading-tight",
                                            score >= 0.7 ? "text-white" : "text-foreground"
                                          )}>
                                          
                                            {pick?.name ?? "—"}
                                          </span>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="text-xs space-y-0.5 max-w-[180px]">
                                        <p className="font-display font-bold">{pick?.name ?? "—"} <span className="text-muted-foreground font-sans">#{pick?.number}</span></p>
                                        <p className="text-muted-foreground font-sans">
                                          {othersCount === 0 ?
                                        "Unieke keuze! 🔥" :
                                        `${othersCount} ander${othersCount > 1 ? "en" : ""} kozen ook deze renner`}
                                        </p>
                                        <p className="font-sans text-muted-foreground">{count}/{totalPlayers} spelers</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </td>);

                            })}
                            </tr>
                          )}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-foreground">
                            <td className="text-left px-2 py-2 font-display font-bold text-xs sticky left-0 bg-background z-10">
                              Panache Score
                            </td>
                            {avgUniqueness.map((a) =>
                            <td key={a.name} className="text-center px-1 py-2">
                                <span className={cn(
                                "font-display font-bold text-xs",
                                a.avg > 0.6 ? "text-primary" : a.avg > 0.4 ? "text-accent" : "text-muted-foreground"
                              )}>
                                  {Math.round(a.avg * 100)}%
                                </span>
                              </td>
                            )}
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>);

          })()}
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
              "text-primary-foreground" :
              "border-border hover:border-muted-foreground"
            )}
            style={selectedGame === game.id ? {
              background: `linear-gradient(135deg, ${game.colors[0]}, ${game.colors[1]}, ${game.colors[2]})`,
              borderColor: game.colors[0],
              color: game.id === "vuelta2026" ? "#fff" : undefined
            } : undefined}>
            
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
          <TabsList className="w-full retro-border h-auto p-1 grid grid-cols-2 md:grid-cols-5 gap-1">
            <TabsTrigger value="team" className="font-display text-xs md:text-sm px-2 md:px-3">
              🚴‍♂️🚴 Mijn Team
            </TabsTrigger>
            <TabsTrigger value="uitslagen" className="font-display text-xs md:text-sm px-2 md:px-3">
              📋 Uitslagen
            </TabsTrigger>
            <TabsTrigger value="subpoules" className="font-display text-xs md:text-sm px-2 md:px-3">
              👥 Subpoules
            </TabsTrigger>
            <TabsTrigger value="palmares" className="font-display text-xs md:text-sm px-2 md:px-3">
              🏅 Palmares
            </TabsTrigger>
            <TabsTrigger value="watals" className="font-display text-xs md:text-sm px-2 md:px-3">
              ⛰️ Hors Cat.
            </TabsTrigger>
          </TabsList>

          {/* ── TAB: Mijn Team ── */}
          <TabsContent value="team" className="mt-6">
            {(() => {
              const compareTeam = mockTeams.find(
                (t) => t.userName.toLowerCase() === comparePlayerName.trim().toLowerCase() && t.id !== myTeam.id
              );

              // Points calculator: GC (all stages) or single stage
              const getPointsForView = (riderNumber: number) => {
                if (compareView === "gc") return getRiderPoints(riderNumber);
                const stage = mockStageResults[compareView];
                if (!stage) return 0;
                const result = stage.top20.find((r) => r.riderNumber === riderNumber);
                return result ? pointsTable[result.position] || 0 : 0;
              };

              const riderRows = Object.entries(myTeam.picks).
              map(([catId, rider]) => {
                const myPts = getPointsForView(rider.number);
                const otherRider = compareTeam?.picks[Number(catId)];
                const otherPts = otherRider ? getPointsForView(otherRider.number) : 0;
                const isSame = otherRider?.number === rider.number;
                return { catId, rider, myPts, otherRider, otherPts, isSame };
              }).
              sort((a, b) => b.myPts - a.myPts);

              const myTotal = riderRows.reduce((s, r) => s + r.myPts, 0);
              const otherTotal = compareTeam ? riderRows.reduce((s, r) => s + r.otherPts, 0) : 0;

              // Per-stage totals for the stage overview
              const stageBreakdown = mockStageResults.map((stage, idx) => {
                const myPts = Object.values(myTeam.picks).reduce((sum, rider) => {
                  const r = stage.top20.find((s) => s.riderNumber === rider.number);
                  return sum + (r ? pointsTable[r.position] || 0 : 0);
                }, 0);
                const otherPts = compareTeam ? Object.values(compareTeam.picks).reduce((sum, rider) => {
                  const r = stage.top20.find((s) => s.riderNumber === rider.number);
                  return sum + (r ? pointsTable[r.position] || 0 : 0);
                }, 0) : 0;
                return { stage: stage.stage, idx, myPts, otherPts, type: stage.type };
              });

              return (
                <div className="space-y-6">
              {/* Compare input bar */}
              <Card className="retro-border">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <ArrowLeftRight className="h-5 w-5 text-primary shrink-0" />
                    <span className="text-sm font-display font-bold whitespace-nowrap">Vergelijk teams</span>
                    <Input
                          value={comparePlayerName}
                          onChange={(e) => setComparePlayerName(e.target.value)}
                          placeholder="Typ een spelersnaam..."
                          className="h-9 text-sm flex-1 min-w-[140px] max-w-[240px]" />
                        
                    {comparePlayerName && !compareTeam &&
                        <span className="text-xs text-destructive font-sans">Niet gevonden</span>
                        }
                    {compareTeam &&
                        <Button variant="ghost" size="sm" onClick={() => setComparePlayerName("")} className="text-xs h-7">
                        ✕ Wis
                      </Button>
                        }
                  </div>
                </CardContent>
              </Card>

              {compareTeam ? (
                  /* ── Side-by-side comparison view ── */
                  <div className="space-y-4">
                  {/* Score header */}
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <Card className={cn("retro-border", myTotal >= otherTotal && "ring-2 ring-primary")}>
                      <CardContent className="p-4 text-center">
                        <p className="text-xs text-muted-foreground font-sans mb-1">Jouw team</p>
                        <p className="font-display text-2xl md:text-3xl font-bold text-primary">{myTeam.userName}</p>
                        <p className="font-display text-3xl md:text-4xl font-bold text-accent mt-1">{myTotal} pt</p>
                        {compareView !== "gc" &&
                          <p className="text-[10px] text-muted-foreground font-sans mt-0.5">Rit {mockStageResults[compareView as number]?.stage}</p>
                          }
                        {myTotal > otherTotal && <span className="text-xs font-sans text-primary mt-1 inline-block">🏆 Winnaar</span>}
                      </CardContent>
                    </Card>
                    <Card className={cn("retro-border", otherTotal > myTotal && "ring-2 ring-primary")}>
                      <CardContent className="p-4 text-center">
                        <p className="text-xs text-muted-foreground font-sans mb-1">Tegenstander</p>
                        <p className="font-display text-2xl md:text-3xl font-bold text-foreground">{compareTeam.userName}</p>
                        <p className="font-display text-3xl md:text-4xl font-bold text-accent mt-1">{otherTotal} pt</p>
                        {compareView !== "gc" &&
                          <p className="text-[10px] text-muted-foreground font-sans mt-0.5">Rit {mockStageResults[compareView as number]?.stage}</p>
                          }
                        {otherTotal > myTotal && <span className="text-xs font-sans text-primary mt-1 inline-block">🏆 Winnaar</span>}
                      </CardContent>
                    </Card>
                  </div>

                  {/* GC / Stage selector */}
                  <StageRoadbook
                      selectedStage={typeof compareView === "number" ? compareView : 0}
                      onSelectStage={(i) => setCompareView(i)}
                      showGcButton
                      gcSelected={compareView === "gc"}
                      onSelectGc={() => setCompareView("gc")}
                      compact />
                    

                  {/* Stage-by-stage overview (only in GC view) */}
                  {compareView === "gc" &&
                    <Card className="retro-border overflow-hidden">
                      <CardHeader className="border-b-2 border-foreground bg-secondary/50 py-2 px-3 md:py-3 md:px-4">
                        <CardTitle className="font-display text-sm md:text-base">📊 Punten per etappe</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        {stageBreakdown.map(({ stage, idx, myPts, otherPts, type }, i) => {
                          const diff = myPts - otherPts;
                          const stageIcon = type === "mountain" ? "⛰️" : type === "itt" ? "⏱️" : type === "flat" ? "🏁" : "〰️";
                          return (
                            <button
                              key={stage}
                              onClick={() => setCompareView(idx)}
                              className={cn(
                                "w-full grid grid-cols-[1fr_auto_1fr] items-center text-sm border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors",
                                i % 2 === 0 ? "bg-background" : "bg-muted/20"
                              )}>
                              
                              <div className="px-3 py-2.5 text-right">
                                <span className={cn(
                                  "font-display font-bold tabular-nums",
                                  myPts > otherPts ? "text-primary" : myPts < otherPts ? "text-destructive" : "text-muted-foreground"
                                )}>
                                  {myPts} pt
                                </span>
                              </div>
                              <div className="px-2 py-2 flex flex-col items-center min-w-[90px]">
                                <span className="text-xs font-display font-bold">{stageIcon} Rit {stage}</span>
                                {diff !== 0 &&
                                <span className={cn(
                                  "text-[10px] font-display font-bold px-1.5 py-0.5 rounded-full mt-0.5",
                                  diff > 0 ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"
                                )}>
                                    {diff > 0 ? `+${diff}` : diff}
                                  </span>
                                }
                              </div>
                              <div className="px-3 py-2.5 text-left">
                                <span className={cn(
                                  "font-display font-bold tabular-nums",
                                  otherPts > myPts ? "text-primary" : otherPts < myPts ? "text-destructive" : "text-muted-foreground"
                                )}>
                                  {otherPts} pt
                                </span>
                              </div>
                            </button>);

                        })}
                      </CardContent>
                    </Card>
                    }

                  {/* Rider-by-rider comparison */}
                  <Card className="retro-border overflow-hidden">
                    <CardHeader className="border-b-2 border-foreground bg-secondary/50 py-2 px-3 md:py-3 md:px-4">
                      <CardTitle className="font-display text-sm md:text-base">
                        {compareView === "gc" ? "Renner voor renner (totaal)" : `Renner voor renner — Rit ${mockStageResults[compareView as number]?.stage}`}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {/* Table header */}
                      <div className="grid grid-cols-[1fr_auto_1fr] text-xs font-display border-b border-border bg-muted/30">
                        <div className="px-3 py-2 text-left">{myTeam.userName}</div>
                        <div className="px-2 py-2 text-center text-muted-foreground">Categorie</div>
                        <div className="px-3 py-2 text-right">{compareTeam.userName}</div>
                      </div>

                      {riderRows.map(({ catId, rider, myPts, otherRider, otherPts, isSame }, idx) => {
                          const diff = myPts - otherPts;
                          return (
                            <div
                              key={catId}
                              className={cn(
                                "grid grid-cols-[1fr_auto_1fr] items-center text-sm border-b border-border last:border-b-0",
                                idx % 2 === 0 ? "bg-background" : "bg-muted/20",
                                isSame && "bg-accent/10"
                              )}>
                              
                            {/* Left: my rider */}
                            <div className="px-3 py-2.5 flex items-center gap-2">
                              <div className="flex-1 min-w-0">
                                <span className="font-sans font-medium text-xs md:text-sm block truncate">
                                  {rider.name} <span className="text-muted-foreground">#{rider.number}</span>
                                </span>
                              </div>
                              <span className={cn(
                                  "font-display font-bold text-xs shrink-0 tabular-nums",
                                  diff > 0 ? "text-primary" : diff < 0 ? "text-destructive" : "text-muted-foreground"
                                )}>
                                {myPts} pt
                              </span>
                            </div>

                            {/* Center: category + diff indicator */}
                            <div className="px-1 md:px-2 py-2 flex flex-col items-center gap-0.5 min-w-[70px] md:min-w-[90px]">
                              <span className="text-[10px] text-muted-foreground font-sans truncate max-w-full text-center">
                                {getCategoryName(Number(catId))}
                              </span>
                              {isSame ?
                                <span className="jersey-badge bg-accent text-accent-foreground text-[10px] px-1.5 py-0.5">
                                  🤝 Zelfde
                                </span> :
                                diff !== 0 ?
                                <span className={cn(
                                  "text-[10px] font-display font-bold px-1.5 py-0.5 rounded-full",
                                  diff > 0 ?
                                  "bg-primary/15 text-primary" :
                                  "bg-destructive/15 text-destructive"
                                )}>
                                  {diff > 0 ? `+${diff}` : diff}
                                </span> :
                                null}
                            </div>

                            {/* Right: other rider */}
                            <div className="px-3 py-2.5 flex items-center gap-2 justify-end">
                              <span className={cn(
                                  "font-display font-bold text-xs shrink-0 tabular-nums",
                                  otherPts > myPts ? "text-primary" : otherPts < myPts ? "text-destructive" : "text-muted-foreground"
                                )}>
                                {otherPts} pt
                              </span>
                              <div className="flex-1 min-w-0 text-right">
                                <span className="font-sans font-medium text-xs md:text-sm block truncate">
                                  {otherRider?.name || "—"}{" "}
                                  {otherRider && <span className="text-muted-foreground">#{otherRider.number}</span>}
                                </span>
                              </div>
                            </div>
                          </div>);

                        })}

                      {/* Totals row */}
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center bg-secondary/50 border-t-2 border-foreground">
                        <div className="px-3 py-3 text-right">
                          <span className="font-display font-bold text-base md:text-lg text-accent">{myTotal} pt</span>
                        </div>
                        <div className="px-2 py-3 text-center">
                          <span className={cn(
                              "font-display font-bold text-sm px-2 py-1 rounded-md",
                              myTotal > otherTotal ?
                              "bg-primary/15 text-primary" :
                              myTotal < otherTotal ?
                              "bg-destructive/15 text-destructive" :
                              "text-muted-foreground"
                            )}>
                            {myTotal - otherTotal > 0 ? `+${myTotal - otherTotal}` : myTotal - otherTotal}
                          </span>
                        </div>
                        <div className="px-3 py-3 text-left">
                          <span className="font-display font-bold text-base md:text-lg text-accent">{otherTotal} pt</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Jokers & predictions side by side */}
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <Card className="retro-border">
                      <CardHeader className="border-b-2 border-foreground bg-secondary/50 py-2 px-3">
                        <CardTitle className="font-display text-xs md:text-sm">🃏 Jokers — {myTeam.userName}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-3">
                        <div className="flex flex-wrap gap-1.5">
                          {myTeam.jokers.map((j) =>
                            <span key={j.number} className="jersey-badge bg-primary text-primary-foreground text-xs">{j.name}</span>
                            )}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="retro-border">
                      <CardHeader className="border-b-2 border-foreground bg-secondary/50 py-2 px-3">
                        <CardTitle className="font-display text-xs md:text-sm">🃏 Jokers — {compareTeam.userName}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-3">
                        <div className="flex flex-wrap gap-1.5">
                          {compareTeam.jokers.map((j) =>
                            <span key={j.number} className="jersey-badge bg-foreground text-background text-xs">{j.name}</span>
                            )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>) : (

                  /* ── Normal team view (no comparison) ── */
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <Card className="retro-border">
                      <CardHeader className="border-b-2 border-foreground bg-secondary/50 py-2 px-3 md:py-3 md:px-4 flex flex-row items-center justify-between">
                        <CardTitle className="font-display text-sm md:text-base">🚴 Mijn selectie</CardTitle>
                        <span className="font-display text-lg md:text-xl font-bold text-accent">{myTeam.totalPoints} pt</span>
                      </CardHeader>
                      <CardContent className="p-0 divide-y divide-border">
                        {riderRows.map(({ catId, rider, myPts }) =>
                          <div key={catId} className="px-3 md:px-4 py-2 text-sm flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <span className="text-[10px] md:text-xs text-muted-foreground block truncate">
                                {getCategoryName(Number(catId))}
                              </span>
                              <span className="font-medium font-sans text-xs md:text-sm">
                                {rider.name} <span className="text-muted-foreground">#{rider.number}</span>
                              </span>
                            </div>
                            <span className="font-display font-bold text-accent text-xs w-14 text-right shrink-0">
                              {myPts} pt
                            </span>
                          </div>
                          )}
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-6">
                    <Card className="retro-border">
                      <CardHeader className="border-b-2 border-foreground bg-secondary/50 py-3 px-4">
                        <CardTitle className="font-display text-base">🃏 Jokers</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {myTeam.jokers.map((j) =>
                            <span key={j.number} className="jersey-badge bg-primary text-primary-foreground">{j.name} #{j.number}</span>
                            )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="retro-border">
                      <CardHeader className="border-b-2 border-foreground bg-secondary/50 py-3 px-4">
                        <CardTitle className="font-display text-base">🏆 Voorspellingen</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-2 text-sm font-sans">
                        <div>
                          <span className="text-xs text-muted-foreground">Podium:</span>
                          <p className="font-medium flex flex-col">{myTeam.predictions.gcPodium.map((r, i) => <span key={i}>{['🥇', '🥈', '🥉'][i]} {r}</span>)}</p>
                        </div>
                        <p>🟣 {myTeam.predictions.pointsJersey}</p>
                        <p>🔵 {myTeam.predictions.mountainJersey}</p>
                        <p>⚪ {myTeam.predictions.youthJersey}</p>
                      </CardContent>
                    </Card>

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
                </div>)
                  }
            </div>);

            })()}
          </TabsContent>

          {/* ── TAB: Uitslagen ── */}
          <TabsContent value="uitslagen" className="mt-6">
            {/* Sub-navigation: Etappes / Poule Klassement / Giro Klassement */}
            <div className="flex gap-2 mb-5 flex-wrap">
              <button
                onClick={() => setUitslagenView("etappes")}
                className={cn(
                  "px-4 py-2 text-sm font-bold rounded-md border-2 transition-all flex items-center gap-2",
                  uitslagenView === "etappes" ?
                  "border-primary bg-primary text-primary-foreground" :
                  "border-border hover:border-muted-foreground"
                )}>
                
                📋 Etappes
              </button>
              <button
                onClick={() => setUitslagenView("poule")}
                className={cn(
                  "px-4 py-2 text-sm font-bold rounded-md border-2 transition-all flex items-center gap-2",
                  uitslagenView === "poule" ?
                  "border-primary bg-primary text-primary-foreground" :
                  "border-border hover:border-muted-foreground"
                )}>
                
                🏅 Poule Klassement
              </button>
              <button
                onClick={() => setUitslagenView("giro")}
                className={cn(
                  "px-4 py-2 text-sm font-bold rounded-md border-2 transition-all flex items-center gap-2",
                  uitslagenView === "giro" ?
                  "border-primary bg-primary text-primary-foreground" :
                  "border-border hover:border-muted-foreground"
                )}>
                
                🇮🇹 Giro Klassement
              </button>
            </div>

            {/* ── Etappes view ── */}
            {uitslagenView === "etappes" &&
            <>
                {/* Stage selector */}
                <StageRoadbook
                selectedStage={selectedStage}
                onSelectStage={setSelectedStage}
                stagePoints={mockStageResults.map((stage) =>
                stage.top20.
                filter((r) => myRiderNumbers.has(r.riderNumber)).
                reduce((sum, r) => sum + (pointsTable[r.position] || 0), 0)
                )} />
              

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
                  <div className="space-y-4">
                    <Card className="retro-border">
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
                    </Card>

                    {/* Stage pool ranking */}
                    <Card className="retro-border">
                      <CardHeader className="border-b-2 border-foreground bg-secondary/50 py-3 px-4">
                        <CardTitle className="font-display text-base flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-primary" />
                          Daguitslag poule — Rit {mockStageResults[selectedStage].stage}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">{stagePoolData.totalParticipants} deelnemers</p>
                      </CardHeader>
                      <CardContent className="p-0 divide-y divide-border">
                        {stagePoolData.top.map((p) => {
                        const isMe = p.userName === myTeam.userName;
                        return (
                          <div key={p.rank} className={cn(
                            "flex items-center justify-between px-4 py-2.5 text-sm",
                            p.rank <= 3 && "bg-primary/5",
                            isMe && "ring-1 ring-inset ring-primary/30 bg-primary/10"
                          )}>
                              <div className="flex items-center gap-3">
                                <span className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                                p.rank === 1 && "bg-primary text-primary-foreground",
                                p.rank === 2 && "bg-muted text-foreground",
                                p.rank === 3 && "bg-vintage-gold text-primary-foreground",
                                p.rank > 3 && "text-muted-foreground"
                              )}>
                                  {p.rank}
                                </span>
                                <span className={cn("font-sans font-medium", isMe && "text-primary")}>
                                  {p.userName}{isMe && " (jij)"}
                                </span>
                              </div>
                              <span className="font-display font-bold text-accent">{p.stagePoints} pt</span>
                            </div>);

                      })}
                        {stagePoolData.showGap &&
                      <>
                            <div className="px-4 py-2 text-center text-muted-foreground text-xs">⋯</div>
                            {stagePoolData.myEntry &&
                        <div className="flex items-center justify-between px-4 py-2.5 text-sm ring-1 ring-inset ring-primary/30 bg-primary/10">
                                <div className="flex items-center gap-3">
                                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-muted-foreground">
                                    {stagePoolData.myEntry.rank}
                                  </span>
                                  <span className="font-sans font-medium text-primary">
                                    {stagePoolData.myEntry.userName} (jij)
                                  </span>
                                </div>
                                <span className="font-display font-bold text-accent">{stagePoolData.myEntry.stagePoints} pt</span>
                              </div>
                        }
                          </>
                      }
                      </CardContent>
                    </Card>

                    {/* Cumulative per-stage summary */}
                    <Card className="retro-border">
                      <CardContent className="p-4">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                          Punten per rit
                        </h3>
                        <div className="flex gap-2 flex-wrap">
                          {mockStageResults.map((stage, i) => {
                          const stageTotal = stage.top20.
                          filter((r) => myRiderNumbers.has(r.riderNumber)).
                          reduce((sum, r) => sum + (pointsTable[r.position] || 0), 0);
                          return (
                            <button
                              key={stage.stage}
                              onClick={() => setSelectedStage(i)}
                              className={cn(
                                "text-center p-2 rounded-md border min-w-[48px] transition-all",
                                i === selectedStage ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground"
                              )}>
                              
                                <p className="text-[10px] text-muted-foreground">R{stage.stage}</p>
                                <p className="font-display font-bold text-xs">{stageTotal}</p>
                              </button>);

                        })}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </>
            }

            {/* ── Poule Klassement view ── */}
            {uitslagenView === "poule" &&
            <Card className="retro-border">
                <CardHeader className="border-b-2 border-foreground bg-secondary/50 py-3 px-4">
                  <CardTitle className="font-display text-base flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    Poule Klassement
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{overallPoolData.totalParticipants} deelnemers</p>
                </CardHeader>
                <CardContent className="p-0 divide-y divide-border">
                  {overallPoolData.top.map((p) => {
                  const isMe = p.userName === myTeam.userName;
                  return (
                    <div key={p.rank} className={cn(
                      "flex items-center justify-between px-4 py-3 text-sm",
                      p.rank <= 3 && "bg-primary/5",
                      isMe && "ring-1 ring-inset ring-primary/30 bg-primary/10"
                    )}>
                        <div className="flex items-center gap-3">
                          <span className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                          p.rank === 1 && "bg-primary text-primary-foreground",
                          p.rank === 2 && "bg-muted text-foreground",
                          p.rank === 3 && "bg-vintage-gold text-primary-foreground",
                          p.rank > 3 && "text-muted-foreground"
                        )}>
                            {p.rank}
                          </span>
                          <span className={cn("font-sans font-bold", isMe && "text-primary")}>
                            {p.userName}{isMe && " (jij)"}
                          </span>
                        </div>
                        <span className="font-display font-bold text-lg text-accent">
                          {p.totalPoints} pt
                        </span>
                      </div>);

                })}
                  {overallPoolData.showGap &&
                <>
                      <div className="px-4 py-2 text-center text-muted-foreground text-xs">⋯</div>
                      {overallPoolData.myEntry &&
                  <div className="flex items-center justify-between px-4 py-3 text-sm ring-1 ring-inset ring-primary/30 bg-primary/10">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-muted-foreground">
                              {overallPoolData.myEntry.rank}
                            </span>
                            <span className="font-sans font-bold text-primary">
                              {overallPoolData.myEntry.userName} (jij)
                            </span>
                          </div>
                          <span className="font-display font-bold text-lg text-accent">
                            {overallPoolData.myEntry.totalPoints} pt
                          </span>
                        </div>
                  }
                    </>
                }
                </CardContent>
              </Card>
            }

            {/* ── Giro Klassement view ── */}
            {uitslagenView === "giro" &&
            <ClassificationTabs myRiderNumbers={myRiderNumbers} />
            }
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

                  {enrichedSubPools.map((pool) => {
                    const myPos = pool.standings.findIndex((t) => t.id === myTeam.id) + 1;
                    return (
                      <button
                        key={pool.id}
                        onClick={() => setSelectedPool(pool.id)}
                        className="w-full text-left p-3 bg-secondary/50 rounded-md hover:bg-secondary transition-colors flex items-center justify-between group">
                      
                        <div>
                          <p className="font-sans font-bold text-sm">{pool.name}</p>
                          <p className="text-xs text-muted-foreground">{pool.members.length} deelnemers</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {myPos > 0 &&
                          <span className={cn(
                            "text-xs font-display font-bold px-2 py-0.5 rounded-full",
                            myPos === 1 ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
                          )}>
                              #{myPos}
                            </span>
                          }
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </div>
                      </button>);

                  })}

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

          {/* ── TAB: Palmares ── */}
          <TabsContent value="palmares" className="mt-6">
            <PalmaresTab myTeam={myTeam} enrichedSubPools={enrichedSubPools} myGames={myGames} />
          </TabsContent>

          {/* ── TAB: Wat Als? ── */}
          <TabsContent value="watals" className="mt-6">
            <WatAlsTab getRiderPoints={getRiderPoints} myTeam={myTeam} getCategoryName={getCategoryName} />
          </TabsContent>

        </Tabs>
      </div>
    </div>);

}

/* ── Hors Catégorie Tab Component ── */
function WatAlsTab({
  getRiderPoints,
  myTeam,
  getCategoryName




}: {getRiderPoints: (riderNumber: number) => number;myTeam: typeof mockTeams[0];getCategoryName: (catId: number) => string;}) {
  const [monkeyRoll, setMonkeyRoll] = useState(0);

  const bestTeam = useMemo(() => {
    return riderCategories.map((cat) => {
      const best = cat.riders.
      map((r) => ({ ...r, points: getRiderPoints(r.number) })).
      sort((a, b) => b.points - a.points)[0];
      return { catId: cat.id, catName: cat.name, rider: best };
    });
  }, [getRiderPoints]);

  const bestTotal = bestTeam.reduce((sum, r) => sum + (r.rider?.points || 0), 0);
  const myTotal = Object.values(myTeam.picks).reduce((sum, r) => sum + getRiderPoints(r.number), 0);

  // Monte Carlo stats (stable)
  const monkeyStats = useMemo(() => {
    const SIMS = 1000;
    const totals: number[] = [];
    for (let i = 0; i < SIMS; i++) {
      let total = 0;
      for (const cat of riderCategories) {
        const randomRider = cat.riders[Math.floor(Math.random() * cat.riders.length)];
        total += getRiderPoints(randomRider.number);
      }
      totals.push(total);
    }
    totals.sort((a, b) => a - b);
    const avg = Math.round(totals.reduce((s, t) => s + t, 0) / SIMS);
    const median = totals[Math.floor(SIMS / 2)];
    const best = totals[SIMS - 1];
    const worst = totals[0];
    const betterThanYou = totals.filter((t) => t > myTotal).length;
    const percentile = Math.round((SIMS - betterThanYou) / SIMS * 100);

    // Histogram bins
    const BIN_COUNT = 20;
    const range = best - worst || 1;
    const binSize = Math.ceil(range / BIN_COUNT);
    const bins: {label: string;count: number;min: number;max: number;}[] = [];
    for (let i = 0; i < BIN_COUNT; i++) {
      const min = worst + i * binSize;
      const max = min + binSize;
      bins.push({ label: `${min}`, count: 0, min, max });
    }
    for (const t of totals) {
      const idx = Math.min(Math.floor((t - worst) / binSize), BIN_COUNT - 1);
      bins[idx].count++;
    }

    return { avg, median, best, worst, percentile, bins };
  }, [getRiderPoints, myTotal]);

  // Example monkey team (re-rolls on button click)
  const exampleMonkey = useMemo(() => {
    const team = riderCategories.map((cat) => {
      const randomRider = cat.riders[Math.floor(Math.random() * cat.riders.length)];
      return { catId: cat.id, catName: cat.name, rider: { ...randomRider, points: getRiderPoints(randomRider.number) } };
    });
    const total = team.reduce((s, r) => s + r.rider.points, 0);
    return { team, total };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getRiderPoints, monkeyRoll]);

  // Category performance: your pick vs category avg vs best
  const categoryPerformance = useMemo(() => {
    return riderCategories.map((cat) => {
      const riderScores = cat.riders.map((r) => ({ ...r, points: getRiderPoints(r.number) }));
      const best = riderScores.sort((a, b) => b.points - a.points)[0];
      const avg = Math.round(riderScores.reduce((s, r) => s + r.points, 0) / riderScores.length);
      const myPick = myTeam.picks[cat.id];
      const myPoints = myPick ? getRiderPoints(myPick.number) : 0;
      const diff = myPoints - avg;
      return { catId: cat.id, catName: cat.name, myPick, myPoints, avg, best, diff };
    });
  }, [getRiderPoints, myTeam]);

  // Stage trend: cumulative score per stage for user, leader, and avg
  const stageTrend = useMemo(() => {
    const teams = mockTeams;
    return mockStageResults.map((stage, i) => {
      const teamStageScores = teams.map((team) => {
        const teamRiders = new Set(Object.values(team.picks).map((p) => p.number));
        let cumulative = 0;
        for (let s = 0; s <= i; s++) {
          cumulative += mockStageResults[s].top20.
          filter((r) => teamRiders.has(r.riderNumber)).
          reduce((sum, r) => sum + (pointsTable[r.position] || 0), 0);
        }
        return { name: team.userName, score: cumulative };
      });
      const myScore = teamStageScores.find((t) => t.name === myTeam.userName)?.score || 0;
      const leaderScore = Math.max(...teamStageScores.map((t) => t.score));
      const avgScore = Math.round(teamStageScores.reduce((s, t) => s + t.score, 0) / teamStageScores.length);
      return { stage: `Rit ${stage.stage}`, Jij: myScore, Leider: leaderScore, Gemiddelde: avgScore };
    });
  }, [getRiderPoints, myTeam]);

  // Ranking history: cumulative classification position per stage (among all participants)
  const rankingHistory = useMemo(() => {
    // Track cumulative points per participant across stages
    const cumulativePoints = new Map<string, number>();
    allPoolParticipants.forEach((p) => cumulativePoints.set(p.userName, 0));

    return mockStageResults.map((stage, i) => {
      const stageStandings = getStagePoolStandings(i);
      // Add this stage's points to cumulative totals
      stageStandings.forEach((p) => {
        cumulativePoints.set(p.userName, (cumulativePoints.get(p.userName) || 0) + (p.stagePoints || 0));
      });
      // Sort all participants by cumulative points to get classification ranking
      const sorted = [...cumulativePoints.entries()].sort((a, b) => b[1] - a[1]);
      const myRank = sorted.findIndex(([name]) => name === myTeam.userName) + 1;
      return { stage: `Rit ${stage.stage}`, Positie: myRank || 120 };
    });
  }, [myTeam.userName]);

  // Joker impact — jokers are free picks from outside the categories
  const jokerImpact = useMemo(() => {
    // Collect all rider numbers that are in categories
    const categoryRiderNumbers = new Set(riderCategories.flatMap((c) => c.riders.map((r) => r.number)));

    // All riders from stage results that are NOT in categories = joker pool
    const jokerPoolMap = new Map<number, {name: string;number: number;}>();
    mockStageResults.forEach((stage) => {
      stage.top20.forEach((r) => {
        if (!categoryRiderNumbers.has(r.riderNumber)) {
          jokerPoolMap.set(r.riderNumber, { name: r.riderName, number: r.riderNumber });
        }
      });
    });
    const jokerPool = [...jokerPoolMap.values()].map((r) => ({
      ...r,
      points: getRiderPoints(r.number)
    })).sort((a, b) => b.points - a.points);

    const chosenJokerNumbers = new Set(myTeam.jokers.map((j) => j.number));
    const availableAlternatives = jokerPool.filter((r) => !chosenJokerNumbers.has(r.number));

    return myTeam.jokers.map((joker, index) => {
      const pts = getRiderPoints(joker.number);
      return {
        name: joker.name,
        number: joker.number,
        points: pts,
        bestAlternative: availableAlternatives[index] || null
      };
    });
  }, [getRiderPoints, myTeam]);

  const totalJokerPoints = jokerImpact.reduce((s, j) => s + j.points, 0);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Best possible team */}
      <Card className="retro-border">
        <CardHeader className="border-b-2 border-foreground bg-primary/10 py-3 px-4">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            🏆 Het Droomteam
          </CardTitle>
          <p className="text-xs text-muted-foreground font-sans mt-1">
            De best mogelijke selectie op basis van echte uitslagen
          </p>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-border">
          {bestTeam.
          sort((a, b) => (b.rider?.points || 0) - (a.rider?.points || 0)).
          map(({ catId, catName, rider }) =>
          <div key={catId} className="flex items-center justify-between px-3 md:px-4 py-2 text-xs md:text-sm">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] md:text-xs text-muted-foreground block">{catName}</span>
                <span className="font-medium font-sans">
                  {rider?.name || "—"} {rider && <span className="text-muted-foreground">#{rider.number}</span>}
                </span>
              </div>
              <span className="font-display font-bold text-primary text-xs shrink-0 ml-2">
                {rider?.points || 0} pt
              </span>
            </div>
          )}
        </CardContent>
        <div className="border-t-2 border-foreground bg-secondary/30 p-4">
          <div className="flex justify-between text-sm font-display font-bold">
            <span>Droomteam totaal:</span>
            <span className="text-primary">{bestTotal} pt</span>
          </div>
          <div className="flex justify-between text-sm font-display mt-1">
            <span>Jouw totaal:</span>
            <span className="text-accent">{myTotal} pt</span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground font-sans">
            Je hebt <span className="font-bold text-foreground">{Math.round(myTotal / bestTotal * 100)}%</span> van het maximaal haalbare gescoord.
          </div>
        </div>
      </Card>

      {/* Monkey with darts */}
      <Card className="retro-border">
        <CardHeader className="border-b-2 border-foreground bg-accent/10 py-3 px-4">
          <CardTitle className="font-display text-base flex items-center gap-2">
            🐒 De Aap met Dartpijlen
          </CardTitle>
          <p className="text-xs text-muted-foreground font-sans mt-1">
            1.000 willekeurige teams gesimuleerd — hoe goed ben jij eigenlijk?
          </p>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-2 md:gap-3">
            <div className="p-2 md:p-3 bg-secondary/50 rounded-md text-center">
              <p className="text-[10px] md:text-xs text-muted-foreground font-sans">Gemiddeld</p>
              <p className="font-display font-bold text-base md:text-lg">{monkeyStats.avg} pt</p>
            </div>
            <div className="p-2 md:p-3 bg-secondary/50 rounded-md text-center">
              <p className="text-[10px] md:text-xs text-muted-foreground font-sans">Mediaan</p>
              <p className="font-display font-bold text-base md:text-lg">{monkeyStats.median} pt</p>
            </div>
            <div className="p-2 md:p-3 bg-secondary/50 rounded-md text-center">
              <p className="text-[10px] md:text-xs text-muted-foreground font-sans">Beste aap</p>
              <p className="font-display font-bold text-base md:text-lg text-primary">{monkeyStats.best} pt</p>
            </div>
            <div className="p-2 md:p-3 bg-secondary/50 rounded-md text-center">
              <p className="text-[10px] md:text-xs text-muted-foreground font-sans">Slechtste aap</p>
              <p className="font-display font-bold text-base md:text-lg text-destructive">{monkeyStats.worst} pt</p>
            </div>
          </div>

          <div className="p-4 bg-primary/10 rounded-md text-center">
            <p className="text-sm text-muted-foreground font-sans mb-1">Jij scoort beter dan</p>
            <p className="font-display font-bold text-3xl text-primary">{monkeyStats.percentile}%</p>
            <p className="text-sm text-muted-foreground font-sans">van de willekeurige apen-teams</p>
          </div>

          {/* Histogram */}
          <div>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-sans mb-2">
              📊 Verdeling apenscores
            </h3>
            <ChartContainer config={{ count: { label: "Aantal teams", color: "hsl(var(--accent))" } }} className="h-[180px] w-full">
              <BarChart data={monkeyStats.bins} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <ChartTooltip
                  content={<ChartTooltipContent hideIndicator />}
                  labelFormatter={(_, payload) => {
                    if (payload?.[0]?.payload) {
                      const d = payload[0].payload;
                      return `${d.min}–${d.max} pt`;
                    }
                    return "";
                  }} />
                
                <ReferenceLine x={(() => {
                  const idx = Math.min(Math.floor((myTotal - monkeyStats.worst) / ((monkeyStats.best - monkeyStats.worst || 1) / 20)), 19);
                  return monkeyStats.bins[Math.max(0, idx)]?.label;
                })()} stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="4 4" label={{ value: "Jij", position: "top", fontSize: 11, fill: "hsl(var(--primary))" }} />
                <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                  {monkeyStats.bins.map((bin, i) =>
                  <Cell key={i} fill={myTotal >= bin.min && myTotal < bin.max ? "hsl(var(--primary))" : "hsl(var(--accent))"} />
                  )}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>

          {/* Example monkey team */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider font-sans">
                🎯 Voorbeeld apenteam ({exampleMonkey.total} pt)
              </h3>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={() => setMonkeyRoll((r) => r + 1)}>
                
                🎯 Hergooi
              </Button>
            </div>
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {exampleMonkey.team.
              sort((a, b) => b.rider.points - a.rider.points).
              map(({ catId, catName, rider }) =>
              <div key={catId} className="flex items-center justify-between text-[11px] md:text-xs px-2 py-1.5 bg-secondary/30 rounded">
                  <div className="min-w-0 flex-1">
                    <span className="text-muted-foreground block text-[10px] md:inline md:text-xs">{catName}: </span>
                    <span className="font-medium font-sans">{rider.name}</span>
                  </div>
                  <span className="font-display font-bold text-accent shrink-0 ml-2">{rider.points} pt</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rendement per categorie */}
      <Card className="retro-border">
        <CardHeader className="border-b-2 border-foreground bg-secondary/50 py-3 px-4">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            📊 Rendement per categorie
          </CardTitle>
          <p className="text-xs text-muted-foreground font-sans mt-1">
            Hoe scoort jouw pick t.o.v. het categorie-gemiddelde en de beste keuze?
          </p>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-border">
          {categoryPerformance.
          sort((a, b) => b.diff - a.diff).
          map(({ catId, catName, myPick, myPoints, avg, best, diff }) =>
          <div key={catId} className="px-3 md:px-4 py-2.5 text-xs md:text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] md:text-xs text-muted-foreground">{catName}</span>
                <span className={cn(
                "text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded",
                diff > 0 ? "bg-primary/10 text-primary" : diff < 0 ? "bg-destructive/10 text-destructive" : "bg-secondary text-muted-foreground"
              )}>
                  {diff > 0 ? "+" : ""}{diff} pt
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <span className="font-medium font-sans">{myPick?.name || "—"}</span>
                  <span className="text-muted-foreground ml-1">{myPoints} pt</span>
                </div>
                <div className="text-[10px] md:text-xs text-muted-foreground text-right shrink-0">
                  <span>Gem: {avg} pt</span>
                  <span className="mx-1">•</span>
                  <span>Best: {best?.name} ({best?.points} pt)</span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-1.5 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                className={cn("h-full rounded-full", myPoints >= (best?.points || 0) ? "bg-primary" : "bg-accent")}
                style={{ width: `${Math.min(100, best?.points ? myPoints / best.points * 100 : 0)}%` }} />
              
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Joker Impact */}
      <Card className="retro-border">
        <CardHeader className="border-b-2 border-foreground bg-primary/10 py-3 px-4">
          <CardTitle className="font-display text-base flex items-center gap-2">
            🃏 Joker-impact
          </CardTitle>
          <p className="text-xs text-muted-foreground font-sans mt-1">
            Hoeveel punten leveren jouw jokers op, en was een andere keuze beter geweest?
          </p>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="p-4 bg-primary/10 rounded-md text-center">
            <p className="text-sm text-muted-foreground font-sans mb-1">Totale joker-punten</p>
            <p className="font-display font-bold text-3xl text-primary">{totalJokerPoints} pt</p>
          </div>

          {jokerImpact.map((joker) =>
          <div key={joker.number} className="p-3 bg-secondary/30 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="jersey-badge bg-primary text-primary-foreground mr-2">JOKER</span>
                  <span className="font-sans font-bold text-sm">{joker.name} #{joker.number}</span>
                </div>
                <span className="font-display font-bold text-primary">{joker.points} pt</span>
              </div>
              {joker.bestAlternative &&
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                  Beste vrije keuze: <span className="font-medium text-foreground">{joker.bestAlternative.name}</span> ({joker.bestAlternative.points} pt)
                  {joker.bestAlternative.points > joker.points &&
              <span className="text-destructive font-bold ml-1">+{joker.bestAlternative.points - joker.points} gemist</span>
              }
                  {joker.bestAlternative.points <= joker.points &&
              <span className="text-primary font-bold ml-1">✓ Goede keuze!</span>
              }
                </p>
            }
            </div>
          )}
        </CardContent>
      </Card>

      {/* Etappe-trendlijn */}
      <Card className="retro-border">
        <CardHeader className="border-b-2 border-foreground bg-secondary/50 py-3 px-4">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            📈 Etappe-trendlijn
          </CardTitle>
          <p className="text-xs text-muted-foreground font-sans mt-1">
            Jouw cumulatieve score per etappe vs. de poule-leider en het gemiddelde
          </p>
        </CardHeader>
        <CardContent className="p-4">
          <ChartContainer
            config={{
              Jij: { label: "Jij", color: "hsl(var(--primary))" },
              Leider: { label: "Leider", color: "hsl(var(--accent))" },
              Gemiddelde: { label: "Gemiddelde", color: "hsl(var(--muted-foreground))" }
            }}
            className="h-[220px] w-full">
            
            <LineChart data={stageTrend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="stage" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="Jij" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Leider" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 3" />
              <Line type="monotone" dataKey="Gemiddelde" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} dot={{ r: 2 }} strokeDasharray="3 3" />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Rankingverloop */}
      <Card className="retro-border">
        <CardHeader className="border-b-2 border-foreground bg-accent/10 py-3 px-4">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Medal className="h-5 w-5 text-accent" />
            🏅 Rankingverloop
          </CardTitle>
          <p className="text-xs text-muted-foreground font-sans mt-1">
            Hoe is jouw positie in het klassement veranderd per etappe?
          </p>
        </CardHeader>
        <CardContent className="p-4">
          <ChartContainer
            config={{ Positie: { label: "Positie", color: "hsl(var(--primary))" } }}
            className="h-[220px] w-full">
            
            <LineChart data={rankingHistory}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="stage" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                reversed
                domain={[1, allPoolParticipants.length]}
                allowDecimals={false}
                label={{ value: "← Beter", angle: -90, position: "insideLeft", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="Positie"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={{ r: 5, fill: "hsl(var(--primary))" }} />
              
            </LineChart>
          </ChartContainer>
          <div className="mt-3 text-center">
            <span className="text-sm font-sans text-muted-foreground">
              Huidige positie: <span className="font-display font-bold text-primary text-lg">#{rankingHistory[rankingHistory.length - 1]?.Positie}</span>
              <span className="text-muted-foreground"> van {allPoolParticipants.length}</span>
            </span>
          </div>
        </CardContent>
      </Card>
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
      <CardContent className="p-2.5 md:p-4 flex items-center gap-2 md:gap-3">
        <div className="shrink-0">{icon}</div>
        <div className="min-w-0">
          <p className="text-[10px] md:text-xs text-muted-foreground font-sans">{label}</p>
          <p className="font-display font-bold text-sm md:text-lg truncate">{value}</p>
        </div>
      </CardContent>
    </Card>);

}

/* ── Palmares Tab Component ── */
function PalmaresTab({
  myTeam,
  enrichedSubPools: pools,
  myGames: games,
}: {
  myTeam: { userName: string; totalPoints: number; id: string };
  enrichedSubPools: { name: string; standings: { userName: string; totalPoints: number; id: string }[] }[];
  myGames: { id: string; name: string; status: "actief" | "afgelopen"; emoji: string; colors: string[] }[];
}) {
  // Mock palmares data per race
  const palmaresData = games.map((game) => {
    const isActive = game.status === "actief";
    const myRank = game.id === "giro2026" ? 120 : game.id === "tdf2026" ? 87 : 203;
    const totalParticipants = game.id === "giro2026" ? 1350 : game.id === "tdf2026" ? 1120 : 980;
    const myPoints = game.id === "giro2026" ? myTeam.totalPoints : game.id === "tdf2026" ? 387 : 245;

    return {
      ...game,
      isActive,
      myRank,
      totalParticipants,
      myPoints,
    };
  });

  // Subpool results
  const subpoolResults = pools.map((pool) => {
    const myIdx = pool.standings.findIndex((t) => t.userName === myTeam.userName);
    return {
      name: pool.name,
      rank: myIdx + 1,
      total: pool.standings.length,
      points: pool.standings[myIdx]?.totalPoints ?? 0,
      winner: pool.standings[0]?.userName ?? "—",
      isWinner: myIdx === 0,
    };
  });

  const totalTrophies = subpoolResults.filter((s) => s.isWinner).length;
  const totalPodiums = subpoolResults.filter((s) => s.rank <= 3).length;
  const bestOverallRank = Math.min(...palmaresData.map((p) => p.myRank));

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Trophy className="h-5 w-5 text-primary" />} label="Overwinningen" value={`${totalTrophies}`} />
        <StatCard icon={<Medal className="h-5 w-5 text-primary" />} label="Podiumplaatsen" value={`${totalPodiums}`} />
        <StatCard icon={<TrendingUp className="h-5 w-5 text-primary" />} label="Beste eindstand" value={`#${bestOverallRank}`} />
        <StatCard icon={<Award className="h-5 w-5 text-primary" />} label="Koersen gereden" value={`${games.length}`} />
      </div>

      {/* Overall race results */}
      <Card className="retro-border">
        <CardHeader className="border-b-2 border-foreground bg-secondary/50 py-3 px-4">
          <CardTitle className="font-display text-base">🏆 Eindstanden Grote Rondes</CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-border">
          {palmaresData.map((race) => (
            <div
              key={race.id}
              className={cn(
                "flex items-center justify-between px-4 py-4",
                race.isActive && "bg-primary/5"
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{race.emoji}</span>
                <div>
                  <p className="font-display font-bold text-sm">{race.name}</p>
                  <p className="text-xs text-muted-foreground font-sans">
                    {race.isActive ? "🟢 Lopend" : "Afgelopen"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-display font-bold text-lg">
                  #{race.myRank}
                  <span className="text-xs text-muted-foreground font-sans ml-1">/ {race.totalParticipants}</span>
                </p>
                <p className="text-xs text-muted-foreground font-sans">{race.myPoints} pt</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Subpool results */}
      <Card className="retro-border">
        <CardHeader className="border-b-2 border-foreground bg-secondary/50 py-3 px-4">
          <CardTitle className="font-display text-base">👥 Eindstanden Subpoules</CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-border">
          {subpoolResults.map((pool) => (
            <div
              key={pool.name}
              className={cn(
                "flex items-center justify-between px-4 py-3",
                pool.isWinner && "bg-primary/10"
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">
                  {pool.rank === 1 ? "🥇" : pool.rank === 2 ? "🥈" : pool.rank === 3 ? "🥉" : `#${pool.rank}`}
                </span>
                <div>
                  <p className="font-display font-bold text-sm">{pool.name}</p>
                  <p className="text-xs text-muted-foreground font-sans">
                    {pool.total} deelnemers • Winnaar: {pool.winner}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={cn(
                  "font-display font-bold text-lg",
                  pool.rank <= 3 && "text-primary"
                )}>
                  #{pool.rank}
                </p>
                <p className="text-xs text-muted-foreground font-sans">{pool.points} pt</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}