// Ploeg C met de nepdata uit het ontwerp: de volgorde, de stickers en de
// voetregel moeten kloppen, en de naam-editor moet de nieuwe naam doorgeven.
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import PloegCWeergave from "./PloegCWeergave";
import type { PloegRenner, PloegRit } from "@/hooks/usePloegRanglijst";

vi.mock("react-i18next", async () => {
  const { maakT } = await import("@/test/i18nMock");
  return { useTranslation: () => ({ t: maakT(), i18n: { language: "nl" } }) };
});

const RITTEN: PloegRit[] = Array.from({ length: 3 }, (_, i) => ({ id: `s${i + 1}`, nummer: i + 1, naam: null }));

function renner(id: string, naam: string, totaal: number, dag: number, extra: Partial<PloegRenner> = {}): PloegRenner {
  return {
    id,
    naam,
    categorie: "Klassement",
    ploeg: "Ploeg",
    truiUrl: null,
    opgave: false,
    joker: false,
    multiplier: 1,
    etappes: [
      { stage_number: 1, total_points: totaal - dag },
      { stage_number: 2, total_points: 0 },
      { stage_number: 3, total_points: dag },
    ],
    ...extra,
  };
}

const RENNERS = [
  renner("a", "Jonas Vingegaard", 214, 14),
  renner("b", "Jonathan Milan", 198, 0),
  renner("c", "Giulio Ciccone", 176, 20, { joker: true, multiplier: 2 }),
  renner("d", "Juan Ayuso", 41, 0, { opgave: true }),
];

const PLOEGPUNTEN = [
  { stage_id: "s1", points: 1236 },
  { stage_id: "s2", points: 0 },
  { stage_id: "s3", points: 48 },
];

function toon(over: Partial<React.ComponentProps<typeof PloegCWeergave>> = {}) {
  const onNaamOpslaan = vi.fn(async () => true);
  render(
    <PloegCWeergave
      ploegnaam="De Waaierwerkers"
      onNaamOpslaan={onNaamOpslaan}
      renners={RENNERS}
      ritten={RITTEN}
      ploegPunten={PLOEGPUNTEN}
      officieelTotaal={1284}
      {...over}
    />,
  );
  return { onNaamOpslaan };
}

const namen = () =>
  within(screen.getByRole("list"))
    .getAllByRole("listitem")
    .map((li) => li.textContent ?? "");

describe("PloegCWeergave", () => {
  it("toont de ploegkaart met totaal en de dagpunten van vandaag", () => {
    toon();
    expect(screen.getByText("De Waaierwerkers")).toBeTruthy();
    expect(screen.getByText("1.284")).toBeTruthy();
    expect(screen.getByText("+48 vandaag")).toBeTruthy();
  });

  it("sorteert op totaal, markeert de topscorer en de opgave", () => {
    toon();
    const rijen = namen();
    expect(rijen[0]).toContain("Jonas Vingegaard");
    expect(rijen[0]).toContain("Top");
    expect(rijen[3]).toContain("Juan Ayuso");
    expect(rijen[3]).toContain("Opgave");
    // De joker draagt zijn multiplier.
    expect(rijen[2]).toContain("×2");
    expect(screen.getByText(/4 renners · 1 opgave/)).toBeTruthy();
  });

  it("zet op Vandaag de scorers van de rit bovenaan", () => {
    toon();
    fireEvent.click(screen.getByRole("button", { name: "Vandaag" }));
    const rijen = namen();
    expect(rijen[0]).toContain("Giulio Ciccone");
    expect(rijen[0]).toContain("+20");
    expect(rijen[1]).toContain("Jonas Vingegaard");
  });

  it("laat de naam wijzigen en geeft de nieuwe naam door", async () => {
    const { onNaamOpslaan } = toon();
    fireEvent.click(screen.getByRole("button", { name: "Ploegnaam wijzigen" }));
    const veld = screen.getByRole("textbox", { name: "Ploegnaam wijzigen" });
    fireEvent.change(veld, { target: { value: "Team Bidon" } });
    fireEvent.click(screen.getByRole("button", { name: "Opslaan" }));
    await vi.waitFor(() => expect(onNaamOpslaan).toHaveBeenCalledWith("Team Bidon"));
  });

  it("valt zonder uitslag terug op de lege stand", () => {
    toon({ ritten: [], ploegPunten: [], officieelTotaal: null });
    expect(screen.getByText("Nog geen uitslag")).toBeTruthy();
    expect(screen.queryByText(/vandaag$/)).toBeNull();
  });
});
