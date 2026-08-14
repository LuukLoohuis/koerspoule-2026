import { describe, expect, it } from "vitest";
import { matchesParticipantSearch } from "./adminBreakdownSearch";

const participant = {
  display_name: "Éd Tolboom",
  team_name: "Puck Power",
};

describe("matchesParticipantSearch", () => {
  it("zoekt hoofdletter- en accentongevoelig op deelnemersnaam", () => {
    expect(matchesParticipantSearch(participant, "ED TOL")).toBe(true);
  });

  it("zoekt op een gedeeltelijke ploegnaam", () => {
    expect(matchesParticipantSearch(participant, "power")).toBe(true);
  });

  it("combineert woorden uit deelnemer- en ploegnaam", () => {
    expect(matchesParticipantSearch(participant, "tol puck")).toBe(true);
  });

  it("verbergt niet-overeenkomende deelnemers", () => {
    expect(matchesParticipantSearch(participant, "plechelmus")).toBe(false);
  });
});
