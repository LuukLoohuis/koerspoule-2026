import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, Trophy, LineChart } from "lucide-react";
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
  distance_km?: number | null;
  profile_image_url?: string | null;
  profile_data?: StageProfileData | null;
  is_gc?: boolean;
};

export type StageProfileData = {
  totalKm?: number;
  minEle?: number;
  maxEle?: number;
  points?: Array<{ km: number; hoogte: number }>;
  cols?: Array<{ km: number; naam: string; categorie: string }>;
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
  const [distanceKm, setDistanceKm] = useState<string>("");
  const [savingType, setSavingType] = useState<string | null>(null);
  const [savingKm, setSavingKm] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  // Profiel-data (JSON) bewerken via dialog.
  const [dataDialog, setDataDialog] = useState<Stage | null>(null);
  const [dataText, setDataText] = useState("");
  const [savingData, setSavingData] = useState(false);

  function openDataDialog(s: Stage) {
    setDataDialog(s);
    setDataText(s.profile_data ? JSON.stringify(s.profile_data, null, 2) : "");
  }

  function pointCount(s: Stage): number {
    return Array.isArray(s.profile_data?.points) ? s.profile_data!.points!.length : 0;
  }

  async function saveProfileData() {
    if (!supabase || !dataDialog) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(dataText);
    } catch {
      toast.error("Ongeldige JSON — kan niet parsen.");
      return;
    }
    const obj = parsed as { points?: unknown };
    const points = obj?.points;
    const validPoints =
      Array.isArray(points) &&
      points.length >= 2 &&
      points.every(
        (p) => p && typeof (p as { km?: unknown }).km === "number" && typeof (p as { hoogte?: unknown }).hoogte === "number",
      );
    if (typeof parsed !== "object" || parsed === null || !validPoints) {
      toast.error("Verwacht een object met een points-array van ≥2 items met numerieke km + hoogte.");
      return;
    }
    setSavingData(true);
    const { error } = await supabase.from("stages").update({ profile_data: parsed } as never).eq("id", dataDialog.id);
    setSavingData(false);
    if (error) {
      toast.error(`Opslaan mislukt: ${error.message}`);
      return;
    }
    toast.success("Profiel-data opgeslagen");
    setDataDialog(null);
    await reload();
  }

  async function clearProfileData() {
    if (!supabase || !dataDialog) return;
    setSavingData(true);
    const { error } = await supabase.from("stages").update({ profile_data: null } as never).eq("id", dataDialog.id);
    setSavingData(false);
    if (error) {
      toast.error(`Wissen mislukt: ${error.message}`);
      return;
    }
    toast.success("Profiel-data gewist");
    setDataDialog(null);
    await reload();
  }

  const regularStages = stages.filter((s) => !s.is_gc);
  const gcStage = stages.find((s) => s.is_gc) ?? null;
  const canCreateGc = !gcStage && regularStages.length >= 21;

  async function createStage() {
    if (!supabase || !activeGameId) return;
    const { error } = await supabase.from("stages").insert({
      game_id: activeGameId,
      stage_number: stageNumber,
      name: stageName.trim() || `Etappe ${stageNumber}`,
      date: date || null,
      status: "draft",
      stage_type: stageType,
      distance_km: distanceKm ? Number(distanceKm) : null,
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
    setDistanceKm("");
    await reload();
  }

  async function createGcStage() {
    if (!supabase || !activeGameId) return;
    if (!confirm("GC-etappe (Eindklassement) aanmaken? Deze verschijnt als 22e etappe in de uitslagen-tab.")) return;
    const { error } = await supabase.from("stages").insert({
      game_id: activeGameId,
      stage_number: 22,
      name: "Eindklassement (GC)",
      status: "draft",
      stage_type: "vlak" as StageType,
      is_gc: true,
    } as never);
    if (error) {
      toast.error(`GC-etappe aanmaken mislukt: ${error.message}`);
      return;
    }
    toast.success("GC-etappe aangemaakt");
    await reload();
  }

  async function deleteStage(id: string, isGc?: boolean) {
    if (!supabase) return;
    const msg = isGc
      ? "GC-etappe verwijderen? Voorspellingspunten blijven bestaan, maar de GC-tab in de frontend verdwijnt."
      : "Etappe verwijderen? Resultaten worden ook gewist.";
    if (!confirm(msg)) return;
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
    const existing = new Set(regularStages.map((s) => s.stage_number));
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

  async function updateKm(id: string, value: string) {
    if (!supabase) return;
    setSavingKm(id);
    const km = value ? Number(value) : null;
    const { error } = await supabase.from("stages").update({ distance_km: km } as never).eq("id", id);
    setSavingKm(null);
    if (error) {
      toast.error(`KM opslaan mislukt: ${error.message}`);
      return;
    }
    await reload();
  }

  async function uploadProfile(id: string, file: File | undefined | null) {
    if (!supabase || !file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Kies een afbeelding (png/jpg).");
      return;
    }
    setUploading(id);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${activeGameId}/${id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("stage-profiles")
        .upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("stage-profiles").getPublicUrl(path);
      // cache-bust zodat een nieuwe upload meteen zichtbaar is
      const url = `${pub.publicUrl}?v=${Date.now()}`;
      const { error: updErr } = await supabase.from("stages").update({ profile_image_url: url } as never).eq("id", id);
      if (updErr) throw updErr;
      toast.success("Profiel geüpload");
      await reload();
    } catch (e) {
      toast.error(`Upload mislukt: ${(e as Error).message}`);
    } finally {
      setUploading(null);
    }
  }

  async function clearProfile(id: string) {
    if (!supabase) return;
    const { error } = await supabase.from("stages").update({ profile_image_url: null } as never).eq("id", id);
    if (error) {
      toast.error(`Verwijderen mislukt: ${error.message}`);
      return;
    }
    toast.success("Profiel verwijderd");
    await reload();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="font-display">Nieuwe etappe</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-7">
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
            <Label>Km</Label>
            <Input
              type="number"
              min={0}
              max={400}
              placeholder="bv. 198"
              value={distanceKm}
              onChange={(e) => setDistanceKm(e.target.value)}
            />
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
        <CardContent className="pt-0 flex flex-wrap gap-2">
          <Button data-testid="bulk-21-btn" variant="outline" onClick={() => bulkCreate(21)}>+ 21 etappes aanmaken (Grand Tour)</Button>
          <Button
            variant="outline"
            onClick={createGcStage}
            disabled={!canCreateGc}
            title={
              gcStage
                ? "GC-etappe bestaat al"
                : regularStages.length < 21
                ? "Maak eerst alle 21 etappes aan"
                : undefined
            }
            className="gap-2"
          >
            <Trophy className="w-4 h-4" />
            GC-etappe aanmaken
          </Button>
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
                <TableHead className="w-24">Km</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Profiel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stages.map((s) => (
                <TableRow key={s.id} className={s.is_gc ? "bg-amber-50/40" : undefined}>
                  <TableCell className="font-medium">{s.stage_number}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {s.is_gc && (
                        <Badge className="bg-amber-500 hover:bg-amber-500 text-white gap-1">
                          <Trophy className="w-3 h-3" /> GC
                        </Badge>
                      )}
                      <span>{s.name ?? `Etappe ${s.stage_number}`}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.date ?? "—"}</TableCell>
                  <TableCell>
                    {s.is_gc ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <Input
                        type="number"
                        min={0}
                        max={400}
                        defaultValue={s.distance_km ?? ""}
                        disabled={savingKm === s.id}
                        onBlur={(e) => {
                          const next = e.target.value;
                          const cur = s.distance_km == null ? "" : String(s.distance_km);
                          if (next !== cur) updateKm(s.id, next);
                        }}
                        className="h-8 w-20 text-sm"
                        placeholder="—"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {s.is_gc ? (
                      <span className="text-xs text-muted-foreground italic">eindklassement</span>
                    ) : (
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
                    )}
                  </TableCell>
                  <TableCell>
                    {s.is_gc ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        {s.profile_image_url && (
                          <img
                            src={s.profile_image_url}
                            alt="profiel"
                            className="h-8 w-16 object-cover rounded border border-border"
                          />
                        )}
                        <label className="cursor-pointer text-xs underline text-primary">
                          {uploading === s.id ? "Uploaden…" : s.profile_image_url ? "Vervang" : "Upload"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploading === s.id}
                            onChange={(e) => uploadProfile(s.id, e.target.files?.[0])}
                          />
                        </label>
                        {s.profile_image_url && (
                          <button
                            type="button"
                            className="text-xs text-destructive underline"
                            onClick={() => clearProfile(s.id)}
                          >
                            Verwijder
                          </button>
                        )}
                        {/* Profiel-data (JSON) — heeft in de app voorrang op de afbeelding */}
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs underline text-primary"
                          onClick={() => openDataDialog(s)}
                        >
                          <LineChart className="w-3.5 h-3.5" /> Profiel-data
                        </button>
                        <span className="text-[11px] text-muted-foreground">
                          {pointCount(s) >= 2 ? `✓ data (${pointCount(s)} punten)` : "—"}
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{s.status ?? "draft"}</Badge></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => deleteStage(s.id, s.is_gc)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {stages.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Nog geen etappes.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Profiel-data (JSON) bewerken */}
      <Dialog open={dataDialog !== null} onOpenChange={(o) => !o && setDataDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">
              Profiel-data · {dataDialog?.name ?? `Etappe ${dataDialog?.stage_number ?? ""}`}
            </DialogTitle>
            <DialogDescription>
              Plak de JSON: {"{ totalKm, minEle, maxEle, points:[{km,hoogte}], cols:[{km,naam,categorie}] }"}.
              Heeft in de app voorrang op de geüploade afbeelding.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={dataText}
            onChange={(e) => setDataText(e.target.value)}
            placeholder='{ "totalKm": 180, "minEle": 20, "maxEle": 1800, "points": [{ "km": 0, "hoogte": 20 }, ...], "cols": [] }'
            className="font-mono text-xs h-64"
          />
          <DialogFooter className="gap-2 sm:gap-2">
            {dataDialog?.profile_data && (
              <Button variant="outline" className="text-destructive" disabled={savingData} onClick={clearProfileData}>
                Wissen
              </Button>
            )}
            <Button disabled={savingData || !dataText.trim()} onClick={saveProfileData}>
              {savingData ? "Opslaan…" : "Opslaan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
