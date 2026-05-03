import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Mountain, Users } from "lucide-react";
import FlagIcon from "@/components/FlagIcon";
import { usePalmares, type PalmaresGame, type PalmaresSubpoule } from "@/hooks/usePalmares";
import { cn } from "@/lib/utils";

function gameTypeToCountry(type: string | null): "IT" | "FR" | "ES" {
  const k = (type ?? "").toLowerCase();
  if (k === "tour" || k === "tdf") return "FR";
  if (k === "vuelta" || k === "vta") return "ES";
  return "IT"; // giro default
}

function StatTile({ value, label, color }: { value: number | string; label: string; color?: string }) {
  return (
    <div className="text-center p-3 rounded-lg bg-muted/30 border border-border">
      <p className={cn("font-display text-2xl font-bold", color ?? "text-foreground")}>{value}</p>
      <p className="text-[11px] text-muted-foreground font-sans mt-1 leading-tight">{label}</p>
    </div>
  );
}

function GameRow({ p }: { p: PalmaresGame }) {
  const isLive = p.status === "active" || p.status === "live";
  const country = gameTypeToCountry(p.game_type);
  return (
    <div className={cn("flex items-center justify-between px-4 py-3", isLive && "bg-primary/5")}>
      <div className="flex items-center gap-3 min-w-0">
        <FlagIcon country={country} className="w-6 h-5" />
        <div className="min-w-0">
          <p className="font-display font-bold text-sm truncate">{p.game_name}</p>
          <p className="text-[10px] text-muted-foreground font-sans">
            {isLive ? "🟢 Lopend" : p.year ? `${p.year}` : "Afgelopen"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 text-center shrink-0">
        <div>
          <p className="font-display font-bold text-sm">{p.stage_wins}</p>
          <p className="text-[10px] text-muted-foreground">zeges</p>
        </div>
        <div>
          <p className="font-display font-bold text-sm">{p.stage_podiums}</p>
          <p className="text-[10px] text-muted-foreground">podia</p>
        </div>
        <div className="min-w-[60px] text-right">
          <p className="font-display font-bold">#{p.my_rank}</p>
          <p className="text-[10px] text-muted-foreground">/ {p.total_participants}</p>
        </div>
      </div>
    </div>
  );
}

function SubpouleRow({ p }: { p: PalmaresSubpoule }) {
  const country = gameTypeToCountry(p.game_type);
  const medal = p.my_rank === 1 ? "🥇" : p.my_rank === 2 ? "🥈" : p.my_rank === 3 ? "🥉" : `#${p.my_rank}`;
  return (
    <div className={cn("flex items-center justify-between px-4 py-3", p.is_winner && "bg-primary/5")}>
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-lg w-7 text-center">{medal}</span>
        <div className="min-w-0">
          <p className="font-display font-bold text-sm truncate">{p.subpoule_name}</p>
          <p className="text-[10px] text-muted-foreground font-sans inline-flex items-center gap-1">
            <FlagIcon country={country} className="w-3.5 h-2.5" /> {p.game_name}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 text-center shrink-0">
        <div>
          <p className="font-display font-bold text-sm">{p.stage_wins}</p>
          <p className="text-[10px] text-muted-foreground">zeges</p>
        </div>
        <div>
          <p className="font-display font-bold text-sm">{p.stage_podiums}</p>
          <p className="text-[10px] text-muted-foreground">podia</p>
        </div>
        <div className="min-w-[60px] text-right">
          <p className={cn("font-display font-bold", p.my_rank <= 3 && "text-primary")}>#{p.my_rank}</p>
          <p className="text-[10px] text-muted-foreground">/ {p.total_members}</p>
        </div>
      </div>
    </div>
  );
}

export default function PalmaresPanel() {
  const { data, isLoading } = usePalmares();
  const games = data?.games ?? [];
  const subpoules = data?.subpoules ?? [];

  // Aggregates — Algemeen Klassement
  const gcWins = games.filter((g) => g.my_rank === 1).length;
  const gcPodiums = games.filter((g) => g.my_rank > 0 && g.my_rank <= 3).length;
  const gcStageWins = games.reduce((s, g) => s + g.stage_wins, 0);
  const gcBestRank = games.length ? Math.min(...games.map((g) => g.my_rank).filter((r) => r > 0)) : 0;

  // Aggregates — Subpoules
  const spWins = subpoules.filter((s) => s.is_winner).length;
  const spPodiums = subpoules.filter((s) => s.my_rank <= 3).length;
  const spStageWins = subpoules.reduce((s, p) => s + p.stage_wins, 0);
  const spBestRank = subpoules.length ? Math.min(...subpoules.map((s) => s.my_rank)) : 0;

  if (isLoading) {
    return (
      <Card className="retro-border">
        <CardContent className="p-6 text-sm text-muted-foreground">Palmares laden…</CardContent>
      </Card>
    );
  }

  if (games.length === 0 && subpoules.length === 0) {
    return (
      <Card className="retro-border">
        <CardContent className="p-6 text-sm text-muted-foreground">
          Nog geen palmares — speel een koers mee om hier je prestaties te zien.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Algemeen Klassement palmares */}
      <Card className="retro-border">
        <CardHeader className="border-b-2 border-foreground bg-secondary/50 py-3 px-4">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Mountain className="w-4 h-4 text-primary" /> Algemeen Klassement
            <Badge variant="outline" className="ml-auto text-xs">{games.length} koers{games.length === 1 ? "" : "en"}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile value={gcWins} label="Klassements­overwinningen" color="text-primary" />
            <StatTile value={gcPodiums} label="Klassements­podia" color="text-accent" />
            <StatTile value={gcStageWins} label="Etappe­overwinningen" />
            <StatTile value={gcBestRank ? `#${gcBestRank}` : "—"} label="Beste eindstand" color="text-muted-foreground" />
          </div>
          {games.length > 0 && (
            <div className="divide-y divide-border rounded-md border border-border overflow-hidden">
              {games.map((g) => <GameRow key={g.game_id} p={g} />)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subpoules palmares */}
      <Card className="retro-border">
        <CardHeader className="border-b-2 border-foreground bg-secondary/50 py-3 px-4">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Subpoules
            <Badge variant="outline" className="ml-auto text-xs">{subpoules.length} subpoule{subpoules.length === 1 ? "" : "s"}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile value={spWins} label="Subpoule­overwinningen" color="text-primary" />
            <StatTile value={spPodiums} label="Subpoule­podia" color="text-accent" />
            <StatTile value={spStageWins} label="Etappe­overwinningen" />
            <StatTile value={spBestRank ? `#${spBestRank}` : "—"} label="Beste eindstand" color="text-muted-foreground" />
          </div>
          {subpoules.length > 0 ? (
            <div className="divide-y divide-border rounded-md border border-border overflow-hidden">
              {subpoules.map((s) => <SubpouleRow key={s.subpoule_id} p={s} />)}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Word lid van een subpoule om hier resultaten te zien.</p>
          )}
        </CardContent>
      </Card>

      <p className="text-[11px] text-center text-muted-foreground italic font-serif inline-flex items-center justify-center gap-2 w-full">
        <Trophy className="h-3 w-3" /> Statistieken op basis van afgesloten etappes en huidige stand
      </p>
    </div>
  );
}
