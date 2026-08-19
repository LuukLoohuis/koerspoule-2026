// De ploegchips zijn de kern van deze functie: ze beantwoorden "hoeveel renners
// heb ik uit dezelfde wielerploeg?" zonder je selectie na te lopen. Dat gedrag
// leggen we vast, inclusief het filteren dat eraan hangt.
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ZoekRenners from "./ZoekRenners";
import nl from "@/i18n/locales/nl.json";

// i18next draait niet in de testomgeving, dus t() zou kaal de sleutel teruggeven.
// Deze mock zoekt de échte Nederlandse tekst op en vult {{...}} in, inclusief de
// enkelvoud/meervoud-variant. Zo controleert de test of de component de juiste
// variabelen meegeeft, en meteen of de vertaalsleutels bestaan.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (sleutel: string, vars?: Record<string, unknown>) => {
      const pad = sleutel.split(".");
      const zoekOp = (k: string[]) =>
        k.reduce<unknown>((n, deel) => (n as Record<string, unknown>)?.[deel], nl);
      const telwoord = typeof vars?.count === "number" && vars.count === 1 ? "_one" : "_other";
      const laatste = pad[pad.length - 1];
      const tekst =
        (zoekOp(pad) as string | undefined) ??
        (zoekOp([...pad.slice(0, -1), laatste + telwoord]) as string | undefined);
      if (typeof tekst !== "string") throw new Error(`vertaalsleutel ontbreekt: ${sleutel}`);
      return Object.entries(vars ?? {}).reduce(
        (uit, [k, v]) => uit.replace(new RegExp(`{{${k}}}`, "g"), String(v)),
        tekst,
      );
    },
  }),
}));

const verdeling: Array<[string, number]> = [["Visma", 3], ["UAE", 2], ["EF", 1]];

describe("ZoekRenners", () => {
  it("toont per ploeg hoeveel renners je al hebt", () => {
    render(<ZoekRenners waarde="" onChange={() => {}} verdeling={verdeling} gevonden={null} />);
    const visma = screen.getByRole("button", { name: /Visma/i });
    expect(visma).toHaveTextContent("Visma");
    expect(visma).toHaveTextContent("3");
    expect(screen.getByRole("button", { name: /UAE/i })).toHaveTextContent("2");
  });

  it("filtert op die ploeg als je de chip aantikt", () => {
    const onChange = vi.fn();
    render(<ZoekRenners waarde="" onChange={onChange} verdeling={verdeling} gevonden={null} />);
    fireEvent.click(screen.getByRole("button", { name: /Visma/i }));
    expect(onChange).toHaveBeenCalledWith("Visma");
  });

  it("tikt de actieve chip het filter weer uit", () => {
    const onChange = vi.fn();
    render(<ZoekRenners waarde="Visma" onChange={onChange} verdeling={verdeling} gevonden={3} />);
    const visma = screen.getByRole("button", { name: /Visma/i });
    expect(visma).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(visma);
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("meldt hoeveel renners de zoekterm oplevert", () => {
    render(<ZoekRenners waarde="visma" onChange={() => {}} verdeling={verdeling} gevonden={3} />);
    // De sleutel eindigt op het aantal: zo weten we dat count is doorgegeven.
    expect(screen.getByRole("status")).toHaveTextContent("3");
  });

  it("laat de wisknop alleen zien als er iets staat", () => {
    const onChange = vi.fn();
    const { rerender } = render(<ZoekRenners waarde="" onChange={onChange} verdeling={[]} gevonden={null} />);
    expect(screen.queryByRole("button", { name: /wissen|clear/i })).toBeNull();

    rerender(<ZoekRenners waarde="poga" onChange={onChange} verdeling={[]} gevonden={1} />);
    fireEvent.click(screen.getByRole("button", { name: /wissen|clear/i }));
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("laat de chipbalk weg als je nog niemand hebt gekozen", () => {
    render(<ZoekRenners waarde="" onChange={() => {}} verdeling={[]} gevonden={null} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("typen geeft de tekst door", () => {
    const onChange = vi.fn();
    render(<ZoekRenners waarde="" onChange={onChange} verdeling={[]} gevonden={null} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "visma" } });
    expect(onChange).toHaveBeenCalledWith("visma");
  });
});
