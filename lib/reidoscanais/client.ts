import type {
  ApiEnvelope,
  Channel,
  SportsEvent,
} from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, signal?: AbortSignal) {
  const response = await fetch(path, {
    signal,
    headers: { Accept: "application/json" },
  });

  const payload = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || !payload.success) {
    throw new ApiError(
      payload.message ?? "Não foi possível consultar a programação.",
      response.status,
    );
  }

  return payload;
}

export async function listChannels(
  category?: string,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams();
  if (category && category !== "Todos") {
    params.set("category", category);
  }

  const suffix = params.size ? `?${params}` : "";
  return (await request<Channel[]>(
    `/api/reidoscanais/channels${suffix}`,
    signal,
  )).data;
}

export async function listCategories(signal?: AbortSignal) {
  return (await request<Array<string | { name?: string }>>(
    "/api/reidoscanais/categories",
    signal,
  )).data;
}

export async function listSports(
  options: {
    status?: "live" | "upcoming" | "finished";
    popular?: boolean;
    category?: string;
  },
  signal?: AbortSignal,
) {
  const params = new URLSearchParams();
  if (options.status) params.set("status", options.status);
  if (options.popular) params.set("popular", "true");
  if (options.category) params.set("category", options.category);

  return (await request<SportsEvent[]>(
    `/api/reidoscanais/sports?${params}`,
    signal,
  )).data;
}
