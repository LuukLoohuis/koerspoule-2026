import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Users, Flag } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useEntries } from "@/hooks/useResults";
import { useSubpouleMembers } from "@/hooks/useSubpoules";
import { cn } from "@/lib/utils";

type Props = {
  subpouleId: string;
  subpouleName: string;
  gameId?: string;
  gameStatus?: string;
  streekMin: number;
};

type Plaats = { naam: string; aantal: number; totaal: number; gemiddelde: number };

export default function StreekKlassement({ subpouleId, gameId, gameStatus, streekMin }: Props) {
  const { user } = useAuth();
  const { data: curGame } = useCurrentGame();
  const game = gameId ? { id: gameId, status: gameStatus } : curGame;
  const { data: members = [], isLoading: membersLoading } = useSubpouleMembers(subpouleId);
  const { data: entries = [] } = useEntries(game?.id);

  const min = Math.max(1, Math.round(streekMin || 1));

  // Punten per lid (uit bestaande totalen) — alleen leden mét woonplaats tellen mee.
  const rows = useMemo(() => {
    const ptsByUser = new Map<string, number>();
    for (const e of entries) ptsByUser.set(e.user_id, e.total_points ?? 0);
    return members
      .filter((m) => m.woonplaats?.trim())
      .map((m) => ({ user_id: m.user_id, woonplaats: m.woonplaats!.trim(), points: ptsByUser.get(m.user_id) ?? 0 }));
  }, [members, entries]);

  const totalPoints = useMemo(() => rows.reduce((s, r) => s + r.points, 0), [rows]);

  // Aggregatie per woonplaats, gesorteerd op GEMIDDELDE.
  const plaatsen = useMemo<Plaats[]>(() => {
    const byPlaats = new Map<string, { aantal: number; totaal: number }>();
    for (const r of rows) {
      const cur = byPlaats.get(r.woonplaats) ?? { aantal: 0, totaal: 0 };
      cur.aantal += 1;
      cur.totaal += r.points;
      byPlaats.set(r.woonplaats, cur);
    }
    return [...byPlaats.entries()]
      .map(([naam, v]) => ({ naam, aantal: v.aantal, totaal: v.totaal, gemiddelde: v.aantal ? v.totaal / v.aantal : 0 }))
      .sort((a, b) => b.gemiddelde - a.gemiddelde || b.aantal - a.aantal);
  }, [rows]);

  const boven = plaatsen.filter((p) => p.aantal >= min);
  const onder = plaatsen.filter((p) => p.aantal < min);

  const ownWoonplaats = user ? rows.find((r) => r.user_id === user.id)?.woonplaats : undefined;
  // Mini-ranglijst binnen eigen woonplaats.
  const ownRegio = useMemo(() => {
    if (!ownWoonplaats || !user) return null;
    const stad = rows
      .filter((r) => r.woonplaats === ownWoonplaats)
      .sort((a, b) => b.points - a.points);
    const pos = stad.findIndex((r) => r.user_id === user.id);
    if (pos < 0) return null;
    return { plaats: ownWoonplaats, pos: pos + 1, total: stad.length };
  }, [rows, ownWoonplaats, user]);

  if (membersLoading) {
    return (
      <Card className="retro-border overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary" />
        <CardContent className="p-4 space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-8 rounded bg-secondary/60 animate-pulse motion-reduce:animate-none" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Jouw positie binnen je woonplaats */}
      {ownRegio && (
        <div className="retro-border bg-[hsl(var(--vintage-gold))/0.10] p-3 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[hsl(var(--vintage-gold))] shrink-0" />
          <span className="text-sm font-sans">
            Jouw positie in <strong>{ownRegio.plaats}</strong>:{" "}
            <span className="font-display font-bold">{ownRegio.pos}e van {ownRegio.total}</span>
          </span>
        </div>
      )}

      <div className="retro-border bg-card overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary via-[hsl(var(--vintage-gold))] to-primary" />
        <div className="p-4 border-b-2 border-foreground bg-secondary/50">
          <h2 className="font-display text-lg font-bold flex items-center gap-2">
            <Flag className="h-5 w-5 text-[hsl(var(--vintage-gold))]" /> Streekklassement
          </h2>
          <p className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider mt-0.5">
            Woonplaatsen op gemiddelde punten per deelnemer
          </p>
        </div>

        {totalPoints === 0 ? (
          <CardContent className="p-5 text-center text-sm text-muted-foreground italic">
            Nog geen uitslagen — het streekklassement vult zich zodra er punten gescoord zijn.
          </CardContent>
        ) : (
          <div>
            {/* Hoofd-klassement (>= drempel) */}
            {boven.length > 0 ? (
              <ol>
                {boven.map((p, i) => {
                  const isOwn = p.naam === ownWoonplaats;
                  const rankCls = i === 0 ? "text-amber-400" : i === 1 ? "text-zinc-400" : i === 2 ? "text-orange-400" : "text-muted-foreground/40";
                  return (
                    <li
                      key={p.naam}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 border-b border-border/40",
                        i === 0 ? "border-l-[3px] border-amber-400/70 bg-amber-500/[0.04]"
                        : i === 1 ? "border-l-[3px] border-zinc-400/50 bg-zinc-500/[0.03]"
                        : i === 2 ? "border-l-[3px] border-orange-400/50 bg-orange-500/[0.03]"
                        : "border-l-[3px] border-transparent",
                        isOwn && "ring-1 ring-inset ring-primary/40 bg-primary/[0.06]",
                      )}
                    >
                      <span className={cn("shrink-0 w-7 text-center font-display font-black tabular-nums", rankCls, i <= 2 ? "text-xl" : "text-sm")}>{i + 1}</span>
                      <span className="flex-1 min-w-0 flex items-center gap-1.5">
                        <span className={cn("font-sans truncate", isOwn ? "font-bold text-primary" : "font-medium")}>{p.naam}</span>
                        {isOwn && <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/30 rounded px-1 py-px leading-4">jouw plaats</span>}
                      </span>
                      <span className="shrink-0 inline-flex items-center gap-1 text-[11px] text-muted-foreground font-mono" title="Aantal deelnemers">
                        <Users className="h-3 w-3" /> {p.aantal}
                      </span>
                      <span className="shrink-0 text-right min-w-[3.5rem]">
                        <span className="font-display font-bold tabular-nums text-base">{p.gemiddelde.toFixed(1)}</span>
                        <span className="text-[9px] text-muted-foreground font-mono ml-0.5">gem</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="px-4 py-3 text-sm text-muted-foreground italic">
                Nog geen enkele woonplaats haalt de drempel van {min} deelnemers.
              </p>
            )}

            {/* Onder de drempel — apart, rustiger */}
            {onder.length > 0 && (
              <div className="border-t border-dashed border-border">
                <p className="px-3 pt-2.5 pb-1 text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-muted-foreground/70">
                  Nog te weinig deelnemers
                </p>
                <ul>
                  {onder.map((p) => {
                    const isOwn = p.naam === ownWoonplaats;
                    return (
                      <li key={p.naam} className={cn("flex items-center gap-3 px-3 py-1.5 text-muted-foreground", isOwn && "text-primary")}>
                        <span className="flex-1 min-w-0 flex items-center gap-1.5">
                          <span className="font-sans text-sm truncate">{p.naam}</span>
                          {isOwn && <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/30 rounded px-1 py-px leading-4">jouw plaats</span>}
                        </span>
                        <span className="shrink-0 text-[11px] font-mono tabular-nums" title="Deelnemers / drempel">
                          {p.aantal}/{min}
                        </span>
                        <span className="shrink-0 text-right min-w-[3.5rem] text-[13px] font-mono tabular-nums opacity-70">
                          {p.gemiddelde.toFixed(1)} gem
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
