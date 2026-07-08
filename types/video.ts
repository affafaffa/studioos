export type Video = {
  id: number;
  idea_id: number | null;
  title: string;
  channel: string | null;
  status: string | null;
  owner: string | null;
  publish_date: string | null;
  youtube_url: string | null;
  views: number | null;
  ctr: number | null;
  rpm: number | null;
  revenue: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
};