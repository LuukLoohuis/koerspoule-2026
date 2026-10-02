// Een wedstrijd die zwaarder telt (Grand Prix ×2): de gekozen wedstrijd zegt
// dat erbij, zodat je ziet waarom de punten hoger zijn.
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import WedstrijdBalk from "./WedstrijdBalk";
import { SoortLabel } from "./WedstrijdSoort";
import { bouwWedstrijdBalk, type BalkBron } from "@/lib/meermarathonBalk";

const bron = (stage_number: number, over: Partial<BalkBron> = {}): BalkBron => ({
  id: `w${stage_number}`,
  stage_number,
  date: null,
  is_gc: false,
  results_status: "approved",
  ijs_type: "kunstijs",
  wedstrijd_type: "cup",
  ...over,
});

const { wedstrijden, totaal } = bouwWedstrijdBalk(
  [bron(1), bron(2, { ijs_type: "natuurijs", wedstrijd_type: "grandprix", wegingsfactor: 2 })],
  new Map([
    ["w1", 30],
    ["w2", 120],
  ]),
  { heeftPloeg: true },
);

function toon(gekozenId: string) {
  render(<WedstrijdBalk wedstrijden={wedstrijden} totaal={totaal} gekozenId={gekozenId} onKies={() => {}} foto={null} />);
  return screen.getByRole("status");
}

describe("WedstrijdBalk › weging", () => {
  it("zegt bij een zwaardere wedstrijd dat hij dubbel telt", () => {
    expect(toon("w2")).toHaveTextContent(/Grand Prix 2.*telt dubbel.*\+120 pnt/);
    expect(screen.getByRole("button", { name: "Grand Prix 2, datum volgt, telt dubbel, +120 pnt" })).toBeInTheDocument();
  });

  it("zegt niets bij een gewone wedstrijd", () => {
    expect(toon("w1")).not.toHaveTextContent(/telt/);
  });

  it("zet een merkje op het balkje en telt de soorten tussen haakjes, niet met ×", () => {
    toon("w1");
    const gp = screen.getByRole("button", { name: /^Grand Prix 2/ });
    expect(gp).toHaveTextContent("×2");
    expect(screen.getByRole("button", { name: /^Cup 1/ })).not.toHaveTextContent("×");
  });

  it("telt de soorten in de legenda tussen haakjes: ×2 is de weging", () => {
    const { container } = render(<SoortLabel soort="grandprix" aantal={2} />);
    expect(container).toHaveTextContent("Grand Prix (2)");
  });
});
