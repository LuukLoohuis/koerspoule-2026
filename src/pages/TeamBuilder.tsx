import { useState } from "react";
import { riderCategories, type Rider } from "@/data/riders";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDeadline } from "@/hooks/useDeadline";
import CountdownBanner from "@/components/CountdownBanner";
export default function TeamBuilder() {
  const { toast } = useToast();
  const { phase } = useDeadline();
  const isLocked = phase !== "open";
  const [picks, setPicks] = useState<Record<number, Rider>>({});
  const [joker1, setJoker1] = useState("");
  const [joker1Nr, setJoker1Nr] = useState("");
  const [joker2, setJoker2] = useState("");
  const [joker2Nr, setJoker2Nr] = useState("");
  const [gcPodium, setGcPodium] = useState(["", "", ""]);
  const [pointsJersey, setPointsJersey] = useState("");
  const [mountainJersey, setMountainJersey] = useState("");
  const [youthJersey, setYouthJersey] = useState("");

  const totalSteps = riderCategories.length + 2; // categories + jokers + predictions
  const isCategories = currentStep < riderCategories.length;
  const isJokers = currentStep === riderCategories.length;
  const isPredictions = currentStep === riderCategories.length + 1;

  const currentCategory = isCategories ? riderCategories[currentStep] : null;

  const selectRider = (categoryId: number, rider: Rider) => {
    setPicks((prev) => ({ ...prev, [categoryId]: rider }));
  };

  const canGoNext = () => {
    if (isCategories && currentCategory) {
      return !!picks[currentCategory.id];
    }
    if (isJokers) return joker1.trim() !== "" && joker2.trim() !== "";
    return true;
  };

  const handleSubmit = () => {
    toast({
      title: "Team opgeslagen! 🚴",
      description: "Je ploeg is succesvol samengesteld. Veel succes!",
    });
  };

  const progressPct = ((currentStep + 1) / totalSteps) * 100;
  const completedPicks = Object.keys(picks).length;

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            Stel je ploeg samen
          </h1>
          <p className="text-muted-foreground font-serif">
            Kies 1 renner per categorie • {completedPicks}/{riderCategories.length} gekozen
          </p>
        </div>

        {/* Deadline banner */}
        {isLocked && (
          <CountdownBanner className="mb-8" />
        )}

        {/* Progress bar */}
        {!isLocked && (
        <div className="mb-8">
          <div className="h-2 bg-secondary rounded-full overflow-hidden retro-border">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1 text-center font-sans">
            Stap {currentStep + 1} van {totalSteps}
          </p>
        </div>
        )}

        {/* Category selection */}
        {!isLocked && isCategories && currentCategory && (
          <div className="retro-border bg-card p-6 animate-fade-in" key={currentCategory.id}>
            <div className="flex items-center gap-2 mb-1">
              <span className="jersey-badge bg-primary text-primary-foreground">
                #{currentCategory.id}
              </span>
              <h2 className="font-display text-xl font-bold">
                {currentCategory.name}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4 font-sans">
              Kies 1 renner:
            </p>

            <div className="space-y-2">
              {currentCategory.riders.map((rider) => {
                const isSelected = picks[currentCategory.id]?.number === rider.number;
                return (
                  <button
                    key={rider.number}
                    onClick={() => selectRider(currentCategory.id, rider)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-md border-2 transition-all text-left",
                      isSelected
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border hover:border-muted-foreground hover:bg-secondary"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-muted-foreground w-8">
                        #{rider.number}
                      </span>
                      <span className="font-medium font-sans">{rider.name}</span>
                    </div>
                    {isSelected && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Jokers */}
        {!isLocked && isJokers && (
          <div className="retro-border bg-card p-6 animate-fade-in">
            <h2 className="font-display text-xl font-bold mb-1">🃏 Jokers</h2>
            <p className="text-sm text-muted-foreground mb-4 font-sans">
              Kies 2 renners die NIET in de bovenstaande categorieën staan.
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Joker 1 — Naam</label>
                  <Input value={joker1} onChange={(e) => setJoker1(e.target.value)} placeholder="Naam renner" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Rugnr.</label>
                  <Input value={joker1Nr} onChange={(e) => setJoker1Nr(e.target.value)} placeholder="#" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Joker 2 — Naam</label>
                  <Input value={joker2} onChange={(e) => setJoker2(e.target.value)} placeholder="Naam renner" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Rugnr.</label>
                  <Input value={joker2Nr} onChange={(e) => setJoker2Nr(e.target.value)} placeholder="#" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Predictions */}
        {!isLocked && isPredictions && (
          <div className="retro-border bg-card p-6 animate-fade-in">
            <h2 className="font-display text-xl font-bold mb-1">🏆 Klassementsvoorspellingen</h2>
            <p className="text-sm text-muted-foreground mb-6 font-sans">
              Voorspel de truien en het podium. Juiste plek + renner = 50 punten!
            </p>

            <div className="space-y-6">
              {/* GC Podium */}
              <div>
                <h3 className="font-display font-bold mb-2">Eindklassement podium</h3>
                <div className="space-y-2">
                  {["🥇 1e plaats", "🥈 2e plaats", "🥉 3e plaats"].map((label, i) => (
                    <div key={i}>
                      <label className="text-xs font-medium text-muted-foreground">{label}</label>
                      <Input
                        value={gcPodium[i]}
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

              {/* Jerseys */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-jersey-green inline-block" />
                    Puntentrui
                  </label>
                  <Input value={pointsJersey} onChange={(e) => setPointsJersey(e.target.value)} placeholder="Naam" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-jersey-polka inline-block" />
                    Bergtrui
                  </label>
                  <Input value={mountainJersey} onChange={(e) => setMountainJersey(e.target.value)} placeholder="Naam" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-jersey-white border inline-block" />
                    Jongerentrui
                  </label>
                  <Input value={youthJersey} onChange={(e) => setYouthJersey(e.target.value)} placeholder="Naam" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="retro-border"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Vorige
          </Button>

          {currentStep < totalSteps - 1 ? (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!canGoNext()}
              className="retro-border-primary"
            >
              Volgende <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} className="retro-border-primary font-bold">
              ✅ Team opslaan
            </Button>
          )}
        </div>

        {/* Quick overview */}
        {completedPicks > 0 && (
          <div className="mt-8 retro-border bg-card p-4">
            <h3 className="font-display text-sm font-bold mb-2 text-muted-foreground uppercase tracking-wider">
              Jouw selectie tot nu toe
            </h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(picks).map(([catId, rider]) => (
                <span
                  key={catId}
                  className="jersey-badge bg-secondary text-secondary-foreground"
                >
                  {rider.name} #{rider.number}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
