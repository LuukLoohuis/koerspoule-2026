import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import EntryEditorDialog from "./EntryEditorDialog";

type Entry = {
  entry_id: string;
  game_id: string;
  user_id: string;
  team_name: string | null;
  entry_status: string;
  submitted_at: string | null;
  created_at: string;
  email: string;
  display_name: string;
  picks_count: number;
  jokers_count: number;
  total_points: number;
};

export default function EntriesTab({ activeGameId }: { activeGameId: string }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  async function load() {
    if (!supabase || !activeGameId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("admin_entries_overview")
      .select("*")
      .eq("game_id", activeGameId)
      .order("total_points", { ascending: false, nullsFirst: false });
    if (error) {
      toast.error(`Inzendingen laden mislukt: ${error.message}`);
      setLoading(false);
      return;
    }
    setEntries((data ?? []) as Entry[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [activeGameId]);

  const filtered = entries.filter(
    (e) =>
      !search.trim() ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      (e.team_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      e.display_name.toLowerCase().includes(search.toLowerCase())
  );

  const submitted = entries.filter((e) => e.entry_status === "submitted").length;
  const drafts = entries.filter((e) => e.entry_status === "draft").length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center justify-between flex-wrap gap-2">
            <span>Inzendingen ({entries.length})</span>
            <div className="flex gap-2">
              <Badge variant="outline">{submitted} submitted</Badge>
              <Badge variant="outline">{drafts} draft</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              data-testid="search-entries"
              placeholder="Zoek op e-mail, ploegnaam of speler..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button variant="outline" onClick={load} disabled={loading} data-testid="reload-entries">
              {loading ? "Laden..." : "Vernieuwen"}
            </Button>
          </div>
          <div className="border rounded-md max-h-[600px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Speler</TableHead>
                  <TableHead>Ploegnaam</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead className="text-center">Picks</TableHead>
                  <TableHead className="text-center">Jokers</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Punten</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.entry_id} data-testid={`entry-row-${e.entry_id}`}>
                    <TableCell className="font-medium">{e.display_name}</TableCell>
                    <TableCell>{e.team_name ?? <span className="text-muted-foreground italic">geen</span>}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{e.email}</TableCell>
                    <TableCell className="text-center tabular-nums">{e.picks_count}</TableCell>
                    <TableCell className="text-center tabular-nums">{e.jokers_count}</TableCell>
                    <TableCell>
                      {e.entry_status === "submitted" ? (
                        <Badge>Submitted</Badge>
                      ) : (
                        <Badge variant="outline">Draft</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-bold">{e.total_points}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => setEditingEntryId(e.entry_id)} data-testid={`edit-entry-${e.entry_id}`}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                      {entries.length === 0 ? "Nog geen inzendingen voor deze game." : "Geen resultaten voor zoekopdracht."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <EntryEditorDialog
        entryId={editingEntryId}
        gameId={activeGameId}
        open={!!editingEntryId}
        onOpenChange={(o) => !o && setEditingEntryId(null)}
        onSaved={load}
      />
    </div>
  );
}
