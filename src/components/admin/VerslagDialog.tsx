import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { alineas, leestijdMinuten, veiligeUrl, telZinnen, LENGTE_MIN, LENGTE_MAX } from "@/lib/verslag";
import { verslagTabel } from "@/hooks/useEtappeVerslag";

/**
 * Beheer van het etappeverslag: de tekst die als hoofdartikel in de Koerskrant
 * komt te staan.
 *
 * Bron en bronlink staan er bewust náást het tekstveld en niet ergens in een
 * instelling: komt de tekst van een externe partij, dan is de bronvermelding
 * de voorwaarde waaronder het getoond mag worden. Zo is bij het plakken meteen
 * zichtbaar dat die regel ingevuld hoort te zijn.
 */
export default function VerslagDialog({
  stage,
  onClose,
}: {
  stage: { id: string; stage_number: number; name: string | null } | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tekst, setTekst] = useState("");
  const [bron, setBron] = useState("");
  const [bronUrl, setBronUrl] = useState("");
  const [laden, setLaden] = useState(false);
  const [bezig, setBezig] = useState(false);
  // Bronartikel: alleen invoer voor de herschrijving, wordt nooit bewaard.
  // Wat we opslaan is de eigen tekst, niet die van de bron.
  const [bronTekst, setBronTekst] = useState("");
  const [herschrijven, setHerschrijven] = useState(false);

  useEffect(() => {
    if (!stage || !supabase) return;
    let afgebroken = false;
    setLaden(true);
    void (async () => {
      const { data } = await verslagTabel()
        .select("tekst, bron, bron_url")
        .eq("stage_id", stage.id)
        .maybeSingle();
      if (afgebroken) return;
      setTekst(data?.tekst ?? "");
      setBron(data?.bron ?? "");
      setBronUrl(data?.bron_url ?? "");
      setLaden(false);
    })();
    return () => { afgebroken = true; };
  }, [stage]);

  const urlOngeldig = bronUrl.trim().length > 0 && veiligeUrl(bronUrl) === null;

  async function herschrijf() {
    if (!supabase || !stage) return;
    const bronnetje = bronTekst.trim();
    if (bronnetje.length < 200) {
      toast({ title: "Te weinig tekst", description: "Plak het hele artikel; hier valt weinig uit te halen.", variant: "destructive" });
      return;
    }
    setHerschrijven(true);
    const { data, error } = await supabase.functions.invoke("generate-stage-verslag", {
      body: { bron_tekst: bronnetje, stage_id: stage.id, stage_nummer: stage.stage_number, stage_naam: stage.name },
    });
    setHerschrijven(false);
    if (error || !data?.verslag) {
      toast({ title: "Herschrijven mislukt", description: error?.message ?? "Geen verslag ontvangen", variant: "destructive" });
      return;
    }
    setTekst(data.verslag);
    toast({
      title: `Verslag in ${data.zinnen} zinnen`,
      description: "Lees het na en pas aan waar nodig -- het gaat zo de krant in.",
    });
  }

  async function bewaar() {
    if (!supabase || !stage) return;
    const schoon = tekst.trim();
    if (!schoon) {
      toast({ title: "Geen tekst", description: "Een leeg verslag bewaren we niet. Gebruik Verwijderen.", variant: "destructive" });
      return;
    }
    if (urlOngeldig) {
      toast({ title: "Ongeldige bronlink", description: "Gebruik een volledige http(s)-URL.", variant: "destructive" });
      return;
    }
    setBezig(true);
    const { error } = await verslagTabel()
      .upsert({
        stage_id: stage.id,
        tekst: schoon,
        bron: bron.trim() || null,
        bron_url: bronUrl.trim() || null,
      }, { onConflict: "stage_id" });
    setBezig(false);
    if (error) {
      toast({ title: "Opslaan mislukt", description: error.message, variant: "destructive" });
      return;
    }
    await qc.invalidateQueries({ queryKey: ["etappe-verslag", stage.id] });
    toast({ title: "Verslag bewaard", description: `Etappe ${stage.stage_number} staat nu in de krant.` });
    onClose();
  }

  async function verwijder() {
    if (!supabase || !stage) return;
    setBezig(true);
    const { error } = await verslagTabel().delete().eq("stage_id", stage.id);
    setBezig(false);
    if (error) {
      toast({ title: "Verwijderen mislukt", description: error.message, variant: "destructive" });
      return;
    }
    await qc.invalidateQueries({ queryKey: ["etappe-verslag", stage.id] });
    toast({ title: "Verslag verwijderd" });
    onClose();
  }

  const aantalAlineas = alineas(tekst).length;
  const minuten = leestijdMinuten(tekst);
  const zinnen = telZinnen(tekst);
  const buitenBereik = zinnen > 0 && (zinnen < LENGTE_MIN || zinnen > LENGTE_MAX);

  return (
    <Dialog open={stage !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">
            Verslag · {stage?.name ?? `Etappe ${stage?.stage_number ?? ""}`}
          </DialogTitle>
          <DialogDescription>
            Komt als hoofdartikel in de Koerskrant te staan. Laat een lege regel tussen alinea's.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Bronartikel erin, kort verslag eruit. Deze tekst wordt niet
              opgeslagen: we bewaren alleen wat er in eigen woorden uit komt. */}
          <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-3">
            <Label htmlFor="verslag-bronartikel" className="text-xs">Bronartikel (wordt niet bewaard)</Label>
            <Textarea
              id="verslag-bronartikel"
              value={bronTekst}
              onChange={(e) => setBronTekst(e.target.value)}
              rows={4}
              className="mt-1 text-xs"
              placeholder="Plak hier het volledige artikel. Er wordt een eigen samenvatting van 5 tot 10 zinnen van gemaakt."
            />
            <div className="mt-2 flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={herschrijf} disabled={herschrijven || bezig}>
                <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                {herschrijven ? "Bezig…" : "Herschrijf naar kort verslag"}
              </Button>
              <span className="text-xs text-muted-foreground">Feiten blijven, formulering wordt van ons.</span>
            </div>
          </div>

          <div>
            <Label htmlFor="verslag-tekst">Tekst</Label>
            <Textarea
              id="verslag-tekst"
              value={tekst}
              onChange={(e) => setTekst(e.target.value)}
              disabled={laden}
              rows={12}
              className="mt-1 font-serif text-sm"
              placeholder={laden ? "Laden…" : "Van der Poel sprintte op de Champs-Élysées…"}
            />
            <p className={cn("mt-1 text-xs", buitenBereik ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground")}>
              {zinnen} {zinnen === 1 ? "zin" : "zinnen"} · {aantalAlineas} {aantalAlineas === 1 ? "alinea" : "alinea's"} · {minuten} min lezen
              {buitenBereik && ` — bedoeld is ${LENGTE_MIN} tot ${LENGTE_MAX}`}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="verslag-bron">Bron</Label>
              <Input
                id="verslag-bron"
                value={bron}
                onChange={(e) => setBron(e.target.value)}
                className="mt-1"
                placeholder="WielerFlits"
              />
              <p className="mt-1 text-xs text-muted-foreground">Leeg = eigen tekst, dan toont de krant geen bronregel.</p>
            </div>
            <div>
              <Label htmlFor="verslag-url">Link naar het origineel</Label>
              <Input
                id="verslag-url"
                value={bronUrl}
                onChange={(e) => setBronUrl(e.target.value)}
                className="mt-1"
                placeholder="https://wielerflits.nl/nieuws/…"
                aria-invalid={urlOngeldig}
              />
              {urlOngeldig && (
                <p className="mt-1 text-xs text-destructive">Gebruik een volledige http(s)-URL.</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={verwijder} disabled={bezig || laden} className="text-destructive">
            Verwijderen
          </Button>
          <Button variant="outline" onClick={onClose} disabled={bezig}>Annuleren</Button>
          <Button onClick={bewaar} disabled={bezig || laden}>Bewaren</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
