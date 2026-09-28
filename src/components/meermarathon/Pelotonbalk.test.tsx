// De pelotonbalk zegt per peloton in woorden wat jij daar hebt, en laat je
// wisselen zonder dat kleur de enige drager is.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import MeermarathonPelotonbalk, { Pelotonbalk, type PelotonItem } from "./Pelotonbalk";
import { bouwGameStatus, type MmEntry, type MmKlassement } from "@/lib/meermarathonSeizoen";

const staat = vi.hoisted(() => ({
  gekozenId: "v" as string,
  games: [] as { id: string; name: string; year: number; status: string; game_type: string; categorie: string | null }[],
  statussen: [] as unknown[],
  kiesGame: vi.fn(),
}));

vi.mock("@/context/SelectedGameContext", () => ({
  useSelectedGame: () => ({
    selectedGameId: staat.gekozenId,
    selectedGame: staat.games.find((g) => g.id === staat.gekozenId) ?? null,
    setSelectedGameId: staat.kiesGame,
    games: staat.games,
    loading: false,
  }),
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "mij" } }) }));
vi.mock("@/hooks/useMeermarathonTotaal", async () => {
  const { bouwTotaalklassement } = await import("@/lib/meermarathonTotaal");
  return {
    useMeermarathonTotaal: () => ({
      rijen: bouwTotaalklassement([
        {
          categorie: "vrouwen",
          rijen: [
            { user_id: "a", display_name: "A", team_name: null, punten: 90 },
            { user_id: "mij", display_name: "Ik", team_name: null, punten: 50 },
          ],
        },
        { categorie: "mannen", rijen: [{ user_id: "b", display_name: "B", team_name: null, punten: 30 }] },
      ]),
      pelotons: [],
      isLoading: false,
    }),
  };
});
vi.mock("@/hooks/useMeermarathonSeizoen", () => ({
  useMeermarathonSeizoen: () => ({
    seizoen: staat.games.filter((g) => g.game_type === "meermarathon"),
    statussen: staat.statussen,
    isLoading: false,
    error: null,
  }),
}));

const V: PelotonItem = { id: "v", label: "Vrouwen", categorie: "vrouwen", soort: "meedoen", regel: "12e van 1.204" };
const M: PelotonItem = { id: "m", label: "Mannen", categorie: "mannen", soort: "uitnodiging", regel: "Doe ook mee" };

function toon(items: PelotonItem[] = [V, M], selectedId = "v") {
  const onSelect = vi.fn();
  render(<Pelotonbalk seizoen="’26-’27" items={items} selectedId={selectedId} onSelect={onSelect} />);
  const balk = screen.getByRole("navigation", { name: /Meermarathon ’26-’27/ });
  return { balk, onSelect };
}

describe("pelotonbalk", () => {
  it("noemt de game één keer en de pelotons daaronder", () => {
    const { balk } = toon();
    expect(within(balk).getByText("Meermarathon ’26-’27")).toBeInTheDocument();
    expect(within(balk).getAllByRole("button").map((b) => b.textContent)).toEqual([
      expect.stringContaining("Vrouwen"),
      expect.stringContaining("Mannen"),
    ]);
  });

  it("zegt per peloton wat jij daar hebt", () => {
    const { balk } = toon();
    const [vrouwen, mannen] = within(balk).getAllByRole("button");
    expect(vrouwen).toHaveTextContent("12e van 1.204");
    expect(within(vrouwen).getByText("je doet mee")).toBeInTheDocument();
    expect(mannen).toHaveTextContent("Doe ook mee");
    expect(within(mannen).queryByText("je doet mee")).not.toBeInTheDocument();
  });

  it("markeert het gekozen peloton en wisselt op een tik", () => {
    const { balk, onSelect } = toon();
    const [vrouwen, mannen] = within(balk).getAllByRole("button");
    expect(vrouwen).toHaveAttribute("aria-current", "true");
    expect(mannen).not.toHaveAttribute("aria-current");
    fireEvent.click(mannen);
    expect(onSelect).toHaveBeenCalledWith("m");
  });

  it("meldt een wedstrijddag voor de stand", () => {
    const { balk } = toon([
      { ...V, moment: "live" },
      { ...M, soort: "let-op", regel: "Ploeg 3/5", moment: "vandaag" },
    ]);
    const [vrouwen, mannen] = within(balk).getAllByRole("button");
    expect(vrouwen).toHaveTextContent("Live · 12e van 1.204");
    expect(mannen).toHaveTextContent("Vandaag · Ploeg 3/5");
  });

  it("belooft niets zolang je stand laadt", () => {
    const { balk } = toon([
      { ...V, regel: null },
      { ...M, regel: null },
    ]);
    expect(within(balk).queryByText("je doet mee")).not.toBeInTheDocument();
    expect(within(balk).queryByText(/Doe ook mee/)).not.toBeInTheDocument();
  });
});

// ── Met data ──────────────────────────────────────────────────────────────

const game = (id: string, categorie: string | null, game_type = "meermarathon") => ({
  id,
  name: `Game ${id}`,
  year: 2026,
  status: "open_inschrijving",
  game_type,
  categorie,
});

