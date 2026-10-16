import { useQuery } from "@tanstack/react-query";
import { fetchChannelCategories, type SportsParams } from "@/lib/api";
import {
  fetchMergedChannel,
  fetchMergedChannels,
  fetchMergedSearch,
  fetchMergedSport,
  fetchMergedSports,
} from "@/lib/pulso-api";

export function useChannels() {
  return useQuery({
    queryKey: ["channels"],
    queryFn: () => fetchMergedChannels(),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}

export function useChannel(id: string) {
  return useQuery({
    queryKey: ["channels", id],
    queryFn: () => fetchMergedChannel(id),
    enabled: id.length > 0,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}

export function useChannelCategories() {
  return useQuery({
    queryKey: ["channels", "categories"],
    queryFn: fetchChannelCategories,
    staleTime: 10 * 60_000,
  });
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
  return useQuery({
    queryKey: ["sports", params],
    queryFn: () => fetchMergedSports(params),
    staleTime: 30_000,
    refetchInterval: (query) => sportsRefetchInterval(query.state.data),
  });
}

export function useSport(id: string) {
  return useQuery({
    queryKey: ["sports", id],
    queryFn: () => fetchMergedSport(id),
    enabled: id.length > 0,
    staleTime: 30_000,
  });
}

export function useSearch(query: string) {
  return useQuery({
    queryKey: ["search", query],
    queryFn: () => fetchMergedSearch(query),
    enabled: query.trim().length >= 2,
    staleTime: 30_000,
  });
}
