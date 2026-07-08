import AppShell from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabase";
import type { Idea } from "@/types/idea";
import type { Video } from "@/types/video";

export default async function Home() {
  const [ideasResult, videosResult] = await Promise.all([
    supabase
      .from("ideas")
      .select("*")
      .order("updated_at", { ascending: false }),

    supabase
      .from("videos")
      .select("*")
      .order("updated_at", { ascending: false }),
  ]);

  if (ideasResult.error || videosResult.error) {
    return (
      <main className="p-10">
        <h1 className="text-2xl font-bold text-red-600">
          Supabase Error
        </h1>

        <p className="mt-4">
          {ideasResult.error?.message ||
            videosResult.error?.message}
        </p>
      </main>
    );
  }

  const ideas = (ideasResult.data || []) as Idea[];
  const videos = (videosResult.data || []) as Video[];

  return <AppShell ideas={ideas} videos={videos} />;
}