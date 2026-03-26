import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  extractPdfText,
  parseProCyclingStatsStartlist,
  type ParsedStartlistTeam,
} from "@/lib/startlistImport";

type Stage = {
  id: string;
  stage_number: number;
  name: string;
  status?: string;
};

type ResultRow = {
  start_number?: number | null;
  rider_name: string;
  finish_position: number;
  gc_position?: number | null;
  issue?: string;
};

type RiderRef = {
  name: string;
  start_number: number;
};

function withTimeout<T>(promise: Promise<T>, ms: number, actionLabel: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${actionLabel} timeout. Controleer of Supabase project actief is.`));
    }, ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function parseCsv(text: string): ResultRow[] {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  if (parsed.errors.length > 0) {
    throw new Error(`CSV parse fout: ${parsed.errors[0].message}`);
  }

  if (!parsed.data?.length) {
    return [];
  }

  const firstRow = parsed.data[0] ?? {};
  if (!("finish_position" in firstRow)) {
    throw new Error("CSV mist verplichte kolom: finish_position");
  }

  return parsed.data.map((row) => {
    const riderName = String(row.rider_name ?? "").trim();
    const startNumberRaw =
      row.start_number ?? row.rider_number ?? row.startnummer ?? "";
    const startNumber = Number(String(startNumberRaw).trim());
    const finish = Number(row.finish_position);
    const gcRaw = String(row.gc_position ?? "").trim();
    const gc = gcRaw ? Number(gcRaw) : null;

    return {
      start_number: Number.isFinite(startNumber) ? startNumber : null,
      rider_name: riderName,
      finish_position: finish,
      gc_position: Number.isFinite(gc as number) ? gc : null,
      issue:
        !Number.isFinite(finish) || (!riderName && !Number.isFinite(startNumber))
          ? "Ontbrekende of ongeldige data"
          : undefined,
    };
  });
}

export default function Admin() {
  const { user, role, loading } = useAuth();
  const { toast } = useToast();

  const [games, setGames] = useState<Array<{ id: string; name: string; year: number; status: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; short_name: string | null; game_id: string; sort_order: number }>>([]);
  const [teams, setTeams] = useState<Array<{ id: string; name: string; short_name: string | null }>>([]);
  const [ridersList, setRidersList] = useState<Array<{ id: string; name: string; start_number: number | null; team_id: string | null }>>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [activeGameId, setActiveGameId] = useState("");
  const [selectedStageId, setSelectedStageId] = useState("");
  const [riderRefs, setRiderRefs] = useState<RiderRef[]>([]);
  const [knownRiders, setKnownRiders] = useState<Set<string>>(new Set());
  const [ridersByStart, setRidersByStart] = useState<Map<number, string>>(new Map());
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [manualStartNumber, setManualStartNumber] = useState("");
  const [manualRider, setManualRider] = useState("");
  const [manualPosition, setManualPosition] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [newGameName, setNewGameName] = useState("");
  const [newGameYear, setNewGameYear] = useState(String(new Date().getFullYear()));
  const [newGameStatus, setNewGameStatus] = useState("draft");
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryShort, setNewCategoryShort] = useState("");
  const [newCategorySort, setNewCategorySort] = useState("1");
  const [newTeamName, setNewTeamName] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ParsedStartlistTeam[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [newRiderName, setNewRiderName] = useState("");
  const [newRiderStart, setNewRiderStart] = useState("");
  const [newRiderTeamId, setNewRiderTeamId] = useState("");
  const [newStageNumber, setNewStageNumber] = useState("");
  const [newStageName, setNewStageName] = useState("");

  const appendLog = (message: string) => {
    setLogs((prev) => [message, ...prev].slice(0, 20));
    setStatusMessage(message);
  };

  useEffect(() => {
    async function bootstrap() {
      if (!supabase || !user || role !== "admin") return;

      const { data: gameData } = await supabase
        .from("games")
        .select("id, name, year, status")
        .order("year", { ascending: false });
      if (gameData?.length) {
        setGames(gameData);
        setActiveGameId(gameData[0].id);
      }

      const { data: teamData } = await supabase
        .from("teams")
        .select("id, name, short_name")
        .order("name");
      if (teamData) setTeams(teamData);

      const { data: riderData } = await supabase
        .from("riders")
        .select("id, name, start_number, team_id")
        .order("name");
      if (riderData) setRidersList(riderData);

      const { data: stageData, error: stageError } = await supabase
        .from("stages")
        .select("id, stage_number, name, status")
        .order("stage_number", { ascending: true });
      if (stageError) {
        appendLog(`Kon etappes niet ophalen: ${stageError.message}`);
      } else if (stageData) {
        setStages(stageData as Stage[]);
      }

      const { data: riderNamesData } = await supabase.from("riders").select("name");
      const { data: riderNumbers } = await supabase
        .from("riders")
        .select("name, start_number");

      if (riderNamesData || riderNumbers) {
        const refs = (riderNumbers ?? [])
          .filter((r) => Number.isFinite(Number(r.start_number)))
          .map((r) => ({
            name: String(r.name ?? "").trim(),
            start_number: Number(r.start_number),
          }));
        setRiderRefs(refs);
        setKnownRiders(
          new Set(
            (riderNamesData ?? [])
              .map((r) => String(r.name ?? "").trim().toLowerCase())
              .filter(Boolean)
          )
        );
        setRidersByStart(
          new Map(refs.map((r) => [r.start_number, r.name]))
        );
      }
    }
    bootstrap();
  }, [user, role]);

  useEffect(() => {
    async function loadCategories() {
      if (!supabase || !activeGameId) return;
      const { data } = await supabase
        .from("categories")
        .select("id, name, short_name, game_id, sort_order")
        .eq("game_id", activeGameId)
        .order("sort_order");
      if (data) setCategories(data);
    }
    loadCategories();
  }, [activeGameId]);

  const previewRows = useMemo(
    () =>
      rows.map((row) => {
        const mappedNameFromNumber =
          row.start_number && ridersByStart.has(row.start_number)
            ? ridersByStart.get(row.start_number) ?? ""
            : "";
        const normalizedName = row.rider_name || mappedNameFromNumber;
        const matchKey = normalizedName.trim().toLowerCase();
        const isMatched = matchKey ? knownRiders.has(matchKey) : false;
        return {
          ...row,
          rider_name: normalizedName,
          isMatched,
          issue:
            row.issue ??
            (!row.start_number ? "Startnummer ontbreekt" : undefined) ??
            (!isMatched && knownRiders.size > 0 ? "Onbekende renner" : undefined),
        };
      }),
    [rows, knownRiders, ridersByStart]
  );

  if (loading) {
    return <div className="max-w-4xl mx-auto p-4">Laden...</div>;
  }

  if (!supabase) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle>Admin Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Supabase configuratie ontbreekt.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user || role !== "admin") {
    return <div className="max-w-4xl mx-auto p-4">Geen toegang.</div>;
  }

  const refreshMasterData = async () => {
    const { data: teamData } = await supabase.from("teams").select("id, name, short_name").order("name");
    if (teamData) setTeams(teamData);
    const { data: riderData } = await supabase.from("riders").select("id, name, start_number, team_id").order("name");
    if (riderData) setRidersList(riderData);
    const { data: stageData } = await supabase.from("stages").select("id, stage_number, name, status").order("stage_number");
    if (stageData) setStages(stageData as Stage[]);
  };

  const createGame = async () => {
    if (isCreatingGame) return;

    const name = newGameName.trim();
    const year = Number(newGameYear);

    if (!name) {
      const message = "Vul eerst een game naam in.";
      appendLog(message);
      toast({ title: "Game niet aangemaakt", description: message, variant: "destructive" });
      return;
    }
    if (!Number.isFinite(year) || year < 1900 || year > 2100) {
      const message = "Vul een geldig jaar in (bijv. 2026).";
      appendLog(message);
      toast({ title: "Game niet aangemaakt", description: message, variant: "destructive" });
      return;
    }

    setIsCreatingGame(true);
    try {
      const { data: inserted, error } = await withTimeout(
        supabase
          .from("games")
          .insert({
            name,
            year,
            status: newGameStatus,
          })
          .select("id, name, year, status")
          .single(),
        12000,
        "Game aanmaken"
      );

      if (error) {
        const message =
          error.message.includes("duplicate key")
            ? `Game bestaat al: ${year} - ${name}`
            : `Game fout: ${error.message}`;
        appendLog(message);
        toast({ title: "Game niet aangemaakt", description: message, variant: "destructive" });
        return;
      }

      if (inserted) {
        setGames((prev) => [inserted, ...prev].sort((a, b) => b.year - a.year));
        setActiveGameId(inserted.id);
      } else {
        const { data } = await supabase
          .from("games")
          .select("id, name, year, status")
          .order("year", { ascending: false });
        if (data) setGames(data);
      }

      appendLog("Game aangemaakt.");
      setNewGameName("");
      toast({ title: "Game aangemaakt", description: `${year} - ${name}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Onbekende fout bij game aanmaken.";
      appendLog(message);
      toast({ title: "Game niet aangemaakt", description: message, variant: "destructive" });
    } finally {
      setIsCreatingGame(false);
    }
  };

  const createCategory = async () => {
    if (!activeGameId) return;
    const { error } = await supabase.from("categories").insert({
      game_id: activeGameId,
      name: newCategoryName,
      short_name: newCategoryShort || null,
      sort_order: Number(newCategorySort),
    });
    if (error) return appendLog(`Categorie fout: ${error.message}`);
    appendLog("Categorie aangemaakt.");
    const { data } = await supabase
      .from("categories")
      .select("id, name, short_name, game_id, sort_order")
      .eq("game_id", activeGameId)
      .order("sort_order");
    if (data) setCategories(data);
  };

  const createTeam = async () => {
    const { error } = await supabase.from("teams").insert({ game_id: activeGameId || null, name: newTeamName });
    if (error) return appendLog(`Team fout: ${error.message}`);
    appendLog("Team aangemaakt.");
    setNewTeamName("");
    await refreshMasterData();
  };

  const loadImportPreview = async () => {
    if (!importFile) {
      appendLog("Kies eerst een PDF bestand.");
      return;
    }
    try {
      const text = await extractPdfText(importFile);
      const parsed = parseProCyclingStatsStartlist(text);
      setImportPreview(parsed);
      appendLog(`Import-preview geladen: ${parsed.length} teams`);
    } catch (error) {
      appendLog(
        `Preview fout: ${error instanceof Error ? error.message : "Onbekende fout"}`
      );
    }
  };

  const importStartlistToSupabase = async () => {
    if (!supabase || !activeGameId) return;
    if (!importPreview.length) {
      appendLog("Geen import-preview om te verwerken.");
      return;
    }

    setIsImporting(true);
    try {
      if (importFile) {
        try {
          // Keep original source file as audit artifact.
          await supabase.storage
            .from("startlists")
            .upload(`${activeGameId}/${Date.now()}-${importFile.name}`, importFile, {
              upsert: false,
            });
        } catch {
          appendLog("Kon PDF niet opslaan in storage-bucket 'startlists' (import gaat wel door).");
        }
      }

      for (const team of importPreview) {
        const { data: upsertTeam, error: teamError } = await supabase
          .from("teams")
          .upsert(
            { game_id: activeGameId, name: team.name },
            { onConflict: "game_id,name" }
          )
          .select("id")
          .single();
        if (teamError) throw teamError;

        for (const rider of team.riders) {
          const { error: riderError } = await supabase.from("riders").upsert(
            {
              team_id: upsertTeam.id,
              name: rider.name,
              start_number: rider.start_number,
            },
            { onConflict: "team_id,start_number" }
          );
          if (riderError) throw riderError;
        }
      }

      appendLog("Startlijst import succesvol verwerkt.");
      await refreshMasterData();
    } catch (error) {
      appendLog(
        `Import fout: ${error instanceof Error ? error.message : "Onbekende fout"}`
      );
    } finally {
      setIsImporting(false);
    }
  };

  const createRider = async () => {
    const { error } = await supabase.from("riders").insert({
      name: newRiderName,
      start_number: newRiderStart ? Number(newRiderStart) : null,
      team_id: newRiderTeamId || null,
    });
    if (error) return appendLog(`Renner fout: ${error.message}`);
    appendLog("Renner aangemaakt.");
    setNewRiderName("");
    setNewRiderStart("");
    setNewRiderTeamId("");
    await refreshMasterData();
  };

  const createStage = async () => {
    const { error } = await supabase.from("stages").insert({
      game_id: activeGameId || null,
      stage_number: Number(newStageNumber),
      name: newStageName,
      status: "draft",
    });
    if (error) return appendLog(`Etappe fout: ${error.message}`);
    appendLog("Etappe aangemaakt.");
    setNewStageNumber("");
    setNewStageName("");
    await refreshMasterData();
  };

  const handleCsvUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setStatusMessage("Upload een .csv bestand.");
      return;
    }

    try {
      const text = await file.text();
      const parsedRows = parseCsv(text);
      setRows(parsedRows.slice(0, 20));
      setStatusMessage(`CSV ingelezen: ${parsedRows.length} regels`);
      appendLog(`CSV verwerkt (${parsedRows.length} regels).`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "CSV kon niet worden gelezen.";
      setStatusMessage(message);
      appendLog(`CSV fout: ${message}`);
    }
  };

  const addManualRow = () => {
    const startNumber = Number(manualStartNumber);
    const finish = Number(manualPosition);
    if (!Number.isFinite(startNumber) || !Number.isFinite(finish)) {
      setStatusMessage("Vul startnummer en geldige finish positie in.");
      return;
    }

    const riderNameFromList = ridersByStart.get(startNumber) ?? manualRider.trim();
    setRows((prev) => [
      ...prev,
      {
        start_number: startNumber,
        rider_name: riderNameFromList,
        finish_position: finish,
        gc_position: null,
      },
    ]);
    setManualStartNumber("");
    setManualRider("");
    setManualPosition("");
    setStatusMessage("Handmatige regel toegevoegd.");
  };

  const saveResults = async () => {
    if (!selectedStageId) {
      setStatusMessage("Selecteer eerst een etappe.");
      return;
    }
    if (previewRows.length === 0) {
      setStatusMessage("Geen resultaten om op te slaan.");
      return;
    }
    if (previewRows.length !== 20) {
      setStatusMessage("Voor doorrekening zijn exact 20 renners nodig.");
      return;
    }
    if (previewRows.some((row) => row.issue)) {
      setStatusMessage("Los eerst fouten op in de preview.");
      return;
    }

    setIsSaving(true);
    setStatusMessage("");
    try {
      if (overwriteExisting) {
        const { error: deleteError } = await supabase
          .from("stage_results")
          .delete()
          .eq("stage_id", selectedStageId);
        if (deleteError) throw deleteError;
      }

      const payload = previewRows.map((row) => ({
        stage_id: selectedStageId,
        start_number: row.start_number ?? null,
        rider_name: row.rider_name,
        finish_position: row.finish_position,
        gc_position: row.gc_position ?? null,
      }));
      const { error } = await supabase.from("stage_results").insert(payload);
      if (error) throw error;

      setStatusMessage("Stage saved successfully");
      appendLog("Stage saved successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Opslaan mislukt.";
      setStatusMessage(message);
      appendLog(`Save fout: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const calculateScores = async () => {
    if (!selectedStageId) {
      setStatusMessage("Selecteer eerst een etappe.");
      return;
    }

    setIsCalculating(true);
    setStatusMessage("");
    try {
      const { error } = await supabase.rpc("calculate_stage_scores", {
        stage_id: selectedStageId,
      });
      if (error) throw error;

      setStatusMessage("Scores calculated");
      appendLog("Scores calculated");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Scoreberekening mislukt.";
      setStatusMessage(message);
      appendLog(`Score fout: ${message}`);
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
      <h1 className="text-3xl font-display font-bold">Admin Dashboard</h1>
      {statusMessage && (
        <p className="text-sm text-muted-foreground">{statusMessage}</p>
      )}

      <Tabs defaultValue="games" className="space-y-4">
        <TabsList className="w-full flex-wrap h-auto">
          <TabsTrigger value="games">Games</TabsTrigger>
          <TabsTrigger value="categories">Categorieen</TabsTrigger>
          <TabsTrigger value="riders">Renners</TabsTrigger>
          <TabsTrigger value="startlist">Startlijst</TabsTrigger>
          <TabsTrigger value="stages">Etappes</TabsTrigger>
          <TabsTrigger value="results">Uitslagen</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="games">
          <Card className="rounded-xl shadow-sm">
            <CardHeader><CardTitle>Games</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <Input placeholder="Naam" value={newGameName} onChange={(e) => setNewGameName(e.target.value)} />
                <Input placeholder="Jaar" value={newGameYear} onChange={(e) => setNewGameYear(e.target.value)} />
                <Select value={newGameStatus} onValueChange={setNewGameStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["draft", "open", "locked", "live", "finished"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={createGame} disabled={isCreatingGame}>
                  {isCreatingGame ? "Aanmaken..." : "Aanmaken"}
                </Button>
              </div>
              <div className="space-y-1 text-sm">
                {games.map((g) => <div key={g.id}>{g.year} - {g.name} ({g.status})</div>)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card className="rounded-xl shadow-sm">
            <CardHeader><CardTitle>Categorieen</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select value={activeGameId} onValueChange={setActiveGameId}>
                <SelectTrigger><SelectValue placeholder="Selecteer game" /></SelectTrigger>
                <SelectContent>{games.map((g) => <SelectItem key={g.id} value={g.id}>{g.year} - {g.name}</SelectItem>)}</SelectContent>
              </Select>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <Input placeholder="Naam" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                <Input placeholder="Short name" value={newCategoryShort} onChange={(e) => setNewCategoryShort(e.target.value)} />
                <Input placeholder="Sort order" value={newCategorySort} onChange={(e) => setNewCategorySort(e.target.value)} />
                <Button onClick={createCategory}>Opslaan</Button>
              </div>
              <div className="space-y-1 text-sm">
                {categories.map((c) => (
                  <div key={c.id} className="flex items-center justify-between">
                    <span>{c.sort_order}. {c.name} ({c.short_name ?? "-"})</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const { error } = await supabase.from("categories").delete().eq("id", c.id);
                        if (error) return appendLog(`Delete categorie fout: ${error.message}`);
                        setCategories((prev) => prev.filter((x) => x.id !== c.id));
                      }}
                    >
                      Verwijder
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="riders">
          <Card className="rounded-xl shadow-sm">
            <CardHeader><CardTitle>Renners</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <Input placeholder="Naam" value={newRiderName} onChange={(e) => setNewRiderName(e.target.value)} />
                <Input placeholder="Startnummer" value={newRiderStart} onChange={(e) => setNewRiderStart(e.target.value)} />
                <Select value={newRiderTeamId} onValueChange={setNewRiderTeamId}>
                  <SelectTrigger><SelectValue placeholder="Team" /></SelectTrigger>
                  <SelectContent>{teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
                <Button onClick={createRider}>Aanmaken</Button>
              </div>
              <div className="max-h-72 overflow-auto space-y-1 text-sm">
                {ridersList.map((r) => <div key={r.id}>#{r.start_number ?? "-"} {r.name}</div>)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="startlist">
          <Card className="rounded-xl shadow-sm">
            <CardHeader><CardTitle>Startlijst beheer</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Input placeholder="Teamnaam" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} />
                <Button onClick={createTeam}>Team aanmaken</Button>
              </div>
              <div className="border rounded-md p-3 space-y-2">
                <p className="text-sm font-medium">Upload PCS startlijst (PDF)</p>
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                />
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={loadImportPreview}>
                    Preview laden
                  </Button>
                  <Button onClick={importStartlistToSupabase} disabled={isImporting}>
                    {isImporting ? "Importeren..." : "Importeer naar Supabase"}
                  </Button>
                </div>
                {importPreview.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Preview: {importPreview.length} teams,{" "}
                    {importPreview.reduce((sum, t) => sum + t.riders.length, 0)} renners
                  </p>
                )}
              </div>
              <div className="max-h-72 overflow-auto space-y-2">
                {teams.map((t) => (
                  <div key={t.id} className="border rounded-md p-2">
                    <p className="font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ridersList.filter((r) => r.team_id === t.id).length} renners
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stages">
          <Card className="rounded-xl shadow-sm">
            <CardHeader><CardTitle>Etappes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Input placeholder="Stage number" value={newStageNumber} onChange={(e) => setNewStageNumber(e.target.value)} />
                <Input placeholder="Naam" value={newStageName} onChange={(e) => setNewStageName(e.target.value)} />
                <Button onClick={createStage}>Aanmaken</Button>
              </div>
              <div className="space-y-1 text-sm">
                {stages.map((s) => <div key={s.id}>{s.stage_number}. {s.name} ({s.status ?? "draft"})</div>)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle>Stage Selection</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="stage-select">Selecteer etappe</Label>
              <select
                id="stage-select"
                className="mt-2 w-full border rounded-md p-2 bg-background"
                value={selectedStageId}
                onChange={(e) => setSelectedStageId(e.target.value)}
              >
                <option value="">Kies een etappe...</option>
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    Etappe {stage.stage_number} - {stage.name}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle>Upload Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csv-upload">CSV upload</Label>
            <Input id="csv-upload" type="file" accept=".csv" onChange={handleCsvUpload} />
            <p className="text-xs text-muted-foreground">
              Verwachte kolommen: <code>start_number</code> (of <code>rider_number</code>), <code>finish_position</code>, optioneel <code>rider_name</code>, <code>gc_position</code>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input
              placeholder="start_number"
              value={manualStartNumber}
              onChange={(e) => setManualStartNumber(e.target.value)}
              type="number"
              min={1}
            />
            <Input
              placeholder="rider_name (optioneel)"
              value={manualRider}
              onChange={(e) => setManualRider(e.target.value)}
            />
            <Input
              placeholder="finish_position"
              value={manualPosition}
              onChange={(e) => setManualPosition(e.target.value)}
              type="number"
              min={1}
            />
            <Button onClick={addManualRow} type="button" variant="secondary">
              Voeg handmatig toe
            </Button>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={overwriteExisting}
              onChange={(e) => setOverwriteExisting(e.target.checked)}
            />
            Overschrijf bestaande stage_results voor deze etappe
          </label>
        </CardContent>
      </Card>

          <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">start_number</th>
                <th className="text-left py-2">rider_name</th>
                <th className="text-left py-2">finish_position</th>
                <th className="text-left py-2">status</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.length === 0 && (
                <tr>
                  <td className="py-2 text-muted-foreground" colSpan={4}>
                    Nog geen resultaten geladen.
                  </td>
                </tr>
              )}
              {previewRows.map((row, index) => (
                <tr
                  key={`${row.rider_name}-${index}`}
                  className={row.issue ? "bg-destructive/10" : ""}
                >
                  <td className="py-2">{row.start_number ?? "-"}</td>
                  <td className="py-2">{row.rider_name}</td>
                  <td className="py-2">{row.finish_position}</td>
                  <td className="py-2 text-muted-foreground">
                    {row.issue ? row.issue : "OK"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

          <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button type="button" onClick={saveResults} disabled={isSaving || isCalculating}>
            {isSaving ? "Opslaan..." : "Save Results"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={calculateScores}
            disabled={isSaving || isCalculating}
          >
            {isCalculating ? "Berekenen..." : "Calculate Scores"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={calculateScores}
            disabled={isSaving || isCalculating}
          >
            Recalculate Stage
          </Button>
        </CardContent>
      </Card>

        </TabsContent>

        <TabsContent value="logs">
          <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle>Status / Logs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {statusMessage || "Geen meldingen."}{" "}
            {previewRows.length > 0 ? `(${previewRows.length}/20 ingevuld)` : ""}
          </p>
          <Textarea
            readOnly
            value={logs.join("\n")}
            className="min-h-32 text-xs"
            placeholder="Logs verschijnen hier..."
          />
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
