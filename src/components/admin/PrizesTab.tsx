import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Upload, Trash2, Plus, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import type { PrijsSoort } from "@/hooks/usePrizes";

type Row = {
  id: string;
  soort: PrijsSoort;
  titel: string;
  omschrijving: string;
  sponsor_naam: string | null;
  sponsor_logo_url: string | null;
  sponsor_url: string | null;
  sponsor_naam_2: string | null;
  sponsor_url_2: string | null;
  afbeelding_url: string | null;
  prijs_label: string | null;
  badge_top: string | null;
  badge_bottom: string | null;
  banner_kicker: string | null;
  banner_sponsor_label: string | null;
  banner_waarde: string | null;
  is_dagprijs_vandaag: boolean;
  sort_order: number;
  rang: number | null;
};

const SOORT_LABEL: Record<PrijsSoort, string> = {
  podium_1: "Podium 1 — klassementstrui",
  podium_2: "Podium 2 — beker",
  podium_3: "Podium 3 — beker",
  dagprijs: "Dagprijs",
  ereplaats: "Ereplaats (4 t/m 20)",
  grootste_subpoule: "Grootste subpoule",
  sponsor: "Sponsor / banner (geen prijs)",
};
const SOORTEN: PrijsSoort[] = ["podium_1", "podium_2", "podium_3", "dagprijs", "ereplaats", "grootste_subpoule", "sponsor"];
const RANGEN = Array.from({ length: 17 }, (_, i) => i + 4); // 4 t/m 20 (podium = 1-3)
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_BYTES = 5 * 1024 * 1024;

