// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Rocket, Coffee, Inbox, Users } from "lucide-react";
import { toast } from "sonner";
import { resultsHiddenForUsers } from "@/lib/gameStatus";
import { fetchAllRows } from "@/lib/fetchAll";

// Drafts met minstens zoveel renner-keuzes tellen mee als "serieus" en kunnen
// in bulk ingediend worden (RPC submit_drafts_met_keuzes gebruikt dezelfde grens).
const MIN_PICKS = 11;

const STATUS_LABEL: Record<string, string> = {
  open: "Sneak preview",
  draft: "Sneak preview",
  concept: "Sneak preview",
  open_inschrijving: "Inschrijving open",
  live: "Live",
  locked: "Live (op slot)",
  finished: "Afgerond",
  closed: "Afgerond",
};

export default function GoLiveTab({ activeGameId, gameStatus }: { activeGameId: string; gameStatus?: string | null }) {
  const [testmodus, setTestmodus] = useState(false);
  const [banner, setBanner] = useState(false);
  const [teller, setTeller] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // Aantal concepten met >= MIN_PICKS keuzes (kandidaten voor bulk-indienen).
  const [draftKandidaten, setDraftKandidaten] = useState<number | null>(null);
  const [submittingDrafts, setSubmittingDrafts] = useState(false);

  async function loadDraftKandidaten() {
    if (!supabase || !activeGameId) return;
    try {
      const drafts = await fetchAllRows((from, to) =>
        supabase.from("entries").select("id").eq("game_id", activeGameId).eq("status", "draft").range(from, to),
      );
      const ids = drafts.map((d) => d.id);
      if (ids.length === 0) { setDraftKandidaten(0); return; }
      const picks = await fetchAllRows((from, to) =>
        supabase.from("entry_picks").select("entry_id").in("entry_id", ids).range(from, to),
      );
      const perEntry = new Map();
      for (const p of picks) perEntry.set(p.entry_id, (perEntry.get(p.entry_id) ?? 0) + 1);
      setDraftKandidaten(ids.filter((id) => (perEntry.get(id) ?? 0) >= MIN_PICKS).length);
    } catch {
      setDraftKandidaten(null);
    }
  }

  useEffect(() => {
    if (!supabase || !activeGameId) return;
    (async () => {
      const { data } = await supabase.from("games").select("admin_testmodus, support_banner_visible, support_banner_updated_at, deelnemers_teller_visible").eq("id", activeGameId).maybeSingle();
      setTestmodus(Boolean(data?.admin_testmodus));
      setBanner(Boolean(data?.support_banner_visible));
      setTeller(Boolean(data?.deelnemers_teller_visible));
      setLoaded(true);
    })();
    loadDraftKandidaten();
  }, [activeGameId]);

  async function submitDrafts() {
    if (!supabase || !activeGameId || !draftKandidaten) return;
    if (!confirm(`${draftKandidaten} concept(en) met ${MIN_PICKS}+ keuzes definitief indienen? Ze tellen daarna mee in alle klassementen.`)) return;
    setSubmittingDrafts(true);
    try {
      const { data, error } = await supabase.rpc("submit_drafts_met_keuzes", {
        p_game_id: activeGameId,
        p_min_picks: MIN_PICKS,
      });
      if (error) throw error;
      toast.success(`${data ?? 0} concept(en) ingediend — ze tellen nu mee`);
      await loadDraftKandidaten();
    } catch (e) {
      toast.error(`Indienen mislukt: ${e.message ?? e}`);
    } finally {
      setSubmittingDrafts(false);
    }
  }

  async function toggleTestmodus(next: boolean) {
    if (!supabase || !activeGameId) return;
    const { error } = await supabase.from("games").update({ admin_testmodus: next }).eq("id", activeGameId);
    if (error) { toast.error(`Opslaan mislukt: ${error.message}`); return; }
    setTestmodus(next);
    toast.success(next ? "Testmodus AAN — je ziet als admin alles ongeacht de status" : "Testmodus uit — je ziet de game zoals de status hoort");
  }

  async function toggleBanner(next: boolean) {
    if (!supabase || !activeGameId) return;
    const { error } = await supabase.from("games")
      .update({ support_banner_visible: next, support_banner_updated_at: new Date().toISOString() })
      .eq("id", activeGameId);
    if (error) { toast.error(`Opslaan mislukt: ${error.message}`); return; }
    setBanner(next);
    toast.success(next ? "Steun-banner AAN voor deze game" : "Steun-banner uit");
  }

  async function toggleTeller(next: boolean) {
    if (!supabase || !activeGameId) return;
    const { error } = await supabase.from("games").update({ deelnemers_teller_visible: next }).eq("id", activeGameId);
    if (error) { toast.error(`Opslaan mislukt: ${error.message}`); return; }
    setTeller(next);
    toast.success(next ? "Deelnemersteller AAN op de homepage voor deze game" : "Deelnemersteller uit");
  }

  const preview = resultsHiddenForUsers(gameStatus);
  const isInschrijving = String(gameStatus ?? "") === "open_inschrijving";
  const statusLabel = STATUS_LABEL[String(gameStatus ?? "")] ?? String(gameStatus ?? "onbekend");
  const deelnemerZiet = isInschrijving
    ? "inschrijven staat open; uitslagen, klassementen en commentaar zijn nog verborgen tot Live"
    : preview
      ? "de preview-schil (nog geen echte inhoud)"
      : "de volledige live-inhoud";
  const adminZiet = testmodus ? "alles: de volledige live-weergave, ongeacht de status" : "de game zoals de status hoort, net als een deelnemer";

  return (
    <div className="space-y-6">
      <Card className={testmodus ? "border-[hsl(var(--vintage-gold))]" : ""}>
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="font-display font-bold flex items-center gap-2">
              <Eye className="w-4 h-4" /> Testmodus {testmodus ? "AAN" : "uit"}
            </p>
            <p className="text-xs text-muted-foreground">
              Als admin zie je dan <strong>alles</strong> (L'Équipe, uitslagen, subpoule, Hors Catégorie) ongeacht de game-status.
              Deelnemers merken hier niets van: die zien de game volgens de status.
            </p>
          </div>
          <Button size="sm" variant={testmodus ? "default" : "outline"} className="shrink-0" disabled={!activeGameId || !loaded} onClick={() => toggleTestmodus(!testmodus)}>
            {testmodus ? "Zet uit" : "Zet aan"}
          </Button>
        </CardContent>
      </Card>

      <Card className={banner ? "border-[hsl(var(--vintage-gold))]" : ""}>
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="font-display font-bold flex items-center gap-2">
              <Coffee className="w-4 h-4" /> Steun Koerspoule-banner {banner ? "AAN" : "uit"}
            </p>
            <p className="text-xs text-muted-foreground">
              Toont de Steun Koerspoule-banner in Mijn Peloton voor alle deelnemers van deze game. Handmatig, gaat nooit vanzelf aan.
            </p>
          </div>
          <Button size="sm" variant={banner ? "default" : "outline"} className="shrink-0" disabled={!activeGameId || !loaded} onClick={() => toggleBanner(!banner)}>
            {banner ? "Zet uit" : "Zet aan"}
          </Button>
        </CardContent>
      </Card>

      <Card className={teller ? "border-[hsl(var(--vintage-gold))]" : ""}>
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="font-display font-bold flex items-center gap-2">
              <Users className="w-4 h-4" /> Deelnemersteller (homepage) {teller ? "AAN" : "uit"}
            </p>
            <p className="text-xs text-muted-foreground">
              Toont "Al N koersliefhebbers doen mee" op de homepage. Telt alléén de deelnemers van deze game (ingediend of concept-met-keuze) — begint elke game opnieuw bij nul. Handmatig, gaat nooit vanzelf aan.
            </p>
          </div>
          <Button size="sm" variant={teller ? "default" : "outline"} className="shrink-0" disabled={!activeGameId || !loaded} onClick={() => toggleTeller(!teller)}>
            {teller ? "Zet uit" : "Zet aan"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="font-display font-bold flex items-center gap-2">
              <Inbox className="w-4 h-4" /> Concepten met {MIN_PICKS}+ keuzes
              <Badge variant="secondary" className="tabular-nums">{draftKandidaten ?? "–"}</Badge>
            </p>
            <p className="text-xs text-muted-foreground">
              Niet-ingediende ploegen tellen <strong>niet</strong> mee in de klassementen. Dien hier vóór de start alle
              serieuze concepten (≥ {MIN_PICKS} renner-keuzes) in bulk in, zodat die spelers toch meedoen.
            </p>
          </div>
          <Button
            size="sm"
            className="shrink-0"
            disabled={!activeGameId || submittingDrafts || !draftKandidaten}
            onClick={submitDrafts}
          >
            {submittingDrafts ? "Bezig…" : `Dien ${draftKandidaten ?? 0} in`}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Rocket className="w-5 h-5" /> Go-live status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-muted-foreground">Game-status:</span>
            <Badge variant="secondary">{statusLabel}</Badge>
            <Badge variant={testmodus ? "default" : "outline"}>Testmodus {testmodus ? "AAN" : "uit"}</Badge>
          </div>
          <p><strong>Deelnemer ziet nu:</strong> {deelnemerZiet}.</p>
          <p><strong>Jij als admin ziet nu:</strong> {adminZiet}.</p>
          {preview && testmodus && (
            <p className="text-xs text-muted-foreground">
              Dit is de rehearsal-stand: jij controleert de volledige game terwijl deelnemers alleen de preview zien.
              Fiatteer een etappe om de live-weergave te testen, en trek in om alles weer op te schonen.
            </p>
          )}
          {!preview && (
            <p className="text-xs text-muted-foreground">
              Let op: bij deze status zien deelnemers live-inhoud. Een gefiatteerde etappe is dan direct voor iedereen zichtbaar.
              Voor narekenen zonder publiceren: gebruik in Fiatteren de puntenberekening op een nog niet gefiatteerde etappe.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
