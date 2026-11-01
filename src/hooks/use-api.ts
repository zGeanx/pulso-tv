import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import {
  fetchChannelCategories,
  fetchChannels,
  fetchSports,
  labelFromSlug,
  REIDOS_ORIGIN,
  type ApiCategory,
  type ApiChannel,
  type ApiSportEvent,
  type SportsParams,
} from "@/lib/api";
import {
  channelGroupKey,
  mergeChannelLists,
  pulsoId,
  pulsoSlug,
  type MergeChannelResult,
} from "@/lib/merge-catalog";
import {
  composeSportsWithAbsorbed,
  fetchMergedSearch,
  fetchPulsoEmbeds,
  fetchPulsoMatches,
  sliceSports,
  type PulsoEmbedSource,
  type PulsoMatch,
} from "@/lib/pulso-api";

const STORAGE_PREFIX = "pulso_cache_v2:";
const MAX_STORAGE_AGE_MS = 30 * 60_000;

interface StoredEntry<T> {
  ts: number;
  data: T;
}

const memoryStorageFallback = new Map<string, StoredEntry<unknown>>();
let isClientHydrated = false;

function readStorageCache<T>(
  key: string,
  maxAgeMs = MAX_STORAGE_AGE_MS,
): StoredEntry<T> | undefined {
  if (typeof window === "undefined") return undefined;
  const fullKey = `${STORAGE_PREFIX}${key}`;
  const mem = memoryStorageFallback.get(fullKey) as StoredEntry<T> | undefined;
  if (mem && Date.now() - mem.ts <= maxAgeMs) return mem;

  try {
    const raw = window.localStorage.getItem(fullKey);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as StoredEntry<T>;
    if (
      !parsed ||
      typeof parsed.ts !== "number" ||
      Date.now() - parsed.ts > maxAgeMs ||
      parsed.data === undefined
    ) {
      return undefined;
    }
    memoryStorageFallback.set(fullKey, parsed);
    return parsed;
  } catch {
    return undefined;
  }
}

function writeStorageCache<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  const fullKey = `${STORAGE_PREFIX}${key}`;
  const entry: StoredEntry<T> = { ts: Date.now(), data };
  memoryStorageFallback.set(fullKey, entry);
  try {
    window.localStorage.setItem(fullKey, JSON.stringify(entry));
  } catch {
    // Ignore storage quota or private mode errors
  }
}

function useHydrateFromStorage<T>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  storageKey: string,
  hasData: boolean,
) {
  useEffect(() => {
    isClientHydrated = true;
    if (hasData) return;
    const cached = readStorageCache<T>(storageKey);
    if (cached) {
      queryClient.setQueryData<T>(queryKey, cached.data, { updatedAt: cached.ts });
    }
  }, [queryClient, queryKey, storageKey, hasData]);
}

const PULSO_MATCHES_KEY = ["pulso", "matches"] as const;
const PULSO_EMBEDS_KEY = ["pulso", "embeds"] as const;
const REIDOS_SPORTS_KEY = ["reidos", "sports", REIDOS_ORIGIN] as const;
const REIDOS_CHANNELS_KEY = ["reidos", "channels", REIDOS_ORIGIN] as const;
const REIDOS_CATEGORIES_KEY = ["channels", "categories", REIDOS_ORIGIN] as const;

function usePulsoMatches() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: PULSO_MATCHES_KEY,
    queryFn: async () => {
      const data = await fetchPulsoMatches();
      writeStorageCache("pulso_matches", data);
      return data;
    },
    initialData: () =>
      isClientHydrated ? readStorageCache<PulsoMatch[]>("pulso_matches")?.data : undefined,
    initialDataUpdatedAt: () =>
      isClientHydrated ? readStorageCache<PulsoMatch[]>("pulso_matches")?.ts : undefined,
    staleTime: 30_000,
    retry: 0,
    refetchInterval: (q) =>
      sportsRefetchInterval(
        (q.state.data ?? []).map((match) => ({
          status: match.status,
          start_timestamp: 0,
        })),
      ),
  });
  useHydrateFromStorage(queryClient, PULSO_MATCHES_KEY, "pulso_matches", query.data !== undefined);
  return query;
}

