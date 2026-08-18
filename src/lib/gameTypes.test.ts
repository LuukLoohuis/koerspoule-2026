import { describe, expect, it } from "vitest";
import { defaultWedstrijdType, gameSeasonName, gameYearFieldValue, isMeermarathonGame, meermarathonAfstandLabel, meermarathonSeason,
  meermarathonSeasonKort, meermarathonStageLabel, parseGameYearInput } from "./gameTypes";

describe("Meermarathon game type", () => {
  it("recognises the game type without changing other game types", () => {
    expect(isMeermarathonGame("meermarathon")).toBe(true);
    expect(isMeermarathonGame("MEERMARATHON")).toBe(true);
    expect(isMeermarathonGame("tdf")).toBe(false);
  });

  it("formats the winter season over two calendar years", () => {
    expect(meermarathonSeason(2026)).toBe("2026-2027");
    expect(meermarathonSeason(2099)).toBe("2099-2100");
    expect(gameSeasonName("meermarathon", 2026)).toBe("Meermarathon 2026-2027");
    expect(gameSeasonName("giro", 2026)).toBe("Giro d'Italia 2026");
  });

  it("parses a season only for Meermarathon and a year for grand tours", () => {
    expect(parseGameYearInput("meermarathon", "2026-2027")).toBe(2026);
    expect(parseGameYearInput("meermarathon", "2026–2027")).toBe(2026);
    expect(parseGameYearInput("meermarathon", "2026-2028")).toBeNull();
    expect(parseGameYearInput("tdf", "2026")).toBe(2026);
    expect(parseGameYearInput("tdf", "2026-2027")).toBeNull();
  });

  it("formats the admin year field for the selected game type", () => {
    expect(gameYearFieldValue("meermarathon", 2026)).toBe("2026-2027");
    expect(gameYearFieldValue("giro", 2026)).toBe("2026");
  });
});

describe("meermarathon-wedstrijden", () => {
  it("nummert cups en grand prix', maar ONK en NK niet", () => {
    expect(meermarathonStageLabel({ stage_number: 3, wedstrijd_type: "cup" })).toBe("Cup 3");
    expect(meermarathonStageLabel({ stage_number: 5, wedstrijd_type: "grandprix" })).toBe("Grand Prix 5");
    // Titelwedstrijden zijn eenmalig; een nummer erachter zou verwarren.
    expect(meermarathonStageLabel({ stage_number: 7, wedstrijd_type: "onk" })).toBe("ONK");
    expect(meermarathonStageLabel({ stage_number: 9, wedstrijd_type: "nk" })).toBe("NK");
  });

  it("laat een eigen naam altijd voorgaan", () => {
    expect(meermarathonStageLabel({ stage_number: 2, name: "Alternatieve Elfstedentocht", wedstrijd_type: "cup" }))
      .toBe("Alternatieve Elfstedentocht");
    expect(meermarathonStageLabel({ stage_number: 2, name: "   ", wedstrijd_type: "cup" })).toBe("Cup 2");
  });

  it("valt zonder soort terug op de ondergrond", () => {
    expect(meermarathonStageLabel({ stage_number: 4, ijs_type: "natuurijs" })).toBe("Grand Prix 4");
    expect(meermarathonStageLabel({ stage_number: 4, ijs_type: "kunstijs" })).toBe("Cup 4");
    expect(meermarathonStageLabel({ stage_number: 4 })).toBe("Cup 4");
    expect(defaultWedstrijdType("natuurijs")).toBe("grandprix");
    expect(defaultWedstrijdType(null)).toBe("cup");
  });

  it("meet kunstijs in ronden en natuurijs in kilometers", () => {
    expect(meermarathonAfstandLabel({ ijs_type: "kunstijs", aantal_rondes: 100 })).toBe("100 ronden");
    expect(meermarathonAfstandLabel({ ijs_type: "kunstijs", aantal_rondes: 1 })).toBe("1 ronde");
    expect(meermarathonAfstandLabel({ ijs_type: "natuurijs", distance_km: 85 })).toBe("85 km");
    // Kilometers op kunstijs zijn niet de maat; die worden genegeerd.
    expect(meermarathonAfstandLabel({ ijs_type: "kunstijs", distance_km: 40 })).toBeNull();
    expect(meermarathonAfstandLabel({ ijs_type: "natuurijs" })).toBeNull();
  });

  it("kort een seizoen af met de juiste tekens", () => {
    // U+2019 (rechter enkel aanhalingsteken) markeert de weggelaten cijfers,
    // en het streepje is een gewoon koppelteken: een seizoen is een geheel,
    // geen bereik van-tot.
    expect(meermarathonSeasonKort(2026)).toBe("\u201926-\u201927");
    expect(meermarathonSeasonKort(1999)).toBe("\u201999-\u201900");
    expect(meermarathonSeasonKort(2005)).toBe("\u201905-\u201906");
  });

  it("gebruikt niet de rechte apostrof of het linker aanhalingsteken", () => {
    const kort = meermarathonSeasonKort(2026);
    expect(kort).not.toContain("'");
    expect(kort).not.toContain("\u2018");
    // En geen halflang streepje: dat is de Engelse conventie voor bereiken.
    expect(kort).not.toContain("\u2013");
  });
});
