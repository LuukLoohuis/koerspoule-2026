// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Rocket } from "lucide-react";
import { toast } from "sonner";
import { isPreviewStatus } from "@/lib/gameStatus";

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
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!supabase || !activeGameId) return;
    (async () => {
      const { data } = await supabase.from("games").select("admin_testmodus").eq("id", activeGameId).maybeSingle();
      setTestmodus(Boolean(data?.admin_testmodus));
      setLoaded(true);
    })();
  }, [activeGameId]);

  async function toggleTestmodus(next: boolean) {
    if (!supabase || !activeGameId) return;
    const { error } = await supabase.from("games").update({ admin_testmodus: next }).eq("id", activeGameId);
    if (error) { toast.error(`Opslaan mislukt: ${error.message}`); return; }
    setTestmodus(next);
    toast.success(next ? "Testmodus AAN — je ziet als admin alles ongeacht de status" : "Testmodus uit — je ziet de game zoals de status hoort");
  }

  const preview = isPreviewStatus(gameStatus);
  const statusLabel = STATUS_LABEL[String(gameStatus ?? "")] ?? String(gameStatus ?? "onbekend");
  const deelnemerZiet = preview ? "de preview-schil (nog geen echte inhoud)" : "de volledige live-inhoud";
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
