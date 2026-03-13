import { useMemo, useState } from "react";
import { mockStageResults, mockTeams } from "@/data/mockData";
import { pointsTable } from "@/data/riders";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, User } from "lucide-react";

export default function Results() {
  const [selectedStage, setSelectedStage] = useState(0);
  const sortedTeams = [...mockTeams].sort((a, b) => b.totalPoints - a.totalPoints);
  const myTeam = mockTeams[0]; // Current user's team

  const myStagePoints = useMemo(() => {
    const stage = mockStageResults[selectedStage];
    const riderNumbers = new Set(Object.values(myTeam.picks).map(p => p.number));
    const scoringRiders = stage.top20
      .filter(r => riderNumbers.has(r.riderNumber))
      .map(r => ({ ...r, points: pointsTable[r.position] || 0 }));
    const total = scoringRiders.reduce((sum, r) => sum + r.points, 0);
    return { scoringRiders, total };
  }, [selectedStage]);

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
          Uitslagen & Klassement
        </h1>
        <div className="vintage-divider max-w-xs mx-auto mt-4" />
      </div>

      <Tabs defaultValue="klassement" className="max-w-4xl mx-auto">
        <TabsList className="w-full retro-border">
          <TabsTrigger value="klassement" className="flex-1 font-display">
            🏆 Klassement
          </TabsTrigger>
          <TabsTrigger value="etappes" className="flex-1 font-display">
            📋 Etappes
          </TabsTrigger>
        </TabsList>

        {/* Standings */}
        <TabsContent value="klassement">
          <div className="retro-border bg-card mt-4">
            <div className="p-4 border-b-2 border-foreground bg-secondary/50">
              <h2 className="font-display text-lg font-bold flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Algemeen Klassement
              </h2>
            </div>
            <div className="divide-y divide-border">
              {sortedTeams.map((team, index) => (
                <div
                  key={team.id}
                  className={cn(
                    "flex items-center justify-between p-4 transition-colors hover:bg-secondary/30",
                    index === 0 && "bg-primary/5"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <span className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                      index === 0 && "bg-primary text-primary-foreground",
                      index === 1 && "bg-muted text-foreground",
                      index === 2 && "bg-vintage-gold text-primary-foreground",
                      index > 2 && "bg-secondary text-muted-foreground"
                    )}>
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-bold font-sans">{team.userName}</p>
                      <p className="text-xs text-muted-foreground">
                        {Object.keys(team.picks).length} renners
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-xl font-bold">
                      {team.totalPoints}
                    </p>
                    <p className="text-xs text-muted-foreground">punten</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Stage results */}
        <TabsContent value="etappes">
          <div className="flex gap-2 mt-4 mb-4 flex-wrap">
            {mockStageResults.map((stage, i) => (
              <button
                key={stage.stage}
                onClick={() => setSelectedStage(i)}
                className={cn(
                  "px-3 py-1.5 text-sm font-bold rounded-md border-2 transition-all",
                  selectedStage === i
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-muted-foreground"
                )}
              >
                Rit {stage.stage}
              </button>
            ))}
          </div>

          <div className="retro-border bg-card">
            <div className="p-4 border-b-2 border-foreground bg-secondary/50">
              <h2 className="font-display text-lg font-bold flex items-center gap-2">
                <Medal className="h-5 w-5 text-accent" />
                Etappe {mockStageResults[selectedStage].stage} — {mockStageResults[selectedStage].date}
              </h2>
              <span className="jersey-badge bg-accent text-accent-foreground mt-1">
                {mockStageResults[selectedStage].type}
              </span>
            </div>
            <div className="divide-y divide-border">
              {mockStageResults[selectedStage].top20.map((result) => (
                <div
                  key={result.position}
                  className={cn(
                    "flex items-center justify-between px-4 py-2.5 text-sm",
                    result.position <= 3 && "bg-primary/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                      result.position === 1 && "bg-primary text-primary-foreground",
                      result.position === 2 && "bg-muted text-foreground",
                      result.position === 3 && "bg-vintage-gold text-primary-foreground",
                      result.position > 3 && "text-muted-foreground"
                    )}>
                      {result.position}
                    </span>
                    <span className="font-sans">
                      <span className="text-xs text-muted-foreground mr-1">#{result.riderNumber}</span>
                      <span className="font-medium">{result.riderName}</span>
                    </span>
                  </div>
                  <span className="font-bold text-accent">
                    {pointsTable[result.position] || 0} pt
                  </span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
