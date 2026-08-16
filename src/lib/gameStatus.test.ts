import { describe, expect, it } from "vitest";
import { registrationPhaseForStatus, resolveDefaultGameId } from "./gameStatus";

describe("registrationPhaseForStatus", () => {
  it("kiest de globale sitegame op admin-status", () => {
    const games = [
      { id: "giro", status: "finished" },
      { id: "tour", status: "open_inschrijving" },
      { id: "vuelta", status: "live" },
    ];
    expect(resolveDefaultGameId(games)).toBe("vuelta");

    games[2].status = "finished";
    expect(resolveDefaultGameId(games)).toBe("tour");
  });

  it("treats sneak preview statuses as not yet open", () => {
    expect(registrationPhaseForStatus("open")).toBe("preview");
    expect(registrationPhaseForStatus("draft")).toBe("preview");
    expect(registrationPhaseForStatus("concept")).toBe("preview");
  });

  it("opens registration only for open_inschrijving", () => {
    expect(registrationPhaseForStatus("open_inschrijving")).toBe("open");
  });

  it("closes registration once the game is live", () => {
    expect(registrationPhaseForStatus("live")).toBe("closed");
    expect(registrationPhaseForStatus("locked")).toBe("closed");
    expect(registrationPhaseForStatus("finished")).toBe("closed");
  });
});
