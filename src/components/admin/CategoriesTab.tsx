import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Plus, Trash2, X, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type Category = {
  id: string;
  game_id: string;
  name: string;
  short_name: string | null;
  sort_order: number;
  max_picks: number;
};

type Rider = {
  id: string;
  name: string;
  start_number: number | null;
  team: string | null;
  team_id: string | null;
};

type CategoryRider = {
  rider_id: string;
  rider: Rider;
};

export default function CategoriesTab({
  activeGameId,
  categories,
  reload,
}: {
  activeGameId: string;
  categories: Category[];
  reload: () => Promise<void> | void;
}) {
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [maxPicks, setMaxPicks] = useState(1);
  const [sortOrder, setSortOrder] = useState(categories.length + 1);

  const [allRiders, setAllRiders] = useState<Rider[]>([]);
  const [teamsById, setTeamsById] = useState<Record<string, string>>({});
  const [ridersByCategory, setRidersByCategory] = useState<Record<string, Rider[]>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!supabase || !activeGameId) return;
    void loadRiders();
    void loadCategoryRiders();
  }, [activeGameId, categories.map((c) => c.id).join(",")]);

  async function loadRiders() {
    if (!supabase) return;
    const { data: teams } = await supabase
      .from("teams")
      .select("id,name")
      .eq("game_id", activeGameId);
    const map: Record<string, string> = {};
    (teams ?? []).forEach((t: any) => { map[t.id] = t.name; });
    setTeamsById(map);

    const { data, error } = await supabase
      .from("riders")
      .select("id,name,start_number,team,team_id")
      .eq("game_id", activeGameId)
      .order("start_number", { ascending: true });
    if (error) {
      toast.error(`Renners laden mislukt: ${error.message}`);
      return;
    }
    setAllRiders((data ?? []) as Rider[]);
  }

  async function loadCategoryRiders() {
    if (!supabase || categories.length === 0) {
      setRidersByCategory({});
      return;
    }
    const ids = categories.map((c) => c.id);
    const { data, error } = await supabase
      .from("category_riders")
      .select("category_id, rider:riders(id,name,start_number,team,team_id)")
      .in("category_id", ids);
    if (error) {
      toast.error(`Categorie-renners laden mislukt: ${error.message}`);
      return;
    }
    const grouped: Record<string, Rider[]> = {};
    (data ?? []).forEach((row: any) => {
      if (!row.rider) return;
      if (!grouped[row.category_id]) grouped[row.category_id] = [];
      grouped[row.category_id].push(row.rider as Rider);
    });
    Object.keys(grouped).forEach((k) => {
      grouped[k].sort((a, b) => (a.start_number ?? 9999) - (b.start_number ?? 9999));
    });
    setRidersByCategory(grouped);
  }

  async function createCategory() {
    if (!supabase || !activeGameId) return;
    if (!name.trim()) {
      toast.error("Vul een categorienaam in");
      return;
    }
    const { error } = await supabase.from("categories").insert({
      game_id: activeGameId,
      name: name.trim(),
      short_name: shortName.trim() || null,
      sort_order: sortOrder,
      max_picks: maxPicks,
    });
    if (error) {
      toast.error(`Aanmaken mislukt: ${error.message}`);
      return;
    }
    toast.success("Categorie aangemaakt");
    setName("");
    setShortName("");
    setSortOrder((v) => v + 1);
    await reload();
  }

  async function updateMaxPicks(id: string, value: number) {
    if (!supabase) return;
    const { error } = await supabase.from("categories").update({ max_picks: value }).eq("id", id);
    if (error) {
      toast.error(`Update mislukt: ${error.message}`);
      return;
    }
    toast.success("Max keuzes aangepast");
    await reload();
  }

  async function deleteCategory(id: string) {
    if (!supabase) return;
    if (!confirm("Categorie verwijderen? Renner-koppelingen verdwijnen ook.")) return;
    await supabase.from("category_riders").delete().eq("category_id", id);
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      toast.error(`Verwijderen mislukt: ${error.message}`);
      return;
    }
    toast.success("Categorie verwijderd");
    await reload();
  }

  async function addRiderToCategory(categoryId: string, rider: Rider) {
    if (!supabase) return;
    const { error } = await supabase
      .from("category_riders")
      .insert({ category_id: categoryId, rider_id: rider.id });
    if (error) {
      if (error.code === "23505") {
        toast.error("Renner zit al in deze categorie");
      } else {
        toast.error(`Toevoegen mislukt: ${error.message}`);
      }
      return;
    }
    setRidersByCategory((prev) => {
      const list = prev[categoryId] ? [...prev[categoryId]] : [];
      list.push(rider);
      list.sort((a, b) => (a.start_number ?? 9999) - (b.start_number ?? 9999));
      return { ...prev, [categoryId]: list };
    });
    toast.success(`${rider.name} toegevoegd`);
  }

  async function removeRiderFromCategory(categoryId: string, riderId: string) {
    if (!supabase) return;
    const { error } = await supabase
      .from("category_riders")
      .delete()
      .eq("category_id", categoryId)
      .eq("rider_id", riderId);
    if (error) {
      toast.error(`Verwijderen mislukt: ${error.message}`);
      return;
    }
    setRidersByCategory((prev) => ({
      ...prev,
      [categoryId]: (prev[categoryId] ?? []).filter((r) => r.id !== riderId),
    }));
  }

  // Drag-and-drop herordenen van categorieën (HTML5 native)
  const orderedCategories = useMemo(
    () => [...categories].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [categories]
  );
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  async function reorderCategories(sourceId: string, targetId: string) {
    if (!supabase || sourceId === targetId) return;
    const list = [...orderedCategories];
    const fromIdx = list.findIndex((c) => c.id === sourceId);
    const toIdx = list.findIndex((c) => c.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);

    // Schrijf nieuwe sort_order (1..n) per categorie. Parallelle updates.
    const updates = list.map((c, idx) =>
      supabase!.from("categories").update({ sort_order: idx + 1 }).eq("id", c.id)
    );
    const results = await Promise.all(updates);
    const firstErr = results.find((r) => r.error);
    if (firstErr?.error) {
      toast.error(`Volgorde opslaan mislukt: ${firstErr.error.message}`);
      return;
    }
    toast.success("Volgorde aangepast");
    await reload();
  }

  const teamLabel = (r: Rider) => r.team || (r.team_id ? teamsById[r.team_id] : "") || "";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="font-display">Nieuwe categorie</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-5">
          <div className="md:col-span-2">
            <Label>Naam</Label>
            <Input data-testid="category-name-input" placeholder="Bv. GC Aliens" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Korte naam</Label>
            <Input data-testid="category-short-input" placeholder="GC" value={shortName} onChange={(e) => setShortName(e.target.value)} />
          </div>
          <div>
            <Label>Volgorde</Label>
            <Input data-testid="category-order-input" type="number" min={1} value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
          </div>
          <div>
            <Label>Max keuzes</Label>
            <Input data-testid="category-max-picks-input" type="number" min={1} max={20} value={maxPicks} onChange={(e) => setMaxPicks(Number(e.target.value))} />
          </div>
          <div className="md:col-span-5 flex justify-end">
            <Button data-testid="create-category-btn" onClick={createCategory}>Aanmaken</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display">
            Categorieën ({categories.length}) — {allRiders.length} renners in startlijst
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allRiders.length === 0 && (
            <div className="mb-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Nog geen renners in startlijst. Importeer eerst de startlijst in de tab "Startlijst".
            </div>
          )}
          <p className="mb-2 text-xs text-muted-foreground">Sleep aan het <GripVertical className="inline h-3 w-3" />-handvat om de volgorde te wijzigen.</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead className="w-10"></TableHead>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Naam</TableHead>
                <TableHead className="w-24">Renners</TableHead>
                <TableHead className="w-32">Max keuzes</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderedCategories.map((c) => {
                const isOpen = !!expanded[c.id];
                const riders = ridersByCategory[c.id] ?? [];
                return (
                  <CategoryRow
                    key={c.id}
                    c={c}
                    isOpen={isOpen}
                    onToggle={() => setExpanded((p) => ({ ...p, [c.id]: !p[c.id] }))}
                    riders={riders}
                    allRiders={allRiders}
                    teamLabel={teamLabel}
                    onAdd={(r) => addRiderToCategory(c.id, r)}
                    onRemove={(rid) => removeRiderFromCategory(c.id, rid)}
                    onMaxPicks={(v) => updateMaxPicks(c.id, v)}
                    onDelete={() => deleteCategory(c.id)}
                    isDragging={dragId === c.id}
                    isDragOver={dragOverId === c.id && dragId !== c.id}
                    onDragStart={() => setDragId(c.id)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragOverId !== c.id) setDragOverId(c.id);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setDragOverId(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const src = dragId;
                      setDragId(null);
                      setDragOverId(null);
                      if (src) void reorderCategories(src, c.id);
                    }}
                  />
                );
              })}
              {categories.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Geen categorieën.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function CategoryRow({
  c, isOpen, onToggle, riders, allRiders, teamLabel, onAdd, onRemove, onMaxPicks, onDelete,
  isDragging, isDragOver, onDragStart, onDragOver, onDragEnd, onDrop,
}: {
  c: Category;
  isOpen: boolean;
  onToggle: () => void;
  riders: Rider[];
  allRiders: Rider[];
  teamLabel: (r: Rider) => string;
  onAdd: (r: Rider) => void;
  onRemove: (riderId: string) => void;
  onMaxPicks: (v: number) => void;
  onDelete: () => void;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLTableRowElement>) => void;
  onDragOver?: (e: React.DragEvent<HTMLTableRowElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLTableRowElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLTableRowElement>) => void;
}) {
  const [search, setSearch] = useState("");

  const usedIds = useMemo(() => new Set(riders.map((r) => r.id)), [riders]);
  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return allRiders
      .filter((r) => !usedIds.has(r.id))
      .filter((r) =>
        r.name.toLowerCase().includes(q) ||
        String(r.start_number ?? "").includes(q)
      )
      .slice(0, 8);
  }, [search, allRiders, usedIds]);

  return (
    <>
      <TableRow
        data-testid={`category-row-${c.id}`}
        draggable
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDrop={onDrop}
        className={cn(
          isDragging && "opacity-50",
          isDragOver && "outline outline-2 outline-primary"
        )}
      >
        <TableCell className="cursor-grab active:cursor-grabbing text-muted-foreground">
          <GripVertical className="h-4 w-4" />
        </TableCell>
        <TableCell>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onToggle}>
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </TableCell>
        <TableCell>{c.sort_order}</TableCell>
        <TableCell className="font-medium">
          {c.name}
          {c.short_name && <span className="ml-2 text-xs text-muted-foreground">({c.short_name})</span>}
        </TableCell>
        <TableCell>
          <Badge variant="secondary">{riders.length}</Badge>
        </TableCell>
        <TableCell>
          <Input
            type="number" min={1} max={20} defaultValue={c.max_picks} className="h-8 w-20"
            onBlur={(e) => {
              const v = Number(e.target.value);
              if (v !== c.max_picks && v >= 1) onMaxPicks(v);
            }}
            data-testid={`max-picks-${c.id}`}
          />
        </TableCell>
        <TableCell>
          <Button variant="ghost" size="sm" onClick={onDelete} data-testid={`delete-category-${c.id}`}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </TableCell>
      </TableRow>
      {isOpen && (
        <TableRow>
          <TableCell colSpan={7} className="bg-muted/30">
            <div className="space-y-3 p-2">
              {riders.length === 0 && (
                <div className="text-xs text-muted-foreground italic">Nog geen renners in deze categorie.</div>
              )}
              {riders.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {riders.map((r) => (
                    <div key={r.id} className="flex items-center gap-2 rounded-md border bg-background px-2 py-1 text-sm">
                      <span className="text-xs text-muted-foreground tabular-nums w-6 text-right">
                        {r.start_number ?? "—"}
                      </span>
                      <span className="font-medium">{r.name}</span>
                      <span className="text-xs text-muted-foreground">{teamLabel(r)}</span>
                      <button
                        type="button"
                        onClick={() => onRemove(r.id)}
                        className="ml-1 text-muted-foreground hover:text-destructive"
                        aria-label="Verwijder renner"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="relative max-w-md">
                <Input
                  placeholder="Zoek renner op naam of startnummer..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-testid={`rider-search-${c.id}`}
                />
                {results.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
                    {results.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          onAdd(r);
                          setSearch("");
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                      >
                        <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
                          #{r.start_number ?? "—"}
                        </span>
                        <span className="font-medium">{r.name}</span>
                        <span className="ml-auto text-xs text-muted-foreground">{teamLabel(r)}</span>
                      </button>
                    ))}
                  </div>
                )}
                {search.trim() && results.length === 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-md">
                    Geen renners gevonden.
                  </div>
                )}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
