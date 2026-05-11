import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Check, X, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ChatAvatar from "./Avatar";
import MessageReactions from "./MessageReactions";
import PollCard from "./PollCard";
import type { ChatMessageRow, ChatReactionRow, ChatPollRow, ChatPollVoteRow } from "@/hooks/useChatRealtime";

interface Props {
  msg: ChatMessageRow;
  myUserId: string | undefined;
  isAdmin: boolean;
  profileNames: Record<string, string>;
  reactions: ChatReactionRow[];
  poll?: ChatPollRow;
  pollVotes: ChatPollVoteRow[];
  onEdit: (id: string, body: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggleReaction: (id: string, emoji: string) => Promise<void>;
  onVotePoll: (pollId: string, optionIndex: number) => Promise<void>;
}

function renderBody(body: string, profileNames: Record<string, string>) {
  // Highlight @mentions where the name matches a known display_name
  const knownNames = Object.values(profileNames).filter(Boolean);
  if (knownNames.length === 0) return body;
  const escaped = knownNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`@(${escaped.join("|")})\\b`, "gi");
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    if (m.index > last) parts.push(body.slice(last, m.index));
    parts.push(
      <span key={m.index} className="text-primary font-bold bg-primary/10 px-1 rounded">
        @{m[1]}
      </span>
    );
    last = m.index + m[0].length;
  }
  if (last < body.length) parts.push(body.slice(last));
  return parts;
}

export default function ChatMessage({
  msg, myUserId, isAdmin, profileNames, reactions, poll, pollVotes,
  onEdit, onDelete, onToggleReaction, onVotePoll,
}: Props) {
  const isMe = msg.user_id === myUserId;
  const canManage = isMe || isAdmin;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(msg.body);
  const [busy, setBusy] = useState(false);
  const name = profileNames[msg.user_id] ?? "…";

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const same = d.toDateString() === today.toDateString();
    const hh = d.getHours().toString().padStart(2, "0");
    const mm = d.getMinutes().toString().padStart(2, "0");
    return same ? `${hh}:${mm}` : `${d.getDate()}/${d.getMonth() + 1} ${hh}:${mm}`;
  };

  const submitEdit = async () => {
    const body = draft.trim();
    if (!body || body === msg.body) { setEditing(false); return; }
    setBusy(true);
    try {
      await onEdit(msg.id, body);
      setEditing(false);
    } finally { setBusy(false); }
  };

  const handleDelete = async () => {
    if (!confirm("Bericht verwijderen?")) return;
    setBusy(true);
    try { await onDelete(msg.id); } finally { setBusy(false); }
  };

  return (
    <div
      className={cn(
        "group px-3 py-2 transition-colors",
        isMe ? "bg-primary/5" : "hover:bg-secondary/30"
      )}
    >
      <div className="flex items-start gap-2.5">
        <ChatAvatar userId={msg.user_id} name={name} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-display font-bold text-sm">
              {name}
              {isMe && <span className="ml-1 text-[10px] font-sans font-normal text-muted-foreground">(jij)</span>}
            </span>
            <span className="text-[10px] text-muted-foreground font-sans">{formatTime(msg.created_at)}</span>
            {msg.edited_at && !msg.deleted_at && (
              <span className="text-[10px] text-muted-foreground italic">(bewerkt)</span>
            )}
          </div>

          {msg.deleted_at ? (
            <p className="text-sm font-sans italic text-muted-foreground mt-0.5">Dit bericht is verwijderd</p>
          ) : poll ? (
            <div className="mt-1.5">
              <PollCard poll={poll} votes={pollVotes} myUserId={myUserId} onVote={(idx) => onVotePoll(poll.id, idx)} />
            </div>
          ) : editing ? (
            <div className="flex items-center gap-1 mt-1">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, 2000))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); submitEdit(); }
                  if (e.key === "Escape") { setEditing(false); setDraft(msg.body); }
                }}
                disabled={busy}
                className="h-8 text-sm"
                autoFocus
              />
              <Button size="icon" className="h-8 w-8" onClick={submitEdit} disabled={busy}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditing(false); setDraft(msg.body); }} disabled={busy}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <p className="text-sm font-sans mt-0.5 text-foreground/90 whitespace-pre-wrap break-words">
              {renderBody(msg.body, profileNames)}
            </p>
          )}

          {!msg.deleted_at && !poll && (
            <MessageReactions
              messageId={msg.id}
              reactions={reactions}
              myUserId={myUserId}
              profileNames={profileNames}
              onToggle={(e) => onToggleReaction(msg.id, e)}
            />
          )}
        </div>

        {canManage && !msg.deleted_at && !editing && !poll && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-muted-foreground hover:text-foreground p-1 transition-opacity"
                aria-label="Meer"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {isMe && (
                <DropdownMenuItem onClick={() => { setDraft(msg.body); setEditing(true); }}>
                  <Pencil className="h-3.5 w-3.5 mr-2" /> Bewerken
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Verwijderen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
