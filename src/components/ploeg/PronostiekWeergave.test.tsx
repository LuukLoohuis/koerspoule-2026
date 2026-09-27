// Pronostiek zonder datalaag: het podium, de truien en de opgave-markering
// moeten uit de props komen, zodat de buur in de carrousel niets hoeft op te halen.
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PronostiekWeergave from "./PronostiekWeergave";

vi.mock("react-i18next", async () => {
  const { maakT } = await import("@/test/i18nMock");
  return { useTranslation: () => ({ t: maakT(), i18n: { language: "nl" } }) };
});

const RENNERS = {
  a: { name: "Jonas Vingegaard", team: "Visma–Lease a Bike" },
  b: { name: "Isaac del Toro", team: "UAE Team Emirates" },
  c: { name: "Juan Ayuso", team: "UAE Team Emirates", is_dnf: true },
  d: { name: "Jonathan Milan", team: "Lidl-Trek" },
};

const PREDICTIONS = [
  { classification: "gc" as const, position: 1, rider_id: "a" },
  { classification: "gc" as const, position: 2, rider_id: "b" },
  { classification: "gc" as const, position: 3, rider_id: "c" },
  { classification: "points" as const, position: 1, rider_id: "d" },
];

describe("PronostiekWeergave", () => {
  it("toont het podium en de puntentrui uit de voorspellingen", () => {
    render(<PronostiekWeergave gameName="Giro 2026" predictions={PREDICTIONS} ridersById={RENNERS} dnfZichtbaar={false} />);
    expect(screen.getByText("Pronostiek · Giro 2026")).toBeTruthy();
    expect(screen.getByText("Jonas Vingegaard")).toBeTruthy();
    expect(screen.getByText("Jonathan Milan")).toBeTruthy();
    // Nog geen keuze voor berg en jongeren.
    expect(screen.getAllByText("Geen keuze")).toHaveLength(2);
    expect(screen.queryByText("DNF")).toBeNull();
  });

  it("markeert een opgave alleen als de koers rijdt", () => {
    render(<PronostiekWeergave gameName="Giro 2026" predictions={PREDICTIONS} ridersById={RENNERS} dnfZichtbaar />);
    expect(screen.getByText("DNF")).toBeTruthy();
    expect(screen.getByText("Juan Ayuso")).toBeTruthy();
  });

  it("meldt lege voorspellingen", () => {
    render(<PronostiekWeergave gameName="Giro 2026" predictions={[]} ridersById={{}} dnfZichtbaar={false} />);
    expect(screen.getByText(/Nog geen klassementsvoorspellingen/)).toBeTruthy();
  });
});
