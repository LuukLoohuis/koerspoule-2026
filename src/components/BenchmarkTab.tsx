import { Card, CardContent } from "@/components/ui/card";
import CompareSetup from "@/components/CompareSetup";

type Props = { gameId?: string };

export default function BenchmarkTab({ gameId }: Props) {
  if (!gameId) {
    return (
      <Card className="retro-border">
        <CardContent className="p-6 text-sm text-muted-foreground text-center">
          Kies eerst een actieve koers.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl">
      <CompareSetup gameId={gameId} />
    </div>
  );
}
