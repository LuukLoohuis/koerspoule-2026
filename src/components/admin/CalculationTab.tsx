import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calculator, Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { Stage } from "./StagesTab";

export default function CalculationTab({
  activeGameId,
  stages,
}: {
  activeGameId: string;
  stages: Stage[];
}) {
  const [busy, setBusy] = useState(false);
  const [stageId, setStageId] = useState("");

  async function calcStage() {
    if (!supabase || !stageId) {
      toast.error("Kies een etappe");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.rpc("calculate_stage_points_v3", { p_stage_id: stageId });
      if (error) throw error;
      await supabase.rpc("update_total_ranking", { p_game_id: activeGameId });
      toast.success("Etappe herberekend en eindstand bijgewerkt");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function fullRecalc() {
    if (!supabase || !activeGameId) return;
    if (!confirm("Volledige herberekening: alle etappepunten en eindstanden worden opnieuw berekend. Doorgaan?")) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("full_recalculation_v3", { p_game_id: activeGameId });
      if (error) throw error;
      toast.success("Volledige herberekening voltooid");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function seedDefaults() {
    if (!supabase || !activeGameId) return;
    if (!confirm("Standaard puntentabellen laden? Bestaande puntenregels voor deze game worden vervangen.")) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("seed_default_points_schema", { p_game_id: activeGameId });
      if (error) throw error;
      toast.success("Standaard puntentabellen geladen (Stage 50→1, klassementen 25→1)");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2"><Sparkles className="w-5 h-5" />Puntentabellen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Stelt de standaard puntentabel in voor alle 5 klassementen (top 20).
            Etappe: 50/40/32/26/22/19/17/15/13/11/10/9/8/7/6/5/4/3/2/1.
            Klassementen (GC/KOM/Points/Youth): 25/20/16/13/11/10/9/8/7/6/5/4/3/2/1/1/1/1/1/1.
          </p>
          <Button data-testid="seed-defaults-btn" onClick={seedDefaults} disabled={busy} variant="outline">
            Laad standaard puntentabellen
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2"><Calculator className="w-5 h-5" />Etappe herberekenen</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <Label>Etappe</Label>
            <Select value={stageId} onValueChange={setStageId}>
              <SelectTrigger data-testid="recalc-stage-select"><SelectValue placeholder="Kies etappe" /></SelectTrigger>
              <SelectContent>
                {stages.map((s) => <SelectItem key={s.id} value={s.id}>Etappe {s.stage_number}{s.date ? ` (${s.date})` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button data-testid="recalc-stage-btn" onClick={calcStage} disabled={busy || !stageId} className="w-full">
              {busy ? "Bezig..." : "Herbereken etappe"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2 text-destructive"><AlertTriangle className="w-5 h-5" />Volledige herberekening</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Wist alle berekende etappepunten en totalen, en bouwt het volledige klassement opnieuw op vanuit de uitslagen.
            Gebruik dit na puntentabel-wijzigingen of bij correcties achteraf.
          </p>
          <Button data-testid="full-recalc-btn" onClick={fullRecalc} disabled={busy} variant="destructive">
            {busy ? "Bezig..." : "Volledige herberekening uitvoeren"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
