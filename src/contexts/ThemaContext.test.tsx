import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import KoerspouleLogo from "@/components/KoerspouleLogo";
import { ThemaProvider, useThema } from "@/contexts/ThemaContext";

const storage = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  },
});

const selectedGameState = vi.hoisted(() => ({
  game: { id: "giro-2026", game_type: "giro", theme: "roze" } as {
    id: string;
    game_type: string;
    theme: string | null;
  } | null,
  loading: false,
}));

vi.mock("@/context/SelectedGameContext", () => ({
  useSelectedGame: () => ({ selectedGame: selectedGameState.game, loading: selectedGameState.loading }),
}));

function BrandingProbe() {
  const { key } = useThema();
  return (
    <>
      <span data-testid="theme-key">{key}</span>
      <KoerspouleLogo data-testid="logo" />
    </>
  );
}

describe("ThemaProvider + KoerspouleLogo", () => {
  beforeEach(() => {
    storage.clear();
    selectedGameState.game = { id: "giro-2026", game_type: "giro", theme: "roze" };
    document.head.innerHTML = '<link rel="icon" href="/favicon.png">';
  });

  it("wisselt thema, zichtbaar logo en favicon direct mee met de geselecteerde game", () => {
    const { rerender } = render(
      <ThemaProvider>
        <BrandingProbe />
      </ThemaProvider>,
    );

    expect(screen.getByTestId("theme-key")).toHaveTextContent("roze");
    expect(screen.getByTestId("logo")).toHaveAttribute("src", "/koerspoule-giro.svg");

    selectedGameState.game = { id: "vuelta-2026", game_type: "vuelta", theme: "rood" };
    rerender(
      <ThemaProvider>
        <BrandingProbe />
      </ThemaProvider>,
    );

    expect(screen.getByTestId("theme-key")).toHaveTextContent("rood");
    expect(screen.getByTestId("logo")).toHaveAttribute("src", "/koerspoule-vuelta.svg");
    expect(document.querySelector('link[rel="icon"]')).toHaveAttribute("href", "/favicon-vuelta.svg");
  });
});