function usePulsoEmbeds() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: PULSO_EMBEDS_KEY,
    queryFn: async () => {
      const data = await fetchPulsoEmbeds();
      writeStorageCache("pulso_embeds", data);
      return data;
    },
    initialData: () =>
      isClientHydrated ? readStorageCache<PulsoEmbedSource[]>("pulso_embeds")?.data : undefined,
    initialDataUpdatedAt: () =>
      isClientHydrated ? readStorageCache<PulsoEmbedSource[]>("pulso_embeds")?.ts : undefined,
    staleTime: 5 * 60_000,
    retry: 0,
    refetchInterval: 5 * 60_000,
  });
  useHydrateFromStorage(queryClient, PULSO_EMBEDS_KEY, "pulso_embeds", query.data !== undefined);
  return query;
}

function useReidosSports() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: REIDOS_SPORTS_KEY,
    queryFn: async () => {
      const data = await fetchSports({});
      writeStorageCache("reidos_sports", data);
      return data;
    },
    initialData: () =>
      isClientHydrated ? readStorageCache<ApiSportEvent[]>("reidos_sports")?.data : undefined,
    initialDataUpdatedAt: () =>
      isClientHydrated ? readStorageCache<ApiSportEvent[]>("reidos_sports")?.ts : undefined,
    staleTime: 60_000,
    retry: 0,
    refetchInterval: 5 * 60_000,
  });
  useHydrateFromStorage(queryClient, REIDOS_SPORTS_KEY, "reidos_sports", query.data !== undefined);
  return query;
}

function useReidosChannels() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: REIDOS_CHANNELS_KEY,
    queryFn: async () => {
      const data = await fetchChannels();
      writeStorageCache("reidos_channels", data);
      return data;
    },
    initialData: () =>
      isClientHydrated ? readStorageCache<ApiChannel[]>("reidos_channels")?.data : undefined,
    initialDataUpdatedAt: () =>
      isClientHydrated ? readStorageCache<ApiChannel[]>("reidos_channels")?.ts : undefined,
    staleTime: 60_000,
    retry: 0,
    refetchInterval: 5 * 60_000,
  });
  useHydrateFromStorage(
    queryClient,
    REIDOS_CHANNELS_KEY,
    "reidos_channels",
    query.data !== undefined,
  );
  return query;
}

const EMPTY_CHANNELS: ApiChannel[] = [];
const EMPTY_EMBEDS: PulsoEmbedSource[] = [];
const EMPTY_MATCHES: PulsoMatch[] = [];
const EMPTY_SPORTS: ApiSportEvent[] = [];

let lastChannelsMemo: {
  reidos: ApiChannel[];
  embeds: PulsoEmbedSource[];
  result: MergeChannelResult;
} | null = null;

function getMemoizedMergedChannels(
  reidos: ApiChannel[],
  embeds: PulsoEmbedSource[],
): MergeChannelResult {
  if (
    lastChannelsMemo &&
    lastChannelsMemo.reidos === reidos &&
    lastChannelsMemo.embeds === embeds
  ) {
    return lastChannelsMemo.result;
  }
  const result = mergeChannelLists(reidos, embeds);
  lastChannelsMemo = { reidos, embeds, result };
  return result;
}

type MergedSportsBundle = ReturnType<typeof composeSportsWithAbsorbed>;

let lastSportsMemo: {
  reidos: ApiSportEvent[];
  matches: PulsoMatch[];
  embeds: PulsoEmbedSource[];
  result: MergedSportsBundle;
} | null = null;

function getMemoizedMergedSports(
  reidos: ApiSportEvent[],
  matches: PulsoMatch[],
  embeds: PulsoEmbedSource[],
): MergedSportsBundle {
  if (
    lastSportsMemo &&
    lastSportsMemo.reidos === reidos &&
    lastSportsMemo.matches === matches &&
    lastSportsMemo.embeds === embeds
  ) {
    return lastSportsMemo.result;
  }
  const result = composeSportsWithAbsorbed(reidos, matches, embeds);
  lastSportsMemo = { reidos, matches, embeds, result };
  return result;
}

