import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Trash2, Eye, EyeOff, Users2, RefreshCw, MapPin } from "lucide-react";
import { toast } from "sonner";

type Row = {
  id: string;
  name: string;
  slug: string | null;
  owner_user_id: string | null;
  owner_name: string | null;
  member_count: number;
  banner_url: string | null;
  banner_enabled: boolean;
  requires_woonplaats: boolean;
};

const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export default function SubpoulesTab({ activeGameId }: { activeGameId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    if (!supabase || !activeGameId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("subpoules")
        .select("id, name, slug, banner_url, banner_enabled, requires_woonplaats, owner_user_id, subpoule_members(user_id)")
        .eq("game_id", activeGameId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const list = (data ?? []) as Array<Record<string, unknown>>;

      // Eigenaarsnamen ophaalbaar via profiles (admin mag lezen).
      const ownerIds = [...new Set(list.map((s) => s.owner_user_id).filter(Boolean))] as string[];
      const nameMap: Record<string, string> = {};
      if (ownerIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", ownerIds);
        for (const p of (profs ?? []) as Array<{ id: string; display_name: string | null }>) {
          if (p.display_name) nameMap[p.id] = p.display_name;
        }
      }

      setRows(
        list.map((s) => ({
          id: s.id as string,
          name: s.name as string,
          slug: (s.slug as string | null) ?? null,
          owner_user_id: (s.owner_user_id as string | null) ?? null,
          owner_name: s.owner_user_id ? nameMap[s.owner_user_id as string] ?? null : null,
          member_count: (s.subpoule_members as Array<unknown> | null)?.length ?? 0,
          banner_url: (s.banner_url as string | null) ?? null,
          banner_enabled: (s.banner_enabled as boolean | null) ?? true,
          requires_woonplaats: (s.requires_woonplaats as boolean | null) ?? false,
        })),
      );
    } catch (e) {
      toast.error(`Laden mislukt: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [activeGameId]);

  useEffect(() => {
    load();
  }, [load]);

  async function uploadBanner(id: string, file: File | undefined | null) {
    if (!supabase || !file) return;
    if (!ALLOWED.includes(file.type)) {
      toast.error("Alleen PNG, JPG, WEBP of SVG.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Bestand te groot (max 5 MB).");
      return;
    }
    setBusyId(id);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${id}/logo.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("subpoule-banners")
        .upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("subpoule-banners").getPublicUrl(path);
      const url = `${pub.publicUrl}?v=${Date.now()}`;
      const { error: updErr } = await supabase
        .from("subpoules")
        .update({ banner_url: url } as never)
        .eq("id", id);
      if (updErr) throw updErr;
      toast.success("Logo geüpload");
      await load();
    } catch (e) {
      toast.error(`Upload mislukt: ${(e as Error).message}`);
    } finally {
      setBusyId(null);
    }
  }

  async function toggleEnabled(id: string, next: boolean) {
    if (!supabase) return;
    const { error } = await supabase.from("subpoules").update({ banner_enabled: next } as never).eq("id", id);
    if (error) {
      toast.error(`Togglen mislukt: ${error.message}`);
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, banner_enabled: next } : r)));
  }

  async function toggleWoonplaats(id: string, next: boolean) {
    if (!supabase) return;
    const { error } = await supabase.from("subpoules").update({ requires_woonplaats: next } as never).eq("id", id);
    if (error) {
      toast.error(`Togglen mislukt: ${error.message}`);
      return;
    }
    toast.success(next ? "Woonplaats nu vereist" : "Woonplaats niet meer vereist");
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, requires_woonplaats: next } : r)));
  }

  async function removeBanner(id: string) {
    if (!supabase) return;
    if (!confirm("Logo van deze subpoule verwijderen?")) return;
    const { error } = await supabase.from("subpoules").update({ banner_url: null } as never).eq("id", id);
    if (error) {
      toast.error(`Verwijderen mislukt: ${error.message}`);
      return;
    }
    toast.success("Logo verwijderd");
    await load();
  }

  if (!activeGameId) {
    return <p className="text-sm text-muted-foreground italic">Kies eerst een actieve game.</p>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="font-display text-base flex items-center gap-2">
          <Users2 className="w-4 h-4" /> Subpoules &amp; logo-banners ({rows.length})
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => load()} disabled={loading} className="h-7 text-xs">
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Herlaad
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            {loading ? "Laden…" : "Nog geen subpoules voor deze game."}
          </p>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="border rounded-md p-3 flex flex-col md:flex-row md:items-center gap-3">
              {/* Preview */}
              <div className="w-28 h-16 shrink-0 rounded border bg-secondary/30 flex items-center justify-center overflow-hidden">
                {r.banner_url ? (
                  <img src={r.banner_url} alt={`${r.name} logo`} className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-[10px] text-muted-foreground">geen logo</span>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display font-bold truncate">{r.name}</span>
                  {r.banner_url ? (
                    r.banner_enabled ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 border border-emerald-500/40">Zichtbaar</Badge>
                    ) : (
                      <Badge variant="secondary">Klaargezet (uit)</Badge>
                    )
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">Geen logo</Badge>
                  )}
                  {r.requires_woonplaats && (
                    <Badge className="bg-[hsl(var(--vintage-gold))/0.18] text-[hsl(var(--vintage-gold))] border border-[hsl(var(--vintage-gold))/0.45] gap-1">
                      <MapPin className="w-3 h-3" /> Woonplaats
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {r.owner_name ?? "—"} · {r.member_count} {r.member_count === 1 ? "lid" : "leden"}
                  {r.slug ? ` · /${r.slug}` : ""}
                </div>
              </div>

              {/* Acties */}
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                <input
                  ref={(el) => (fileRefs.current[r.id] = el)}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => uploadBanner(r.id, e.target.files?.[0])}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={busyId === r.id}
                  onClick={() => fileRefs.current[r.id]?.click()}
                >
                  <Upload className="w-3.5 h-3.5 mr-1" />
                  {busyId === r.id ? "Uploaden…" : r.banner_url ? "Vervang" : "Upload logo"}
                </Button>
                <Button
                  size="sm"
                  variant={r.requires_woonplaats ? "default" : "outline"}
                  className="h-7 text-xs"
                  onClick={() => toggleWoonplaats(r.id, !r.requires_woonplaats)}
                  title="Vraag deelnemers hun woonplaats bij toetreden + filter in de ranking"
                >
                  <MapPin className="w-3.5 h-3.5 mr-1" />
                  Woonplaats {r.requires_woonplaats ? "aan" : "uit"}
                </Button>
                {r.banner_url && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => toggleEnabled(r.id, !r.banner_enabled)}
                      title={r.banner_enabled ? "Verbergen" : "Tonen"}
                    >
                      {r.banner_enabled ? <EyeOff className="w-3.5 h-3.5 mr-1" /> : <Eye className="w-3.5 h-3.5 mr-1" />}
                      {r.banner_enabled ? "Uit" : "Aan"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeBanner(r.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
