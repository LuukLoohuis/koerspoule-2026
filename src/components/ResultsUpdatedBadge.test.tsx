// "Bijgewerkt t/m …" boven de uitslagen. Een wielerkoers telt etappes; de
// Meermarathon rijdt wedstrijden en noemt ze naar hun soort ("Cup 3") of hun
// eigen naam.
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ResultsUpdatedBadge from "./ResultsUpdatedBadge";

const staat = vi.hoisted(() => ({ laatste: null as Record<string, unknown> | null }));

vi.mock("react-i18next", async () => {
  const { maakT } = await import("@/test/i18nMock");
  return { useTranslation: () => ({ t: maakT(), i18n: { language: "nl" } }) };
});
vi.mock("@/hooks/useResults", () => ({
  useLastApprovedStage: () => ({ data: staat.laatste, isLoading: false }),
}));

const GEFIATTEERD = "2026-11-14T21:00:00Z";

describe("ResultsUpdatedBadge", () => {
  it("Meermarathon: t/m de wedstrijd, niet t/m een etappe", () => {
    staat.laatste = { id: "w3", stage_number: 3, name: null, approved_at: GEFIATTEERD, wedstrijd_type: "cup", ijs_type: "kunstijs" };
    render(<ResultsUpdatedBadge gameId="g" meermarathon />);
    expect(screen.getByText("Cup 3")).toBeInTheDocument();
    expect(screen.getByText(/Bijgewerkt t\/m/)).not.toHaveTextContent(/etappe/i);
  });

  it("Meermarathon: een wedstrijd met een eigen naam heet zo, zonder die twee keer te noemen", () => {
    staat.laatste = { id: "w1", stage_number: 1, name: "Amsterdam", approved_at: GEFIATTEERD, wedstrijd_type: "cup", ijs_type: "kunstijs" };
    render(<ResultsUpdatedBadge gameId="g" meermarathon />);
    expect(screen.getByText("Amsterdam")).toBeInTheDocument();
    expect(screen.getByText(/Bijgewerkt t\/m/)).not.toHaveTextContent("—");
  });

  it("Wielerkoers: t/m etappe en de naam van de rit", () => {
    staat.laatste = { id: "s3", stage_number: 3, name: "Parijs", approved_at: GEFIATTEERD };
    render(<ResultsUpdatedBadge gameId="g" />);
    expect(screen.getByText("etappe 3")).toBeInTheDocument();
    expect(screen.getByText(/Bijgewerkt t\/m/)).toHaveTextContent("— Parijs");
  });
});
