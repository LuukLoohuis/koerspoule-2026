import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calculator, Sparkles } from "lucide-react";
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

  async function callRpc(fnNames: string[], args: Record<string, unknown>): Promise<void> {
    if (!supabase) throw new Error("Supabase niet beschikbaar");
    let lastErr: Error | null = null;
    for (const fn of fnNames) {
      const { error } = await supabase.rpc(fn, args);
      if (!error) return;
      lastErr = new Error(`${fn}: ${error.message}`);
      // Probeer volgende RPC alleen als deze 'function not found' geeft
      if (!error.message.toLowerCase().includes("could not find") && !error.message.toLowerCase().includes("does not exist")) {
        throw lastErr;
      }
    }
    throw lastErr ?? new Error("Geen RPC gelukt");
  }

  async function calcStage() {
    if (!supabase || !stageId) {
      toast.error("Kies een etappe");
      return;
    }
    setBusy(true);
    try {
      // V4 score engine (gebruikt entry_picks + entry_jokers + stage_results multi-position)
      await callRpc(
        ["calculate_stage_points_v4", "calculate_stage_points_v3", "calculate_stage_scores"],
        { p_stage_id: stageId, stage_id: stageId }
      );
      // Ook totalstand bijwerken
      await callRpc(
        ["update_total_points_v4", "update_total_ranking"],
        { p_game_id: activeGameId }
      );
      toast.success("Etappe herberekend en totaalstand bijgewerkt");
    } catch (e) {
      console.error("Recalc error:", e);
      toast.error(`Herberekenen mislukt: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function fullRecalc() {
    if (!supabase || !activeGameId) return;
    if (!confirm("Volledige herberekening uitvoeren? Dit kan even duren.")) return;
    setBusy(true);
    try {
      await callRpc(
        ["full_recalculation_v4", "full_recalculation_v3", "full_recalculation"],
        { p_game_id: activeGameId }
      );
      toast.success("Volledige herberekening voltooid");
    } catch (e) {
      console.error("Full recalc error:", e);
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function seedDefaults() {
    if (!supabase || !activeGameId) return;
    if (!confirm("Standaard puntentabellen laden? Bestaande puntenregels worden vervangen.")) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("seed_default_points_schema", { p_game_id: activeGameId });
      if (error) throw error;
      toast.success("Standaard puntentabellen geladen");
    } catch (e) {
      console.error("Seed error:", e);
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
            Stelt de standaard puntentabel in voor alle 5 klassementen (top 20):
            Etappe 50→1, klassementen (GC/KOM/Points/Youth) 25→1.
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
              {busy ? "Bezig..." : "Herbereken"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2 text-destructive">Volledige herberekening</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Wist alle berekende punten en bouwt het klassement opnieuw op vanuit de uitslagen.
          </p>
          <Button data-testid="full-recalc-btn" onClick={fullRecalc} disabled={busy} variant="destructive">
            {busy ? "Bezig..." : "Volledige herberekening"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
