// Ploeg C met de nepdata uit het ontwerp: de volgorde, de stickers en de
// voetregel moeten kloppen, de naam-editor moet de nieuwe naam doorgeven, en
// een rij klapt open met de ritten waarin de renner scoorde.
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import PloegCWeergave from "./PloegCWeergave";
import { KoersThemaProvider } from "@/contexts/KoersThemaContext";
import type { PloegRenner, PloegRit } from "@/hooks/usePloegRanglijst";
import type { ThemaKey } from "@/lib/themas";

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
      { stage_number: 1, total_points: totaal - dag, stage_name: "Alba › Napels", stage_type: "vlak", finish_position: totaal > dag ? 3 : null },
      { stage_number: 2, total_points: 0, stage_name: "Rome › Rome", stage_type: "tijdrit", finish_position: null },
      { stage_number: 3, total_points: dag, stage_name: "Treviso › Pila", stage_type: "bergop", finish_position: dag > 0 ? 5 : null },
    ].map((e) => ({ ...e, multiplier: extra.multiplier ?? 1 })),
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

function toon(over: Partial<React.ComponentProps<typeof PloegCWeergave>> = {}, thema: ThemaKey | null = null) {
  const onNaamOpslaan = vi.fn(async () => true);
  render(
    <KoersThemaProvider themaKey={thema}>
      <PloegCWeergave
        ploegnaam="De Waaierwerkers"
        onNaamOpslaan={onNaamOpslaan}
        renners={RENNERS}
        ritten={RITTEN}
        ploegPunten={PLOEGPUNTEN}
        officieelTotaal={1284}
        {...over}
      />
    </KoersThemaProvider>,
  );
  return { onNaamOpslaan };
}

const namen = () =>
  within(screen.getByRole("list"))
    .getAllByRole("listitem")
    .map((li) => li.textContent ?? "");

const rij = (naam: RegExp) => screen.getByRole("button", { name: naam });
const vak = (naam: string) => screen.getByRole("region", { name: `Punten per rit van ${naam}` });

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

  it("klapt een renner open met de ritten waarin hij scoorde, en weer dicht", () => {
    toon();
    const knop = rij(/Jonas Vingegaard/);
    expect(knop.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(knop);
    expect(knop.getAttribute("aria-expanded")).toBe("true");
    const ritten = within(vak("Jonas Vingegaard"))
      .getAllByRole("listitem")
      .map((li) => li.textContent ?? "");
    // Rit 2 leverde niets op en staat er dus niet bij.
    expect(ritten).toHaveLength(2);
    expect(ritten[0]).toContain("Rit 1");
    expect(ritten[0]).toContain("Alba › Napels");
    expect(ritten[0]).toContain("3ᵉ");
    expect(ritten[0]).toContain("+200");
    expect(ritten[1]).toContain("Rit 3");
    expect(ritten[1]).toContain("5ᵉ");
    expect(ritten[1]).toContain("+14");
    expect(within(vak("Jonas Vingegaard")).getByText("2× gescoord in 3 ritten")).toBeTruthy();

    fireEvent.click(knop);
    expect(knop.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("region", { name: /Punten per rit/ })).toBeNull();
  });

  it("houdt één renner tegelijk open en toont de joker per rit", () => {
    toon();
    fireEvent.click(rij(/Jonas Vingegaard/));
    fireEvent.click(rij(/Giulio Ciccone/));
    expect(screen.getAllByRole("region", { name: /Punten per rit/ })).toHaveLength(1);
    const ritten = within(vak("Giulio Ciccone")).getAllByRole("listitem");
    expect(ritten[0].textContent).toContain("×2");
    expect(ritten[0].textContent).toContain("+156");
  });

  it("zegt het als een renner nog niets scoorde", () => {
    toon({ renners: [renner("z", "Egan Bernal", 0, 0)] });
    fireEvent.click(rij(/Egan Bernal/));
    expect(within(vak("Egan Bernal")).getByText("Nog geen punten t/m rit 3.")).toBeTruthy();
    expect(within(vak("Egan Bernal")).queryByRole("listitem")).toBeNull();
  });

  it("draagt in de Tour de gele trui op de ploegkaart", () => {
    toon({}, "geel");
    const img = screen.getByRole("region", { name: "Jouw ploeg" }).querySelector("img");
    expect(img?.getAttribute("src")).toContain("wielertrui-maillot-jaune");
    expect(img?.className).not.toContain("mix-blend-multiply");
  });

  it("kleurt de trui op de ploegkaart in als de koers geen eigen trui heeft", () => {
    toon({}, "roze");
    const img = screen.getByRole("region", { name: "Jouw ploeg" }).querySelector("img");
    expect(img?.className).toContain("mix-blend-multiply");
  });
});
