import AppShell from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabase";
import type { Idea } from "@/types/idea";
import type { Video } from "@/types/video";
import type {
  CompetitorChannel,
  CompetitorGroup,
} from "@/types/competitor";

export default async function Home() {
  const [
    ideasResult,
    videosResult,
    competitorGroupsResult,
    competitorChannelsResult,
  ] = await Promise.all([
    supabase
      .from("ideas")
      .select("*")
      .order("updated_at", { ascending: false }),

    supabase
      .from("videos")
      .select("*")
      .order("updated_at", { ascending: false }),

    supabase
      .from("competitor_groups")
      .select("*")
      .order("priority", { ascending: false }),

    supabase
      .from("competitor_channels")
      .select("*")
      .order("updated_at", { ascending: false }),
  ]);

  const error =
    ideasResult.error ||
    videosResult.error ||
    competitorGroupsResult.error ||
    competitorChannelsResult.error;

  if (error) {
    return (
      <main className="p-10">
        <h1 className="text-2xl font-bold text-red-600">
          Supabase Error
        </h1>

        <p className="mt-4">{error.message}</p>
      </main>
    );
  }

  const ideas = (ideasResult.data || []) as Idea[];
  const videos = (videosResult.data || []) as Video[];

  const competitorGroups =
    (competitorGroupsResult.data || []) as CompetitorGroup[];

  const competitorChannels =
    (competitorChannelsResult.data || []) as CompetitorChannel[];

  return (
    <AppShell
      ideas={ideas}
      videos={videos}
      competitorGroups={competitorGroups}
      competitorChannels={competitorChannels}
    />
  );
}