import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, BarChart3, Smile } from "lucide-react";
import { cn } from "@/lib/utils";

const EMOJI_PALETTE = ["🚴","🏆","🔥","😂","😎","💪","👍","❤️","🤩","🥳","😱","🤔","🙌","👏","🎉","🚀","☕","🍺","⛰️","🌧️","💨","⏱️","🥇","🥈","🥉","💥","✨","😅","😭","😉"];

export interface MentionTarget {
  user_id: string;
  display_name: string;
}

interface Props {
  onSend: (body: string, mentions: string[]) => Promise<void>;
  onOpenPoll: () => void;
  members: MentionTarget[];
  disabled?: boolean;
}

export default function ChatInput({ onSend, onOpenPoll, members, disabled }: Props) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState<number>(-1);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    if (mentionQuery == null) return [];
    const q = mentionQuery.toLowerCase();
    return members
      .filter((m) => m.display_name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [mentionQuery, members]);

  useEffect(() => { setHighlight(0); }, [mentionQuery]);

  const handleChange = (v: string) => {
    setValue(v);
    const caret = inputRef.current?.selectionStart ?? v.length;
    const before = v.slice(0, caret);
    const m = before.match(/@([^\s@]{0,20})$/);
    if (m) {
      setMentionQuery(m[1]);
      setMentionStart(caret - m[0].length);
    } else {
      setMentionQuery(null);
      setMentionStart(-1);
    }
  };

  const insertMention = (target: MentionTarget) => {
    if (mentionStart < 0) return;
    const before = value.slice(0, mentionStart);
    const after = value.slice((inputRef.current?.selectionStart ?? value.length));
    const insert = `@${target.display_name} `;
    const next = before + insert + after;
    setValue(next);
    setMentionQuery(null);
    setMentionStart(-1);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      const pos = (before + insert).length;
      inputRef.current?.setSelectionRange(pos, pos);
    });
  };

  const computeMentions = (text: string): string[] => {
    const ids: string[] = [];
    for (const m of members) {
      const re = new RegExp(`@${m.display_name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (re.test(text)) ids.push(m.user_id);
    }
    return Array.from(new Set(ids));
  };

  const send = async () => {
    const body = value.trim();
    if (!body) return;
    setSending(true);
    try {
      await onSend(body, computeMentions(body));
      setValue("");
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (mentionQuery != null && matches.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => (h + 1) % matches.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => (h - 1 + matches.length) % matches.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertMention(matches[highlight]); return; }
      if (e.key === "Escape") { setMentionQuery(null); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="relative border-t-2 border-foreground bg-card">
      {mentionQuery != null && matches.length > 0 && (
        <div className="absolute bottom-full left-2 right-2 mb-1 bg-popover border border-border rounded-md shadow-xl overflow-hidden z-20">
          {matches.map((m, i) => (
            <button
              key={m.user_id}
              onClick={() => insertMention(m)}
              className={cn(
                "w-full text-left px-3 py-2 text-sm flex items-center gap-2",
                i === highlight ? "bg-primary/15" : "hover:bg-secondary"
              )}
            >
              <span className="text-primary font-bold">@</span>
              <span className="truncate">{m.display_name}</span>
            </button>
          ))}
        </div>
      )}
      {showEmoji && (
        <div className="absolute bottom-full right-2 mb-1 bg-popover border border-border rounded-md shadow-xl p-2 grid grid-cols-10 gap-1 z-20 max-w-[260px]">
          {EMOJI_PALETTE.map((e) => (
            <button
              key={e}
              onClick={() => { setValue((v) => v + e); setShowEmoji(false); inputRef.current?.focus(); }}
              className="w-6 h-6 hover:bg-secondary rounded text-base flex items-center justify-center"
            >
              {e}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1 p-2">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-9 w-9 shrink-0"
          onClick={onOpenPoll}
          disabled={disabled}
          title="Poll plaatsen"
        >
          <BarChart3 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-9 w-9 shrink-0"
          onClick={() => setShowEmoji((s) => !s)}
          disabled={disabled}
          title="Emoji"
        >
          <Smile className="h-4 w-4" />
        </Button>
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => handleChange(e.target.value.slice(0, 2000))}
          onKeyDown={onKeyDown}
          placeholder="Schrijf een bericht… gebruik @ voor mentions"
          className="flex-1 h-9 text-sm"
          disabled={disabled || sending}
          maxLength={2000}
        />
        <Button onClick={send} disabled={!value.trim() || sending || disabled} size="icon" className="h-9 w-9 shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
