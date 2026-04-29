import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LayoutDashboard, Trophy, Tag, Users, ListChecks, Calendar, Calculator, Shield } from "lucide-react";

import GamesTab, { type Game } from "@/components/admin/GamesTab";
import CategoriesTab, { type Category } from "@/components/admin/CategoriesTab";
import StartlistTab, { type Rider } from "@/components/admin/StartlistTab";
import StagesTab, { type Stage } from "@/components/admin/StagesTab";
import ResultsTab from "@/components/admin/ResultsTab";
import CalculationTab from "@/components/admin/CalculationTab";
import UsersTab from "@/components/admin/UsersTab";
import DashboardTab from "@/components/admin/DashboardTab";

export default function AdminV3() {
  const { user, role, loading } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [activeGameId, setActiveGameId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);

  const activeGame = useMemo(() => games.find((g) => g.id === activeGameId), [games, activeGameId]);

  async function loadGames() {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("games")
      .select("id, name, game_type, year, status, start_date, end_date")
      .order("year", { ascending: false, nullsFirst: false });
    if (error) {
      toast.error(`Games laden mislukt: ${error.message}`);
      return;
    }
    setGames((data ?? []) as Game[]);
    if ((data ?? []).length && !activeGameId) {
      setActiveGameId(data![0].id);
    }
  }

  async function loadGameScoped(gameId: string) {
    if (!supabase || !gameId) return;
    const [c, gr, s] = await Promise.all([
      supabase.from("categories").select("id, game_id, name, order_index, max_picks").eq("game_id", gameId).order("order_index"),
      supabase
        .from("game_riders")
        .select("id, game_id, rider_id, category_id, riders(id, name, team)")
        .eq("game_id", gameId),
      supabase.from("stages").select("id, game_id, stage_number, date").eq("game_id", gameId).order("stage_number"),
    ]);
    setCategories((c.data ?? []) as Category[]);
    setRiders(
      (gr.data ?? []).map((row: { rider_id: string; category_id: string | null; riders: { name: string; team: string | null } | null }) => ({
        id: row.rider_id,
        name: row.riders?.name ?? "(onbekend)",
        team: row.riders?.team ?? null,
        category_id: row.category_id,
        game_rider_id: (row as { id: string }).id,
      }))
    );
    setStages((s.data ?? []) as Stage[]);
  }

  useEffect(() => {
    loadGames();
  }, []);

  useEffect(() => {
    if (activeGameId) loadGameScoped(activeGameId);
  }, [activeGameId]);

  if (loading) return <div className="container mx-auto px-4 py-8">Laden...</div>;

  if (!supabase) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card><CardHeader><CardTitle>Admin</CardTitle></CardHeader>
          <CardContent>Supabase configuratie ontbreekt. Vul VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY in.</CardContent>
        </Card>
      </div>
    );
  }

  if (!user || role !== "admin") {
    return (
      <div className="container mx-auto px-4 py-8" data-testid="admin-no-access">
        <Card><CardHeader><CardTitle>Geen toegang</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Deze pagina is alleen voor admins. Log in met je admin-account.
            </p>
            <a href="/login" className="text-primary underline">Naar login</a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6" data-testid="admin-v3">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Koerspoule Admin</h1>
          <p className="text-muted-foreground text-sm font-serif italic">Centraal beheercentrum — alles op één plek.</p>
        </div>
        <div className="min-w-[280px]">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Actieve game</Label>
          <Select value={activeGameId} onValueChange={setActiveGameId}>
            <SelectTrigger data-testid="active-game-selector"><SelectValue placeholder="Kies een game" /></SelectTrigger>
            <SelectContent>
              {games.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {gameLabel(g)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="dashboard" data-testid="tab-dashboard"><LayoutDashboard className="w-4 h-4 mr-2" />Dashboard</TabsTrigger>
          <TabsTrigger value="games" data-testid="tab-games"><Trophy className="w-4 h-4 mr-2" />Games</TabsTrigger>
          <TabsTrigger value="categories" disabled={!activeGameId} data-testid="tab-categories"><Tag className="w-4 h-4 mr-2" />Categorieën</TabsTrigger>
          <TabsTrigger value="startlist" disabled={!activeGameId} data-testid="tab-startlist"><Users className="w-4 h-4 mr-2" />Startlijst</TabsTrigger>
          <TabsTrigger value="stages" disabled={!activeGameId} data-testid="tab-stages"><Calendar className="w-4 h-4 mr-2" />Etappes</TabsTrigger>
          <TabsTrigger value="results" disabled={!activeGameId} data-testid="tab-results"><ListChecks className="w-4 h-4 mr-2" />Uitslagen</TabsTrigger>
          <TabsTrigger value="calc" disabled={!activeGameId} data-testid="tab-calc"><Calculator className="w-4 h-4 mr-2" />Berekening</TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users"><Shield className="w-4 h-4 mr-2" />Gebruikers</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab activeGameId={activeGameId} activeGame={activeGame ?? null} />
        </TabsContent>

        <TabsContent value="games">
          <GamesTab games={games} setActiveGameId={setActiveGameId} reload={loadGames} />
        </TabsContent>

        <TabsContent value="categories">
          <CategoriesTab activeGameId={activeGameId} categories={categories} reload={() => loadGameScoped(activeGameId)} />
        </TabsContent>

        <TabsContent value="startlist">
          <StartlistTab activeGameId={activeGameId} categories={categories} riders={riders} reload={() => loadGameScoped(activeGameId)} />
        </TabsContent>

        <TabsContent value="stages">
          <StagesTab activeGameId={activeGameId} stages={stages} reload={() => loadGameScoped(activeGameId)} />
        </TabsContent>

        <TabsContent value="results">
          <ResultsTab activeGameId={activeGameId} stages={stages} riders={riders} />
        </TabsContent>

        <TabsContent value="calc">
          <CalculationTab activeGameId={activeGameId} stages={stages} />
        </TabsContent>

        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function gameLabel(g: Game): string {
  const typeMap: Record<string, string> = { giro: "Giro d'Italia", tdf: "Tour de France", vuelta: "Vuelta a España" };
  if (g.game_type && g.year) return `${typeMap[g.game_type] ?? g.game_type} ${g.year}`;
  return g.name;
}
