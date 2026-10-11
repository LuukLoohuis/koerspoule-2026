import { describe, expect, it } from "vitest";
import { eenSegmentPerSeizoen, splitsOudeKoersen } from "./koersSegment";

const g = (id: string, game_type: string, year: number, categorie: string | null = null) => ({ id, game_type, year, categorie });

describe("GameSwitcher: één Meermarathon-segment per seizoen", () => {
  const games = [
    g("tour", "tdf", 2026),
    g("mm-m", "meermarathon", 2026, "mannen"),
    g("mm-v", "meermarathon", 2026, "vrouwen"),
    g("mm-oud", "meermarathon", 2025, "vrouwen"),
  ];

  it("laat vrouwen staan als niets uit het seizoen gekozen is", () => {
    expect(eenSegmentPerSeizoen(games, "tour").map((x) => x.id)).toEqual(["tour", "mm-v", "mm-oud"]);
  });

  it("laat de gekozen categorie staan, zodat het segment actief oplicht", () => {
    expect(eenSegmentPerSeizoen(games, "mm-m").map((x) => x.id)).toEqual(["tour", "mm-m", "mm-oud"]);
  });
});

describe("GameSwitcher: afgeronde koersen achter één segment \"Oude koersen\"", () => {
  const s = (id: string, status: string) => ({ id, status });

  it("zet lopende koersen in de balk en afgeronde in het archief", () => {
    const { actief, oud } = splitsOudeKoersen([s("mm", "open_inschrijving"), s("giro", "finished"), s("tour", "closed")]);
    expect(actief.map((x) => x.id)).toEqual(["mm"]);
    expect(oud.map((x) => x.id)).toEqual(["giro", "tour"]);
  });

  it("houdt de nieuwste afgeronde koers in de balk als er niets loopt", () => {
    const { actief, oud } = splitsOudeKoersen([s("vuelta", "finished"), s("tour", "finished"), s("giro", "finished")]);
    expect(actief.map((x) => x.id)).toEqual(["vuelta"]);
    expect(oud.map((x) => x.id)).toEqual(["tour", "giro"]);
  });

  it("heeft geen archief zolang er niets afgerond is", () => {
    const { actief, oud } = splitsOudeKoersen([s("tour", "live"), s("femmes", "open")]);
    expect(actief).toHaveLength(2);
    expect(oud).toEqual([]);
  });
});
