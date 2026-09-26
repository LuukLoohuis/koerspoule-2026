import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { RetroTabs } from "@/components/RetroTabs";
import DagprijsBanner from "@/components/karavaan/DagprijsBanner";
import { Car, Compass, Mountain, Newspaper, Pencil, Radio, RotateCcw, Target, Trophy, Users } from "lucide-react";
import SubpouleManager from "@/components/SubpouleManager";
import WervingStrook from "@/components/WervingStrook";
import MyTeamPanel from "@/components/MyTeamPanel";
import PloegC from "@/components/ploeg/PloegC";
import { useIsMobileSync } from "@/hooks/use-mobile";
import MyResultsPanel from "@/components/MyResultsPanel";
import PalmaresPanel from "@/components/PalmaresPanel";
import HorsCategorieTab from "@/components/HorsCategorieTab";
import { MobielTabBalk } from "@/components/MobielTabBalk";
import SwipeCarousel from "@/components/SwipeCarousel";
import { useAutoHideOnScroll } from "@/hooks/useAutoHideOnScroll";
import { useSwipeHint } from "@/hooks/useSwipeHint";
import { SteunBanner } from "@/components/SteunKopgroep";
import { useSupportBanner } from "@/hooks/useSupportBanner";
import { useFallenRidersCount } from "@/hooks/useFallenRidersCount";
import SwipeHintBar from "@/components/SwipeHintBar";
import Stamp from "@/components/retro/Stamp";
import KaravaanFeed from "@/components/karavaan/KaravaanFeed";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useSelectedGame } from "@/context/SelectedGameContext";
import GameSwitcher from "@/components/GameSwitcher";
import MeermarathonKoersbalk from "@/components/meermarathon/Koersbalk";
import MijnMeermarathon from "@/components/meermarathon/MijnMeermarathon";
import { isFinishedLike, isGameLocked, isVisibleToUser, maySeeLiveContent } from "@/lib/gameStatus";
import SneakPreviewLock from "@/components/SneakPreviewLock";
import { useEntry, entryErrorMessage } from "@/hooks/useEntry";
import { Input } from "@/components/ui/input";
import { useSubpoules } from "@/hooks/useSubpoules";
import { isMeermarathonGame } from "@/lib/gameTypes";
import ZwevendeActie, { zwevendeActieWeggeklikt, zwevendeActieHerstellen } from "@/components/ZwevendeActie";
import Rondleiding, { rondleidingGezien, rondleidingHerstarten, useUitgelichteNav, useUitgelichtSubtab } from "@/components/Rondleiding";
import { useAuth } from "@/hooks/useAuth";
import OnboardingCard, { ONBOARDING_KEY, onboardingWeggeklikt } from "@/components/OnboardingCard";

