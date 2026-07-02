import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldOff, Trash2, Download, Upload, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { exportToXlsx, todayStamp } from "@/lib/exportXlsx";
import * as XLSX from "xlsx";
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
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    if (!supabase) return;
    setLoading(true);
    // Gepagineerd ophalen: Supabase kapt een select standaard op 1000 rijen,
    // waardoor de teller bleef steken op 1000 gebruikers.
    const PAGE = 1000;
    const all: AdminUser[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from("admin_user_overview")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, from + PAGE - 1);
      if (error) {
        toast.error(`Gebruikers laden mislukt: ${error.message}`);
        setLoading(false);
        return;
      }
      const rows = (data ?? []) as AdminUser[];
      all.push(...rows);
      if (rows.length < PAGE) break;
    }
    setUsers(all);
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

  async function confirmEmail(userId: string, email: string) {
    if (!supabase) return;
    if (!confirm(`E-mail van ${email} handmatig bevestigen? Doe dit alleen als de bevestigingsmail niet aankwam.`)) return;
    const { data, error } = await supabase.functions.invoke("admin-confirm-email", { body: { user_id: userId } });
    if (error || data?.error) { toast.error(`Bevestigen mislukt: ${error?.message ?? data?.error}`); return; }
    toast.success(`E-mail van ${email} bevestigd`);
  }

  async function deleteUser(userId: string, email: string) {
    if (!supabase) return;
    const { data, error } = await supabase.functions.invoke("admin-delete-user", {
      body: { user_id: userId },
    });
    if (error || (data as any)?.error) {
      toast.error(`Verwijderen mislukt: ${error?.message ?? (data as any)?.error}`);
      return;
    }
    toast.success(`${email} is verwijderd`);
    await load();
  }

  const filtered = users.filter((u) => !search.trim() || u.email.toLowerCase().includes(search.toLowerCase()));

  function handleExport() {
    if (filtered.length === 0) {
      toast.error("Geen gebruikers om te exporteren");
      return;
    }
    try {
      const rows = filtered.map((u) => ({
        Email: u.email,
        "Aangemaakt op": new Date(u.created_at).toLocaleString("nl-NL"),
        "Aantal teams": u.teams_count,
        Admin: u.is_admin ? "ja" : "nee",
      }));
      exportToXlsx(rows, `koerspoule-gebruikers-${todayStamp()}.xlsx`, "Gebruikers");
      toast.success(`${rows.length} gebruikers geëxporteerd`);
    } catch (e: any) {
      toast.error(`Export mislukt: ${e?.message ?? e}`);
    }
  }

  async function handleImportFile(file: File) {
    if (!supabase) return;
    setImporting(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
      const emails = Array.from(new Set(
        rows.flatMap((r) => Object.values(r))
          .map((v) => String(v ?? "").trim().toLowerCase())
          .filter((v) => emailRe.test(v))
      ));
      if (emails.length === 0) {
        toast.error("Geen geldige e-mailadressen gevonden in dit bestand");
        return;
      }
      if (!confirm(`${emails.length} e-mailadres(sen) gevonden. Uitnodigingen versturen?`)) return;

      const redirectTo = `${window.location.origin}/login`;
      const { data, error } = await supabase.functions.invoke("admin-invite-users", {
        body: { emails, redirect_to: redirectTo },
      });
      if (error || (data as any)?.error) {
        toast.error(`Import mislukt: ${error?.message ?? (data as any)?.error}`);
        return;
      }
      const { invited = 0, skipped = 0, errors = 0, total = 0 } = (data ?? {}) as any;
      toast.success(`Import klaar: ${invited}/${total} uitgenodigd, ${skipped} bestonden al, ${errors} fouten`);
      await load();
    } catch (e: any) {
      toast.error(`Import mislukt: ${e?.message ?? e}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2"><Shield className="w-5 h-5" />Gebruikers ({users.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Input data-testid="search-users" placeholder="Zoek op e-mail..." value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-[200px] flex-1" />
            <Button variant="outline" onClick={handleExport} disabled={loading || filtered.length === 0} data-testid="export-users">
              <Download className="w-4 h-4 mr-1" />Exporteer naar Excel
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImportFile(f);
              }}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              data-testid="import-users"
            >
              <Upload className="w-4 h-4 mr-1" />
              {importing ? "Importeren..." : "Importeer uit Excel"}
            </Button>
          </div>
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
                        <div className="flex gap-2">
                        {u.is_admin ? (
                          <Button size="sm" variant="outline" onClick={() => toggleAdmin(u.user_id, false)} data-testid={`revoke-admin-${u.user_id}`}>
                            <ShieldOff className="w-4 h-4 mr-1" />Intrekken
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => toggleAdmin(u.user_id, true)} data-testid={`grant-admin-${u.user_id}`}>
                            <Shield className="w-4 h-4 mr-1" />Maak admin
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => confirmEmail(u.user_id, u.email)} title="E-mail handmatig bevestigen (als de bevestigingsmail niet aankwam)" data-testid={`confirm-email-${u.user_id}`}>
                          <MailCheck className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive" data-testid={`delete-user-${u.user_id}`}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Deelnemer verwijderen?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Dit verwijdert <strong>{u.email}</strong> definitief, inclusief alle inzendingen, voorspellingen, subpoules en chatberichten. Deze actie kan niet ongedaan gemaakt worden.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuleren</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteUser(u.user_id, u.email)}>Definitief verwijderen</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        </div>
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
