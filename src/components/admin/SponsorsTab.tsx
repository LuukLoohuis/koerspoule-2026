import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Handshake, Upload, Trash2, Plus, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import DagprijsBannerSectie from "@/components/admin/DagprijsBannerSectie";

type Row = {
  id: string;
  naam: string;
  logo_url: string | null;
  label: string | null;
  weergavenaam: string | null;
  link_url: string | null;
  zichtbaar: boolean;
  sort_order: number;
};

const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_BYTES = 5 * 1024 * 1024;

/** Platform-sponsoren beheren (losstaand van games) + L'Équipe-banner-beheer. */
export default function SponsorsTab({ activeGameId }: { activeGameId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const logoRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("sponsors")
        .select("*")
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      setRows((data ?? []) as Row[]);
    } catch (e) {
      toast.error(`Laden mislukt: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addSponsor() {
    if (!supabase) return;
    const maxSort = rows.reduce((m, r) => Math.max(m, r.sort_order), 0);
    const { error } = await supabase.from("sponsors").insert({ naam: "", sort_order: maxSort + 1 } as never);
    if (error) { toast.error(`Toevoegen mislukt: ${error.message}`); return; }
    await load();
  }

  async function saveField(id: string, patch: Partial<Row>) {
    if (!supabase) return;
    const { error } = await supabase.from("sponsors").update(patch as never).eq("id", id);
    if (error) { toast.error(`Opslaan mislukt: ${error.message}`); return; }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function saveLinkUrl(id: string, value: string, current: string | null) {
    const v = value.trim();
    const next = v || null;
    if (next === current) return;
    if (next && !/^https?:\/\//i.test(next)) {
      toast.error("Link moet met http:// of https:// beginnen.");
      return;
    }
    await saveField(id, { link_url: next });
  }

  async function toggleZichtbaar(id: string, next: boolean) {
    await saveField(id, { zichtbaar: next });
  }

  async function removeSponsor(id: string) {
    if (!supabase || !confirm("Deze sponsor verwijderen?")) return;
    const { error } = await supabase.from("sponsors").delete().eq("id", id);
    if (error) { toast.error(`Verwijderen mislukt: ${error.message}`); return; }
    toast.success("Sponsor verwijderd");
    await load();
  }

  async function uploadLogo(id: string, file: File | undefined | null) {
    if (!supabase || !file) return;
    if (!ALLOWED.includes(file.type)) { toast.error("Alleen PNG, JPG, WEBP of SVG."); return; }
    if (file.size > MAX_BYTES) { toast.error("Bestand te groot (max 5 MB)."); return; }
    setBusyId(id);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${id}-logo.${ext}`;
      const { error: upErr } = await supabase.storage.from("sponsor-assets").upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("sponsor-assets").getPublicUrl(path);
      await saveField(id, { logo_url: `${pub.publicUrl}?v=${Date.now()}` });
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
      const url = rows.find((r) => r.id === id)?.logo_url;
      const m = url?.match(/sponsor-assets\/(.+?)(\?|$)/);
      if (m?.[1]) await supabase.storage.from("sponsor-assets").remove([decodeURIComponent(m[1])]);
      await saveField(id, { logo_url: null });
      toast.success("Verwijderd");
    } catch (e) {
      toast.error(`Verwijderen mislukt: ${(e as Error).message}`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base flex items-center gap-2">
          <Handshake className="w-4 h-4" /> Sponsoren ({rows.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">Platform-sponsoren voor de "Mede mogelijk gemaakt door"-strook onderaan de landingspagina's.</p>
        <Button size="sm" variant="outline" onClick={addSponsor} disabled={loading} className="h-8">
          <Plus className="w-4 h-4 mr-1" /> Sponsor toevoegen
        </Button>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">{loading ? "Laden…" : "Nog geen sponsoren."}</p>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="border rounded-md p-3 space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_90px] gap-2">
                <div>
                  <Label className="text-[11px]">Naam</Label>
                  <Input defaultValue={r.naam} onBlur={(e) => e.target.value !== r.naam && saveField(r.id, { naam: e.target.value })} className="h-8 text-sm" placeholder="bv. Wij geven licht" />
                </div>
                <div>
                  <Label className="text-[11px]">Volgorde</Label>
                  <Input type="number" defaultValue={r.sort_order} onBlur={(e) => Number(e.target.value) !== r.sort_order && saveField(r.id, { sort_order: Number(e.target.value) })} className="h-8 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 rounded-md border border-dashed p-2">
                <div>
                  <Label className="text-[11px]">Label (klein) — optioneel</Label>
                  <Input defaultValue={r.label ?? ""} onBlur={(e) => (e.target.value.trim() || null) !== r.label && saveField(r.id, { label: e.target.value.trim() || null })} className="h-8 text-sm" placeholder="bv. Wij geven" />
                </div>
                <div>
                  <Label className="text-[11px]">Weergavenaam (groot) — optioneel</Label>
                  <Input defaultValue={r.weergavenaam ?? ""} onBlur={(e) => (e.target.value.trim() || null) !== r.weergavenaam && saveField(r.id, { weergavenaam: e.target.value.trim() || null })} className="h-8 text-sm" placeholder="bv. LICHT" />
                </div>
                <p className="md:col-span-2 text-[10px] text-muted-foreground">Gebruik label + weergavenaam als je geen logo uploadt (tekst-kaartje).</p>
              </div>

              <div>
                <Label className="text-[11px]">Link (URL) — optioneel</Label>
                <Input defaultValue={r.link_url ?? ""} onBlur={(e) => saveLinkUrl(r.id, e.target.value, r.link_url)} className="h-8 text-sm" placeholder="https://wijgevenlicht.nl/…" inputMode="url" />
              </div>

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  {r.logo_url && <img src={r.logo_url} alt="logo" className="h-8 w-14 object-contain rounded border bg-white" />}
                  <input ref={(el) => (logoRefs.current[r.id] = el)} type="file" accept={ALLOWED.join(",")} className="hidden" onChange={(e) => uploadLogo(r.id, e.target.files?.[0])} />
                  <button type="button" className="text-xs underline text-primary inline-flex items-center gap-1" disabled={busyId === r.id} onClick={() => logoRefs.current[r.id]?.click()}>
                    <Upload className="w-3 h-3" /> {r.logo_url ? "Logo vervang" : "Logo"}
                  </button>
                  {r.logo_url && (
                    <button type="button" className="text-xs underline text-destructive inline-flex items-center gap-1" disabled={busyId === r.id} onClick={() => removeLogo(r.id)}>
                      <Trash2 className="w-3 h-3" /> Verwijder
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant={r.zichtbaar ? "default" : "outline"} className="h-7 text-xs" onClick={() => toggleZichtbaar(r.id, !r.zichtbaar)}>
                    {r.zichtbaar ? <Eye className="w-3.5 h-3.5 mr-1" /> : <EyeOff className="w-3.5 h-3.5 mr-1" />}
                    {r.zichtbaar ? "Zichtbaar" : "Verborgen"}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeSponsor(r.id)}>
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Verwijder
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>

      <DagprijsBannerSectie activeGameId={activeGameId} />
    </div>
  );
}
