import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export type Stage = {
  id: string;
  game_id: string;
  stage_number: number;
  date: string | null;
};

export default function StagesTab({
  activeGameId,
  stages,
  reload,
}: {
  activeGameId: string;
  stages: Stage[];
  reload: () => Promise<void> | void;
}) {
  const [stageNumber, setStageNumber] = useState(stages.length + 1);
  const [date, setDate] = useState("");

  async function createStage() {
    if (!supabase || !activeGameId) return;
    const { error } = await supabase.from("stages").insert({
      game_id: activeGameId,
      stage_number: stageNumber,
      date: date || null,
    });
    if (error) {
      toast.error(`Etappe aanmaken mislukt: ${error.message}`);
      return;
    }
    toast.success(`Etappe ${stageNumber} aangemaakt`);
    setStageNumber((v) => v + 1);
    setDate("");
    await reload();
  }

  async function deleteStage(id: string) {
    if (!supabase) return;
    if (!confirm("Etappe verwijderen? Resultaten en punten van deze etappe worden ook verwijderd.")) return;
    const { error } = await supabase.from("stages").delete().eq("id", id);
    if (error) {
      toast.error(`Verwijderen mislukt: ${error.message}`);
      return;
    }
    toast.success("Etappe verwijderd");
    await reload();
  }

  async function bulkCreate(n: number) {
    if (!supabase || !activeGameId) return;
    const existing = new Set(stages.map((s) => s.stage_number));
    const rows = [];
    for (let i = 1; i <= n; i++) {
      if (!existing.has(i)) rows.push({ game_id: activeGameId, stage_number: i });
    }
    if (rows.length === 0) {
      toast.info("Alle etappes bestaan al");
      return;
    }
    const { error } = await supabase.from("stages").insert(rows);
    if (error) {
      toast.error(`Bulk aanmaken mislukt: ${error.message}`);
      return;
    }
    toast.success(`${rows.length} etappes aangemaakt`);
    setStageNumber(n + 1);
    await reload();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="font-display">Nieuwe etappe</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div>
            <Label>Etappe nummer</Label>
            <Input data-testid="stage-number-input" type="number" min={1} value={stageNumber} onChange={(e) => setStageNumber(Number(e.target.value))} />
          </div>
          <div>
            <Label>Datum</Label>
            <Input data-testid="stage-date-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button data-testid="create-stage-btn" onClick={createStage}>Aanmaken</Button>
          </div>
          <div className="flex items-end gap-2">
            <Button data-testid="bulk-21-btn" variant="outline" onClick={() => bulkCreate(21)}>+ 21 etappes (Grand Tour)</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-display">Etappes ({stages.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Datum</TableHead><TableHead className="w-16"></TableHead></TableRow></TableHeader>
            <TableBody>
              {stages.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">Etappe {s.stage_number}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.date ?? "—"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => deleteStage(s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {stages.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Nog geen etappes.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
