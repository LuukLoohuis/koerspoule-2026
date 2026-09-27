/**
 * Ploeg samenstellen (Meermarathon) — de dunne container met de data. De
 * weergave staat in PloegSamenstellen.tsx.
 *
 * Wat de database vraagt: submit_entry wil in elke categorie een keuze, meer
 * niet. Jokers zijn optioneel maar tellen wel (calculate_stage_scores, en de
 * live projectie rekent ze mee), dus die bieden we aan zodra er rijders
 * buiten de categorieën zijn. De pronostiek is hier geen GC-podium met truien
 * maar twee winnaars: van het Cup-klassement (kunstijs) en het Grand
 * Prix-klassement (natuurijs), per peloton. Die staan los van de ploeg: ook
 * na bevestigen te wijzigen zolang de inschrijving open is.
 *
 * Eén game, twee pelotons: wie nog nergens een ploeg heeft, kiest eerst waar
 * hij meerijdt (vrouwen, mannen of allebei). Pas daarna start de bouwer, want
 * die maakt bij het openen meteen een entry aan. Koos je allebei, dan wijst
 * de bouwer na het bevestigen door naar het andere peloton.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useCategories } from "@/hooks/useCategories";
import { useEntry, entryErrorMessage } from "@/hooks/useEntry";
import { useStartlist } from "@/hooks/useStartlist";
import { useJokerMultiplier } from "@/hooks/useJokerMultiplier";
import { useMeermarathonSeizoen } from "@/hooks/useMeermarathonSeizoen";
import { useSelectedGame } from "@/context/SelectedGameContext";
import type { Game } from "@/hooks/useCurrentGame";
import DeelnameKeuze from "@/components/meermarathon/DeelnameKeuze";
import MeermarathonPelotonbalk from "@/components/meermarathon/Pelotonbalk";
import {
  PloegSamenstellen,
  PloegSamenstellenGesloten,
  PloegSamenstellenLaden,
  type PsBezig,
} from "@/components/meermarathon/PloegSamenstellen";
import { canRegister } from "@/lib/gameStatus";
import { meermarathonCategorieLabel, meermarathonSeason } from "@/lib/gameTypes";
import {
  bewaarDeelname,
  deelnameOpties,
  deelnameSleutel,
  eerstePeloton,
  leesDeelname,
  moetKiezen,
  standaardKeuze,
  volgendPeloton,
} from "@/lib/meermarathonDeelname";
import { mmMoment, type MeermarathonGameStatus } from "@/lib/meermarathonSeizoen";
import { volgendeDeadline } from "@/lib/mijnMeermarathon";
import {
  geldigeKeuzes,
  jokerPool,
  jokersNa,
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
  return <Pagina>{game ? <Inhoud game={game} /> : <PloegSamenstellenLaden pelotonbalk={PELOTONBALK} />}</Pagina>;
}

function Inhoud({ game }: { game: Game }) {
  const { user, role, loading: authLaadt } = useAuth();
  const isAdmin = role === "admin";
  const { selectedGameId, selectedGame } = useSelectedGame();
  const kiesGame = useKiesGame();
  const doel = teambouwerDoel(game, selectedGame, selectedGameId != null);

  const { statussen, isLoading: seizoenLaadt } = useMeermarathonSeizoen();
  const [keuze, bewaarKeuze] = useDeelname(user?.id ?? null, game.year);
  // Na de keuze wisselt de game soms nog; tot die tijd geen bouwer, anders
  // maakt hij een entry aan in een peloton dat je niet koos.
  const [naKeuze, setNaKeuze] = useState<string | null>(null);

  useEffect(() => {
    if (doel.soort === "volg") kiesGame(doel.gameId);
    // kiesGame is elke render nieuw; alleen de uitkomst telt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doel.soort, doel.gameId]);

  // Zonder bewaarde keuze moeten we eerst weten of je al ergens een ploeg
  // hebt; tot dan geen bouwer en geen keuzescherm dat weer wegflitst.
  if (keuze == null && (authLaadt || seizoenLaadt)) return <PloegSamenstellenLaden />;
  if (moetKiezen(statussen, keuze, isAdmin)) {
    return (
      <Keuze
        statussen={statussen}
        isAdmin={isAdmin}
        onVerder={(ids) => {
          bewaarKeuze(ids);
          const eerste = eerstePeloton(statussen, ids, isAdmin);
          if (eerste && eerste.game.id !== game.id) {
            setNaKeuze(eerste.game.id);
            kiesGame(eerste.game.id);
          }
        }}
      />
    );
  }
  if (naKeuze && naKeuze !== game.id) return <PloegSamenstellenLaden pelotonbalk={PELOTONBALK} />;

  if (doel.soort === "keuze-dicht" && selectedGame) {
    return (
      <Gesloten
        game={selectedGame}
        alternatief={canRegister(game.status) ? game : null}
        onAlternatief={kiesGame}
      />
    );
  }
  // Inschrijven mag alleen tijdens open_inschrijving; de beheerder mag altijd
  // (net als in de wielerteambouwer).
  if (!isAdmin && !canRegister(game.status)) return <Gesloten game={game} alternatief={null} />;
  // Eigen key per game: wissel je met de pelotonbalk, dan begint de
  // ploegnaam, de actieve plek en "heropend" opnieuw.
  const volgend = volgendPeloton(statussen, keuze, game.id, isAdmin);
  return (
    <Bouwer
      key={game.id}
      game={game}
      volgende={volgend ? { label: volgend.label, onKies: () => kiesGame(volgend.game.id) } : null}
    />
  );
}

/** De eerste stap: waar rijd je mee? Nog zonder bouwer, dus zonder entry. */
function Keuze({
  statussen,
  isAdmin,
  onVerder,
}: {
  statussen: MeermarathonGameStatus[];
  isAdmin: boolean;
  onVerder: (ids: string[]) => void;
}) {
  const opties = useMemo(() => deelnameOpties(statussen, isAdmin), [statussen, isAdmin]);
  const [gekozen, setGekozen] = useState(() => new Set(standaardKeuze(opties)));
  const deadline = volgendeDeadline(statussen, new Date());
  const jaar = statussen[0]?.game.year;

  return (
    <DeelnameKeuze
      className="mx-auto mt-2 max-w-3xl"
      seizoen={jaar != null ? meermarathonSeason(jaar) : ""}
      opties={opties}
      gekozen={gekozen}
      onWissel={(id) =>
        setGekozen((oud) => {
          const nieuw = new Set(oud);
          if (nieuw.has(id)) nieuw.delete(id);
          else nieuw.add(id);
          return nieuw;
        })
      }
      // In de volgorde van de pelotons, niet in die van het aantikken.
      onVerder={() => onVerder(opties.filter((o) => gekozen.has(o.id)).map((o) => o.id))}
      deadline={deadline ? mmMoment(deadline) : null}
    />
  );
}

