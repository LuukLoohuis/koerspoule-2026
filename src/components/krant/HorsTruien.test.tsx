// De Hors-truien per koers: de getekende trui als die er is, anders de witte
// trui ingekleurd in de kleur van het thema. Cijfer en label staan als opdruk
// op de borst.
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import HorsTruien from "./HorsTruien";
import { KoersThemaProvider } from "@/contexts/KoersThemaContext";
import type { HorsScores } from "@/components/karavaan/MiniStrip";
import type { ThemaKey } from "@/lib/themas";

vi.mock("react-i18next", async () => {
  const { maakT } = await import("@/test/i18nMock");
  return { useTranslation: () => ({ t: maakT(), i18n: { language: "nl" } }) };
});

const SCORES: HorsScores = { monkeyBeatPct: 78, emiratesPct: 64, directorScore: 7.4 };

function toon(thema: ThemaKey, scores: HorsScores = SCORES) {
  const onOpen = vi.fn();
  render(
    <KoersThemaProvider themaKey={thema}>
      <HorsTruien scores={scores} onOpen={onOpen} />
    </KoersThemaProvider>,
  );
  const knop = (naam: RegExp) => screen.getByRole("button", { name: naam });
  const trui = (naam: RegExp) => {
    const img = knop(naam).querySelector("img");
    return { src: img?.getAttribute("src") ?? "", ingekleurd: img?.className.includes("mix-blend-multiply") ?? false };
  };
  /** De regels van de opdruk: het cijfer en het label. */
  const opdruk = (naam: RegExp) => [...knop(naam).querySelectorAll("svg text")].map((t) => t.textContent);
  return { onOpen, knop, opdruk, monkey: trui(/Monkey IQ/), emirates: trui(/Emirates/), directeur: trui(/Directeur/) };
}

describe("HorsTruien", () => {
  it("Tour: geel, wit en rode bolletjes als tekening", () => {
    const { monkey, emirates, directeur } = toon("geel");
    expect(monkey.src).toContain("hors-trui-geel");
    expect(emirates.src).toContain("hors-trui-wit");
    expect(directeur.src).toContain("hors-trui-bolletjes-rood");
    expect([monkey, emirates, directeur].some((t) => t.ingekleurd)).toBe(false);
  });

  it("Vuelta: blauwe bolletjes getekend, de leiderstrui ingekleurd", () => {
    const { monkey, emirates, directeur } = toon("rood");
    expect(monkey.ingekleurd).toBe(true);
    expect(emirates.src).toContain("hors-trui-wit");
    expect(emirates.ingekleurd).toBe(false);
    expect(directeur.src).toContain("hors-trui-bolletjes-blauw");
  });

  it("Giro: roze en azzurra ingekleurd, wit getekend", () => {
    const { monkey, emirates, directeur } = toon("roze");
    expect(monkey.ingekleurd).toBe(true);
    expect(emirates.ingekleurd).toBe(false);
    expect(directeur.ingekleurd).toBe(true);
  });

  it("drukt het cijfer en het label op de borst", () => {
    const { opdruk } = toon("geel");
    expect(opdruk(/Monkey IQ/)).toEqual(["78%", "MONKEY IQ"]);
    expect(opdruk(/Emirates/)).toEqual(["64%", "RENDEMENT"]);
    expect(opdruk(/Directeur/)).toEqual(["7,4", "RAPPORTCIJFER"]);
  });

  it("volgt het cijfer van de deelnemer; het label blijft staan", () => {
    const { opdruk } = toon("geel", { monkeyBeatPct: 100, emiratesPct: 9, directorScore: 10 });
    expect(opdruk(/Monkey IQ/)).toEqual(["100%", "MONKEY IQ"]);
    expect(opdruk(/Emirates/)).toEqual(["9%", "RENDEMENT"]);
    expect(opdruk(/Directeur/)).toEqual(["10,0", "RAPPORTCIJFER"]);
  });

  it("houdt een lang cijfer tussen de mouwen", () => {
    const { knop } = toon("geel", { monkeyBeatPct: 100, emiratesPct: 64, directorScore: 7.4 });
    const lengte = (naam: RegExp) => Number(knop(naam).querySelector("svg text")?.getAttribute("textLength"));
    const letter = (naam: RegExp) => Number(knop(naam).querySelector("svg text")?.getAttribute("font-size"));
    expect(lengte(/Monkey IQ/)).toBeLessThanOrEqual(232);
    expect(letter(/Monkey IQ/)).toBeLessThan(letter(/Emirates/));
  });

  it("zet een streepje op de trui zolang het cijfer er niet is", () => {
    const { opdruk } = toon("geel", { monkeyBeatPct: 78, emiratesPct: null, directorScore: 7.4 });
    expect(opdruk(/Emirates/)).toEqual(["–", "RENDEMENT"]);
  });

  it("opent per trui de eigen analyse", () => {
    const { onOpen, knop } = toon("geel");
    fireEvent.click(knop(/Monkey IQ/));
    fireEvent.click(knop(/Emirates/));
    fireEvent.click(knop(/Directeur/));
    expect(onOpen.mock.calls.map((c) => c[0])).toEqual(["dartpijl", "superteam", "wielerdirecteur"]);
  });
});
