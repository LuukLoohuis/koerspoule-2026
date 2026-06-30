import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Upload, FileText, UserMinus, RotateCcw } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { extractPdfText, parseProCyclingStatsStartlist, type ParsedStartlistTeam } from "@/lib/startlistImport";
import { cn } from "@/lib/utils";

export type Rider = {
  id: string;
  name: string;
  start_number: number | null;
  team_id: string | null;
  team_name?: string | null;
  is_youth_eligible?: boolean;
  is_dnf?: boolean;
  is_vervallen?: boolean;
  firstcycling_id?: number | null;
};

// ── Normalisatie- en matchregels (officiële startlijst koppelen) ──────────────
// Renners worden gematcht op een STABIELE sleutel: genormaliseerde NAAM + PLOEG,
// niet op rugnummer (dat ontbreekt in de voorlopige lijst). Normalisatie:
//   1. unicode NFD + diacrieten strippen (José → jose, Pogačar → pogacar)
//   2. lowercase
//   3. alle niet-alfanumerieke tekens → spatie (punten/streepjes/komma's weg)
//   4. losse tokens alfabetisch sorteren → volgorde voornaam/achternaam maakt
//      niet uit ("Tadej Pogacar" == "Pogacar Tadej")
//   5. spaties samenvoegen + trimmen
function normNaam(s: string): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .sort()
    .join(" ");
}

