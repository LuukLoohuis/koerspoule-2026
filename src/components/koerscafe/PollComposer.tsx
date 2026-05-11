import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  onCreate: (question: string, options: string[], deadline: string | null) => Promise<void>;
  onClose: () => void;
}

export default function PollComposer({ onCreate, onClose }: Props) {
  const { toast } = useToast();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [deadline, setDeadline] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const updateOption = (i: number, v: string) => {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? v : o)));
  };

  const addOption = () => {
    if (options.length >= 6) return;
    setOptions((prev) => [...prev, ""]);
  };

  const removeOption = (i: number) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, idx) => idx !== i));
  };

  const submit = async () => {
    const cleanOptions = options.map((o) => o.trim()).filter((o) => o.length > 0);
    if (question.trim().length < 3) {
      toast({ title: "Vraag te kort", variant: "destructive" });
      return;
    }
    if (cleanOptions.length < 2) {
      toast({ title: "Minimaal 2 opties", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await onCreate(question.trim(), cleanOptions, deadline ? new Date(deadline).toISOString() : null);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border-t-2 border-foreground bg-secondary/40 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-display font-bold text-sm">📊 Nieuwe poll</h4>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div>
        <Label htmlFor="poll-q" className="text-xs">Vraag</Label>
        <Textarea
          id="poll-q"
          value={question}
          onChange={(e) => setQuestion(e.target.value.slice(0, 200))}
          placeholder="Wie wint de etappe vandaag?"
          rows={2}
          className="text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Opties (2-6)</Label>
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <Input
              value={opt}
              onChange={(e) => updateOption(i, e.target.value.slice(0, 80))}
              placeholder={`Optie ${i + 1}`}
              className="text-sm h-8"
            />
            {options.length > 2 && (
              <button
                onClick={() => removeOption(i)}
                className="text-muted-foreground hover:text-destructive p-1"
                aria-label="Optie verwijderen"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
        {options.length < 6 && (
          <button
            onClick={addOption}
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> Optie toevoegen
          </button>
        )}
      </div>
      <div>
        <Label htmlFor="poll-deadline" className="text-xs">Deadline (optioneel)</Label>
        <Input
          id="poll-deadline"
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="text-sm h-8"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onClose} disabled={submitting}>Annuleren</Button>
        <Button size="sm" onClick={submit} disabled={submitting}>Plaatsen</Button>
      </div>
    </div>
  );
}
