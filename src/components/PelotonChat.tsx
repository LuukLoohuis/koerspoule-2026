import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useToast } from "@/hooks/use-toast";
import { useChatRealtime } from "@/hooks/useChatRealtime";
import { useSubpouleMembers } from "@/hooks/useSubpoules";
import ChatMessage from "@/components/koerscafe/ChatMessage";
import ChatInput from "@/components/koerscafe/ChatInput";
import UnreadDivider from "@/components/koerscafe/UnreadDivider";
import PollComposer from "@/components/koerscafe/PollComposer";
import ShareButton from "@/components/koerscafe/ShareButton";
import KoerscommentaarBanner from "@/components/koerscafe/KoerscommentaarBanner";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  subpoolName?: string;
  subpoolId?: string;
}

export default function PelotonChat({ subpoolName, subpoolId }: Props) {
  const { user, role } = useAuth();
  const { data: game } = useCurrentGame();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isAdmin = role === "admin";

  const { messages, reactions, polls, votes, loading } = useChatRealtime(subpoolId, game?.id);
  const { data: memberRows = [] } = useSubpouleMembers(subpoolId);
  const [profileNames, setProfileNames] = useState<Record<string, string>>({});
  const [lastReadAt, setLastReadAt] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showPollComposer, setShowPollComposer] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load read state once
  useEffect(() => {
    if (!supabase || !user || !subpoolId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("chat_read_states")
        .select("last_read_at")
        .eq("subpoule_id", subpoolId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) setLastReadAt(data?.last_read_at ?? null);
    })();
  }, [user?.id, subpoolId]);

  // Mark as read when chat opens (after small delay) and on unmount
  useEffect(() => {
    if (!supabase || !subpoolId || !user) return;
    const t = setTimeout(() => {
      supabase.rpc("mark_subpoule_read", { p_subpoule_id: subpoolId }).then(() => {
        qc.invalidateQueries({ queryKey: ["subpoule-unread"] });
      });
    }, 1500);
    return () => {
      clearTimeout(t);
      supabase.rpc("mark_subpoule_read", { p_subpoule_id: subpoolId }).then(() => {
        qc.invalidateQueries({ queryKey: ["subpoule-unread"] });
      });
    };
    // user?.id i.p.v. user: auth-events leveren een nieuwe user-ref met dezelfde
    // id; afhankelijk zijn van de id voorkomt overbodige mark_read-writes.
  }, [subpoolId, user?.id, qc]);

  // Hydrate profile names (members + message authors)
  useEffect(() => {
    if (!supabase) return;
    const ids = new Set<string>();
    memberRows.forEach((m) => ids.add(m.user_id));
    messages.forEach((m) => ids.add(m.user_id));
    const missing = Array.from(ids).filter((id) => !profileNames[id]);
    if (missing.length === 0) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("id, display_name").in("id", missing);
      if (data) {
        setProfileNames((prev) => {
          const next = { ...prev };
          for (const p of data) next[p.id] = p.display_name ?? "Onbekend";
          return next;
        });
      }
    })();
  }, [memberRows, messages, profileNames]);

  // Detect scroll position
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAutoScroll(dist < 60);
  };

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, autoScroll]);

  const visibleMessages = useMemo(
    () => messages.filter((m) => !!m.created_at),
    [messages]
  );

  const firstUnreadIndex = useMemo(() => {
    if (!lastReadAt) return -1;
    const lr = new Date(lastReadAt).getTime();
    const idx = visibleMessages.findIndex((m) => new Date(m.created_at).getTime() > lr && m.user_id !== user?.id);
    return idx;
  }, [visibleMessages, lastReadAt, user?.id]);

  const unreadCount = firstUnreadIndex >= 0 ? visibleMessages.length - firstUnreadIndex : 0;

  const pollByMessage = useMemo(() => {
    const map = new Map<string, typeof polls[number]>();
    for (const p of polls) if (p.message_id) map.set(p.message_id, p);
    return map;
  }, [polls]);

  const mentionTargets = useMemo(
    () => memberRows.map((m) => ({ user_id: m.user_id, display_name: m.display_name || "Onbekend" })),
    [memberRows]
  );

  const send = async (body: string, mentions: string[]) => {
    if (!supabase || !user || !game?.id || !subpoolId) return;
    const { error } = await supabase.from("chat_messages").insert({
      subpoule_id: subpoolId,
      game_id: game.id,
      user_id: user.id,
      body,
      mentions,
    });
    if (error) {
      toast({ title: "Versturen mislukt", description: error.message, variant: "destructive" });
    } else {
      setAutoScroll(true);
    }
  };

  const editMsg = async (id: string, body: string) => {
    if (!supabase) return;
    const { error } = await supabase.rpc("edit_chat_message", { p_message_id: id, p_body: body });
    if (error) toast({ title: "Bewerken mislukt", description: error.message, variant: "destructive" });
  };

  const deleteMsg = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.rpc("soft_delete_chat_message", { p_message_id: id });
    if (error) toast({ title: "Verwijderen mislukt", description: error.message, variant: "destructive" });
  };

  const toggleReaction = async (id: string, emoji: string) => {
    if (!supabase) return;
    const { error } = await supabase.rpc("toggle_chat_reaction", { p_message_id: id, p_emoji: emoji });
    if (error) toast({ title: "Reactie mislukt", description: error.message, variant: "destructive" });
  };

  const votePoll = async (pollId: string, idx: number) => {
    if (!supabase) return;
    const { error } = await supabase.rpc("cast_chat_poll_vote", { p_poll_id: pollId, p_option_index: idx });
    if (error) toast({ title: "Stemmen mislukt", description: error.message, variant: "destructive" });
  };

  const createPoll = async (question: string, options: string[], deadline: string | null) => {
    if (!supabase || !subpoolId || !game?.id) return;
    const { error } = await supabase.rpc("create_chat_poll", {
      p_subpoule_id: subpoolId,
      p_game_id: game.id,
      p_question: question,
      p_options: options,
      p_deadline: deadline,
    });
    if (error) toast({ title: "Poll plaatsen mislukt", description: error.message, variant: "destructive" });
  };

  if (!subpoolId) {
    return (
      <Card className="retro-border">
        <CardContent className="p-6 text-sm text-muted-foreground">
          Selecteer een subpoule om het Koerscafé te openen.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="retro-border overflow-hidden">
      <CardHeader className="border-b-2 border-foreground bg-secondary/50 py-2.5 px-4">
        <CardTitle className="font-display text-base flex items-center gap-2 justify-between">
          <span className="flex items-center gap-2 min-w-0">
            <MessageCircle className="h-5 w-5 text-primary shrink-0" />
            <span className="truncate">Koerscafé{subpoolName ? ` — ${subpoolName}` : ""}</span>
          </span>
          <ShareButton subpouleId={subpoolId} subpouleName={subpoolName} />
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <KoerscommentaarBanner subpouleId={subpoolId} />
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="relative h-[60vh] max-h-[520px] overflow-y-auto divide-y divide-border/60 bg-background"
        >
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Berichten laden…</div>
          ) : visibleMessages.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Nog geen berichten. Start de conversatie! 💬
            </div>
          ) : (
            visibleMessages.map((m, i) => (
              <div key={m.id}>
                {i === firstUnreadIndex && unreadCount > 0 && <UnreadDivider count={unreadCount} />}
                <ChatMessage
                  msg={m}
                  myUserId={user?.id}
                  isAdmin={isAdmin}
                  profileNames={profileNames}
                  reactions={reactions}
                  poll={pollByMessage.get(m.id)}
                  pollVotes={votes}
                  onEdit={editMsg}
                  onDelete={deleteMsg}
                  onToggleReaction={toggleReaction}
                  onVotePoll={votePoll}
                />
              </div>
            ))
          )}
          <div ref={bottomRef} />

          {!autoScroll && (
            <Button
              size="sm"
              className="absolute bottom-3 right-3 h-8 rounded-full shadow-lg gap-1"
              onClick={() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); setAutoScroll(true); }}
            >
              <ChevronDown className="h-3.5 w-3.5" /> Nieuwste
            </Button>
          )}
        </div>

        {showPollComposer && (
          <PollComposer onCreate={createPoll} onClose={() => setShowPollComposer(false)} />
        )}

        <ChatInput
          onSend={send}
          onOpenPoll={() => setShowPollComposer((s) => !s)}
          members={mentionTargets}
          disabled={!user}
        />
      </CardContent>
    </Card>
  );
}
