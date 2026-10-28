import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchChannelCategories, fetchChannels, fetchSports, type SportsParams } from "@/lib/api";
import { mergeChannelLists } from "@/lib/merge-catalog";
import {
  composeSports,
  fetchMergedSearch,
  fetchPulsoEmbeds,
  fetchPulsoMatches,
} from "@/lib/pulso-api";

function usePulsoMatches() {
  return useQuery({
    queryKey: ["pulso", "matches"],
    queryFn: fetchPulsoMatches,
    staleTime: 30_000,
    retry: 1,
    refetchInterval: (query) =>
      sportsRefetchInterval(
        (query.state.data ?? []).map((match) => ({
          status: match.status,
          start_timestamp: 0,
        })),
      ),
  });
}

function usePulsoEmbeds() {
  return useQuery({
    queryKey: ["pulso", "embeds"],
    queryFn: fetchPulsoEmbeds,
    staleTime: 5 * 60_000,
    retry: 1,
    refetchInterval: 5 * 60_000,
  });
}

function useReidosSports() {
  return useQuery({
    queryKey: ["reidos", "sports"],
    queryFn: () => fetchSports({}),
    staleTime: 5 * 60_000,
    retry: 0,
    refetchInterval: 5 * 60_000,
  });
}

function useReidosChannels() {
  return useQuery({
    queryKey: ["reidos", "channels"],
    queryFn: fetchChannels,
    staleTime: 5 * 60_000,
    retry: 0,
    refetchInterval: 5 * 60_000,
  });
}

export function useChannels() {
  const embeds = usePulsoEmbeds();
  const reidos = useReidosChannels();
  const data = useMemo(() => {
    if (!embeds.data && !reidos.data) return undefined;
    return mergeChannelLists(reidos.data ?? [], embeds.data ?? []).channels;
  }, [embeds.data, reidos.data]);
  const failed = embeds.isError && reidos.isError;
  const isComplete = !embeds.isPending && !reidos.isPending;

  return {
    data,
    isLoading: data === undefined && !failed,
    isError: data === undefined && failed,
    isComplete,
    refetch: () => Promise.all([embeds.refetch(), reidos.refetch()]),
  };
}

export function useChannel(id: string) {
  const channels = useChannels();
  const channel = channels.data?.find((item) => item.id === id);
  const isLoading = !channel && (channels.isLoading || !channels.isComplete);

  return {
    data: channel,
    isLoading,
    isError: Boolean(id) && !channel && channels.isComplete && !channels.isLoading,
    refetch: channels.refetch,
  };
}

export function useChannelCategories() {
  const remote = useQuery({
    queryKey: ["channels", "categories"],
    queryFn: fetchChannelCategories,
    staleTime: 10 * 60_000,
    retry: 0,
  });
  const channels = useChannels();
  const data = useMemo(() => {
    if (remote.data && remote.data.length > 0) return remote.data;
    const derived: { id: number; name: string }[] = [];
    const seen = new Set<string>();
    for (const channel of channels.data ?? []) {
      if (!channel.category || seen.has(channel.category)) continue;
      seen.add(channel.category);
      derived.push({ id: derived.length, name: channel.category });
    }
    return derived;
  }, [remote.data, channels.data]);

  return { ...remote, data };
}

const SOON_WINDOW_SECONDS = 30 * 60;

export function sportsRefetchInterval(
  events: { status: string; start_timestamp: number }[] | undefined,
  nowSeconds = Date.now() / 1000,
): number {
  if (!events || events.length === 0) return 5 * 60_000;
  if (events.some((event) => event.status === "live")) return 30_000;
  const startingSoon = events.some(
    (event) =>
      event.status === "upcoming" &&
      event.start_timestamp >= nowSeconds &&
      event.start_timestamp - nowSeconds <= SOON_WINDOW_SECONDS,
  );
  return startingSoon ? 60_000 : 5 * 60_000;
}

export function useSports(params: SportsParams = {}) {
  const matches = usePulsoMatches();
  const embeds = usePulsoEmbeds();
  const reidos = useReidosSports();
  const status = params.status;
  const category = params.category;
  const search = params.search;
  const limit = params.limit;
  const offset = params.offset;

  const data = useMemo(() => {
    if (!matches.data && !reidos.data) return undefined;
    return composeSports(reidos.data ?? [], matches.data ?? [], embeds.data ?? [], {
      ...(status ? { status } : {}),
      ...(category ? { category } : {}),
      ...(search ? { search } : {}),
      ...(limit != null ? { limit } : {}),
      ...(offset != null ? { offset } : {}),
    });
  }, [matches.data, embeds.data, reidos.data, status, category, search, limit, offset]);

  const failed = matches.isError && reidos.isError;
  const isComplete = !matches.isPending && !reidos.isPending;

  return {
    data,
    isLoading: data === undefined && !failed,
    isError: data === undefined && failed,
    isComplete,
    refetch: () => Promise.all([matches.refetch(), embeds.refetch(), reidos.refetch()]),
  };
}

export function useSport(id: string) {
  const sports = useSports();
  const event = sports.data?.find((item) => item.id === id);
  const isLoading = !event && (sports.isLoading || !sports.isComplete);

  return {
    data: event,
    isLoading,
    isError: Boolean(id) && !event && sports.isComplete && !sports.isLoading,
    refetch: sports.refetch,
  };
}

export function useSearch(query: string) {
  return useQuery({
    queryKey: ["search", query],
    queryFn: () => fetchMergedSearch(query),
    enabled: query.trim().length >= 2,
    staleTime: 30_000,
    retry: 0,
  });
}
