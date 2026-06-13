import { useMemo, useState, useEffect } from "react";
type Props = { gameId?: string; gameName?: string; gameStatus?: string };
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useSubpoules, useSubpouleMembers } from "@/hooks/useSubpoules";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import PelotonChat from "@/components/PelotonChat";
import SubpouleStandings from "@/components/SubpouleStandings";
import SubpouleEvolutionChart from "@/components/SubpouleEvolutionChart";
import DaguitslagChart from "@/components/DaguitslagChart";
import SubpouleHeatmap from "@/components/SubpouleHeatmap";
import { Copy, LogOut, Trash2, Users, Crown, UserMinus, ArrowLeft, ChevronRight, MessageCircle, TrendingUp, Flame, Share2, ListTree, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SubpouleManager({ gameId, gameName, gameStatus }: Props = {}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: currentGame } = useCurrentGame();
  const effectiveGameId = gameId ?? currentGame?.id;
  const effectiveStatus = gameStatus ?? currentGame?.status;
  const heatmapUnlocked = ["live", "locked", "finished", "closed"].includes(String(effectiveStatus ?? ""));
  const game = gameId
    ? { id: gameId, name: gameName ?? "" }
    : currentGame;
  const { subpoules, isLoading, create, join, leave, remove, removeMember } = useSubpoules(effectiveGameId);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("chart");
  // Mobiel: chat opent als floating bottom-sheet i.p.v. een tab.
  const [chatOpen, setChatOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createCode, setCreateCode] = useState("");
  const [joinCode, setJoinCode] = useState("");

  // Deeplink support: ?subpoule=...&view=koerscafe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const spId = params.get("subpoule");
    const view = params.get("view");
    if (spId) {
      const match = subpoules.find((s) => s.id === spId);
      if (match) {
        setActiveId(spId);
        if (view === "koerscafe") {
          setActiveTab("chat"); // desktop-tab
          setChatOpen(true);    // mobiel bottom-sheet
        }
        // Clean up query params so the URL stays clean
        const url = new URL(window.location.href);
        url.searchParams.delete("subpoule");
        url.searchParams.delete("view");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [subpoules]);

  const active = useMemo(
    () => (activeId ? subpoules.find((s) => s.id === activeId) ?? null : null),
    [subpoules, activeId]
  );
  const { data: members = [] } = useSubpouleMembers(active?.id);

  const handleCreate = async () => {
    if (!effectiveGameId) {
      toast({ title: "Geen koers geselecteerd", description: "Kies eerst een koers in Mijn Peloton.", variant: "destructive" });
      return;
    }
    if (createName.trim().length < 2) {
      toast({ title: "Naam te kort", description: "Minimaal 2 tekens.", variant: "destructive" });
      return;
    }
    if (createCode.trim().length < 4) {
      toast({ title: "Code te kort", description: "Minimaal 4 tekens.", variant: "destructive" });
      return;
    }
    try {
      const id = await create.mutateAsync({ name: createName.trim(), code: createCode.trim() });
      toast({ title: "Subpoule aangemaakt", description: createName });
      setCreateName(""); setCreateCode("");
      setActiveId(id);
    } catch (e: unknown) {
      console.error("[SubpouleManager] create failed", e);
      const err = e as { message?: string; error_description?: string; details?: string; hint?: string } | null;
      const msg =
        err?.message ||
        err?.error_description ||
        err?.details ||
        err?.hint ||
        "Onbekende fout. Probeer een andere naam of code.";
      toast({ title: "Aanmaken mislukt", description: msg, variant: "destructive" });
    }
  };

  const handleJoin = async () => {
    try {
      const id = await join.mutateAsync({ code: joinCode });
      toast({ title: "Welkom in de subpoule!" });
      setJoinCode("");
      setActiveId(id);
    } catch (e) {
      toast({ title: "Joinen mislukt", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const handleLeave = async (id: string) => {
    if (!confirm("Subpoule verlaten?")) return;
    try {
      await leave.mutateAsync({ subpouleId: id });
      toast({ title: "Subpoule verlaten" });
      if (activeId === id) setActiveId(null);
    } catch (e) {
      toast({ title: "Verlaten mislukt", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Subpoule definitief verwijderen? Dit kan niet ongedaan worden.")) return;
    try {
      await remove.mutateAsync({ subpouleId: id });
      toast({ title: "Subpoule verwijderd" });
      if (activeId === id) setActiveId(null);
    } catch (e) {
      toast({ title: "Verwijderen mislukt", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const handleRemoveMember = async (subpouleId: string, userId: string, name: string) => {
    if (!confirm(`${name} verwijderen uit de subpoule?`)) return;
    try {
      await removeMember.mutateAsync({ subpouleId, userId });
      toast({ title: "Lid verwijderd" });
    } catch (e) {
      toast({ title: "Verwijderen mislukt", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Code gekopieerd", description: code });
  };

  // "Roep je kopgroep" — deel een uitnodiging via het systeem-deelvenster
  // (WhatsApp etc) op mobiel; valt terug op kopiëren naar klembord op desktop.
  const shareInvite = async (name: string, code: string) => {
    const url = "https://koerspoule.nl/mijn-peloton?tab=subpoules";
    const text =
      `🚴 Doe mee met mijn Koerspoule "${name}"!\n` +
      `Toegangscode: ${code}\n` +
      `Maak gratis een account en sluit aan: ${url}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: `Koerspoule — ${name}`, text, url });
        return;
      }
    } catch {
      // gebruiker annuleerde het deelvenster — geen fout tonen
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Uitnodiging gekopieerd", description: "Plak 'm in je groepsapp." });
    } catch {
      toast({ title: "Kopiëren mislukt", description: text, variant: "destructive" });
    }
  };

  if (!user) {
    return <div className="retro-border bg-card p-6 text-muted-foreground">Log in om subpoules te beheren.</div>;
  }
  if (!game) {
    return <div className="retro-border bg-card p-6 text-muted-foreground">Geen actieve koers gevonden.</div>;
  }

  // Drilldown view: when a subpoule is selected, show only its detail tab
  if (active && activeId) {
    // ── Gedeelde panelen — hergebruikt op mobiel (één scrollpagina) en
    //    desktop (tabs), zodat er geen render-duplicatie ontstaat. ──
    const deelnemersSection = (
      <Card className="retro-border">
        <CardHeader className="border-b-2 border-foreground bg-secondary/30">
          <CardTitle className="font-display flex items-center justify-between gap-2 flex-wrap">
            <span className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Deelnemers
              {active.is_owner && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Crown className="h-3 w-3" /> Eigenaar
                </Badge>
              )}
            </span>
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              Code: {active.code}
              <button
                onClick={() => copyCode(active.code)}
                className="hover:text-foreground"
                title="Kopieer code"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {members.map((m) => (
              <div key={m.user_id} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{m.display_name}</span>
                  {m.user_id === active.owner_user_id && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Crown className="h-3 w-3" /> Eigenaar
                    </Badge>
                  )}
                  {m.user_id === user.id && (
                    <Badge variant="outline" className="text-xs">jij</Badge>
                  )}
                </div>
                {active.is_owner && m.user_id !== active.owner_user_id && (
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => handleRemoveMember(active.id, m.user_id, m.display_name)}
                    className="text-destructive hover:text-destructive"
                  >
                    <UserMinus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );

    // Losse panelen — als ankerbare secties (mobiel) en in de Grafiek-tab (desktop).
    const standingsPanel = (
      <SubpouleStandings subpouleId={active.id} subpouleName={active.name} gameId={effectiveGameId} gameStatus={gameStatus} showEvolution={false} />
    );
    const evolutionPanel = (
      <SubpouleEvolutionChart subpouleId={active.id} gameId={effectiveGameId} title="Stijgers & Dalers" />
    );
    const daguitslagPanel = (
      <DaguitslagChart subpouleId={active.id} subpouleName={active.name} gameId={effectiveGameId} gameStatus={gameStatus} />
    );

    const chartPanels = (
      <>
        {standingsPanel}
        {evolutionPanel}
        {daguitslagPanel}
      </>
    );

    // Smooth-scroll naar een sectie-anker (mobiele "spring naar"-knop).
    const jumpTo = (id: string) =>
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

    const heatmapPanel = (
      <div key={heatmapUnlocked ? "heatmap-unlocked" : "heatmap-locked"}>
        {heatmapUnlocked ? (
          <SubpouleHeatmap subpouleId={active.id} />
        ) : (
          <Card className="retro-border">
            <CardContent className="p-4 text-sm text-muted-foreground text-center space-y-2">
              <Flame className="h-8 w-8 text-muted-foreground/50 mx-auto" />
              <p className="font-display font-bold text-foreground">Heatmap nog vergrendeld</p>
              <p>De heatmap gaat open zodra de admin de inschrijving sluit en de koers live zet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    );

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => setActiveId(null)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Terug naar subpoules
          </Button>
          <div className="flex items-center gap-2">
            {active.is_owner ? (
              <Button
                variant="ghost" size="sm"
                onClick={() => handleDelete(active.id)}
                className="text-destructive hover:text-destructive gap-1"
              >
                <Trash2 className="h-4 w-4" /> Verwijderen
              </Button>
            ) : (
              <Button
                variant="ghost" size="sm"
                onClick={() => handleLeave(active.id)}
                className="gap-1"
              >
                <LogOut className="h-4 w-4" /> Verlaten
              </Button>
            )}
          </div>
        </div>

        {/* Roep je kopgroep — altijd zichtbaar als je een subpoule open hebt
            (voedt de virale lus). */}
        <div className="retro-border bg-[hsl(var(--vintage-gold)/0.12)] p-3 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[180px]">
            <p className="font-display font-bold text-sm">🚴 {active.name}</p>
            <p className="text-xs text-muted-foreground">
              Hoe meer renners, hoe mooier de strijd. Nodig vrienden uit met code{" "}
              <button onClick={() => copyCode(active.code)} className="font-mono font-bold text-foreground underline decoration-dotted underline-offset-2" title="Kopieer code">
                {active.code}
              </button>
              .
            </p>
          </div>
          <button
            onClick={() => shareInvite(active.name, active.code)}
            className="inline-flex items-center gap-2 shrink-0 px-4 py-2 rounded-md bg-primary text-primary-foreground font-bold text-sm border-2 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] hover:brightness-105 active:translate-y-px active:shadow-[2px_2px_0_hsl(var(--foreground))] transition-all"
          >
            <Share2 className="h-4 w-4" />
            Roep je kopgroep
          </button>
        </div>

        {/* ── MOBIEL: geen geneste tabbalk. Eén doorlopende scrollpagina met
             ankerbare secties: klassement → stijgers&dalers → daguitslag →
             heatmap → deelnemers. Chat + "spring naar" als floating knoppen. ── */}
        <div className="md:hidden space-y-4">
          <section id="sec-klassement" style={{ scrollMarginTop: 80 }}>{standingsPanel}</section>
          <section id="sec-klassementsverloop" style={{ scrollMarginTop: 80 }}>{evolutionPanel}</section>
          <section id="sec-daguitslag" style={{ scrollMarginTop: 80 }}>{daguitslagPanel}</section>
          <section id="sec-heatmap" style={{ scrollMarginTop: 80 }}>{heatmapPanel}</section>
          <section id="sec-deelnemers" style={{ scrollMarginTop: 80 }}>{deelnemersSection}</section>
        </div>

        {/* ── DESKTOP: behoud de tabs (Chat / Grafiek / Heatmap, geen Benchmark). ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="hidden md:block w-full">
          {/* Desktop tab nav — flush met de panelen eronder. */}
          <div className="overflow-x-auto mb-1" style={{ scrollbarWidth: "none" }}>
            <div className="flex gap-1 rounded-xl border-2 border-foreground/15 bg-secondary/30 p-1 min-w-max md:min-w-0 md:w-full">
              {([
                { value: "chat",    label: "Chat",    Icon: MessageCircle, disabled: false            },
                { value: "chart",   label: "Grafiek", Icon: TrendingUp,    disabled: false            },
                { value: "heatmap", label: "Heatmap", Icon: Flame,         disabled: !heatmapUnlocked },
              ] as const).map(({ value, label, Icon, disabled }) => (
                <button
                  key={value}
                  type="button"
                  disabled={disabled}
                  onClick={() => !disabled && setActiveTab(value)}
                  title={disabled ? "Beschikbaar zodra de inschrijving sluit en de koers live is" : undefined}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-lg px-3 min-h-[44px] text-xs font-semibold uppercase tracking-wider transition-colors flex-1",
                    disabled && "opacity-40 cursor-not-allowed",
                    !disabled && activeTab === value
                      ? "bg-card text-foreground shadow-sm border border-foreground/10"
                      : !disabled ? "text-muted-foreground hover:text-foreground hover:bg-secondary/60" : "text-muted-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <TabsContent value="chat" className="pt-3 space-y-3">
            <PelotonChat subpoolName={active.name} subpoolId={active.id} />
          </TabsContent>
          <TabsContent value="chart" className="pt-3 space-y-4">
            {chartPanels}
          </TabsContent>
          <TabsContent value="heatmap" className="pt-3">
            {heatmapPanel}
          </TabsContent>
        </Tabs>

        {/* Desktop: deelnemers altijd onderaan, los van de tabs. */}
        <div className="hidden md:block">
          {deelnemersSection}
        </div>

        {/* ── MOBIEL: "spring naar"-knop, net boven de chatknop. Opent een menu
             dat smooth naar de sectie-ankers scrollt. ── */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Spring naar sectie"
              className="md:hidden fixed right-4 bottom-[136px] z-40 inline-flex items-center justify-center h-14 w-14 rounded-full bg-secondary text-foreground border-2 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] active:translate-y-px active:shadow-[2px_2px_0_hsl(var(--foreground))] transition-all"
            >
              <ListTree className="h-6 w-6" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-52">
            <DropdownMenuItem asChild>
              <button type="button" className="w-full" onClick={() => jumpTo("sec-klassementsverloop")}>Stijgers &amp; Dalers</button>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <button type="button" className="w-full" onClick={() => jumpTo("sec-daguitslag")}>Daguitslag</button>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <button type="button" className="w-full" onClick={() => jumpTo("sec-heatmap")}>Heatmap</button>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <button type="button" className="w-full" onClick={() => jumpTo("sec-deelnemers")}>Deelnemers</button>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <button type="button" className="w-full gap-2" onClick={() => jumpTo("sec-klassement")}>
                <ArrowUp className="h-4 w-4" /> Bovenaan
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* ── MOBIEL: floating chat-knop, net boven de globale BottomNav
             (fixed bottom-0 z-50, ~60px). z-40 = onder de sheet-overlay (z-50)
             maar boven content. ── */}
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          aria-label="Open koerscafé-chat"
          className="md:hidden fixed right-4 bottom-[72px] z-40 inline-flex items-center justify-center h-14 w-14 rounded-full bg-primary text-primary-foreground border-2 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] active:translate-y-px active:shadow-[2px_2px_0_hsl(var(--foreground))] transition-all"
        >
          <MessageCircle className="h-6 w-6" />
          {/* TODO: ongelezen-badge zodra PelotonChat/chat-hook een unread-count
              naar buiten geeft. Nu geen badge (geen telling verzinnen). */}
        </button>

        {/* Chat bottom-sheet (mobiel). Hoog genoeg voor chat, eigen scroll. */}
        <Sheet open={chatOpen} onOpenChange={setChatOpen}>
          <SheetContent
            side="bottom"
            className="md:hidden h-[88vh] p-0 flex flex-col gap-0 rounded-t-2xl"
          >
            <SheetHeader className="px-4 py-3 border-b-2 border-foreground bg-secondary/30 text-left shrink-0">
              <SheetTitle className="font-display flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                Koerscafé — {active.name}
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
              <PelotonChat subpoolName={active.name} subpoolId={active.id} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // Overview: list + create/join
  return (
    <div className="space-y-4">
      <Card className="retro-border">
        <CardHeader className="border-b-2 border-foreground bg-secondary/30">
          <CardTitle className="font-display flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Mijn subpoules
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Laden…</div>
          ) : subpoules.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              Je zit nog in geen enkele subpoule. Maak er een aan of join met een code.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {subpoules.map((sp) => (
                <button
                  key={sp.id}
                  className="w-full p-4 flex items-center justify-between gap-3 hover:bg-secondary/30 transition-colors text-left"
                  onClick={() => setActiveId(sp.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-bold">{sp.name}</span>
                      {sp.is_owner && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Crown className="h-3 w-3" /> Eigenaar
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">{sp.member_count} leden</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">
                      Code: {sp.code}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="retro-border">
        <CardContent className="p-4">
          <Tabs defaultValue="create">
            <TabsList className="w-full">
              <TabsTrigger value="create" className="flex-1">Nieuwe subpoule</TabsTrigger>
              <TabsTrigger value="join" className="flex-1">Joinen via code</TabsTrigger>
            </TabsList>
            <TabsContent value="create" className="space-y-3 pt-3">
              <div>
                <Label htmlFor="sp-name">Naam</Label>
                <Input id="sp-name" value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Bijv. Vrienden van Jan" />
              </div>
              <div>
                <Label htmlFor="sp-code">Toegangscode</Label>
                <Input id="sp-code" value={createCode} onChange={(e) => setCreateCode(e.target.value)} placeholder="Min. 4 tekens" />
              </div>
              <Button onClick={handleCreate} disabled={create.isPending || !createName.trim() || !createCode.trim()} className="w-full">
                Subpoule aanmaken
              </Button>
            </TabsContent>
            <TabsContent value="join" className="space-y-3 pt-3">
              <div>
                <Label htmlFor="join-code">Toegangscode</Label>
                <Input id="join-code" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Vraag de eigenaar om de code" />
              </div>
              <Button onClick={handleJoin} disabled={join.isPending || !joinCode.trim()} className="w-full">
                Joinen
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
