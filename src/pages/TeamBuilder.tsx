import { useEffect, useMemo, useRef, useState } from "react";
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
import RiderSearchSelect from "@/components/RiderSearchSelect";

export default function TeamBuilder() {
  const { toast } = useToast();
  const { data: game, isLoading: gameLoading } = useCurrentGame();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories(game?.id);
  const { entry, isLoading: entryLoading, picksByCategory, jokerIds, predictions, togglePick, saveJoker, savePredictions, submitEntry, revertEntry } = useEntry(game?.id);

  const [startlistSearch, setStartlistSearch] = useState("");
  const [startlistTeamFilter, setStartlistTeamFilter] = useState("all");
  const { data: startlist = [], isLoading: startlistLoading } = useStartlist(
    game?.id,
    startlistSearch,
    startlistTeamFilter === "all" ? "" : startlistTeamFilter
  );

  // Renners die in een categorie zitten — niet beschikbaar als joker
  const categoryRiderIds = useMemo(() => {
    const set = new Set<string>();
    for (const category of categories) {
      for (const relation of category.category_riders ?? []) {
        if (relation.riders) set.add(relation.riders.id);
      }
    }
    return set;
  }, [categories]);

  // Volledige startlijst (los van filters in de Startlijst-tab)
  const { data: fullStartlist = [] } = useStartlist(game?.id, "", "");

  const allStartlistRiders = useMemo(() => {
    const list: Array<{ id: string; name: string; start_number: number | null; teamName: string }> = [];
    for (const team of fullStartlist) {
      for (const rider of team.riders) {
        list.push({ ...rider, teamName: team.name });
      }
    }
    return list.sort((a, b) => (a.start_number ?? 9999) - (b.start_number ?? 9999));
  }, [fullStartlist]);

  // Jokerpool: alle renners die NIET in een categorie zitten
  const jokerPool = useMemo(
    () => allStartlistRiders.filter((r) => !categoryRiderIds.has(r.id)),
    [allStartlistRiders, categoryRiderIds]
  );

  const allTeams = useMemo(
    () => fullStartlist.map((t) => ({ id: t.id, name: t.name })),
    [fullStartlist]
  );

  const [jokerDraft1, setJokerDraft1] = useState("");
  const [jokerDraft2, setJokerDraft2] = useState("");
  const [gcPodium, setGcPodium] = useState<string[]>(["", "", ""]);
  const [pointsJersey, setPointsJersey] = useState("");
  const [mountainJersey, setMountainJersey] = useState("");
  const [youthJersey, setYouthJersey] = useState("");

  const isSubmitted = entry?.status === "submitted";
  // Hard lock: alleen wanneer admin de game op deadline/live/finished zet.
  // 'submitted' lockt het team NIET — de deelnemer kan altijd wijzigen tot de deadline.
  const gameLocked = Boolean(game?.status && ["closed", "locked", "live", "finished"].includes(game.status));
  const isLocked = gameLocked;

  // Hydrate predictions from DB once loaded
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current || !entry) return;
    if (!predictions) return;
    const podium = ["", "", ""];
    let pts = "", kom = "", youth = "";
    for (const p of predictions) {
      if (p.classification === "gc" && p.position >= 1 && p.position <= 3) podium[p.position - 1] = p.rider_id;
      if (p.classification === "points" && p.position === 1) pts = p.rider_id;
      if (p.classification === "kom" && p.position === 1) kom = p.rider_id;
      if (p.classification === "youth" && p.position === 1) youth = p.rider_id;
    }
    setGcPodium(podium);
    setPointsJersey(pts);
    setMountainJersey(kom);
    setYouthJersey(youth);
    if (jokerIds[0]) setJokerDraft1(jokerIds[0]);
    if (jokerIds[1]) setJokerDraft2(jokerIds[1]);
    hydratedRef.current = true;
  }, [entry, predictions, jokerIds]);

  // Auto-save predictions (debounced) when user changes them
  useEffect(() => {
    if (!entry || !hydratedRef.current || isSubmitted) return;
    const timer = setTimeout(() => {
      const list: Array<{ classification: "gc" | "points" | "kom" | "youth"; position: number; rider_id: string }> = [];
      gcPodium.forEach((rid, i) => { if (rid) list.push({ classification: "gc", position: i + 1, rider_id: rid }); });
      if (pointsJersey) list.push({ classification: "points", position: 1, rider_id: pointsJersey });
      if (mountainJersey) list.push({ classification: "kom", position: 1, rider_id: mountainJersey });
      if (youthJersey) list.push({ classification: "youth", position: 1, rider_id: youthJersey });
      savePredictions.mutate({ entryId: entry.id, predictions: list });
    }, 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gcPodium, pointsJersey, mountainJersey, youthJersey]);

  const selectedPickRiderIds = useMemo(() => {
    const s = new Set<string>();
    for (const arr of picksByCategory.values()) for (const id of arr) s.add(id);
    return s;
  }, [picksByCategory]);

  const handlePickToggle = async (categoryId: string, riderId: string) => {
    if (!entry) return;
    try {
      await togglePick.mutateAsync({ entryId: entry.id, categoryId, riderId });
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

  const handleRevert = async () => {
    if (!entry) return;
    try {
      await revertEntry.mutateAsync({ entryId: entry.id });
      toast({ title: "Team weer bewerkbaar — vergeet niet opnieuw in te dienen" });
    } catch (error) {
      toast({
        title: "Wijzigen mislukt",
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
              {gameLocked && (
                <div className="retro-border bg-secondary/50 p-3 text-sm">
                  🔒 De koers staat op <strong>{game.status}</strong> — wijzigen niet meer mogelijk.
                  {!isSubmitted && " Je huidige selectie telt als jouw inzending."}
                </div>
              )}
              {!gameLocked && isSubmitted && (
                <div className="retro-border bg-emerald-500/10 border-emerald-500/40 p-3 text-sm flex items-center justify-between gap-3">
                  <span>✅ <strong>Team ingediend.</strong> Wil je nog iets aanpassen? Klik op "Wijzigen" — vergeet daarna opnieuw in te dienen.</span>
                  <Button size="sm" variant="outline" onClick={handleRevert} disabled={revertEntry.isPending}>
                    ✏️ Wijzigen
                  </Button>
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
                  Kies exact 2 jokers uit de overige renners (niet in een categorie). {jokerPool.length} renners beschikbaar.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <RiderSearchSelect
                    riders={jokerPool}
                    value={jokerDraft1}
                    onChange={setJokerDraft1}
                    excludeIds={jokerDraft2 ? [jokerDraft2] : []}
                    placeholder="Joker 1 — zoek renner..."
                    disabled={Boolean(isLocked)}
                  />
                  <RiderSearchSelect
                    riders={jokerPool}
                    value={jokerDraft2}
                    onChange={setJokerDraft2}
                    excludeIds={jokerDraft1 ? [jokerDraft1] : []}
                    placeholder="Joker 2 — zoek renner..."
                    disabled={Boolean(isLocked)}
                  />
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
                  Voorspel de eindklassementen — zoek renners uit de startlijst.
                </p>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-display font-bold mb-2">Eindklassement podium</h3>
                    <div className="space-y-2">
                      {(["🥇 1e plaats", "🥈 2e plaats", "🥉 3e plaats"] as const).map((label, i) => {
                        const otherPodium = gcPodium.filter((_, j) => j !== i && Boolean(_));
                        return (
                          <div key={i}>
                            <label className="text-xs font-medium text-muted-foreground">{label}</label>
                            <RiderSearchSelect
                              riders={allStartlistRiders}
                              value={gcPodium[i]}
                              onChange={(v) => {
                                const next = [...gcPodium];
                                next[i] = v;
                                setGcPodium(next);
                              }}
                              excludeIds={otherPodium}
                              placeholder="Zoek renner..."
                              disabled={Boolean(isLocked)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="vintage-divider" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { label: "Puntentrui", value: pointsJersey, setter: setPointsJersey },
                      { label: "Bergtrui", value: mountainJersey, setter: setMountainJersey },
                      { label: "Jongerentrui", value: youthJersey, setter: setYouthJersey },
                    ].map(({ label, value, setter }) => (
                      <div key={label}>
                        <label className="text-xs font-medium text-muted-foreground">{label}</label>
                        <RiderSearchSelect
                          riders={allStartlistRiders}
                          value={value}
                          onChange={setter}
                          placeholder="Zoek renner..."
                          disabled={Boolean(isLocked)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>


              {!gameLocked && !isSubmitted && (
                <div className="retro-border bg-amber-500/10 border-amber-500/40 p-4 text-sm">
                  ⚠️ <strong>Let op:</strong> je team is nog <strong>niet ingediend</strong>. Druk op <em>"Team definitief indienen"</em> om je inzending te bevestigen.
                  Als de admin de koers op <strong>deadline</strong> of <strong>live</strong> zet zonder dat je hebt ingediend, telt je huidige selectie automatisch als jouw team.
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 justify-end items-stretch sm:items-center">
                {!gameLocked && isSubmitted && (
                  <Button
                    variant="outline"
                    onClick={handleRevert}
                    disabled={revertEntry.isPending}
                  >
                    ✏️ Wijzigen
                  </Button>
                )}
                <Button
                  onClick={handleSubmit}
                  disabled={Boolean(isLocked || isSubmitted || submitEntry.isPending)}
                  className="retro-border-primary font-bold"
                >
                  {isSubmitted ? "✅ Reeds ingediend" : "✅ Team definitief indienen"}
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
