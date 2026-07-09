"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { ActiveView } from "@/types/navigation";

type Props = {
  activeView: ActiveView;
};

const placeholders: Record<ActiveView, string> = {
  dashboard: "Search dashboard...",
  ideas: "Search ideas, clusters, niches...",
  competitors: "Search competitors, channels, keywords...",
  analyst: "Search analyst insights...",
  ai: "Search AI tools...",
  calendar: "Search calendar plans...",
  settings: "Search settings...",
};

export default function Topbar({
  activeView,
}: Props) {
  const [query, setQuery] = useState("");

  const placeholder = useMemo(() => {
    return placeholders[activeView] || "Search StudioOS...";
  }, [activeView]);

  function handleChange(value: string) {
    setQuery(value);

    window.dispatchEvent(
      new CustomEvent("studioos-global-search-change", {
        detail: {
          query: value,
          activeView,
        },
      })
    );
  }

  return (
    <header className="h-16 bg-white border-b fixed top-0 left-[252px] right-0 z-30 flex items-center justify-between px-6">
      <div className="relative w-[520px]">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          value={query}
          onChange={(event) => handleChange(event.target.value)}
          placeholder={placeholder}
          className="w-full border rounded-2xl pl-11 pr-4 py-3 outline-none focus:ring-4 focus:ring-blue-100"
        />
      </div>

      <div className="font-bold text-zinc-900">
        Loan
      </div>
    </header>
  );
}
