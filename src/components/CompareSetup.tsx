import { useEffect, useMemo, useState } from "react";
import { Search, Swords, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useEntries } from "@/hooks/useResults";
import { useSubpouleMembers } from "@/hooks/useSubpoules";
import TeamComparison from "@/components/TeamComparison";

type Candidate = { user_id: string; name: string; total: number; rank: number };

/**
 * Gedeelde "vergelijk je team"-opzet voor beide benchmark-ingangen
 * (Hors Categorie → Benchmark en Mijn Peloton → Subpoules → Benchmark).
 *
 * Kies een tegenstander; daarna toont TeamComparison jouw team, jokers en
 * eindklassement-/truivoorspellingen naast die van de tegenstander.
 *
 * - Zonder subpouleId: alle deelnemers in de koers.
 * - Met subpouleId: alleen de leden van die subpoule.
 */
export default function CompareSetup({
  gameId,
  subpouleId,
}: {
  gameId?: string;
  subpouleId?: string;
}) {
  const { user } = useAuth();
  const { data: entries = [], isLoading: entriesLoading } = useEntries(gameId);
  const { data: members = [] } = useSubpouleMembers(subpouleId);

  // Kandidaten in de juiste scope, verrijkt met punten en rang.
  const { me, opponents } = useMemo(() => {
    const entryByUser = new Map(entries.map((e) => [e.user_id, e]));
    const base = subpouleId
      ? members.map((m) => ({
          user_id: m.user_id,
          name: entryByUser.get(m.user_id)?.team_name ?? m.display_name ?? "—",
          total: entryByUser.get(m.user_id)?.total_points ?? 0,
        }))
      : entries.map((e) => ({
          user_id: e.user_id,
          name: e.team_name ?? e.display_name ?? "—",
          total: e.total_points ?? 0,
        }));

    const ranked: Candidate[] = [...base]
      .sort((a, b) => b.total - a.total)
      .map((u, i) => ({ ...u, rank: i + 1 }));

    const meRow = ranked.find((u) => u.user_id === user?.id) ?? null;
    const others = ranked.filter((u) => u.user_id !== user?.id);
    return { me: meRow, opponents: others };
  }, [entries, members, subpouleId, user?.id]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // Auto-selecteer je naaste rivaal (de speler direct boven je), anders de
  // leider, anders de eerste — zodat er meteen iets te zien is.
  useEffect(() => {
    if (selectedId || opponents.length === 0) return;
    if (me) {
      const rival =
        [...opponents].sort((a, b) => a.rank - b.rank).find((o) => o.rank < me.rank) ??
        [...opponents].sort((a, b) => a.rank - b.rank)[0];
      setSelectedId(rival?.user_id ?? null);
    } else {
      setSelectedId(opponents[0]?.user_id ?? null);
    }
  }, [opponents, me, selectedId]);

  const selected = opponents.find((o) => o.user_id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? opponents.filter((o) => o.name.toLowerCase().includes(q)) : opponents;
    return [...list].sort((a, b) => a.rank - b.rank);
  }, [opponents, query]);

  if (entriesLoading) {
    return (
      <div className="retro-border bg-card p-4 text-sm text-muted-foreground">Laden…</div>
    );
  }

  if (opponents.length === 0) {
    return (
      <div className="retro-border bg-card p-6 text-sm text-muted-foreground text-center">
        {subpouleId
          ? "Nog geen andere deelnemers in deze subpoule om mee te vergelijken."
          : "Nog geen andere deelnemers in deze koers om mee te vergelijken."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tegenstander-kiezer */}
      <div className="retro-border bg-card overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary" />
        <div className="p-4 border-b-2 border-foreground bg-secondary/50 flex items-center gap-2">
          <Swords className="h-5 w-5 text-primary" />
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold leading-tight">Vergelijk je team</h2>
            <p className="text-[11px] text-muted-foreground">
              Kies een tegenstander — team, jokers én voorspellingen naast elkaar.
            </p>
          </div>
        </div>

        {/* Zoekbalk */}
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Zoek een deelnemer…"
              className="w-full h-10 pl-9 pr-3 text-base rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
            />
          </div>
        </div>

        {/* Kandidatenlijst — horizontaal scrollende chips */}
        <div className="flex gap-1.5 overflow-x-auto p-2.5 no-scrollbar">
          {filtered.length === 0 ? (
            <span className="text-sm text-muted-foreground italic px-1 py-1.5">Geen match.</span>
          ) : (
            filtered.map((o) => {
              const active = o.user_id === selectedId;
              return (
                <button
                  key={o.user_id}
                  onClick={() => setSelectedId(o.user_id)}
                  className={cn(
                    "shrink-0 flex items-center gap-2 rounded-full border px-3 py-1.5 transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-border bg-secondary/40 text-foreground/80 hover:bg-secondary hover:border-foreground/20"
                  )}
                  title={`${o.name} · ${o.total} pt`}
                >
                  <span
                    className={cn(
                      "inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold tabular-nums shrink-0",
                      o.rank === 1
                        ? "bg-amber-400 text-amber-950"
                        : o.rank === 2
                        ? "bg-zinc-300 text-zinc-900"
                        : o.rank === 3
                        ? "bg-orange-400 text-orange-950"
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    {o.rank}
                  </span>
                  <span className="text-sm font-medium whitespace-nowrap max-w-[140px] truncate">{o.name}</span>
                  <span className="text-[11px] font-mono text-muted-foreground tabular-nums">{o.total}pt</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Vergelijking */}
      {selected ? (
        <TeamComparison
          opponentUserId={selected.user_id}
          opponentName={selected.name}
          subpouleId={subpouleId}
        />
      ) : (
        <div className="retro-border bg-card p-6 text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
          <Users className="h-4 w-4" /> Kies hierboven een tegenstander.
        </div>
      )}
    </div>
  );
}
