import AppShell from "@/components/layout/AppShell";
import { supabase } from "@/lib/supabase";
import type { Idea } from "@/types/idea";

export default async function Home() {
  const { data, error } = await supabase
    .from("ideas")
    .select("*")
    .order("updated_at", { ascending: false });

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

  const ideas = (data || []) as Idea[];

  return <AppShell ideas={ideas} />;
}