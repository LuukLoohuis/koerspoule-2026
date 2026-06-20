import { useMemo, useState, useEffect, useRef } from "react";
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
import { MobielTabBalk } from "@/components/MobielTabBalk";
import { RetroTabs } from "@/components/RetroTabs";
import FloatingTabSwitcher from "@/components/FloatingTabSwitcher";
import SwipeHintBar from "@/components/SwipeHintBar";
import EmptyState from "@/components/EmptyState";
import SwipeCarousel from "@/components/SwipeCarousel";
import SwipeDots from "@/components/SwipeDots";
import { useSwipeHint } from "@/hooks/useSwipeHint";
import { useAutoHideOnScroll } from "@/hooks/useAutoHideOnScroll";
import PelotonChat from "@/components/PelotonChat";
import SubpouleStandings from "@/components/SubpouleStandings";
import SubpouleEvolutionChart from "@/components/SubpouleEvolutionChart";
import DaguitslagChart from "@/components/DaguitslagChart";
import DaguitslagCelebration from "@/components/DaguitslagCelebration";
import { useDaguitslagCelebration } from "@/hooks/useDaguitslagCelebration";
import SubpouleHeatmap from "@/components/SubpouleHeatmap";
import { Copy, LogOut, Trash2, Users, Crown, UserMinus, ArrowLeft, ChevronRight, MessageCircle, TrendingUp, Flame, Share2, BarChart3, Trophy, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Mobiele subpoule-tabs (zoals Hors Categorie). Eén paneel tegelijk.
type SubTab = { key: string; label: string; Icon: LucideIcon };
const SUB_TABS: SubTab[] = [
  { key: "klassement", label: "Ranking", Icon: Trophy },
  { key: "verloop", label: "Stijgers & Dalers", Icon: TrendingUp },
  { key: "daguitslag", label: "Daguitslag", Icon: BarChart3 },
  { key: "heatmap", label: "Heatmap", Icon: Flame },
  { key: "deelnemers", label: "Deelnemers", Icon: Users },
];
const SUB_TAB_KEYS = SUB_TABS.map((t) => t.key);
const SUB_TAB_ITEMS = SUB_TABS.map((t) => ({ key: t.key, label: t.label, icon: t.Icon }));

export default function SubpouleManager({ gameId, gameName, gameStatus }: Props = {}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: currentGame } = useCurrentGame();
  const effectiveGameId = gameId ?? currentGame?.id;
  const effectiveStatus = gameStatus ?? currentGame?.status;
  const heatmapUnlocked = ["live", "locked", "finished", "closed"].includes(String(effectiveStatus ?? ""));
  // Subpoule aanmaken/joinen kan in álle statussen, behalve als de koers afgerond is.
  const subpoulesLocked = effectiveStatus === "finished";
  const game = gameId
    ? { id: gameId, name: gameName ?? "" }
    : currentGame;
  const { subpoules, isLoading, create, join, leave, remove, removeMember } = useSubpoules(effectiveGameId);

  const [activeId, setActiveId] = useState<string | null>(null);
  // Desktop: 5 dossard-tabs (gelijk aan mobiel). Chat is een apart zijpaneel.
  const [activeTab, setActiveTab] = useState("klassement");
  // Mobiel: chat opent als floating bottom-sheet i.p.v. een tab.
  const [chatOpen, setChatOpen] = useState(false);
  // Desktop: chat als rechter zijpaneel (los van de tabrij). Eigen staat zodat
  // de mobiele Sheet niet meeopent op desktop.
  const [deskChatOpen, setDeskChatOpen] = useState(false);
  // Mobiel: tab-gebaseerde subpoule-weergave (zoals Hors Categorie).
  const [mobileTab, setMobileTab] = useState<string>("klassement");
  const mobileHint = useSwipeHint("subpoule");
  const mobileBarVisible = useAutoHideOnScroll();
  const [createName, setCreateName] = useState("");
  const [createCode, setCreateCode] = useState("");
  const [joinCode, setJoinCode] = useState("");

  // Deeplink: ?subpoule=<id>&code=<code>&view=koerscafe. De code komt mee via de
  // /subpoule/<slug>-resolver zodat een niet-lid kan joinen. We onthouden het
  // doel en handelen het in een tweede effect af (zodat join → lijst-refresh →
  // openen netjes verloopt).
  const [pendingOpen, setPendingOpen] = useState<{ id: string; code?: string; view?: string } | null>(null);
  const joinedForRef = useRef<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const spId = params.get("subpoule");
    if (!spId) return;
    setPendingOpen({
      id: spId,
      code: params.get("code") ?? undefined,
      view: params.get("view") ?? undefined,
    });
    // URL meteen opschonen (subpoule/code/view weg).
    const url = new URL(window.location.href);
    url.searchParams.delete("subpoule");
    url.searchParams.delete("code");
    url.searchParams.delete("view");
    window.history.replaceState({}, "", url.toString());
  }, []);

  useEffect(() => {
    if (!pendingOpen) return;
    const match = subpoules.find((s) => s.id === pendingOpen.id);
    if (match) {
      setActiveId(match.id);
      if (pendingOpen.view === "koerscafe") {
        setChatOpen(true);     // mobiel bottom-sheet
        setDeskChatOpen(true); // desktop zijpaneel
      }
      setPendingOpen(null);
      return;
    }
    // Nog geen lid: join met de meegegeven code (één keer per id).
    if (pendingOpen.code && joinedForRef.current !== pendingOpen.id && !join.isPending) {
      joinedForRef.current = pendingOpen.id;
      join.mutate(
        { code: pendingOpen.code },
        {
          onError: (e) => {
            toast({ title: "Joinen mislukt", description: e instanceof Error ? e.message : "", variant: "destructive" });
            setPendingOpen(null);
          },
          // onSuccess: lijst invalideert → dit effect draait opnieuw → match → openen.
        },
      );
      return;
    }
    // Geen code en geen match terwijl de lijst klaar is → opgeven.
    if (!pendingOpen.code && !isLoading) {
      setPendingOpen(null);
    }
  }, [pendingOpen, subpoules, isLoading, join, toast]);

  const active = useMemo(
    () => (activeId ? subpoules.find((s) => s.id === activeId) ?? null : null),
    [subpoules, activeId]
  );
  const { data: members = [] } = useSubpouleMembers(active?.id);

  // Ritzege/podium-feestje voor de actieve subpoule — top-level zodat het op elke
  // tab afgaat (je landt eerst op Ranking, niet op de Daguitslag).
  const { celebration: dagCelebration, closeCelebration: closeDagCelebration } =
    useDaguitslagCelebration(active?.id, effectiveGameId, gameStatus);

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
  const shareInvite = async (name: string, code: string, slug: string) => {
    // Nette deelbare link met de subpoulenaam; resolvet via /subpoule/<slug>
    // en biedt de join-flow (de link werkt als invite, net als de code).
    // Fallback op de oude deeplink zolang er nog geen slug is (migratie niet toegepast).
    const url = slug
      ? `https://koerspoule.nl/${slug}`
      : "https://koerspoule.nl/mijn-peloton?tab=subpoules";
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

    // Losse panelen — één per tab, hergebruikt op mobiel én desktop.
    const standingsPanel = (
      <SubpouleStandings subpouleId={active.id} subpouleName={active.name} gameId={effectiveGameId} gameStatus={gameStatus} showEvolution={false} />
    );
    const evolutionPanel = (
      <SubpouleEvolutionChart subpouleId={active.id} gameId={effectiveGameId} title="Stijgers & Dalers" />
    );
    const daguitslagPanel = (
      <DaguitslagChart subpouleId={active.id} subpouleName={active.name} gameId={effectiveGameId} gameStatus={gameStatus} />
    );

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

    // Mobiel: het paneel van de actieve tab.
    const panelFor = (k: string) =>
      k === "klassement" ? standingsPanel
      : k === "verloop" ? evolutionPanel
      : k === "daguitslag" ? daguitslagPanel
      : k === "heatmap" ? heatmapPanel
      : deelnemersSection;

    return (
      <div className="space-y-4">
        <DaguitslagCelebration celebration={dagCelebration} onClose={closeDagCelebration} />

        {/* Sponsor-/bedrijfslogo (alleen logo, geen tekst) — strak bovenaan, alleen
            wanneer gezet én ingeschakeld. Geen layout-sprong als er geen banner is. */}
        {active.banner_url && active.banner_enabled && (
          <div className="retro-border bg-card overflow-hidden">
            <img
              src={active.banner_url}
              alt={`${active.name} logo`}
              className="block w-full h-auto object-contain"
              loading="lazy"
            />
          </div>
        )}
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
            onClick={() => shareInvite(active.name, active.code, active.slug)}
            className="inline-flex items-center gap-2 shrink-0 px-4 py-2 rounded-md bg-primary text-primary-foreground font-bold text-sm border-2 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] hover:brightness-105 active:translate-y-px active:shadow-[2px_2px_0_hsl(var(--foreground))] transition-all"
          >
            <Share2 className="h-4 w-4" />
            Daag je vrienden uit
          </button>
        </div>

        {/* ── MOBIEL: tab-gebaseerd (zoals Hors Categorie). Auto-hide tabbalk +
             swipe + "Ga naar"-bolletje. Eén paneel tegelijk; de pagina beweegt
             niet horizontaal mee. ── */}
        <div className="md:hidden">
          <div
            className={cn(
              "overflow-hidden transition-[max-height,opacity] duration-200 ease-out max-h-[120px]",
              !mobileBarVisible && "!max-h-0 opacity-0",
            )}
          >
            {/* Tabbalk staat stil; de carrousel-content volgt de vinger. */}
            <MobielTabBalk tabs={SUB_TAB_ITEMS} active={mobileTab} onChange={setMobileTab} />
          </div>

          {/* Swipe-coachmark (eenmalig) + stippen-indicator. */}
          <SwipeHintBar visible={mobileHint.visible} onClose={mobileHint.dismiss} className="mx-auto w-fit my-2" />
          <SwipeDots count={SUB_TABS.length} activeIndex={SUB_TAB_KEYS.indexOf(mobileTab)} activeLabel={SUB_TABS.find((t) => t.key === mobileTab)?.label} className="mb-2" />

          {/* Vinger-volgende carrousel: alleen het content-vlak beweegt. */}
          <SwipeCarousel
            keys={SUB_TAB_KEYS}
            activeKey={mobileTab}
            onChange={setMobileTab}
            onSwiped={mobileHint.dismiss}
            renderTab={(k) => panelFor(k)}
          />
        </div>

        {/* ── DESKTOP: 5 dossard-tabs (gelijk aan mobiel), één paneel per tab.
             Chat is een apart rechter zijpaneel, los van de tabrij. ── */}
        <div className="hidden md:block w-full">
          <div className="mx-auto max-w-5xl">
            {/* Tabbalk + Koerscafé-toggle */}
            <div className="flex items-center gap-3 mb-3">
              <div className="min-w-0 flex-1">
                <RetroTabs
                  aria-label="Subpoule-onderdelen"
                  active={activeTab}
                  onChange={setActiveTab}
                  tabs={[
                    { key: "klassement", label: "Ranking",          Icon: Trophy },
                    { key: "verloop",    label: "Stijgers & Dalers", Icon: TrendingUp },
                    { key: "daguitslag", label: "Daguitslag",        Icon: BarChart3 },
                    { key: "heatmap",    label: "Heatmap",           Icon: Flame, disabled: !heatmapUnlocked, title: !heatmapUnlocked ? "Beschikbaar zodra de inschrijving sluit en de koers live is" : undefined },
                    { key: "deelnemers", label: "Deelnemers",        Icon: Users },
                  ]}
                />
              </div>
              <button
                type="button"
                onClick={() => setDeskChatOpen((v) => !v)}
                aria-pressed={deskChatOpen}
                title="Open of sluit het Koerscafé"
                className={cn(
                  "shrink-0 inline-flex items-center gap-2 px-4 min-h-[44px] rounded-xl border-2 border-foreground font-display text-xs font-semibold uppercase tracking-wider shadow-[3px_3px_0_hsl(var(--foreground))] transition-all hover:-translate-y-0.5 active:translate-y-px active:shadow-[2px_2px_0_hsl(var(--foreground))]",
                  deskChatOpen ? "bg-primary text-primary-foreground" : "bg-card text-foreground",
                )}
              >
                <MessageCircle className="h-4 w-4" />
                Koerscafé
              </button>
            </div>

            {/* Content + chat-zijpaneel */}
            <div className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                {activeTab === "klassement" ? standingsPanel
                  : activeTab === "verloop" ? evolutionPanel
                  : activeTab === "daguitslag" ? daguitslagPanel
                  : activeTab === "heatmap" ? heatmapPanel
                  : deelnemersSection}
              </div>

              {deskChatOpen && (
                <aside className="w-[360px] shrink-0">
                  <div className="retro-border no-hover-lift bg-card overflow-hidden sticky top-4">
                    <div className="flex items-center justify-between border-b-2 border-foreground bg-secondary/30 px-3 py-2">
                      <span className="font-display font-bold flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-primary" />
                        Koerscafé
                      </span>
                      <button
                        type="button"
                        onClick={() => setDeskChatOpen(false)}
                        aria-label="Sluit Koerscafé"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="p-3">
                      <PelotonChat subpoolName={active.name} subpoolId={active.id} />
                    </div>
                  </div>
                </aside>
              )}
            </div>
          </div>
        </div>

        {/* ── MOBIEL: "Ga naar"-bolletje (tab-schakelaar), net boven de chatknop. ── */}
        <FloatingTabSwitcher
          tabs={SUB_TAB_ITEMS}
          active={mobileTab}
          onChange={setMobileTab}
          offsetClassName="bottom-[136px]"
        />

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
            <EmptyState
              icon={Share2}
              title="Roep je kopgroep! 🚴"
              message="Een koers is pas écht leuk met je vrienden erbij. Start hieronder een eigen subpoule of sluit aan met een code."
              className="border-0 shadow-none"
            />
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

      {subpoulesLocked ? (
        <Card className="retro-border">
          <CardContent className="p-4 text-center space-y-1">
            <p className="font-display font-bold text-foreground">Koers afgerond</p>
            <p className="text-sm text-muted-foreground">
              Deze koers is voorbij — een nieuwe subpoule aanmaken of joinen kan niet meer.
              Bekijk de eindstand van je bestaande subpoules hierboven.
            </p>
          </CardContent>
        </Card>
      ) : (
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
      )}
    </div>
  );
}
