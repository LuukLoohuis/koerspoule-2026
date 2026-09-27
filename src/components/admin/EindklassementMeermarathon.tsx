/**
 * Beheer › Wedstrijden (alleen Meermarathon): de winnaars van het Cup- en het
 * Grand Prix-klassement. Aan het eind van het seizoen zet de beheerder ze
 * hier; zet_klassement_winnaars kent dan meteen de voorspelpunten toe en werkt
 * de totaalstand bij. Per peloton: dit is de game die bovenin het beheer
 * gekozen is.
 */
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Trophy } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchAllRows } from "@/lib/fetchAll";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SoortEmbleem } from "@/components/meermarathon/WedstrijdSoort";
import {
  KLASSEMENT_PUNTEN,
  KLASSEMENTEN,
  telVoorspellingen,
  type KlassementTelling,
  type KlassementRijders,
} from "@/lib/klassementVoorspelling";

/** Waarde van "nog geen winnaar" in de keuzelijst (Radix Select kent geen lege waarde). */
const GEEN = "__geen__";

export type EindRijder = { id: string; naam: string; ploeg: string | null };

export function EindklassementKaart({
  rijders,
  opgeslagen,
  telling,
  punten,
  bezig,
  onOpslaan,
}: {
  rijders: EindRijder[];
  /** Wat nu in de database staat. */
  opgeslagen: KlassementRijders;
  telling: KlassementTelling | null;
  punten: number;
  bezig: boolean;
  onOpslaan: (winnaars: KlassementRijders) => void;
}) {
  const [keuze, setKeuze] = useState<KlassementRijders>(opgeslagen);
  useEffect(() => setKeuze(opgeslagen), [opgeslagen]);
  const gewijzigd = keuze.cup !== opgeslagen.cup || keuze.grandprix !== opgeslagen.grandprix;
  const opNaam = [...rijders].sort((a, b) => a.naam.localeCompare(b.naam, "nl"));
  const naamVan = (id: string | null) => rijders.find((r) => r.id === id)?.naam ?? null;

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 font-display">
          <Trophy className="h-4 w-4" aria-hidden /> Eindklassementen · pronostiek
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Zet aan het eind van het seizoen de winnaars. Wie de winnaar goed voorspelde krijgt {punten} punten; de
          totaalstand wordt meteen bijgewerkt. Laat een klassement leeg zolang de winnaar niet vaststaat.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {KLASSEMENTEN.map(({ key, label, ondergrond }) => {
          const t = telling?.[key];
          const winnaar = naamVan(opgeslagen[key]);
          return (
            <div key={key} className="flex flex-wrap items-center gap-3 border-b border-border pb-3 last:border-b-0">
              <SoortEmbleem soort={key} maat={30} />
              <div className="w-[190px]">
                <div className="text-sm font-semibold">{label}</div>
                <div className="text-xs text-muted-foreground">{ondergrond}</div>
              </div>
              <Select
                value={keuze[key] ?? GEEN}
                onValueChange={(v) => setKeuze((oud) => ({ ...oud, [key]: v === GEEN ? null : v }))}
                disabled={bezig}
              >
                <SelectTrigger className="h-9 w-[280px]" aria-label={`Winnaar ${label}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={GEEN}>— nog geen winnaar —</SelectItem>
                  {opNaam.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.naam}
                      {r.ploeg ? ` · ${r.ploeg}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">
                {t == null
                  ? ""
                  : winnaar
                    ? `${t.goed} van ${t.voorspeld} voorspellingen goed · ${winnaar}`
                    : `${t.voorspeld} voorspellingen ingediend`}
              </span>
            </div>
          );
        })}
        <Button onClick={() => onOpslaan(keuze)} disabled={!gewijzigd || bezig}>
          {bezig ? "Bezig…" : "Opslaan en punten toekennen"}
        </Button>
      </CardContent>
    </Card>
  );
}

/** De kaart met data: winnaars, telling en puntenschema van de actieve game. */
export default function EindklassementMeermarathon({
  activeGameId,
  rijders,
}: {
  activeGameId: string;
  rijders: EindRijder[];
}) {
  const [opgeslagen, setOpgeslagen] = useState<KlassementRijders>({ cup: null, grandprix: null });
  const [telling, setTelling] = useState<KlassementTelling | null>(null);
  const [punten, setPunten] = useState(KLASSEMENT_PUNTEN);
  const [bezig, setBezig] = useState(false);

  const laad = useCallback(async () => {
    if (!supabase || !activeGameId) return;
    const [winnaarsRes, puntenRes, voorspellingen] = await Promise.all([
      supabase.from("klassement_winnaars").select("klassement, rider_id").eq("game_id", activeGameId),
      supabase
        .from("points_schema")
        .select("points")
        .eq("game_id", activeGameId)
        .eq("classification", "pred_klassement")
        .eq("position", 1)
        .maybeSingle(),
      // Alleen ingediende ploegen doen mee; gepagineerd voor grote pelotons.
      fetchAllRows<{ classification: string; rider_id: string }>((from, to) =>
        supabase!
          .from("entry_predictions")
          .select("classification, rider_id, entries!inner(game_id, status)")
          .eq("entries.game_id", activeGameId)
          .eq("entries.status", "submitted")
          .in("classification", ["cup", "grandprix"])
          .range(from, to),
      ).catch(() => null),
    ]);
    const rijen = winnaarsRes.data ?? [];
    const winnaars: KlassementRijders = {
      cup: rijen.find((r) => r.klassement === "cup")?.rider_id ?? null,
      grandprix: rijen.find((r) => r.klassement === "grandprix")?.rider_id ?? null,
    };
    setOpgeslagen(winnaars);
    setPunten(puntenRes.data?.points ?? KLASSEMENT_PUNTEN);
    setTelling(voorspellingen ? telVoorspellingen(voorspellingen, winnaars) : null);
  }, [activeGameId]);

  useEffect(() => {
    void laad();
  }, [laad]);

  const opslaan = async (winnaars: KlassementRijders) => {
    if (!supabase || !activeGameId) return;
    if (!confirm("Winnaars opslaan en de voorspelpunten toekennen? De totaalstand wordt meteen bijgewerkt.")) return;
    setBezig(true);
    const { error } = await supabase.rpc("zet_klassement_winnaars", {
      p_game_id: activeGameId,
      p_cup: winnaars.cup,
      p_grandprix: winnaars.grandprix,
    });
    setBezig(false);
    if (error) {
      toast.error(`Opslaan mislukt: ${error.message}`);
      return;
    }
    toast.success("Winnaars opgeslagen, punten toegekend en totaalstand bijgewerkt");
    await laad();
  };

  return (
    <EindklassementKaart
      rijders={rijders}
      opgeslagen={opgeslagen}
      telling={telling}
      punten={punten}
      bezig={bezig}
      onOpslaan={(w) => void opslaan(w)}
    />
  );
}
