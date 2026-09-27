/**
 * Ploeg samenstellen (Meermarathon) — de dunne container met de data. De
 * weergave staat in PloegSamenstellen.tsx.
 *
 * Wat de database vraagt: submit_entry wil in elke categorie een keuze, meer
 * niet. Jokers horen bij de wielergames: de Meermarathon kent ze niet. De
 * pronostiek is hier geen GC-podium met truien maar twee winnaars: van het
 * Cup-klassement (kunstijs) en het Grand Prix-klassement (natuurijs), per
 * peloton. Die staan los van de ploeg: ook na bevestigen te wijzigen zolang
 * de inschrijving open is.
 *
 * Eén game, twee pelotons, samen op één scherm: je stelt je vrouwen- en je
 * mannenploeg tegelijk samen. Allebei hoeft niet. Je rijdt mee bij een
 * peloton zodra je daar een ploeg hebt of op "Doe mee" tikt; die keuze staat
 * in de browser. Pas dan draait de data van dat peloton, want useEntry maakt
 * bij het openen meteen een entry aan: nooit voor een peloton dat je niet koos.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useCategories } from "@/hooks/useCategories";
import { useEntry, entryErrorMessage } from "@/hooks/useEntry";
import { useStartlist } from "@/hooks/useStartlist";
import { useMeermarathonSeizoen } from "@/hooks/useMeermarathonSeizoen";
import { useSelectedGame } from "@/context/SelectedGameContext";
import type { Game } from "@/hooks/useCurrentGame";
import MeermarathonPelotonbalk from "@/components/meermarathon/Pelotonbalk";
import {
  PloegSamenstellen,
  PloegSamenstellenGesloten,
  PloegSamenstellenLaden,
  type PsBouw,
  type PsPeloton,
} from "@/components/meermarathon/PloegSamenstellen";
import { canRegister } from "@/lib/gameStatus";
import { meermarathonCategorieLabel, meermarathonSeason, parseMeermarathonCategorie } from "@/lib/gameTypes";
import { bewaarDeelname, deelnameOpties, deelnameSleutel, leesDeelname } from "@/lib/meermarathonDeelname";
import type { MeermarathonGameStatus, MmGameLite } from "@/lib/meermarathonSeizoen";
import { volgendeDeadline } from "@/lib/mijnMeermarathon";
import {
  geldigeKeuzes,
  leesVoorspellingen,
  voorspellingenNa,
  pickActies,
  sluitReden,
  teambouwerDoel,
  telling,
  type KiesDoel,
  type PsCategorie,
  type PsRijder,
} from "@/lib/ploegSamenstellen";
import { captureEvent, captureException } from "@/lib/posthog";

type GameKort = { id: string; name: string; status: string; categorie?: string | null };

const PELOTONBALK = <MeermarathonPelotonbalk className="mb-2 md:mb-6 md:mx-auto md:max-w-2xl" />;

/** "Vrouwen", of "Meermarathon" voor een game zonder categorie. */
function gameLabel(g: GameKort): string {
  return meermarathonCategorieLabel(g.categorie) ?? "Meermarathon";
}

/** "Meermarathon Vrouwen", of de gamenaam als er geen categorie is. */
function gameNaam(g: GameKort): string {
  const label = meermarathonCategorieLabel(g.categorie);
  return label ? `Meermarathon ${label}` : g.name;
}

const volgwagenPad = (gameId: string) => `/mijn-peloton?tab=team&game=${encodeURIComponent(gameId)}`;

/** Kies een game zoals de pelotonbalk dat doet: in de context én als ?game=. */
function useKiesGame() {
  const { setSelectedGameId } = useSelectedGame();
  const [, setParams] = useSearchParams();
  return (id: string) => {
    setSelectedGameId(id);
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        next.set("game", id);
        return next;
      },
      { replace: true },
    );
  };
}

