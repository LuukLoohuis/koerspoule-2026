import { describe, expect, it } from "vitest";
import {
  achterstandTekst,
  bewegingLabel,
  bewegingTeken,
  heeftEerdereUitslag,
  jouwPlek,
  klassementRegels,
  laatsteGoedgekeurdeWedstrijd,
  ploegenTekst,
  ploegnaam,
  verborgenRijen,
  type KlassementRegel,
  type MmStandRij,
} from "./meermarathonKlassement";

const rij = (n: number, over: Partial<MmStandRij> = {}): MmStandRij => ({
  entry_id: `e${n}`,
  user_id: `u${n}`,
  team_name: `Ploeg ${n}`,
  display_name: `Speler ${n}`,
  rank: n,
  delta: 0,
  total: 300 - n * 5,
  stage_points: 20,
  ...over,
});

const stand = (aantal: number) => Array.from({ length: aantal }, (_, i) => rij(i + 1));

/** Compact: rangnummers, "⋮" voor een gat, "*" achter jouw rij. */
const kort = (regels: KlassementRegel<MmStandRij>[]) =>
  regels.map((r) => (r.soort === "gat" ? "⋮" : `${r.rij.rank}${r.jij ? "*" : ""}`)).join(" ");

describe("klassementRegels", () => {
  it("toont de top 5, een gat en jouw rij met buren", () => {
    expect(kort(klassementRegels(stand(40), "u12"))).toBe("1 2 3 4 5 ⋮ 11 12* 13");
  });

  it("geeft het aantal verborgen ploegen in het gat mee", () => {
    const regels = klassementRegels(stand(40), "u12");
    expect(regels.find((r) => r.soort === "gat")).toEqual({ soort: "gat", verborgen: 5 });
    expect(verborgenRijen(stand(40), regels)).toBe(32);
  });

  it("vult een gat van één rij op in plaats van een ⋮", () => {
    expect(kort(klassementRegels(stand(40), "u8"))).toBe("1 2 3 4 5 6 7 8* 9");
  });

  it("sluit aan op de top zonder gat", () => {
    expect(kort(klassementRegels(stand(40), "u6"))).toBe("1 2 3 4 5 6* 7");
    expect(kort(klassementRegels(stand(40), "u3"))).toBe("1 2 3* 4 5");
  });

  it("toont als hekkensluiter alleen je voorganger", () => {
    expect(kort(klassementRegels(stand(40), "u40"))).toBe("1 2 3 4 5 ⋮ 39 40*");
  });

  it("zonder eigen ploeg alleen de top", () => {
    expect(kort(klassementRegels(stand(40), "iemand-anders"))).toBe("1 2 3 4 5");
    expect(kort(klassementRegels(stand(40), null))).toBe("1 2 3 4 5");
  });

  it("een kort klassement past helemaal", () => {
    expect(kort(klassementRegels(stand(3), "u2"))).toBe("1 2* 3");
    expect(kort(klassementRegels([], "u1"))).toBe("");
  });

  it("volledig toont elke rij", () => {
    const regels = klassementRegels(stand(40), "u12", { volledig: true });
    expect(regels).toHaveLength(40);
    expect(regels.every((r) => r.soort === "rij")).toBe(true);
    expect(verborgenRijen(stand(40), regels)).toBe(0);
  });

  it("kijkt naar de positie in de lijst, ook bij gedeelde plekken", () => {
    const rijen = stand(12).map((r, i) => (i >= 9 ? { ...r, rank: 10 } : r));
    expect(kort(klassementRegels(rijen, "u11"))).toBe("1 2 3 4 5 ⋮ 10 10* 10");
  });
});

