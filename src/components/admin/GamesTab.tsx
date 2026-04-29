import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export type Game = {
  id: string;
  name: string;
  game_type: "giro" | "tdf" | "vuelta" | null;
  year: number | null;
  status: "draft" | "open" | "locked" | "live" | "finished";
  start_date: string | null;
  end_date: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  giro: "Giro d'Italia",
  tdf: "Tour de France",
  vuelta: "Vuelta a España",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Concept",
  open: "Open (inschrijving)",
  locked: "Gesloten (deadline)",
  live: "Live (loopt)",
  finished: "Afgerond",
};

export default function GamesTab({
  games,
  setActiveGameId,
  reload,
}: {
  games: Game[];
  setActiveGameId: (id: string) => void;
  reload: () => Promise<void> | void;
}) {
  const [type, setType] = useState<"giro" | "tdf" | "vuelta">("tdf");
  const [year, setYear] = useState<string>(String(new Date().getFullYear() + 1));
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [creating, setCreating] = useState(false);

  async function createGame() {
    if (!supabase) return;
    const yr = Number(year);
    if (!Number.isFinite(yr) || yr < 1900 || yr > 2100) {
      toast.error("Vul een geldig jaartal in");
      return;
    }

    setCreating(true);
    try {
      const name = `${TYPE_LABELS[type]} ${yr}`;
      const { error } = await supabase.from("games").insert({
        name,
        game_type: type,
        year: yr,
        status: "draft",
        start_date: startDate || null,
        end_date: endDate || null,
      });
      if (error) throw error;
      toast.success(`${name} aangemaakt`);
      setStartDate("");
      setEndDate("");
      await reload();
    } catch (e) {
      const msg = (e as Error).message;
      toast.error(msg.includes("duplicate") ? "Deze game bestaat al" : `Aanmaken mislukt: ${msg}`);
    } finally {
      setCreating(false);
    }
  }

  async function setStatus(id: string, status: Game["status"]) {
    if (!supabase) return;
    const { error } = await supabase.from("games").update({ status }).eq("id", id);
    if (error) {
      toast.error(`Status wijzigen mislukt: ${error.message}`);
      return;
    }
    toast.success("Status bijgewerkt");
    await reload();
  }

  return (
    <div className="space-y-6">
      <Card data-testid="create-game-card">
        <CardHeader>
          <CardTitle className="font-display">Nieuwe game aanmaken</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-5">
          <div>
            <Label>Type koers</Label>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger data-testid="game-type-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="giro">Giro d'Italia</SelectItem>
                <SelectItem value="tdf">Tour de France</SelectItem>
                <SelectItem value="vuelta">Vuelta a España</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Jaartal</Label>
            <Input data-testid="game-year-input" type="number" value={year} onChange={(e) => setYear(e.target.value)} />
          </div>
          <div>
            <Label>Startdatum</Label>
            <Input data-testid="game-start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <Label>Einddatum</Label>
            <Input data-testid="game-end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button data-testid="create-game-btn" onClick={createGame} disabled={creating} className="w-full">
              {creating ? "Aanmaken..." : "Aanmaken"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display">Bestaande games ({games.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Jaar</TableHead>
                <TableHead>Naam</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {games.map((g) => (
                <TableRow key={g.id} data-testid={`game-row-${g.id}`}>
                  <TableCell>{TYPE_LABELS[g.game_type ?? ""] ?? g.game_type ?? "—"}</TableCell>
                  <TableCell>{g.year ?? "—"}</TableCell>
                  <TableCell>{g.name}</TableCell>
                  <TableCell>
                    <Select value={g.status} onValueChange={(v) => setStatus(g.id, v as Game["status"])}>
                      <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {g.start_date ?? "—"} → {g.end_date ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => setActiveGameId(g.id)} data-testid={`select-game-${g.id}`}>
                      Selecteer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {games.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Nog geen games. Maak hierboven je eerste game aan.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
