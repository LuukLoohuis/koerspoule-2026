// Eén ploegbouwer voor elke game. De Meermarathon wijkt op twee punten af: geen
// jokers, en de pronostiek is de eindwinnaar van het Cup- en van het Grand
// Prix-klassement. Vrouwen en mannen zijn twee pelotons van één game; de
// pelotonbalk kiest voor welk peloton je bouwt.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@/i18n";
import TeamBuilder from "./TeamBuilder";
import type { Game } from "@/hooks/useCurrentGame";

const staat = vi.hoisted(() => ({
  huidig: null as unknown,
  gekozenId: null as string | null,
  gekozen: null as unknown,
  kiesGame: vi.fn(),
  useEntry: vi.fn(),
  predictions: [] as { classification: string; position: number; rider_id: string }[],
  picks: [] as [string, string[]][],
  savePredictions: vi.fn(async () => undefined),
  saveJoker: vi.fn(async () => undefined),
  submit: vi.fn(async () => undefined),
  categorieen: [
    {
      id: "c1",
      name: "Toppers",
      short_name: null,
      sort_order: 1,
      max_picks: 1,
      game_id: "g",
      category_riders: [
        { rider_id: "r1", riders: { id: "r1", name: "Rijder Een", start_number: 1, team_id: "t1", firstcycling_id: null } },
      ],
    },
  ],
  startlijst: [
    {
      id: "t1",
      name: "Team Zaanlander",
      short_name: "ZAA",
      jersey_url: null,
      riders: [
        { id: "r1", name: "Rijder Een", start_number: 1, is_youth_eligible: false },
        { id: "r2", name: "Rijder Twee", start_number: 2, is_youth_eligible: false },
      ],
    },
  ],
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1" }, session: null, role: "user", loading: false }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/posthog", () => ({ captureEvent: vi.fn(), captureException: vi.fn() }));
vi.mock("@/hooks/useProfile", () => ({ useProfile: () => ({ data: null }) }));
vi.mock("@/components/meermarathon/Pelotonbalk", () => ({ default: () => <div data-testid="pelotonbalk" /> }));
vi.mock("@/hooks/useCurrentGame", () => ({ useCurrentGame: () => ({ data: staat.huidig, isLoading: false }) }));
vi.mock("@/context/SelectedGameContext", () => ({
  useSelectedGame: () => ({
    selectedGameId: staat.gekozenId,
    selectedGame: staat.gekozen,
    setSelectedGameId: staat.kiesGame,
    games: [],
    loading: false,
  }),
}));
vi.mock("@/hooks/useCategories", () => ({
  useCategories: (gameId?: string) => ({ data: gameId ? staat.categorieen : [], isLoading: false }),
}));
vi.mock("@/hooks/useStartlist", () => ({ useStartlist: () => ({ data: staat.startlijst, isLoading: false }) }));
vi.mock("@/hooks/useEntry", () => ({
  entryErrorMessage: () => "fout",
  useEntry: (gameId?: string) => {
    staat.useEntry(gameId);
    const mutatie = { mutate: vi.fn(), mutateAsync: vi.fn(async () => undefined), isPending: false };
    return {
      entry: gameId ? { id: `e-${gameId}`, status: "draft" } : undefined,
      isLoading: false,
      picksByCategory: new Map(staat.picks),
      jokerIds: [],
      predictions: staat.predictions,
      togglePick: mutatie,
      saveJoker: { ...mutatie, mutateAsync: staat.saveJoker },
      savePredictions: { ...mutatie, mutateAsync: staat.savePredictions },
      submitEntry: { ...mutatie, mutateAsync: staat.submit },
      revertEntry: mutatie,
    };
  },
}));

const peloton = (id: "v" | "m", status: Game["status"] = "open_inschrijving"): Game => ({
  id,
  name: "Meermarathon 2026",
  year: 2026,
  status,
  game_type: "meermarathon",
  categorie: id === "v" ? "vrouwen" : "mannen",
});

const tour: Game = { id: "t", name: "Tour de France 2026", year: 2026, status: "open_inschrijving", game_type: "tour" };

function toon() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <TeamBuilder />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  staat.huidig = peloton("v");
  staat.gekozenId = null;
  staat.gekozen = peloton("v");
  staat.predictions = [];
  staat.picks = [];
  staat.kiesGame.mockReset();
  staat.useEntry.mockReset();
  staat.savePredictions.mockClear();
  staat.saveJoker.mockClear();
  staat.submit.mockClear();
});

