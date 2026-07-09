export type Idea = {
  id: number;
  title: string;
  theme: string | null;
  status: string | null;
  score: number | null;
  created_at: string;
  updated_at: string | null;

  language: string | null;
  views: number | null;
  ctr: number | null;
  rpm: number | null;
  revenue: number | null;

  thumbnail: string | null;
  notes: string | null;
  hook: string | null;
  thumbnail_prompt: string | null;
  storyline: string | null;

  story_pillar?: string | null;
  theme_cluster?: string | null;
  niche?: string | null;
  idea_angle?: string | null;
  idea_formula?: string | null;
  source_type?: string | null;
  source_signal?: string | null;
  priority_level?: string | null;
  parent_path?: string | null;
  visual_color?: string | null;

  source_video_url?: string | null;
  source_video_title?: string | null;
  source_channel_title?: string | null;
  remix_rule?: string | null;
  remix_strategy?: string | null;
};
