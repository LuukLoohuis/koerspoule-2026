// Waar rijd je mee? Vrouwen, mannen of allebei: de kaarten zijn aan/uit, de
// zin eronder zegt wat je koos en de knop zegt wat er nu gebeurt.
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import DeelnameKeuze from "./DeelnameKeuze";
import type { DeelnameOptie } from "@/lib/meermarathonDeelname";

const OPTIES: DeelnameOptie[] = [
  { id: "v", label: "Vrouwen", categorie: "vrouwen", ploeg: "Ploeg van vijf rijders", kalender: "9 wedstrijden · vanaf 31 okt" },
  { id: "m", label: "Mannen", categorie: "mannen", ploeg: "Ploeg van vijf rijders", kalender: "9 wedstrijden · vanaf 31 okt" },
];

function Proef({ opties = OPTIES, start, onVerder }: { opties?: DeelnameOptie[]; start: string[]; onVerder: () => void }) {
  const [gekozen, setGekozen] = useState(() => new Set(start));
  return (
    <DeelnameKeuze
      seizoen="2026-2027"
      opties={opties}
      gekozen={gekozen}
      onWissel={(id) =>
        setGekozen((oud) => {
          const nieuw = new Set(oud);
          if (nieuw.has(id)) nieuw.delete(id);
          else nieuw.add(id);
          return nieuw;
        })
      }
      onVerder={onVerder}
      deadline="vr 13 nov, 23:59"
    />
  );
}

const kaart = (naam: string) => screen.getByRole("button", { name: new RegExp(`^${naam}`) });

describe("deelnamekeuze", () => {
  it("laat allebei kiezen en zegt dat het twee ploegen worden", () => {
    const verder = vi.fn();
    render(<Proef start={["v", "m"]} onVerder={verder} />);
    expect(kaart("Vrouwen")).toHaveAttribute("aria-pressed", "true");
    expect(kaart("Mannen")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Je rijdt mee bij de vrouwen én de mannen: twee ploegen, twee klassementen.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Stel je ploegen samen" }));
    expect(verder).toHaveBeenCalledTimes(1);
  });

  it("past zin en knop aan als je er één uitzet", () => {
    render(<Proef start={["v", "m"]} onVerder={vi.fn()} />);
    fireEvent.click(kaart("Mannen"));
    expect(kaart("Mannen")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("status")).toHaveTextContent("Je rijdt mee bij de vrouwen: één ploeg, één klassement.");
    expect(screen.getByRole("button", { name: "Stel je vrouwenploeg samen" })).toBeEnabled();
  });

  it("gaat niet verder zonder peloton", () => {
    const verder = vi.fn();
    render(<Proef start={[]} onVerder={verder} />);
    expect(screen.getByRole("status")).toHaveTextContent("Kies minstens één peloton.");
    const knop = screen.getByRole("button", { name: "Kies een peloton" });
    expect(knop).toBeDisabled();
    fireEvent.click(knop);
    expect(verder).not.toHaveBeenCalled();
  });

  it("zet een ingediende ploeg vast en telt alleen wat nog moet", () => {
    render(<Proef opties={[{ ...OPTIES[0], ingeschreven: true }, OPTIES[1]]} start={["v", "m"]} onVerder={vi.fn()} />);
    expect(kaart("Vrouwen")).toBeDisabled();
    expect(kaart("Vrouwen")).toHaveTextContent("Je ploeg is ingediend");
    expect(screen.getByRole("button", { name: "Stel je mannenploeg samen" })).toBeEnabled();
  });

  it("laat een gesloten peloton niet kiezen", () => {
    render(<Proef opties={[OPTIES[0], { ...OPTIES[1], gesloten: true }]} start={["v"]} onVerder={vi.fn()} />);
    expect(kaart("Mannen")).toBeDisabled();
    expect(kaart("Mannen")).toHaveTextContent("De inschrijving is gesloten");
  });

  it("noemt de deadline", () => {
    render(<Proef start={["v"]} onVerder={vi.fn()} />);
    expect(screen.getByText("vr 13 nov, 23:59")).toBeInTheDocument();
  });
});
