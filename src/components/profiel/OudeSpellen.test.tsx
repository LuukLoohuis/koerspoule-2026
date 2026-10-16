// Het archief op /profiel: kiezen, laden, mislukken en wat het dossier toont.
// De Meermarathon rijdt wedstrijden; die mogen nergens "rit" heten.
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { PalmaresGame } from "@/hooks/usePalmares";
import OudeSpellen, { type ArchiefDossier, type ArchiefKoers } from "./OudeSpellen";

vi.mock("react-i18next", async () => {
  const { maakT } = await import("@/test/i18nMock");
  return { useTranslation: () => ({ t: maakT(), i18n: { language: "nl" } }) };
});

function koers(id: string, extra: Partial<ArchiefKoers> = {}): ArchiefKoers {
  return {
    game_id: id, game_name: "Tour de France 2026", game_type: "tour", year: 2026, status: "finished", entry_id: `e-${id}`,
    approved_points: 3105, my_rank: 12, total_participants: 4312, stage_wins: 2, stage_podiums: 5, stages_count: 21, dagzeges: [],
    ...extra,
  } as PalmaresGame;
}

const DOSSIER: ArchiefDossier = {
  ploegnaam: "De Waaierwerkers",
  ritten: [
    { nummer: 1, naam: null, punten: 80, plaats: 40 },
    { nummer: 2, naam: null, punten: 190, plaats: 1 },
  ],
  klassement: [
    { rang: 1, ploegnaam: "Kopgroep Kees", naam: "Joost", punten: 3300, ikZelf: false, gatErvoor: false },
    { rang: 12, ploegnaam: "De Waaierwerkers", naam: "Sanne", punten: 3105, ikZelf: true, gatErvoor: true },
  ],
  ploeg: [
    { naam: "Tim Merlier", ploeg: null, punten: 128, opgave: true },
    { naam: "Tadej Pogačar", ploeg: null, punten: 580, joker: true },
  ],
  subpoules: [{ id: "sp", naam: "De Kopgroep", rang: 1, leden: 14 }],
};

const basis = { koersen: [koers("tour"), koers("giro", { game_name: "Giro d'Italia 2026", game_type: "giro", my_rank: 214 })], onKies: () => {}, dossier: null, laden: false };

describe("OudeSpellen", () => {
  it("zonder afgeronde koersen: lege stand", () => {
    render(<OudeSpellen {...basis} koersen={[]} gekozenId={null} />);
    expect(screen.getByText("Nog geen afgeronde koersen")).toBeInTheDocument();
  });

  it("kiezen geeft de koers door", () => {
    const onKies = vi.fn();
    render(<OudeSpellen {...basis} gekozenId={null} onKies={onKies} />);
    fireEvent.click(screen.getByRole("button", { name: /Giro/ }));
    expect(onKies).toHaveBeenCalledWith("giro");
  });

  it("laden: de kop van het dossier staat er al, de rest is een skelet", () => {
    render(<OudeSpellen {...basis} gekozenId="tour" laden />);
    const dossier = screen.getByRole("article");
    expect(dossier).toHaveAttribute("aria-busy", "true");
    expect(within(dossier).getByText("#12")).toBeInTheDocument();
    expect(screen.queryByText("Eindklassement")).toBeNull();
  });

  it("toont klassement rond jou, ploeg en subpoules", () => {
    const open = vi.fn();
    render(<OudeSpellen {...basis} gekozenId="tour" dossier={DOSSIER} onOpenInPeloton={open} />);
    expect(screen.getByText("Punten per rit")).toBeInTheDocument();
    expect(screen.getByText("Beste rit: rit 2, 190 pt")).toBeInTheDocument();
    expect(screen.getByText("jij")).toBeInTheDocument();
    expect(screen.getByText("⋯")).toBeInTheDocument();
    // Ploeg op punten, beste eerst; joker en opgave gemarkeerd.
    const namen = screen.getAllByText(/Pogačar|Merlier/).map((n) => n.textContent);
    expect(namen).toEqual(["Tadej Pogačar", "Tim Merlier"]);
    expect(screen.getByText("Joker")).toBeInTheDocument();
    expect(screen.getByText("Opgave")).toBeInTheDocument();
    expect(screen.getByText("1e van 14")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Bekijk in Mijn Peloton/ }));
    expect(open).toHaveBeenCalledWith("tour");
  });

  it("mislukt: melding met opnieuw proberen", () => {
    const opnieuw = vi.fn();
    render(<OudeSpellen {...basis} gekozenId="tour" fout onOpnieuw={opnieuw} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Deze uitslag laden lukt nu niet.");
    fireEvent.click(screen.getByRole("button", { name: /Opnieuw proberen/ }));
    expect(opnieuw).toHaveBeenCalled();
  });

  it("Meermarathon: wedstrijden in plaats van ritten, met het peloton in de naam", () => {
    const mm = koers("mm-v", { game_name: "Meermarathon 2026-2027", game_type: "meermarathon", categorie: "vrouwen" });
    render(<OudeSpellen {...basis} koersen={[mm]} gekozenId="mm-v" dossier={DOSSIER} />);
    expect(screen.getAllByText("Meermarathon Vrouwen").length).toBeGreaterThan(0);
    expect(screen.getByText("Punten per wedstrijd")).toBeInTheDocument();
    expect(screen.getByText("Wedstrijdzeges")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\brit\b/i);
  });
});
