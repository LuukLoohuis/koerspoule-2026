import { describe, expect, it } from "vitest";
import { bouwTotaalklassement, totaalRegel, type TotaalBronRij } from "./meermarathonTotaal";

const rij = (user_id: string, punten: number, display_name: string | null = user_id, team_name: string | null = null): TotaalBronRij => ({
  user_id,
  display_name,
  team_name,
  punten,
});

describe("totaalklassement", () => {
  it("telt je punten bij de vrouwen en de mannen op", () => {
    const totaal = bouwTotaalklassement([
      { categorie: "vrouwen", rijen: [rij("anke", 200), rij("joost", 150)] },
      { categorie: "mannen", rijen: [rij("joost", 120), rij("anke", 60)] },
    ]);
    expect(totaal.map((r) => [r.user_id, r.totaal, r.rank])).toEqual([
      ["joost", 270, 1],
      ["anke", 260, 2],
    ]);
    expect(totaal[0].vrouwen).toEqual({ punten: 150, rank: 2 });
    expect(totaal[0].mannen).toEqual({ punten: 120, rank: 1 });
  });

  it("neemt wie in één peloton meedoet mee met dat peloton", () => {
    const totaal = bouwTotaalklassement([
      { categorie: "vrouwen", rijen: [rij("anke", 200)] },
      { categorie: "mannen", rijen: [rij("kees", 90)] },
    ]);
    const kees = totaal.find((r) => r.user_id === "kees")!;
    expect(kees).toMatchObject({ totaal: 90, rank: 2, vrouwen: null, mannen: { punten: 90, rank: 1 } });
  });

  it("laat gelijke punten de plek delen", () => {
    const totaal = bouwTotaalklassement([
      { categorie: "vrouwen", rijen: [rij("a", 100), rij("b", 80), rij("c", 80), rij("d", 50)] },
    ]);
    expect(totaal.map((r) => r.rank)).toEqual([1, 2, 2, 4]);
  });

  it("noemt de speler, niet een van zijn ploegen", () => {
    const totaal = bouwTotaalklassement([
      { categorie: "vrouwen", rijen: [rij("anke", 10, "Anke", "IJspegels")] },
      { categorie: "mannen", rijen: [rij("anke", 10, "Anke", "Kou op de Kop")] },
      { categorie: "mannen", rijen: [rij("zonder", 5, null, "Wind Mee")] },
    ]);
    expect(totaal.map((r) => r.naam)).toEqual(["Anke", "Wind Mee"]);
  });

  it("zegt in de pelotonbalk waar je staat", () => {
    const totaal = bouwTotaalklassement([
      { categorie: "vrouwen", rijen: [rij("a", 30), rij("b", 20), rij("mij", 10)] },
    ]);
    expect(totaalRegel(totaal, "mij")).toBe("3e van 3");
    expect(totaalRegel(totaal, "niemand")).toBeNull();
    expect(totaalRegel(totaal, null)).toBeNull();
  });
});
