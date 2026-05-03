// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calculator, Sparkles, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import type { Stage } from "./StagesTab";

const DEFAULT_STAGE_POINTS = [50, 40, 32, 26, 22, 20, 18, 16, 14, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

export default function CalculationTab({
  activeGameId,
  stages,
}: {
  activeGameId: string;
  stages: Stage[];
}) {
  const [busy, setBusy] = useState(false);
  const [stageId, setStageId] = useState("");
  const [schemaPoints, setSchemaPoints] = useState<number[]>(DEFAULT_STAGE_POINTS);
  const [loadingSchema, setLoadingSchema] = useState(false);

  async function loadSchema() {
    if (!supabase || !activeGameId) return;
    setLoadingSchema(true);
    const { data, error } = await supabase
      .from("points_schema")
      .select("position, points")
      .eq("game_id", activeGameId)
      .eq("classification", "stage")
      .order("position", { ascending: true });
    setLoadingSchema(false);
    if (error) {
      toast.error(`Puntenschema laden mislukt: ${error.message}`);
      return;
    }
    const arr = [...DEFAULT_STAGE_POINTS];
    (data ?? []).forEach((row: any) => {
      if (row.position >= 1 && row.position <= 20) arr[row.position - 1] = row.points;
    });
    setSchemaPoints(arr);
  }

  useEffect(() => {
    loadSchema();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGameId]);

  async function saveSchema(values: number[]) {
    if (!supabase || !activeGameId) return;
    setBusy(true);
    try {
      const { error: delErr } = await supabase
        .from("points_schema")
        .delete()
        .eq("game_id", activeGameId)
        .eq("classification", "stage");
      if (delErr) throw delErr;
      const rows = values.map((points, i) => ({
        game_id: activeGameId,
        classification: "stage",
        position: i + 1,
        points,
      }));
      const { error: insErr } = await supabase.from("points_schema").insert(rows);
      if (insErr) throw insErr;
      setSchemaPoints(values);
      toast.success("Puntenschema opgeslagen");
    } catch (e) {
      toast.error(`Opslaan mislukt: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  function resetToDefault() {
    if (!confirm("Standaard puntentabel terugzetten? (50, 40, 32, ... , 1)")) return;
    saveSchema([...DEFAULT_STAGE_POINTS]);
  }

  // Try multiple RPC variants. Each variant has its own arg shape so we don't
  // pass unknown parameters (which makes Postgres report "function not found").
  async function callRpc(variants: Array<{ name: string; args: Record<string, unknown> }>): Promise<void> {
    if (!supabase) throw new Error("Supabase niet beschikbaar");
    let lastErr: Error | null = null;
    for (const v of variants) {
      const { error } = await supabase.rpc(v.name, v.args);
      if (!error) return;
      lastErr = new Error(`${v.name}: ${error.message}`);
      const msg = error.message.toLowerCase();
      // Only fall through to next variant if the function signature isn't found
      if (!msg.includes("could not find") && !msg.includes("does not exist") && !msg.includes("schema cache")) {
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
      await callRpc([
        { name: "calculate_stage_points_v4", args: { p_stage_id: stageId } },
        { name: "calculate_stage_points_v3", args: { p_stage_id: stageId } },
        { name: "calculate_stage_scores", args: { p_stage_id: stageId } },
      ]);
      // Voorspellingen meenemen (podium GC + truien) voor het totaal
      await callRpc([
        { name: "calculate_prediction_points", args: { p_game_id: activeGameId } },
      ]).catch(() => undefined);
      await callRpc([
        { name: "update_total_points_v4", args: { p_game_id: activeGameId } },
        { name: "update_total_ranking", args: { p_game_id: activeGameId } },
      ]);
      toast.success("Etappe herberekend en totaalstand bijgewerkt");
    } catch (e) {
      console.error("Recalc error:", e);
      toast.error(`Herberekenen mislukt: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function calcPredictions() {
    if (!supabase || !activeGameId) return;
    setBusy(true);
    try {
      await callRpc([
        { name: "calculate_prediction_points", args: { p_game_id: activeGameId } },
      ]);
      await callRpc([
        { name: "update_total_ranking", args: { p_game_id: activeGameId } },
      ]);
      toast.success("Voorspellingen herberekend en totaalstand bijgewerkt");
    } catch (e) {
      console.error("Predictions recalc error:", e);
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function fullRecalc() {
    if (!supabase || !activeGameId) return;
    if (!confirm("Volledige herberekening uitvoeren? Dit kan even duren.")) return;
    setBusy(true);
    try {
      await callRpc([
        { name: "full_recalculation_v4", args: { p_game_id: activeGameId } },
        { name: "full_recalculation_v3", args: { p_game_id: activeGameId } },
        { name: "full_recalculation", args: { p_game_id: activeGameId } },
      ]);
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
            Stelt de standaard etappepuntentabel in (top 20: 50, 40, 32, 26, 22, 20, 18, 16, 14, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1).
            Truien en GC-podium leveren punten via voorspellingen, niet via dit schema.
          </p>
          <Button data-testid="seed-defaults-btn" onClick={seedDefaults} disabled={busy} variant="outline">
            Laad standaard puntentabel
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
          <CardTitle className="font-display flex items-center gap-2"><Sparkles className="w-5 h-5" />Voorspellingen herberekenen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Bereken de podium-bonus (50 / 25, max 150) en truienpunten (25 per juiste winnaar)
            op basis van de laatst beschikbare uitslag.
          </p>
          <Button data-testid="recalc-predictions-btn" onClick={calcPredictions} disabled={busy} variant="outline">
            {busy ? "Bezig..." : "Herbereken voorspellingen"}
          </Button>
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
