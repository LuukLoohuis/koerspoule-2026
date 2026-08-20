import { describe, it, expect } from "vitest";
import { tourviewUrl } from "./tourview";

describe("tourviewUrl", () => {
  it("bouwt het pad per koers en per jaar", () => {
    expect(tourviewUrl("vuelta", 2026, 1)).toBe("https://tourview.pages.dev/la-vuelta-2026/stage-1");
    expect(tourviewUrl("giro", 2026, 14)).toBe("https://tourview.pages.dev/giro-d-italia-2026/stage-14");
    expect(tourviewUrl("tour", 2026, 21)).toBe("https://tourview.pages.dev/tour-de-france-2026/stage-21");
  });

  it("behandelt tdf als de Tour", () => {
    expect(tourviewUrl("tdf", 2026, 3)).toBe(tourviewUrl("tour", 2026, 3));
  });

  it("is ongevoelig voor hoofdletters", () => {
    expect(tourviewUrl("VUELTA", 2026, 2)).toContain("la-vuelta-2026");
  });

  it("geeft niets terug voor koersen die tourview niet heeft", () => {
    // Femmes is een andere koers dan de Tour; hem daarheen sturen zou het
    // verkeerde profiel tonen, en dat is erger dan geen profiel.
    expect(tourviewUrl("femmes", 2026, 1)).toBeNull();
    expect(tourviewUrl("meermarathon", 2027, 1)).toBeNull();
    expect(tourviewUrl(null, 2026, 1)).toBeNull();
    expect(tourviewUrl("onzin", 2026, 1)).toBeNull();
  });

  it("geeft niets terug zonder bruikbaar jaar of etappenummer", () => {
    expect(tourviewUrl("vuelta", null, 1)).toBeNull();
    expect(tourviewUrl("vuelta", 2026, null)).toBeNull();
    expect(tourviewUrl("vuelta", 2026, 0)).toBeNull();
  });

  it("volgt het jaar van de game", () => {
    expect(tourviewUrl("vuelta", 2027, 1)).toContain("la-vuelta-2027");
  });
});
