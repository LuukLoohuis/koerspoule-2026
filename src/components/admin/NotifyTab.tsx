import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Sub = { id: string; email: string; created_at: string; unsubscribed_at: string | null; source: string | null };

export default function NotifyTab() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [testEmail, setTestEmail] = useState("");
  const [subject, setSubject] = useState("🌹 De Giro 2026 Koerspoule is open — schrijf je in!");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);

  async function load() {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_notify_subscribers");
    if (error) toast.error(`Laden mislukt: ${error.message}`);
    else setSubs((data ?? []) as Sub[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const active = subs.filter((s) => !s.unsubscribed_at);

  async function sendTest() {
    if (!supabase || !testEmail) return;
    setSending(true);
    const { data, error } = await supabase.functions.invoke("send-announcement", {
      body: { subject, testEmail },
    });
    setSending(false);
    if (error) toast.error(`Test mislukt: ${error.message}`);
    else toast.success(`Testmail in de wachtrij naar ${testEmail}`);
    console.log("test result", data);
  }

  async function openConfirm() {
    if (!supabase) return;
    const { data, error } = await supabase.functions.invoke("send-announcement", {
      body: { subject, dryRun: true },
    });
    if (error) { toast.error(error.message); return; }
    setRecipientCount((data as { recipients_count?: number })?.recipients_count ?? 0);
    setConfirmOpen(true);
  }

  async function sendForReal() {
    if (!supabase) return;
    setSending(true);
    const { data, error } = await supabase.functions.invoke("send-announcement", {
      body: { subject },
    });
    setSending(false);
    setConfirmOpen(false);
    if (error) toast.error(`Verzenden mislukt: ${error.message}`);
    else {
      const r = data as { enqueued?: number; total?: number };
      toast.success(`${r?.enqueued ?? 0}/${r?.total ?? 0} mails in de wachtrij`);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Mail className="w-5 h-5" /> Notify-lijst & aankondigingen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <div className="border rounded-lg p-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Actief</div>
            <div className="text-2xl font-bold">{active.length}</div>
          </div>
          <div className="border rounded-lg p-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Uitgeschreven</div>
            <div className="text-2xl font-bold text-muted-foreground">{subs.length - active.length}</div>
          </div>
        </div>

        <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
          <h3 className="font-semibold">Giro 2026 aankondiging verzenden</h3>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Onderwerp</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Test-mail naar</label>
              <Input placeholder="jouw@email.com" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
            </div>
            <Button variant="outline" onClick={sendTest} disabled={sending || !testEmail}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Test
            </Button>
          </div>
          <Button onClick={openConfirm} disabled={sending || active.length === 0} className="w-full">
            <Send className="w-4 h-4 mr-2" /> Verzenden naar {active.length} abonnees…
          </Button>
          <p className="text-xs text-muted-foreground italic">
            Mails worden via <code>notify.koerspoule.nl</code> verzonden zodra DNS is geverifieerd.
          </p>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Abonnees</h3>
          {loading ? <p className="text-sm text-muted-foreground">Laden…</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>E-mail</TableHead><TableHead>Aangemeld</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {subs.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-sm">{s.email}</TableCell>
                    <TableCell className="text-sm">{new Date(s.created_at).toLocaleDateString("nl-NL")}</TableCell>
                    <TableCell>{s.unsubscribed_at ? <Badge variant="secondary">Uitgeschreven</Badge> : <Badge>Actief</Badge>}</TableCell>
                  </TableRow>
                ))}
                {subs.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground italic py-6">Nog geen abonnees</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Aankondiging verzenden?</AlertDialogTitle>
              <AlertDialogDescription>
                Je staat op het punt een mail te versturen naar <strong>{recipientCount}</strong> abonnees met onderwerp:
                <br/><br/>
                <em>"{subject}"</em>
                <br/><br/>
                Dit kan niet ongedaan worden gemaakt.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuleren</AlertDialogCancel>
              <AlertDialogAction onClick={sendForReal} disabled={sending}>
                {sending ? "Verzenden…" : `Ja, verzend naar ${recipientCount}`}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
