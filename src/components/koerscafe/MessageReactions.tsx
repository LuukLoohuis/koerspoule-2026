import { useMemo } from "react";
import { Smile } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ChatReactionRow } from "@/hooks/useChatRealtime";

const QUICK_REACTIONS = ["👍", "❤️", "🔥", "😂", "🚴"];

interface Props {
  messageId: string;
  reactions: ChatReactionRow[];
  myUserId: string | undefined;
  profileNames: Record<string, string>;
  onToggle: (emoji: string) => void;
}

export default function MessageReactions({ messageId, reactions, myUserId, profileNames, onToggle }: Props) {
  const my = reactions.filter((r) => r.message_id === messageId);
  const grouped = useMemo(() => {
    const map = new Map<string, ChatReactionRow[]>();
    for (const r of my) {
      const arr = map.get(r.emoji) ?? [];
      arr.push(r);
      map.set(r.emoji, arr);
    }
    return Array.from(map.entries());
  }, [my]);

  return (
    <div className="flex items-center gap-1 flex-wrap mt-1">
      {grouped.map(([emoji, rs]) => {
        const mine = rs.some((r) => r.user_id === myUserId);
        const names = rs.map((r) => profileNames[r.user_id] ?? "…").join(", ");
        return (
          <Tooltip key={emoji}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onToggle(emoji)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border transition-all",
                  mine
                    ? "bg-primary/15 border-primary/40 text-primary font-bold"
                    : "bg-secondary/60 border-border hover:bg-secondary"
                )}
              >
                <span>{emoji}</span>
                <span className="tabular-nums">{rs.length}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs max-w-[200px]">
              {names}
            </TooltipContent>
          </Tooltip>
        );
      })}
      <div className="group relative">
        <button
          className="inline-flex items-center justify-center rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-secondary opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
          aria-label="Reactie toevoegen"
        >
          <Smile className="h-3.5 w-3.5" />
        </button>
        <div className="absolute bottom-full left-0 mb-1 hidden group-focus-within:flex group-hover:flex bg-popover border border-border rounded-full shadow-lg p-1 gap-0.5 z-10">
          {QUICK_REACTIONS.map((e) => (
            <button
              key={e}
              onClick={() => onToggle(e)}
              className="hover:bg-secondary rounded-full w-7 h-7 flex items-center justify-center text-base"
            >
              {e}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