describe("laatste goedgekeurde wedstrijd", () => {
  const w = (stage_number: number, results_status: string | null, is_gc = false) => ({ stage_number, results_status, is_gc });

  it("pakt de hoogste goedgekeurde, zonder GC", () => {
    const lijst = [w(1, "approved"), w(2, "approved"), w(3, "pending"), w(99, "approved", true)];
    expect(laatsteGoedgekeurdeWedstrijd(lijst)?.stage_number).toBe(2);
  });

  it("geeft null zolang er niets is goedgekeurd", () => {
    expect(laatsteGoedgekeurdeWedstrijd([w(1, "draft"), w(2, null)])).toBeNull();
  });

  it("weet of er vóór een wedstrijd al een uitslag was", () => {
    const lijst = [w(1, "approved"), w(2, "approved")];
    expect(heeftEerdereUitslag(lijst, 2)).toBe(true);
    expect(heeftEerdereUitslag(lijst, 1)).toBe(false);
    expect(heeftEerdereUitslag([w(0, "approved", true), w(1, "approved")], 1)).toBe(false);
  });
});

describe("jouwPlek", () => {
  const rijen = [
    rij(1, { total: 211 }),
    rij(2, { total: 204 }),
    rij(3, { total: 146, delta: 4, team_name: "De Klapschaatsers" }),
  ];

  it("rekent de achterstand op de leider uit", () => {
    expect(jouwPlek(rijen, "u3", { metBeweging: true })).toEqual({
      rank: 3,
      ploegnaam: "De Klapschaatsers",
      punten: 146,
      achterstand: 65,
      gedeeldeLeiding: false,
      beweging: { richting: "op", plaatsen: 4 },
    });
  });

  it("laat de beweging weg na de eerste wedstrijd", () => {
    expect(jouwPlek(rijen, "u3", { metBeweging: false })?.beweging).toBeNull();
  });

  it("geeft null als je niet in het klassement staat", () => {
    expect(jouwPlek(rijen, "u9", { metBeweging: true })).toBeNull();
    expect(jouwPlek(rijen, undefined, { metBeweging: true })).toBeNull();
  });

  it("herkent een gedeelde leiding", () => {
    const gelijk = [rij(1, { total: 90 }), rij(2, { rank: 1, total: 90 }), rij(3, { total: 80 })];
    const plek = jouwPlek(gelijk, "u2", { metBeweging: true })!;
    expect(plek.achterstand).toBe(0);
    expect(plek.gedeeldeLeiding).toBe(true);
    expect(achterstandTekst(plek)).toBe("gedeeld aan de leiding");
  });

  it("zakken en gelijk blijven", () => {
    expect(jouwPlek([rij(1, { delta: -2 })], "u1", { metBeweging: true })?.beweging).toEqual({ richting: "neer", plaatsen: 2 });
    expect(jouwPlek([rij(1)], "u1", { metBeweging: true })?.beweging).toEqual({ richting: "gelijk", plaatsen: 0 });
  });
});

describe("opmaak", () => {
  it("beweging als teken en als zin", () => {
    expect(bewegingTeken({ richting: "op", plaatsen: 4 })).toBe("▲ 4");
    expect(bewegingTeken({ richting: "neer", plaatsen: 1 })).toBe("▼ 1");
    expect(bewegingTeken({ richting: "gelijk", plaatsen: 0 })).toBe("=");
    expect(bewegingLabel({ richting: "op", plaatsen: 4 })).toBe("4 plaatsen gestegen");
    expect(bewegingLabel({ richting: "neer", plaatsen: 1 })).toBe("1 plaats gezakt");
    expect(bewegingLabel({ richting: "gelijk", plaatsen: 0 })).toBe("gelijk gebleven");
  });

  it("achterstand lang en kort, met duizendtallen", () => {
    expect(achterstandTekst({ achterstand: 65, gedeeldeLeiding: false })).toBe("65 achter de leider");
    expect(achterstandTekst({ achterstand: 1250, gedeeldeLeiding: false }, true)).toBe("1.250 achter");
    expect(achterstandTekst({ achterstand: 0, gedeeldeLeiding: false })).toBe("aan de leiding");
  });

  it("aantal ploegen", () => {
    expect(ploegenTekst(1204)).toBe("1.204 ploegen");
    expect(ploegenTekst(1)).toBe("1 ploeg");
  });

  it("ploegnaam valt terug op de spelersnaam", () => {
    expect(ploegnaam({ team_name: "  ", display_name: "Bram" })).toBe("Bram");
    expect(ploegnaam({ team_name: null, display_name: null })).toBe("Ploeg zonder naam");
  });
});
