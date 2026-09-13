import type { Metadata } from "next";
import { cache } from "react";
import { sanitizeEmbeds } from "../../../lib/reidoscanais/embed-security";
import PlayerClient, { type Playable } from "../../canal/[id]/player-client";

const API_URL = "https://api.reidoscanais.st";
const SITE_URL = "https://pulso-tv-ao-vivo.zgeanx.chatgpt.site";
const API_TIMEOUT_MS = 7000;

type ApiEvent = {
  id: string;
  title: string;
  description?: string;
  poster?: string;
  category?: string;
  competition?: string;
  teams?: {
    home?: { name: string; logo?: string };
    away?: { name: string; logo?: string };
  };
  start_timestamp: number;
  embeds?: Playable["embeds"];
};

type ApiResponse<T> = { success: boolean; data: T };
type PageProps = { params: Promise<{ id: string }> };

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
}

function decodeText(text?: string) {
  if (!text) return "";
  return text
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeEvent(event: ApiEvent): Playable {
  const category = decodeText(event.category) || "Esportes";
  const title = decodeText(event.title);
  const show = decodeText(event.description || event.competition || category);
  return {
    id: String(event.id),
    name: title,
    short: initials(title),
    category,
    show,
    time: event.start_timestamp ? new Date(Number(event.start_timestamp) * 1000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "Horário a confirmar",
    color: "#3b82f6",
    logoUrl: event.poster,
    competition: decodeText(event.competition),
    description: decodeText(event.description),
    teams: event.teams ? {
      home: event.teams.home ? { name: decodeText(event.teams.home.name), logo: event.teams.home.logo } : undefined,
      away: event.teams.away ? { name: decodeText(event.teams.away.name), logo: event.teams.away.logo } : undefined,
    } : undefined,
    embeds: sanitizeEmbeds(event.embeds),
  };
}

async function requestEvents(status: string): Promise<ApiEvent[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}/sports?status=${status}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const payload = (await response.json()) as ApiResponse<ApiEvent[]>;
    return response.ok && payload.success ? payload.data : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

const findEvent = cache(async (id: string): Promise<Playable | null> => {
  const eventLists = await Promise.all(["live", "upcoming", "finished"].map(requestEvents));
  const event = eventLists.flat().find((item) => String(item.id) === id);
  return event ? normalizeEvent(event) : null;
});

function validImageUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const event = await findEvent(id);
  const title = event ? `${event.name} ao vivo | Pulso TV` : "Evento não encontrado | Pulso TV";
  const description = event ? `Assista ${event.name} e acompanhe a transmissão ao vivo.` : "O evento solicitado não está disponível.";
  const image = validImageUrl(event?.logoUrl);
  const url = `${SITE_URL}/assistir/${encodeURIComponent(id)}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, images: image ? [{ url: image, alt: event?.name }] : [] },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, images: image ? [image] : [] },
  };
}

export default async function EventPage({ params }: PageProps) {
  const { id } = await params;
  const event = await findEvent(id);
  return <PlayerClient channel={event} sectionHref="/agenda" sectionLabel="Agenda" />;
}
