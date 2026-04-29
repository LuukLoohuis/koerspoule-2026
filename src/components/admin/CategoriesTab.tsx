import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export type Category = {
  id: string;
  game_id: string;
  name: string;
  short_name: string | null;
  sort_order: number;
  max_picks: number;
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
      console.error("Category create error:", error);
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
    if (!confirm("Categorie verwijderen?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      toast.error(`Verwijderen mislukt: ${error.message}`);
      return;
    }
    toast.success("Categorie verwijderd");
    await reload();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="font-display">Nieuwe categorie</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-5">
          <div className="md:col-span-2">
            <Label>Naam</Label>
            <Input data-testid="category-name-input" placeholder="Bv. Sprinters, Klassementsmannen" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Korte naam</Label>
            <Input data-testid="category-short-input" placeholder="Spr" value={shortName} onChange={(e) => setShortName(e.target.value)} />
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
        <CardHeader><CardTitle className="font-display">Categorieën van deze game ({categories.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Naam</TableHead>
                <TableHead>Kort</TableHead>
                <TableHead className="w-40">Max keuzes</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((c) => (
                <TableRow key={c.id} data-testid={`category-row-${c.id}`}>
                  <TableCell>{c.sort_order}</TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.short_name ?? "—"}</TableCell>
                  <TableCell>
                    <Input type="number" min={1} max={20} defaultValue={c.max_picks} className="h-8 w-20" onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v !== c.max_picks && v >= 1) updateMaxPicks(c.id, v);
                    }} data-testid={`max-picks-${c.id}`} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => deleteCategory(c.id)} data-testid={`delete-category-${c.id}`}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {categories.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Geen categorieën.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
