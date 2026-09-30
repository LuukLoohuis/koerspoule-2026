// De schaatsfoto's van de Meermarathon: achter de uitslagenbalk het peloton in
// de mist, achter de kop van een pagina het natuurijs. Op elke foto van
// Timsimaging staat haar naam.
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import KopOpFoto from "./KopOpFoto";
import WedstrijdBalk from "./WedstrijdBalk";
import { bouwWedstrijdBalk } from "@/lib/meermarathonBalk";
import { BALK_FOTO, KOP_FOTO, TIMSIMAGING, type BalkFoto } from "@/lib/meermarathonFotos";

const { wedstrijden, totaal } = bouwWedstrijdBalk(
  [{ id: "w1", stage_number: 1, date: "2026-10-31", is_gc: false, results_status: "approved", wedstrijd_type: "cup", ijs_type: "kunstijs" }],
  new Map([["w1", 54]]),
  { heeftPloeg: true },
);

function toonBalk(foto?: BalkFoto | null) {
  const { container } = render(
    <WedstrijdBalk
      wedstrijden={wedstrijden}
      totaal={totaal}
      gekozenId="w1"
      onKies={() => {}}
      {...(foto === undefined ? {} : { foto })}
    />,
  );
  return container;
}

const credit = () => screen.queryByRole("link", { name: /^Foto: Timsimaging/ });

describe("WedstrijdBalk › foto", () => {
  it("staat op de lichte foto van het peloton in de mist, met de naam van de fotograaf", () => {
    const balk = toonBalk();
    expect(balk.querySelector("img")).toHaveAttribute("src", BALK_FOTO.src);
    expect(credit()).toHaveAttribute("href", TIMSIMAGING.url);
    expect(credit()).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("een lichte foto krijgt de waas en houdt de kleuren van het thema", () => {
    const balk = toonBalk();
    expect(BALK_FOTO.licht).toBe(true);
    expect(balk.querySelector(".mm-balk-waas-licht")).not.toBeNull();
    expect(balk.querySelector(".mm-balk-foto")).toBeNull();
  });

  it("een donkere foto krijgt de nachtkleuren", () => {
    const balk = toonBalk({ src: "/avond.webp" });
    expect(balk.querySelector(".mm-balk-foto")).not.toBeNull();
    expect(balk.querySelector(".mm-balk-waas-licht")).toBeNull();
    expect(credit()).toBeNull();
  });

  it("zonder foto de lichte kaart, zonder naam van een fotograaf", () => {
    const balk = toonBalk(null);
    expect(balk.querySelector("img")).toBeNull();
    expect(credit()).toBeNull();
  });
});

describe("KopOpFoto", () => {
  it("zet de kop op de foto, met de naam van de fotograaf", () => {
    const { container } = render(
      <KopOpFoto foto={KOP_FOTO.uitslagen}>
        <h1>Uitslagen</h1>
      </KopOpFoto>,
    );
    expect(screen.getByRole("heading", { name: "Uitslagen" })).toBeInTheDocument();
    expect(container.querySelector("img")).toHaveAttribute("src", KOP_FOTO.uitslagen.src);
    expect(credit()).toHaveAttribute("href", TIMSIMAGING.url);
    // Donkere foto: de kop krijgt de nachtkleuren.
    expect(container.querySelector(".mm-balk-foto")).not.toBeNull();
  });

  it("een lichte foto houdt de inkt van het thema", () => {
    const { container } = render(
      <KopOpFoto foto={KOP_FOTO.peloton}>
        <h1>Mijn Peloton</h1>
      </KopOpFoto>,
    );
    expect(container.querySelector("[data-licht]")).not.toBeNull();
    expect(container.querySelector(".mm-balk-foto")).toBeNull();
    expect(credit()).not.toBeNull();
  });
});
