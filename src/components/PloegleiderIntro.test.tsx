// De kennismaking is vaste tekst en hoort dus altijd hetzelfde te zijn. Deze
// test bewaakt dat de sleutels bestaan en dat het paneel dicht begint --
// een kennismaking die meteen openstaat duwt het rapport weg.
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PloegleiderIntro from "./PloegleiderIntro";
import nl from "@/i18n/locales/nl.json";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (sleutel: string) => {
      const tekst = sleutel.split(".").reduce<unknown>((n, d) => (n as Record<string, unknown>)?.[d], nl);
      if (typeof tekst !== "string") throw new Error(`vertaalsleutel ontbreekt: ${sleutel}`);
      return tekst;
    },
  }),
}));

describe("PloegleiderIntro", () => {
  it("begint dicht en toont alleen de knop", () => {
    render(<PloegleiderIntro persona="kastelein" />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(/Katlijk/)).toBeNull();
  });

  it("klapt open en stelt Douwe voor", () => {
    render(<PloegleiderIntro persona="kastelein" />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
    // Twee keer: in de kop en in zijn eigen openingszin. Dat is bedoeld.
    expect(screen.getAllByText(/Douwe Kastelein/).length).toBe(2);
    expect(screen.getByText(/Katlijk/)).toBeTruthy();
  });

  it("bevat de achtergrond die het personage maakt", () => {
    render(<PloegleiderIntro persona="kastelein" />);
    fireEvent.click(screen.getByRole("button"));
    const tekst = document.body.textContent ?? "";
    for (const detail of ["Zesenzestig", "tegels", "'85", "bevroren veters", "deksel", "schriftje", "gemalen"]) {
      expect(tekst).toContain(detail);
    }
  });

  it("noemt hem ploegleider en nadrukkelijk geen directeur", () => {
    render(<PloegleiderIntro persona="kastelein" />);
    fireEvent.click(screen.getByRole("button"));
    const tekst = document.body.textContent ?? "";
    expect(tekst).toContain("Ploegleider");
    expect(tekst).toMatch(/geen directeur/);
  });

  it("stelt bij de wielergames Lefevere voor, niet Douwe", () => {
    render(<PloegleiderIntro persona="lefevere" />);
    fireEvent.click(screen.getByRole("button"));
    const tekst = document.body.textContent ?? "";
    expect(tekst).toContain("Patrick Lefevere");
    expect(tekst).not.toContain("Katlijk");
    // Blijft bij zijn publieke rol: geen verzonnen privegeschiedenis.
    expect(tekst).toMatch(/naar uw keuzes, niet naar uw excuses/);
  });

  it("laat lege alinea's weg", () => {
    // Lefevere heeft er een minder dan Douwe; een leeg <p> hoort er niet te staan.
    render(<PloegleiderIntro persona="lefevere" />);
    fireEvent.click(screen.getByRole("button"));
    const leeg = Array.from(document.querySelectorAll("p")).filter((n) => !n.textContent?.trim());
    expect(leeg).toHaveLength(0);
  });

  it("klapt weer dicht", () => {
    render(<PloegleiderIntro persona="kastelein" />);
    const knop = screen.getByRole("button");
    fireEvent.click(knop);
    fireEvent.click(knop);
    expect(screen.queryByText(/Katlijk/)).toBeNull();
  });
});
