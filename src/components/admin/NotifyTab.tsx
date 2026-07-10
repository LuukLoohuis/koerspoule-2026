import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Mail, Send, Loader2, Eye, EyeOff, Users, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Game = { id: string; name: string; year: number | null };

// ?v= cache-bust gelijk aan send-announcement; bump bij nieuwe upload.
const IMG_V = "4";
const HEADER_IMG = `https://uqjrzozttkbjrdvzeroc.supabase.co/storage/v1/object/public/mailbanner/koerspoule_header_afbeelding.png?v=${IMG_V}`;
const FOOTER_IMG = `https://uqjrzozttkbjrdvzeroc.supabase.co/storage/v1/object/public/mailbanner/koerspoule_footer_strip.png?v=${IMG_V}`;
const FRAME_EDGE = "#F5D9A7";
const FRAME_GOLD = "#DC9E29";
const FRAME_CREAM = "#F5E9D5"; // = crème onderaan de header-PNG → naadloze overloop

// Alleen het BERICHT — de begroeting "Beste deelnemer," en de afsluiting
// "Veel koersplezier, Het Koerspoule team" zitten al vast in de template.
const DEFAULT_BODY = `Schrijf hier je bericht...`;

export function buildEmailHtml(
  body: string,
  unsubscribeUrl: string,
  opts: { titleColor: string; titleSize: number; includeCta?: boolean; includeSteun?: boolean }
): string {
  // Spiegelt send-announcement/buildHtml() 1-op-1 (preview = verzonden mail).
  // Compact: lege regel = alinea (nette marge), enkele regelovergang = <br>.
  // Markdown-bold: **tekst** → vetgedrukt (handig bij plakken zonder HTML).
  const mdBold = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  const bodyHtml = body
    .trim()
    .split(/\n\s*\n+/)
    .map((p) => `<p style="margin:0 0 11px 0;">${mdBold(p.replace(/\r\n|\r|\n/g, "<br>"))}</p>`)
    .join("");
  return `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Koerspoule Communiqué</title></head>
<body style="margin:0;padding:0;background-color:#e9e3d6;">
  <center style="width:100%;background-color:#e9e3d6;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;background-color:#e9e3d6;margin:0;padding:0;">
      <tr><td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:600px;border-collapse:collapse;margin:0 auto;background-color:${FRAME_EDGE};">
          <tr><td style="padding:0;line-height:0;font-size:0;background-color:${FRAME_EDGE};">
            <img src="${HEADER_IMG}" alt="Koerspoule header" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;margin:0;" />
          </td></tr>
          <tr><td align="center" style="padding:0;background-color:${FRAME_EDGE};">
            <table role="presentation" width="574" cellspacing="0" cellpadding="0" border="0" style="width:574px;max-width:574px;border-collapse:collapse;background-color:${FRAME_CREAM};border-left:2px solid ${FRAME_GOLD};border-right:2px solid ${FRAME_GOLD};">
              <tr><td style="padding:16px 28px 20px 28px;font-family:Georgia,'Times New Roman',serif;color:#2f2a24;">
                <div style="margin:0 0 10px 0;font-size:28px;line-height:34px;font-weight:bold;color:#211d19;">
                  Beste deelnemer,
                </div>
                <div style="margin:0 0 10px 0;font-size:17px;line-height:24px;color:#3d362e;">
                  ${bodyHtml}
                </div>
                ${opts.includeCta !== false ? `<div style="text-align:center;margin:20px 0 22px 0;">
                  <a href="https://koerspoule.nl" target="_blank" style="display:inline-block;padding:13px 26px;background-color:#d4a62b;color:#1d1916;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;border-radius:6px;">
                    Ga naar Koerspoule
                  </a>
                </div>` : ""}${opts.includeSteun ? `
                <div style="text-align:center;margin:0 0 22px 0;">
                  <a href="https://ko-fi.com/koerspoule" target="_blank" style="display:inline-block;padding:13px 26px;background-color:#1A1612;color:#F5EDE0;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;border-radius:6px;border:1px solid #E1A33A;">
                    <span style="color:#E1A33A;">&#9749;</span>&nbsp; Steun Koerspoule
                  </a>
                </div>` : ""}
                <div style="margin:0;font-size:18px;line-height:30px;color:#3d362e;">
                  Veel koersplezier,<br>
                  <strong>Het Koerspoule team</strong>
                </div>
                <div style="margin-top:20px;padding-top:16px;border-top:1px solid #d8c89d;text-align:center;">
                  <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;letter-spacing:2px;text-transform:uppercase;color:#8a6d2b;margin-bottom:10px;">
                    Volg Koerspoule
                  </div>
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
                    <tr>
                      <td align="center" bgcolor="#1A1612" style="border-radius:10px;border:1px solid #E1A33A;">
                        <a href="https://www.instagram.com/koerspoule" target="_blank" style="display:inline-block;padding:12px 24px;font-family:Georgia,'Times New Roman',serif;font-size:15px;font-weight:bold;color:#F5EDE0;text-decoration:none;border-radius:10px;">
                          <span style="color:#E1A33A;font-size:17px;">&#9673;</span>&nbsp;&nbsp;@koerspoule&nbsp;op Instagram
                        </a>
                      </td>
                    </tr>
                  </table>
                  <div style="margin-top:10px;font-size:15px;line-height:24px;color:#655847;">
                    Blijf op de hoogte van updates, standen en koerssfeer.
                  </div>
                  <div style="margin-top:14px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:18px;color:#9a8f7c;">
                    <a href="https://koerspoule.nl" style="color:#9a8f7c;text-decoration:none;">koerspoule.nl</a>
                    &nbsp;·&nbsp;
                    <a href="${unsubscribeUrl}" style="color:#9a8f7c;text-decoration:underline;">uitschrijven</a>
                  </div>
                </div>
              </td></tr>
            </table>
          </td></tr>
          <tr><td style="padding:0;line-height:0;font-size:0;background-color:${FRAME_EDGE};">
            <img src="${FOOTER_IMG}" alt="Koerspoule footer" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;margin:0;" />
          </td></tr>
        </table>
      </td></tr>
    </table>
  </center>
</body></html>`;
}

