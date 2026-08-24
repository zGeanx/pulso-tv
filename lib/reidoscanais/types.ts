export type Embed = {
  provider: string;
  quality: string;
  embed_url: string;
};

export type EpgProgram = {
  title: string;
  description?: string;
  formatted_time?: string;
  start_time: number;
  end_time: number;
  image?: string;
};

export type Channel = {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  category: string;
  embeds: Embed[];
  epg?: {
    current?: EpgProgram;
    next?: EpgProgram;
  };
};

export type EventTeam = {
  name: string;
  logo?: string;
};

export type SportsEvent = {
  id: string;
  title: string;
  description?: string;
  poster?: string;
  category: string;
  competition?: string;
  teams?: {
    home: EventTeam;
    away: EventTeam;
  };
  start_time: string;
  start_timestamp: number;
  status: "upcoming" | "live" | "finished";
  popular: boolean;
  embeds: Embed[];
};

export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  total?: number;
  message?: string;
};
