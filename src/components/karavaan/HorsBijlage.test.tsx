// De Hors-bijlage van de webkrant: dezelfde drie truien als op de mobiele
// Krant, in het getinte vlak van de bijlage.
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import HorsBijlage from "./HorsBijlage";
import { KoersThemaProvider } from "@/contexts/KoersThemaContext";

vi.mock("react-i18next", async () => {
  const { maakT } = await import("@/test/i18nMock");
  return { useTranslation: () => ({ t: maakT(), i18n: { language: "nl" } }) };
});

function toon() {
  const onOpen = vi.fn();
  render(
    <KoersThemaProvider themaKey="geel">
      <HorsBijlage scores={{ monkeyBeatPct: 78, emiratesPct: 64, directorScore: 7.4 }} onOpen={onOpen} />
    </KoersThemaProvider>,
  );
  const knop = (naam: RegExp) => screen.getByRole("button", { name: naam });
  return { onOpen, knop, trui: (naam: RegExp) => knop(naam).querySelector("img")?.getAttribute("src") ?? "" };
}

describe("HorsBijlage", () => {
  it("zet de bijlagekop boven de drie truien", () => {
    const { trui } = toon();
    expect(screen.getByText("Hors Catégorie")).toBeTruthy();
    expect(trui(/Monkey IQ/)).toContain("hors-trui-geel");
    expect(trui(/Emirates/)).toContain("hors-trui-wit");
    expect(trui(/Directeur/)).toContain("hors-trui-bolletjes-rood");
  });

  it("draagt het cijfer op de trui", () => {
    const { knop } = toon();
    expect(knop(/Monkey IQ/).textContent).toContain("78%");
    expect(knop(/Emirates/).textContent).toContain("64%");
    expect(knop(/Directeur/).textContent).toContain("7,4");
  });

  it("opent de analyse van de trui", () => {
    const { onOpen, knop } = toon();
    fireEvent.click(knop(/Directeur/));
    expect(onOpen).toHaveBeenCalledWith("wielerdirecteur");
  });
});
