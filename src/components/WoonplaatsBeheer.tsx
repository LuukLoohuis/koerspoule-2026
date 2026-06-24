import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useSubpouleMembers } from "@/hooks/useSubpoules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Pencil } from "lucide-react";

/**
 * Vaste plek (Streek-tab) om je EIGEN woonplaats toe te voegen of te wijzigen.
 * Alleen voor de ingelogde gebruiker; lege invoer verwijdert de woonplaats.
 */
export default function WoonplaatsBeheer({ subpouleId }: { subpouleId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: members = [] } = useSubpouleMembers(subpouleId);

  const isMember = user ? members.some((m) => m.user_id === user.id) : false;
  const own = user ? members.find((m) => m.user_id === user.id)?.woonplaats?.trim() || "" : "";

  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");
  const [saving, setSaving] = useState(false);

  if (!isMember) return null;

  const startEdit = () => { setVal(own); setEditing(true); };

  const save = async () => {
    if (!supabase) return;
    setSaving(true);
    const next = val.trim();
    const { error } = await supabase.rpc("set_my_subpoule_woonplaats", {
      p_subpoule_id: subpouleId,
      p_woonplaats: next, // leeg → RPC zet null (verwijdert)
    });
    setSaving(false);
    if (error) { toast({ title: "Opslaan mislukt", description: error.message, variant: "destructive" }); return; }
    queryClient.invalidateQueries({ queryKey: ["subpoule-members", subpouleId] });
    setEditing(false);
    toast({ title: next ? "Woonplaats opgeslagen" : "Woonplaats verwijderd", description: next || undefined });
  };

  return (
    <div className="retro-border bg-card p-3">
      {editing ? (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-xs text-muted-foreground font-sans flex items-center gap-1.5 shrink-0">
            <MapPin className="w-3.5 h-3.5 text-[hsl(var(--vintage-gold))]" /> Jouw woonplaats
          </span>
          <Input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder="bv. Enschede — leeg = verwijderen"
            className="h-8 text-sm flex-1"
            autoFocus
          />
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" className="h-8" disabled={saving} onClick={save}>{saving ? "Opslaan…" : "Opslaan"}</Button>
            <Button size="sm" variant="ghost" className="h-8" disabled={saving} onClick={() => setEditing(false)}>Annuleren</Button>
          </div>
        </div>
      ) : own ? (
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[hsl(var(--vintage-gold))] shrink-0" />
          <span className="text-sm font-sans flex-1 min-w-0">
            Jouw woonplaats: <strong className="font-display">{own}</strong>
          </span>
          <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={startEdit}>
            <Pencil className="w-3.5 h-3.5 mr-1" /> Wijzigen
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="h-9 w-full justify-start gap-2" onClick={startEdit}>
          <MapPin className="w-4 h-4 text-[hsl(var(--vintage-gold))]" />
          Woonplaats toevoegen — doe mee aan het streekklassement
        </Button>
      )}
    </div>
  );
}
