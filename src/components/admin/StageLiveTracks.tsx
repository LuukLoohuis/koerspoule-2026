import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, Radio, X, Search } from "lucide-react";

/**
 * Koppelt één ronde aan de livebaan/-banen op livemarathon.schaatsen.nl.
 *
 * Bewust meerdere banen per ronde: op natuurijs rijden mannen en vrouwen
 * tegelijk en de bron levert die als twee losse trackIds. Bij kunstijs is het
 * er in de praktijk één.
 */

export type LiveTrackLink = {
  id: string;
  track_id: string;
  label: string | null;
  categorie: string | null;
  sort_order: number;
};

type BronTrack = {
  track_id: string;
  naam: string | null;
  volledige_naam: string | null;
  categorie: string | null;
  categorie_code: string | null;
  competitie: string | null;
  niveau: number | null;
  datum: string | null;
};

const IJS_TYPES = [
  { value: "kunstijs", label: "Kunstijs — 400 m ovaal" },
  { value: "natuurijs", label: "Natuurijs — standaardlus" },
];

export default function StageLiveTracks({
  stageId,
  stageNumber,
  ijsType,
  open,
  onOpenChange,
  onSaved,
}: {
  stageId: string;
  stageNumber: number;
  ijsType: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
}) {
  const [links, setLinks] = useState<LiveTrackLink[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [tracks, setTracks] = useState<BronTrack[] | null>(null);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [zoek, setZoek] = useState("");
  const [busy, setBusy] = useState(false);
  const [ijs, setIjs] = useState<string>(ijsType ?? "");

  useEffect(() => { setIjs(ijsType ?? ""); }, [ijsType, open]);

  useEffect(() => {
    if (!open || !supabase) return;
    void loadLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stageId]);

  async function loadLinks() {
    if (!supabase) return;
    setLoadingLinks(true);
    const { data, error } = await supabase
      .from("stage_live_tracks")
      .select("id, track_id, label, categorie, sort_order")
      .eq("stage_id", stageId)
      .order("sort_order");
    setLoadingLinks(false);
    if (error) { toast.error(`Laden mislukt: ${error.message}`); return; }
    setLinks((data ?? []) as LiveTrackLink[]);
  }

  /** De banenlijst komt via de edge function: de bron heeft geen REST-API. */
  async function loadTracks() {
    if (!supabase) return;
    setLoadingTracks(true);
    const { data, error } = await supabase.functions.invoke("livemarathon-sync", {
      body: { action: "tracks" },
    });
    setLoadingTracks(false);
    if (error) { toast.error(`Banen ophalen mislukt: ${error.message}`); return; }
    const list = (data as { tracks?: BronTrack[] } | null)?.tracks ?? [];
    setTracks(list);
    if (list.length === 0) toast.info("De bron gaf geen banen terug");
  }

  async function koppel(track: BronTrack) {
    if (!supabase) return;
    if (links.some((l) => l.track_id === track.track_id)) {
      toast.info("Deze baan is al gekoppeld");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("stage_live_tracks").insert({
      stage_id: stageId,
      track_id: track.track_id,
      label: track.categorie ?? track.naam,
      categorie: track.categorie,
      sort_order: links.length,
    } as never);
    setBusy(false);
    if (error) { toast.error(`Koppelen mislukt: ${error.message}`); return; }
    toast.success(`${track.track_id} gekoppeld`);
    await loadLinks();
    await onSaved();
  }

  async function ontkoppel(link: LiveTrackLink) {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.from("stage_live_tracks").delete().eq("id", link.id);
    setBusy(false);
    if (error) { toast.error(`Ontkoppelen mislukt: ${error.message}`); return; }
    await loadLinks();
    await onSaved();
  }

  async function saveIjs(next: string) {
    if (!supabase) return;
    setIjs(next);
    const { error } = await supabase
      .from("stages")
      .update({ ijs_type: next || null } as never)
      .eq("id", stageId);
    if (error) { toast.error(`Opslaan mislukt: ${error.message}`); return; }
    toast.success(next === "natuurijs" ? "Natuurijs — standaardlus" : "Kunstijs — 400 m ovaal");
    await onSaved();
  }

  /** Handmatige testrun: haalt nu meteen op, zonder op de planning te wachten. */
  async function syncNu() {
    if (!supabase || links.length === 0) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("livemarathon-sync", {
      body: { trackIds: links.map((l) => l.track_id) },
    });
    setBusy(false);
    if (error) { toast.error(`Sync mislukt: ${error.message}`); return; }
    const per = (data as { per_baan?: Record<string, { rijders: number; gekoppeld: number }> } | null)?.per_baan ?? {};
    const regels = Object.entries(per).map(
      ([baan, s]) => `${baan}: ${s.rijders} rijders, ${s.gekoppeld} gekoppeld`,
    );
    toast.success(regels.length ? regels.join(" · ") : "Niets opgehaald");
  }

  const zichtbaar = (tracks ?? []).filter((t) => {
    if (!zoek.trim()) return true;
    const q = zoek.toLowerCase();
    return [t.track_id, t.naam, t.volledige_naam, t.competitie, t.categorie]
      .some((v) => (v ?? "").toLowerCase().includes(q));
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Live-uitslagen — ronde {stageNumber}</DialogTitle>
          <DialogDescription>
            Koppel deze ronde aan de wedstrijd op livemarathon.schaatsen.nl. Bij natuurijs rijden
            mannen en vrouwen vaak tegelijk; koppel dan beide banen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Baanvorm */}
          <div>
            <div className="text-xs font-medium mb-1.5">Soort ijs</div>
            <Select value={ijs} onValueChange={saveIjs}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Nog niet ingesteld" /></SelectTrigger>
              <SelectContent>
                {IJS_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Bepaalt hoe de baan in de Volgwagen getekend wordt.
            </p>
          </div>

          {/* Gekoppelde banen */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-xs font-medium">Gekoppelde banen</span>
              {links.length > 0 && (
                <Button size="sm" variant="outline" onClick={syncNu} disabled={busy}>
                  {busy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                  Nu ophalen
                </Button>
              )}
            </div>
            {loadingLinks ? (
              <div className="text-xs text-muted-foreground">Laden…</div>
            ) : links.length === 0 ? (
              <div className="rounded border border-dashed p-3 text-xs text-muted-foreground">
                Nog geen baan gekoppeld. Zonder koppeling blijft het live-tabje verborgen.
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {links.map((l) => (
                  <Badge key={l.id} variant="secondary" className="gap-1.5 py-1 pl-2.5">
                    <Radio className="h-3 w-3" />
                    <span className="font-mono text-[11px]">{l.track_id}</span>
                    {l.categorie && <span className="opacity-70">· {l.categorie}</span>}
                    <button
                      type="button"
                      onClick={() => ontkoppel(l)}
                      disabled={busy}
                      aria-label={`${l.track_id} ontkoppelen`}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Banen uit de bron */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-medium">Wedstrijden bij de bron</span>
              <Button size="sm" variant="ghost" onClick={loadTracks} disabled={loadingTracks} className="h-7">
                {loadingTracks ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                {tracks === null ? "Ophalen" : "Verversen"}
              </Button>
            </div>

            {tracks !== null && (
              <>
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={zoek}
                    onChange={(e) => setZoek(e.target.value)}
                    placeholder="Zoek op baan, competitie of categorie"
                    className="h-8 pl-8 text-xs"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto rounded border">
                  {zichtbaar.length === 0 ? (
                    <div className="p-3 text-xs text-muted-foreground">Geen wedstrijd gevonden.</div>
                  ) : (
                    zichtbaar.map((t) => {
                      const gekoppeld = links.some((l) => l.track_id === t.track_id);
                      return (
                        <button
                          key={t.track_id}
                          type="button"
                          onClick={() => koppel(t)}
                          disabled={busy || gekoppeld}
                          className="flex w-full items-start justify-between gap-3 border-b px-3 py-2 text-left last:border-b-0 hover:bg-secondary/60 disabled:opacity-50"
                        >
                          <span className="min-w-0">
                            <span className="block font-mono text-[11px] font-semibold">{t.track_id}</span>
                            <span className="block truncate text-[11px] text-muted-foreground">
                              {[t.competitie, t.naam, t.categorie].filter(Boolean).join(" · ")}
                            </span>
                          </span>
                          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                            {t.datum ? new Date(t.datum).toLocaleDateString("nl-NL") : ""}
                            {gekoppeld && " · gekoppeld"}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Sluiten</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
