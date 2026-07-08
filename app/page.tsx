import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import Dashboard from "@/components/dashboard/Dashboard";
import { supabase } from "@/lib/supabase";
import type { Idea } from "@/types/idea";

export default async function Home() {
  const { data, error } = await supabase
    .from("ideas")
    .select("*")
    .order("created_at", { ascending: false });

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

  return (
    <main className="flex h-screen bg-gray-100">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />

        <div className="flex-1 overflow-auto">
          <Dashboard ideas={ideas} />
        </div>
      </div>
    </main>
  );
}