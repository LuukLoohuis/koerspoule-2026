import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { ChevronDown, ChevronRight, ChevronsUpDown, Mic, Newspaper, TrendingUp, TrendingDown, Trophy, HeartCrack, Sparkles, ClipboardList, ArrowRight, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import DaguitslagChart from "@/components/DaguitslagChart";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import Voorpagina, { type Rubriek, type StandCel, type Hoofdartikel, type Segment } from "@/components/karavaan/Voorpagina";
import { bouwKop, kopUitVerslag } from "@/lib/krantKop";
import { useAllGames } from "@/hooks/useAllGames";
import { useSubpoules } from "@/hooks/useSubpoules";
import { useKaravaanFeed, markKaravaanVisited, findNewMarkerIndex, type KaravaanEtappe, type PersonalFlash } from "@/hooks/useKaravaanFeed";
import MiniStrip, { type HorsTabKey } from "@/components/karavaan/MiniStrip";
import Voorbeschouwing from "@/components/karavaan/Voorbeschouwing";
import Verslag from "@/components/karavaan/Verslag";
import Uitslagblok from "@/components/karavaan/Uitslagblok";
import { useEtappeVerslag } from "@/hooks/useEtappeVerslag";
import { useActiveLegende } from "@/hooks/useRubriek";
import Legende from "@/components/karavaan/Legende";
import HorsBijlage, { type BijlageTegel } from "@/components/karavaan/HorsBijlage";

/**
 * Vaste kleur per rubriek, uit het ontwerp. Het accent volgt het thema van de
 * koers; de rest zijn eigen tinten zodat de rubrieken uit elkaar te houden
 * zijn zonder dat er vijf accentkleuren naast elkaar staan.
 */
const RUBRIEK_TINT = {
  daguitslag: "hsl(var(--primary) / 0.14)",
  voorbeschouwing: "rgba(47, 93, 140, 0.14)",
  verslag: "rgba(107, 74, 140, 0.14)",
  legende: "hsl(var(--vintage-gold) / 0.3)",
} as const;

/** Cijferkleuren in de bijlage, dieper dan de tinten hierboven. */
const BIJLAGE_KLEUR = {
  dartpijl: "hsl(var(--primary))",
  emirates: "#8a6a12",
  directeur: "#2f5d8c",
} as const;
import { useHorsCategorieSummary } from "@/hooks/useHorsCategorieSummary";
import { useLefevereReport } from "@/hooks/useLefevereReport";
import Stamp from "@/components/retro/Stamp";
import { useThema } from "@/contexts/ThemaContext";
import { cn } from "@/lib/utils";

const LAST_SUBPOULE_KEY = "karavaan:lastSubpouleId";
const UITLEG_DISMISS_KEY = "karavaan:uitlegDismissed";

export default function KaravaanFeed({
  onGoToPloeg,
  onOpenHors,
  onOpenSubpoule,
  onOpenUitslagen,
  gameId,
  gameStatus,
  horsBanner = true,
}: {
  onGoToPloeg?: () => void;
  onOpenHors?: (tab: HorsTabKey) => void;
  onOpenSubpoule?: (subpouleId: string) => void;
  onOpenUitslagen?: () => void;
  gameId?: string;
  gameStatus?: string;
  /** Hors Categorie-teaser tonen; uit te zetten per game in Go-live. */
  horsBanner?: boolean;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { thema } = useThema();
  const { data: curGame } = useCurrentGame();
  // Optioneel een specifieke (bv. afgeronde) game i.p.v. de live game.
  const game = gameId ? { id: gameId, status: gameStatus } : curGame;
  // Koers en jaar staan niet in de stub hierboven; bij een expliciet meegegeven
  // game halen we ze uit de (toch al gecachete) gamelijst. Nodig voor het
  // 3D-profiel, dat per koers en per jaar een eigen pad heeft.
  const { data: alleGames } = useAllGames();
  const gameMeta = gameId ? alleGames?.find((g) => g.id === gameId) : curGame;
  // Zonder expliciete game valt de vlag terug op de huidige koers; ontbreekt
  // de kolom nog, dan staat de banner aan (het gedrag van voorheen).
  const horsBannerZichtbaar = gameId ? horsBanner : (curGame?.hors_banner_visible ?? true);
  const subpoulesQuery = useSubpoules(game?.id);
  const subpoules = subpoulesQuery.subpoules;

  const navigate = useNavigate();
  const [selectedSubpouleId, setSelectedSubpouleId] = useState<string | null>(null);
  // Verwijsbutton naar /uitleg — eenmalig wegklikbaar (localStorage).
  const [uitlegDismissed, setUitlegDismissed] = useState<boolean>(
    () => (typeof window !== "undefined" ? localStorage.getItem(UITLEG_DISMISS_KEY) === "1" : true),
  );
  const dismissUitleg = () => {
    setUitlegDismissed(true);
    try { localStorage.setItem(UITLEG_DISMISS_KEY, "1"); } catch { /* ignore */ }
  };

  // Default: laatst-bekeken subpoule uit localStorage, anders eerste alfabetisch
  useEffect(() => {
    if (selectedSubpouleId || subpoules.length === 0) return;
    const stored = typeof window !== "undefined" ? localStorage.getItem(LAST_SUBPOULE_KEY) : null;
    const match = stored && subpoules.find((s) => s.id === stored);
    if (match) {
      setSelectedSubpouleId(match.id);
    } else {
      const sorted = [...subpoules].sort((a, b) => a.name.localeCompare(b.name));
      setSelectedSubpouleId(sorted[0].id);
    }
  }, [subpoules, selectedSubpouleId]);

  useEffect(() => {
    if (selectedSubpouleId && typeof window !== "undefined") {
      localStorage.setItem(LAST_SUBPOULE_KEY, selectedSubpouleId);
    }
  }, [selectedSubpouleId]);

  const feed = useKaravaanFeed({
    gameId: game?.id,
    subpouleId: selectedSubpouleId ?? undefined,
    userId: user?.id,
  });

  // Markeer bezoek 1.5s na mount, zodat de "nieuw"-marker zichtbaar blijft
  useEffect(() => {
    if (!user?.id) return;
    const t = setTimeout(() => {
      void markKaravaanVisited();
    }, 1500);
    return () => clearTimeout(t);
  }, [user?.id]);

  const newMarkerIndex = useMemo(
    () => findNewMarkerIndex(feed.data?.etappes ?? [], feed.data?.lastVisited ?? null),
    [feed.data?.etappes, feed.data?.lastVisited],
  );

  // Alle hooks vóór de early return aanroepen (Rules of Hooks): anders crasht de
  // pagina ("Rendered more hooks than during the previous render") wanneer de
  // gebruiker geen subpoule heeft.
  const horsSummary = useHorsCategorieSummary(gameId ? { id: gameId, status: gameStatus } : undefined);
  // Lefevere-rapport — zelfde gedeelde input als de Wielerdirecteur-tab, dus
  // dezelfde cache-key → 1-op-1 dezelfde tekst. Gepersisteerd per (entry,
  // aantal etappes): regenereert alleen bij een nieuwe gefiatteerde etappe.
  const lefevere = useLefevereReport(horsSummary.lefevereInput, {
    entryId: horsSummary.entryId,
    stageCount: horsSummary.stageCount,
    enabled: Boolean(horsSummary.lefevereInput),
  });

  // Bepaalt of er een verslag is: dat stuurt zowel het hoofdartikel als de
  // rubriekknop. Moet BOVEN de early return hieronder staan -- een hook die
  // soms wel en soms niet draait breekt de hook-volgorde. Daarom hier de
  // etappe rechtstreeks uit de feed in plaats van via laatsteEtappe, dat pas
  // verderop bestaat.
  // Het mobiele segment staat hier en niet in Voorpagina: de daguitslag-kaart
  // hieronder valt buiten dat component en moet met hetzelfde segment
  // meeschakelen, anders staat hij op elk tabje.
  const [segment, setSegment] = useState<Segment>("voorpagina");

  const { data: verslag } = useEtappeVerslag(feed.data?.etappes?.[0]?.stage_id);
  const heeftVerslag = Boolean(verslag?.tekst?.trim());

  // Archiefverhaal voor de rechterkolom. Staat er niets klaar in het
  // rubriek-tabje, dan komt er ook geen blok en geen knop.
  const { data: legendeItem } = useActiveLegende(game?.id);
  const heeftLegende = Boolean(legendeItem?.content?.trim());

  // Empty: geen subpoules
  if (subpoules.length === 0 && !subpoulesQuery.isLoading) {
    return (
      <div className="rounded-xl border-2 border-dashed border-foreground/20 bg-card p-6 text-center space-y-3">
        <Newspaper className="h-10 w-10 text-muted-foreground/50 mx-auto" />
        <p className="font-display font-bold text-lg">{t("karavaan.feed.noSubpouleTitle")}</p>
        <p className="text-sm text-muted-foreground font-serif italic max-w-md mx-auto">
          {t("karavaan.feed.noSubpouleBody", { krant: thema.krant })}
        </p>
      </div>
    );
  }

  const etappes = feed.data?.etappes ?? [];
  const ministrip = feed.data?.ministrip;

  // ── Kop en rubrieken van de Krant ──────────────────────────────────────────
  const koersNaam = gameMeta?.name ?? t("karavaan.voorpagina.naam");
  const laatsteEtappe = etappes[0] ?? null;
  const editie = laatsteEtappe
    ? `${thema.etappe} ${laatsteEtappe.stage_number}`
    : null;

  /** Springt naar een sectie verderop op deze pagina. */
  const naarSectie = (id: string) => {
    const doel = document.getElementById(id);
    if (!doel) return;
    const zacht = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    doel.scrollIntoView({ behavior: zacht ? "auto" : "smooth", block: "start" });
  };

  const subpouleNaam = subpoules.find((sp) => sp.id === selectedSubpouleId)?.name ?? null;

  const cellen: StandCel[] = ministrip
    ? [
        { key: "sub", waarde: ministrip.subpoule.rank == null ? "—" : `${ministrip.subpoule.rank}ᵉ`, label: t("karavaan.ministrip.labelSubpoule"), delta: ministrip.subpoule.delta, onClick: selectedSubpouleId ? () => onOpenSubpoule?.(selectedSubpouleId) : onGoToPloeg },
        { key: "all", waarde: ministrip.overall.rank == null ? "—" : `${ministrip.overall.rank}ᵉ`, label: t("karavaan.ministrip.labelOverall"), delta: ministrip.overall.delta, onClick: onOpenUitslagen },
        // Derde cel: hoeveelste je vandaag stond in de héle poule, niet hoeveel
        // punten je pakte. Een positie zegt meteen of het een goede dag was;
        // een puntenaantal moet je met anderen vergelijken om dat te weten.
        // Cel twee ernaast is dezelfde poule, maar dan het klassement.
        // Vóór de eerste uitslag valt hij terug op het totaal, anders staat er
        // een leeg vakje.
        ministrip.dagOverall.rank != null
          ? { key: "pt", waarde: `${ministrip.dagOverall.rank}ᵉ`, label: t("karavaan.ministrip.labelVandaag"), onClick: onOpenUitslagen }
          : { key: "pt", waarde: String(ministrip.points ?? "—"), label: t("karavaan.ministrip.labelPunten"), onClick: onGoToPloeg },
      ]
    : [];

  // Uitslag en stand voor de rechterkolom. De stand is die van je subpoule --
  // dat is de stand die jou aangaat; het totaalklassement staat op Uitslagen.
  const uitslagblok = laatsteEtappe ? (
    <Uitslagblok
      etappeNummer={laatsteEtappe.stage_number}
      etappeNaam={laatsteEtappe.stage_name}
      rituitslag={laatsteEtappe.rituitslag}
      stand={laatsteEtappe.subpouleStandings.slice(0, 10).map((r) => ({
        rang: r.rank,
        naam: r.team_name?.trim() || r.display_name || "—",
        deelnemer: r.team_name?.trim() && r.display_name !== r.team_name ? r.display_name : null,
        punten: r.points,
        isMij: r.is_me,
      }))}
    />
  ) : null;

  // Hoofdartikel over de laatste etappe. De kop komt uit de generator, maar
  // alleen als die de ritwinnaar noemt — anders een sjabloon uit de uitslag.
  const artikel: Hoofdartikel | null = (() => {
    if (!laatsteEtappe) return null;
    const kop = bouwKop({
      gegenereerd: laatsteEtappe.krant_kop,
      winnaar: laatsteEtappe.ritwinnaar,
      etappeNaam: laatsteEtappe.stage_name,
      etappeNummer: laatsteEtappe.stage_number,
      // De kop gaat over de koers. Noemt de generator toch een ploeg- of
      // deelnemersnaam, dan valt bouwKop terug op het sjabloon.
      poulenamen: [
        ...laatsteEtappe.subpouleStandings.flatMap((r) => [r.team_name, r.display_name]),
        ...laatsteEtappe.overallStandings.flatMap((r) => [r.team_name, r.display_name]),
      ],
    });
    // Geen winnaar (geschrapte of geneutraliseerde rit) en tóch nieuws: dan is
    // het verslag het hoofdartikel en komt de kop uit de eerste zin daarvan.
    // Zonder deze terugval verdween het hele artikelblok van de voorpagina --
    // verslag en al -- omdat bouwKop niets kon beweren.
    const kopOfVerslag =
      kop ??
      (heeftVerslag
        ? kopUitVerslag(verslag?.tekst) ??
          `${thema.etappe} ${laatsteEtappe.stage_number} zonder uitslag`
        : null);
    if (!kopOfVerslag) return null;

    const quotes: Hoofdartikel["quotes"] = [];
    if (laatsteEtappe.michel_tekst) quotes.push({ naam: "Michel Wuyts", tekst: laatsteEtappe.michel_tekst });
    if (laatsteEtappe.jose_tekst) quotes.push({ naam: "José De Cauwer", tekst: laatsteEtappe.jose_tekst });

    return {
      kicker: t("karavaan.voorpagina.kicker", { etappe: thema.etappe, nummer: laatsteEtappe.stage_number }),
      kop: kopOfVerslag,
      verslag: heeftVerslag
        ? (
          <Verslag
            variant="lead"
            stageId={laatsteEtappe.stage_id}
            stageNumber={laatsteEtappe.stage_number}
            stageName={laatsteEtappe.stage_name}
          />
        )
        : undefined,
      quotes,
    };
  })();

  // Hors Catégorie als bijlage: dezelfde drie cijfers die eerst achter
  // "+3 meer" in de standbalk zaten, nu als knoppen met hun eigen naam.
  //
  // Bewust NIET aan de oude banner-schakelaar gehangen. Die stond bij deze
  // koers op uit -- bedoeld om een brede reclamebanner weg te halen -- en zou
  // nu de enige verwijzing naar Hors Catégorie verbergen. De bijlage verschijnt
  // zodra er iets te tonen is: alle drie de cijfers leeg betekent een koers
  // waar nog niets berekend is, en dan wijst hij naar lege grafieken.
  const heeftHorsCijfers =
    horsSummary.monkeyBeatPct !== null ||
    horsSummary.emiratesPct !== null ||
    horsSummary.directorScore !== null;
  const bijlageTegels: BijlageTegel[] = heeftHorsCijfers
    ? [
        {
          key: "dartpijl",
          waarde: horsSummary.monkeyBeatPct,
          eenheid: "%",
          titel: t("karavaan.ministrip.monkeyTitle"),
          haak: t("karavaan.ministrip.monkeyLabel"),
          kleur: BIJLAGE_KLEUR.dartpijl,
          onClick: () => onOpenHors?.("dartpijl"),
        },
        {
          key: "emirates",
          waarde: horsSummary.emiratesPct,
          eenheid: "%",
          titel: t("karavaan.ministrip.emiratesTitle"),
          haak: t("karavaan.ministrip.emiratesLabel"),
          kleur: BIJLAGE_KLEUR.emirates,
          onClick: () => onOpenHors?.("superteam"),
        },
        {
          key: "directeur",
          waarde: horsSummary.directorScore,
          titel: t("karavaan.ministrip.wielerdirTitle"),
          haak: t("karavaan.ministrip.wielerdirLabel"),
          kleur: BIJLAGE_KLEUR.directeur,
          onClick: () => onOpenHors?.("wielerdirecteur"),
        },
      ]
    : [];

  const artikelQuotes = artikel?.quotes.length ?? 0;

  const rubrieken: Rubriek[] = [
    ...(selectedSubpouleId
      ? [{
          key: "daguitslag",
          emoji: "🏁",
          merk: `dag-${laatsteEtappe?.stage_number ?? 0}`,
          titel: t("karavaan.voorpagina.rubDaguitslag"),
          haak: t("karavaan.voorpagina.rubDaguitslagHaak"),
          tint: RUBRIEK_TINT.daguitslag,
          segment: "daguitslag" as const,
          onClick: () => naarSectie("krant-daguitslag"),
        }]
      : []),
    {
      key: "voorbeschouwing",
      emoji: "🗺️",
      titel: t("karavaan.voorpagina.rubVoorbeschouwing"),
      haak: t("karavaan.voorpagina.rubVoorbeschouwingHaak"),
      tint: RUBRIEK_TINT.voorbeschouwing,
      onClick: () => naarSectie("krant-voorbeschouwing"),
    },
    // De perszaal: wat Michel Wuyts en José De Cauwer over de dag zeggen.
    // Heette eerst "Verslag & commentaar" en sprong naar het verslag bovenaan,
    // maar dat stuk staat er al -- je hoeft er niet heen gestuurd te worden.
    // Deze knop brengt je naar de twee commentatoren.
    ...(artikelQuotes > 0 || etappes.length > 0
      ? [{
          key: "perszaal",
          emoji: "🎙️",
          merk: `perszaal-${laatsteEtappe?.stage_number ?? 0}`,
          titel: t("karavaan.voorpagina.rubPerszaal"),
          haak: t("karavaan.voorpagina.rubPerszaalHaak"),
          tint: RUBRIEK_TINT.verslag,
          segment: "perszaal" as const,
          onClick: () => naarSectie(artikelQuotes > 0 ? "krant-perszaal" : "krant-commentaar"),
        }]
      : []),
    ...(heeftLegende
      ? [{
          key: "legende",
          emoji: "📻",
          merk: `legende-${legendeItem?.id ?? ""}`,
          titel: t("karavaan.voorpagina.rubLegende"),
          haak: t("karavaan.voorpagina.rubLegendeHaak"),
          tint: RUBRIEK_TINT.legende,
          segment: "perszaal" as const,
          onClick: () => naarSectie("krant-legende"),
        }]
      : []),
  ];


  return (
    <div className="space-y-4">
      {/* Verwijsbutton naar de uitleg-hub — wegklikbaar, blijft weg na herladen */}
      {!uitlegDismissed && (
        <div className="retro-border no-hover-lift bg-card flex items-center gap-2 px-3 py-2">
          <button
            type="button"
            onClick={() => navigate("/uitleg")}
            className="flex-1 inline-flex items-center gap-1.5 text-sm font-semibold text-left hover:text-primary transition-colors"
          >
            {t("karavaan.feed.referralText")}
            <ArrowRight className="h-4 w-4 shrink-0" />
          </button>
          <button
            type="button"
            onClick={dismissUitleg}
            aria-label={t("karavaan.feed.referralHide")}
            className="shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}


      <Voorpagina
        koers={koersNaam}
        editie={editie}
        subpoules={subpoules.map((sp) => ({ id: sp.id, name: sp.name }))}
        selectedSubpouleId={selectedSubpouleId}
        onSelectSubpoule={setSelectedSubpouleId}
        cellen={cellen}
        rubrieken={rubrieken}
        uitslag={uitslagblok}
        legende={heeftLegende ? <Legende gameId={game?.id} /> : undefined}
        bijlage={bijlageTegels.length > 0 ? <HorsBijlage tegels={bijlageTegels} /> : undefined}
        segment={segment}
        onSegmentChange={setSegment}
        artikel={artikel}
      />

      {/* Daguitslag van de subpoule — horizontale bars per lid */}
      {selectedSubpouleId && (
        <div
          id="krant-daguitslag"
          className={cn("scroll-mt-24", segment !== "daguitslag" && "hidden lg:block")}
        >
        <DaguitslagChart
          subpouleId={selectedSubpouleId}
          subpouleName={subpoules.find((s) => s.id === selectedSubpouleId)?.name ?? ""}
          gameId={game?.id}
          gameStatus={game?.status}
        />
        </div>
      )}

      {/* De Voorbeschouwing — vooruitblik op de eerstvolgende etappe */}
      <div id="krant-voorbeschouwing" className="scroll-mt-24">
        <Voorbeschouwing gameId={game?.id} gameType={gameMeta?.game_type} jaar={gameMeta?.year} />
      </div>


      {/* Feed */}
      {feed.isLoading ? (
        <FeedSkeleton />
      ) : etappes.length === 0 ? (
        <EmptyFeed />
      ) : (
        <div id="krant-commentaar" className="space-y-4 scroll-mt-24">
          {etappes.map((et, i) => (
            <div key={et.stage_id}>
              {newMarkerIndex === i && <NieuwMarker />}
              <EtappeBlok
                etappe={et}
                defaultOpen={i < 2}
                showLefevere={i === 0}
                lefevereTekst={i === 0 ? lefevere.data?.directeursAnalyse ?? null : null}
                lefevereLaden={i === 0 && lefevere.isFetching}
                commentaarLaden={i === 0 && !et.michel_tekst && !et.jose_tekst && et.subpouleStandings.length >= 2}
                onOpenHors={onOpenHors}
              />
            </div>
          ))}
          {newMarkerIndex === etappes.length && <NieuwMarker />}
        </div>
      )}
    </div>
  );
}

// ─── Subpoule switcher (pill row + native select voor mobiel) ───────────────

function SubpouleSwitcher({
  subpoules,
  selectedId,
  onSelect,
}: {
  subpoules: Array<{ id: string; name: string }>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  if (subpoules.length === 0) return null;
  if (subpoules.length === 1) {
    return (
      <div className="flex items-center gap-2 text-xs font-display uppercase tracking-widest text-muted-foreground">
        <span>{t("karavaan.switcher.labelInline")}</span>
        <span className="font-bold text-foreground">{subpoules[0].name}</span>
      </div>
    );
  }
  // Veel subpoules (bv. als admin alles ziet) → zoekbare dropdown i.p.v. een
  // muur van pills (zelfde patroon als de Subpoules-tab).
  if (subpoules.length > 8) {
    const selected = subpoules.find((s) => s.id === selectedId);
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="overline-stamp">{t("karavaan.switcher.label")}</span>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" aria-expanded={open} className="justify-between font-normal min-w-[220px]">
              <span className="truncate">{selected?.name ?? t("karavaan.switcher.placeholder")}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput placeholder={t("karavaan.switcher.searchPlaceholder")} />
              <CommandList>
                <CommandEmpty>{t("karavaan.switcher.empty")}</CommandEmpty>
                <CommandGroup>
                  {subpoules.map((s) => (
                    <CommandItem key={s.id} value={s.name} onSelect={() => { onSelect(s.id); setOpen(false); }}>
                      <span className="flex-1 truncate font-medium">{s.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="overline-stamp">{t("karavaan.switcher.label")}</span>
      <div className="flex gap-1 rounded-xl border-2 border-foreground/15 bg-secondary/30 p-1 flex-wrap">
        {subpoules.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className={cn(
              "rounded-lg px-3 min-h-[36px] text-xs font-semibold uppercase tracking-wider transition-colors",
              selectedId === s.id
                ? "bg-card text-foreground shadow-sm border border-foreground/10"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
            )}
          >
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Etappe-blok ────────────────────────────────────────────────────────────

function EtappeBlok({
  etappe,
  defaultOpen,
  showLefevere,
  lefevereTekst,
  lefevereLaden,
  commentaarLaden,
  onOpenHors,
}: {
  etappe: KaravaanEtappe;
  defaultOpen: boolean;
  showLefevere?: boolean;
  lefevereTekst?: string | null;
  lefevereLaden?: boolean;
  /** On-demand generatie loopt (nieuwste etappe zonder commentaar, ≥2 leden). */
  commentaarLaden?: boolean;
  onOpenHors?: (tab: HorsTabKey) => void;
}) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(defaultOpen);
  const datum = new Date(etappe.approved_at).toLocaleDateString(
    i18n.language === "en" ? "en-GB" : "nl-NL",
    {
      day: "numeric",
      month: "short",
    },
  );

  return (
    <div className="retro-border bg-card overflow-hidden">
      {/* Etappe header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-3 md:px-4 py-3 flex items-center gap-3 bg-secondary/40 border-b border-border hover:bg-secondary/60 transition-colors"
      >
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
        <div className="flex-1 min-w-0 text-left">
          <span className="font-display font-bold text-sm md:text-base uppercase tracking-wider">
            {t("karavaan.etappe.stage", { number: etappe.stage_number })}
          </span>
          {etappe.stage_name && (
            <span className="font-serif italic text-sm text-muted-foreground ml-2">
              · {etappe.stage_name}
            </span>
          )}
        </div>
        <Stamp tone="ink" rotation={-2} className="hidden md:inline-block">{datum}</Stamp>
        <span className="font-stamp text-[10px] uppercase tracking-[0.2em] text-muted-foreground md:hidden">
          {datum}
        </span>
      </button>

      {open && (
        <div className="p-3 md:p-4 space-y-3">
          {/* Michel + José */}
          {(etappe.michel_tekst || etappe.jose_tekst) ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {etappe.michel_tekst && (
                <CommentaarKaart speaker="Michel Wuyts" text={etappe.michel_tekst} accent="primary" />
              )}
              {etappe.jose_tekst && (
                <CommentaarKaart speaker="José De Cauwer" text={etappe.jose_tekst} accent="gold" />
              )}
            </div>
          ) : commentaarLaden ? (
            /* On-demand generatie loopt: retro loading-kaart i.p.v. leeg blok.
               De realtime-subscriptie ververst de feed zodra de rij er staat. */
            <div className="rounded-lg border border-border bg-secondary/20 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Mic className="h-4 w-4 text-[hsl(var(--vintage-gold))] shrink-0" />
                <span className="font-display text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
                  {t("karavaan.etappe.commentaarSpeakers")}
                </span>
              </div>
              <p className="font-serif italic text-sm text-muted-foreground animate-pulse">
                {t("karavaan.etappe.commentaarLoading")}
              </p>
              <div className="mt-2 space-y-1.5" aria-hidden>
                <div className="h-2 rounded-full bg-foreground/10 animate-pulse w-[92%]" />
                <div className="h-2 rounded-full bg-foreground/10 animate-pulse w-[78%]" />
                <div className="h-2 rounded-full bg-foreground/10 animate-pulse w-[85%]" />
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground font-serif italic">
              {t("karavaan.etappe.commentaarNone")}
            </p>
          )}

          {/* Lefevere-rapport — alleen nieuwste etappe; 1-op-1 dezelfde tekst als
              in de Wielerdirecteur-tab */}
          {showLefevere && (
            <button
              type="button"
              onClick={() => onOpenHors?.("wielerdirecteur")}
              className="w-full text-left rounded-lg border border-[hsl(var(--vintage-gold))/0.5] bg-[hsl(var(--vintage-gold))/0.06] p-2.5 md:p-3 flex items-start gap-3 hover:bg-[hsl(var(--vintage-gold))/0.12] transition-colors"
            >
              <ClipboardList className="h-5 w-5 text-[hsl(var(--vintage-gold))] shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-display text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--vintage-gold))] font-bold mb-0.5">
                  {t("karavaan.etappe.lefevereTitle")}
                </div>
                {lefevereTekst ? (
                  <p className="font-serif italic text-sm text-foreground/90 leading-snug">"{lefevereTekst}"</p>
                ) : lefevereLaden ? (
                  <div>
                    <p className="font-serif italic text-sm text-muted-foreground leading-snug animate-pulse">
                      "{t("karavaan.etappe.lefevereLoading")}"
                    </p>
                    <div className="mt-2 space-y-1.5" aria-hidden>
                      <div className="h-2 rounded-full bg-foreground/10 animate-pulse w-[88%]" />
                      <div className="h-2 rounded-full bg-foreground/10 animate-pulse w-[70%]" />
                    </div>
                  </div>
                ) : (
                  <p className="font-serif italic text-sm text-foreground/85 leading-snug">
                    {t("karavaan.etappe.lefevereReady")}
                  </p>
                )}
                <span className="font-display text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1 inline-block">
                  {t("karavaan.etappe.lefevereCta")}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            </button>
          )}

          {/* Persoonlijke flash */}
          {etappe.personalFlash && <PersoonlijkeFlash flash={etappe.personalFlash} />}
        </div>
      )}
    </div>
  );
}

// ─── Commentaar-kaart (Michel of José) ──────────────────────────────────────

function CommentaarKaart({
  speaker,
  text,
  accent,
}: {
  speaker: string;
  text: string;
  accent: "primary" | "gold";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-2.5 md:p-3",
        accent === "primary" ? "border-primary/30" : "border-[hsl(var(--vintage-gold))/0.6]",
      )}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <Mic
          className={cn(
            "h-3 w-3 shrink-0",
            accent === "primary" ? "text-primary" : "text-[hsl(var(--vintage-gold))]",
          )}
        />
        <span
          className={cn(
            "font-display text-[10px] uppercase tracking-[0.2em] font-bold",
            accent === "primary" ? "text-primary" : "text-[hsl(var(--vintage-gold))]",
          )}
        >
          {speaker}
        </span>
      </div>
      <p className="font-serif italic text-sm leading-snug text-foreground/90">{text}</p>
    </div>
  );
}

// ─── Persoonlijke flash ─────────────────────────────────────────────────────

function PersoonlijkeFlash({ flash }: { flash: PersonalFlash }) {
  const { t } = useTranslation();
  const meta = flashMeta(flash, t);
  return (
    <div className={cn("rounded-md border-2 px-3 py-2 flex items-center gap-2", meta.border, meta.bg)}>
      <meta.Icon className={cn("h-4 w-4 shrink-0", meta.color)} />
      <p className={cn("font-display text-sm font-bold uppercase tracking-wider", meta.color)}>{meta.text}</p>
    </div>
  );
}

function flashMeta(flash: PersonalFlash, t: TFunction) {
  switch (flash.kind) {
    case "leider":
      return {
        Icon: Trophy,
        color: "text-[hsl(var(--maillot-jaune-dark))]",
        border: "border-[hsl(var(--maillot-jaune))/0.7]",
        bg: "bg-[hsl(var(--maillot-jaune))/0.12]",
        text: t("karavaan.flash.leider"),
      };
    case "podium":
      return {
        Icon: Trophy,
        color: "text-[hsl(var(--maillot-jaune-dark))]",
        border: "border-[hsl(var(--maillot-jaune))/0.7]",
        bg: "bg-[hsl(var(--maillot-jaune))/0.10]",
        text: t("karavaan.flash.podium", { rank: flash.rank }),
      };
    case "off-podium":
      return {
        Icon: HeartCrack,
        color: "text-[hsl(var(--bolletjes-bright))]",
        border: "border-[hsl(var(--bolletjes-bright))/0.5]",
        bg: "bg-[hsl(var(--bolletjes-bright))/0.06]",
        text: t("karavaan.flash.offPodium", { rank: flash.rank }),
      };
    case "stijging":
      return {
        Icon: TrendingUp,
        color: "text-[hsl(var(--maillot-groen))]",
        border: "border-[hsl(var(--maillot-groen))/0.4]",
        bg: "bg-[hsl(var(--maillot-groen))/0.08]",
        text: t("karavaan.flash.stijging", { rank: flash.rank, delta: flash.delta }),
      };
    case "daling":
      return {
        Icon: TrendingDown,
        color: "text-[hsl(var(--bolletjes-bright))]",
        border: "border-[hsl(var(--bolletjes-bright))/0.4]",
        bg: "bg-[hsl(var(--bolletjes-bright))/0.06]",
        text: t("karavaan.flash.daling", { rank: flash.rank, delta: Math.abs(flash.delta) }),
      };
    default:
      return {
        Icon: Sparkles,
        color: "text-muted-foreground",
        border: "border-foreground/15",
        bg: "bg-muted/30",
        text: t("karavaan.flash.beweging"),
      };
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function NieuwMarker() {
  const { t } = useTranslation();
  return (
    <div className="vintage-ornament my-3">
      <span className="overline-stamp text-[hsl(var(--bolletjes-bright))]">
        {t("karavaan.marker.nieuw")}
      </span>
    </div>
  );
}

function EmptyFeed() {
  const { t } = useTranslation();
  const { thema } = useThema();
  return (
    <div className="rounded-xl border-2 border-dashed border-foreground/20 bg-card p-6 text-center space-y-3">
      <Newspaper className="h-10 w-10 text-muted-foreground/50 mx-auto" />
      <p className="font-display font-bold text-lg">{t("karavaan.empty.title", { krant: thema.krant })}</p>
      <p className="text-sm text-muted-foreground font-serif italic max-w-md mx-auto">
        {t("karavaan.empty.body")}
      </p>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1].map((i) => (
        <div key={i} className="retro-border bg-card p-3 md:p-4 space-y-3 animate-pulse">
          <div className="h-4 w-2/5 bg-muted rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="h-20 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
          </div>
          <div className="h-24 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}
