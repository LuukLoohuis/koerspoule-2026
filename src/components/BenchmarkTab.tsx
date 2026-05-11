import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Swords } from "lucide-react";
import { useSubpoules } from "@/hooks/useSubpoules";
import SubpouleBenchmark from "@/components/SubpouleBenchmark";
import { cn } from "@/lib/utils";

type Props = { gameId?: string };

export default function BenchmarkTab({ gameId }: Props) {
  const { subpoules, isLoading } = useSubpoules(gameId);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeId && subpoules.length > 0) setActiveId(subpoules[0].id);
    if (activeId && !subpoules.some((s) => s.id === activeId)) setActiveId(subpoules[0]?.id ?? null);
  }, [subpoules, activeId]);

  if (!gameId) {
    return (
      <Card className="retro-border">
        <CardContent className="p-6 text-sm text-muted-foreground text-center">
          Kies eerst een actieve koers.
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="retro-border">
        <CardContent className="p-6 text-sm text-muted-foreground">Laden…</CardContent>
      </Card>
    );
  }

  if (subpoules.length === 0) {
    return (
      <Card className="retro-border">
        <CardContent className="p-6 text-sm text-muted-foreground text-center space-y-2">
          <Users className="h-8 w-8 text-muted-foreground/50 mx-auto" />
          <p className="font-display font-bold text-foreground">Nog geen subpoule</p>
          <p>Sluit je eerst aan bij een subpoule om de benchmark te kunnen gebruiken.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      {subpoules.length > 1 && (
        <Card className="retro-border">
          <CardHeader className="border-b-2 border-foreground bg-secondary/30 py-3">
            <CardTitle className="font-display flex items-center gap-2 text-base">
              <Swords className="h-5 w-5 text-primary" /> Kies subpoule
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="flex flex-wrap gap-2">
              {subpoules.map((s) => (
                <Button
                  key={s.id}
                  size="sm"
                  variant={s.id === activeId ? "default" : "outline"}
                  onClick={() => setActiveId(s.id)}
                  className={cn(s.id === activeId && "shadow-sm")}
                >
                  {s.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {activeId && <SubpouleBenchmark subpouleId={activeId} gameId={gameId} />}
    </div>
  );
}
