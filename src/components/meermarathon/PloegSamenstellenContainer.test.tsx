// Eén game, twee pelotons op één scherm. Meedoen bij allebei mag, maar hoeft
// niet. Dat is geen opmaakkwestie: useEntry maakt bij het openen een entry
// aan, dus de data van een peloton mag pas draaien als je daar meerijdt.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PloegSamenstellenContainer from "./PloegSamenstellenContainer";
import { deelnameSleutel } from "@/lib/meermarathonDeelname";
import { bouwGameStatus, type MeermarathonGameStatus, type MmEntry } from "@/lib/meermarathonSeizoen";
import type { Game } from "@/hooks/useCurrentGame";

type Cat = {
  id: string;
  name: string;
  max_picks: number;
  category_riders: { rider_id: string; riders: { id: string; name: string; start_number: number | null; team_id: string | null } }[];
};

const staat = vi.hoisted(() => ({
  auth: { user: { id: "u1" } as { id: string } | null, role: "user", loading: false },
  gekozenId: "v" as string | null,
  games: [] as unknown[],
  statussen: [] as unknown[],
  seizoenLaadt: false,
  entries: {} as Record<string, { id: string; status: string } | null>,
  picks: {} as Record<string, [string, string[]][]>,
  cats: {} as Record<string, unknown[]>,
  kiesGame: vi.fn(),
  useEntry: vi.fn(),
  submit: vi.fn(),
  startlijst: [] as { id: string; name: string; riders: { id: string; name: string; start_number: number | null }[] }[],
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => staat.auth }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/posthog", () => ({ captureEvent: vi.fn(), captureException: vi.fn() }));
vi.mock("@/hooks/useCategories", () => ({
  useCategories: (gameId?: string) => ({ data: gameId ? (staat.cats[gameId] ?? []) : [], isLoading: false, isError: false }),
}));
vi.mock("@/hooks/useStartlist", () => ({ useStartlist: () => ({ data: staat.startlijst, isLoading: false }) }));
vi.mock("@/components/meermarathon/Pelotonbalk", () => ({ default: () => <div data-testid="pelotonbalk" /> }));
vi.mock("@/context/SelectedGameContext", () => ({
  useSelectedGame: () => ({
    selectedGameId: staat.gekozenId,
    selectedGame: (staat.games as Game[]).find((g) => g.id === staat.gekozenId) ?? null,
    setSelectedGameId: staat.kiesGame,
    games: staat.games,
    loading: false,
  }),
}));
vi.mock("@/hooks/useMeermarathonSeizoen", () => ({
  useMeermarathonSeizoen: () => ({
    seizoen: staat.games,
    statussen: staat.statussen,
    isLoading: staat.seizoenLaadt,
    error: null,
  }),
}));
vi.mock("@/hooks/useEntry", () => ({
  entryErrorMessage: () => "fout",
  useEntry: (gameId?: string) => {
    staat.useEntry(gameId);
    const mutatie = { mutateAsync: vi.fn(async () => undefined), isPending: false };
    return {
      entry: gameId ? (staat.entries[gameId] ?? null) : null,
      isLoading: false,
      isError: false,
      picksByCategory: new Map(gameId ? (staat.picks[gameId] ?? []) : []),
      predictions: [],
      teamName: "",
      savePick: mutatie,
      togglePick: mutatie,
      savePredictions: mutatie,
      saveTeamName: mutatie,
      submitEntry: { mutateAsync: staat.submit, isPending: false },
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

const peloton = (id: "v" | "m", entry: MmEntry | null = null, status = "open_inschrijving"): MeermarathonGameStatus =>
  bouwGameStatus({
    game: {
      id,
      name: `Meermarathon ${id}`,
      year: 2026,
      status,
      game_type: "meermarathon",
      categorie: id === "v" ? "vrouwen" : "mannen",
      registration_closes_at: null,
    },
    entry,
    vereist: 1,
    wedstrijden: [],
    klassement: null,
    puntenPerWedstrijd: new Map(),
    vandaag: "2026-10-01",
  });

/** Eén categorie met één rijder: kies je die, dan is de ploeg compleet. */
const categorie = (id: "v" | "m"): Cat => ({
  id: `c-${id}`,
  name: "Toppers",
  max_picks: 1,
  category_riders: [{ rider_id: `r-${id}`, riders: { id: `r-${id}`, name: `Rijder ${id}`, start_number: 1, team_id: null } }],
});

const ingediend: MmEntry = { id: "e-v", status: "submitted", teamName: "X", picks: 1 };
const half: MmEntry = { id: "e-v", status: "draft", teamName: null, picks: 1 };
const SLEUTEL = deelnameSleutel("u1", 2026);

/** Voor welke games de data draait (useEntry zonder id haalt niets op). */
const geopend = () => [...new Set(staat.useEntry.mock.calls.map((c) => c[0]).filter(Boolean))];

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
  staat.games = [game("v"), game("m")];
  staat.statussen = [peloton("v"), peloton("m")];
  staat.seizoenLaadt = false;
  staat.entries = {};
  staat.picks = {};
  staat.cats = {};
  staat.kiesGame.mockClear();
  staat.useEntry.mockClear();
  staat.submit.mockReset();
  staat.submit.mockResolvedValue(undefined);
  staat.startlijst = [];
});

describe("vrouwen en mannen op één scherm", () => {
  it("toont allebei, en haalt niets op zolang je nergens meerijdt", () => {
    toon();
    expect(screen.getByRole("heading", { name: "Stel je ploegen samen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Doe mee bij de vrouwen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Doe mee bij de mannen" })).toBeInTheDocument();
    expect(geopend()).toEqual([]);
    // De pelotonbalk hoort hier niet: je ziet ze allebei al.
    expect(screen.queryByTestId("pelotonbalk")).not.toBeInTheDocument();
  });

  it("wacht tot bekend is of je al een ploeg hebt", () => {
    staat.seizoenLaadt = true;
    staat.statussen = [];
    toon();
    expect(screen.queryByRole("button", { name: /Doe mee/ })).not.toBeInTheDocument();
    expect(geopend()).toEqual([]);
  });

  it("start alleen het peloton waar je op meedoen tikt", () => {
    toon();
    fireEvent.click(screen.getByRole("button", { name: "Doe mee bij de vrouwen" }));
    expect(JSON.parse(window.localStorage.getItem(SLEUTEL) ?? "null")).toEqual(["v"]);
    expect(geopend()).toEqual(["v"]);
    // De mannen blijven een uitnodiging: niet verplicht.
    expect(screen.getByRole("button", { name: "Doe ook mee bij de mannen" })).toBeInTheDocument();
    expect(staat.kiesGame).not.toHaveBeenCalled();
  });

  it("bouwt aan allebei tegelijk", () => {
    toon();
    fireEvent.click(screen.getByRole("button", { name: "Doe mee bij de mannen" }));
    fireEvent.click(screen.getByRole("button", { name: "Doe ook mee bij de vrouwen" }));
    // Vrouwen voorop, in welke volgorde je ook tikte.
    expect(JSON.parse(window.localStorage.getItem(SLEUTEL) ?? "null")).toEqual(["v", "m"]);
    expect(geopend().sort()).toEqual(["m", "v"]);
    expect(screen.queryByRole("button", { name: /Doe (ook )?mee/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole("textbox", { name: "Ploegnaam" })).toHaveLength(2);
  });

  it("start meteen bij het peloton waar je al een ploeg hebt", () => {
    staat.statussen = [peloton("v", half), peloton("m")];
    toon();
    expect(geopend()).toEqual(["v"]);
    expect(screen.getByRole("button", { name: "Doe ook mee bij de mannen" })).toBeInTheDocument();
  });

  it("onthoudt waar je meerijdt, ook de keuze van een gast na het inloggen", () => {
    window.localStorage.setItem(deelnameSleutel(null, 2026), JSON.stringify(["m"]));
    staat.gekozenId = "m";
    toon("m");
    expect(geopend()).toEqual(["m"]);
    expect(screen.getByRole("button", { name: "Doe ook mee bij de vrouwen" })).toBeInTheDocument();
  });

  it("laat je je bedenken zolang je niets koos", () => {
    window.localStorage.setItem(SLEUTEL, JSON.stringify(["v", "m"]));
    toon();
    fireEvent.click(screen.getAllByRole("button", { name: "Toch niet meedoen" })[1]);
    expect(JSON.parse(window.localStorage.getItem(SLEUTEL) ?? "null")).toEqual(["v"]);
    expect(screen.getByRole("button", { name: "Doe ook mee bij de mannen" })).toBeInTheDocument();
  });

  it("start geen data voor een gesloten peloton", () => {
    window.localStorage.setItem(SLEUTEL, JSON.stringify(["v", "m"]));
    staat.games = [game("v"), game("m", "locked")];
    staat.statussen = [peloton("v"), peloton("m", null, "locked")];
    toon();
    expect(geopend()).toEqual(["v"]);
    expect(screen.getByText("Gesloten")).toBeInTheDocument();
  });

  it("toont de gesloten pagina als niets meer openstaat", () => {
    staat.games = [game("v", "locked"), game("m", "locked")];
    staat.statussen = [peloton("v", null, "locked"), peloton("m", null, "locked")];
    toon();
    expect(screen.getByRole("heading", { name: "De inschrijving is gesloten" })).toBeInTheDocument();
    expect(geopend()).toEqual([]);
  });
});

describe("bevestigen", () => {
  beforeEach(() => {
    window.localStorage.setItem(SLEUTEL, JSON.stringify(["v", "m"]));
    staat.cats = { v: [categorie("v")], m: [categorie("m")] };
    staat.entries = { v: { id: "e-v", status: "draft" }, m: { id: "e-m", status: "draft" } };
  });

  it("bevestigt beide complete ploegen met één knop", async () => {
    staat.picks = { v: [["c-v", ["r-v"]]], m: [["c-m", ["r-m"]]] };
    toon();
    fireEvent.click(screen.getAllByRole("button", { name: "Beide ploegen bevestigen" })[0]);
    await waitFor(() => expect(staat.submit).toHaveBeenCalledTimes(2));
    expect(staat.submit).toHaveBeenCalledWith({ entryId: "e-v" });
    expect(staat.submit).toHaveBeenCalledWith({ entryId: "e-m" });
  });

  it("een onvolledige mannenploeg houdt de vrouwen niet tegen", async () => {
    staat.picks = { v: [["c-v", ["r-v"]]] };
    toon();
    fireEvent.click(screen.getAllByRole("button", { name: "Vrouwenploeg bevestigen" })[0]);
    await waitFor(() => expect(staat.submit).toHaveBeenCalledTimes(1));
    expect(staat.submit).toHaveBeenCalledWith({ entryId: "e-v" });
  });

  it("stuurt naar de Volgwagen als alles bevestigd is", () => {
    staat.picks = { v: [["c-v", ["r-v"]]], m: [["c-m", ["r-m"]]] };
    staat.entries = { v: { id: "e-v", status: "submitted" }, m: { id: "e-m", status: "submitted" } };
    staat.statussen = [peloton("v", ingediend), peloton("m", { ...ingediend, id: "e-m" })];
    toon();
    expect(screen.getAllByRole("link", { name: "Naar je Volgwagen" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Vrouwenploeg aanpassen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mannenploeg aanpassen" })).toBeInTheDocument();
  });
});

describe("jokers", () => {
  it("biedt geen jokers aan, ook niet met rijders buiten de categorieën", () => {
    window.localStorage.setItem(SLEUTEL, JSON.stringify(["v"]));
    // Vroeger verscheen het jokervak zodra de startlijst rijders had die in
    // geen categorie staan. De Meermarathon kent geen jokers.
    staat.startlijst = [{ id: "t1", name: "Schaatsteam West", riders: [{ id: "los", name: "Losse Rijder", start_number: 51 }] }];
    toon();
    expect(screen.getByRole("heading", { name: "Stel je ploegen samen" })).toBeInTheDocument();
    expect(screen.queryByText(/joker/i)).not.toBeInTheDocument();
  });
});
