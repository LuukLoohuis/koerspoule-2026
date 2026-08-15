import { describe, expect, it } from "vitest";
import { registrationPhaseForStatus } from "./gameStatus";

describe("registrationPhaseForStatus", () => {
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