export function useChannels() {
  const embeds = usePulsoEmbeds();
  const reidos = useReidosChannels();
  const result = useMemo(() => {
    if (!embeds.data && !reidos.data) return undefined;
    return getMemoizedMergedChannels(reidos.data ?? EMPTY_CHANNELS, embeds.data ?? EMPTY_EMBEDS);
  }, [embeds.data, reidos.data]);
  const failed = embeds.isError && reidos.isError;
  const isComplete = !embeds.isPending && !reidos.isPending;

  return {
    data: result?.channels,
    absorbed: result?.absorbed,
    isLoading: result === undefined && !failed,
    isError: result === undefined && failed,
    isComplete,
    refetch: () => Promise.all([embeds.refetch(), reidos.refetch()]),
  };
}

export function useChannel(id: string) {
  const channels = useChannels();
  const channel = useMemo(() => {
    const list = channels.data;
    if (!list || list.length === 0 || !id) return undefined;

    const slug = pulsoSlug(id);
    const targetId = slug && channels.absorbed ? (channels.absorbed.get(slug) ?? id) : id;
    const altPulsoId = slug ? slug : pulsoId(id);

    const exact = list.find(
      (item) => item.id === targetId || item.id === id || item.id === altPulsoId,
    );
    if (exact) return exact;

    const targetKey = channelGroupKey(labelFromSlug(slug ?? id));
    if (!targetKey) return undefined;
    return list.find((item) => channelGroupKey(item.name) === targetKey);
  }, [channels.data, channels.absorbed, id]);

  const isLoading = !channel && (channels.isLoading || !channels.isComplete);

  return {
    data: channel,
    isLoading,
    isError: Boolean(id) && !channel && channels.isComplete && !channels.isLoading,
    refetch: channels.refetch,
  };
}

export function useChannelCategories() {
  const queryClient = useQueryClient();
  const remote = useQuery({
    queryKey: REIDOS_CATEGORIES_KEY,
    queryFn: async () => {
      const data = await fetchChannelCategories();
      writeStorageCache("reidos_categories", data);
      return data;
    },
    initialData: () =>
      isClientHydrated ? readStorageCache<ApiCategory[]>("reidos_categories")?.data : undefined,
    initialDataUpdatedAt: () =>
      isClientHydrated ? readStorageCache<ApiCategory[]>("reidos_categories")?.ts : undefined,
    staleTime: 10 * 60_000,
    retry: 0,
  });
  useHydrateFromStorage(
    queryClient,
    REIDOS_CATEGORIES_KEY,
    "reidos_categories",
    remote.data !== undefined,
  );

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

  const baseResult = useMemo(() => {
    if (!matches.data && !reidos.data) return undefined;
    return getMemoizedMergedSports(
      reidos.data ?? EMPTY_SPORTS,
      matches.data ?? EMPTY_MATCHES,
      embeds.data ?? EMPTY_EMBEDS,
    );
  }, [matches.data, embeds.data, reidos.data]);

  const events = useMemo(() => {
    if (!baseResult) return undefined;
    if (!status && !category && !search && limit == null && offset == null) {
      return baseResult.events;
    }
    return sliceSports(baseResult.events, {
      ...(status ? { status } : {}),
      ...(category ? { category } : {}),
      ...(search ? { search } : {}),
      ...(limit != null ? { limit } : {}),
      ...(offset != null ? { offset } : {}),
    });
  }, [baseResult, status, category, search, limit, offset]);

  const failed = matches.isError && reidos.isError;
  const isComplete = !matches.isPending && !reidos.isPending;

  return {
    data: events,
    absorbed: baseResult?.absorbed,
    slugToId: baseResult?.slugToId,
    isLoading: baseResult === undefined && !failed,
    isError: baseResult === undefined && failed,
    isComplete,
    refetch: () => Promise.all([matches.refetch(), embeds.refetch(), reidos.refetch()]),
  };
}

export function useSport(id: string) {
  const sports = useSports();
  const event = useMemo(() => {
    const list = sports.data;
    if (!list || list.length === 0 || !id) return undefined;

    const slug = pulsoSlug(id);
    const targetId = slug && sports.slugToId ? (sports.slugToId.get(slug) ?? id) : id;
    const altPulsoId = slug ? slug : pulsoId(id);

    return list.find((item) => item.id === targetId || item.id === id || item.id === altPulsoId);
  }, [sports.data, sports.slugToId, id]);

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
