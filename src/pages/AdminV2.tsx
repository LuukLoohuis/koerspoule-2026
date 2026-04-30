// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

type Game = { id: string; name: string; start_date: string | null; end_date: string | null };
type Category = { id: string; game_id: string; name: string; order_index: number };
type Rider = { id: string; name: string; team: string | null };
type GameRider = { id: string; game_id: string; rider_id: string; category_id: string | null };
type Stage = { id: string; game_id: string; stage_number: number; date: string | null };
type PointsRow = { id: string; game_id: string; position: number; points: number };

async function rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error("Supabase niet geconfigureerd");
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data as T;
}

async function invoke(fn: string, body: unknown) {
  if (!supabase) throw new Error("Supabase niet geconfigureerd");
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) throw error;
  return data;
}

export default function AdminV2() {
  const [games, setGames] = useState<Game[]>([]);
  const [activeGameId, setActiveGameId] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [gameRiders, setGameRiders] = useState<GameRider[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [points, setPoints] = useState<PointsRow[]>([]);

  const [gameForm, setGameForm] = useState({ name: "", start_date: "", end_date: "" });
  const [catForm, setCatForm] = useState({ name: "", order_index: 1 });
  const [riderForm, setRiderForm] = useState({ name: "", team: "" });
  const [glForm, setGlForm] = useState({ rider_id: "", category_id: "" });
  const [stageForm, setStageForm] = useState({ stage_number: 1, date: "" });
  const [pointsForm, setPointsForm] = useState({ position: 1, points: 50 });

  const [resultsStageId, setResultsStageId] = useState("");
  const [resultsJson, setResultsJson] = useState('[\n  { "rider_id": "uuid", "position": 1 }\n]');

  const activeGame = useMemo(() => games.find((g) => g.id === activeGameId), [games, activeGameId]);

  async function loadAll() {
    if (!supabase) return;
    const [g, r] = await Promise.all([
      supabase.from("games").select("*").order("start_date", { ascending: false }),
      supabase.from("riders").select("*").order("name"),
    ]);
    setGames((g.data ?? []) as Game[]);
    setRiders((r.data ?? []) as Rider[]);
  }

  async function loadGameScoped(gameId: string) {
    if (!supabase || !gameId) return;
    const [c, gr, s, p] = await Promise.all([
      supabase.from("categories").select("*").eq("game_id", gameId).order("order_index"),
      supabase.from("game_riders").select("*").eq("game_id", gameId),
      supabase.from("stages").select("*").eq("game_id", gameId).order("stage_number"),
      supabase.from("points_schema").select("*").eq("game_id", gameId).order("position"),
    ]);
    setCategories((c.data ?? []) as Category[]);
    setGameRiders((gr.data ?? []) as GameRider[]);
    setStages((s.data ?? []) as Stage[]);
    setPoints((p.data ?? []) as PointsRow[]);
  }

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { if (activeGameId) loadGameScoped(activeGameId); }, [activeGameId]);

  async function withToast<T>(label: string, fn: () => Promise<T>) {
    try {
      const out = await fn();
      toast.success(`${label} ✓`);
      return out;
    } catch (e) {
      toast.error(`${label}: ${(e as Error).message}`);
      throw e;
    }
  }

  // ---------- Games ----------
  async function createGame() {
    if (!supabase) return;
    await withToast("Game aangemaakt", async () => {
      const { error } = await supabase.from("games").insert({
        name: gameForm.name,
        start_date: gameForm.start_date || null,
        end_date: gameForm.end_date || null,
      });
      if (error) throw error;
      setGameForm({ name: "", start_date: "", end_date: "" });
      await loadAll();
    });
  }

  // ---------- Categories ----------
  async function createCategory() {
    if (!supabase || !activeGameId) return;
    await withToast("Categorie aangemaakt", async () => {
      const { error } = await supabase.from("categories").insert({
        game_id: activeGameId, name: catForm.name, order_index: catForm.order_index,
      });
      if (error) throw error;
      setCatForm({ name: "", order_index: catForm.order_index + 1 });
      await loadGameScoped(activeGameId);
    });
  }

  // ---------- Riders + start list ----------
  async function createRider() {
    if (!supabase) return;
    await withToast("Renner aangemaakt", async () => {
      const { error } = await supabase.from("riders").insert({
        name: riderForm.name, team: riderForm.team || null,
      });
      if (error) throw error;
      setRiderForm({ name: "", team: "" });
      await loadAll();
    });
  }

  async function addToStartlist() {
    if (!supabase || !activeGameId || !glForm.rider_id) return;
    await withToast("Toegevoegd aan startlijst", async () => {
      const { error } = await supabase.from("game_riders").insert({
        game_id: activeGameId,
        rider_id: glForm.rider_id,
        category_id: glForm.category_id || null,
      });
      if (error) throw error;
      setGlForm({ rider_id: "", category_id: "" });
      await loadGameScoped(activeGameId);
    });
  }

  async function removeFromStartlist(id: string) {
    if (!supabase) return;
    await withToast("Verwijderd", async () => {
      const { error } = await supabase.from("game_riders").delete().eq("id", id);
      if (error) throw error;
      await loadGameScoped(activeGameId);
    });
  }

  // ---------- Stages ----------
  async function createStage() {
    if (!supabase || !activeGameId) return;
    await withToast("Etappe aangemaakt", async () => {
      const { error } = await supabase.from("stages").insert({
        game_id: activeGameId,
        stage_number: stageForm.stage_number,
        date: stageForm.date || null,
      });
      if (error) throw error;
      setStageForm({ stage_number: stageForm.stage_number + 1, date: "" });
      await loadGameScoped(activeGameId);
    });
  }

  // ---------- Points schema ----------
  async function addPointsRow() {
    if (!supabase || !activeGameId) return;
    await withToast("Puntenregel toegevoegd", async () => {
      const { error } = await supabase.from("points_schema").insert({
        game_id: activeGameId,
        position: pointsForm.position,
        points: pointsForm.points,
      });
      if (error) throw error;
      setPointsForm({ position: pointsForm.position + 1, points: Math.max(1, pointsForm.points - 5) });
      await loadGameScoped(activeGameId);
    });
  }

  async function seedDefaultPoints() {
    if (!supabase || !activeGameId) return;
    const table = [50, 40, 32, 26, 22, 19, 17, 15, 13, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    await withToast("Standaard puntentabel geladen", async () => {
      await supabase.from("points_schema").delete().eq("game_id", activeGameId);
      const rows = table.map((points, i) => ({ game_id: activeGameId, position: i + 1, points }));
      const { error } = await supabase.from("points_schema").insert(rows);
      if (error) throw error;
      await loadGameScoped(activeGameId);
    });
  }

  // ---------- Results & recalc ----------
  async function importResults() {
    if (!resultsStageId) { toast.error("Selecteer een etappe"); return; }
    let parsed: unknown;
    try { parsed = JSON.parse(resultsJson); }
    catch { toast.error("Ongeldige JSON"); return; }
    await withToast("Uitslagen geïmporteerd + berekend", () =>
      invoke("import-stage-results", { stage_id: resultsStageId, results: parsed, auto_calculate: true })
    );
  }

  async function calcStage() {
    if (!resultsStageId) return;
    await withToast("Etappe-punten herberekend", () =>
      rpc("calculate_stage_points", { p_stage_id: resultsStageId })
    );
  }

  async function recalcGame() {
    if (!activeGameId) return;
    await withToast("Volledige herberekening", () =>
      invoke("recalculate-game", { game_id: activeGameId })
    );
  }

  async function resetStage() {
    if (!resultsStageId) return;
    if (!confirm("Weet je zeker dat je deze etappe wilt resetten?")) return;
    await withToast("Etappe gereset", () =>
      invoke("reset-stage", { stage_id: resultsStageId })
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Admin v2</h1>
          <p className="text-muted-foreground text-sm">Minimale UI voor het nieuwe backend-schema (games, picks, scoring).</p>
        </div>
        <div className="min-w-[260px]">
          <Label>Actieve game</Label>
          <Select value={activeGameId} onValueChange={setActiveGameId}>
            <SelectTrigger><SelectValue placeholder="Kies een game" /></SelectTrigger>
            <SelectContent>
              {games.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="games">
        <TabsList className="flex-wrap">
          <TabsTrigger value="games">Games</TabsTrigger>
          <TabsTrigger value="categories" disabled={!activeGameId}>Categorieën</TabsTrigger>
          <TabsTrigger value="startlist" disabled={!activeGameId}>Startlijst</TabsTrigger>
          <TabsTrigger value="stages" disabled={!activeGameId}>Etappes</TabsTrigger>
          <TabsTrigger value="points" disabled={!activeGameId}>Puntentabel</TabsTrigger>
          <TabsTrigger value="results" disabled={!activeGameId}>Uitslagen</TabsTrigger>
        </TabsList>

        {/* GAMES */}
        <TabsContent value="games" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Nieuwe game</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <div><Label>Naam</Label><Input value={gameForm.name} onChange={(e) => setGameForm({ ...gameForm, name: e.target.value })} /></div>
              <div><Label>Start</Label><Input type="date" value={gameForm.start_date} onChange={(e) => setGameForm({ ...gameForm, start_date: e.target.value })} /></div>
              <div><Label>Einde</Label><Input type="date" value={gameForm.end_date} onChange={(e) => setGameForm({ ...gameForm, end_date: e.target.value })} /></div>
              <div className="flex items-end"><Button onClick={createGame} disabled={!gameForm.name}>Aanmaken</Button></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Bestaande games</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Naam</TableHead><TableHead>Start</TableHead><TableHead>Einde</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {games.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell>{g.name}</TableCell>
                      <TableCell>{g.start_date ?? "—"}</TableCell>
                      <TableCell>{g.end_date ?? "—"}</TableCell>
                      <TableCell><Button size="sm" variant="outline" onClick={() => setActiveGameId(g.id)}>Selecteer</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CATEGORIES */}
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Nieuwe categorie</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <div><Label>Naam</Label><Input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} /></div>
              <div><Label>Volgorde</Label><Input type="number" value={catForm.order_index} onChange={(e) => setCatForm({ ...catForm, order_index: Number(e.target.value) })} /></div>
              <div className="flex items-end"><Button onClick={createCategory} disabled={!catForm.name}>Aanmaken</Button></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Categorieën van {activeGame?.name}</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Naam</TableHead></TableRow></TableHeader>
                <TableBody>
                  {categories.map((c) => (
                    <TableRow key={c.id}><TableCell>{c.order_index}</TableCell><TableCell>{c.name}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STARTLIST */}
        <TabsContent value="startlist" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Renner aanmaken</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <div><Label>Naam</Label><Input value={riderForm.name} onChange={(e) => setRiderForm({ ...riderForm, name: e.target.value })} /></div>
              <div><Label>Team</Label><Input value={riderForm.team} onChange={(e) => setRiderForm({ ...riderForm, team: e.target.value })} /></div>
              <div className="flex items-end"><Button onClick={createRider} disabled={!riderForm.name}>Aanmaken</Button></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Toevoegen aan startlijst</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <div className="md:col-span-2">
                <Label>Renner</Label>
                <Select value={glForm.rider_id} onValueChange={(v) => setGlForm({ ...glForm, rider_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Kies renner" /></SelectTrigger>
                  <SelectContent>
                    {riders.map((r) => <SelectItem key={r.id} value={r.id}>{r.name} {r.team ? `(${r.team})` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Categorie (optioneel)</Label>
                <Select value={glForm.category_id} onValueChange={(v) => setGlForm({ ...glForm, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Geen" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end"><Button onClick={addToStartlist}>Toevoegen</Button></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Startlijst ({gameRiders.length})</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Renner</TableHead><TableHead>Team</TableHead><TableHead>Categorie</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {gameRiders.map((gr) => {
                    const rider = riders.find((r) => r.id === gr.rider_id);
                    const cat = categories.find((c) => c.id === gr.category_id);
                    return (
                      <TableRow key={gr.id}>
                        <TableCell>{rider?.name ?? gr.rider_id}</TableCell>
                        <TableCell>{rider?.team ?? "—"}</TableCell>
                        <TableCell>{cat?.name ?? "—"}</TableCell>
                        <TableCell><Button size="sm" variant="destructive" onClick={() => removeFromStartlist(gr.id)}>Verwijder</Button></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STAGES */}
        <TabsContent value="stages" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Nieuwe etappe</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <div><Label>Etappe nr.</Label><Input type="number" value={stageForm.stage_number} onChange={(e) => setStageForm({ ...stageForm, stage_number: Number(e.target.value) })} /></div>
              <div><Label>Datum</Label><Input type="date" value={stageForm.date} onChange={(e) => setStageForm({ ...stageForm, date: e.target.value })} /></div>
              <div className="flex items-end"><Button onClick={createStage}>Aanmaken</Button></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Etappes</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Datum</TableHead><TableHead>ID</TableHead></TableRow></TableHeader>
                <TableBody>
                  {stages.map((s) => (
                    <TableRow key={s.id}><TableCell>{s.stage_number}</TableCell><TableCell>{s.date ?? "—"}</TableCell><TableCell className="font-mono text-xs">{s.id}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* POINTS */}
        <TabsContent value="points" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Puntenregel toevoegen</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <div><Label>Positie</Label><Input type="number" value={pointsForm.position} onChange={(e) => setPointsForm({ ...pointsForm, position: Number(e.target.value) })} /></div>
              <div><Label>Punten</Label><Input type="number" value={pointsForm.points} onChange={(e) => setPointsForm({ ...pointsForm, points: Number(e.target.value) })} /></div>
              <div className="flex items-end gap-2">
                <Button onClick={addPointsRow}>Toevoegen</Button>
                <Button variant="outline" onClick={seedDefaultPoints}>Standaard 1-20</Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Puntentabel</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Pos</TableHead><TableHead>Punten</TableHead></TableRow></TableHeader>
                <TableBody>
                  {points.map((p) => (
                    <TableRow key={p.id}><TableCell>{p.position}</TableCell><TableCell>{p.points}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RESULTS */}
        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Uitslagen importeren</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Etappe</Label>
                <Select value={resultsStageId} onValueChange={setResultsStageId}>
                  <SelectTrigger><SelectValue placeholder="Kies etappe" /></SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => <SelectItem key={s.id} value={s.id}>Etappe {s.stage_number} {s.date ? `(${s.date})` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Resultaten (JSON array van {`{ rider_id, position }`})</Label>
                <Textarea rows={10} className="font-mono text-xs" value={resultsJson} onChange={(e) => setResultsJson(e.target.value)} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={importResults}>Import + bereken</Button>
                <Button variant="outline" onClick={calcStage}>Alleen herbereken (deze etappe)</Button>
                <Button variant="destructive" onClick={resetStage}>Reset etappe</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Volledige herberekening</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Wist alle stage_points en total_points voor deze game en bouwt opnieuw op.</p>
              <Button variant="destructive" onClick={recalcGame}>Recalculate {activeGame?.name}</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
