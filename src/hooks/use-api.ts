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

export function useSports(params: SportsParams = {}) {
  return useQuery({
    queryKey: ["sports", params],
    queryFn: () => fetchMergedSports(params),
    staleTime: 30_000,
    refetchInterval: (query) => {
      const data = query.state.data;
      const hasLive = data?.some((event) => event.status === "live");
      return hasLive ? 30_000 : false;
    },
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
