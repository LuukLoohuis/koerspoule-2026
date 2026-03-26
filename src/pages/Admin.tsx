import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Papa from "papaparse";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";

type Stage = {
  id: string;
  stage_number: number;
  name: string;
};

type ResultRow = {
  rider_name: string;
  finish_position: number;
  gc_position?: number | null;
  issue?: string;
};

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
  if (!("rider_name" in firstRow) || !("finish_position" in firstRow)) {
    throw new Error("CSV mist verplichte kolommen: rider_name, finish_position");
  }

  return parsed.data.map((row) => {
    const riderName = String(row.rider_name ?? "").trim();
    const finish = Number(row.finish_position);
    const gcRaw = String(row.gc_position ?? "").trim();
    const gc = gcRaw ? Number(gcRaw) : null;

    return {
      rider_name: riderName,
      finish_position: finish,
      gc_position: Number.isFinite(gc as number) ? gc : null,
      issue:
        !riderName || !Number.isFinite(finish)
          ? "Ontbrekende of ongeldige data"
          : undefined,
    };
  });
}

export default function Admin() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedStageId, setSelectedStageId] = useState("");
  const [knownRiders, setKnownRiders] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [manualRider, setManualRider] = useState("");
  const [manualPosition, setManualPosition] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState("");

  const appendLog = (message: string) => {
    setLogs((prev) => [message, ...prev].slice(0, 20));
  };

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      if (!supabase) {
        setStatusMessage(
          "Supabase is niet geconfigureerd. Voeg VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY toe."
        );
        setAuthChecked(true);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        navigate("/login", { replace: true });
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        appendLog(`Kon adminprofiel niet laden: ${profileError.message}`);
        navigate("/", { replace: true });
        return;
      }

      if (!profile?.is_admin) {
        navigate("/", { replace: true });
        return;
      }

      setIsAuthorized(true);
      setAuthChecked(true);

      const { data: stageData, error: stageError } = await supabase
        .from("stages")
        .select("id, stage_number, name")
        .order("stage_number", { ascending: true });

      if (stageError) {
        appendLog(`Kon etappes niet ophalen: ${stageError.message}`);
      } else if (stageData) {
        setStages(stageData as Stage[]);
      }

      const { data: riderData } = await supabase.from("riders").select("name");
      if (riderData) {
        setKnownRiders(
          new Set(
            riderData
              .map((r) => String(r.name ?? "").trim().toLowerCase())
              .filter(Boolean)
          )
        );
      }
    }

    bootstrap();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  const previewRows = useMemo(
    () =>
      rows.map((row) => {
        const matchKey = row.rider_name.trim().toLowerCase();
        const isMatched = matchKey ? knownRiders.has(matchKey) : false;
        return {
          ...row,
          isMatched,
          issue:
            row.issue ??
            (!isMatched && knownRiders.size > 0 ? "Onbekende renner" : undefined),
        };
      }),
    [rows, knownRiders]
  );

  if (!authChecked && supabase) {
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

  if (!isAuthorized) {
    return <Navigate to="/" replace />;
  }

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
      setRows(parsedRows);
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
    const finish = Number(manualPosition);
    if (!manualRider.trim() || !Number.isFinite(finish)) {
      setStatusMessage("Vul een renner en geldige finish positie in.");
      return;
    }

    setRows((prev) => [
      ...prev,
      { rider_name: manualRider.trim(), finish_position: finish, gc_position: null },
    ]);
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input
              placeholder="rider_name"
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
                <th className="text-left py-2">rider_name</th>
                <th className="text-left py-2">finish_position</th>
                <th className="text-left py-2">status</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.length === 0 && (
                <tr>
                  <td className="py-2 text-muted-foreground" colSpan={3}>
                    Nog geen resultaten geladen.
                  </td>
                </tr>
              )}
              {previewRows.map((row, index) => (
                <tr
                  key={`${row.rider_name}-${index}`}
                  className={row.issue ? "bg-destructive/10" : ""}
                >
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

      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle>Status / Logs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">{statusMessage || "Geen meldingen."}</p>
          <Textarea
            readOnly
            value={logs.join("\n")}
            className="min-h-32 text-xs"
            placeholder="Logs verschijnen hier..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
