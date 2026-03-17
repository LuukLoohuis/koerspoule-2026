import { useMemo, useState } from "react";
import { mockStageResults, mockTeams, mockClassifications } from "@/data/mockData";
import { allPoolParticipants, getStagePoolStandings, getTruncatedStandings } from "@/data/poolStandings";
import { pointsTable, classificationPoints } from "@/data/riders";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, User, Users } from "lucide-react";
import StageRoadbook, { stageTypeConfig } from "@/components/StageRoadbook";
import PoolStandingsList, { RankBadge } from "@/components/PoolStandingsList";

export default function Results() {
  const [selectedStage, setSelectedStage] = useState(0);
  const myTeam = mockTeams[0];

  const myRiderNumbers = useMemo(() => new Set(Object.values(myTeam.picks).map(p => p.number)), []);

  const myStagePoints = useMemo(() => {
    const stage = mockStageResults[selectedStage];
    const riderNumbers = new Set(Object.values(myTeam.picks).map(p => p.number));
    const scoringRiders = stage.top20
      .filter(r => riderNumbers.has(r.riderNumber))
      .map(r => ({ ...r, points: pointsTable[r.position] || 0 }));
    const total = scoringRiders.reduce((sum, r) => sum + r.points, 0);
    return { scoringRiders, total };
  }, [selectedStage]);

  const stagePoolData = useMemo(() => {
    const standings = getStagePoolStandings(selectedStage);
    return getTruncatedStandings(standings, 10, myTeam.userName);
  }, [selectedStage]);

  const overallPoolData = useMemo(() => {
    return getTruncatedStandings(allPoolParticipants, 10, myTeam.userName);
  }, []);

  // Per-stage points for the roadbook
  const stagePoints = useMemo(() => {
    const riderNums = new Set(Object.values(myTeam.picks).map(p => p.number));
    return mockStageResults.map(stage =>
      stage.top20
        .filter(r => riderNums.has(r.riderNumber))
        .reduce((sum, r) => sum + (pointsTable[r.position] || 0), 0)
    );
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
          Uitslagen & Klassement
        </h1>
        <div className="vintage-divider max-w-xs mx-auto mt-4" />
      </div>

      <Tabs defaultValue="klassement" className="max-w-7xl mx-auto">
        <TabsList className="w-full retro-border">
          <TabsTrigger value="klassement" className="flex-1 font-display">
            🏆 Klassement
          </TabsTrigger>
          <TabsTrigger value="etappes" className="flex-1 font-display">
            📋 Etappes
          </TabsTrigger>
        </TabsList>

        {/* ── ETAPPES TAB ── */}
        <TabsContent value="etappes">
          <div className="mt-4 mb-6">
            <StageRoadbook
              selectedStage={selectedStage}
              onSelectStage={setSelectedStage}
              stagePoints={stagePoints}
            />
          </div>

          {/* Selected stage info strip */}
          <div className="mb-4 retro-border bg-secondary/30 p-3 flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-white",
                stageTypeConfig[mockStageResults[selectedStage].type]?.color || "bg-muted"
              )}>
                {stageTypeConfig[mockStageResults[selectedStage].type]?.icon}
              </div>
              <div>
                <span className="font-display font-bold">Rit {mockStageResults[selectedStage].stage}</span>
                <span className="text-muted-foreground ml-2 text-xs">
                  {stageTypeConfig[mockStageResults[selectedStage].type]?.label}
                </span>
              </div>
            </div>
            <span className="text-muted-foreground font-sans">{mockStageResults[selectedStage].route}</span>
            <span className="text-xs text-muted-foreground ml-auto">{mockStageResults[selectedStage].distance}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Column 1: Stage results */}
            <div className="retro-border bg-card">
              <div className="p-4 border-b-2 border-foreground bg-secondary/50">
                <h2 className="font-display text-base font-bold flex items-center gap-2">
                  <Medal className="h-5 w-5 text-accent" />
                  Rit {mockStageResults[selectedStage].stage}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {mockStageResults[selectedStage].route} • {mockStageResults[selectedStage].distance}
                </p>
              </div>
              <div className="divide-y divide-border">
                {mockStageResults[selectedStage].top20.map((result) => {
                  const isInMyTeam = myRiderNumbers.has(result.riderNumber);
                  return (
                    <div
                      key={result.position}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 text-sm",
                        result.position <= 3 && "bg-primary/5",
                        isInMyTeam && "ring-1 ring-inset ring-primary/30 bg-primary/5"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <RankBadge rank={result.position} size="sm" />
                        <span className="font-sans">
                          <span className={cn("font-medium text-sm", isInMyTeam && "text-primary")}>{result.riderName}</span>
                        </span>
                      </div>
                      <span className="font-bold text-accent text-xs">
                        {pointsTable[result.position] || 0} pt
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Column 2: Pool standings for this stage */}
            <div className="retro-border bg-card h-fit">
              <div className="p-4 border-b-2 border-foreground bg-secondary/50">
                <h2 className="font-display text-base font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Poule-uitslag Rit {mockStageResults[selectedStage].stage}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {stagePoolData.totalParticipants} deelnemers
                </p>
              </div>
              <PoolStandingsList data={stagePoolData} allParticipants={getStagePoolStandings(selectedStage)} valueKey="stagePoints" unit="pt" myName={myTeam.userName} />
            </div>

            {/* Column 3: My team points */}
            <div className="retro-border bg-card h-fit">
              <div className="p-4 border-b-2 border-foreground bg-primary/10">
                <h2 className="font-display text-base font-bold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Jouw team
                  </span>
                  <span className="font-display text-xl text-primary">
                    {myStagePoints.total} pt
                  </span>
                </h2>
              </div>
              {myStagePoints.scoringRiders.length > 0 ? (
                <div className="divide-y divide-border">
                  {myStagePoints.scoringRiders.map((r) => (
                    <div key={r.riderNumber} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                          {r.position}
                        </span>
                        <span className="font-sans font-medium">{r.riderName}</span>
                      </div>
                      <span className="font-bold text-primary text-sm">{r.points} pt</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  Geen van jouw renners scoorde punten in deze rit.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── KLASSEMENT TAB ── */}
        <TabsContent value="klassement">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            {/* Left: Pool overall standings */}
            <div className="retro-border bg-card">
              <div className="p-4 border-b-2 border-foreground bg-secondary/50">
                <h2 className="font-display text-lg font-bold flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Algemeen Klassement
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {overallPoolData.totalParticipants} deelnemers
                </p>
              </div>
              <PoolStandingsList data={overallPoolData} allParticipants={allPoolParticipants} valueKey="totalPoints" unit="pt" myName={myTeam.userName} />
            </div>

            {/* Right: Your result summary */}
            <div className="space-y-4">
              <div className="retro-border bg-card">
                <div className="p-4 border-b-2 border-foreground bg-primary/10">
                  <h2 className="font-display text-lg font-bold flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Jouw klassement
                  </h2>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-center gap-8 mb-6">
                    <div className="text-center">
                      <div className="w-20 h-20 rounded-full bg-primary/10 border-4 border-primary flex items-center justify-center mb-2">
                        <span className="font-display text-3xl font-bold text-primary">
                          {overallPoolData.myEntry?.rank ?? overallPoolData.top.find(p => p.userName === myTeam.userName)?.rank ?? "–"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">Positie</p>
                    </div>
                    <div className="text-center">
                      <div className="w-20 h-20 rounded-full bg-accent/10 border-4 border-accent flex items-center justify-center mb-2">
                        <span className="font-display text-3xl font-bold text-accent">
                          {myTeam.totalPoints}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">Punten</p>
                    </div>
                  </div>

                  {/* Per-stage breakdown as mini chart */}
                  <div className="space-y-2">
                    <h3 className="font-display text-sm font-bold text-muted-foreground uppercase tracking-wider">Punten per etappe</h3>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground mb-3">
                      {Object.entries(stageTypeConfig).map(([key, cfg]) => (
                        <div key={key} className="flex items-center gap-1">
                          <span className={cn("w-3 h-3 rounded-full inline-block shrink-0", cfg.color)} />
                          <span>{cfg.label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-end gap-1 h-24 px-1">
                      {mockStageResults.map((stage, idx) => {
                        const pts = stagePoints[idx];
                        const maxPts = Math.max(...stagePoints, 1);
                        const barH = Math.max(4, (pts / maxPts) * 80);
                        const cfg = stageTypeConfig[stage.type] || stageTypeConfig.flat;
                        return (
                          <div key={stage.stage} className="flex-1 flex flex-col items-center gap-0.5">
                            <span className="text-[9px] font-bold text-muted-foreground tabular-nums">{pts > 0 ? pts : ""}</span>
                            <div
                              className={cn("w-full rounded-t", cfg.color, "opacity-80")}
                              style={{ height: barH }}
                            />
                            <span className="text-[9px] text-muted-foreground">{stage.stage}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Classification predictions */}
                  <div className="space-y-2 mt-4">
                    <h3 className="font-display text-sm font-bold text-muted-foreground uppercase tracking-wider">🏆 Klassementsvoorspellingen</h3>
                    {(() => {
                      const gcTop3 = mockClassifications.gc.slice(0, 3).map((r) => r.riderName);
                      const actualPoints = mockClassifications.points[0]?.riderName || "";
                      const actualMountain = mockClassifications.kom[0]?.riderName || "";
                      const actualYouth = mockClassifications.youth[0]?.riderName || "";

                      const calcGcPts = (pick: string, pos: number) => {
                        if (gcTop3[pos] === pick) return classificationPoints.correctPositionCorrectRider;
                        if (gcTop3.includes(pick)) return classificationPoints.correctRiderWrongPosition;
                        return 0;
                      };

                      const rows = [
                        ...myTeam.predictions.gcPodium.map((name, i) => ({
                          label: i === 0 ? "🥇 1e GC" : i === 1 ? "🥈 2e GC" : "🥉 3e GC",
                          pick: name,
                          actual: gcTop3[i],
                          pts: calcGcPts(name, i),
                        })),
                        { label: "🟢 Punten", pick: myTeam.predictions.pointsJersey, actual: actualPoints, pts: myTeam.predictions.pointsJersey === actualPoints ? classificationPoints.correctJerseyWinner : 0 },
                        { label: "🔴 Berg", pick: myTeam.predictions.mountainJersey, actual: actualMountain, pts: myTeam.predictions.mountainJersey === actualMountain ? classificationPoints.correctJerseyWinner : 0 },
                        { label: "⚪ Jongeren", pick: myTeam.predictions.youthJersey, actual: actualYouth, pts: myTeam.predictions.youthJersey === actualYouth ? classificationPoints.correctJerseyWinner : 0 },
                      ];

                      const totalPredPts = rows.reduce((s, r) => s + r.pts, 0);

                      return (
                        <div className="retro-border bg-background overflow-hidden">
                          {rows.map((row, idx) => (
                            <div key={row.label} className={cn(
                              "flex items-center justify-between px-3 py-2 text-sm border-b border-border last:border-b-0",
                              idx % 2 === 0 ? "bg-background" : "bg-muted/20"
                            )}>
                              <span className="text-xs text-muted-foreground font-sans w-24">{row.label}</span>
                              <span className="font-sans font-medium flex-1 truncate">{row.pick}</span>
                              <span className={cn(
                                "font-display font-bold text-sm tabular-nums",
                                row.pts > 0 ? "text-primary" : "text-muted-foreground"
                              )}>{row.pts} pt</span>
                            </div>
                          ))}
                          <div className="flex items-center justify-between px-3 py-2.5 bg-secondary/50 border-t-2 border-foreground">
                            <span className="font-display font-bold text-sm">Totaal voorspellingen</span>
                            <span className="font-display font-bold text-base text-accent">{totalPredPts} pt</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

