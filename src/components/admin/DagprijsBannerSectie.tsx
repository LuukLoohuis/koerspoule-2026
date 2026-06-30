import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Megaphone, Upload, Trash2, CalendarDays } from "lucide-react";
import { toast } from "sonner";

type Row = {
  id: string;
  soort: string;
  titel: string;
  sponsor_naam: string | null;
  sponsor_logo_url: string | null;
  banner_kicker: string | null;
  banner_sponsor_label: string | null;
  banner_waarde: string | null;
  is_dagprijs_vandaag: boolean;
};

const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Beheer van de L'Équipe-dagprijs-banner (verhuisd uit het Prijzen-tab). Toont de
 * dagprijs/sponsor-prijzen van de actieve game met de banner-velden + de toggle
 * "Banner tonen" (is_dagprijs_vandaag, max. één per game). De banner zelf blijft
 * inhoudelijk de dagprijs; alleen het beheer staat hier.
 */
export default function DagprijsBannerSectie({ activeGameId }: { activeGameId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const logoRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    if (!supabase || !activeGameId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("prizes")
        .select("id, soort, titel, sponsor_naam, sponsor_logo_url, banner_kicker, banner_sponsor_label, banner_waarde, is_dagprijs_vandaag")
        .eq("game_id", activeGameId)
        .in("soort", ["dagprijs", "sponsor"])
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      setRows((data ?? []) as Row[]);
    } catch (e) {
      toast.error(`Laden mislukt: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [activeGameId]);

  useEffect(() => { load(); }, [load]);

  async function saveField(id: string, patch: Partial<Row>) {
    if (!supabase) return;
    const { error } = await supabase.from("prizes").update(patch as never).eq("id", id);
    if (error) { toast.error(`Opslaan mislukt: ${error.message}`); return; }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  // Max één banner per game: bij aanzetten eerst alle andere uit.
  async function toggleBanner(id: string, next: boolean) {
    if (!supabase) return;
    if (next) {
      const { error: clearErr } = await supabase.from("prizes").update({ is_dagprijs_vandaag: false } as never).eq("game_id", activeGameId);
      if (clearErr) { toast.error(`Opslaan mislukt: ${clearErr.message}`); return; }
    }
    const { error } = await supabase.from("prizes").update({ is_dagprijs_vandaag: next } as never).eq("id", id);
    if (error) { toast.error(`Opslaan mislukt: ${error.message}`); return; }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, is_dagprijs_vandaag: next } : next ? { ...r, is_dagprijs_vandaag: false } : r)));
    toast.success(next ? "Banner zichtbaar in L'Équipe" : "Banner uit");
  }

  async function uploadLogo(id: string, file: File | undefined | null) {
    if (!supabase || !file) return;
    if (!ALLOWED.includes(file.type)) { toast.error("Alleen PNG, JPG, WEBP of SVG."); return; }
    if (file.size > MAX_BYTES) { toast.error("Bestand te groot (max 5 MB)."); return; }
    setBusyId(id);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${activeGameId}/${id}-sponsor_logo_url.${ext}`;
      const { error: upErr } = await supabase.storage.from("prize-assets").upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("prize-assets").getPublicUrl(path);
      await saveField(id, { sponsor_logo_url: `${pub.publicUrl}?v=${Date.now()}` });
      toast.success("Geüpload");
    } catch (e) {
      toast.error(`Upload mislukt: ${(e as Error).message}`);
    } finally {
      setBusyId(null);
    }
  }

  async function removeLogo(id: string) {
    if (!supabase || !confirm("Logo verwijderen?")) return;
    setBusyId(id);
    try {
      const url = rows.find((r) => r.id === id)?.sponsor_logo_url;
      const m = url?.match(/prize-assets\/(.+?)(\?|$)/);
      if (m?.[1]) await supabase.storage.from("prize-assets").remove([decodeURIComponent(m[1])]);
      await saveField(id, { sponsor_logo_url: null });
      toast.success("Verwijderd");
    } catch (e) {
      toast.error(`Verwijderen mislukt: ${(e as Error).message}`);
    } finally {
      setBusyId(null);
    }
  }

  if (!activeGameId) return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="font-display text-base flex items-center gap-2"><Megaphone className="w-4 h-4" /> L'Équipe-dagprijs-banner</CardTitle></CardHeader>
      <CardContent><p className="text-sm text-muted-foreground italic">Kies eerst een actieve game (boven in het admin-dashboard).</p></CardContent>
    </Card>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base flex items-center gap-2">
          <Megaphone className="w-4 h-4" /> L'Équipe-dagprijs-banner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">Beheer hier de banner bovenaan L'Équipe. De banner blijft inhoudelijk de dagprijs; zet 'm aan met "Banner tonen" (max. één per game). De prijs zelf bewerk je in het Prijzen-tab.</p>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">{loading ? "Laden…" : "Geen dagprijs/sponsor-prijzen in deze game. Maak er één in het Prijzen-tab."}</p>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="border rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{r.soort === "sponsor" ? "Sponsor / banner" : "Dagprijs"}</span>
                <Button
                  size="sm"
                  variant={r.is_dagprijs_vandaag ? "default" : "outline"}
                  className="h-7 text-xs"
                  onClick={() => toggleBanner(r.id, !r.is_dagprijs_vandaag)}
                  title="Toon deze als banner bovenaan L'Équipe (max. één per game)"
                >
                  <CalendarDays className="w-3.5 h-3.5 mr-1" />
                  Banner tonen {r.is_dagprijs_vandaag ? "aan" : "uit"}
                </Button>
              </div>

              <div>
                <Label className="text-[11px]">Grote titel (banner)</Label>
                <Input key={`bt-${r.id}-${r.titel}`} defaultValue={r.titel} onBlur={(e) => e.target.value !== r.titel && saveField(r.id, { titel: e.target.value })} className="h-8 text-sm" placeholder="bv. Bol.com waardebon" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <Label className="text-[11px]">Kicker</Label>
                  <Input defaultValue={r.banner_kicker ?? ""} onBlur={(e) => (e.target.value.trim() || null) !== r.banner_kicker && saveField(r.id, { banner_kicker: e.target.value.trim() || null })} className="h-8 text-sm" placeholder="Dagprijs van vandaag" />
                </div>
                <div>
                  <Label className="text-[11px]">Sponsor-label</Label>
                  <Input defaultValue={r.banner_sponsor_label ?? ""} onBlur={(e) => (e.target.value.trim() || null) !== r.banner_sponsor_label && saveField(r.id, { banner_sponsor_label: e.target.value.trim() || null })} className="h-8 text-sm" placeholder="Trotse sponsor van Koerspoule" />
                </div>
                <div>
                  <Label className="text-[11px]">Waarde (gouden badge)</Label>
                  <Input defaultValue={r.banner_waarde ?? ""} onBlur={(e) => (e.target.value.trim() || null) !== r.banner_waarde && saveField(r.id, { banner_waarde: e.target.value.trim() || null })} className="h-8 text-sm" placeholder="€10" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px]">Sponsor / gever (banner)</Label>
                  <Input defaultValue={r.sponsor_naam ?? ""} onBlur={(e) => (e.target.value || null) !== r.sponsor_naam && saveField(r.id, { sponsor_naam: e.target.value || null })} className="h-8 text-sm" placeholder="bv. De Digitale Basis" />
                </div>
                <div className="flex items-center gap-2">
                  {r.sponsor_logo_url && <img src={r.sponsor_logo_url} alt="logo" className="h-8 w-12 object-contain rounded border bg-black/5" />}
                  <input ref={(el) => (logoRefs.current[r.id] = el)} type="file" accept={ALLOWED.join(",")} className="hidden" onChange={(e) => uploadLogo(r.id, e.target.files?.[0])} />
                  <button type="button" className="text-xs underline text-primary inline-flex items-center gap-1" disabled={busyId === r.id} onClick={() => logoRefs.current[r.id]?.click()}>
                    <Upload className="w-3 h-3" /> {r.sponsor_logo_url ? "Sponsorlogo vervang" : "Sponsorlogo"}
                  </button>
                  {r.sponsor_logo_url && (
                    <button type="button" className="text-xs underline text-destructive inline-flex items-center gap-1" disabled={busyId === r.id} onClick={() => removeLogo(r.id)}>
                      <Trash2 className="w-3 h-3" /> Verwijder
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