describe("TeamBuilder bij de Meermarathon", () => {
  it("heeft geen jokers en voorspelt de eindwinnaars van Cup en Grand Prix", () => {
    toon();
    expect(screen.getByTestId("pelotonbalk")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "De Ploegleiderswagen" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Jokers" })).toBeNull();
    expect(screen.queryByText(/jokers? aanduiden/)).toBeNull();
    expect(screen.getByText("Cup-klassement")).toBeInTheDocument();
    expect(screen.getByText("Grand Prix-klassement")).toBeInTheDocument();
    expect(screen.queryByText("— Eindklassement Podium —")).toBeNull();
    expect(screen.queryByText("Maillot à pois")).toBeNull();
    // Nog te doen, in schaatswoorden.
    expect(screen.getAllByText("Nog 1 rijder kiezen in je categorieën").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Eindwinnaars voorspellen — Cup & Grand Prix (0/2)").length).toBeGreaterThan(0);
  });

  it("bewaart de pronostiek als cup en grandprix bij het indienen", async () => {
    staat.picks = [["c1", ["r1"]]];
    staat.predictions = [
      { classification: "cup", position: 1, rider_id: "r1" },
      { classification: "grandprix", position: 1, rider_id: "r2" },
    ];
    toon();
    // De ploeg is compleet zonder jokers: niets meer te doen.
    expect(screen.queryByText(/Eindwinnaars voorspellen/)).toBeNull();
    fireEvent.click(screen.getAllByRole("button", { name: "✅ Team definitief indienen" })[0]);
    await waitFor(() => expect(staat.submit).toHaveBeenCalledWith({ entryId: "e-v" }));
    expect(staat.savePredictions).toHaveBeenCalledWith({
      entryId: "e-v",
      predictions: [
        { classification: "cup", position: 1, rider_id: "r1" },
        { classification: "grandprix", position: 1, rider_id: "r2" },
      ],
    });
    expect(staat.saveJoker).not.toHaveBeenCalled();
  });

  it("toont het zelf gekozen peloton, ook als daar de inschrijving nog niet open is", () => {
    staat.gekozenId = "m";
    staat.gekozen = peloton("m", "open");
    toon();
    expect(staat.useEntry).toHaveBeenCalledWith("m");
    expect(staat.useEntry).not.toHaveBeenCalledWith("v");
    expect(screen.getByText("Meermarathon · Mannen")).toBeInTheDocument();
    expect(screen.getByText("Inschrijving nog gesloten")).toBeInTheDocument();
  });

  it("zet de keuze op het peloton waarvoor je inschrijft als er een andere koers gekozen staat", () => {
    staat.gekozenId = "t";
    staat.gekozen = tour;
    toon();
    expect(staat.kiesGame).toHaveBeenCalledWith("v");
  });
});

describe("TeamBuilder bij een wielergame", () => {
  it("houdt jokers, podium en truien", () => {
    staat.huidig = tour;
    staat.gekozen = tour;
    toon();
    expect(screen.getByRole("heading", { name: "Jokers" })).toBeInTheDocument();
    expect(screen.getByText("— Eindklassement Podium —")).toBeInTheDocument();
    expect(screen.getByText("Maillot à pois")).toBeInTheDocument();
    expect(screen.queryByText("Cup-klassement")).toBeNull();
    expect(staat.kiesGame).not.toHaveBeenCalled();
  });

  it("toont geen pelotonbalk, ook niet als er een Meermarathon gekozen staat", () => {
    staat.huidig = tour;
    staat.gekozenId = "v";
    staat.gekozen = peloton("v", "open");
    toon();
    expect(screen.queryByTestId("pelotonbalk")).toBeNull();
    expect(staat.useEntry).toHaveBeenCalledWith("t");
    expect(staat.useEntry).not.toHaveBeenCalledWith("v");
  });
});
