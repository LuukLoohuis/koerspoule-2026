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
  selectedGame: { id: "giro-2026", game_type: "giro", theme: "roze" } as {
    id: string;
    game_type: string;
    theme: string | null;
  } | null,
  games: [
    { id: "vuelta-2026", game_type: "vuelta", theme: "rood", status: "live", year: 2026 },
    { id: "giro-2026", game_type: "giro", theme: "roze", status: "finished", year: 2026 },
  ],
  loading: false,
}));

vi.mock("@/context/SelectedGameContext", () => ({
  useSelectedGame: () => ({
    selectedGame: selectedGameState.selectedGame,
    games: selectedGameState.games,
    loading: selectedGameState.loading,
  }),
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
    selectedGameState.selectedGame = { id: "giro-2026", game_type: "giro", theme: "roze" };
    selectedGameState.games = [
      { id: "vuelta-2026", game_type: "vuelta", theme: "rood", status: "live", year: 2026 },
      { id: "giro-2026", game_type: "giro", theme: "roze", status: "finished", year: 2026 },
    ];
    document.head.innerHTML = '<link rel="icon" href="/favicon.png">';
  });

  it("laat de admin-status het thema bepalen en negeert de aangeklikte game", () => {
    const { rerender } = render(
      <ThemaProvider>
        <BrandingProbe />
      </ThemaProvider>,
    );

    expect(screen.getByTestId("theme-key")).toHaveTextContent("rood");
    expect(screen.getByTestId("logo")).toHaveAttribute("src", "/koerspoule-vuelta.svg");
    expect(document.querySelector('link[rel="icon"]')).toHaveAttribute("href", "/favicon-vuelta.svg");

    selectedGameState.selectedGame = { id: "giro-2026", game_type: "giro", theme: "roze" };
    rerender(
      <ThemaProvider>
        <BrandingProbe />
      </ThemaProvider>,
    );

    expect(screen.getByTestId("theme-key")).toHaveTextContent("rood");
    expect(screen.getByTestId("logo")).toHaveAttribute("src", "/koerspoule-vuelta.svg");

    selectedGameState.games = [
      { id: "vuelta-2026", game_type: "vuelta", theme: "rood", status: "finished", year: 2026 },
      { id: "giro-2026", game_type: "giro", theme: "roze", status: "open_inschrijving", year: 2026 },
    ];
    rerender(
      <ThemaProvider>
        <BrandingProbe />
      </ThemaProvider>,
    );

    expect(screen.getByTestId("theme-key")).toHaveTextContent("roze");
    expect(screen.getByTestId("logo")).toHaveAttribute("src", "/koerspoule-giro.svg");
    expect(document.querySelector('link[rel="icon"]')).toHaveAttribute("href", "/favicon-giro.svg");
  });

  it("activeert winterbranding alleen als Meermarathon exact live staat", () => {
    selectedGameState.games = [
      { id: "marathon-2026", game_type: "meermarathon", theme: "winter", status: "open", year: 2026 },
    ];

    const { rerender } = render(
      <ThemaProvider>
        <BrandingProbe />
      </ThemaProvider>,
    );

    expect(screen.getByTestId("theme-key")).toHaveTextContent("roze");
    expect(screen.getByTestId("logo")).toHaveAttribute("src", "/koerspoule-giro.svg");

    selectedGameState.games = [
      { id: "marathon-2026", game_type: "meermarathon", theme: "winter", status: "live", year: 2026 },
    ];
    rerender(
      <ThemaProvider>
        <BrandingProbe />
      </ThemaProvider>,
    );

    expect(screen.getByTestId("theme-key")).toHaveTextContent("winter");
    expect(screen.getByTestId("logo")).toHaveAttribute("src", "/koerspoule-meermarathon.svg");
    expect(document.querySelector('link[rel="icon"]')).toHaveAttribute("href", "/favicon-meermarathon.svg");
    expect(storage.has("koerspoule:themaKey")).toBe(false);
    expect(storage.has("koerspoule:themaTokens")).toBe(false);

    selectedGameState.games = [
      { id: "marathon-2026", game_type: "meermarathon", theme: "winter", status: "locked", year: 2026 },
    ];
    rerender(
      <ThemaProvider>
        <BrandingProbe />
      </ThemaProvider>,
    );

    expect(screen.getByTestId("theme-key")).toHaveTextContent("roze");
  });
});
