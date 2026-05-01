import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

type Prediction = {
  classification: "gc" | "points" | "kom" | "youth";
  position: number;
  rider_id: string;
};

type Entry = {
  id: string;
  user_id: string;
  game_id: string;
  status: "draft" | "submitted";
  entry_picks: Array<{ category_id: string; rider_id: string }>;
  entry_jokers: Array<{ rider_id: string }>;
  entry_predictions: Prediction[];
};

export function useEntry(gameId?: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const SELECT = "id, user_id, game_id, status, entry_picks(category_id, rider_id), entry_jokers(rider_id), entry_predictions(classification, position, rider_id)";

  const entryQuery = useQuery({
    queryKey: ["entry", gameId, user?.id],
    enabled: Boolean(gameId && user?.id && supabase),
    queryFn: async (): Promise<Entry | null> => {
      if (!supabase || !gameId || !user?.id) return null;

      let { data } = await supabase
        .from("entries")
        .select(SELECT)
        .eq("game_id", gameId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!data) {
        const { data: created, error: createError } = await supabase
          .from("entries")
          .insert({ game_id: gameId, user_id: user.id, status: "draft" })
          .select(SELECT)
          .single();
        if (createError) throw createError;
        data = created;
      }

      return data as unknown as Entry;
    },
  });

  const savePick = useMutation({
    mutationFn: async ({ entryId, categoryId, riderId }: { entryId: string; categoryId: string; riderId: string }) => {
      if (!supabase) throw new Error("Supabase niet geconfigureerd");
      const { error } = await supabase.rpc("save_entry_pick", {
        p_entry_id: entryId,
        p_category_id: categoryId,
        p_rider_id: riderId,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["entry", gameId, user?.id] }),
  });

  const saveJoker = useMutation({
    mutationFn: async ({ entryId, riderIds }: { entryId: string; riderIds: string[] }) => {
      if (!supabase) throw new Error("Supabase niet geconfigureerd");
      const { error } = await supabase.rpc("save_entry_jokers", {
        p_entry_id: entryId,
        p_rider_ids: riderIds,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["entry", gameId, user?.id] }),
  });

  const savePredictions = useMutation({
    mutationFn: async ({ entryId, predictions }: { entryId: string; predictions: Prediction[] }) => {
      if (!supabase) throw new Error("Supabase niet geconfigureerd");
      const { error } = await supabase.rpc("save_entry_predictions", {
        p_entry_id: entryId,
        p_predictions: predictions,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["entry", gameId, user?.id] }),
  });

  const submitEntry = useMutation({
    mutationFn: async ({ entryId }: { entryId: string }) => {
      if (!supabase) throw new Error("Supabase niet geconfigureerd");
      const { error } = await supabase.rpc("submit_entry", { p_entry_id: entryId });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["entry", gameId, user?.id] }),
  });

  const picksByCategory = useMemo(() => {
    const m = new Map<string, string>();
    for (const pick of entryQuery.data?.entry_picks ?? []) {
      m.set(pick.category_id, pick.rider_id);
    }
    return m;
  }, [entryQuery.data?.entry_picks]);

  const jokerIds = useMemo(
    () => (entryQuery.data?.entry_jokers ?? []).map((j) => j.rider_id),
    [entryQuery.data?.entry_jokers]
  );

  const predictions = useMemo(
    () => entryQuery.data?.entry_predictions ?? [],
    [entryQuery.data?.entry_predictions]
  );

  return {
    ...entryQuery,
    entry: entryQuery.data,
    picksByCategory,
    jokerIds,
    predictions,
    savePick,
    saveJoker,
    savePredictions,
    submitEntry,
  };
}
