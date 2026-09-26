// Krant C met de nepdata uit het ontwerp: krantkop in de woorden van de koers,
// de drie cellen van de stand-balk, de drie edities en de Hors-truien.
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import KrantCWeergave from "./KrantCWeergave";
import type { KaravaanEtappe, KaravaanRanking } from "@/hooks/useKaravaanFeed";
import type { StageRow } from "@/hooks/useResults";

vi.mock("react-i18next", async () => {
  const { maakT } = await import("@/test/i18nMock");
  return { useTranslation: () => ({ t: maakT(), i18n: { language: "nl" } }) };
});

function stand(aantal: number, mijnRang: number, mijnDelta: number): KaravaanRanking[] {
  return Array.from({ length: aantal }, (_, i) => ({
    entry_id: `e${i + 1}`,
    rank: i + 1,
    team_name: `Ploeg ${i + 1}`,
    display_name: null,
    points: 2000 - i,
    delta_rank: i + 1 === mijnRang ? mijnDelta : 0,
    is_me: i + 1 === mijnRang,
  }));
}

const ETAPPE: KaravaanEtappe = {
  stage_id: "s14",
  stage_number: 14,
  stage_name: "Treviso › Pila",
  approved_at: "2026-05-23T17:30:00Z",
  michel_tekst: "Dat is geen aanval meer.",
  jose_tekst: "Ge moet dat zien.",
  krant_kop: "Ciccone wint thuis",
  ritwinnaar: "Giulio Ciccone",
  rituitslag: [
    { positie: 1, renner: "Giulio Ciccone", ploeg: "Lidl-Trek" },
    { positie: 2, renner: "Isaac del Toro", ploeg: "UAE" },
    { positie: 3, renner: "Jonas Vingegaard", ploeg: "Visma" },
  ],
  dagstand: [
    { rang: 1, naam: "Marieke", deelnemer: null, punten: 61, isMij: false },
    { rang: 2, naam: "Luuk", deelnemer: null, punten: 48, isMij: true },
    { rang: 3, naam: "Jeroen", deelnemer: null, punten: 45, isMij: false },
  ],
  mijnDagpunten: 48,
  mijnDagrang: 2,
  mijnDagrangOverall: 118,
  dagDeelnemersOverall: 2318,
  subpouleStandings: stand(14, 3, 2),
  overallStandings: stand(2318, 412, 37),
  personalFlash: null,
};

const MORGEN: StageRow = {
  id: "s15",
  game_id: "g",
  stage_number: 15,
  name: "Val Camonica › Bormio",
  date: "2026-05-24",
  status: null,
  stage_type: "bergop",
  distance_km: 188,
  is_gc: false,
  results_status: "draft",
  profile_data: { climbMeters: 4250 },
};

function toon(over: Partial<React.ComponentProps<typeof KrantCWeergave>> = {}) {
  const onOpenHors = vi.fn();
  const onOpenDaguitslag = vi.fn();
  render(
    <KrantCWeergave
      laatste={ETAPPE}
      kop="Ciccone wint thuis, Vingegaard houdt het roze"
      verslag={{
        stage_id: "s14",
        tekst: "Ciccone sprong weg op de slotklim.\n\nDe tweede alinea.\n\nIn de poule won **Marieke**.",
        bron: null,
        bron_url: null,
        updated_at: null,
      }}
      subpoules={[{ id: "k", name: "Kantoor" }]}
      selectedSubpouleId="k"
      onSelectSubpoule={() => {}}
      geenSubpoule={false}
      scores={{ monkeyBeatPct: 78, emiratesPct: 64, directorScore: 7.4 }}
      heeftHorsCijfers
      morgen={MORGEN}
      voorbeschouwing="De laatste bergrit voor de rustdag."
      profielUrl="https://tourview.pages.dev/giro-d-italia-2026/stage-15"
      commentaarLaden={false}
      onOpenHors={onOpenHors}
      onOpenDaguitslag={onOpenDaguitslag}
      {...over}
    />,
  );
  return { onOpenHors, onOpenDaguitslag };
}

