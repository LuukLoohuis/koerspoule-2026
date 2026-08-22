import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import VerslagDialog from "@/components/admin/VerslagDialog";
import { Trash2, Trophy, Radio, Newspaper } from "lucide-react";
import { isMeermarathonGame, WEDSTRIJD_TYPES, defaultWedstrijdType, type WedstrijdType } from "@/lib/gameTypes";
import StageLiveTracks from "@/components/admin/StageLiveTracks";
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
  ijs_type?: string | null;
  wedstrijd_type?: string | null;
  aantal_rondes?: number | null;
};

export type StageProfileData = {
  totalKm?: number;
  minEle?: number;
  maxEle?: number;
  climbMeters?: number;
  points?: Array<{ km: number; hoogte: number }>;
  cols?: Array<{
    km: number | null;
    naam: string;
    categorie: string | null;
    lengteKm?: number;
    percentage?: number;
    geschat?: boolean;
  }>;
  sprints?: Array<{ km: number; naam: string }>;
};

export default function StagesTab({
  activeGameId,
  stages,
  reload,
  gameType,
}: {
  activeGameId: string;
  stages: Stage[];
  reload: () => Promise<void> | void;
  gameType?: string | null;
}) {
  // Live-uitslagen bestaan alleen bij Meermarathon; de koerspoules hebben geen bron.
  const isMeermarathon = isMeermarathonGame(gameType);
  const [liveDialog, setLiveDialog] = useState<Stage | null>(null);
  const [stageNumber, setStageNumber] = useState(stages.length + 1);
  const [stageName, setStageName] = useState("");
  const [date, setDate] = useState("");
  const [stageType, setStageType] = useState<StageType>("vlak");
  const [distanceKm, setDistanceKm] = useState<string>("");
  const [savingType, setSavingType] = useState<string | null>(null);
  const [savingKm, setSavingKm] = useState<string | null>(null);
  // Profiel-data (JSON) bewerken via dialog.
  const [verslagDialog, setVerslagDialog] = useState<Stage | null>(null);

  // Voorbeschouwing-sectie per game aan/uit.
  const [voorVisible, setVoorVisible] = useState(false);
  const [savingVoor, setSavingVoor] = useState(false);
  useEffect(() => {
    if (!supabase || !activeGameId) return;
    (async () => {
      const { data } = await supabase.from("games").select("voorbeschouwing_visible").eq("id", activeGameId).maybeSingle();
      setVoorVisible(Boolean((data as { voorbeschouwing_visible?: boolean } | null)?.voorbeschouwing_visible));
    })();
  }, [activeGameId]);

  async function toggleVoor(next: boolean) {
    if (!supabase || !activeGameId) return;
    setSavingVoor(true);
    const { error } = await supabase.from("games").update({ voorbeschouwing_visible: next } as never).eq("id", activeGameId);
    setSavingVoor(false);
    if (error) { toast.error(`Opslaan mislukt: ${error.message}`); return; }
    setVoorVisible(next);
    toast.success(next ? "Voorbeschouwing zichtbaar" : "Voorbeschouwing verborgen");
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
  // Meermarathon meet kunstijs in ronden en natuurijs in kilometers; daarom een
  // eigen veld naast distance_km in plaats van dat te overladen.
  async function updateRondes(id: string, value: string) {
    if (!supabase) return;
    const n = value.trim() === "" ? null : Number(value);
    if (n !== null && (!Number.isFinite(n) || n <= 0)) { toast.error("Aantal ronden moet groter dan 0 zijn"); return; }
    setSavingKm(id);
    const { error } = await supabase.from("stages").update({ aantal_rondes: n } as never).eq("id", id);
    setSavingKm(null);
    if (error) { toast.error(`Opslaan mislukt: ${error.message}`); return; }
    await reload();
  }

  async function updateWedstrijdType(id: string, type: WedstrijdType) {
    if (!supabase) return;
    setSavingType(id);
    const { error } = await supabase.from("stages").update({ wedstrijd_type: type } as never).eq("id", id);
    setSavingType(null);
    if (error) { toast.error(`Opslaan mislukt: ${error.message}`); return; }
    await reload();
  }


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="font-display text-base">Voorbeschouwing-sectie (L'Équipe)</CardTitle>
          <Button size="sm" variant={voorVisible ? "default" : "outline"} disabled={savingVoor || !activeGameId} onClick={() => toggleVoor(!voorVisible)} className="h-8">
            {voorVisible ? "Zichtbaar" : "Verborgen"}
          </Button>
        </CardHeader>
      </Card>

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
                <TableHead className="w-24">{isMeermarathon ? "Maat" : "Km"}</TableHead>
                {isMeermarathon && <TableHead className="w-36">Soort</TableHead>}
                <TableHead>Type</TableHead>
                <TableHead>Profiel</TableHead>
                {isMeermarathon && <TableHead className="w-28">Live</TableHead>}
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
                      (() => {
                        // Kunstijs telt ronden, natuurijs kilometers.
                        const opRonden = isMeermarathon && s.ijs_type !== "natuurijs";
                        const huidig = opRonden ? s.aantal_rondes : s.distance_km;
                        return (
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              min={0}
                              max={opRonden ? 999 : 400}
                              defaultValue={huidig ?? ""}
                              disabled={savingKm === s.id}
                              onBlur={(e) => {
                                const next = e.target.value;
                                const cur = huidig == null ? "" : String(huidig);
                                if (next === cur) return;
                                if (opRonden) updateRondes(s.id, next);
                                else updateKm(s.id, next);
                              }}
                              className="h-8 w-16 text-sm"
                              placeholder="—"
                            />
                            {isMeermarathon && (
                              <span className="text-[10px] text-muted-foreground">
                                {opRonden ? "ronden" : "km"}
                              </span>
                            )}
                          </div>
                        );
                      })()
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
                        {/* Upload en Profiel-data zijn eruit: die route gebruiken
                            we niet meer. Bestaande afbeeldingen blijven staan en
                            worden nog getoond in de voorbeschouwing en op de
                            etappepagina -- alleen beheren gaat niet meer vanaf
                            hier. */}
                        {/* Verslag: de terugblik die als hoofdartikel in de
                            Koerskrant komt te staan. */}
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs underline text-primary"
                          onClick={() => setVerslagDialog(s)}
                        >
                          <Newspaper className="w-3.5 h-3.5" /> Verslag
                        </button>
                      </div>
                    )}
                  </TableCell>
                  {isMeermarathon && (
                    <TableCell>
                      <Select
                        value={(s.wedstrijd_type as WedstrijdType | null) ?? defaultWedstrijdType(s.ijs_type)}
                        onValueChange={(v) => updateWedstrijdType(s.id, v as WedstrijdType)}
                        disabled={savingType === s.id}
                      >
                        <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {WEDSTRIJD_TYPES.map((w) => (
                            <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  )}
                  {isMeermarathon && (
                    <TableCell>
                      <Button
                        variant={s.ijs_type ? "secondary" : "outline"}
                        size="sm"
                        className="h-7 gap-1.5 text-xs"
                        onClick={() => setLiveDialog(s)}
                      >
                        <Radio className="h-3.5 w-3.5" />
                        {s.ijs_type ?? "koppel"}
                      </Button>
                    </TableCell>
                  )}
                  <TableCell><Badge variant="outline" className="text-xs">{s.status ?? "draft"}</Badge></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => deleteStage(s.id, s.is_gc)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {stages.length === 0 && (
                <TableRow><TableCell colSpan={isMeermarathon ? 10 : 8} className="text-center text-muted-foreground py-6">Nog geen etappes.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Profiel-data (JSON) bewerken */}
      <VerslagDialog stage={verslagDialog} onClose={() => setVerslagDialog(null)} />

      {liveDialog && (
        <StageLiveTracks
          stageId={liveDialog.id}
          stageNumber={liveDialog.stage_number}
          ijsType={liveDialog.ijs_type ?? null}
          open={Boolean(liveDialog)}
          onOpenChange={(open) => { if (!open) setLiveDialog(null); }}
          onSaved={reload}
        />
      )}
    </div>
  );
}
