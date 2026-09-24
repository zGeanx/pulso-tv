import { useQuery } from "@tanstack/react-query";
import {
  fetchChannels,
  fetchChannel,
  fetchChannelCategories,
  fetchSports,
  fetchSportCategories,
  fetchSearch,
  type ChannelsParams,
  type SportsParams,
} from "@/lib/api";

// ─── Channels ─────────────────────────────────────────────────────────────────

export function useChannels(params: ChannelsParams = {}) {
  return useQuery({
    queryKey: ["channels", params],
    queryFn: () => fetchChannels(params),
    staleTime: 60_000, // 1 min — EPG can change
  });
}

export function useChannel(id: string) {
  return useQuery({
    queryKey: ["channels", id],
    queryFn: () => fetchChannel(id),
    staleTime: 60_000,
    enabled: Boolean(id),
  });
}

export function useChannelCategories() {
  return useQuery({
    queryKey: ["channels", "categories"],
    queryFn: fetchChannelCategories,
    staleTime: 10 * 60_000, // 10 min — categories rarely change
  });
}

// ─── Sports ───────────────────────────────────────────────────────────────────

export function useSports(params: SportsParams = {}) {
  return useQuery({
    queryKey: ["sports", params],
    queryFn: () => fetchSports(params),
    staleTime: 30_000, // 30 s — live scores / status change often
    refetchInterval: (query) => {
      // Auto-refresh every 30 s when there are live events
      const data = query.state.data;
      const hasLive = data?.some((e) => e.status === "live");
      return hasLive ? 30_000 : false;
    },
  });
}

export function useSportCategories() {
  return useQuery({
    queryKey: ["sports", "categories"],
    queryFn: fetchSportCategories,
    staleTime: 10 * 60_000,
  });
}

// ─── Search ───────────────────────────────────────────────────────────────────

export function useSearch(query: string) {
  return useQuery({
    queryKey: ["search", query],
    queryFn: () => fetchSearch(query),
    enabled: query.trim().length >= 2,
    staleTime: 30_000,
  });
}
