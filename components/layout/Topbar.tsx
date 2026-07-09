"use client";

import { useMemo, useState } from "react";
import {
  LogOut,
  Menu,
  Search,
} from "lucide-react";
import type { ActiveView } from "@/types/navigation";

type Props = {
  activeView: ActiveView;
  onOpenMobileMenu?: () => void;
};

const placeholders: Record<ActiveView, string> = {
  dashboard: "Search dashboard...",
  ideas: "Search ideas...",
  competitors: "Search competitors...",
  analyst: "Search insights...",
  ai: "Search AI tools...",
  calendar: "Search plans...",
  settings: "Search settings...",
};

export default function Topbar({
  activeView,
  onOpenMobileMenu,
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

  async function handleLogout() {
    await fetch("/api/logout", {
      method: "POST",
    });

    window.location.href = "/login";
  }

  return (
    <header className="h-16 bg-white border-b fixed top-0 left-0 lg:left-[252px] right-0 z-30 flex items-center justify-between px-3 sm:px-4 lg:px-6 gap-2 sm:gap-3">
      <button
        onClick={onOpenMobileMenu}
        className="lg:hidden w-10 h-10 rounded-2xl border flex items-center justify-center bg-white shrink-0"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      <div className="relative flex-1 max-w-[520px] min-w-0">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          value={query}
          onChange={(event) => handleChange(event.target.value)}
          placeholder={placeholder}
          className="w-full border rounded-2xl pl-10 pr-3 py-2.5 sm:py-3 outline-none focus:ring-4 focus:ring-blue-100 text-zinc-950"
        />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden sm:block font-bold text-zinc-900">
          Loan
        </div>

        <button
          onClick={handleLogout}
          className="rounded-2xl border px-3 sm:px-4 py-2 font-bold text-sm flex items-center gap-2 hover:bg-slate-50"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
