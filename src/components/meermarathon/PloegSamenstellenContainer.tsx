/**
 * Ploeg samenstellen (Meermarathon) — de dunne container met de data. De
 * weergave staat in PloegSamenstellen.tsx.
 *
 * Wat de database vraagt: submit_entry wil in elke categorie een keuze, meer
 * niet. Jokers zijn optioneel maar tellen wel (calculate_stage_scores, en de
 * live projectie rekent ze mee), dus die bieden we aan zodra er rijders
 * buiten de categorieën zijn. Voorspellingen (GC-podium, truien) laten we weg:
 * die horen bij de wielergames en de schaatsuitslagen vullen geen klassement
 * of truien waar ze tegen kunnen scoren.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import MeermarathonKoersbalk from "@/components/meermarathon/Koersbalk";
import {
  PloegSamenstellen,
  PloegSamenstellenGesloten,
  PloegSamenstellenLaden,
  type PsBezig,
} from "@/components/meermarathon/PloegSamenstellen";
import { canRegister } from "@/lib/gameStatus";
import { meermarathonCategorieLabel } from "@/lib/gameTypes";
import {
  geldigeKeuzes,
  jokerPool,
  jokersNa,
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

const KOERSBALK = <MeermarathonKoersbalk className="mb-2 md:mb-6" />;

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

/** Kies een game zoals de koersbalk dat doet: in de context én als ?game=. */
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

/** Zelfde paginamarges als de rest van de app (mobiel 12px, zie .container). */
function Pagina({ children }: { children: ReactNode }) {
  return <div className="container mx-auto px-5 pb-4 pt-1 md:pb-8 md:pt-7">{children}</div>;
}

/** game = null: de game laadt nog, maar we weten al dat het de Meermarathon is. */
export default function PloegSamenstellenContainer({ game }: { game: Game | null }) {
  return <Pagina>{game ? <Inhoud game={game} /> : <PloegSamenstellenLaden koersbalk={KOERSBALK} />}</Pagina>;
}

function Inhoud({ game }: { game: Game }) {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const { selectedGameId, selectedGame } = useSelectedGame();
  const kiesGame = useKiesGame();
  const doel = teambouwerDoel(game, selectedGame, selectedGameId != null);

  useEffect(() => {
    if (doel.soort === "volg") kiesGame(doel.gameId);
    // kiesGame is elke render nieuw; alleen de uitkomst telt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doel.soort, doel.gameId]);

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
  // Eigen key per game: wissel je met de koersbalk, dan begint de
  // ploegnaam, de actieve plek en "heropend" opnieuw.
  return <Bouwer key={game.id} game={game} />;
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
  if (user && isLoading) return <PloegSamenstellenLaden koersbalk={KOERSBALK} />;
  const status = statussen.find((s) => s.game.id === game.id);
  return (
    <PloegSamenstellenGesloten
      koersbalk={KOERSBALK}
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

function Bouwer({ game }: { game: Game }) {
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
    teamName,
    savePick,
    togglePick,
    saveJoker,
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
  const kiezen = savePick.isPending || togglePick.isPending || saveJoker.isPending;
  const bezig: PsBezig | null = actie ?? (kiezen ? "kiezen" : null);

  const vraagInlog = (wat: string) => {
    toast({ title: "Log eerst in", description: `Log in of maak een account om ${wat}.` });
    navigate("/login");
  };

  const kies = async (doel: KiesDoel, rijderId: string) => {
    if (!user) return vraagInlog("een rijder te kiezen");
    if (!entry) return;
    try {
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

  if (catsLaden || startLaden || (ingelogd && entryLaden)) return <PloegSamenstellenLaden koersbalk={KOERSBALK} />;

  return (
    <PloegSamenstellen
      koersbalk={KOERSBALK}
      gameNaam={naam}
      categorieen={categorieen}
      gekozen={gekozen}
      jokers={jokers}
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
