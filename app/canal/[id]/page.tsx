import type { Metadata } from "next";
import PlayerClient, { type Playable } from "./player-client";

const API_URL = "https://api.reidoscanais.st";
const SITE_URL = "https://pulso-tv-ao-vivo.zgeanx.chatgpt.site";

type Embed = Playable["embeds"][number];

type ApiChannel = {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  category?: string;
  embeds?: Embed[];
  epg?: {
    current?: {
      title: string;
      formatted_time?: string;
      image?: string;
    };
  };
};

type ApiEvent = {
  id: string;
  title: string;
  description?: string;
  poster?: string;
  category?: string;
  competition?: string;
  start_timestamp: number;
  embeds?: Embed[];
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

type PageProps = {
  params: Promise<{ id: string }>;
};

const categoryColors: Record<string, string> = {
  Esportes: "#2f7dff",
  Futebol: "#2f7dff",
  "Filmes e Séries": "#ff6b4a",
  Notícias: "#46e0a9",
  Infantil: "#f8c84a",
  Documentários: "#a57cff",
  Entretenimento: "#44b8ff",
  "Canais Abertos": "#00c7b7",
};

function getInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
}

function formatEventTime(timestamp: number) {
  if (!timestamp) return "Horário a confirmar";
  return new Date(Number(timestamp) * 1000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function normalizeChannel(channel: ApiChannel): Playable {
  const category = channel.category || "Outros";
  return {
    id: String(channel.id),
    name: channel.name,
    short: getInitials(channel.name),
    category,
    show: channel.epg?.current?.title || channel.description || "Programação indisponível",
    time: channel.epg?.current?.formatted_time || "Horário não informado",
    color: categoryColors[category] ?? "#2f7dff",
    logoUrl: channel.logo_url || channel.epg?.current?.image,
    description: channel.description || channel.epg?.current?.title,
    embeds: channel.embeds ?? [],
  };
}

function normalizeEvent(event: ApiEvent): Playable {
  const category = event.category || "Esportes";
  return {
    id: String(event.id),
    name: event.title,
    short: getInitials(event.title),
    category,
    show: event.description || event.competition || category,
    time: formatEventTime(event.start_timestamp),
    color: categoryColors[category] ?? "#2f7dff",
    logoUrl: event.poster,
    competition: event.competition,
    description: event.description,
    embeds: event.embeds ?? [],
  };
}

async function requestApi<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_URL}${path}`, { headers: { Accept: "application/json" }, cache: "no-store" });
    const payload = (await response.json()) as ApiResponse<T>;
    return response.ok && payload.success ? payload.data : null;
  } catch {
    return null;
  }
}

async function findPlayable(id: string): Promise<Playable | null> {
  const [channels, liveEvents, upcomingEvents] = await Promise.all([
    requestApi<ApiChannel[]>("/channels"),
    requestApi<ApiEvent[]>("/sports?status=live"),
    requestApi<ApiEvent[]>("/sports?status=upcoming"),
  ]);

  const channel = channels?.find((item) => String(item.id) === id);
  if (channel) return normalizeChannel(channel);

  const event = [...(liveEvents ?? []), ...(upcomingEvents ?? [])].find((item) => String(item.id) === id);
  return event ? normalizeEvent(event) : null;
}

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
  const channel = await findPlayable(id);
  const title = channel ? `${channel.name} ao vivo | Pulso TV` : "Canal não encontrado | Pulso TV";
  const description = channel ? `Assista ${channel.name} ao vivo e acompanhe ${channel.show}.` : "O canal solicitado não está disponível.";
  const image = validImageUrl(channel?.logoUrl);

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/canal/${encodeURIComponent(id)}` },
    openGraph: { title, description, url: `${SITE_URL}/canal/${encodeURIComponent(id)}`, images: image ? [{ url: image, alt: channel?.name }] : [] },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, images: image ? [image] : [] },
  };
}

export default async function ChannelPage({ params }: PageProps) {
  const { id } = await params;
  const channel = await findPlayable(id);
  return <PlayerClient channel={channel} />;
}
