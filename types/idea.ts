export type Idea = {
  id: number;
  title: string;
  theme: string | null;
  language: string | null;
  status: string | null;
  score: number | null;
  views: number | null;
  ctr: number | null;
  rpm: number | null;
  revenue: number | null;
  thumbnail: string | null;
  notes: string | null;
  created_at: string;
};