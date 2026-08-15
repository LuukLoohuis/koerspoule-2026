import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePalmares } from "./usePalmares";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: mocks.rpc,
    from: mocks.from,
  },
}));

describe("usePalmares", () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
    mocks.from.mockReset();
  });

  it("houdt historische games zichtbaar als de nieuwe summary-RPC ontbreekt", async () => {
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === "user_palmares_summary") {
        return { data: null, error: { message: "function does not exist" } };
      }
      if (name === "game_benchmark_data") {
        return {
          data: {
            entries: [{ entry_id: "entry-tour", total_points: 2145 }],
            stages: [],
            categories: [],
            stage_points: [],
            category_points: [],
            picks: [],
          },
          error: null,
        };
      }
      return { data: null, error: null };
    });

    mocks.from.mockImplementation((table: string) => ({
      select: () => ({
        eq: async () => table === "entries"
          ? { data: [{ id: "entry-tour", game_id: "tour-2026", status: "submitted" }], error: null }
          : { data: [], error: null },
        in: async () => ({
          data: [{ id: "tour-2026", name: "Tour de France 2026", game_type: "tour", year: 2026, status: "finished" }],
          error: null,
        }),
      }),
    }));

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => usePalmares(), { wrapper });

    await waitFor(() => expect(result.current.data?.games).toHaveLength(1));
    expect(result.current.data?.games[0].game_name).toBe("Tour de France 2026");
    expect(mocks.rpc).toHaveBeenCalledWith("user_palmares_summary");
    expect(mocks.rpc).toHaveBeenCalledWith("game_benchmark_data", { p_game_id: "tour-2026" });
  });
});
