import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import CompareSetup from "@/components/CompareSetup";
import { useSubpoules } from "@/hooks/useSubpoules";
import { cn } from "@/lib/utils";

type Props = { gameId?: string };

export default function BenchmarkTab({ gameId }: Props) {
  // Scope: undefined = hele koers; anders alleen leden van deze subpoule.
  const [scopeSubpouleId, setScopeSubpouleId] = useState<string | undefined>(undefined);
  const { subpoules } = useSubpoules(gameId);

  if (!gameId) {
    return (
      <Card className="retro-border">
        <CardContent className="p-6 text-sm text-muted-foreground text-center">
          Kies eerst een actieve koers.
        </CardContent>
      </Card>
    );
  }

  const chips: Array<{ id: string | undefined; label: string }> = [
    { id: undefined, label: "Alle deelnemers" },
    ...subpoules.map((s) => ({ id: s.id, label: s.name })),
  ];

  return (
    <div className="max-w-3xl space-y-3">
      {/* Scope-chips: alleen tonen als de gebruiker in ≥1 subpoule zit. */}
      {subpoules.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {chips.map((c) => {
            const active = scopeSubpouleId === c.id;
            return (
              <button
                key={c.id ?? "all"}
                type="button"
                onClick={() => setScopeSubpouleId(c.id)}
                aria-pressed={active}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-secondary/60",
                )}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      )}

      <CompareSetup gameId={gameId} subpouleId={scopeSubpouleId} />
    </div>
  );
}