function opslag(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

/**
 * Waar de speler dit seizoen meerijdt, zoals hij het zelf koos. Staat in de
 * browser; wie als gast koos en daarna inlogt, neemt zijn keuze mee.
 */
function useDeelname(userId: string | null, jaar: number) {
  const sleutel = deelnameSleutel(userId, jaar);
  const lees = useCallback(
    () => leesDeelname(opslag(), sleutel) ?? (userId ? leesDeelname(opslag(), deelnameSleutel(null, jaar)) : null),
    [sleutel, userId, jaar],
  );
  const [keuze, setKeuze] = useState<string[] | null>(lees);
  useEffect(() => setKeuze(lees()), [lees]);
  const bewaar = useCallback(
    (ids: string[]) => {
      bewaarDeelname(opslag(), sleutel, ids);
      setKeuze(ids);
    },
    [sleutel],
  );
  return [keuze, bewaar] as const;
}

/** Zelfde paginamarges als de rest van de app (mobiel 12px, zie .container). */
function Pagina({ children }: { children: ReactNode }) {
  return <div className="container mx-auto px-5 pb-4 pt-1 md:pb-8 md:pt-7">{children}</div>;
}

/** game = null: de game laadt nog, maar we weten al dat het de Meermarathon is. */
export default function PloegSamenstellenContainer({ game }: { game: Game | null }) {
  return <Pagina>{game ? <Inhoud game={game} /> : <PloegSamenstellenLaden />}</Pagina>;
}

function Inhoud({ game }: { game: Game }) {
  const { role, loading: authLaadt } = useAuth();
  const isAdmin = role === "admin";
  const { selectedGameId, selectedGame } = useSelectedGame();
  const kiesGame = useKiesGame();
  const doel = teambouwerDoel(game, selectedGame, selectedGameId != null);
  const { seizoen, statussen, isLoading: seizoenLaadt } = useMeermarathonSeizoen();

  useEffect(() => {
    if (doel.soort === "volg") kiesGame(doel.gameId);
    // kiesGame is elke render nieuw; alleen de uitkomst telt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doel.soort, doel.gameId]);

  // Het seizoen volgt de gekozen game. Hoort het (nog) niet bij deze game,
  // dan wachten: anders staan er pelotons van een ander jaar op het scherm.
  const pelotonGames: MmGameLite[] =
    seizoen.length === 0 ? [{ ...game, game_type: game.game_type ?? null }] : seizoen.filter((g) => g.year === game.year);
  // Eerst weten of je al ergens een ploeg hebt; anders flitst er een
  // uitnodiging voor een peloton waar je allang meedoet.
  if (authLaadt || seizoenLaadt || pelotonGames.length === 0) return <PloegSamenstellenLaden />;

  // Inschrijven mag alleen tijdens open_inschrijving; de beheerder mag altijd
  // (net als in de wielerteambouwer). Staat er niets meer open, dan de
  // gesloten pagina van het peloton dat je bekeek.
  if (!pelotonGames.some((g) => isAdmin || canRegister(g.status))) {
    const toon = doel.soort === "keuze-dicht" && selectedGame ? selectedGame : game;
    return <Gesloten game={toon} />;
  }

  return (
    <Bouwer
      // Een ander seizoen begint met een schone lei (ploegnamen, "heropend").
      key={pelotonGames.map((g) => g.id).join(",")}
      jaar={game.year}
      games={pelotonGames}
      statussen={statussen}
      isAdmin={isAdmin}
    />
  );
}

function Gesloten({ game }: { game: GameKort }) {
  const { user } = useAuth();
  // Bewust geen useEntry: die maakt een entry aan, en voor een dichte game
  // schrijf je je daar nergens mee in.
  const { statussen, isLoading } = useMeermarathonSeizoen();
  if (user && isLoading) return <PloegSamenstellenLaden pelotonbalk={PELOTONBALK} />;
  const status = statussen.find((s) => s.game.id === game.id);
  return (
    <PloegSamenstellenGesloten
      pelotonbalk={PELOTONBALK}
      gameNaam={gameNaam(game)}
      label={gameLabel(game)}
      reden={sluitReden(game.status)}
      eigen={user && status ? { fase: status.fase, ploegnaam: status.entry?.teamName ?? null } : null}
      volgwagenPad={volgwagenPad(game.id)}
      uitslagenPad="/uitslagen"
    />
  );
}

function Bouwer({
  jaar,
  games,
  statussen,
  isAdmin,
}: {
  jaar: number;
  /** De pelotons van dit seizoen, vrouwen voorop; één of twee. */
  games: MmGameLite[];
  statussen: MeermarathonGameStatus[];
  isAdmin: boolean;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [keuze, bewaarKeuze] = useDeelname(user?.id ?? null, jaar);
  const enkel = games.length < 2;

  const open = (g: GameKort) => isAdmin || canRegister(g.status);
  // Met één peloton valt er niets te kiezen: dan rijd je daar mee.
  const meedoen = (g: GameKort) => {
    if (enkel) return true;
    const s = statussen.find((x) => x.game.id === g.id);
    return (s != null && s.fase !== "niet-ingeschreven") || Boolean(keuze?.includes(g.id));
  };

  // Vast twee aanroepen, zodat de volgorde van de hooks nooit verandert; een
  // peloton waar je niet meerijdt krijgt null en haalt dus niets op.
  const [a, b] = games;
  const bronA = usePelotonBouwer(a && open(a) && meedoen(a) ? a : null);
  const bronB = usePelotonBouwer(b && open(b) && meedoen(b) ? b : null);
  const bronnen = [bronA, bronB].slice(0, games.length);
  const klaarVoorGebruik = bronnen.filter((x): x is PelotonBron & { bouw: Omit<PsBouw, "onNietMeedoen"> } => x.bouw != null);

  const opties = useMemo(() => deelnameOpties(statussen, isAdmin), [statussen, isAdmin]);
  const deadline = volgendeDeadline(statussen, new Date());

  const zetKeuze = (id: string, aan: boolean) => {
    const ids = new Set(keuze ?? []);
    if (aan) ids.add(id);
    else ids.delete(id);
    // In de volgorde van de pelotons, niet in die van het aantikken.
    bewaarKeuze(games.map((g) => g.id).filter((x) => ids.has(x)));
  };

  const pelotons: PsPeloton[] = games.map((g, i) => {
    const basis = { id: g.id, label: gameLabel(g), categorie: parseMeermarathonCategorie(g.categorie) };
    const status = statussen.find((s) => s.game.id === g.id);
    if (!open(g)) return { ...basis, stand: "gesloten", reden: sluitReden(g.status), fase: status?.fase ?? null };
    if (!meedoen(g)) {
      const optie = opties.find((o) => o.id === g.id);
      return {
        ...basis,
        stand: "uitnodiging",
        info: optie ? `${optie.ploeg} · ${optie.kalender}` : "Eigen ploeg, eigen klassement",
        onMeedoen: () => zetKeuze(g.id, true),
      };
    }
    const bouw = bronnen[i]?.bouw;
    if (!bouw) return { ...basis, stand: "laden" };
    return { ...basis, stand: "bouwen", bouw: { ...bouw, onNietMeedoen: enkel ? null : () => zetKeuze(g.id, false) } };
  });

  // ── Acties voor de hele pagina ──
  const [actie, setActie] = useState<"opslaan" | "bevestigen" | null>(null);

  const vraagInlog = (wat: string) => {
    toast({ title: "Log eerst in", description: `Log in of maak een account om ${wat}.` });
    navigate("/login");
  };

  // Keuzes staan al in de database zodra je ze maakt. Opslaan bewaart
  // wat nog alleen hier staat (de ploegnamen) en zegt waar je aan toe bent.
  const opslaan = async () => {
    if (!user) return vraagInlog("je ploeg op te slaan");
    if (klaarVoorGebruik.length === 0) return;
    setActie("opslaan");
    let ok = true;
    for (const bron of klaarVoorGebruik) ok = (await bron.bewaarNaam()) && ok;
    setActie(null);
    if (!ok) return;
    for (const bron of klaarVoorGebruik) {
      captureEvent("team_draft_saved", {
        game_id: bron.game.id,
        game_status: bron.game.status,
        picks_completed: bron.tel.gekozen,
        picks_required: bron.tel.vereist,
      });
    }
    const nogOpen = klaarVoorGebruik.filter((x) => !x.ingediend);
    const meer = klaarVoorGebruik.length > 1;
    toast({
      title: "Alles is bewaard",
      description:
        nogOpen.length === 0
          ? meer
            ? "Je ploegen zijn bevestigd en doen mee."
            : "Je ploeg is bevestigd en doet mee."
          : nogOpen.every((x) => x.tel.compleet)
            ? nogOpen.length > 1
              ? "Je ploegen zijn compleet. Bevestig ze om mee te doen."
              : "Je ploeg is compleet. Bevestig hem om mee te doen."
            : "Je kunt later verder. Bevestig je ploeg als hij compleet is; pas dan doe je mee.",
    });
  };

  // Bevestigt elke complete ploeg die nog niet bevestigd is. Een ploeg die nog
  // niet compleet is, houdt de andere niet tegen: allebei hoeft niet.
  const bevestigen = async () => {
    if (!user) return vraagInlog("je ploeg te bevestigen");
    const klaar = klaarVoorGebruik.filter((x) => !x.ingediend && x.tel.compleet);
    if (klaar.length === 0) return;
    setActie("bevestigen");
    const gelukt: MmGameLite[] = [];
    try {
      for (const bron of klaar) if (await bron.bevestig()) gelukt.push(bron.game);
    } finally {
      setActie(null);
    }
    if (gelukt.length === 0) return;
    const onaf = klaarVoorGebruik.filter((x) => !x.ingediend && !klaar.includes(x));
    const waar = enkel
      ? `met de ${gameNaam(gelukt[0])}`
      : `bij ${gelukt.map((g) => `de ${gameLabel(g).toLowerCase()}`).join(" én ")}`;
    const rest = onaf.map((x) => ` Je ${gameLabel(x.game).toLowerCase()}ploeg is nog niet compleet.`).join("");
    toast({ title: gelukt.length > 1 ? "Ploegen bevestigd" : "Ploeg bevestigd", description: `Je doet mee ${waar}.${rest}` });
  };

  const volgwagenGame = klaarVoorGebruik.find((x) => x.ingediend)?.game ?? games[0];

  return (
    <PloegSamenstellen
      gameNaam={enkel ? gameNaam(games[0]) : `Meermarathon ${meermarathonSeason(jaar)}`}
      pelotons={pelotons}
      deadline={deadline}
      ingelogd={Boolean(user)}
      bezig={actie}
      volgwagenPad={volgwagenPad(volgwagenGame.id)}
      uitslagenPad="/uitslagen"
      onOpslaan={() => void opslaan()}
      onBevestigen={() => void bevestigen()}
      onInloggen={() => navigate("/login")}
    />
  );
}

type PelotonBron = ReturnType<typeof usePelotonBouwer>;

/**
 * Alles van één peloton: rijders, je ploeg, je pronostiek en wat je ermee
 * doet. game = null: je rijdt hier niet mee, er wordt niets opgehaald en
 * dus ook geen entry aangemaakt.
 */
function usePelotonBouwer(game: MmGameLite | null) {
  const { user } = useAuth();
  const ingelogd = Boolean(user);
  const navigate = useNavigate();
  const { toast } = useToast();
  const gameId = game?.id;
  const label = game ? gameLabel(game) : "";

  const { data: cats = [], isLoading: catsLaden, isError: catsFout } = useCategories(gameId);
  const { data: startlijst = [], isLoading: startLaden } = useStartlist(gameId, "", "");
  const {
    entry,
    isLoading: entryLaden,
    isError: entryFout,
    picksByCategory,
    predictions,
    teamName,
    savePick,
    togglePick,
    savePredictions,
    saveTeamName,
    submitEntry,
    revertEntry,
  } = useEntry(gameId);

  // ── Data in de vorm van het scherm ──
  const ploegVanTeam = useMemo(() => new Map(startlijst.map((t) => [t.id, t.name])), [startlijst]);
  const categorieen = useMemo<PsCategorie[]>(
    () =>
      cats.map((c) => ({
        id: c.id,
        naam: c.name,
        max: c.max_picks ?? 1,
        rijders: c.category_riders.flatMap((cr) =>
          cr.riders
            ? [
                {
                  id: cr.riders.id,
                  naam: cr.riders.name,
                  ploeg: cr.riders.team_id ? (ploegVanTeam.get(cr.riders.team_id) ?? null) : null,
                  nummer: cr.riders.start_number,
                },
              ]
            : [],
        ),
      })),
    [cats, ploegVanTeam],
  );
  // De hele startlijst: kandidaten voor de pronostiek.
  const startRijders = useMemo<PsRijder[]>(
    () => startlijst.flatMap((t) => t.riders.map((r) => ({ id: r.id, naam: r.name, ploeg: t.name, nummer: r.start_number }))),
    [startlijst],
  );
  const gekozen = useMemo(() => geldigeKeuzes(categorieen, picksByCategory), [categorieen, picksByCategory]);
  const tel = telling(categorieen, gekozen);
  const ingediend = entry?.status === "submitted";
  const pronostiek = useMemo(
    () =>
      startRijders.length > 0
        ? { rijders: startRijders, gekozen: leesVoorspellingen(predictions), wijzigbaar: ingelogd && Boolean(entry) }
        : null,
    [startRijders, predictions, ingelogd, entry],
  );

  // ── Ploegnaam ──
  // Het veld houdt een eigen concept bij tot je het verlaat of op Enter drukt;
  // dan gaat hij naar de database. Opslaan en Bevestigen wachten op een save
  // die nog loopt, zodat een klik direct na het typen niets kwijtraakt.
  const [naamConcept, setNaamConcept] = useState<string | null>(null);
  const ploegnaam = naamConcept ?? teamName ?? "";
  const ploegnaamRef = useRef(ploegnaam);
  ploegnaamRef.current = ploegnaam;
  const bewaardRef = useRef((teamName ?? "").trim());
  useEffect(() => {
    bewaardRef.current = (teamName ?? "").trim();
  }, [teamName]);
  const naamLoopt = useRef<Promise<unknown> | null>(null);

  const bewaarNaam = async (): Promise<boolean> => {
    while (naamLoopt.current) await naamLoopt.current.catch(() => undefined);
    if (!entry) return true;
    const gewenst = ploegnaamRef.current.trim();
    if (gewenst === bewaardRef.current) return true;
    const p = saveTeamName.mutateAsync({ entryId: entry.id, teamName: gewenst });
    naamLoopt.current = p;
    try {
      await p;
      bewaardRef.current = gewenst;
      return true;
    } catch (error) {
      toast({ title: "Ploegnaam niet bewaard", description: entryErrorMessage(error), variant: "destructive" });
      return false;
    } finally {
      if (naamLoopt.current === p) naamLoopt.current = null;
    }
  };

  // ── Acties in dit peloton ──
  const [aanpassenBezig, setAanpassenBezig] = useState(false);
  const [heropend, setHeropend] = useState(false);
  const kiezen = savePick.isPending || togglePick.isPending || savePredictions.isPending;

  const vraagInlog = (wat: string) => {
    toast({ title: "Log eerst in", description: `Log in of maak een account om ${wat}.` });
    navigate("/login");
  };

  // savePredictions meldt zelf niets (de wielerbouwer heeft eigen toasts);
  // hier dus wel, en de fout gaat door zodat kies/haalWeg stoppen.
  const bewaarVoorspelling = async (klassement: "cup" | "grandprix", rijderId: string | null) => {
    if (!entry) return;
    try {
      await savePredictions.mutateAsync({
        entryId: entry.id,
        predictions: voorspellingenNa(predictions, klassement, rijderId),
      });
    } catch (error) {
      toast({ title: "Voorspelling niet bewaard", description: entryErrorMessage(error), variant: "destructive" });
      throw error;
    }
  };

  const kies = async (doel: KiesDoel, rijderId: string) => {
    if (!user) return vraagInlog("een rijder te kiezen");
    if (!entry) return;
    try {
      if (doel.soort === "voorspelling") {
        await bewaarVoorspelling(doel.klassement, rijderId);
        return;
      }
      const cat = categorieen.find((c) => c.id === doel.categorieId);
      if (!cat) return;
      const inCategorie = gekozen.get(cat.id) ?? [];
      const acties = pickActies({ max: cat.max, inCategorie, oud: inCategorie[doel.plek] ?? null, nieuw: rijderId });
      for (const a of acties) {
        const args = { entryId: entry.id, categoryId: cat.id, riderId: a.rijderId };
        if (a.soort === "vervang") await savePick.mutateAsync(args);
        else await togglePick.mutateAsync(args);
      }
    } catch {
      // useEntry meldt de fout al en zet de cache terug.
    }
  };

  const haalWeg = async (doel: KiesDoel) => {
    if (!user || !entry) return;
    try {
      if (doel.soort === "voorspelling") {
        await bewaarVoorspelling(doel.klassement, null);
        return;
      }
      const oud = gekozen.get(doel.categorieId)?.[doel.plek];
      if (oud) await togglePick.mutateAsync({ entryId: entry.id, categoryId: doel.categorieId, riderId: oud });
    } catch {
      // useEntry meldt de fout al en zet de cache terug.
    }
  };

  /** Bevestig deze ploeg; true als dat lukte. Een fout meldt hij zelf. */
  const bevestig = async (): Promise<boolean> => {
    if (!game || !entry || !tel.compleet) return false;
    try {
      if (!(await bewaarNaam())) return false;
      await submitEntry.mutateAsync({ entryId: entry.id });
      captureEvent("team_submitted", {
        game_id: game.id,
        game_status: game.status,
        was_resubmission: heropend,
        picks_completed: tel.gekozen,
        picks_required: tel.vereist,
      });
      setHeropend(false);
      return true;
    } catch (error) {
      captureException(error, { area: "team_builder", action: "submit_team", game_id: game.id });
      toast({
        title: label ? `${label}: bevestigen mislukt` : "Bevestigen mislukt",
        description: entryErrorMessage(error),
        variant: "destructive",
      });
      return false;
    }
  };

  const aanpassen = async () => {
    if (!entry) return;
    setAanpassenBezig(true);
    try {
      await revertEntry.mutateAsync({ entryId: entry.id });
      setHeropend(true);
      toast({ title: "Je ploeg is weer aan te passen", description: "Bevestig hem opnieuw als je klaar bent." });
    } catch (error) {
      toast({ title: "Aanpassen lukt niet", description: entryErrorMessage(error), variant: "destructive" });
    } finally {
      setAanpassenBezig(false);
    }
  };

  const laden = !game || catsLaden || startLaden || (ingelogd && entryLaden);
  const bouw: Omit<PsBouw, "onNietMeedoen"> | null = laden
    ? null
    : {
        categorieen,
        gekozen,
        pronostiek,
        ploegnaam,
        ploegnaamBewaard: ploegnaam.trim() === (teamName ?? "").trim(),
        ingediend,
        heropend,
        bezig: aanpassenBezig ? "aanpassen" : kiezen ? "kiezen" : null,
        fout: catsFout
          ? "De rijders zijn nu niet te laden. Probeer het straks opnieuw."
          : ingelogd && entryFout
            ? "Je ploeg is nu niet te laden. Probeer het straks opnieuw."
            : null,
        onPloegnaam: setNaamConcept,
        onPloegnaamKlaar: () => void bewaarNaam(),
        onKies: (doel, rijderId) => void kies(doel, rijderId),
        onHaalWeg: (doel) => void haalWeg(doel),
        onAanpassen: () => void aanpassen(),
      };

  // game is alleen null als bouw dat ook is; de cast houdt de aanroepers simpel.
  return { game: game as MmGameLite, bouw, tel, ingediend, bewaarNaam, bevestig };
}
