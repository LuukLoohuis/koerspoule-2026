// Beheer › Wedstrijden: bij de Meermarathon heeft elke wedstrijd een weging
// (Grand Prix ×2). Opslaan gaat via zet_wegingsfactor, dat een al berekende
// wedstrijd meteen opnieuw telt. De wielergames hebben het veld niet.
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import StagesTab, { type Stage } from "./StagesTab";

const db = vi.hoisted(() => ({
  rpc: vi.fn(async (_naam: string, _args: Record<string, unknown>) => ({ data: true, error: null })),
  insert: vi.fn(async (_rij: Record<string, unknown>) => ({ error: null })),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: db.rpc,
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      insert: db.insert,
      update: () => ({ eq: async () => ({ error: null }) }),
      delete: () => ({ eq: async () => ({ error: null }) }),
    }),
  },
}));

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

vi.mock("@/components/admin/EindklassementMeermarathon", () => ({ default: () => null }));
vi.mock("@/components/admin/StageLiveTracks", () => ({ default: () => null }));
vi.mock("@/components/admin/VerslagDialog", () => ({ default: () => null }));

const wedstrijd = (stage_number: number, over: Partial<Stage> = {}): Stage => ({
  id: `w${stage_number}`,
  game_id: "mm",
  stage_number,
  name: null,
  date: null,
  status: "draft",
  ijs_type: "kunstijs",
  wedstrijd_type: "cup",
  ...over,
});

const SEIZOEN: Stage[] = [
  wedstrijd(1),
  wedstrijd(2, { ijs_type: "natuurijs", wedstrijd_type: "grandprix", wegingsfactor: 2 }),
  wedstrijd(3, { results_status: "approved" }),
];

function toon(stages: Stage[] = SEIZOEN, gameType = "meermarathon") {
  const reload = vi.fn();
  render(<StagesTab activeGameId="mm" stages={stages} reload={reload} gameType={gameType} />);
  return { reload };
}

const veld = (label: string) => screen.getByRole("textbox", { name: `Weging ${label}` }) as HTMLInputElement;

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("StagesTab › weging", () => {
  it("toont per wedstrijd hoe zwaar hij telt", () => {
    toon();
    expect(screen.getByRole("columnheader", { name: "Weging" })).toBeInTheDocument();
    expect(veld("Cup 1").value).toBe("1");
    expect(veld("Grand Prix 2").value).toBe("2");
  });

  it("slaat een nieuwe factor op via de database-functie, ook met een komma", async () => {
    const { reload } = toon();
    fireEvent.change(veld("Cup 1"), { target: { value: "1,5" } });
    fireEvent.blur(veld("Cup 1"));
    await waitFor(() => expect(db.rpc).toHaveBeenCalledWith("zet_wegingsfactor", { p_stage_id: "w1", p_factor: 1.5 }));
    await waitFor(() => expect(reload).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith("Cup 1 telt nu ×1,5", expect.anything());
  });

  it("doet niets als de factor niet verandert", async () => {
    toon();
    fireEvent.change(veld("Grand Prix 2"), { target: { value: "2,0" } });
    fireEvent.blur(veld("Grand Prix 2"));
    await waitFor(() => expect(veld("Grand Prix 2").value).toBe("2"));
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("weigert 0 en zet het veld terug", async () => {
    toon();
    fireEvent.change(veld("Grand Prix 2"), { target: { value: "0" } });
    fireEvent.blur(veld("Grand Prix 2"));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(db.rpc).not.toHaveBeenCalled();
    expect(veld("Grand Prix 2").value).toBe("2");
  });

  it("vraagt eerst bevestiging als de wedstrijd al in het klassement staat", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    toon();
    fireEvent.change(veld("Cup 3"), { target: { value: "2" } });
    fireEvent.blur(veld("Cup 3"));
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(confirm.mock.calls[0][0]).toMatch(/Cup 3 staat al in het klassement/);
    expect(db.rpc).not.toHaveBeenCalled();
    expect(veld("Cup 3").value).toBe("1");
  });

  it("geeft een nieuwe wedstrijd alleen een factor mee als die afwijkt", async () => {
    toon([]);
    fireEvent.click(screen.getByTestId("create-stage-btn"));
    await waitFor(() => expect(db.insert).toHaveBeenCalledTimes(1));
    expect(db.insert.mock.calls[0][0]).not.toHaveProperty("wegingsfactor");

    fireEvent.change(screen.getByTestId("wedstrijd-weging-input"), { target: { value: "2" } });
    fireEvent.click(screen.getByTestId("create-stage-btn"));
    await waitFor(() => expect(db.insert).toHaveBeenCalledTimes(2));
    expect(db.insert.mock.calls[1][0]).toMatchObject({ wegingsfactor: 2, wedstrijd_type: "cup" });
  });

  it("bestaat niet bij een wielergame", () => {
    toon([{ ...wedstrijd(1), name: "Etappe 1", wedstrijd_type: null, ijs_type: null }], "tdf");
    expect(screen.queryByRole("columnheader", { name: "Weging" })).toBeNull();
    expect(screen.queryByTestId("wedstrijd-weging-input")).toBeNull();
  });
});