function Gesloten({
  game,
  alternatief,
  onAlternatief,
}: {
  game: GameKort;
  alternatief: GameKort | null;
  onAlternatief?: (id: string) => void;
}) {
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
      alternatief={alternatief ? { id: alternatief.id, label: gameLabel(alternatief) } : null}
      onAlternatief={onAlternatief}
      volgwagenPad={volgwagenPad(game.id)}
      uitslagenPad="/uitslagen"
    />
  );
}

function Bouwer({
  game,
  volgende,
}: {
  game: Game;
  /** Het andere gekozen peloton dat nog op een ploeg wacht. */
  volgende: { label: string; onKies: () => void } | null;
}) {
  const { user } = useAuth();
  const ingelogd = Boolean(user);
  const navigate = useNavigate();
  const { toast } = useToast();
  const naam = gameNaam(game);

  const { statussen } = useMeermarathonSeizoen();
  const deadline = statussen.find((s) => s.game.id === game.id)?.deadline ?? null;

  const { data: cats = [], isLoading: catsLaden, isError: catsFout } = useCategories(game.id);
  const { data: startlijst = [], isLoading: startLaden } = useStartlist(game.id, "", "");
  const {
    entry,
    isLoading: entryLaden,
    isError: entryFout,
    picksByCategory,
    jokerIds,
    predictions,
    teamName,
    savePick,
    togglePick,
    saveJoker,
    savePredictions,
    saveTeamName,
    submitEntry,
    revertEntry,
  } = useEntry(game.id);
  const vermenigvuldiger = useJokerMultiplier(game.id);

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
  const startRijders = useMemo<PsRijder[]>(
    () => startlijst.flatMap((t) => t.riders.map((r) => ({ id: r.id, naam: r.name, ploeg: t.name, nummer: r.start_number }))),
    [startlijst],
  );
  const pool = useMemo(() => jokerPool(startRijders, categorieen), [startRijders, categorieen]);
  const gekozen = useMemo(() => geldigeKeuzes(categorieen, picksByCategory), [categorieen, picksByCategory]);
  const tel = telling(categorieen, gekozen);
  const jokers = useMemo(
    () => (pool.length > 0 || jokerIds.length > 0 ? { pool, gekozen: jokerIds, vermenigvuldiger } : null),
    [pool, jokerIds, vermenigvuldiger],
  );
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

  // ── Acties ──
  const [actie, setActie] = useState<Exclude<PsBezig, "kiezen"> | null>(null);
  const [heropend, setHeropend] = useState(false);
  const kiezen = savePick.isPending || togglePick.isPending || saveJoker.isPending || savePredictions.isPending;
  const bezig: PsBezig | null = actie ?? (kiezen ? "kiezen" : null);

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
      if (doel.soort === "joker") {
        await saveJoker.mutateAsync({ entryId: entry.id, riderIds: jokersNa(jokerIds, doel.plek, rijderId) });
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
      if (doel.soort === "joker") {
        await saveJoker.mutateAsync({ entryId: entry.id, riderIds: jokersNa(jokerIds, doel.plek, null) });
        return;
      }
      const oud = gekozen.get(doel.categorieId)?.[doel.plek];
      if (oud) await togglePick.mutateAsync({ entryId: entry.id, categoryId: doel.categorieId, riderId: oud });
    } catch {
      // useEntry meldt de fout al en zet de cache terug.
    }
  };

  // Picks en jokers staan al in de database zodra je ze kiest. Opslaan bewaart
  // wat nog alleen hier staat (de ploegnaam) en zegt waar je aan toe bent.
  const opslaan = async () => {
    if (!user) return vraagInlog("je ploeg op te slaan");
    if (!entry) return;
    setActie("opslaan");
    const ok = await bewaarNaam();
    setActie(null);
    if (!ok) return;
    captureEvent("team_draft_saved", {
      game_id: game.id,
      game_status: game.status,
      picks_completed: tel.gekozen,
      picks_required: tel.vereist,
      jokers_selected: jokerIds.length,
    });
    toast({
      title: "Alles is bewaard",
      description: ingediend
        ? "Je ploeg is bevestigd en doet mee."
        : tel.compleet
          ? "Je ploeg is compleet. Bevestig hem om mee te doen."
          : "Je kunt later verder. Bevestig je ploeg als hij compleet is; pas dan doe je mee.",
    });
  };

  const bevestigen = async () => {
    if (!user) return vraagInlog("je ploeg te bevestigen");
    if (!entry || !tel.compleet) return;
    setActie("bevestigen");
    try {
      if (!(await bewaarNaam())) return;
      await submitEntry.mutateAsync({ entryId: entry.id });
      captureEvent("team_submitted", {
        game_id: game.id,
        game_status: game.status,
        was_resubmission: heropend,
        picks_completed: tel.gekozen,
        picks_required: tel.vereist,
      });
      setHeropend(false);
      toast({ title: "Ploeg bevestigd", description: `Je doet mee met de ${naam}.` });
    } catch (error) {
      captureException(error, { area: "team_builder", action: "submit_team", game_id: game.id });
      toast({ title: "Bevestigen mislukt", description: entryErrorMessage(error), variant: "destructive" });
    } finally {
      setActie(null);
    }
  };

  const aanpassen = async () => {
    if (!entry) return;
    setActie("aanpassen");
    try {
      await revertEntry.mutateAsync({ entryId: entry.id });
      setHeropend(true);
      toast({ title: "Je ploeg is weer aan te passen", description: "Bevestig hem opnieuw als je klaar bent." });
    } catch (error) {
      toast({ title: "Aanpassen lukt niet", description: entryErrorMessage(error), variant: "destructive" });
    } finally {
      setActie(null);
    }
  };

  if (catsLaden || startLaden || (ingelogd && entryLaden)) return <PloegSamenstellenLaden pelotonbalk={PELOTONBALK} />;

  return (
    <PloegSamenstellen
      pelotonbalk={PELOTONBALK}
      volgende={volgende}
      gameNaam={naam}
      categorieen={categorieen}
      gekozen={gekozen}
      jokers={jokers}
      pronostiek={pronostiek}
      ploegnaam={ploegnaam}
      ploegnaamBewaard={ploegnaam.trim() === (teamName ?? "").trim()}
      deadline={deadline}
      ingelogd={ingelogd}
      ingediend={ingediend}
      heropend={heropend}
      bezig={bezig}
      fout={
        catsFout
          ? "De rijders zijn nu niet te laden. Probeer het straks opnieuw."
          : ingelogd && entryFout
            ? "Je ploeg is nu niet te laden. Probeer het straks opnieuw."
            : null
      }
      volgwagenPad={volgwagenPad(game.id)}
      onPloegnaam={setNaamConcept}
      onPloegnaamKlaar={() => void bewaarNaam()}
      onKies={(doel, rijderId) => void kies(doel, rijderId)}
      onHaalWeg={(doel) => void haalWeg(doel)}
      onOpslaan={() => void opslaan()}
      onBevestigen={() => void bevestigen()}
      onAanpassen={() => void aanpassen()}
      onInloggen={() => navigate("/login")}
    />
  );
}
