import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useCategories } from "@/hooks/useCategories";
import { useEntry } from "@/hooks/useEntry";
import { useStartlist } from "@/hooks/useStartlist";
import { cn } from "@/lib/utils";

export default function TeamBuilder() {
  const { toast } = useToast();
  const { data: game, isLoading: gameLoading } = useCurrentGame();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories(game?.id);
  const { entry, isLoading: entryLoading, picksByCategory, jokerIds, savePick, saveJoker, submitEntry } = useEntry(game?.id);

  const [startlistSearch, setStartlistSearch] = useState("");
  const [startlistTeamFilter, setStartlistTeamFilter] = useState("all");
  const { data: startlist = [], isLoading: startlistLoading } = useStartlist(
    game?.id,
    startlistSearch,
    startlistTeamFilter === "all" ? "" : startlistTeamFilter
  );

  const allRiders = useMemo(() => {
    const list: Array<{ id: string; name: string; start_number: number | null }> = [];
    for (const category of categories) {
      for (const relation of category.category_riders ?? []) {
        if (relation.riders && !list.find((r) => r.id === relation.riders?.id)) {
          list.push(relation.riders);
        }
      }
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  const allTeams = useMemo(
    () => startlist.map((t) => ({ id: t.id, name: t.name })),
    [startlist]
  );

  const [jokerDraft1, setJokerDraft1] = useState("");
  const [jokerDraft2, setJokerDraft2] = useState("");
  const [gcPodium, setGcPodium] = useState(["", "", ""]);
  const [pointsJersey, setPointsJersey] = useState("");
  const [mountainJersey, setMountainJersey] = useState("");
  const [youthJersey, setYouthJersey] = useState("");

  const selectedPickRiderIds = useMemo(() => new Set(Array.from(picksByCategory.values())), [picksByCategory]);

  const isSubmitted = entry?.status === "submitted";
  const isLocked = isSubmitted || (game?.status && ["locked", "live", "finished"].includes(game.status));

  const handlePickSelect = async (categoryId: string, riderId: string) => {
    if (!entry) return;
    try {
      await savePick.mutateAsync({ entryId: entry.id, categoryId, riderId });
      toast({ title: "Keuze opgeslagen" });
    } catch (error) {
      toast({
        title: "Opslaan mislukt",
        description: error instanceof Error ? error.message : "Onbekende fout",
        variant: "destructive",
      });
    }
  };

  const handleSaveJokers = async () => {
    if (!entry) return;
    if (!jokerDraft1 || !jokerDraft2) {
      toast({ title: "Kies twee jokers", variant: "destructive" });
      return;
    }
    if (jokerDraft1 === jokerDraft2) {
      toast({ title: "Jokers moeten uniek zijn", variant: "destructive" });
      return;
    }
    if (selectedPickRiderIds.has(jokerDraft1) || selectedPickRiderIds.has(jokerDraft2)) {
      toast({
        title: "Joker overlap",
        description: "Jokers mogen niet in categorie-picks zitten.",
        variant: "destructive",
      });
      return;
    }
    try {
      await saveJoker.mutateAsync({ entryId: entry.id, riderIds: [jokerDraft1, jokerDraft2] });
      toast({ title: "Jokers opgeslagen" });
    } catch (error) {
      toast({
        title: "Jokers opslaan mislukt",
        description: error instanceof Error ? error.message : "Onbekende fout",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async () => {
    if (!entry) return;
    try {
      await submitEntry.mutateAsync({ entryId: entry.id });
      toast({ title: "Team definitief ingediend" });
    } catch (error) {
      toast({
        title: "Indienen mislukt",
        description: error instanceof Error ? error.message : "Onbekende fout",
        variant: "destructive",
      });
    }
  };

  const completedPicks = picksByCategory.size;
  const gameReady = !gameLoading && !categoriesLoading && !entryLoading;

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            Stel je ploeg samen
          </h1>
          <p className="text-muted-foreground font-serif">
            Kies 1 renner per categorie • {completedPicks}/{categories.length} gekozen
          </p>
        </div>

        {!gameReady && <div className="retro-border bg-card p-6">Laden...</div>}
        {gameReady && !game && (
          <div className="retro-border bg-card p-6 text-muted-foreground">
            Geen actieve game gevonden.
          </div>
        )}
        {gameReady && game && (
          <Tabs defaultValue="builder" className="space-y-4">
            <TabsList className="w-full">
              <TabsTrigger value="builder" className="flex-1">Team samenstellen</TabsTrigger>
              <TabsTrigger value="startlist" className="flex-1">Startlijst</TabsTrigger>
            </TabsList>

            <TabsContent value="builder" className="space-y-4">
              {isLocked && (
                <div className="retro-border bg-secondary/50 p-3 text-sm">
                  Team staat op slot ({entry?.status === "submitted" ? "ingediend" : game.status}).
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {categories.map((category) => {
                  const selectedRiderId = picksByCategory.get(category.id);
                  return (
                    <div key={category.id} className="retro-border bg-card p-4">
                      <h2 className="font-display text-lg font-bold">
                        {category.short_name ?? category.name}
                      </h2>
                      <p className="text-xs text-muted-foreground mb-3">{category.name}</p>
                      <div className="space-y-2">
                        {category.category_riders.map((row) => {
                          if (!row.riders) return null;
                          const isSelected = selectedRiderId === row.riders.id;
                          return (
                            <button
                              key={row.rider_id}
                              disabled={Boolean(isLocked)}
                              onClick={() => handlePickSelect(category.id, row.riders!.id)}
                              className={cn(
                                "w-full flex items-center justify-between p-3 rounded-md border-2 transition-all text-left",
                                isSelected
                                  ? "border-primary bg-primary/10 shadow-sm"
                                  : "border-border hover:border-muted-foreground hover:bg-secondary",
                                isLocked && "opacity-60 cursor-not-allowed"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-mono text-muted-foreground w-8">
                                  #{row.riders.start_number ?? "-"}
                                </span>
                                <span className="font-medium font-sans">{row.riders.name}</span>
                              </div>
                              {isSelected && <Check className="h-5 w-5 text-primary" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="retro-border bg-card p-6">
                <h2 className="font-display text-xl font-bold mb-1">🃏 Jokers</h2>
                <p className="text-sm text-muted-foreground mb-4 font-sans">
                  Kies exact 2 jokers. Geen overlap met je categorie-picks.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Select value={jokerDraft1} onValueChange={setJokerDraft1} disabled={Boolean(isLocked)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Joker 1" />
                    </SelectTrigger>
                    <SelectContent>
                      {allRiders.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name} #{r.start_number ?? "-"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={jokerDraft2} onValueChange={setJokerDraft2} disabled={Boolean(isLocked)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Joker 2" />
                    </SelectTrigger>
                    <SelectContent>
                      {allRiders.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name} #{r.start_number ?? "-"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleSaveJokers}
                    disabled={Boolean(isLocked || saveJoker.isPending)}
                    variant="secondary"
                  >
                    Jokers opslaan
                  </Button>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  Huidige jokers: {jokerIds.length ? jokerIds.length : 0}/2
                </div>
              </div>

              <div className="retro-border bg-card p-6">
                <h2 className="font-display text-xl font-bold mb-1">🏆 Klassementsvoorspellingen</h2>
                <p className="text-sm text-muted-foreground mb-6 font-sans">
                  Deze velden blijven beschikbaar in de UI; scoring wordt server-side verwerkt.
                </p>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-display font-bold mb-2">Eindklassement podium</h3>
                    <div className="space-y-2">
                      {["🥇 1e plaats", "🥈 2e plaats", "🥉 3e plaats"].map((label, i) => (
                        <div key={i}>
                          <label className="text-xs font-medium text-muted-foreground">{label}</label>
                          <Input
                            value={gcPodium[i]}
                            disabled={Boolean(isLocked)}
                            onChange={(e) => {
                              const newPodium = [...gcPodium];
                              newPodium[i] = e.target.value;
                              setGcPodium(newPodium);
                            }}
                            placeholder="Naam renner"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="vintage-divider" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Puntentrui</label>
                      <Input value={pointsJersey} onChange={(e) => setPointsJersey(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Bergtrui</label>
                      <Input value={mountainJersey} onChange={(e) => setMountainJersey(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Jongerentrui</label>
                      <Input value={youthJersey} onChange={(e) => setYouthJersey(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSubmit}
                  disabled={Boolean(isLocked || submitEntry.isPending)}
                  className="retro-border-primary font-bold"
                >
                  ✅ Team definitief indienen
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="startlist" className="space-y-4">
              <div className="retro-border bg-card p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Input
                    value={startlistSearch}
                    onChange={(e) => setStartlistSearch(e.target.value)}
                    placeholder="Zoek op renner..."
                  />
                  <Select value={startlistTeamFilter} onValueChange={setStartlistTeamFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter op team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle teams</SelectItem>
                      {allTeams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {startlistLoading && <div className="retro-border bg-card p-4">Startlijst laden...</div>}
              {!startlistLoading &&
                startlist.map((team) => (
                  <div key={team.id} className="retro-border bg-card p-4">
                    <h3 className="font-display text-lg font-bold mb-2">{team.name}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {team.riders.map((rider) => (
                        <div key={rider.id} className="border rounded-md p-2 bg-secondary/20">
                          <span className="font-mono text-xs text-muted-foreground">#{rider.start_number ?? "-"}</span>{" "}
                          <span className="font-medium">{rider.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