function buildPreviewHtml(body: string, titleColor: string, titleSize: number, includeCta: boolean, includeSteun: boolean) {
  return buildEmailHtml(body, "#", { titleColor, titleSize, includeCta, includeSteun });
}

export default function NotifyTab() {
  const [games, setGames] = useState<Game[]>([]);
  const [gameId, setGameId] = useState<string>("all");
  const [subject, setSubject] = useState("Bericht van Koerspoule");
  const [body, setBody] = useState(DEFAULT_BODY);
  const [titleColor, setTitleColor] = useState("#c8102e");
  const [titleSize, setTitleSize] = useState(24);
  const [includeCta, setIncludeCta] = useState(true);
  const [includeSteun, setIncludeSteun] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<{ recipients: number; suppressed: number } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Voortgang van de lopende campagne (mail-wachtrij): gepolld uit mail_queue.
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ total: number; sent: number; failed: number; pending: number } | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.from("games").select("id, name, year").order("year", { ascending: false }).then(({ data }) => {
      setGames((data ?? []) as Game[]);
    });
    // Loopt er nog een campagne (bv. na pagina-herlaad)? Pak 'm op voor de voortgang.
    supabase
      .from("mail_campaigns")
      .select("id")
      .eq("status", "sending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setCampaignId((data as { id: string }).id);
      });
  }, []);

  // Voortgang pollen zolang er een campagne loopt (elke 3s, stopt zodra klaar).
  useEffect(() => {
    if (!supabase || !campaignId) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = async () => {
      if (!supabase || stop) return;
      const [tot, sent, failed, pending] = await Promise.all([
        supabase.from("mail_queue").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId),
        supabase.from("mail_queue").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("status", "sent"),
        supabase.from("mail_queue").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("status", "failed"),
        supabase.from("mail_queue").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).in("status", ["pending", "processing"]),
      ]);
      if (stop) return;
      const next = {
        total: tot.count ?? 0,
        sent: sent.count ?? 0,
        failed: failed.count ?? 0,
        pending: pending.count ?? 0,
      };
      setProgress(next);
      // Nog werk over (of nog niets ingeladen)? → opnieuw pollen.
      if (next.total === 0 || next.pending > 0) timer = setTimeout(tick, 3000);
    };
    tick();
    return () => { stop = true; if (timer) clearTimeout(timer); };
  }, [campaignId]);

  // Hervat: trapt de verwerker opnieuw aan (bv. als de keten ooit stokte).
  async function resumeQueue() {
    if (!supabase) return;
    const { error } = await supabase.functions.invoke("process-mail-queue", { body: {} });
    if (error) toast.error(`Hervatten mislukt: ${error.message}`);
    else toast.success("Verwerker gestart — voortgang loopt hieronder bij");
  }

  useEffect(() => {
    if (showPreview && iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(buildPreviewHtml(body, titleColor, titleSize, includeCta, includeSteun));
        doc.close();
      }
    }
  }, [showPreview, body, titleColor, titleSize, includeCta, includeSteun]);

  async function runDryRun() {
    if (!supabase) return;
    setSending(true);
    const { data, error } = await supabase.functions.invoke("send-announcement", {
      body: { subject, body, includeCta, includeSteun, gameId: gameId === "all" ? undefined : gameId, dryRun: true },
    });
    setSending(false);
    if (error) { toast.error(`Fout: ${error.message}`); return; }
    const r = data as { recipients_count: number; suppressed_count: number };
    setDryRunResult({ recipients: r.recipients_count ?? 0, suppressed: r.suppressed_count ?? 0 });
    setConfirmOpen(true);
  }

  async function sendTest() {
    if (!supabase || !testEmail.trim()) return;
    setSending(true);
    const { error } = await supabase.functions.invoke("send-announcement", {
      body: { subject, body, titleColor, titleSize, includeCta, includeSteun, testEmail: testEmail.trim() },
    });
    setSending(false);
    if (error) toast.error(`Testmail mislukt: ${error.message}`);
    else toast.success(`Testmail verstuurd naar ${testEmail}`);
  }

  async function sendForReal() {
    if (!supabase) return;
    setSending(true);
    const { data, error } = await supabase.functions.invoke("send-announcement", {
      body: { subject, body, titleColor, titleSize, includeCta, includeSteun, gameId: gameId === "all" ? undefined : gameId },
    });
    setSending(false);
    setConfirmOpen(false);
    if (error) { toast.error(`Verzenden mislukt: ${error.message}`); return; }
    const r = data as { enqueued: number; campaign_id: string };
    setProgress(null);
    setCampaignId(r?.campaign_id ?? null);
    toast.success(`${r?.enqueued ?? 0} mails klaargezet — verzending loopt op de achtergrond`);
  }

  const selectedGameName = gameId === "all"
    ? "Alle deelnemers"
    : games.find((g) => g.id === gameId)?.name ?? gameId;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" /> Bericht aan deelnemers
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Schrijf een bericht en verstuur het naar alle deelnemers van een koers. Deelnemers kunnen zichzelf uitschrijven via de link in de mail.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Game selector */}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="w-3 h-3" /> Ontvangers
            </Label>
            <Select value={gameId} onValueChange={setGameId}>
              <SelectTrigger>
                <SelectValue placeholder="Kies een koers…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle geregistreerde gebruikers</SelectItem>
                {games.map((g) => (
                  <SelectItem key={g.id} value={g.id}>Deelnemers — {g.name}{g.year ? ` (${g.year})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Onderwerp</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Onderwerp van de mail…" />
          </div>

          {/* Header style controls */}
          <div className="border rounded-lg p-4 bg-muted/20 space-y-4">
            <h3 className="text-sm font-semibold">Header-stijl (KOERSPOULE tekst)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Kleur</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={titleColor}
                    onChange={(e) => setTitleColor(e.target.value)}
                    className="h-9 w-14 rounded border cursor-pointer p-0.5"
                  />
                  <Input
                    value={titleColor}
                    onChange={(e) => setTitleColor(e.target.value)}
                    className="font-mono text-xs h-9"
                    maxLength={9}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Lettergrootte — <span className="font-mono font-bold">{titleSize}px</span>
                </Label>
                <Slider
                  min={14}
                  max={48}
                  step={1}
                  value={[titleSize]}
                  onValueChange={([v]) => setTitleSize(v)}
                  className="mt-3"
                />
              </div>
            </div>
            {/* Live mini-preview of header */}
            <div className="border rounded bg-white p-3 text-center">
              <img src="/koerspoule-logo-2026.png" alt="Koerspoule" width={150} className="mx-auto mb-1 rounded" />
              <div style={{ fontFamily: "'Brush Script MT','Segoe Script','Snell Roundhand',cursive", fontStyle: "italic", fontSize: 24, color: "#C0851A", lineHeight: 1.1, textAlign: "center" }}>
                Uit liefde voor de koers
              </div>
            </div>

            {/* Knoppen per mailing aan/uit */}
            <div className="flex items-center justify-between gap-3 rounded border p-3">
              <div className="min-w-0">
                <Label htmlFor="include-cta" className="text-sm font-medium">Ga naar Koerspoule-knop</Label>
                <p className="text-xs text-muted-foreground">Knop naar koerspoule.nl.</p>
              </div>
              <Switch id="include-cta" checked={includeCta} onCheckedChange={setIncludeCta} />
            </div>
            <div className="flex items-center justify-between gap-3 rounded border p-3">
              <div className="min-w-0">
                <Label htmlFor="include-steun" className="text-sm font-medium">Steun Koerspoule-knop</Label>
                <p className="text-xs text-muted-foreground">Ko-fi-knop voor donaties.</p>
              </div>
              <Switch id="include-steun" checked={includeSteun} onCheckedChange={setIncludeSteun} />
            </div>
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Inhoud (HTML)</Label>
              <Button variant="ghost" size="sm" onClick={() => setShowPreview((v) => !v)} className="text-xs h-7">
                {showPreview ? <><EyeOff className="w-3 h-3 mr-1" />Bewerk</> : <><Eye className="w-3 h-3 mr-1" />Preview</>}
              </Button>
            </div>
            {!showPreview ? (
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={12}
                className="font-mono text-xs"
                placeholder="<p>Schrijf hier je bericht in HTML...</p>"
              />
            ) : (
              <div className="border rounded-md overflow-hidden">
                <iframe
                  ref={iframeRef}
                  title="E-mail preview"
                  className="w-full"
                  style={{ height: 480, border: "none" }}
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Gebruik HTML-opmaak. Het logo, de header en uitschrijflink worden automatisch toegevoegd.
            </p>
          </div>

          {/* Test email */}
          <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
            <h3 className="text-sm font-semibold">Testmail verzenden</h3>
            <div className="flex gap-2">
              <Input
                placeholder="jouw@email.nl"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="flex-1"
              />
              <Button variant="outline" onClick={sendTest} disabled={sending || !testEmail.trim()}>
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span className="ml-2">Test</span>
              </Button>
            </div>
          </div>

          {/* Send button */}
          <Button
            className="w-full bg-primary hover:bg-primary/90"
            onClick={runDryRun}
            disabled={sending || !subject.trim() || !body.trim()}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Versturen naar {selectedGameName}…
          </Button>

          {/* Voortgang van de lopende/laatste campagne (mail-wachtrij) */}
          {campaignId && progress && progress.total > 0 && (
            <div className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {progress.pending > 0 ? "Verzending loopt…" : "Verzending afgerond"}
                </span>
                <span className="font-mono tabular-nums text-muted-foreground">
                  {progress.sent} / {progress.total} verzonden
                  {progress.failed > 0 && <span className="text-destructive"> · {progress.failed} mislukt</span>}
                </span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.round((progress.sent / Math.max(1, progress.total)) * 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Loopt op de achtergrond door — je mag deze pagina sluiten. Per ontvanger wordt afgevinkt: nooit dubbel.
                </p>
                {progress.pending > 0 && (
                  <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={resumeQueue}>
                    Hervat verwerking
                  </Button>
                )}
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      {/* Confirm dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bericht versturen?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Je staat op het punt een mail te sturen naar{" "}
                  <strong>{dryRunResult?.recipients ?? 0} deelnemers</strong> van{" "}
                  <strong>{selectedGameName}</strong>.
                </p>
                {(dryRunResult?.suppressed ?? 0) > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded p-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{dryRunResult!.suppressed} adres(sen) overgeslagen (uitgeschreven).</span>
                  </div>
                )}
                <div className="bg-muted/40 rounded p-2 text-sm">
                  <span className="text-muted-foreground">Onderwerp: </span>
                  <em>"{subject}"</em>
                </div>
                <p className="text-sm font-medium text-destructive">Dit kan niet ongedaan worden gemaakt.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={sendForReal} disabled={sending}>
              {sending ? "Verzenden…" : `Ja, verzend naar ${dryRunResult?.recipients ?? 0} deelnemers`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Info */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="shrink-0 mt-0.5">Info</Badge>
            <p>
              Mails worden verstuurd via <code>koerspoule-mail.luuk-loohuis.workers.dev</code>.
              Elke mail bevat een persoonlijke uitschrijflink. Uitgeschreven deelnemers ontvangen geen toekomstige mailings meer.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
