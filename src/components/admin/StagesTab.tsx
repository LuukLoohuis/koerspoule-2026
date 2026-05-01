import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export const STAGE_TYPES = [
  { value: "vlak", label: "Vlak" },
  { value: "heuvelachtig", label: "Heuvelachtig" },
  { value: "tijdrit", label: "Tijdrit" },
  { value: "bergop", label: "Bergop" },
  { value: "ploegentijdrit", label: "Ploegentijdrit" },
] as const;

export type StageType = typeof STAGE_TYPES[number]["value"];

export function stageTypeLabel(t: string | null | undefined): string {
  return STAGE_TYPES.find((s) => s.value === t)?.label ?? "Vlak";
}

export type Stage = {
  id: string;
  game_id: string;
  stage_number: number;
  name: string | null;
  date: string | null;
  status: string | null;
  stage_type?: StageType | null;
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
  const [stageName, setStageName] = useState("");
  const [date, setDate] = useState("");
  const [stageType, setStageType] = useState<StageType>("vlak");
  const [savingType, setSavingType] = useState<string | null>(null);

  async function createStage() {
    if (!supabase || !activeGameId) return;
    const { error } = await supabase.from("stages").insert({
      game_id: activeGameId,
      stage_number: stageNumber,
      name: stageName.trim() || `Etappe ${stageNumber}`,
      date: date || null,
      status: "draft",
      stage_type: stageType,
    } as never);
    if (error) {
      console.error("Stage create error:", error);
      toast.error(`Etappe aanmaken mislukt: ${error.message}`);
      return;
    }
    toast.success(`Etappe ${stageNumber} aangemaakt`);
    setStageNumber((v) => v + 1);
    setStageName("");
    setDate("");
    setStageType("vlak");
    await reload();
  }

  async function deleteStage(id: string) {
    if (!supabase) return;
    if (!confirm("Etappe verwijderen? Resultaten worden ook gewist.")) return;
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
      if (!existing.has(i)) rows.push({
        game_id: activeGameId,
        stage_number: i,
        name: `Etappe ${i}`,
        status: "draft",
        stage_type: "vlak" as StageType,
      });
    }
    if (rows.length === 0) {
      toast.info("Alle etappes bestaan al");
      return;
    }
    const { error } = await supabase.from("stages").insert(rows as never);
    if (error) {
      toast.error(`Bulk aanmaken mislukt: ${error.message}`);
      return;
    }
    toast.success(`${rows.length} etappes aangemaakt`);
    setStageNumber(n + 1);
    await reload();
  }

  async function updateStageType(id: string, newType: StageType) {
    if (!supabase) return;
    setSavingType(id);
    const { error } = await supabase.from("stages").update({ stage_type: newType } as never).eq("id", id);
    setSavingType(null);
    if (error) {
      toast.error(`Wijzigen mislukt: ${error.message}`);
      return;
    }
    await reload();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="font-display">Nieuwe etappe</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-6">
          <div>
            <Label>Etappe nr.</Label>
            <Input data-testid="stage-number-input" type="number" min={1} value={stageNumber} onChange={(e) => setStageNumber(Number(e.target.value))} />
          </div>
          <div className="md:col-span-2">
            <Label>Naam (optioneel)</Label>
            <Input data-testid="stage-name-input" placeholder="bv. Bilbao → Bilbao" value={stageName} onChange={(e) => setStageName(e.target.value)} />
          </div>
          <div>
            <Label>Datum</Label>
            <Input data-testid="stage-date-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={stageType} onValueChange={(v) => setStageType(v as StageType)}>
              <SelectTrigger data-testid="stage-type-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAGE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button data-testid="create-stage-btn" onClick={createStage} className="w-full">Aanmaken</Button>
          </div>
        </CardContent>
        <CardContent className="pt-0">
          <Button data-testid="bulk-21-btn" variant="outline" onClick={() => bulkCreate(21)}>+ 21 etappes aanmaken (Grand Tour)</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-display">Etappes ({stages.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Naam</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stages.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.stage_number}</TableCell>
                  <TableCell>{s.name ?? `Etappe ${s.stage_number}`}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.date ?? "—"}</TableCell>
                  <TableCell>
                    <Select
                      value={s.stage_type ?? "vlak"}
                      onValueChange={(v) => updateStageType(s.id, v as StageType)}
                      disabled={savingType === s.id}
                    >
                      <SelectTrigger className="h-8 w-[150px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STAGE_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{s.status ?? "draft"}</Badge></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => deleteStage(s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {stages.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Nog geen etappes.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
