// De schaatsfoto's van de Meermarathon: achter de uitslagenbalk het peloton
// dat je bekijkt, achter de kop van een pagina het natuurijs. Op elke foto van
// Timsimaging staat haar naam.
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import KopOpFoto from "./KopOpFoto";
import WedstrijdBalk from "./WedstrijdBalk";
import { bouwWedstrijdBalk } from "@/lib/meermarathonBalk";
import { BALK_FOTO, KOP_FOTO, TIMSIMAGING } from "@/lib/meermarathonFotos";
import type { MeermarathonCategorie } from "@/lib/gameTypes";

const { wedstrijden, totaal } = bouwWedstrijdBalk(
  [{ id: "w1", stage_number: 1, date: "2026-10-31", is_gc: false, results_status: "approved", wedstrijd_type: "cup", ijs_type: "kunstijs" }],
  new Map([["w1", 54]]),
  { heeftPloeg: true },
);

function toonBalk(peloton: MeermarathonCategorie | null) {
  const { container } = render(
    <WedstrijdBalk wedstrijden={wedstrijden} totaal={totaal} gekozenId="w1" onKies={() => {}} peloton={peloton} />,
  );
  return container.querySelector("img");
}

const credit = () => screen.queryByRole("link", { name: /^Foto: Timsimaging/ });

describe("WedstrijdBalk › foto", () => {
  it.each(["vrouwen", "mannen"] as const)("bij de %s staat hun eigen peloton achter de balken, met de naam van de fotograaf", (peloton) => {
    expect(toonBalk(peloton)).toHaveAttribute("src", BALK_FOTO[peloton].src);
    expect(credit()).toHaveAttribute("href", TIMSIMAGING.url);
    expect(credit()).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("vrouwen en mannen hebben elk een andere foto", () => {
    expect(BALK_FOTO.vrouwen.src).not.toBe(BALK_FOTO.mannen.src);
  });

  it("een game zonder peloton houdt de overzichtsfoto, zonder naam van Timsimaging", () => {
    const foto = toonBalk(null);
    expect(foto).not.toBeNull();
    expect(foto).not.toHaveAttribute("src", BALK_FOTO.vrouwen.src);
    expect(foto).not.toHaveAttribute("src", BALK_FOTO.mannen.src);
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
