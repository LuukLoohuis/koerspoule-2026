import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BarChart3, Clock } from "lucide-react";
import type { ChatPollRow, ChatPollVoteRow } from "@/hooks/useChatRealtime";

interface Props {
  poll: ChatPollRow;
  votes: ChatPollVoteRow[];
  myUserId: string | undefined;
  onVote: (optionIndex: number) => void;
}

export default function PollCard({ poll, votes, myUserId, onVote }: Props) {
  const [submitting, setSubmitting] = useState<number | null>(null);
  const closed = poll.deadline ? new Date(poll.deadline) <= new Date() : false;

  const myVote = useMemo(
    () => votes.find((v) => v.poll_id === poll.id && v.user_id === myUserId),
    [votes, poll.id, myUserId]
  );

  const counts = useMemo(() => {
    const arr = poll.options.map(() => 0);
    for (const v of votes.filter((x) => x.poll_id === poll.id)) {
      if (v.option_index >= 0 && v.option_index < arr.length) arr[v.option_index]++;
    }
    return arr;
  }, [votes, poll]);

  const total = counts.reduce((a, b) => a + b, 0);

  const handleVote = async (idx: number) => {
    if (closed) return;
    setSubmitting(idx);
    try {
      await onVote(idx);
    } finally {
      setSubmitting(null);
    }
  };

  const deadlineLabel = poll.deadline
    ? new Date(poll.deadline).toLocaleString("nl-NL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <BarChart3 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="font-display font-bold text-sm leading-snug">{poll.question}</div>
          </div>
          {closed && <Badge variant="secondary" className="text-[10px] shrink-0">Gesloten</Badge>}
        </div>

        <div className="space-y-1.5">
          {poll.options.map((opt, idx) => {
            const c = counts[idx];
            const pct = total > 0 ? Math.round((c / total) * 100) : 0;
            const mine = myVote?.option_index === idx;
            return (
              <button
                key={idx}
                disabled={closed || submitting !== null}
                onClick={() => handleVote(idx)}
                className={cn(
                  "relative w-full rounded-md border text-left text-sm overflow-hidden transition-all group",
                  mine ? "border-primary bg-primary/5" : "border-border hover:border-primary/60",
                  (closed || submitting !== null) && "cursor-default"
                )}
              >
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 transition-all duration-500",
                    mine ? "bg-primary/20" : "bg-secondary/60"
                  )}
                  style={{ width: `${pct}%` }}
                />
                <div className="relative flex items-center justify-between px-3 py-1.5 gap-2">
                  <span className={cn("font-sans truncate", mine && "font-bold text-primary")}>
                    {opt} {mine && "✓"}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground shrink-0">
                    {c} · {pct}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{total} stem{total === 1 ? "" : "men"}</span>
          {deadlineLabel && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {closed ? "Gesloten" : "Sluit"} {deadlineLabel}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
