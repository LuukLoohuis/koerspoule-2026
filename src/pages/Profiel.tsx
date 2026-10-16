/**
 * /profiel — je eigen plek, los van de gekozen koers: wie je bent (de
 * rennerslicentie), je erelijst (Palmares) en het archief met je oude
 * spellen, waar je per afgeronde koers de uitslag laadt.
 *
 * Tab en gekozen koers staan in de URL (?tab=oude-spellen&koers=<id>), zodat
 * "terug" op de telefoon van het dossier naar de lijst gaat.
 */
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import PalmaresPanel from "@/components/PalmaresPanel";
import OudeSpellen, { type ArchiefKoers } from "@/components/profiel/OudeSpellen";
import ProfielWeergave, { type ProfielTab } from "@/components/profiel/ProfielWeergave";
import { useSelectedGame } from "@/context/SelectedGameContext";
import { useArchiefDossier } from "@/hooks/useArchiefDossier";
import { useAuth } from "@/hooks/useAuth";
import { usePalmares, type PalmaresGame } from "@/hooks/usePalmares";
import { useProfile } from "@/hooks/useProfile";
import { isFinishedLike } from "@/lib/gameStatus";

/** Beste eindklassering, liefst uit een afgeronde koers (zoals de erelijst). */
function besteRang(games: PalmaresGame[]): number | null {
  const geldig = games.filter((g) => g.my_rank > 0 && g.total_participants > 0);
  const af = geldig.filter((g) => isFinishedLike(g.status));
  const pool = af.length > 0 ? af : geldig;
  return pool.length > 0 ? Math.min(...pool.map((g) => g.my_rank)) : null;
}

export default function Profiel() {
  const { user } = useAuth();
  const { data: profiel } = useProfile();
  const { data: palmares } = usePalmares();
  const { games: alleGames, setSelectedGameId } = useSelectedGame();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();

  const tab: ProfielTab = params.get("tab") === "oude-spellen" ? "oude-spellen" : "palmares";
  const gekozenId = params.get("koers");
  const naam = profiel?.display_name?.trim() || user?.email?.split("@")[0] || "";

  const games = palmares?.games ?? [];
  const subpoules = palmares?.subpoules ?? [];
  const koersen: ArchiefKoers[] = games
    .filter((g) => isFinishedLike(g.status))
    .map((g) => ({ ...g, categorie: alleGames.find((a) => a.id === g.game_id)?.categorie ?? null }));
  const gekozen = koersen.find((k) => k.game_id === gekozenId) ?? null;

  const dossierQuery = useArchiefDossier(gekozen, naam || null);
  const dossier = dossierQuery.data
    ? {
        ...dossierQuery.data,
        subpoules: subpoules
          .filter((s) => s.game_id === gekozen?.game_id)
          .map((s) => ({ id: s.subpoule_id, naam: s.subpoule_name, rang: s.my_rank, leden: s.total_members })),
      }
    : null;

  const zet = (wijzig: (p: URLSearchParams) => void, opties?: { replace?: boolean; state?: unknown }) => {
    const volgende = new URLSearchParams(params);
    wijzig(volgende);
    setParams(volgende, opties);
  };
  // Kiezen zet een stap in de geschiedenis, zodat "terug" op de telefoon van
  // het dossier naar de lijst gaat. De knop "Alle oude spellen" doet dan
  // hetzelfde als terug; kwam je via een link direct in het dossier, dan
  // haalt hij alleen de koers uit de URL.
  const kies = (id: string | null) => {
    // Van de ene koers naar de andere (desktop: lijst en dossier naast elkaar)
    // is geen nieuwe stap.
    if (id) return zet((p) => p.set("koers", id), gekozenId ? { replace: true, state: location.state } : { state: { uitLijst: true } });
    if ((location.state as { uitLijst?: boolean } | null)?.uitLijst) return navigate(-1);
    zet((p) => p.delete("koers"), { replace: true });
  };

  return (
    <ProfielWeergave
      kop={{
        naam,
        email: user?.email ?? null,
        lidSinds: profiel?.created_at ?? null,
        samenvatting:
          games.length > 0
            ? { koersen: games.length, dagzeges: games.reduce((s, g) => s + g.stage_wins, 0), besteRang: besteRang(games) }
            : undefined,
      }}
      tab={tab}
      onTab={(t) => zet((p) => (t === "palmares" ? p.delete("tab") : p.set("tab", t)), { replace: true })}
      palmares={<PalmaresPanel />}
      oudeSpellen={
        <OudeSpellen
          koersen={koersen}
          gekozenId={gekozen?.game_id ?? null}
          onKies={kies}
          dossier={dossier}
          laden={dossierQuery.isLoading}
          fout={dossierQuery.isError}
          onOpnieuw={() => void dossierQuery.refetch()}
          onOpenInPeloton={(id) => {
            setSelectedGameId(id);
            navigate("/mijn-peloton");
          }}
        />
      }
    />
  );
}