export default function MijnPeloton() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: profile } = useProfile();
  const { data: currentGame } = useCurrentGame();
  const { teamName, entry: nameEntry, saveTeamName } = useEntry(currentGame?.id);
  const displayName = (teamName?.trim() || profile?.display_name?.trim() || "José Bidon");
  const { user: authUser, role } = useAuth();
  const isAdmin = role === "admin";
  // Gedeelde game-keuze uit de context (één bron voor de hele app).
  const { games: allGamesCtx, selectedGame: selectedGameObj, setSelectedGameId } = useSelectedGame();
  // Telbordje: aantal gekozen renners dat vóór de koers is vervallen (vervanger nodig).
  const { data: fallenCount = 0 } = useFallenRidersCount(selectedGameObj?.id, selectedGameObj?.status);
  // Handmatige "Steun Koerspoule"-banner: alleen aan als de admin 'm ergens aanzette.
  const supportBanner = useSupportBanner(selectedGameObj?.id);
  // Sneak preview ('open'): admin ziet de echte (test)data, gewone gebruiker de schil.
  const maySeeLive = maySeeLiveContent(selectedGameObj?.status, isAdmin, selectedGameObj?.admin_testmodus ?? false);

  // Onboarding-voortgang voor de geselecteerde game.
  const navigate = useNavigate();
  const { entry: selEntry } = useEntry(selectedGameObj?.id);
  const { subpoules: selSubpoules } = useSubpoules(selectedGameObj?.id);
  const obHasTeam = selEntry?.status === "submitted";
  const obInSubpoule = selSubpoules.length > 0;
  const obLive = obHasTeam && ["live", "locked", "finished", "closed"].includes(selectedGameObj?.status ?? "");
  const [searchParams, setSearchParams] = useSearchParams();
  // Default landing = karavaan (de gazetta), tenzij ?tab= expliciet gezet is.
  const [gameTab, setGameTab] = useState(() => searchParams.get("tab") ?? "karavaan");
  const [teamSubTab, setTeamSubTab] = useState("ploeg");
  // Deep-links vanaf /uitleg dragen naast ?tab= ook ?sub= / ?view= mee → de
  // juiste subtab openen, ook als de gebruiker al op /mijn-peloton stond.
  useEffect(() => {
    const t = searchParams.get("tab") ?? "karavaan";
    const sub = searchParams.get("sub");
    const view = searchParams.get("view");
    setGameTab(t);
    if (t === "team" && sub && ["ploeg", "prono", "palmares"].includes(sub)) setTeamSubTab(sub);
    // ?edit=naam → open + focus de ploegnaam-editor (het potloodje) in Mijn Ploeg.
    if (t === "team" && searchParams.get("edit") === "naam") setFocusNameSeq((s) => s + 1);
    if (t === "hors" && sub && ["dartpijl", "pelotonkeuzes", "wielerdirecteur", "superteam", "benchmark"].includes(sub)) {
      setHorsTab(sub as "dartpijl" | "pelotonkeuzes" | "wielerdirecteur" | "superteam" | "benchmark");
    }
    if (t === "uitslagen" && view && ["klassement", "etappes"].includes(view)) {
      setUitslagenTarget({ view: view as "klassement" | "etappes" });
    }
  }, [searchParams]);

  /**
   * Tab wisselen én de URL meenemen.
   *
   * De onderbalk op mobiel leidt zijn actieve knop af uit ?tab=, niet uit deze
   * state. Wisselde er ergens ín de pagina een tab -- een cel in de standband,
   * een rubriek in de Krant, de knop naar Hors Catégorie -- dan bleef die balk op
   * het vorige tabblad staan.
   *
   * Bewust een helper en geen tweede useEffect: een effect dat state naar de URL
   * spiegelt hangt aan dezelfde searchParams als het effect dat de URL naar
   * state leest, en die twee kunnen elkaar bij een externe URL-wissel om beurten
   * blijven aanstoten.
   */
  const gaNaarTab = (tab: string, opties?: { vervang?: boolean }) => {
    setGameTab(tab);
    setSearchParams((huidig) => {
      const volgende = new URLSearchParams(huidig);
      volgende.set("tab", tab);
      return volgende;
      // Standaard een nieuwe geschiedenisstap, geen vervanging: wie vanuit de
      // Krant doorklikt naar een rapport verwacht met "vorige" terug te komen
      // bij die Krant. Met replace werd die stap overschreven en sprong je uit
      // de pagina. Alleen de rondleiding vervangt, die stuurt zelf.
    }, { replace: opties?.vervang === true });
  };

  // Bump om de ploegnaam-editor in MyTeamPanel te openen + te focussen.
  const [focusNameSeq, setFocusNameSeq] = useState(0);
  const goEditTeamName = () => {
    gaNaarTab("team");
    setTeamSubTab("ploeg");
    setFocusNameSeq((s) => s + 1);
  };
  // Inline ploegnaam invoeren vanuit de nudge-balk (geen tab-sprong nodig).
  const [nameInput, setNameInput] = useState("");
  const handleInlineSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = nameInput.trim();
    if (!name || !nameEntry?.id) return;
    try {
      await saveTeamName.mutateAsync({ entryId: nameEntry.id, teamName: name });
      toast({ title: "Ploegnaam opgeslagen" });
      setNameInput("");
    } catch (err) {
      toast({ title: "Opslaan mislukt", description: entryErrorMessage(err), variant: "destructive" });
    }
  };
  // Sponsorbanner van de geopende subpoule (omhoog gerapporteerd door SubpouleManager).
  // Alleen getoond als korte strip onder de titel op de Subpoules-tab.
  const [subpouleBanner, setSubpouleBanner] = useState<{ url: string; name: string } | null>(null);

  // Volgwagen-subtabs (mobiel): vinger-volgende carrousel + zwevende schakelaar.
  const teamHint = useSwipeHint("volgwagen");
  // Eén lijst voor alle vier de weergaven van de Volgwagen-onderdelen: de
  // mobiele balk, de stippen, de desktoptabs en de carrousel. Live hoort er
  // alleen bij op de schaatsgame, en zit direct achter Mijn Ploeg omdat je er
  // tijdens een wedstrijd heen en weer springt.
  const volgwagenTabs = useMemo(() => {
    const basis = [
      { key: "ploeg",    label: t("team.tabs.myTeam"),   icon: Users  },
      { key: "prono",    label: t("team.tabs.prono"),    icon: Target },
      { key: "palmares", label: t("team.tabs.palmares"), icon: Trophy },
    ];
    if (!isMeermarathonGame(selectedGameObj?.game_type)) return basis;
    return [basis[0], { key: "live", label: t("team.tabs.live"), icon: Radio }, ...basis.slice(1)];
  }, [t, selectedGameObj?.game_type]);
  const volgwagenKeys = useMemo(() => volgwagenTabs.map((x) => x.key), [volgwagenTabs]);
  // Van schaatsgame naar wielergame wisselen laat je anders achter op een
  // onderdeel dat niet meer bestaat.
  useEffect(() => {
    if (!volgwagenKeys.includes(teamSubTab)) setTeamSubTab("ploeg");
  }, [volgwagenKeys, teamSubTab]);
  // Wegklikken van de onboarding moet de zijkolom direct laten inklappen; de
  // kaart bewaart dat zelf in localStorage, dus we spiegelen het hier.
  const [onbWeg, setOnbWeg] = useState(() => onboardingWeggeklikt());
  // De zwevende actieknop is los wegklikbaar; we spiegelen dat hier zodat de
  // terughaal-knop verschijnt ook wanneer de onboarding nog staat.
  const [actieWeg, setActieWeg] = useState(() => zwevendeActieWeggeklikt());
  // Wegklikken mag niet definitief zijn. De kaarten lezen hun status bij het
  // opbouwen, dus terughalen betekent: sleutels wissen en ze opnieuw aanmaken —
  // vandaar de teller als React-key.
  const [herstelTeller, setHerstelTeller] = useState(0);
  function haalKaartenTerug() {
    try {
      localStorage.removeItem(ONBOARDING_KEY);
      // De steunbanner hangt zijn sleutel aan een revisie, dus die staan er in
      // meerdere varianten.
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const sleutel = localStorage.key(i);
        if (sleutel?.startsWith("kp_steun_banner_dismissed_v1:")) localStorage.removeItem(sleutel);
      }
    } catch { /* negeer */ }
    rondleidingHerstarten();
    zwevendeActieHerstellen();
    setActieWeg(false);
    setOnbWeg(false);
    setHerstelTeller((n) => n + 1);
    // "Terughalen" heeft pas zin als de rondleiding ook echt weer start.
    setRondleidingOpen(true);
  }
  // Rondleiding: eenmalig bij het eerste bezoek, en daarna terug te halen via
  // dezelfde knop als de hulpkaarten. Alleen mobiel — daar zitten de namen in
  // een balk die je niet zomaar doorgrondt.
  const [rondleidingOpen, setRondleidingOpen] = useState(false);
  const uitgelichteNav = useUitgelichteNav();
  const uitgelichtSubtab = useUitgelichtSubtab();
  useEffect(() => {
    if (rondleidingGezien()) return;
    // Even wachten tot de pagina staat; een rondleiding over een halfgeladen
    // scherm wijst naar niets.
    const id = window.setTimeout(() => setRondleidingOpen(true), 800);
    return () => window.clearTimeout(id);
  }, []);

  // Statistieken en de krant hebben geen meetbare "klaar"-staat zoals een ploeg
  // of subpoule; we onthouden simpelweg of de deelnemer er ooit is geweest.
  const [bezocht, setBezocht] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("kp_secties_bezocht") ?? "{}"); }
    catch { return {}; }
  });
  const markeerBezocht = (sectie: "hors" | "karavaan") => {
    setBezocht((prev) => {
      if (prev[sectie]) return prev;
      const next = { ...prev, [sectie]: true };
      try { localStorage.setItem("kp_secties_bezocht", JSON.stringify(next)); } catch { /* negeer */ }
      return next;
    });
  };
  const teamBarVisible = useAutoHideOnScroll();
  // Krant C en Ploeg C zijn de telefoonschermen uit docs/design/krant-ploeg-c;
  // op de webversie blijven de bestaande panelen staan. De Meermarathon heeft
  // zijn eigen handoff en houdt zijn eigen schermen op beide.
  const isMobiel = useIsMobileSync();
  const [horsTab, setHorsTab] = useState<"dartpijl" | "pelotonkeuzes" | "wielerdirecteur" | "superteam" | "benchmark" | undefined>(undefined);
  const openHors = (tab: "dartpijl" | "pelotonkeuzes" | "wielerdirecteur" | "superteam" | "benchmark") => {
    setHorsTab(tab);
    gaNaarTab("hors");
  };
  // De rondleiding stuurt hier de subpoule-subtab aan. SubpouleManager leest die
  // uit ?sub= en wordt daarop gekeyd, dus dit moet via de router-parameters —
  // een replaceState op window laat React er niets van merken.
  const openSubpouleTab = (sub: string) => {
    const volgende = new URLSearchParams(searchParams);
    volgende.set("tab", "subpoules");
    volgende.set("sub", sub);
    setSearchParams(volgende, { replace: true });
    setGameTab("subpoules");
  };
  // Gazetta-shortcuts: subpoule-cel → Subpoules-tab met die subpoule open op Grafiek
  // (SubpouleManager leest ?subpoule=<id> uit de URL en opent default de Grafiek-tab).
  const openSubpouleGrafiek = (subpouleId: string) => {
    // Via de router en niet via window.history: dat laatste ziet React niet, en
    // ?tab= bleef zo achter waardoor de onderbalk op mobiel op het vorige
    // tabblad bleef staan.
    setGameTab("subpoules");
    setSearchParams((huidig) => {
      const volgende = new URLSearchParams(huidig);
      volgende.set("tab", "subpoules");
      volgende.set("subpoule", subpouleId);
      return volgende;
    });
  };
  // overall-cel → Uitslagen-tab (subtab Klassement is daar de default)
  const [uitslagenTarget, setUitslagenTarget] = useState<{ view: "etappes" | "klassement"; stageNumber?: number } | null>(null);
  const openUitslagen = () => { setUitslagenTarget({ view: "klassement" }); gaNaarTab("uitslagen"); };
  // Beste-etappe-cel → Uitslagen-tab, Etappe-view, op dat ritnummer.
  const openStageResult = (stageNumber: number) => {
    setUitslagenTarget({ view: "etappes", stageNumber });
    gaNaarTab("uitslagen");
  };
  /* ── Main overview ── */
  const hasTeamName = Boolean(teamName?.trim());

  // De Krant toont beide Meermarathon-games tegelijk; daar geen koersbalk.
  const isMeermarathonGekozen = isMeermarathonGame(selectedGameObj?.game_type);
  const andereKoersLoopt = allGamesCtx.some(
    (g) => !isMeermarathonGame(g.game_type) && isVisibleToUser(g.status, isAdmin) && !isFinishedLike(g.status),
  );
  const toonKoersbalk = isMeermarathonGekozen && gameTab !== "karavaan";

  // De zijkolom bestaat alleen zolang er iets in staat; anders zou er op
  // desktop een lege kolom van 268px blijven hangen.
  const toontOnboarding =
    Boolean(authUser && selectedGameObj) && !onbWeg && !(obHasTeam && obInSubpoule);
  const heeftZijkolom =
    toontOnboarding || !hasTeamName || Boolean(supportBanner.data?.active);
  return (
    <div className="container mx-auto px-5 pb-4 md:py-6">
      {/* Game-switcher (vertrekbord) — alleen ingelogd + >1 zichtbare game.
          Gecentreerd in de contentkolom, gelijk met de tabbalk eronder.
          Bij de Meermarathon neemt de koersbalk (Vrouwen/Mannen) het over,
          tenzij er ook nog een wielerkoers loopt. */}
      {authUser && toonKoersbalk && <MeermarathonKoersbalk className="md:hidden mb-2" />}
      {authUser && (!isMeermarathonGekozen || andereKoersLoopt) && (
        <GameSwitcher
          games={allGamesCtx}
          selectedId={selectedGameObj?.id ?? null}
          onSelect={setSelectedGameId}
          isAdmin={isAdmin}
          className="max-w-5xl mx-auto mb-4"
        />
      )}

      {/* 2. Compact masthead */}
      <div className="relative mb-3 md:mb-6">
        <div className="flex flex-col items-center text-center gap-1 md:gap-2">
          <span className="overline-stamp">— Bulletin du Peloton —</span>
          <h1 className="heading-oswald text-3xl md:text-5xl">Mijn Peloton</h1>
          <p className="hidden md:block text-muted-foreground font-serif italic max-w-md">
            Welkom terug, {displayName}! Beheer je koersen en subpoules.
          </p>
        </div>
        {/* Stamp rechtsboven op desktop */}
        <div className="hidden md:block absolute top-0 right-0">
          <Stamp tone="wine" rotation={-4}>{`Dag ${new Date().getDate()} · ${new Date().toLocaleDateString("nl-NL", { month: "short" }).toUpperCase()}`}</Stamp>
        </div>
        <div className="double-rule mt-2 md:mt-3 mx-auto max-w-md" />
      </div>


      <div className="max-w-5xl mx-auto">

        {/* Subpoule-sponsorbanner — korte strip onder de titel, boven de tabs.
            Alleen op de Subpoules-tab én wanneer de open subpoule een actieve
            banner heeft. Anders niets (geen layout-sprong). */}
        {gameTab === "subpoules" && subpouleBanner && (
          <div className="retro-border bg-card overflow-hidden rounded-lg mb-3">
            <img
              src={subpouleBanner.url}
              alt={`${subpouleBanner.name} banner`}
              className="block w-full aspect-31/10 object-cover object-center"
              loading="lazy"
            />
          </div>
        )}

        {/* Dagprijs — boven de hoofdbalk, zodat de sponsor over alle tabbladen
            zichtbaar is en niet meer de kop van de Krant wegduwt. */}
        <DagprijsBanner gameId={selectedGameObj?.id} className="mb-3" />

        {/* Inner tabs: Team / Uitslagen / Subpoules / Hors */}
        {/* Hulpacties boven de hoofdbalk, rechts uitgelijnd.
            Ze stonden tussen de hoofdbalk en de subbalk in, en dat brak het
            verband tussen die twee: de subbalk leek los te staan van waar hij
            bij hoort. Boven de balk horen ze ook inhoudelijk beter thuis --
            het is gereedschap, geen navigatie. */}
        {(!toontOnboarding || onbWeg || actieWeg) && (
          <div className="mb-2 flex flex-wrap items-center justify-end gap-1">
          {/* De rondleiding blijft bij elke status bereikbaar. De knop hiervoor
              zat alleen in "Aan de slag", en die kaart verdwijnt zodra je een
              ploeg én een subpoule hebt — precies de deelnemer die hem later
              nog eens wil nalopen kon er dan niet meer bij. */}
          {!toontOnboarding && (
            <button
              type="button"
              onClick={() => { rondleidingHerstarten(); setRondleidingOpen(true); }}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Compass className="h-3 w-3" aria-hidden />
              {t("rondleiding.starten")}
            </button>
          )}

          {/* Wegklikken is omkeerbaar; zonder deze knop zou het definitief zijn. */}
          {(onbWeg || actieWeg) && (
            <button
              type="button"
              onClick={haalKaartenTerug}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            >
              <RotateCcw className="h-3 w-3" aria-hidden />
              Toon hulpkaarten weer
            </button>
          )}
          </div>
        )}

        <Tabs value={gameTab} onValueChange={gaNaarTab}>

          {/* Mobile primary tabs verwijderd — BottomNav is enige top-level switcher op mobiel */}


          {authUser && toonKoersbalk && <MeermarathonKoersbalk className="hidden md:block max-w-2xl mx-auto mb-4" />}

          {/* Desktop tab nav — retro dossard-tabbalk */}
          <RetroTabs
            className="hidden md:flex"
            uitgelichteKey={uitgelichteNav}
            aria-label="Hoofdnavigatie"
            active={gameTab}
            onChange={gaNaarTab}
            tabs={[
              { key: "karavaan",  label: "Krant",          Icon: Newspaper },
              { key: "team",      label: "Volgwagen",      Icon: Car      },
              { key: "subpoules", label: "Subpoules",      Icon: Users    },
              { key: "uitslagen", label: t("team.peloton.tabResults"), Icon: Trophy   },
              { key: "hors",      label: "Hors Catégorie", Icon: Mountain },
            ]}
          />

          {/* Twee kolommen op desktop: inhoud links, tijdelijke zaken rechts.
              Onboarding en steunbanner stonden vol over de breedte bóven de
              inhoud en duwden die onder de vouw. Ze staan nu in een zijkolom,
              die vanzelf verdwijnt zodra er niets meer in staat.
              Op mobiel blijft de volgorde zoals hij was: order zet de zijkolom
              daar weer boven de inhoud, zonder de component dubbel te renderen. */}
          <div className={cn(
            "flex flex-col",
            // De tweede kolom is auto-breed en de zijkolom verbergt zichzelf
            // zodra hij leeg is. Eerder stond hier een vaste 268px met een
            // vooraf berekende vlag, maar die kon er niet naast zitten: de
            // kaarten erin (onboarding, steunbanner) geven zelf null terug als
            // ze ooit zijn weggeklikt. De pagina dacht dan dat er inhoud was en
            // liet een lege strook staan. Nu bepaalt de kolom het zelf.
            "md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-5",
          )}>
            {heeftZijkolom && (
              <aside className="order-1 flex flex-col gap-3 empty:hidden md:order-2 md:w-[268px] md:sticky md:top-4">
                {authUser && selectedGameObj && (
                  <OnboardingCard
                    key={herstelTeller}
                    hasTeam={!!obHasTeam}
                    inSubpoule={obInSubpoule}
                    liveTracking={!!obLive}
                    onTeam={() => navigate("/team-samenstellen")}
                    onSubpoule={() => gaNaarTab("subpoules")}
                    onResults={() => gaNaarTab("uitslagen")}
                    statsBekeken={bezocht.hors}
                    krantBekeken={bezocht.karavaan}
                    onStats={() => { markeerBezocht("hors"); gaNaarTab("hors"); }}
                    onKrant={() => { markeerBezocht("karavaan"); gaNaarTab("karavaan"); }}
                    onRondleiding={() => setRondleidingOpen(true)}
                    onDismissed={() => setOnbWeg(true)}
                  />
                )}
                {/* Ploegnaam-nudge — alleen tonen als er nog géén ploegnaam is.
           Heb je een entry? Dan kun je de naam direct in de balk invoeren.
           Anders (nog geen entry/niet ingelogd) → naar de Volgwagen. */}
      {!hasTeamName && (
        nameEntry?.id ? (
          <form
            onSubmit={handleInlineSaveName}
            className="retro-border bg-card px-3 py-2.5 flex flex-col gap-2 md:items-stretch"
          >
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <Pencil className="h-3 w-3 shrink-0" />
              {t("team.peloton.teamNameLabel")}
            </span>
            <Input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder={t("team.peloton.teamNamePlaceholder")}
              maxLength={40}
              aria-label={t("team.peloton.teamNameLabel")}
              className="h-9 w-full min-w-0 border border-border bg-background px-2 shadow-none focus-visible:ring-1 font-display font-bold"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!nameInput.trim() || saveTeamName.isPending}
              className="w-full retro-border-primary font-bold"
            >
              {saveTeamName.isPending ? "…" : "Opslaan"}
            </Button>
          </form>
        ) : (
          <button
            type="button"
            onClick={goEditTeamName}
            className="retro-border bg-card px-3 py-2 flex items-center justify-between gap-3 text-left hover:bg-secondary/40 transition-colors"
            aria-label={t("team.peloton.setTeamNameAria")}
          >
            <span className="flex items-center gap-2 min-w-0">
              <Pencil className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="font-display text-sm font-bold truncate">
                Stel je ploegnaam in
              </span>
              <span className="hidden sm:inline text-xs font-serif italic text-muted-foreground truncate">
                — geef je team een naam voor de start
              </span>
            </span>
            <span className="shrink-0 text-base text-muted-foreground" aria-hidden>→</span>
          </button>
        )
      )}
                {supportBanner.data?.active && (
                  <SteunBanner key={herstelTeller} revKey={supportBanner.data.updatedAt} />
                )}
              </aside>
            )}

            <div className="order-2 min-w-0 md:order-1">

          <Rondleiding
            open={rondleidingOpen}
            onClose={() => setRondleidingOpen(false)}
            heeftStreekTab={selSubpoules.some((sp) => sp.requires_woonplaats)}
            heeftLiveTab={isMeermarathonGame(selectedGameObj?.game_type)}
            heeftSubpoule={selSubpoules.length > 0}
            onNavigeer={(sectie, sub) => {
              if (sectie === "hors" && sub) openHors(sub as Parameters<typeof openHors>[0]);
              else if (sectie === "subpoules" && sub) openSubpouleTab(sub);
              else if (sectie === "team" && sub) { setTeamSubTab(sub); gaNaarTab("team"); }
              else if (sectie === "uitslagen" && sub) {
                // ResultsView wordt gekeyd op deze view, dus dit opent de
                // gevraagde weergave ook als je al op Uitslagen stond.
                setUitslagenTarget({ view: sub as "klassement" | "etappes" });
                gaNaarTab("uitslagen");
              } else gaNaarTab(sectie);
            }}
          />

          {/* Telbordje: vervanger(s) nodig → klik gaat naar de Volgwagen */}
          {fallenCount > 0 && gameTab !== "team" && (
            <button
              type="button"
              onClick={() => gaNaarTab("team")}
              aria-label={`${fallenCount} renner${fallenCount === 1 ? "" : "s"} vervangen nodig — ga naar de Volgwagen`}
              className="mt-3 w-full inline-flex items-center gap-2 rounded-md retro-border bg-[hsl(var(--vintage-gold))/0.12] px-3 py-2 text-sm font-bold hover:bg-[hsl(var(--vintage-gold))/0.2] transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[hsl(var(--vintage-gold))]"
            >
              <Car className="w-4 h-4 text-[hsl(var(--vintage-gold))]" aria-hidden />
              <span>{fallenCount} renner{fallenCount === 1 ? "" : "s"} vervangen nodig</span>
              <span aria-hidden className="ml-auto">→</span>
            </button>
          )}

          {/* ── TAB: De Karavaan (landing — feed-overzicht) ──
              L'Équipe is óók in de sneak preview ('open') volledig zichtbaar voor
              deelnemers (geen preview-schil meer). */}
          <TabsContent value="karavaan" className="mt-3" data-rondleiding-doel="karavaan-inhoud">
            {/* StatusBlok verwijderd: de standbalk onderin de voorpagina toont
                dezelfde cijfers, en twee keer je positie boven elkaar is dubbel. */}
            {isMeermarathonGekozen && (
              <MijnMeermarathon
                onNaarVolgwagen={(id) => {
                  setSelectedGameId(id);
                  gaNaarTab("team");
                }}
                onRondkijken={(id) => {
                  setSelectedGameId(id);
                  gaNaarTab("uitslagen");
                }}
              />
            )}
            <KaravaanFeed
              onGoToPloeg={() => gaNaarTab("team")}
              onOpenHors={openHors}
              onOpenSubpoule={openSubpouleGrafiek}
              onOpenUitslagen={openUitslagen}
              gameId={selectedGameObj?.id}
              gameStatus={selectedGameObj?.status}
              horsBanner={selectedGameObj?.hors_banner_visible ?? true}
            />
          </TabsContent>

          {/* ── TAB: Mijn Team (with sub-tabs) ── */}
          <TabsContent value="team" className="mt-3" data-rondleiding-doel="team-inhoud">
            <Tabs value={teamSubTab} onValueChange={setTeamSubTab}>

              {/* Mobile tab nav — pill. Auto-hide bij omlaag scrollen. */}
              <div
                className={cn(
                  "md:hidden mb-3 overflow-hidden transition-[max-height,opacity] duration-200 ease-out max-h-[120px]",
                  !teamBarVisible && "max-h-0! mb-0! opacity-0",
                )}
              >
                {isMobiel && !isMeermarathonGekozen ? (
                  // Ploeg C: drie brede segmenten van 40px, zonder iconen.
                  <RetroTabs
                    variant="segment"
                    gelijkeBreedte
                    className="h-10"
                    aria-label={t("team.tabs.volgwagenSectionsAria")}
                    active={teamSubTab}
                    onChange={(k) => setTeamSubTab(k as typeof teamSubTab)}
                    tabs={volgwagenTabs.map(({ key, label }) => ({ key, label }))}
                  />
                ) : (
                  <MobielTabBalk
                    tabs={volgwagenTabs}
                    active={teamSubTab}
                    onChange={(k) => setTeamSubTab(k as typeof teamSubTab)}
                  />
                )}
              </div>

              {/* Veeghint (eenmalig). De stippenrij stond hier ook: die
                  herhaalde de naam van de tab die er vlak boven al oplichtte. */}
              <SwipeHintBar visible={teamHint.visible} onClose={teamHint.dismiss} className="mb-2" />

              {/* Desktop sub-tab nav — retro dossard-tabbalk */}
              <RetroTabs
                variant="segment"
                className="mb-3 hidden md:flex"
                aria-label={t("team.tabs.volgwagenSectionsAria")}
                active={teamSubTab}
                onChange={setTeamSubTab}
                tabs={volgwagenTabs.map(({ key, label, icon }) => ({ key, label, Icon: icon }))}
              />
              {/* Vinger-volgende carrousel tussen de Volgwagen-onderdelen.
                  Het paneel-doel zit hier en niet om de hele sectie, anders
                  valt de subbalk binnen de uitsparing en licht die ook op. */}
              <div data-rondleiding-doel="team-paneel">
              <SwipeCarousel
                keys={volgwagenKeys}
                activeKey={teamSubTab}
                onChange={setTeamSubTab}
                onSwiped={teamHint.dismiss}
                renderTab={(k) => (
                  <>
                    {k === "ploeg" && isMobiel && !isMeermarathonGekozen && (
                      <PloegC gameId={selectedGameObj?.id} focusNameSignal={focusNameSeq} />
                    )}
                    {k === "ploeg" && !(isMobiel && !isMeermarathonGekozen) && (
                      <div className="space-y-3">
                        {/* Ploegnaam-editor zit nu in het Salle-de-Course-dashboard
                            binnen MyTeamPanel (Zone 1-nudge). */}
                        <MyTeamPanel section="ploeg" gameId={selectedGameObj?.id} gameStatus={selectedGameObj?.status} gameName={selectedGameObj?.name} gameType={selectedGameObj?.game_type} gameCategorie={selectedGameObj?.categorie} prizesVisible={selectedGameObj?.prizes_visible} adminTestmodus={selectedGameObj?.admin_testmodus ?? false} onOpenHors={openHors} onOpenUitslagen={openUitslagen} onOpenSubpoule={openSubpouleGrafiek} onOpenStageResult={openStageResult} focusNameSignal={focusNameSeq} />
                      </div>
                    )}
                    {k === "live" && (
                      <MyTeamPanel section="live" gameId={selectedGameObj?.id} gameStatus={selectedGameObj?.status} gameName={selectedGameObj?.name} gameType={selectedGameObj?.game_type} gameCategorie={selectedGameObj?.categorie} />
                    )}
                    {k === "prono" && (
                      <MyTeamPanel section="prono" gameId={selectedGameObj?.id} gameStatus={selectedGameObj?.status} gameName={selectedGameObj?.name} gameType={selectedGameObj?.game_type} gameCategorie={selectedGameObj?.categorie} />
                    )}
                    {k === "palmares" && <PalmaresPanel />}
                  </>
                )}
              />
              </div>

              {/* De hoofdhandeling blijft binnen duimbereik, ook halverwege de
                  rennerlijst. Linksonder, zodat hij de tab-schakelaar
                  rechtsonder niet in de weg zit.

                  Zodra de koers rijdt ligt de ploeg vast; dan is dit een knop
                  naar een scherm waar je niets meer kunt. Vandaar de
                  vergrendel-check in plaats van alleen de subtab. */}
              {teamSubTab === "ploeg" && !isGameLocked(selectedGameObj?.status) && (
                <ZwevendeActie
                  key={herstelTeller}
                  label={t("nav.wijzigPloeg")}
                  icon={Pencil}
                  onClick={() => navigate("/team-samenstellen")}
                  onDismissed={() => setActieWeg(true)}
                />
              )}

            </Tabs>
          </TabsContent>

          {/* ── TAB: Subpoules ── */}
          <TabsContent value="subpoules" className="mt-3" data-rondleiding-doel="subpoules-inhoud">
            {/* Wervingsstrook (admin-gestuurd, wegklikbaar) — ook hier zodat leden
                een promote-subpoule kunnen vinden; "Doe mee" vult de code voor. */}
            <WervingStrook className="mb-3" />
            {/* Doel voor de rondleiding: hier staan de aanmaak- en joinvelden. */}
            <div data-rondleiding-doel="subpoules-overzicht">
            {(() => {
              const sub = searchParams.get("sub");
              const initialTab = (["klassement", "verloop", "daguitslag", "heatmap", "deelnemers", "streek"].includes(sub ?? "")
                ? sub : undefined) as "klassement" | "verloop" | "daguitslag" | "heatmap" | "deelnemers" | "streek" | undefined;
              // Key op de deep-link-subtab forceert herinitialisatie zodat een link
              // vanaf /uitleg de juiste subtab opent, ook als je al op Subpoules stond.
              return (
                <SubpouleManager
                  key={`sub-${initialTab ?? "def"}`}
                  initialTab={initialTab}
                  gameId={selectedGameObj?.id}
                  gameName={selectedGameObj?.name}
                  gameStatus={selectedGameObj?.status}
                  onActiveBannerChange={setSubpouleBanner}
                  presetJoinCode={searchParams.get("join") ?? undefined}
                  // Bewust altijd aan, ook in de sneak preview: de subpoule is
                  // dan al volledig zichtbaar (zie 8a77b22). Niet de variabele
                  // maySeeLive van hierboven, die geldt alleen voor Uitslagen.
                  maySeeLive
                  autoOpenId={rondleidingOpen ? selSubpoules[0]?.id : undefined}
                  toonOverzicht={uitgelichtSubtab === "overzicht"}
                />
              );
            })()}
            </div>
          </TabsContent>

          {/* ── TAB: Uitslagen ── */}
          <TabsContent value="uitslagen" className="mt-3" data-rondleiding-doel="uitslagen-inhoud">
            {maySeeLive ? (
              <MyResultsPanel key={`uitslagen-${uitslagenTarget?.view ?? "def"}`} gameId={selectedGameObj?.id} gameName={selectedGameObj?.name} initialView={uitslagenTarget?.view} initialStageNumber={uitslagenTarget?.stageNumber} />
            ) : (
              <SneakPreviewLock
                title={t("team.peloton.resultsSoon")}
                note="De daguitslagen en het klassement verschijnen hier zodra de koers losbarst."
              />
            )}
          </TabsContent>

          {/* ── TAB: Hors Catégorie ── */}
          <TabsContent value="hors" className="mt-3" data-rondleiding-doel="hors-inhoud">
            <HorsCategorieTab initialTab={horsTab} gameId={selectedGameObj?.id} gameStatus={selectedGameObj?.status} adminTestmodus={selectedGameObj?.admin_testmodus ?? false} />
          </TabsContent>

            </div>
          </div>
        </Tabs>
      </div>
    </div>);

}
