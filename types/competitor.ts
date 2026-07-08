export type CompetitorGroup = {
  id: number;
  name: string;
  category: string | null;
  description: string | null;
  priority: number | null;
  created_at: string;
  updated_at: string | null;
};

export type CompetitorChannel = {
  id: number;
  group_id: number | null;
  channel_name: string;
  channel_url: string | null;
  youtube_channel_id: string | null;
  niche: string | null;
  language: string | null;
  country: string | null;
  status: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
};