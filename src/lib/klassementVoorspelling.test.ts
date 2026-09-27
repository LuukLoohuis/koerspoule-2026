import { describe, expect, it } from "vitest";
import { telVoorspellingen } from "./klassementVoorspelling";

describe("telVoorspellingen", () => {
  it("telt per klassement hoeveel voorspellingen de winnaar noemen", () => {
    const rijen = [
      { classification: "cup", rider_id: "a" },
      { classification: "cup", rider_id: "b" },
      { classification: "cup", rider_id: "a" },
      { classification: "grandprix", rider_id: "b" },
    ];
    expect(telVoorspellingen(rijen, { cup: "a", grandprix: null })).toEqual({
      cup: { voorspeld: 3, goed: 2 },
      grandprix: { voorspeld: 1, goed: 0 },
    });
  });

  it("negeert de voorspellingen van de wielergames", () => {
    expect(telVoorspellingen([{ classification: "gc", rider_id: "a" }], { cup: "a", grandprix: "a" })).toEqual({
      cup: { voorspeld: 0, goed: 0 },
      grandprix: { voorspeld: 0, goed: 0 },
    });
  });
});
