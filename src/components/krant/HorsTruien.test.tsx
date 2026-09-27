// De Hors-truien per koers: de getekende trui als die er is, anders de blanco
// trui ingekleurd in de kleur van het thema.
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import HorsTruien from "./HorsTruien";
import { KoersThemaProvider } from "@/contexts/KoersThemaContext";
import type { ThemaKey } from "@/lib/themas";

vi.mock("react-i18next", async () => {
  const { maakT } = await import("@/test/i18nMock");
  return { useTranslation: () => ({ t: maakT(), i18n: { language: "nl" } }) };
});

function toon(thema: ThemaKey) {
  render(
    <KoersThemaProvider themaKey={thema}>
      <HorsTruien scores={{ monkeyBeatPct: 78, emiratesPct: 64, directorScore: 7.4 }} />
    </KoersThemaProvider>,
  );
  const trui = (naam: RegExp) => {
    const img = screen.getByRole("button", { name: naam }).querySelector("img");
    return { src: img?.getAttribute("src") ?? "", ingekleurd: img?.className.includes("mix-blend-multiply") ?? false };
  };
  return { monkey: trui(/Monkey IQ/), emirates: trui(/Emirates/), directeur: trui(/Directeur/) };
}

describe("HorsTruien", () => {
  it("Tour: geel, wit en rode bolletjes als tekening", () => {
    const { monkey, emirates, directeur } = toon("geel");
    expect(monkey.src).toContain("wielertrui-geel");
    expect(emirates.src).toContain("wielertrui-wit");
    expect(directeur.src).toContain("wielertrui-bolletjes-rood");
    expect([monkey, emirates, directeur].some((t) => t.ingekleurd)).toBe(false);
  });

  it("Vuelta: blauwe bolletjes getekend, de leiderstrui ingekleurd", () => {
    const { monkey, emirates, directeur } = toon("rood");
    expect(monkey.ingekleurd).toBe(true);
    expect(emirates.src).toContain("wielertrui-wit");
    expect(emirates.ingekleurd).toBe(false);
    expect(directeur.src).toContain("wielertrui-bolletjes-blauw");
  });

  it("Giro: roze en azzurra ingekleurd, wit getekend", () => {
    const { monkey, emirates, directeur } = toon("roze");
    expect(monkey.ingekleurd).toBe(true);
    expect(emirates.ingekleurd).toBe(false);
    expect(directeur.ingekleurd).toBe(true);
  });

  it("zet het cijfer op de borst", () => {
    toon("geel");
    expect(screen.getByRole("button", { name: /Monkey IQ 78 procent/ }).textContent).toContain("78%");
    expect(screen.getByRole("button", { name: /Directeur 7,4/ }).textContent).toContain("7,4");
  });
});
