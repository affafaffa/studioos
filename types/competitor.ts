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

  channel_description: string | null;
  channel_thumbnail_url: string | null;
  subscriber_count: number | null;
  channel_view_count: number | null;
  video_count: number | null;
  uploads_playlist_id: string | null;
  last_synced_at: string | null;
  sync_status: string | null;
  sync_error: string | null;
  raw_metadata: Record<string, unknown> | null;

  created_at: string;
  updated_at: string | null;
};

export type CompetitorVideo = {
  id: number;
  competitor_channel_id: number | null;
  group_id: number | null;

  youtube_video_id: string;
  video_url: string | null;

  title: string;
  description: string | null;
  channel_title: string | null;
  published_at: string | null;

  thumbnail_url: string | null;
  thumbnail_default_url: string | null;
  thumbnail_medium_url: string | null;
  thumbnail_high_url: string | null;
  thumbnail_standard_url: string | null;
  thumbnail_maxres_url: string | null;

  duration: string | null;
  category_id: string | null;
  tags: string[] | null;

  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;

  theme: string | null;
  idea_type: string | null;
  hook_type: string | null;
  title_formula: string | null;
  thumbnail_style: string | null;
  ai_summary: string | null;
  performance_score: number | null;

  raw_snippet: Record<string, unknown> | null;
  raw_statistics: Record<string, unknown> | null;
  raw_content_details: Record<string, unknown> | null;

  last_synced_at: string | null;
  created_at: string;
  updated_at: string | null;
};

export type CompetitorVideoSnapshot = {
  id: number;
  competitor_video_id: number | null;
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  captured_at: string;
};