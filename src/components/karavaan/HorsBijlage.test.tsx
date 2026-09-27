// De Hors-bijlage van de webkrant: elk cijfer op de borst van zijn trui,
// dezelfde drie truien als op de mobiele Krant.
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import HorsBijlage, { type BijlageTegel } from "./HorsBijlage";
import { KoersThemaProvider } from "@/contexts/KoersThemaContext";

vi.mock("react-i18next", async () => {
  const { maakT } = await import("@/test/i18nMock");
  return { useTranslation: () => ({ t: maakT(), i18n: { language: "nl" } }) };
});

function toon(over: Partial<Record<"dartpijl" | "emirates" | "directeur", Partial<BijlageTegel>>> = {}) {
  const open = vi.fn();
  const tegels: BijlageTegel[] = [
    { key: "dartpijl", waarde: 78, eenheid: "%", titel: "Monkey IQ", haak: "apen verslagen", trui: "leider", onClick: () => open("dartpijl"), ...over.dartpijl },
    { key: "emirates", waarde: 64, eenheid: "%", titel: "Emirates", haak: "van droomploeg", trui: "wit", onClick: () => open("superteam"), ...over.emirates },
    { key: "directeur", waarde: 7.4, titel: "Wielerdir.", haak: "rapport", trui: "berg", onClick: () => open("wielerdirecteur"), ...over.directeur },
  ];
  render(
    <KoersThemaProvider themaKey="geel">
      <HorsBijlage tegels={tegels} />
    </KoersThemaProvider>,
  );
  const tegel = (naam: RegExp) => screen.getByRole("button", { name: naam });
  return { open, tegel, trui: (naam: RegExp) => tegel(naam).querySelector("img")?.getAttribute("src") ?? "" };
}

describe("HorsBijlage", () => {
  it("zet elk cijfer op zijn eigen trui", () => {
    const { tegel, trui } = toon();
    expect(tegel(/Monkey IQ/).textContent).toContain("78%");
    expect(trui(/Monkey IQ/)).toContain("wielertrui-geel");
    expect(tegel(/Emirates/).textContent).toContain("64%");
    expect(trui(/Emirates/)).toContain("wielertrui-wit");
    expect(tegel(/Wielerdir/).textContent).toContain("7,4");
    expect(trui(/Wielerdir/)).toContain("wielertrui-bolletjes-rood");
  });

  it("zet een streepje op de trui zolang het cijfer er niet is", () => {
    const { tegel } = toon({ emirates: { waarde: null } });
    expect(tegel(/Emirates/).textContent).toContain("–");
    expect(tegel(/Emirates/).textContent).not.toContain("%");
  });

  it("opent de analyse van de tegel", () => {
    const { open, tegel } = toon();
    fireEvent.click(tegel(/Wielerdir/));
    expect(open).toHaveBeenCalledWith("wielerdirecteur");
  });
});
