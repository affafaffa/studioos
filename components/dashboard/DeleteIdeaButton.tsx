"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Props = {
  ideaId: number;
  title: string;
};

export default function DeleteIdeaButton({ ideaId, title }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete this idea?\n\n${title}`
    );

    if (!confirmed) return;

    setLoading(true);

    const { error } = await supabase
      .from("ideas")
      .delete()
      .eq("id", ideaId);

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="inline-flex items-center gap-2 text-red-600 hover:text-red-800 disabled:opacity-50"
    >
      <Trash2 size={16} />
      {loading ? "Deleting..." : "Delete"}
    </button>
  );
}