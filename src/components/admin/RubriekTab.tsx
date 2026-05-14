import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { useAllRubriekItems, type RubriekItem, type RubriekOption } from "@/hooks/useRubriek";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Check, Edit2, X } from "lucide-react";
import { toast } from "sonner";

type Props = { activeGameId: string };

type DraftOption = { text: string };

type FormState = {
  type: "text" | "poll";
  content: string;
  question: string;
  options: DraftOption[];
};

const emptyForm = (): FormState => ({
  type: "text",
  content: "",
  question: "",
  options: [{ text: "" }, { text: "" }],
});

export default function RubriekTab({ activeGameId }: Props) {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useAllRubriekItems(activeGameId);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  function reload() {
    qc.invalidateQueries({ queryKey: ["rubriek-items-admin", activeGameId] });
    qc.invalidateQueries({ queryKey: ["active-rubriek", activeGameId] });
  }

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function startEdit(item: RubriekItem) {
    setEditingId(item.id);
    setForm({
      type: item.type,
      content: item.content ?? "",
      question: item.question ?? "",
      options:
        item.options.length > 0
          ? item.options.map((o) => ({ text: o.text }))
          : [{ text: "" }, { text: "" }],
    });
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
  }

  async function save() {
    if (!supabase) return;
    if (form.type === "text" && !form.content.trim()) {
      toast.error("Tekst mag niet leeg zijn");
      return;
    }
    if (form.type === "poll") {
      if (!form.question.trim()) {
        toast.error("Vul een vraag in");
        return;
      }
      const validOpts = form.options.filter((o) => o.text.trim());
      if (validOpts.length < 2) {
        toast.error("Minimaal 2 antwoordopties vereist");
        return;
      }
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateItem(editingId);
      } else {
        await createItem();
      }
      toast.success(editingId ? "Rubriek bijgewerkt" : "Rubriek aangemaakt");
      setShowForm(false);
      setEditingId(null);
      reload();
    } catch (e) {
      toast.error(`Opslaan mislukt: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  async function createItem() {
    if (!supabase) return;
    const { data: item, error } = await supabase
      .from("rubriek_items")
      .insert({
        game_id: activeGameId,
        type: form.type,
        content: form.type === "text" ? form.content.trim() : null,
        question: form.type === "poll" ? form.question.trim() : null,
        is_active: false,
      })
      .select("id")
      .single();
    if (error) throw error;
    if (form.type === "poll") {
      await insertOptions(item.id, form.options);
    }
  }

  async function updateItem(id: string) {
    if (!supabase) return;
    const { error } = await supabase
      .from("rubriek_items")
      .update({
        type: form.type,
        content: form.type === "text" ? form.content.trim() : null,
        question: form.type === "poll" ? form.question.trim() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;
    // Replace options: delete old, insert new
    if (form.type === "poll") {
      const { error: delErr } = await supabase
        .from("rubriek_options")
        .delete()
        .eq("rubriek_id", id);
      if (delErr) throw delErr;
      await insertOptions(id, form.options);
    } else {
      // Switched to text: remove options
      await supabase.from("rubriek_options").delete().eq("rubriek_id", id);
    }
  }

  async function insertOptions(rubriekId: string, opts: DraftOption[]) {
    if (!supabase) return;
    const rows = opts
      .filter((o) => o.text.trim())
      .map((o, i) => ({ rubriek_id: rubriekId, text: o.text.trim(), sort_order: i }));
    if (!rows.length) return;
    const { error } = await supabase.from("rubriek_options").insert(rows);
    if (error) throw error;
  }

  async function setActive(id: string) {
    if (!supabase) return;
    // Deactivate all, then activate the chosen one
    const { error: e1 } = await supabase
      .from("rubriek_items")
      .update({ is_active: false })
      .eq("game_id", activeGameId);
    if (e1) { toast.error(`Fout: ${e1.message}`); return; }
    const { error: e2 } = await supabase
      .from("rubriek_items")
      .update({ is_active: true })
      .eq("id", id);
    if (e2) { toast.error(`Fout: ${e2.message}`); return; }
    toast.success("Rubriek geactiveerd");
    reload();
  }

  async function deactivate(id: string) {
    if (!supabase) return;
    const { error } = await supabase
      .from("rubriek_items")
      .update({ is_active: false })
      .eq("id", id);
    if (error) { toast.error(`Fout: ${error.message}`); return; }
    toast.success("Rubriek gedeactiveerd");
    reload();
  }

  async function deleteItem(id: string) {
    if (!supabase) return;
    if (!confirm("Rubriek verwijderen? Alle stemmen gaan ook verloren.")) return;
    const { error } = await supabase.from("rubriek_items").delete().eq("id", id);
    if (error) { toast.error(`Verwijderen mislukt: ${error.message}`); return; }
    toast.success("Rubriek verwijderd");
    if (editingId === id) { setShowForm(false); setEditingId(null); }
    reload();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Rubriek</CardTitle>
          {!showForm && (
            <Button size="sm" onClick={startCreate}>
              <Plus className="w-4 h-4 mr-1" /> Nieuw item
            </Button>
          )}
        </CardHeader>

        {showForm && (
          <CardContent className="border-t pt-4">
            <ItemForm
              form={form}
              setForm={setForm}
              saving={saving}
              isEdit={Boolean(editingId)}
              onSave={save}
              onCancel={cancelForm}
            />
          </CardContent>
        )}
      </Card>

      {isLoading && (
        <p className="text-sm text-muted-foreground px-1">Laden…</p>
      )}

      {!isLoading && items.length === 0 && (
        <p className="text-sm text-muted-foreground px-1">Nog geen rubriek-items aangemaakt.</p>
      )}

      <div className="space-y-2">
        {items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            onEdit={() => startEdit(item)}
            onDelete={() => deleteItem(item.id)}
            onSetActive={() => setActive(item.id)}
            onDeactivate={() => deactivate(item.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Form ─────────────────────────────────────────────────────────────────────

function ItemForm({
  form,
  setForm,
  saving,
  isEdit,
  onSave,
  onCancel,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  saving: boolean;
  isEdit: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  function setOption(i: number, text: string) {
    const opts = [...form.options];
    opts[i] = { text };
    setForm({ ...form, options: opts });
  }

  function addOption() {
    if (form.options.length >= 4) return;
    setForm({ ...form, options: [...form.options, { text: "" }] });
  }

  function removeOption(i: number) {
    if (form.options.length <= 2) return;
    setForm({ ...form, options: form.options.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="space-y-4 max-w-lg">
      {/* Type toggle */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={form.type === "text" ? "default" : "outline"}
          onClick={() => setForm({ ...form, type: "text" })}
        >
          Tekst
        </Button>
        <Button
          size="sm"
          variant={form.type === "poll" ? "default" : "outline"}
          onClick={() => setForm({ ...form, type: "poll" })}
        >
          Poll
        </Button>
      </div>

      {form.type === "text" ? (
        <div className="space-y-1.5">
          <Label htmlFor="rubriek-content">Tekst</Label>
          <Textarea
            id="rubriek-content"
            rows={4}
            placeholder={"Eerste regel wordt de koptekst.\nVervolgregel(s) worden cursief weergegeven."}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Eerste regel = koptekst. Extra regels = cursieve subtekst.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="rubriek-question">Vraag</Label>
            <Input
              id="rubriek-question"
              placeholder="Wie wordt topscorer van de Giro?"
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Antwoordopties (2–4)</Label>
            {form.options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  placeholder={`Optie ${i + 1}`}
                  value={opt.text}
                  onChange={(e) => setOption(i, e.target.value)}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0"
                  disabled={form.options.length <= 2}
                  onClick={() => removeOption(i)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {form.options.length < 4 && (
              <Button size="sm" variant="outline" onClick={addOption}>
                <Plus className="w-4 h-4 mr-1" /> Optie toevoegen
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={onSave} disabled={saving}>
          {saving ? "Opslaan…" : isEdit ? "Opslaan" : "Aanmaken"}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Annuleren
        </Button>
      </div>
    </div>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  onEdit,
  onDelete,
  onSetActive,
  onDeactivate,
}: {
  item: RubriekItem;
  onEdit: () => void;
  onDelete: () => void;
  onSetActive: () => void;
  onDeactivate: () => void;
}) {
  const preview =
    item.type === "text"
      ? item.content?.split("\n")[0] ?? ""
      : item.question ?? "";

  return (
    <Card className={item.is_active ? "border-primary/50 bg-primary/3" : ""}>
      <CardContent className="flex items-start gap-3 py-3 px-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <Badge variant={item.type === "poll" ? "secondary" : "outline"} className="text-[10px] uppercase tracking-wide">
              {item.type === "poll" ? "Poll" : "Tekst"}
            </Badge>
            {item.is_active && (
              <Badge className="text-[10px] uppercase tracking-wide bg-primary text-primary-foreground">
                Actief
              </Badge>
            )}
          </div>
          <p className="text-sm font-medium truncate">{preview}</p>
          {item.type === "poll" && item.options.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {item.options.map((o) => o.text).join(" · ")}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {item.is_active ? (
            <Button size="sm" variant="outline" onClick={onDeactivate} title="Deactiveren">
              <X className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={onSetActive} title="Activeren">
              <Check className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onEdit} title="Bewerken">
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete} title="Verwijderen" className="text-destructive hover:text-destructive">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
