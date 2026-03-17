import { useState, useMemo, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { mockStageResults } from "@/data/mockData";
import { Send, MessageCircle } from "lucide-react";

/* ── Mock chat data ── */

interface ChatMessage {
  id: string;
  userName: string;
  text: string;
  timestamp: string;
  stageContext?: number; // stage number
  reactions: Record<string, string[]>; // emoji -> userNames
}

const EMOJI_OPTIONS = ["🔥", "😂", "💪", "😢", "🤯", "👏", "🚴", "🏔️"];

const MY_NAME = "Jan-Willem";

function seededRng(seed: number) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
}

function generateMockMessages(): ChatMessage[] {
  const rng = seededRng(424242);
  const names = ["Pieter", "Sophie", "Kees", "Femke", "Bas", "Lotte", "Thijs", "Sanne", MY_NAME];

  const stageComments: Record<string, string[]> = {
    flat: [
      "Wat een sprint! 🚀", "Groves was echt kansloos vandaag", "Typische massasprint, niets aan",
      "Mijn sprinter stond er weer niet bij 😤", "Eindelijk punten voor mijn team!",
      "Die lead-out was perfect", "Kooij is een beest", "Boring etappe tot die laatste 500m",
    ],
    mountain: [
      "Wat een bergetappe!! 🏔️", "Roglič is niet te stoppen", "Mijn hele team zakt door het ijs",
      "Pellizzari klimt als een geit", "Die afdaling was angstaanjagend", "Eindelijk punten bergop!",
      "Tiberi viel helaas terug...", "Ayuso reed een slimme koers vandaag",
    ],
    hilly: [
      "Heuvelachtig maar mooie koers", "Die aanval op 30km was briljant", "Weer niks voor mijn sprinters",
      "Puncheurs-dag, lekker voor mijn team!", "Aular is een machine op deze heuvels",
      "Mooie solo van Pidcock", "Iemand anders ook 0 punten vandaag? 😅",
    ],
    itt: [
      "Tarling is een tijdritmonster ⏱️", "Roglič pakt weer roze!", "Mijn tijdrijders leveren eindelijk",
      "ITT = saai maar punten zijn punten", "Wat een verschil met de bergritten",
    ],
  };

  const generalComments = [
    "Iemand al punten geteld? Ik sta er slecht voor 😬",
    "Die joker-keuze gaat me nog opbreken...",
    "Wie heeft Pedersen eigenlijk NIET in zijn team?",
    "Morgen wordt de echte schifting 🔥",
    "Top 100 in de grote poule, wie nog meer?",
    "Mijn voorspellingen kloppen voor geen meter",
    "Halverwege en nog steeds hoop! 💪",
    `${MY_NAME}, jouw team is echt sterk dit jaar`,
    "Nog 5 etappes, alles kan nog!",
    "Die bergtrui-voorspelling was een schot in de roos",
  ];

  const messages: ChatMessage[] = [];
  let id = 0;

  // Generate ~3-5 messages per stage + some general
  for (let stageIdx = 0; stageIdx < 21; stageIdx++) {
    const stage = mockStageResults[stageIdx];
    const typeComments = stageComments[stage.type] || stageComments.flat;
    const msgCount = 2 + Math.floor(rng() * 4);

    for (let m = 0; m < msgCount; m++) {
      const name = names[Math.floor(rng() * names.length)];
      const isGeneral = rng() > 0.7;
      const text = isGeneral
        ? generalComments[Math.floor(rng() * generalComments.length)]
        : typeComments[Math.floor(rng() * typeComments.length)];

      const hour = 16 + Math.floor(rng() * 6);
      const minute = Math.floor(rng() * 60);

      // Random reactions
      const reactions: Record<string, string[]> = {};
      const reactionCount = Math.floor(rng() * 4);
      for (let r = 0; r < reactionCount; r++) {
        const emoji = EMOJI_OPTIONS[Math.floor(rng() * EMOJI_OPTIONS.length)];
        const reactor = names[Math.floor(rng() * names.length)];
        if (!reactions[emoji]) reactions[emoji] = [];
        if (!reactions[emoji].includes(reactor)) reactions[emoji].push(reactor);
      }

      messages.push({
        id: `msg-${id++}`,
        userName: name,
        text,
        timestamp: `${stage.date} ${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
        stageContext: stageIdx + 1,
        reactions,
      });
    }
  }

  return messages;
}

const allMessages = generateMockMessages();

/* ── Component ── */

interface PelotonChatProps {
  subpoolName?: string;
  members?: string[];
}

export default function PelotonChat({ subpoolName, members }: PelotonChatProps) {
  const [filter, setFilter] = useState<"all" | number>("all");
  const [newMessage, setNewMessage] = useState("");
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>(allMessages);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Sync filter to selected stage from parent
  useEffect(() => {
    if (selectedStage !== undefined) {
      setFilter(selectedStage + 1);
    }
  }, [selectedStage]);

  const filteredMessages = useMemo(() => {
    if (filter === "all") return localMessages;
    return localMessages.filter((m) => m.stageContext === filter);
  }, [filter, localMessages]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    const now = new Date();
    const msg: ChatMessage = {
      id: `msg-local-${Date.now()}`,
      userName: MY_NAME,
      text: newMessage.trim(),
      timestamp: `Vandaag ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`,
      stageContext: filter === "all" ? undefined : filter,
      reactions: {},
    };
    setLocalMessages((prev) => [...prev, msg]);
    setNewMessage("");
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const toggleReaction = (msgId: string, emoji: string) => {
    setLocalMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const reactions = { ...m.reactions };
        const users = reactions[emoji] ? [...reactions[emoji]] : [];
        const myIdx = users.indexOf(MY_NAME);
        if (myIdx >= 0) {
          users.splice(myIdx, 1);
          if (users.length === 0) delete reactions[emoji]; else reactions[emoji] = users;
        } else {
          reactions[emoji] = [...users, MY_NAME];
        }
        return { ...m, reactions };
      })
    );
  };

  // Group messages by stage
  const stageNumbers = [...new Set(localMessages.map((m) => m.stageContext).filter(Boolean))] as number[];
  stageNumbers.sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      {/* Stage filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "shrink-0 px-3 py-1.5 text-xs font-display font-bold rounded-md border-2 transition-all",
            filter === "all"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border hover:border-muted-foreground"
          )}
        >
          Alles
        </button>
        {stageNumbers.map((sn) => {
          const stage = mockStageResults[sn - 1];
          return (
            <button
              key={sn}
              onClick={() => setFilter(sn)}
              className={cn(
                "shrink-0 px-3 py-1.5 text-xs font-display font-bold rounded-md border-2 transition-all",
                filter === sn
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-muted-foreground"
              )}
            >
              Rit {sn}
              {stage && (
                <span className="ml-1 opacity-70">
                  {stage.type === "mountain" ? "🏔️" : stage.type === "itt" ? "⏱️" : stage.type === "hilly" ? "⛰️" : "🏁"}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Messages */}
      <Card className="retro-border">
        <CardHeader className="border-b-2 border-foreground bg-secondary/50 py-3 px-4">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Peloton Chat
            {filter !== "all" && (
              <span className="text-xs font-sans font-normal text-muted-foreground ml-2">
                Rit {filter} • {mockStageResults[(filter as number) - 1]?.route}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[420px] overflow-y-auto divide-y divide-border">
            {filteredMessages.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Nog geen berichten. Start de conversatie! 💬
              </div>
            ) : (
              filteredMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "px-4 py-3 hover:bg-secondary/30 transition-colors",
                    msg.userName === MY_NAME && "bg-primary/5"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-display font-bold shrink-0",
                        msg.userName === MY_NAME
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                      )}
                    >
                      {msg.userName.charAt(0)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-display font-bold text-sm">
                          {msg.userName}
                          {msg.userName === MY_NAME && (
                            <span className="text-xs font-sans text-muted-foreground ml-1">(jij)</span>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground font-sans">{msg.timestamp}</span>
                        {msg.stageContext && filter === "all" && (
                          <button
                            onClick={() => setFilter(msg.stageContext!)}
                            className="text-xs text-primary/70 hover:text-primary font-sans"
                          >
                            Rit {msg.stageContext}
                          </button>
                        )}
                      </div>
                      <p className="text-sm font-sans mt-0.5 text-foreground/90">{msg.text}</p>

                      {/* Reactions */}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {Object.entries(msg.reactions).map(([emoji, users]) => (
                          <button
                            key={emoji}
                            onClick={() => toggleReaction(msg.id, emoji)}
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all",
                              users.includes(MY_NAME)
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border hover:border-muted-foreground text-muted-foreground"
                            )}
                            title={users.join(", ")}
                          >
                            <span>{emoji}</span>
                            <span className="font-display font-bold">{users.length}</span>
                          </button>
                        ))}

                        {/* Add reaction button */}
                        <ReactionPicker
                          onSelect={(emoji) => toggleReaction(msg.id, emoji)}
                          existingEmojis={Object.keys(msg.reactions)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t-2 border-foreground p-3 flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={filter === "all" ? "Schrijf een bericht..." : `Reactie op Rit ${filter}...`}
              className="flex-1 font-sans text-sm"
            />
            <Button
              onClick={handleSend}
              disabled={!newMessage.trim()}
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

/* ── Emoji picker inline ── */
function ReactionPicker({
  onSelect,
  existingEmojis,
}: {
  onSelect: (emoji: string) => void;
  existingEmojis: string[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-dashed border-border hover:border-muted-foreground text-muted-foreground text-xs transition-all"
        title="Reageer"
      >
        +
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-1 bg-background border-2 border-foreground rounded-lg shadow-lg p-1.5 flex gap-1 z-50 animate-scale-in">
          {EMOJI_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onSelect(emoji);
                setOpen(false);
              }}
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded hover:bg-secondary transition-colors text-base",
                existingEmojis.includes(emoji) && "bg-primary/10"
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
