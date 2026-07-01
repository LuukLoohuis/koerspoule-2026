import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarClock } from "lucide-react";
import { toast } from "sonner";

type Stage = { id: string; stage_number: number; name: string | null; date: string | null };
type Banner = { id: string; soort: string; titel: string };
type Planning = { stage_id: string; prize_id: string };

const NONE = "__none__";

/**
 * Vooraf per etappe een dagprijs-banner inplannen (Sponsoren-tab). Eén banner per
 * etappe (unique stage_id). L'Équipe toont de ingeplande banner op de etappedag;
 * is er niets ingepland, dan de terugval (is_dagprijs_vandaag) — geregeld in de
 * RPC get_dagprijs_banner. Hier alleen het beheer/overzicht.
 */
export default function DagprijsPlanning({ activeGameId }: { activeGameId: string }) {
  const [stages, setStages] = useState<Stage[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [planByStage, setPlanByStage] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!supabase || !activeGameId) return;
    setLoading(true);
    try {
      const [st, bn, pl] = await Promise.all([
        supabase.from("stages").select("id, stage_number, name, date").eq("game_id", activeGameId).order("stage_number"),
        supabase.from("prizes").select("id, soort, titel").eq("game_id", activeGameId).in("soort", ["dagprijs", "sponsor"]).order("sort_order").order("created_at"),
        supabase.from("dagprijs_banner_planning").select("stage_id, prize_id").eq("game_id", activeGameId),
      ]);
      if (st.error) throw st.error;
      setStages((st.data ?? []) as Stage[]);
      setBanners((bn.data ?? []) as Banner[]);
      const map: Record<string, string> = {};
      for (const p of (pl.data ?? []) as Planning[]) map[p.stage_id] = p.prize_id;
      setPlanByStage(map);
    } catch (e) {
      toast.error(`Planning laden mislukt: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [activeGameId]);

  useEffect(() => { load(); }, [load]);

  async function setPlanning(stageId: string, prizeId: string) {
    if (!supabase) return;
    if (prizeId === NONE) {
      const { error } = await supabase.from("dagprijs_banner_planning").delete().eq("stage_id", stageId);
      if (error) { toast.error(`Opslaan mislukt: ${error.message}`); return; }
      setPlanByStage((m) => { const n = { ...m }; delete n[stageId]; return n; });
      return;
    }
    const { error } = await supabase
      .from("dagprijs_banner_planning")
      .upsert({ game_id: activeGameId, stage_id: stageId, prize_id: prizeId } as never, { onConflict: "stage_id" });
    if (error) { toast.error(`Opslaan mislukt: ${error.message}`); return; }
    setPlanByStage((m) => ({ ...m, [stageId]: prizeId }));
  }

  const bannerLabel = (b: Banner) => (b.titel?.trim() || (b.soort === "sponsor" ? "Sponsor/banner" : "Dagprijs"));
  const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("nl-NL", { weekday: "short", day: "2-digit", month: "short" }) : "—");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base flex items-center gap-2">
          <CalendarClock className="w-4 h-4" /> Dagprijs-banner per etappe inplannen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Kies per etappe welke banner die dag in L'Équipe verschijnt. Niets ingepland (of rustdag) → terugval op de banner met "Banner tonen" aan. Eén banner per etappe.
        </p>
        {banners.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Maak eerst een dagprijs/sponsor-banner (Prijzen-tab) om te kunnen inplannen.</p>
        ) : stages.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">{loading ? "Laden…" : "Geen etappes in deze game."}</p>
        ) : (
          <div className="divide-y border rounded-md">
            {stages.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-3 py-2">
                <div className="w-24 shrink-0">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Etappe {s.stage_number}</span>
                  <span className="block text-[11px] text-muted-foreground">{fmtDate(s.date)}</span>
                </div>
                <span className="flex-1 min-w-0 text-sm truncate">{s.name ?? "—"}</span>
                <div className="w-52 shrink-0">
                  <Label className="sr-only">Banner</Label>
                  <Select value={planByStage[s.id] ?? NONE} onValueChange={(v) => setPlanning(s.id, v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="(geen)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE} className="text-xs">(geen — terugval)</SelectItem>
                      {banners.map((b) => (
                        <SelectItem key={b.id} value={b.id} className="text-xs">{bannerLabel(b)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