// Ploegnaam normaliseren (geen token-sortering; ploegnamen zijn vrije tekst).
function normPloeg(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Stabiele matchsleutel: naam + ploeg.
function matchKey(naam: string, ploeg: string | null | undefined): string {
  return `${normNaam(naam)}|${normPloeg(ploeg)}`;
}

export type Team = {
  id: string;
  name: string;
  short_name: string | null;
  game_id: string | null;
  jersey_url?: string | null;
};

export default function StartlistTab({
  activeGameId,
  riders,
  teams,
  reload,
  gameStatus,
}: {
  activeGameId: string;
  riders: Rider[];
  teams: Team[];
  reload: () => Promise<void> | void;
  gameStatus?: string;
}) {
  const dnfZichtbaar = gameStatus === "live" || gameStatus === "finished";
  const dnfBewerkbaar = gameStatus === "live";
  const [search, setSearch] = useState("");
  const [riderName, setRiderName] = useState("");
  const [riderTeamId, setRiderTeamId] = useState("");
  const [riderStartNumber, setRiderStartNumber] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ParsedStartlistTeam[]>([]);
  const [importing, setImporting] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  // Officiële-lijst-modus: markeer renners die NIET in de import staan als uitvaller.
  const [markUitvallers, setMarkUitvallers] = useState(false);
  const [uitvallerReport, setUitvallerReport] = useState<Array<{ name: string; team: string; picks: number }>>([]);

  async function createTeam() {
    if (!supabase || !newTeamName.trim()) return;
    const { error } = await supabase.from("teams").insert({
      game_id: activeGameId,
      name: newTeamName.trim(),
    });
    if (error) {
      toast.error(`Team aanmaken mislukt: ${error.message}`);
      return;
    }
    toast.success("Team aangemaakt");
    setNewTeamName("");
    await reload();
  }

  async function createRider() {
    if (!supabase || !riderName.trim()) return;
    // Lichte validatie: dubbele naam+ploeg binnen deze game signaleren.
    const teamNaam = teams.find((t) => t.id === riderTeamId)?.name ?? null;
    const dubbel = riders.find((r) => matchKey(r.name, r.team_name) === matchKey(riderName, teamNaam));
    if (dubbel && !confirm(`"${riderName.trim()}" bestaat al in deze ploeg. Toch toevoegen?`)) return;
    const { error } = await supabase.from("riders").insert({
      game_id: activeGameId,
      name: riderName.trim(),
      start_number: riderStartNumber ? Number(riderStartNumber) : null,
      team_id: riderTeamId || null,
    });
    if (error) {
      toast.error(`Renner aanmaken mislukt: ${error.message}`);
      return;
    }
    toast.success("Renner toegevoegd aan startlijst");
    setRiderName("");
    setRiderStartNumber("");
    setRiderTeamId("");
    await reload();
  }

  // Veilig verwijderen: eerst tellen of deelnemers deze renner gekozen hebben.
  // Zo ja → expliciet waarschuwen (hun keuze gaat verloren door ON DELETE CASCADE)
  // en pas na bevestiging verwijderen. Renners zonder keuzes mogen direct weg.
  async function deleteRider(id: string, name: string) {
    if (!supabase) return;
    const { count, error: cErr } = await supabase
      .from("entry_picks")
      .select("id", { count: "exact", head: true })
      .eq("rider_id", id);
    if (cErr) { toast.error(`Controle mislukt: ${cErr.message}`); return; }
    const picks = count ?? 0;
    const vraag = picks > 0
      ? `LET OP: ${picks} deelnemer(s) hebben "${name}" gekozen — hun ploeg raakt deze renner kwijt.\n\nKlik OK om TOCH definitief te verwijderen, of Annuleer en gebruik liever "Markeer als vervallen" (behoudt de keuze).`
      : `Renner "${name}" uit startlijst verwijderen?`;
    if (!confirm(vraag)) return;
    const { error } = await supabase.from("riders").delete().eq("id", id);
    if (error) {
      toast.error(`Verwijderen mislukt: ${error.message}`);
      return;
    }
    toast.success("Verwijderd");
    await reload();
  }

  // Veiliger alternatief voor verwijderen: markeer als vervallen (behoudt rider-ID
  // en dus alle teamkeuzes). Toggle aan/uit.
  async function setVervallen(id: string, next: boolean) {
    if (!supabase) return;
    const { error } = await supabase.from("riders").update({ is_vervallen: next }).eq("id", id);
    if (error) { toast.error(`Opslaan mislukt: ${error.message}`); return; }
    toast.success(next ? "Gemarkeerd als vervallen" : "Weer actief");
    await reload();
  }

  async function deleteAllRiders() {
    if (!supabase || !activeGameId) return;
    if (!confirm(`ALLE ${riders.length} renners uit de startlijst van deze game verwijderen? Dit kan niet ongedaan gemaakt worden.`)) return;
    setDeletingAll(true);
    const { error } = await supabase.from("riders").delete().eq("game_id", activeGameId);
    setDeletingAll(false);
    if (error) {
      toast.error(`Verwijderen mislukt: ${error.message}`);
      return;
    }
    toast.success("Hele startlijst verwijderd");
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
      // 1) Koppel aan bestaande (bv. handmatig aangemaakte) teams via een
      //    genormaliseerde naam-match. Zo komen de renners onder het al
      //    aangemaakte team te staan en blijft de geüploade trui (jersey_url)
      //    behouden. Alleen écht nieuwe teams worden aangemaakt.
      const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
      const existingByNorm = new Map<string, string>(teams.map((t) => [norm(t.name), t.id]));
      const teamIdByName = new Map<string, string>();
      const toInsert: Array<{ game_id: string; name: string }> = [];
      for (const t of importPreview) {
        const existingId = existingByNorm.get(norm(t.name));
        if (existingId) teamIdByName.set(t.name, existingId);
        else toInsert.push({ game_id: activeGameId, name: t.name });
      }
      if (toInsert.length > 0) {
        const { data: inserted, error: teamErr } = await supabase
          .from("teams")
          .insert(toInsert)
          .select("id, name");
        if (teamErr) throw teamErr;
        for (const it of inserted ?? []) teamIdByName.set(it.name, it.id);
      }

      // 2) Renners matchen op STABIELE sleutel (genormaliseerde NAAM + PLOEG), niet
      //    op rugnummer (dat ontbreekt in de voorlopige lijst). Bestaat de renner al
      //    → UPDATE (rugnummer koppelen, team, is_vervallen weer uit), rider-ID blijft
      //    behouden (teamkeuzes verwijzen daar naar — NOOIT delete-and-recreate).
      //    Niet gevonden op naam+ploeg → secundair op naam-only (voorkomt duplicaat
      //    bij lichte ploegnaam-afwijking). Echt nieuw → INSERT.
      const existingByKey = new Map<string, Rider>();
      const existingByNameOnly = new Map<string, Rider>();
      for (const r of riders) {
        existingByKey.set(matchKey(r.name, r.team_name), r);
        if (!existingByNameOnly.has(normNaam(r.name))) existingByNameOnly.set(normNaam(r.name), r);
      }

      const seen = new Set<string>();
      const matchedIds = new Set<string>();
      const riderInserts: Array<{ game_id: string; team_id: string | null; name: string; start_number: number | null; is_vervallen: boolean }> = [];
      const riderUpdates: Array<{ id: string; team_id: string | null; start_number: number | null }> = [];
      for (const t of importPreview) {
        const teamId = teamIdByName.get(t.name) ?? null;
        for (const r of t.riders) {
          const key = matchKey(r.name, t.name);
          if (seen.has(key)) continue; // dubbel in de PDF zelf overslaan
          seen.add(key);
          const existing = existingByKey.get(key) ?? existingByNameOnly.get(normNaam(r.name));
          if (existing) {
            matchedIds.add(existing.id);
            riderUpdates.push({ id: existing.id, team_id: teamId, start_number: r.start_number });
          } else {
            riderInserts.push({ game_id: activeGameId, team_id: teamId, name: r.name, start_number: r.start_number, is_vervallen: false });
          }
        }
      }

      if (riderInserts.length > 0) {
        const { error: insErr } = await supabase.from("riders").insert(riderInserts);
        if (insErr) throw insErr;
      }

      // Updates per renner. start_number alleen overschrijven als de PDF er één
      // geeft (anders bestaand nummer behouden) — voorkomt botsing op de unieke
      // (game_id,start_number)-index en wissen van handmatig gezette nummers.
      // is_vervallen weer uit: een gematchte renner staat (weer) op de lijst.
      let updateFails = 0;
      const updateResults = await Promise.allSettled(
        riderUpdates.map((u) => {
          const patch: { team_id: string | null; is_vervallen: boolean; start_number?: number | null } = { team_id: u.team_id, is_vervallen: false };
          if (u.start_number != null) patch.start_number = u.start_number;
          return supabase!
            .from("riders")
            .update(patch)
            .eq("id", u.id)
            .then((res) => {
              if (res.error) throw res.error;
            });
        }),
      );
      updateFails = updateResults.filter((r) => r.status === "rejected").length;

      // 3) Uitvallers: renners die wél in de game stonden maar NIET in deze import.
      //    Alleen verwerken als admin aangeeft dat dit de VOLLEDIGE officiële lijst is
      //    (anders zou een deel-PDF iedereen onterecht als uitvaller markeren).
      //    NOOIT verwijderen — markeren als is_vervallen + melden, mét aantal keuzes.
      const uitvallers = riders.filter((r) => !matchedIds.has(r.id) && !r.is_vervallen);
      let report: Array<{ name: string; team: string; picks: number }> = [];
      if (markUitvallers && uitvallers.length > 0) {
        const ids = uitvallers.map((r) => r.id);
        const { data: picks } = await supabase.from("entry_picks").select("rider_id").in("rider_id", ids);
        const pickCount = new Map<string, number>();
        for (const p of (picks ?? []) as Array<{ rider_id: string }>) pickCount.set(p.rider_id, (pickCount.get(p.rider_id) ?? 0) + 1);
        await supabase.from("riders").update({ is_vervallen: true }).in("id", ids);
        report = uitvallers
          .map((r) => ({ name: r.name, team: r.team_name ?? "—", picks: pickCount.get(r.id) ?? 0 }))
          .sort((a, b) => b.picks - a.picks || a.name.localeCompare(b.name));
      }
      setUitvallerReport(report);

      const totalRiders = riderInserts.length + riderUpdates.length;
      const gekozenUitvallers = report.filter((u) => u.picks > 0).length;
      toast.success(
        `${totalRiders} renners verwerkt (${riderInserts.length} nieuw, ${riderUpdates.length} bijgewerkt${updateFails ? `, ${updateFails} mislukt` : ""})` +
          (markUitvallers ? ` · ${report.length} uitvaller(s)${gekozenUitvallers ? `, waarvan ${gekozenUitvallers} al gekozen` : ""}` : ""),
      );
      await reload();
      setImportPreview([]);
      setImportFile(null);
    } catch (e) {
      console.error("Import error:", e);
      toast.error(`Import mislukt: ${(e as Error).message}`);
    } finally {
      setImporting(false);
    }
  }

  const filteredRiders = riders.filter((r) =>
    !search.trim() || r.name.toLowerCase().includes(search.toLowerCase()) || (r.team_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card data-testid="pdf-import-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2"><Upload className="w-5 h-5" />PDF startlijst importeren</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Upload een ProCyclingStats startlijst PDF. Teams en renners worden automatisch aangemaakt en gekoppeld aan deze game.
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
          <label className="flex items-start gap-2 text-sm rounded-md border border-dashed p-2 cursor-pointer">
            <Checkbox checked={markUitvallers} onCheckedChange={(v) => setMarkUitvallers(Boolean(v))} className="mt-0.5" />
            <span>
              <span className="font-medium">Dit is de volledige officiële lijst</span>
              <span className="block text-xs text-muted-foreground">Renners die nu in de startlijst staan maar niet in deze import → gemarkeerd als <b>uitvaller</b> (niet verwijderd, keuzes blijven). Laat uit bij een deel-import.</span>
            </span>
          </label>
          {importPreview.length > 0 && (
            <div className="text-xs text-muted-foreground border rounded-md p-2 max-h-40 overflow-auto">
              {importPreview.map((t) => (
                <div key={t.name}><b>{t.name}</b> — {t.riders.length} renners</div>
              ))}
            </div>
          )}
          {uitvallerReport.length > 0 && (
            <div className="text-xs border border-amber-500/40 bg-amber-50/60 rounded-md p-2 max-h-48 overflow-auto">
              <p className="font-bold text-amber-700 mb-1">{uitvallerReport.length} uitvaller(s) gemarkeerd:</p>
              {uitvallerReport.map((u, i) => (
                <div key={i} className={u.picks > 0 ? "font-semibold text-destructive" : "text-muted-foreground"}>
                  {u.name} <span className="opacity-70">· {u.team}</span>
                  {u.picks > 0 && <span> — ⚠ {u.picks} deelnemer(s) hebben deze renner gekozen</span>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-display">Teams in deze game ({teams.length})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input data-testid="new-team-input" placeholder="Teamnaam (bv. UAE Team Emirates)" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createTeam()} />
            <Button data-testid="create-team-btn" onClick={createTeam}>Team aanmaken</Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Maak hier de teams aan, pas de naam aan en upload per team een trui. Bij het importeren
            van de PDF-startlijst worden de renners op naam aan deze teams gekoppeld — de geüploade
            trui blijft daarbij behouden. De trui verschijnt in "Stel je team samen → Startlijst".
          </p>
          <div className="divide-y border rounded-md">
            {[...teams].sort((a, b) => a.name.localeCompare(b.name)).map((t) => (
              <TeamRow key={t.id} team={t} activeGameId={activeGameId} onChanged={reload} />
            ))}
            {teams.length === 0 && (
              <div className="p-3 text-sm text-muted-foreground">Nog geen teams. Maak er hierboven een aan of importeer een PDF-startlijst.</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-display">Handmatig renner toevoegen</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <div className="md:col-span-2">
            <Label>Naam</Label>
            <Input data-testid="manual-rider-name" value={riderName} onChange={(e) => setRiderName(e.target.value)} />
          </div>
          <div>
            <Label>Startnummer</Label>
            <Input data-testid="manual-rider-number" type="number" value={riderStartNumber} onChange={(e) => setRiderStartNumber(e.target.value)} />
          </div>
          <div>
            <Label>Team</Label>
            <Select value={riderTeamId} onValueChange={setRiderTeamId}>
              <SelectTrigger data-testid="manual-rider-team"><SelectValue placeholder="(geen)" /></SelectTrigger>
              <SelectContent>
                {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button data-testid="manual-rider-create" onClick={createRider}>Toevoegen</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="font-display">Startlijst ({riders.length})</CardTitle>
          {riders.length > 0 && (
            <Button size="sm" variant="outline" className="h-8 text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive" disabled={deletingAll} onClick={deleteAllRiders}>
              <Trash2 className="w-3.5 h-3.5 mr-1" /> {deletingAll ? "Verwijderen…" : "Alle renners verwijderen"}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <Input data-testid="search-startlist" placeholder="Zoek renner of team..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <p className="text-xs text-muted-foreground">Klik op een cel om naam, startnummer of team van een renner te wijzigen.</p>
          <div className="max-h-[480px] overflow-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">#</TableHead>
                  <TableHead>Renner</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead className="w-28" title="FirstCycling ID (voor uitslageninzage)">FC ID</TableHead>
                  <TableHead className="w-32 text-center" title="Doet mee voor jongerenklassement">Jongeren</TableHead>
                  {dnfZichtbaar && (
                    <TableHead className="w-20 text-center" title={dnfBewerkbaar ? "DNF markeren" : "Game is afgerond — definitief"}>DNF</TableHead>
                  )}
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRiders.map((r) => (
                  <RiderRow
                    key={r.id}
                    rider={r}
                    teams={teams}
                    activeGameId={activeGameId}
                    onSaved={reload}
                    onDelete={() => deleteRider(r.id, r.name)}
                    onToggleVervallen={(next) => setVervallen(r.id, next)}
                    dnfZichtbaar={dnfZichtbaar}
                    dnfBewerkbaar={dnfBewerkbaar}
                  />
                ))}
                {filteredRiders.length === 0 && (
                  <TableRow><TableCell colSpan={dnfZichtbaar ? 7 : 6} className="text-center text-muted-foreground py-6">Geen renners.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TeamRow({
  team,
  activeGameId,
  onChanged,
}: {
  team: Team;
  activeGameId: string;
  onChanged: () => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(team.name);
  const [uploading, setUploading] = useState(false);

  async function saveName() {
    const trimmed = draft.trim();
    if (!supabase || !trimmed || trimmed === team.name) {
      setEditing(false);
      setDraft(team.name);
      return;
    }
    const { error } = await supabase.from("teams").update({ name: trimmed }).eq("id", team.id);
    if (error) {
      toast.error(`Naam opslaan mislukt: ${error.message}`);
      return;
    }
    toast.success("Teamnaam opgeslagen");
    setEditing(false);
    await onChanged();
  }

  async function uploadJersey(file: File) {
    if (!supabase) return;
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${activeGameId}/${team.id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("team-jerseys")
        .upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("team-jerseys").getPublicUrl(path);
      // Cache-buster zodat een vervangen trui meteen ververst in de UI.
      const url = `${pub.publicUrl}?v=${Date.now()}`;
      // .select() erbij: bevestigt dat de rij echt is bijgewerkt. Zonder dit zou
      // een mislukte/geweigerde update (0 rijen) stil "lukken".
      const { data: updated, error: updErr } = await supabase
        .from("teams")
        .update({ jersey_url: url })
        .eq("id", team.id)
        .select("id, jersey_url")
        .maybeSingle();
      if (updErr) throw updErr;
      if (!updated) throw new Error("Geen rij bijgewerkt — trui niet opgeslagen (rechten of ontbrekende kolom?).");
      toast.success("Trui geüpload");
      await onChanged();
    } catch (e) {
      toast.error(`Trui upload mislukt: ${(e as Error).message}`);
    } finally {
      setUploading(false);
    }
  }

  async function deleteTeam() {
    if (!supabase) return;
    if (!confirm(`Team "${team.name}" verwijderen? De renners worden losgekoppeld.`)) return;
    await supabase.from("riders").update({ team_id: null }).eq("team_id", team.id);
    const { error } = await supabase.from("teams").delete().eq("id", team.id);
    if (error) {
      toast.error(`Verwijderen mislukt: ${error.message}`);
      return;
    }
    toast.success("Team verwijderd");
    await onChanged();
  }

  return (
    <div className="flex items-center gap-3 p-2">
      <div className="w-10 h-12 shrink-0 rounded bg-secondary/40 border flex items-center justify-center overflow-hidden">
        {team.jersey_url ? (
          <img src={team.jersey_url} alt={team.name} className="w-full h-full object-contain" />
        ) : (
          <span className="text-[9px] text-muted-foreground">geen</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        {editing ? (
          <Input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
            className="h-8"
          />
        ) : (
          <button
            className="hover:bg-secondary rounded px-1 py-0.5 text-left font-medium truncate w-full"
            onClick={() => {
              setDraft(team.name);
              setEditing(true);
            }}
            title="Klik om de teamnaam te wijzigen"
          >
            {team.name}
          </button>
        )}
      </div>
      <label className="shrink-0">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadJersey(f);
            e.currentTarget.value = "";
          }}
        />
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs cursor-pointer hover:bg-secondary",
            uploading && "opacity-50 pointer-events-none",
          )}
        >
          <Upload className="w-3.5 h-3.5" />
          {uploading ? "Uploaden..." : team.jersey_url ? "Vervang trui" : "Upload trui"}
        </span>
      </label>
      <Button variant="ghost" size="sm" onClick={deleteTeam} title="Team verwijderen">
        <Trash2 className="w-4 h-4 text-destructive" />
      </Button>
    </div>
  );
}

function RiderRow({
  rider,
  teams,
  activeGameId,
  onSaved,
  onDelete,
  onToggleVervallen,
  dnfZichtbaar,
  dnfBewerkbaar,
}: {
  rider: Rider;
  teams: Team[];
  activeGameId: string;
  onSaved: () => Promise<void> | void;
  onDelete: () => void;
  onToggleVervallen: (next: boolean) => void;
  dnfZichtbaar: boolean;
  dnfBewerkbaar: boolean;
}) {
  const [editingField, setEditingField] = useState<"name" | "number" | "fcid" | null>(null);
  const [draftName, setDraftName] = useState(rider.name);
  const [draftNumber, setDraftNumber] = useState(String(rider.start_number ?? ""));
  const [draftFcId, setDraftFcId] = useState(String(rider.firstcycling_id ?? ""));
  const [savingTeam, setSavingTeam] = useState(false);

  async function saveField(patch: Partial<{ name: string; start_number: number | null; team_id: string | null; is_youth_eligible: boolean; is_dnf: boolean; firstcycling_id: number | null }>) {
    if (!supabase) return;
    const { error } = await supabase.from("riders").update(patch).eq("id", rider.id);
    if (error) {
      toast.error(`Opslaan mislukt: ${error.message}`);
      return false;
    }
    toast.success("Opgeslagen");
    await onSaved();
    return true;
  }

  // Botsingsveilig startnummer zetten. De DB heeft een unieke index op
  // (game_id, start_number), dus een nummer naar een al bezet nummer zetten
  // faalt normaal. Is het doelnummer bezet door een andere renner, dan wisselen
  // we de twee in drie stappen (eerst de ander tijdelijk op NULL, anders botst
  // de unieke index halverwege). Zo kun je een verschoven teamblok corrigeren
  // door telkens het juiste nummer in te typen i.p.v. handmatig te puzzelen.
  async function saveStartNumber(num: number | null): Promise<boolean> {
    if (!supabase) return false;
    if (num != null) {
      const { data: clash } = await supabase
        .from("riders")
        .select("id, name, start_number")
        .eq("game_id", activeGameId)
        .eq("start_number", num)
        .neq("id", rider.id)
        .maybeSingle();
      if (clash) {
        const oldNum = rider.start_number;
        // Stap 1: botsende renner tijdelijk op NULL (omzeilt de unieke index).
        const s1 = await supabase.from("riders").update({ start_number: null }).eq("id", clash.id);
        if (s1.error) { toast.error(`Wisselen mislukt: ${s1.error.message}`); return false; }
        // Stap 2: deze renner naar het doelnummer.
        const s2 = await supabase.from("riders").update({ start_number: num }).eq("id", rider.id);
        if (s2.error) {
          await supabase.from("riders").update({ start_number: num }).eq("id", clash.id); // rollback
          toast.error(`Wisselen mislukt: ${s2.error.message}`);
          return false;
        }
        // Stap 3: botsende renner krijgt het oude nummer van deze renner.
        const s3 = await supabase.from("riders").update({ start_number: oldNum }).eq("id", clash.id);
        if (s3.error) { toast.error(`Wisselen half mislukt: ${s3.error.message} — controleer #${oldNum}`); return false; }
        toast.success(`Startnummers gewisseld met ${clash.name} (#${oldNum} ↔ #${num})`);
        await onSaved();
        return true;
      }
    }
    return saveField({ start_number: num });
  }

  return (
    <TableRow className={rider.is_vervallen ? "opacity-55 bg-destructive/5" : undefined}>
      <TableCell className="font-mono text-xs">
        {editingField === "number" ? (
          <Input
            autoFocus
            type="number"
            value={draftNumber}
            onChange={(e) => setDraftNumber(e.target.value)}
            onBlur={async () => {
              const num = draftNumber.trim() ? Number(draftNumber) : null;
              if (num !== rider.start_number) {
                const ok = await saveStartNumber(num);
                if (!ok) setDraftNumber(String(rider.start_number ?? ""));
              }
              setEditingField(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
            className="h-8 w-20"
          />
        ) : (
          <button
            className="hover:bg-secondary rounded px-1 py-0.5 w-full text-left"
            onClick={() => setEditingField("number")}
          >
            {rider.start_number ?? "—"}
          </button>
        )}
      </TableCell>
      <TableCell className="font-medium">
        {editingField === "name" ? (
          <Input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={async () => {
              const trimmed = draftName.trim();
              if (trimmed && trimmed !== rider.name) {
                const ok = await saveField({ name: trimmed });
                if (!ok) setDraftName(rider.name);
              } else {
                setDraftName(rider.name);
              }
              setEditingField(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
            className="h-8"
          />
        ) : (
          <button
            className="hover:bg-secondary rounded px-1 py-0.5 w-full text-left"
            onClick={() => setEditingField("name")}
          >
            {rider.name}
            {rider.is_vervallen && (
              <span className="ml-2 inline-block rounded-sm bg-destructive/15 text-destructive text-[10px] font-bold uppercase px-1.5 py-0.5 align-middle">Vervallen</span>
            )}
          </button>
        )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        <Select
          value={rider.team_id ?? "none"}
          onValueChange={async (val) => {
            setSavingTeam(true);
            await saveField({ team_id: val === "none" ? null : val });
            setSavingTeam(false);
          }}
          disabled={savingTeam}
        >
          <SelectTrigger className="h-8 w-full max-w-[260px]">
            <SelectValue placeholder="(geen)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">(geen)</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="font-mono text-xs">
        {editingField === "fcid" ? (
          <Input
            autoFocus
            type="number"
            value={draftFcId}
            onChange={(e) => setDraftFcId(e.target.value)}
            onBlur={async () => {
              const val = draftFcId.trim() ? Number(draftFcId) : null;
              if (val !== (rider.firstcycling_id ?? null)) {
                const ok = await saveField({ firstcycling_id: val });
                if (!ok) setDraftFcId(String(rider.firstcycling_id ?? ""));
              }
              setEditingField(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
            className="h-8 w-24"
          />
        ) : (
          <button
            className="hover:bg-secondary rounded px-1 py-0.5 w-full text-left text-muted-foreground"
            onClick={() => setEditingField("fcid")}
            title="Klik om FirstCycling ID in te stellen"
          >
            {rider.firstcycling_id ?? <span className="opacity-40">—</span>}
          </button>
        )}
      </TableCell>
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-2">
          <Checkbox
            checked={Boolean(rider.is_youth_eligible)}
            onCheckedChange={async (val) => {
              await saveField({ is_youth_eligible: Boolean(val) });
            }}
            aria-label="Doet mee voor jongerenklassement"
          />
        </div>
      </TableCell>
      {dnfZichtbaar && (
        <TableCell className="text-center">
          <div className="flex items-center justify-center gap-2">
            <Checkbox
              checked={Boolean(rider.is_dnf)}
              onCheckedChange={async (val) => {
                await saveField({ is_dnf: Boolean(val) });
              }}
              disabled={!dnfBewerkbaar}
              aria-label="Renner uitgevallen (DNF)"
              title={dnfBewerkbaar ? "Renner markeren als uitgevallen" : "Game is afgerond — definitief"}
              className={rider.is_dnf ? "border-destructive data-[state=checked]:bg-destructive" : ""}
            />
          </div>
        </TableCell>
      )}
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleVervallen(!rider.is_vervallen)}
            title={rider.is_vervallen ? "Weer actief maken" : "Markeer als vervallen (behoudt keuzes)"}
          >
            {rider.is_vervallen ? <RotateCcw className="w-4 h-4 text-muted-foreground" /> : <UserMinus className="w-4 h-4 text-amber-600" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} title="Definitief verwijderen">
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