const peloton = (id: "v" | "m", entry: MmEntry | null, klassement: MmKlassement | null = null) =>
  bouwGameStatus({
    game: game(id, id === "v" ? "vrouwen" : "mannen"),
    entry,
    vereist: 5,
    wedstrijden: [],
    klassement,
    puntenPerWedstrijd: new Map(),
    vandaag: "2026-10-01",
  });

function Adres() {
  const { pathname, search } = useLocation();
  return <output data-testid="adres">{pathname + search}</output>;
}

function toonMetData(start = "/mijn-peloton?tab=uitslagen", metTotaal = false) {
  return render(
    <MemoryRouter initialEntries={[start]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <MeermarathonPelotonbalk metTotaal={metTotaal} />
      <Adres />
    </MemoryRouter>,
  );
}

describe("pelotonbalk met data", () => {
  beforeEach(() => {
    staat.gekozenId = "v";
    staat.games = [game("v", "vrouwen"), game("m", "mannen"), game("tour", null, "tdf")];
    staat.statussen = [
      peloton("v", { id: "e", status: "submitted", teamName: "X", picks: 5 }, { rank: 12, totaal: 1204, delta: 4, punten: 146 }),
      peloton("m", null),
    ];
    staat.kiesGame.mockClear();
  });

  it("zet je stand onder elk peloton, met het seizoen in de kop", () => {
    toonMetData();
    const balk = screen.getByRole("navigation", { name: /Meermarathon ’26-’27/ });
    const [vrouwen, mannen] = within(balk).getAllByRole("button");
    expect(vrouwen).toHaveTextContent("12e van 1.204");
    // Je rijdt al bij de vrouwen, dus de mannen vragen of je óók meedoet.
    expect(mannen).toHaveTextContent("Doe ook mee");
  });

  it("zegt gewoon 'Doe mee' als je nog nergens meedoet", () => {
    staat.statussen = [peloton("v", null), peloton("m", null)];
    toonMetData();
    const knoppen = screen.getAllByRole("button");
    expect(knoppen[0]).toHaveTextContent("Doe mee");
    expect(knoppen[0]).not.toHaveTextContent("Doe ook mee");
    expect(knoppen[1]).not.toHaveTextContent("Doe ook mee");
  });

  it("wisselt van peloton en houdt je tab vast", () => {
    toonMetData();
    fireEvent.click(screen.getByRole("button", { name: /Mannen/ }));
    expect(staat.kiesGame).toHaveBeenCalledWith("m");
    expect(screen.getByTestId("adres")).toHaveTextContent("/mijn-peloton?tab=uitslagen&game=m");
  });

  it("toont de namen al terwijl je stand nog laadt", () => {
    staat.statussen = [];
    toonMetData();
    const knoppen = screen.getAllByRole("button");
    expect(knoppen.map((k) => k.textContent?.trim())).toEqual(["Vrouwen", "Mannen"]);
  });

  it("blijft weg bij een wielerkoers", () => {
    staat.gekozenId = "tour";
    toonMetData();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("toont een peloton dat er nog niet is als 'Nog niet open', zonder knop", () => {
    // Zoals eind september 2026: alleen de mannen bestaan.
    staat.gekozenId = "m";
    staat.games = [game("m", "mannen")];
    staat.statussen = [peloton("m", { id: "e", status: "submitted", teamName: null, picks: 5 })];
    toonMetData();
    const balk = screen.getByRole("navigation", { name: /Meermarathon ’26-’27/ });
    expect(balk).toHaveTextContent(/Vrouwen\s*Nog niet open/);
    const knoppen = within(balk).getAllByRole("button");
    expect(knoppen).toHaveLength(1);
    expect(knoppen[0]).toHaveTextContent("Mannen");
    expect(knoppen[0]).toHaveAttribute("aria-current", "true");
  });

  it("zet bij de uitslagen het totaal erbij, met jouw plek", () => {
    toonMetData("/uitslagen?game=v", true);
    const totaal = screen.getByRole("button", { name: /Totaal/ });
    expect(totaal).toHaveTextContent("2e van 3");
    fireEvent.click(totaal);
    expect(screen.getByTestId("adres")).toHaveTextContent("/uitslagen?game=v&klassement=totaal");
    expect(screen.getByRole("button", { name: /Totaal/ })).toHaveAttribute("aria-current", "true");
    // Geen peloton tegelijk gekozen.
    expect(screen.getByRole("button", { name: /Vrouwen/ })).not.toHaveAttribute("aria-current");
  });

  it("verlaat het totaal zodra je een peloton kiest", () => {
    toonMetData("/uitslagen?game=v&klassement=totaal", true);
    fireEvent.click(screen.getByRole("button", { name: /Mannen/ }));
    expect(screen.getByTestId("adres")).toHaveTextContent("/uitslagen?game=m");
    expect(screen.getByTestId("adres")).not.toHaveTextContent("klassement");
  });

  it("heeft geen totaal zolang er maar één peloton is", () => {
    staat.gekozenId = "m";
    staat.games = [game("m", "mannen")];
    toonMetData("/uitslagen", true);
    expect(screen.queryByRole("button", { name: /Totaal/ })).not.toBeInTheDocument();
  });

  it("biedt geen totaal in de ploegbouwer", () => {
    toonMetData("/team-samenstellen");
    expect(screen.queryByRole("button", { name: /Totaal/ })).not.toBeInTheDocument();
  });
});
