import { useQuery } from "@tanstack/react-query";
import {
  fetchChannels,
  fetchChannel,
  fetchChannelCategories,
  fetchSports,
  fetchSport,
  fetchSearch,
  type SportsParams,
} from "@/lib/api";

export function useChannels() {
  return useQuery({
    queryKey: ["channels"],
    queryFn: () => fetchChannels(),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}

export function useChannel(id: string) {
  return useQuery({
    queryKey: ["channels", id],
    queryFn: () => fetchChannel(id),
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
    queryFn: () => fetchSports(params),
    staleTime: 30_000,
    refetchInterval: (query) => {
      const data = query.state.data;
      const hasLive = data?.some((e) => e.status === "live");
      return hasLive ? 30_000 : false;
    },
  });
}

export function useSport(id: string) {
  return useQuery({
    queryKey: ["sports", id],
    queryFn: () => fetchSport(id),
    enabled: id.length > 0,
    staleTime: 30_000,
  });
}

export function useSearch(query: string) {
  return useQuery({
    queryKey: ["search", query],
    queryFn: () => fetchSearch(query),
    enabled: query.trim().length >= 2,
    staleTime: 30_000,
  });
}