export default function PrizesTab({ activeGameId }: { activeGameId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const logoRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const fotoRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    if (!supabase || !activeGameId) return;
    setLoading(true);
    try {
      const [{ data: g }, { data, error }] = await Promise.all([
        supabase.from("games").select("prizes_visible").eq("id", activeGameId).maybeSingle(),
        supabase.from("prizes").select("*").eq("game_id", activeGameId).order("sort_order").order("created_at"),
      ]);
      if (error) throw error;
      setVisible(Boolean((g as { prizes_visible?: boolean } | null)?.prizes_visible));
      setRows((data ?? []) as Row[]);
    } catch (e) {
      toast.error(`Laden mislukt: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [activeGameId]);

  useEffect(() => { load(); }, [load]);

  async function toggleVisible(next: boolean) {
    if (!supabase) return;
    const { error } = await supabase.from("games").update({ prizes_visible: next } as never).eq("id", activeGameId);
    if (error) { toast.error(`Opslaan mislukt: ${error.message}`); return; }
    setVisible(next);
    toast.success(next ? "Prijzen-tab zichtbaar" : "Prijzen-tab verborgen");
  }

  async function addPrize() {
    if (!supabase) return;
    const maxSort = rows.reduce((m, r) => Math.max(m, r.sort_order), 0);
    const { error } = await supabase.from("prizes").insert({
      game_id: activeGameId, soort: "dagprijs", titel: "", omschrijving: "", sort_order: maxSort + 1,
    } as never);
    if (error) { toast.error(`Toevoegen mislukt: ${error.message}`); return; }
    await load();
  }

  async function saveSponsorUrl(id: string, value: string, current: string | null, field: "sponsor_url" | "sponsor_url_2" = "sponsor_url") {
    const v = value.trim();
    const next = v || null;
    if (next === current) return;
    if (next && !/^https?:\/\//i.test(next)) {
      toast.error("Sponsor-link moet met http:// of https:// beginnen.");
      return;
    }
    await saveField(id, { [field]: next } as Partial<Row>);
  }

  async function saveField(id: string, patch: Partial<Row>) {
    if (!supabase) return;
    const { error } = await supabase.from("prizes").update(patch as never).eq("id", id);
    if (error) { toast.error(`Opslaan mislukt: ${error.message}`); return; }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  // Vrije rang 4..20 binnen deze game (geen dubbele ereplaats-rang).
  function vrijeRangen(exclId?: string) {
    const bezet = new Set(rows.filter((r) => r.soort === "ereplaats" && r.id !== exclId && r.rang != null).map((r) => r.rang));
    return RANGEN.filter((n) => !bezet.has(n));
  }

  async function changeSoort(id: string, soort: PrijsSoort) {
    if (soort === "ereplaats") {
      const vrij = vrijeRangen(id);
      if (vrij.length === 0) { toast.error("Alle ereplaatsen 4 t/m 20 zijn al gebruikt."); return; }
      await saveField(id, { soort, rang: vrij[0] });
    } else {
      await saveField(id, { soort, rang: null });
    }
  }

  async function changeRang(id: string, rang: number) {
    if (rows.some((r) => r.id !== id && r.soort === "ereplaats" && r.rang === rang)) {
      toast.error(`Rang ${rang}e is al gebruikt.`);
      return;
    }
    await saveField(id, { rang });
  }

  async function removePrize(id: string) {
    if (!supabase || !confirm("Deze prijs verwijderen?")) return;
    const { error } = await supabase.from("prizes").delete().eq("id", id);
    if (error) { toast.error(`Verwijderen mislukt: ${error.message}`); return; }
    toast.success("Prijs verwijderd");
    await load();
  }

  async function uploadAsset(id: string, field: "sponsor_logo_url" | "afbeelding_url", file: File | undefined | null) {
    if (!supabase || !file) return;
    if (!ALLOWED.includes(file.type)) { toast.error("Alleen PNG, JPG, WEBP of SVG."); return; }
    if (file.size > MAX_BYTES) { toast.error("Bestand te groot (max 5 MB)."); return; }
    setBusyId(id);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${activeGameId}/${id}-${field}.${ext}`;
      const { error: upErr } = await supabase.storage.from("prize-assets").upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("prize-assets").getPublicUrl(path);
      await saveField(id, { [field]: `${pub.publicUrl}?v=${Date.now()}` } as Partial<Row>);
      toast.success("Geüpload");
    } catch (e) {
      toast.error(`Upload mislukt: ${(e as Error).message}`);
    } finally {
      setBusyId(null);
    }
  }

  async function removeAsset(id: string, field: "sponsor_logo_url" | "afbeelding_url") {
    if (!supabase) return;
    if (!confirm(field === "sponsor_logo_url" ? "Logo verwijderen?" : "Foto verwijderen?")) return;
    setBusyId(id);
    try {
      // Best-effort: haal het bestand ook uit storage (pad uit de publieke URL).
      const url = rows.find((r) => r.id === id)?.[field];
      const m = url?.match(/prize-assets\/(.+?)(\?|$)/);
      if (m?.[1]) await supabase.storage.from("prize-assets").remove([decodeURIComponent(m[1])]);
      await saveField(id, { [field]: null } as Partial<Row>);
      toast.success("Verwijderd");
    } catch (e) {
      toast.error(`Verwijderen mislukt: ${(e as Error).message}`);
    } finally {
      setBusyId(null);
    }
  }

  if (!activeGameId) return <p className="text-sm text-muted-foreground italic">Kies eerst een actieve game.</p>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="font-display text-base flex items-center gap-2">
          <Trophy className="w-4 h-4" /> Prijzen ({rows.length})
        </CardTitle>
        <Button size="sm" variant={visible ? "default" : "outline"} onClick={() => toggleVisible(!visible)} className="h-7 text-xs">
          {visible ? <Eye className="w-3.5 h-3.5 mr-1" /> : <EyeOff className="w-3.5 h-3.5 mr-1" />}
          Prijzen-tab {visible ? "zichtbaar" : "verborgen"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button size="sm" variant="outline" onClick={addPrize} disabled={loading} className="h-8">
          <Plus className="w-4 h-4 mr-1" /> Prijs toevoegen
        </Button>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">{loading ? "Laden…" : "Nog geen prijzen."}</p>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="border rounded-md p-3 space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-[200px_1fr_90px] gap-2">
                <div>
                  <Label className="text-[11px]">Soort</Label>
                  <Select value={r.soort} onValueChange={(v) => changeSoort(r.id, v as PrijsSoort)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SOORTEN.map((s) => <SelectItem key={s} value={s} className="text-xs">{SOORT_LABEL[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {r.soort === "ereplaats" && (
                    <div className="mt-1.5">
                      <Label className="text-[11px]">Rang</Label>
                      <Select value={r.rang != null ? String(r.rang) : undefined} onValueChange={(v) => changeRang(r.id, Number(v))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Kies rang" /></SelectTrigger>
                        <SelectContent>
                          {RANGEN.map((n) => {
                            const taken = rows.some((o) => o.id !== r.id && o.soort === "ereplaats" && o.rang === n);
                            return <SelectItem key={n} value={String(n)} disabled={taken} className="text-xs">{n}e plaats{taken ? " (bezet)" : ""}</SelectItem>;
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-[11px]">Titel</Label>
                  <Input defaultValue={r.titel} onBlur={(e) => e.target.value !== r.titel && saveField(r.id, { titel: e.target.value })} className="h-8 text-sm" placeholder="bv. Gele trui" />
                </div>
                <div>
                  <Label className="text-[11px]">Volgorde</Label>
                  <Input type="number" defaultValue={r.sort_order} onBlur={(e) => Number(e.target.value) !== r.sort_order && saveField(r.id, { sort_order: Number(e.target.value) })} className="h-8 text-sm" />
                </div>
              </div>

              <div>
                <Label className="text-[11px]">Omschrijving</Label>
                <Textarea defaultValue={r.omschrijving} onBlur={(e) => e.target.value !== r.omschrijving && saveField(r.id, { omschrijving: e.target.value })} className="text-sm min-h-[48px]" placeholder="Korte omschrijving van de prijs" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px]">Sponsor / gever</Label>
                  <Input defaultValue={r.sponsor_naam ?? ""} onBlur={(e) => (e.target.value || null) !== r.sponsor_naam && saveField(r.id, { sponsor_naam: e.target.value || null })} className="h-8 text-sm" placeholder="bv. Café De Klim" />
                </div>
                <div className="flex items-end gap-3">
                  {/* Sponsorlogo */}
                  <div className="flex items-center gap-2">
                    {r.sponsor_logo_url && <img src={r.sponsor_logo_url} alt="logo" className="h-8 w-12 object-contain rounded border" />}
                    <input ref={(el) => (logoRefs.current[r.id] = el)} type="file" accept={ALLOWED.join(",")} className="hidden" onChange={(e) => uploadAsset(r.id, "sponsor_logo_url", e.target.files?.[0])} />
                    <button type="button" className="text-xs underline text-primary inline-flex items-center gap-1" disabled={busyId === r.id} onClick={() => logoRefs.current[r.id]?.click()}>
                      <Upload className="w-3 h-3" /> {r.sponsor_logo_url ? "Logo vervang" : "Logo"}
                    </button>
                    {r.sponsor_logo_url && (
                      <button type="button" className="text-xs underline text-destructive inline-flex items-center gap-1" disabled={busyId === r.id} onClick={() => removeAsset(r.id, "sponsor_logo_url")}>
                        <Trash2 className="w-3 h-3" /> Verwijder
                      </button>
                    )}
                  </div>
                  {/* Prijsfoto */}
                  <div className="flex items-center gap-2">
                    {r.afbeelding_url && <img src={r.afbeelding_url} alt="foto" className="h-8 w-12 object-cover rounded border" />}
                    <input ref={(el) => (fotoRefs.current[r.id] = el)} type="file" accept={ALLOWED.join(",")} className="hidden" onChange={(e) => uploadAsset(r.id, "afbeelding_url", e.target.files?.[0])} />
                    <button type="button" className="text-xs underline text-primary inline-flex items-center gap-1" disabled={busyId === r.id} onClick={() => fotoRefs.current[r.id]?.click()}>
                      <Upload className="w-3 h-3" /> {r.afbeelding_url ? "Foto vervang" : "Foto"}
                    </button>
                    {r.afbeelding_url && (
                      <button type="button" className="text-xs underline text-destructive inline-flex items-center gap-1" disabled={busyId === r.id} onClick={() => removeAsset(r.id, "afbeelding_url")}>
                        <Trash2 className="w-3 h-3" /> Verwijder
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-[11px]">Sponsor-link (URL) — optioneel</Label>
                <Input
                  defaultValue={r.sponsor_url ?? ""}
                  onBlur={(e) => saveSponsorUrl(r.id, e.target.value, r.sponsor_url)}
                  className="h-8 text-sm"
                  placeholder="https://www.viking.nl/…"
                  inputMode="url"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 rounded-md border border-dashed p-2">
                <div>
                  <Label className="text-[11px]">2e sponsor / gever — optioneel</Label>
                  <Input defaultValue={r.sponsor_naam_2 ?? ""} onBlur={(e) => (e.target.value || null) !== r.sponsor_naam_2 && saveField(r.id, { sponsor_naam_2: e.target.value || null })} className="h-8 text-sm" placeholder="bv. Wij Geven Licht" />
                </div>
                <div>
                  <Label className="text-[11px]">2e sponsor-link (URL) — optioneel</Label>
                  <Input
                    defaultValue={r.sponsor_url_2 ?? ""}
                    onBlur={(e) => saveSponsorUrl(r.id, e.target.value, r.sponsor_url_2, "sponsor_url_2")}
                    className="h-8 text-sm"
                    placeholder="https://wijgevenlicht.nl/…"
                    inputMode="url"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <Label className="text-[11px]">Prijs (groot/goud) — optioneel</Label>
                  <Input defaultValue={r.prijs_label ?? ""} onBlur={(e) => (e.target.value.trim() || null) !== r.prijs_label && saveField(r.id, { prijs_label: e.target.value.trim() || null })} className="h-8 text-sm" placeholder="bv. €10" />
                </div>
                <div>
                  <Label className="text-[11px]">Badge boven</Label>
                  <Input defaultValue={r.badge_top ?? ""} onBlur={(e) => (e.target.value.trim() || null) !== r.badge_top && saveField(r.id, { badge_top: e.target.value.trim() || null })} className="h-8 text-sm" placeholder="bv. Vandaag" />
                </div>
                <div>
                  <Label className="text-[11px]">Badge onder</Label>
                  <Input defaultValue={r.badge_bottom ?? ""} onBlur={(e) => (e.target.value.trim() || null) !== r.badge_bottom && saveField(r.id, { badge_bottom: e.target.value.trim() || null })} className="h-8 text-sm" placeholder="bv. Prijs" />
                </div>
              </div>

              {(r.soort === "dagprijs" || r.soort === "sponsor") && (
                <p className="text-[11px] text-muted-foreground italic">
                  De L'Équipe-banner (teksten + "Banner tonen") beheer je nu in het tabje <strong>Sponsoren</strong>.
                </p>
              )}

              <div className="flex items-center justify-end gap-2">
                <Button size="sm" variant="ghost" className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removePrize(r.id)}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Verwijder
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
