import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

const authState = vi.hoisted(() => ({ role: "user" as "user" | "admin" }));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: null, session: null, loading: false, role: authState.role }),
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
    sessionStorage.clear();
    authState.role = "user";
    selectedGameState.selectedGame = { id: "giro-2026", game_type: "giro", theme: "roze" };
    selectedGameState.games = [
      { id: "vuelta-2026", game_type: "vuelta", theme: "rood", status: "live", year: 2026 },
      { id: "giro-2026", game_type: "giro", theme: "roze", status: "finished", year: 2026 },
    ];
    selectedGameState.loading = false;
    document.documentElement.removeAttribute("style");
    document.head.innerHTML = '<link rel="icon" href="/favicon.png"><meta name="theme-color" content="#FAF9F7">';
  });

  it("laat de admin-status het thema bepalen en negeert de aangeklikte game", () => {
    const { rerender } = render(
      <ThemaProvider>
        <BrandingProbe />
      </ThemaProvider>,
    );

    expect(screen.getByTestId("theme-key")).toHaveTextContent("rood");
    expect(screen.getByTestId("logo")).toHaveAttribute("src", "/koerspoule-vuelta.png");
    expect(document.querySelector('link[rel="icon"]')).toHaveAttribute("href", "/favicon-vuelta.svg");

    selectedGameState.selectedGame = { id: "giro-2026", game_type: "giro", theme: "roze" };
    rerender(
      <ThemaProvider>
        <BrandingProbe />
      </ThemaProvider>,
    );

    expect(screen.getByTestId("theme-key")).toHaveTextContent("rood");
    expect(screen.getByTestId("logo")).toHaveAttribute("src", "/koerspoule-vuelta.png");

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

  it("activeert winterbranding vanaf de inschrijving tot en met de livefase", () => {
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
    expect(screen.getByTestId("logo")).toHaveAttribute("src", "/koerspoule-meermarathon.png");
    expect(document.querySelector('link[rel="icon"]')).toHaveAttribute("href", "/favicon-meermarathon.svg");
    // De key gaat de cache in (anders flitst roze bij elk bezoek); tokens niet,
    // want winter haalt zijn kleuren uit de CSS.
    expect(storage.get("koerspoule:themaKey")).toBe("winter");
    expect(storage.has("koerspoule:themaTokens")).toBe(false);

    // Tijdens de inschrijving is de site al winters, en locked werkt als live.
    for (const status of ["open_inschrijving", "locked"]) {
      selectedGameState.games = [
        { id: "marathon-2026", game_type: "meermarathon", theme: "winter", status, year: 2026 },
      ];
      rerender(
        <ThemaProvider>
          <BrandingProbe />
        </ThemaProvider>,
      );
      expect(screen.getByTestId("theme-key")).toHaveTextContent("winter");
    }

    // Afgerond: terug naar het neutrale thema.
    selectedGameState.games = [
      { id: "marathon-2026", game_type: "meermarathon", theme: "winter", status: "finished", year: 2026 },
    ];
    rerender(
      <ThemaProvider>
        <BrandingProbe />
      </ThemaProvider>,
    );

    expect(screen.getByTestId("theme-key")).toHaveTextContent("roze");
  });

  it("toont tijdens het laden het thema uit de cache, ook winter, en anders geen logo", () => {
    selectedGameState.loading = true;
    selectedGameState.games = [];

    // Eerste bezoek: thema onbekend → geen Giro-logo van de terugval-key.
    const eerste = render(
      <ThemaProvider>
        <BrandingProbe />
      </ThemaProvider>,
    );
    expect(document.documentElement).toHaveAttribute("data-thema", "loading");
    expect(screen.getByTestId("logo")).not.toBeVisible();
    eerste.unmount();

    // Terugkerende bezoeker in de winter: meteen winters, zonder fetch.
    storage.set("koerspoule:themaKey", "winter");
    render(
      <ThemaProvider>
        <BrandingProbe />
      </ThemaProvider>,
    );
    expect(screen.getByTestId("theme-key")).toHaveTextContent("winter");
    expect(screen.getByTestId("logo")).toBeVisible();
    expect(screen.getByTestId("logo")).toHaveAttribute("src", "/koerspoule-meermarathon.png");
    expect(document.documentElement).toHaveAttribute("data-thema", "winter");
  });

  it("laat op een geprerenderde pagina staan wat het no-flash-script zette tot de cache gelezen is", async () => {
    selectedGameState.loading = true;
    selectedGameState.games = [];
    storage.set("koerspoule:themaKey", "winter");
    storage.set("koerspoule:modus", "nacht");
    const root = document.documentElement;
    // Wat index.html vóór de eerste paint doet.
    root.setAttribute("data-thema", "winter");
    root.setAttribute("data-modus", "nacht");
    // Geprerenderde HTML in #root → de provider start "onbekend", net als de server.
    const schil = document.createElement("div");
    schil.id = "root";
    schil.innerHTML = "<p>prerender</p>";
    document.body.appendChild(schil);
    const zet = vi.spyOn(root, "setAttribute");
    const wis = vi.spyOn(root, "removeAttribute");

    try {
      render(
        <ThemaProvider>
          <BrandingProbe />
        </ThemaProvider>,
      );
      await waitFor(() => expect(screen.getByTestId("theme-key")).toHaveTextContent("winter"));
      expect(screen.getByTestId("logo")).toHaveAttribute("src", "/koerspoule-meermarathon.png");
      expect(zet).not.toHaveBeenCalledWith("data-thema", "loading");
      expect(wis).not.toHaveBeenCalledWith("data-modus");
      expect(root).toHaveAttribute("data-modus", "nacht");
    } finally {
      zet.mockRestore();
      wis.mockRestore();
      schil.remove();
      root.removeAttribute("data-modus");
    }
  });

  it("laat de browserbalk de koptekstkleur volgen en bewaart die voor het no-flash-script", () => {
    // Via een stylesheet, zoals in de app: inline --card haalt de provider weg.
    document.head.insertAdjacentHTML("beforeend", "<style>:root { --card: 218 42% 14%; }</style>");
    render(
      <ThemaProvider>
        <BrandingProbe />
      </ThemaProvider>,
    );
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute("content", "hsl(218, 42%, 14%)");
    expect(storage.get("koerspoule:themeColor")).toBe("hsl(218, 42%, 14%)");
  });

  it("laat een admin het thema forceren via preview, los van de live-status; niet-admins mogen dit niet", () => {
    function PreviewProbe() {
      const { key, canPreview, previewKey, setPreviewKey } = useThema();
      return (
        <>
          <span data-testid="theme-key">{key}</span>
          <span data-testid="can-preview">{String(canPreview)}</span>
          <span data-testid="preview-key">{previewKey ?? ""}</span>
          <button onClick={() => setPreviewKey("winter")}>preview-winter</button>
          <button onClick={() => setPreviewKey(null)}>preview-uit</button>
        </>
      );
    }

    // Vuelta staat live → normaal gesproken "rood", ongeacht de klik van een
    // niet-admin op de (niet-gerenderde) preview-knop.
    authState.role = "user";
    const { rerender, getByText } = render(
      <ThemaProvider>
        <PreviewProbe />
      </ThemaProvider>,
    );
    expect(screen.getByTestId("can-preview")).toHaveTextContent("false");
    fireEvent.click(getByText("preview-winter"));
    rerender(
      <ThemaProvider>
        <PreviewProbe />
      </ThemaProvider>,
    );
    expect(screen.getByTestId("theme-key")).toHaveTextContent("rood");

    // Als admin overschrijft de preview-keuze het live-thema.
    authState.role = "admin";
    rerender(
      <ThemaProvider>
        <PreviewProbe />
      </ThemaProvider>,
    );
    expect(screen.getByTestId("can-preview")).toHaveTextContent("true");
    fireEvent.click(getByText("preview-winter"));
    rerender(
      <ThemaProvider>
        <PreviewProbe />
      </ThemaProvider>,
    );
    expect(screen.getByTestId("theme-key")).toHaveTextContent("winter");
    // Preview mag nooit de gedeelde no-flash-cache vervuilen — die blijft op
    // het echte live-thema (rood) staan, niet op de preview (winter).
    expect(storage.get("koerspoule:themaKey")).toBe("rood");

    fireEvent.click(getByText("preview-uit"));
    rerender(
      <ThemaProvider>
        <PreviewProbe />
      </ThemaProvider>,
    );
    expect(screen.getByTestId("theme-key")).toHaveTextContent("rood");
  });

  it("laat de wintertokens aan de CSS over en kent alleen in winter een nachtmodus", () => {
    storage.set("koerspoule:modus", "nacht");
    const root = document.documentElement;
    root.style.setProperty("--primary", "340 80% 50%"); // restant van een eerder koersthema
    selectedGameState.games = [
      { id: "marathon-2026", game_type: "meermarathon", theme: "winter", status: "live", year: 2026 },
    ];

    function ModusProbe() {
      const { modus, setModus } = useThema();
      return <button onClick={() => setModus(modus === "nacht" ? "licht" : "nacht")}>{modus}</button>;
    }
    const { rerender } = render(
      <ThemaProvider>
        <ModusProbe />
      </ThemaProvider>,
    );

    // Inline zou van meermarathon-thema.css winnen, en de nacht onmogelijk maken.
    expect(root.style.getPropertyValue("--primary")).toBe("");
    expect(root.style.getPropertyValue("--background")).toBe("");
    expect(root).toHaveAttribute("data-modus", "nacht");

    fireEvent.click(screen.getByRole("button", { name: "nacht" }));
    expect(root).not.toHaveAttribute("data-modus");
    expect(storage.has("koerspoule:modus")).toBe(false);

    // Buiten winter nooit nacht, ook niet als de speler hem ooit aanzette.
    storage.set("koerspoule:modus", "nacht");
    selectedGameState.games = [
      { id: "vuelta-2026", game_type: "vuelta", theme: "rood", status: "live", year: 2026 },
    ];
    rerender(
      <ThemaProvider key="opnieuw">
        <ModusProbe />
      </ThemaProvider>,
    );
    expect(root).not.toHaveAttribute("data-modus");
    expect(root.style.getPropertyValue("--primary")).not.toBe("");
  });
});
