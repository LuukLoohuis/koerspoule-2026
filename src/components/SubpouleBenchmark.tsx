import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Swords, Crown, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useSubpouleEntries } from "@/hooks/useSubpouleEntries";
import { useCategories } from "@/hooks/useCategories";
import { cn } from "@/lib/utils";

type Props = { subpouleId: string };

export default function SubpouleBenchmark({ subpouleId }: Props) {
  const { user } = useAuth();
  const { data: game } = useCurrentGame();
  const { data, isLoading } = useSubpouleEntries(subpouleId, game?.id);
  const { data: categories = [] } = useCategories(game?.id);

  const [query, setQuery] = useState("");
  const [opponentId, setOpponentId] = useState<string | null>(null);

  const me = useMemo(
    () => data?.entries.find((e) => e.user_id === user?.id) ?? null,
    [data, user?.id]
  );
  const opponent = useMemo(
    () => (opponentId ? data?.entries.find((e) => e.user_id === opponentId) ?? null : null),
    [data, opponentId]
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.entries
      .filter((e) => e.user_id !== user?.id)
      .filter((e) => {
        if (!q) return true;
        return (
          e.display_name.toLowerCase().includes(q) ||
          (e.team_name?.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) => b.total_points - a.total_points);
  }, [data, query, user?.id]);

  // Set-intersection (light)
  const overlap = useMemo(() => {
    if (!me || !opponent) return null;
    const mine = new Set(Array.from(me.picks.values()).flat());
    const theirs = new Set(Array.from(opponent.picks.values()).flat());
    const sharedPicks: string[] = [];
    for (const id of mine) if (theirs.has(id)) sharedPicks.push(id);
    const sharedJokers: string[] = [];
    for (const id of me.jokers) if (opponent.jokers.has(id)) sharedJokers.push(id);
    const totalUnique = new Set([...mine, ...theirs]).size;
    const pct = totalUnique > 0 ? Math.round((sharedPicks.length / totalUnique) * 100) : 0;
    return { sharedPicks, sharedJokers, pct, diffCount: totalUnique - sharedPicks.length };
  }, [me, opponent]);

  if (isLoading) {
    return (
      <Card className="retro-border">
        <CardContent className="p-6 text-sm text-muted-foreground">Laden…</CardContent>
      </Card>
    );
  }

  if (!me) {
    return (
      <Card className="retro-border">
        <CardContent className="p-6 text-sm text-muted-foreground">
          Je hebt nog geen team in deze koers. Maak eerst een team aan om te kunnen vergelijken.
        </CardContent>
      </Card>
    );
  }

  const sortedCats = [...categories].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const ridersById = data?.ridersById ?? new Map();

  return (
    <div className="space-y-4">
      <Card className="retro-border">
        <CardHeader className="border-b-2 border-foreground bg-secondary/30 py-3">
          <CardTitle className="font-display flex items-center gap-2 text-base">
            <Swords className="h-5 w-5 text-primary" /> Team Benchmark
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Zoek op naam of teamnaam..."
              className="pl-9"
            />
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-border border border-border rounded-md">
            {filtered.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                {query ? "Geen resultaten" : "Geen andere deelnemers in deze subpoule."}
              </div>
            ) : (
              filtered.map((e) => (
                <button
                  key={e.user_id}
                  onClick={() => setOpponentId(e.user_id === opponentId ? null : e.user_id)}
                  className={cn(
                    "w-full px-3 py-2 flex items-center justify-between text-left hover:bg-secondary/40 transition-colors",
                    opponentId === e.user_id && "bg-accent/20"
                  )}
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{e.display_name}</div>
                    {e.team_name && (
                      <div className="text-xs text-muted-foreground truncate">{e.team_name}</div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-display font-bold tabular-nums">{e.total_points}</div>
                    <div className="text-[10px] text-muted-foreground">pt</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {opponent && overlap && (
        <Card className="retro-border">
          <CardHeader className="border-b-2 border-foreground bg-secondary/30 py-3">
            <CardTitle className="font-display flex items-center justify-between gap-2 text-base flex-wrap">
              <span>Jij vs {opponent.display_name}</span>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="font-mono">{overlap.pct}% overlap</Badge>
                <Badge variant="outline" className="font-mono">{overlap.diffCount} verschil</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-3 gap-2 px-3 py-3 border-b-2 border-foreground bg-muted/30 text-center">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Jouw renners</p>
                <p className="font-display font-bold text-lg tabular-nums">{me.picks.size}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Gedeeld</p>
                <p className="font-display font-bold text-lg tabular-nums text-primary">{overlap.sharedPicks.length}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Hun renners</p>
                <p className="font-display font-bold text-lg tabular-nums">{opponent.picks.size}</p>
              </div>
            </div>

            <div className="divide-y divide-border">
              {sortedCats.map((cat) => {
                const myIds = me.picks.get(cat.id) ?? [];
                const oppIds = opponent.picks.get(cat.id) ?? [];
                const same = myIds.some((id) => oppIds.includes(id));

                return (
                  <div key={cat.id} className="px-3 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {cat.short_name || cat.name}
                      </span>
                      {same && (
                        <Badge variant="outline" className="text-[10px] gap-1 h-4 px-1.5">
                          <Star className="h-2.5 w-2.5" /> zelfde
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className={cn("flex items-center gap-1 truncate", same && "text-primary font-medium")}>
                        <span className="truncate">
                          {myIds.length === 0 ? "—" : myIds.map((id) => ridersById.get(id)?.name ?? "—").join(", ")}
                        </span>
                      </div>
                      <div className={cn("flex items-center gap-1 truncate", same && "text-primary font-medium")}>
                        <span className="truncate">
                          {oppIds.length === 0 ? "—" : oppIds.map((id) => ridersById.get(id)?.name ?? "—").join(", ")}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {overlap.sharedJokers.length > 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/20 border-t border-border">
                <Crown className="h-3 w-3 inline mr-1 text-primary" />
                {overlap.sharedJokers.length} gedeelde joker{overlap.sharedJokers.length > 1 ? "s" : ""}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
