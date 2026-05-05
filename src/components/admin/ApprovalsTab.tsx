// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, FileEdit, ShieldCheck, Undo2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type Row = {
  stage_id: string;
  stage_number: number;
  stage_name: string | null;
  stage_date: string | null;
  results_status: "draft" | "pending" | "approved";
  submitted_for_approval_at: string | null;
  approved_at: string | null;
  approved_by_name: string | null;
};

export default function ApprovalsTab({ activeGameId }: { activeGameId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    if (!supabase || !activeGameId) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_pending_approvals", { p_game_id: activeGameId });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((data ?? []) as Row[]);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGameId]);

  async function approve(stageId: string) {
    if (!confirm("Uitslag fiatteren? Punten worden herberekend en zichtbaar.")) return;
    setBusyId(stageId);
    const { error } = await supabase.rpc("approve_stage_results", { p_stage_id: stageId });
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Uitslag gefiatteerd");
    load();
  }

  const pending = rows.filter((r) => r.results_status === "pending");
  const drafts = rows.filter((r) => r.results_status === "draft");
  const approved = rows.filter((r) => r.results_status === "approved");

  function StatusBadge({ s }: { s: Row["results_status"] }) {
    if (s === "approved")
      return <Badge className="bg-green-600 hover:bg-green-600 gap-1"><CheckCircle2 className="w-3 h-3" />Goedgekeurd</Badge>;
    if (s === "pending")
      return <Badge className="bg-orange-500 hover:bg-orange-500 gap-1"><Clock className="w-3 h-3" />In afwachting</Badge>;
    return <Badge variant="secondary" className="gap-1"><FileEdit className="w-3 h-3" />Concept</Badge>;
  }

  return (
    <div className="space-y-6">
      <Card className="border-orange-300">
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="font-display flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />Te fiatteren
              {pending.length > 0 && (
                <Badge className="bg-orange-500 hover:bg-orange-500">{pending.length}</Badge>
              )}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />Herlaad
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Geen uitslagen wachten op goedkeuring.</p>
          ) : (
            pending.map((r) => (
              <div key={r.stage_id} className="flex items-center justify-between gap-3 border rounded-md p-3 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold">Etappe {r.stage_number}</span>
                    {r.stage_name && <span className="text-sm text-muted-foreground">— {r.stage_name}</span>}
                    <StatusBadge s={r.results_status} />
                  </div>
                  {r.submitted_for_approval_at && (
                    <p className="text-xs text-muted-foreground">
                      Ingediend op {new Date(r.submitted_for_approval_at).toLocaleString("nl-NL")}
                    </p>
                  )}
                </div>
                <Button
                  onClick={() => approve(r.stage_id)}
                  disabled={busyId === r.stage_id}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <ShieldCheck className="w-4 h-4 mr-2" />Fiatteren
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-display text-base">Concepten ({drafts.length})</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {drafts.length === 0 ? (
            <p className="text-muted-foreground italic">Geen concepten.</p>
          ) : drafts.map((r) => (
            <div key={r.stage_id} className="flex items-center gap-2">
              <StatusBadge s={r.results_status} />
              <span>Etappe {r.stage_number}</span>
              {r.stage_name && <span className="text-muted-foreground">— {r.stage_name}</span>}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-display text-base">Goedgekeurd ({approved.length})</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {approved.length === 0 ? (
            <p className="text-muted-foreground italic">Nog niets gefiatteerd.</p>
          ) : approved.slice(0, 30).map((r) => (
            <div key={r.stage_id} className="flex items-center gap-2 flex-wrap">
              <StatusBadge s={r.results_status} />
              <span>Etappe {r.stage_number}</span>
              {r.approved_at && (
                <span className="text-xs text-muted-foreground">
                  · {new Date(r.approved_at).toLocaleDateString("nl-NL")}
                  {r.approved_by_name ? ` · ${r.approved_by_name}` : ""}
                </span>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  if (!confirm("Goedkeuring intrekken?")) return;
                  const { error } = await supabase.rpc("revoke_stage_approval", { p_stage_id: r.stage_id });
                  if (error) toast.error(error.message);
                  else { toast.success("Ingetrokken"); load(); }
                }}
              >
                <Undo2 className="w-3 h-3 mr-1" />Intrekken
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
