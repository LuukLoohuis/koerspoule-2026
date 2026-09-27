// Eén game, twee pelotons. Wie nog nergens een ploeg heeft, kiest eerst waar
// hij meerijdt; pas daarna start de bouwer. Dat is geen opmaakkwestie: de
// bouwer maakt bij het openen een entry aan, dus hij mag nooit starten voor
// een peloton dat je niet koos.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PloegSamenstellenContainer from "./PloegSamenstellenContainer";
import { deelnameSleutel } from "@/lib/meermarathonDeelname";
import { bouwGameStatus, type MeermarathonGameStatus, type MmEntry } from "@/lib/meermarathonSeizoen";
import type { Game } from "@/hooks/useCurrentGame";

const staat = vi.hoisted(() => ({
  auth: { user: { id: "u1" } as { id: string } | null, role: "user", loading: false },
  gekozenId: "v" as string | null,
  statussen: [] as unknown[],
  seizoenLaadt: false,
  entry: null as { id: string; status: string } | null,
  kiesGame: vi.fn(),
  useEntry: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => staat.auth }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/posthog", () => ({ captureEvent: vi.fn(), captureException: vi.fn() }));
vi.mock("@/hooks/useCategories", () => ({ useCategories: () => ({ data: [], isLoading: false, isError: false }) }));
vi.mock("@/hooks/useStartlist", () => ({ useStartlist: () => ({ data: [], isLoading: false }) }));
vi.mock("@/hooks/useJokerMultiplier", () => ({ useJokerMultiplier: () => 2 }));
vi.mock("@/components/meermarathon/Pelotonbalk", () => ({ default: () => <div data-testid="pelotonbalk" /> }));
vi.mock("@/context/SelectedGameContext", () => ({
  useSelectedGame: () => ({
    selectedGameId: staat.gekozenId,
    selectedGame: GAMES.find((g) => g.id === staat.gekozenId) ?? null,
    setSelectedGameId: staat.kiesGame,
    games: GAMES,
    loading: false,
  }),
}));
vi.mock("@/hooks/useMeermarathonSeizoen", () => ({
  useMeermarathonSeizoen: () => ({
    seizoen: GAMES,
    statussen: staat.statussen,
    isLoading: staat.seizoenLaadt,
    error: null,
  }),
}));
vi.mock("@/hooks/useEntry", () => ({
  entryErrorMessage: () => "fout",
  useEntry: (gameId: string) => {
    staat.useEntry(gameId);
    const mutatie = { mutateAsync: vi.fn(), isPending: false };
    return {
      entry: staat.entry,
      isLoading: false,
      isError: false,
      picksByCategory: new Map(),
      jokerIds: [],
      predictions: [],
      teamName: "",
      savePick: mutatie,
      togglePick: mutatie,
      saveJoker: mutatie,
      savePredictions: mutatie,
      saveTeamName: mutatie,
      submitEntry: mutatie,
      revertEntry: mutatie,
    };
  },
}));

const game = (id: "v" | "m", status: Game["status"] = "open_inschrijving"): Game => ({
  id,
  name: `Meermarathon ${id}`,
  year: 2026,
  status,
  game_type: "meermarathon",
  categorie: id === "v" ? "vrouwen" : "mannen",
});
const GAMES = [game("v"), game("m")];

const peloton = (id: "v" | "m", entry: MmEntry | null = null): MeermarathonGameStatus =>
  bouwGameStatus({
    game: {
      id,
      name: `Meermarathon ${id}`,
      year: 2026,
      status: "open_inschrijving",
      game_type: "meermarathon",
      categorie: id === "v" ? "vrouwen" : "mannen",
      registration_closes_at: null,
    },
    entry,
    vereist: 5,
    wedstrijden: [],
    klassement: null,
    puntenPerWedstrijd: new Map(),
    vandaag: "2026-10-01",
  });

const ingediend: MmEntry = { id: "e-v", status: "submitted", teamName: "X", picks: 5 };
const half: MmEntry = { id: "e-v", status: "draft", teamName: null, picks: 3 };
const SLEUTEL = deelnameSleutel("u1", 2026);

function toon(huidig: "v" | "m" = "v") {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <PloegSamenstellenContainer game={game(huidig)} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  staat.auth = { user: { id: "u1" }, role: "user", loading: false };
  staat.gekozenId = "v";
  staat.statussen = [peloton("v"), peloton("m")];
  staat.seizoenLaadt = false;
  staat.entry = null;
  staat.kiesGame.mockClear();
  staat.useEntry.mockClear();
});

describe("waar rijd je mee", () => {
  it("vraagt het eerst, en start de bouwer nog niet", () => {
    toon();
    expect(screen.getByRole("heading", { name: "Waar rijd je mee?" })).toBeInTheDocument();
    expect(staat.useEntry).not.toHaveBeenCalled();
    expect(screen.queryByTestId("pelotonbalk")).not.toBeInTheDocument();
  });

  it("wacht tot bekend is of je al een ploeg hebt", () => {
    staat.seizoenLaadt = true;
    staat.statussen = [];
    toon();
    expect(screen.queryByRole("heading", { name: "Waar rijd je mee?" })).not.toBeInTheDocument();
    expect(staat.useEntry).not.toHaveBeenCalled();
  });

  it("bewaart de keuze en start daarna de bouwer", () => {
    toon();
    fireEvent.click(screen.getByRole("button", { name: "Stel je ploegen samen" }));
    expect(JSON.parse(window.localStorage.getItem(SLEUTEL) ?? "null")).toEqual(["v", "m"]);
    expect(screen.getByRole("heading", { name: "Stel je ploeg samen" })).toBeInTheDocument();
    expect(staat.useEntry).toHaveBeenCalledWith("v");
    expect(staat.kiesGame).not.toHaveBeenCalled();
  });

  it("start geen bouwer voor een peloton dat je niet koos", () => {
    toon("v");
    fireEvent.click(screen.getByRole("button", { name: /^Vrouwen/ }));
    fireEvent.click(screen.getByRole("button", { name: "Stel je mannenploeg samen" }));
    expect(JSON.parse(window.localStorage.getItem(SLEUTEL) ?? "null")).toEqual(["m"]);
    expect(staat.kiesGame).toHaveBeenCalledWith("m");
    // De game wisselt nog: tot die tijd geen entry bij de vrouwen.
    expect(staat.useEntry).not.toHaveBeenCalled();
  });

  it("slaat de vraag over voor wie al een ploeg heeft", () => {
    staat.statussen = [peloton("v", half), peloton("m")];
    toon();
    expect(screen.queryByRole("heading", { name: "Waar rijd je mee?" })).not.toBeInTheDocument();
    expect(staat.useEntry).toHaveBeenCalledWith("v");
  });

  it("slaat de vraag over voor wie al koos", () => {
    window.localStorage.setItem(SLEUTEL, JSON.stringify(["v"]));
    toon();
    expect(screen.queryByRole("heading", { name: "Waar rijd je mee?" })).not.toBeInTheDocument();
    expect(staat.useEntry).toHaveBeenCalledWith("v");
  });

  it("neemt de keuze van een gast mee na het inloggen", () => {
    window.localStorage.setItem(deelnameSleutel(null, 2026), JSON.stringify(["m"]));
    staat.gekozenId = "m";
    toon("m");
    expect(screen.queryByRole("heading", { name: "Waar rijd je mee?" })).not.toBeInTheDocument();
    expect(staat.useEntry).toHaveBeenCalledWith("m");
  });
});

describe("na het bevestigen", () => {
  it("wijst door naar het andere peloton dat je ook koos", () => {
    window.localStorage.setItem(SLEUTEL, JSON.stringify(["v", "m"]));
    staat.statussen = [peloton("v", ingediend), peloton("m")];
    staat.entry = { id: "e-v", status: "submitted" };
    toon();
    // Mobiel en desktop hebben elk hun eigen knop.
    const knoppen = screen.getAllByRole("button", { name: "Nu de mannen" });
    expect(knoppen.length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: "Naar je Volgwagen" })).not.toBeInTheDocument();
    fireEvent.click(knoppen[0]);
    expect(staat.kiesGame).toHaveBeenCalledWith("m");
  });

  it("stuurt naar de Volgwagen als er niets meer openstaat", () => {
    window.localStorage.setItem(SLEUTEL, JSON.stringify(["v"]));
    staat.statussen = [peloton("v", ingediend), peloton("m")];
    staat.entry = { id: "e-v", status: "submitted" };
    toon();
    expect(screen.queryByRole("button", { name: "Nu de mannen" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Naar je Volgwagen" }).length).toBeGreaterThan(0);
  });
});
