import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Send, MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useToast } from "@/hooks/use-toast";

type ChatRow = {
  id: string;
  subpoule_id: string | null;
  game_id: string;
  user_id: string;
  body: string;
  created_at: string;
  display_name?: string | null;
};

interface PelotonChatProps {
  subpoolName?: string;
  subpoolId?: string; // real subpoule UUID
}

export default function PelotonChat({ subpoolName, subpoolId }: PelotonChatProps) {
  const { user } = useAuth();
  const { data: game } = useCurrentGame();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatRow[]>([]);
  const [profileNames, setProfileNames] = useState<Record<string, string>>({});
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    if (!supabase || !game?.id || !subpoolId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, subpoule_id, game_id, user_id, body, created_at")
        .eq("game_id", game.id)
        .eq("subpoule_id", subpoolId)
        .order("created_at", { ascending: true })
        .limit(500);
      if (!cancelled) {
        if (error) {
          toast({ title: "Chat laden mislukt", description: error.message, variant: "destructive" });
        } else {
          setMessages((data ?? []) as ChatRow[]);
        }
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [game?.id, subpoolId, toast]);

  // Lightweight polling instead of realtime — fetch only newer messages every 60s
  useEffect(() => {
    if (!supabase || !game?.id || !subpoolId) return;
    const interval = setInterval(async () => {
      const lastTs = messages.length > 0 ? messages[messages.length - 1].created_at : null;
      let q = supabase
        .from("chat_messages")
        .select("id, subpoule_id, game_id, user_id, body, created_at")
        .eq("game_id", game.id)
        .eq("subpoule_id", subpoolId)
        .order("created_at", { ascending: true })
        .limit(100);
      if (lastTs) q = q.gt("created_at", lastTs);
      const { data } = await q;
      if (data && data.length > 0) {
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          const fresh = (data as ChatRow[]).filter((m) => !seen.has(m.id));
          return fresh.length > 0 ? [...prev, ...fresh] : prev;
        });
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [game?.id, subpoolId, messages]);

  // Hydrate display names
  useEffect(() => {
    if (!supabase) return;
    const missing = Array.from(new Set(messages.map((m) => m.user_id))).filter((id) => !profileNames[id]);
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
  }, [messages, profileNames]);

  // Auto-scroll on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    if (!newMessage.trim() || !supabase || !user || !game?.id || !subpoolId) return;
    setSending(true);
    const body = newMessage.trim();
    const { error } = await supabase.from("chat_messages").insert({
      subpoule_id: subpoolId,
      game_id: game.id,
      user_id: user.id,
      body,
    });
    setSending(false);
    if (error) {
      toast({ title: "Versturen mislukt", description: error.message, variant: "destructive" });
      return;
    }
    setNewMessage("");
    // Optimistic refresh: refetch immediately so the user sees their own message
    const { data } = await supabase
      .from("chat_messages")
      .select("id, subpoule_id, game_id, user_id, body, created_at")
      .eq("game_id", game.id)
      .eq("subpoule_id", subpoolId)
      .order("created_at", { ascending: true })
      .limit(500);
    if (data) setMessages(data as ChatRow[]);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const same = d.toDateString() === today.toDateString();
    const hh = d.getHours().toString().padStart(2, "0");
    const mm = d.getMinutes().toString().padStart(2, "0");
    if (same) return `Vandaag ${hh}:${mm}`;
    return `${d.getDate()}/${d.getMonth() + 1} ${hh}:${mm}`;
  };

  const myId = user?.id;

  if (!subpoolId) {
    return (
      <Card className="retro-border">
        <CardContent className="p-6 text-sm text-muted-foreground">
          Selecteer een subpoule om de chat te openen.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="retro-border">
        <CardHeader className="border-b-2 border-foreground bg-secondary/50 py-3 px-4">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Koerscafé{subpoolName ? ` — ${subpoolName}` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[420px] overflow-y-auto divide-y divide-border">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Berichten laden…</div>
            ) : messages.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Nog geen berichten. Start de conversatie! 💬
              </div>
            ) : (
              messages.map((msg) => {
                const name = profileNames[msg.user_id] ?? "…";
                const isMe = msg.user_id === myId;
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "px-4 py-3 hover:bg-secondary/30 transition-colors",
                      isMe && "bg-primary/5"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-display font-bold shrink-0",
                          isMe ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                        )}
                      >
                        {(name || "?").charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="font-display font-bold text-sm">
                            {name}
                            {isMe && (
                              <span className="text-xs font-sans text-muted-foreground ml-1">(jij)</span>
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground font-sans">{formatTime(msg.created_at)}</span>
                        </div>
                        <p className="text-sm font-sans mt-0.5 text-foreground/90 whitespace-pre-wrap break-words">{msg.body}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t-2 border-foreground p-3 flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value.slice(0, 2000))}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Schrijf een bericht..."
              className="flex-1 font-sans text-sm"
              maxLength={2000}
              disabled={!user || sending}
            />
            <Button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending || !user}
              size="sm"
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
