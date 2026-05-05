import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type AdminUser = {
  user_id: string;
  email: string;
  created_at: string;
  is_admin: boolean;
  teams_count: number;
};

export default function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function load() {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("admin_user_overview")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(`Gebruikers laden mislukt: ${error.message}`);
      setLoading(false);
      return;
    }
    setUsers((data ?? []) as AdminUser[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleAdmin(userId: string, makeAdmin: boolean) {
    if (!supabase) return;
    const { error } = await supabase.rpc("assign_admin_role", { p_user_id: userId, p_make_admin: makeAdmin });
    if (error) {
      toast.error(`Aanpassen mislukt: ${error.message}`);
      return;
    }
    toast.success(makeAdmin ? "Admin-rechten toegekend" : "Admin-rechten ingetrokken");
    await load();
  }

  const filtered = users.filter((u) => !search.trim() || u.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2"><Shield className="w-5 h-5" />Gebruikers ({users.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input data-testid="search-users" placeholder="Zoek op e-mail..." value={search} onChange={(e) => setSearch(e.target.value)} />
          {loading ? (
            <p className="text-sm text-muted-foreground">Laden...</p>
          ) : (
            <div className="border rounded-md max-h-[600px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Aangemeld</TableHead>
                    <TableHead className="w-20 text-center">Teams</TableHead>
                    <TableHead className="w-24">Rol</TableHead>
                    <TableHead className="w-32"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => (
                    <TableRow key={u.user_id} data-testid={`user-row-${u.user_id}`}>
                      <TableCell className="font-medium">{u.email}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString("nl-NL")}</TableCell>
                      <TableCell className="text-center">{u.teams_count}</TableCell>
                      <TableCell>
                        {u.is_admin ? <Badge>Admin</Badge> : <Badge variant="outline">User</Badge>}
                      </TableCell>
                      <TableCell>
                        {u.is_admin ? (
                          <Button size="sm" variant="outline" onClick={() => toggleAdmin(u.user_id, false)} data-testid={`revoke-admin-${u.user_id}`}>
                            <ShieldOff className="w-4 h-4 mr-1" />Intrekken
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => toggleAdmin(u.user_id, true)} data-testid={`grant-admin-${u.user_id}`}>
                            <Shield className="w-4 h-4 mr-1" />Maak admin
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Geen gebruikers gevonden.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
