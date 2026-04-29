import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import { extractPdfText, parseProCyclingStatsStartlist, type ParsedStartlistTeam } from "@/lib/startlistImport";
import type { Category } from "./CategoriesTab";

export type Rider = {
  id: string;
  name: string;
  team: string | null;
  category_id: string | null;
  game_rider_id: string;
};

export default function StartlistTab({
  activeGameId,
  categories,
  riders,
  reload,
}: {
  activeGameId: string;
  categories: Category[];
  riders: Rider[];
  reload: () => Promise<void> | void;
}) {
  const [allRiders, setAllRiders] = useState<Array<{ id: string; name: string; team: string | null }>>([]);
  const [search, setSearch] = useState("");
  const [selectedRider, setSelectedRider] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [riderName, setRiderName] = useState("");
  const [riderTeam, setRiderTeam] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ParsedStartlistTeam[]>([]);
  const [importing, setImporting] = useState(false);

  async function loadAllRiders() {
    if (!supabase) return;
    const { data } = await supabase.from("riders").select("id, name, team").order("name");
    setAllRiders((data ?? []) as Array<{ id: string; name: string; team: string | null }>);
  }

  useEffect(() => { loadAllRiders(); }, []);

  async function createRider() {
    if (!supabase || !riderName.trim()) return;
    const { data, error } = await supabase
      .from("riders")
      .insert({ name: riderName.trim(), team: riderTeam.trim() || null })
      .select("id, name, team")
      .single();
    if (error) {
      toast.error(`Aanmaken mislukt: ${error.message}`);
      return;
    }
    toast.success("Renner aangemaakt");
    setRiderName("");
    setRiderTeam("");
    setAllRiders((prev) => [...prev, data as { id: string; name: string; team: string | null }].sort((a, b) => a.name.localeCompare(b.name)));
  }

  async function addToStartlist() {
    if (!supabase || !selectedRider) return;
    const { error } = await supabase.from("game_riders").insert({
      game_id: activeGameId,
      rider_id: selectedRider,
      category_id: selectedCategory || null,
    });
    if (error) {
      toast.error(`Toevoegen mislukt: ${error.message}`);
      return;
    }
    toast.success("Toegevoegd aan startlijst");
    setSelectedRider("");
    setSelectedCategory("");
    await reload();
  }

  async function removeFromStartlist(gameRiderId: string) {
    if (!supabase) return;
    const { error } = await supabase.from("game_riders").delete().eq("id", gameRiderId);
    if (error) {
      toast.error(`Verwijderen mislukt: ${error.message}`);
      return;
    }
    toast.success("Verwijderd");
    await reload();
  }

  async function changeCategory(gameRiderId: string, categoryId: string) {
    if (!supabase) return;
    const { error } = await supabase
      .from("game_riders")
      .update({ category_id: categoryId || null })
      .eq("id", gameRiderId);
    if (error) {
      toast.error(`Categorie wijzigen mislukt: ${error.message}`);
      return;
    }
    await reload();
  }

  async function loadPdfPreview() {
    if (!importFile) {
      toast.error("Kies eerst een PDF bestand");
      return;
    }
    try {
      const text = await extractPdfText(importFile);
      const parsed = parseProCyclingStatsStartlist(text);
      setImportPreview(parsed);
      toast.success(`Preview: ${parsed.length} teams, ${parsed.reduce((s, t) => s + t.riders.length, 0)} renners`);
    } catch (e) {
      toast.error(`Preview faalde: ${(e as Error).message}`);
    }
  }

  async function importFromPdf() {
    if (!supabase || !activeGameId || !importPreview.length) return;
    setImporting(true);
    try {
      let added = 0;
      for (const team of importPreview) {
        for (const r of team.riders) {
          // Upsert renner (zoek op name+team)
          const { data: existing } = await supabase
            .from("riders")
            .select("id")
            .eq("name", r.name)
            .eq("team", team.name)
            .maybeSingle();

          let riderId = existing?.id;
          if (!riderId) {
            const { data: inserted, error: insErr } = await supabase
              .from("riders")
              .insert({ name: r.name, team: team.name })
              .select("id")
              .single();
            if (insErr) throw insErr;
            riderId = inserted!.id;
          }

          // Voeg toe aan game_riders (uniek op game+rider)
          await supabase
            .from("game_riders")
            .upsert({ game_id: activeGameId, rider_id: riderId }, { onConflict: "game_id,rider_id" });
          added += 1;
        }
      }
      toast.success(`${added} renners geïmporteerd in de startlijst`);
      await reload();
      await loadAllRiders();
      setImportPreview([]);
      setImportFile(null);
    } catch (e) {
      toast.error(`Import mislukt: ${(e as Error).message}`);
    } finally {
      setImporting(false);
    }
  }

  const filteredRiders = riders.filter((r) =>
    !search.trim() || r.name.toLowerCase().includes(search.toLowerCase()) || (r.team ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card data-testid="pdf-import-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2"><Upload className="w-5 h-5" />PDF startlijst importeren</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Upload een ProCyclingStats startlijst PDF. Renners worden automatisch aangemaakt en toegevoegd aan de startlijst van deze game.
          </p>
          <div className="flex flex-col md:flex-row gap-2">
            <Input data-testid="pdf-file-input" type="file" accept=".pdf" onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} />
            <Button data-testid="pdf-preview-btn" variant="secondary" onClick={loadPdfPreview} disabled={!importFile}>
              <FileText className="w-4 h-4 mr-2" />Preview
            </Button>
            <Button data-testid="pdf-import-btn" onClick={importFromPdf} disabled={!importPreview.length || importing}>
              {importing ? "Importeren..." : `Importeer (${importPreview.reduce((s, t) => s + t.riders.length, 0)} renners)`}
            </Button>
          </div>
          {importPreview.length > 0 && (
            <div className="text-xs text-muted-foreground border rounded-md p-2 max-h-40 overflow-auto">
              {importPreview.map((t) => (
                <div key={t.name}><b>{t.name}</b> — {t.riders.length} renners</div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-display">Handmatig renner toevoegen</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <Label>Naam</Label>
            <Input data-testid="manual-rider-name" value={riderName} onChange={(e) => setRiderName(e.target.value)} />
          </div>
          <div>
            <Label>Team</Label>
            <Input data-testid="manual-rider-team" value={riderTeam} onChange={(e) => setRiderTeam(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button data-testid="manual-rider-create" onClick={createRider}>Aanmaken</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-display">Toevoegen aan startlijst</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <Label>Renner</Label>
            <Select value={selectedRider} onValueChange={setSelectedRider}>
              <SelectTrigger data-testid="select-rider"><SelectValue placeholder="Kies renner" /></SelectTrigger>
              <SelectContent>
                {allRiders.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}{r.team ? ` (${r.team})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Categorie</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger data-testid="select-rider-category"><SelectValue placeholder="(geen)" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button data-testid="add-to-startlist-btn" onClick={addToStartlist} disabled={!selectedRider}>Toevoegen</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display">Startlijst ({riders.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input data-testid="search-startlist" placeholder="Zoek renner of team..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="max-h-[480px] overflow-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Renner</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead className="w-56">Categorie</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRiders.map((r) => (
                  <TableRow key={r.game_rider_id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.team ?? "—"}</TableCell>
                    <TableCell>
                      <Select value={r.category_id ?? ""} onValueChange={(v) => changeCategory(r.game_rider_id, v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="(geen)" /></SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => removeFromStartlist(r.game_rider_id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredRiders.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Geen renners in de startlijst.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