describe("KrantCWeergave", () => {
  it("zet de krantkop in de woorden van de koers", () => {
    toon();
    expect(screen.getByText("La Gazzetta")).toBeTruthy();
    expect(screen.getByText("Tappa 14")).toBeTruthy();
  });

  it("vult de stand-balk met subpoule, algemeen en vandaag", () => {
    toon();
    const sub = screen.getByRole("button", { name: /Subpoule Kantoor: plaats 3 van 14/ });
    expect(sub.textContent).toContain("#3");
    expect(sub.textContent).toContain("/14");
    expect(sub.textContent).toContain("▲ 2");
    const alg = screen.getByRole("button", { name: /Algemeen klassement: plaats 412 van 2318/ });
    expect(alg.textContent).toContain("#412");
    expect(alg.textContent).toContain("/2.318");
    expect(alg.textContent).toContain("▲ 37");
    const dag = screen.getByRole("button", { name: /Vandaag 48 punten, plaats 118/ });
    expect(dag.textContent).toContain("48");
    expect(dag.textContent).toContain("#118 v.d. dag");
  });

  it("opent op Vandaag met artikel, daguitslag en Hors-truien", () => {
    const { onOpenHors, onOpenDaguitslag } = toon();
    expect(screen.getByRole("heading", { level: 2, name: /Ciccone wint thuis/ })).toBeTruthy();
    expect(screen.getByText("Tappa 14 · Pila")).toBeTruthy();
    // Intro dicht, na "Lees verder" het hele verslag mét het pouledeel.
    expect(screen.queryByText(/De tweede alinea/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Lees verder" }));
    expect(screen.getByText(/De tweede alinea/)).toBeTruthy();
    expect(screen.getByText("Marieke", { selector: "strong" })).toBeTruthy();
    // Podium van de rit en jouw regel in de subpoule.
    expect(screen.getByText("Giulio Ciccone")).toBeTruthy();
    expect(screen.getByText("jij")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Hele uitslag ›" }));
    expect(onOpenDaguitslag).toHaveBeenCalledWith(14);
    // De truien dragen het cijfer en openen hun eigen analyse.
    expect(screen.getByRole("button", { name: /Monkey IQ 78 procent/ }).textContent).toContain("78%");
    fireEvent.click(screen.getByRole("button", { name: /Emirates 64 procent/ }));
    expect(onOpenHors).toHaveBeenCalledWith("superteam");
    expect(screen.getByRole("button", { name: /Directeur 7,4/ }).textContent).toContain("7,4");
  });

  it("toont op Morgen de feiten van de volgende rit", () => {
    toon();
    fireEvent.click(screen.getByRole("tab", { name: "Morgen" }));
    expect(screen.getByText("Voorbeschouwing · Tappa 15")).toBeTruthy();
    expect(screen.getByText("188 km")).toBeTruthy();
    expect(screen.getByText("4.250 m")).toBeTruthy();
    expect(screen.getByText("De laatste bergrit voor de rustdag.")).toBeTruthy();
  });

  it("zet in de Perszaal beide commentatoren met monogram", () => {
    toon();
    fireEvent.click(screen.getByRole("tab", { name: "Perszaal" }));
    expect(screen.getByText("Michel Wuyts")).toBeTruthy();
    expect(screen.getByText("MW")).toBeTruthy();
    expect(screen.getByText("José De Cauwer")).toBeTruthy();
    expect(screen.getByText("JDC")).toBeTruthy();
  });

  it("opent de informatie-overlay", () => {
    toon();
    fireEvent.click(screen.getByRole("button", { name: "Informatie: zo lees je de krant" }));
    expect(screen.getByRole("dialog", { name: "Informatie" })).toBeTruthy();
    expect(screen.getByText(/Podium van de rit/)).toBeTruthy();
  });

  it("houdt vóór de eerste uitslag de balk leeg en meldt dat de krant nog komt", () => {
    toon({ laatste: null, kop: null, verslag: null, heeftHorsCijfers: false });
    expect(screen.queryByText("Tappa 14")).toBeNull();
    expect(screen.getByText(/gaat zo de pers in/)).toBeTruthy();
  });
});
