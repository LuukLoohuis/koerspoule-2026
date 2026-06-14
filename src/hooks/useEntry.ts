import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { sendEmail, ploegIngediendHtml } from "@/lib/sendEmail";

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
  team_name: string | null;
  entry_picks: Array<{ category_id: string; rider_id: string }>;
  entry_jokers: Array<{ rider_id: string }>;
  entry_predictions: Prediction[];
};

export function useEntry(gameId?: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const SELECT = "id, user_id, game_id, status, team_name, entry_picks(category_id, rider_id), entry_jokers(rider_id), entry_predictions(classification, position, rider_id)";

  // ── Optimistic-update helpers voor de entry-cache ──
  const entryKey = ["entry", gameId, user?.id];
  // Cancel lopende fetches, snapshot de vorige cache, schrijf de verwachte
  // nieuwe waarde meteen → de keuze verschijnt direct.
  const optimisticEntry = async (update: (e: Entry) => Entry) => {
    await queryClient.cancelQueries({ queryKey: entryKey });
    const prev = queryClient.getQueryData<Entry>(entryKey);
    if (prev) queryClient.setQueryData<Entry>(entryKey, update(prev));
    return { prev };
  };
  const rollbackEntry = (ctx?: { prev?: Entry }) => {
    if (ctx?.prev) queryClient.setQueryData(entryKey, ctx.prev);
  };
  const settleEntry = () => queryClient.invalidateQueries({ queryKey: entryKey });

  const entryQuery = useQuery({
    queryKey: ["entry", gameId, user?.id],
    enabled: Boolean(gameId && user?.id && supabase),
    // Entry-data wijzigt alleen door gebruikersacties die de query toch
    // invalideren → 5 min staleTime scheelt onnodige refetches.
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Entry | null> => {
      if (!supabase || !gameId || !user?.id) return null;

      let { data } = await supabase
        .from("entries")
        .select(SELECT)
        .eq("game_id", gameId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!data) {
        // Atomair get-or-create (ON CONFLICT DO NOTHING) i.p.v. een ongeguarde
        // insert → geen rollback/duplicaten bij gelijktijdige reads.
        const { data: entryId, error: rpcError } = await supabase.rpc("get_or_create_entry", {
          p_game_id: gameId,
        });
        if (rpcError) throw rpcError;
        const { data: row, error: selError } = await supabase
          .from("entries")
          .select(SELECT)
          .eq("id", entryId)
          .single();
        if (selError) throw selError;
        data = row;
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
    // Single-pick categorie: vervang de keuze direct.
    onMutate: ({ categoryId, riderId }) =>
      optimisticEntry((e) => ({
        ...e,
        entry_picks: [...e.entry_picks.filter((p) => p.category_id !== categoryId), { category_id: categoryId, rider_id: riderId }],
      })),
    onError: (err, _v, ctx) => {
      rollbackEntry(ctx);
      toast.error("Opslaan mislukt", { description: err instanceof Error ? err.message : "" });
    },
    onSettled: settleEntry,
  });

  // Toggle: gebruikt voor categorieën met max_picks > 1 (en werkt ook voor max_picks=1)
  const togglePick = useMutation({
    mutationFn: async ({ entryId, categoryId, riderId }: { entryId: string; categoryId: string; riderId: string }) => {
      if (!supabase) throw new Error("Supabase niet geconfigureerd");
      const { error } = await supabase.rpc("toggle_entry_pick", {
        p_entry_id: entryId,
        p_category_id: categoryId,
        p_rider_id: riderId,
      });
      if (error) throw error;
    },
    // Direct toevoegen/verwijderen; de server-side max wordt door onSettled gereconcilieerd.
    onMutate: ({ categoryId, riderId }) =>
      optimisticEntry((e) => {
        const exists = e.entry_picks.some((p) => p.category_id === categoryId && p.rider_id === riderId);
        return {
          ...e,
          entry_picks: exists
            ? e.entry_picks.filter((p) => !(p.category_id === categoryId && p.rider_id === riderId))
            : [...e.entry_picks, { category_id: categoryId, rider_id: riderId }],
        };
      }),
    onError: (err, _v, ctx) => {
      rollbackEntry(ctx);
      toast.error("Opslaan mislukt", { description: err instanceof Error ? err.message : "" });
    },
    onSettled: settleEntry,
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
    onMutate: ({ riderIds }) =>
      optimisticEntry((e) => ({ ...e, entry_jokers: riderIds.map((id) => ({ rider_id: id })) })),
    onError: (err, _v, ctx) => {
      rollbackEntry(ctx);
      toast.error("Opslaan mislukt", { description: err instanceof Error ? err.message : "" });
    },
    onSettled: settleEntry,
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
    onSuccess: (_data, { entryId }) => {
      queryClient.invalidateQueries({ queryKey: ["entry", gameId, user?.id] });
      if (user?.email) {
        const teamName = queryClient.getQueryData<{ team_name?: string | null }>(["entry", gameId, user.id])?.team_name;
        sendEmail(
          user.email,
          "Je ploeg is ingediend — Koerspoule",
          ploegIngediendHtml(user.email, teamName),
        );
      }
    },
  });

  // Zet entry terug naar draft zodat de deelnemer mag wijzigen
  const revertEntry = useMutation({
    mutationFn: async ({ entryId }: { entryId: string }) => {
      if (!supabase) throw new Error("Supabase niet geconfigureerd");
      const { error } = await supabase
        .from("entries")
        .update({ status: "draft", submitted_at: null })
        .eq("id", entryId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["entry", gameId, user?.id] }),
  });

  const saveTeamName = useMutation({
    mutationFn: async ({ entryId, teamName }: { entryId: string; teamName: string }) => {
      if (!supabase) throw new Error("Supabase niet geconfigureerd");
      const trimmed = teamName.trim();
      const { error } = await supabase
        .from("entries")
        .update({ team_name: trimmed.length ? trimmed : null })
        .eq("id", entryId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["entry", gameId, user?.id] }),
  });

  // Map<categoryId, riderId[]> — ondersteunt meerdere picks per categorie
  const picksByCategory = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const pick of entryQuery.data?.entry_picks ?? []) {
      const arr = m.get(pick.category_id) ?? [];
      arr.push(pick.rider_id);
      m.set(pick.category_id, arr);
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
    teamName: entryQuery.data?.team_name ?? null,
    picksByCategory,
    jokerIds,
    predictions,
    savePick,
    togglePick,
    saveJoker,
    savePredictions,
    saveTeamName,
    submitEntry,
    revertEntry,
  };
}
