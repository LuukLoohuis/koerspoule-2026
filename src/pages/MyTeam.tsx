import { useState } from "react";
import { mockTeams, mockSubPools } from "@/data/mockData";
import { riderCategories } from "@/data/riders";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, ArrowLeftRight, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function MyTeam() {
  const { toast } = useToast();
  const myTeam = mockTeams[0]; // "logged in" user
  const [compareWith, setCompareWith] = useState<string>("");
  const [poolCode, setPoolCode] = useState("");

  const otherTeam = mockTeams.find((t) => t.id === compareWith);

  const getCategoryName = (catId: number) =>
    riderCategories.find((c) => c.id === catId)?.name || `Cat ${catId}`;

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
          Mijn Ploeg
        </h1>
        <p className="text-muted-foreground font-serif">
          Welkom, {myTeam.userName}! Je hebt {myTeam.totalPoints} punten.
        </p>
        <div className="vintage-divider max-w-xs mx-auto mt-4" />
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team overview */}
        <div className="lg:col-span-2">
          <div className="retro-border bg-card">
            <div className="p-4 border-b-2 border-foreground bg-secondary/50 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">🚴 Mijn selectie</h2>
              <span className="font-display text-xl font-bold text-accent">
                {myTeam.totalPoints} pt
              </span>
            </div>

            {/* Compare selector */}
            <div className="p-4 border-b border-border bg-secondary/20">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground font-sans">Vergelijk met:</span>
                <Select value={compareWith} onValueChange={setCompareWith}>
                  <SelectTrigger className="w-40 h-8 text-sm">
                    <SelectValue placeholder="Kies speler" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockTeams
                      .filter((t) => t.id !== myTeam.id)
                      .map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.userName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Riders list */}
            <div className="divide-y divide-border">
              {Object.entries(myTeam.picks).map(([catId, rider]) => {
                const otherRider = otherTeam?.picks[Number(catId)];
                const isSame = otherRider?.number === rider.number;

                return (
                  <div key={catId} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-muted-foreground block truncate">
                        {getCategoryName(Number(catId))}
                      </span>
                      <span className="font-medium font-sans">
                        {rider.name} <span className="text-muted-foreground">#{rider.number}</span>
                      </span>
                    </div>
                    {otherTeam && (
                      <div className={cn(
                        "flex-1 min-w-0 text-right",
                        isSame ? "text-accent" : "text-muted-foreground"
                      )}>
                        <span className="text-xs block truncate">
                          {otherTeam.userName}
                        </span>
                        <span className="font-medium font-sans">
                          {otherRider?.name || "—"}{" "}
                          {otherRider && (
                            <span className="text-muted-foreground">#{otherRider.number}</span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Jokers */}
            <div className="p-4 border-t-2 border-foreground bg-secondary/30">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                🃏 Jokers
              </h3>
              <div className="flex flex-wrap gap-2">
                {myTeam.jokers.map((j) => (
                  <span key={j.number} className="jersey-badge bg-primary text-primary-foreground">
                    {j.name} #{j.number}
                  </span>
                ))}
              </div>
            </div>

            {/* Predictions */}
            <div className="p-4 border-t border-border">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                🏆 Voorspellingen
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm font-sans">
                <div>
                  <span className="text-xs text-muted-foreground">Podium:</span>
                  <p className="font-medium">{myTeam.predictions.gcPodium.join(", ")}</p>
                </div>
                <div className="space-y-1">
                  <p><span className="w-2 h-2 rounded-full bg-jersey-green inline-block mr-1" /> {myTeam.predictions.pointsJersey}</p>
                  <p><span className="w-2 h-2 rounded-full bg-jersey-polka inline-block mr-1" /> {myTeam.predictions.mountainJersey}</p>
                  <p><span className="w-2 h-2 rounded-full bg-jersey-white border inline-block mr-1" /> {myTeam.predictions.youthJersey}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Sub-pools */}
          <div className="retro-border bg-card">
            <div className="p-4 border-b-2 border-foreground bg-secondary/50">
              <h2 className="font-display text-lg font-bold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Subpoules
              </h2>
            </div>
            <div className="p-4 space-y-3">
              {mockSubPools.map((pool) => (
                <div key={pool.id} className="p-3 bg-secondary/50 rounded-md">
                  <p className="font-bold font-sans text-sm">{pool.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {pool.members.length} deelnemers
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs font-mono bg-background px-2 py-0.5 rounded border">
                      {pool.code}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(pool.code);
                        toast({ title: "Code gekopieerd!" });
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}

              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2 font-sans">
                  Voer een code in om lid te worden:
                </p>
                <div className="flex gap-2">
                  <Input
                    value={poolCode}
                    onChange={(e) => setPoolCode(e.target.value)}
                    placeholder="POOL CODE"
                    className="text-xs font-mono uppercase"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      toast({ title: "Aangevraagd!", description: `Code: ${poolCode}` });
                      setPoolCode("");
                    }}
                  >
                    Join
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
