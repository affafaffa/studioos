"use client";

import { useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { Idea } from "@/types/idea";
import type { ActiveView } from "@/types/navigation";

type Props = {
  ideas: Idea[];
  onChangeView: (view: ActiveView) => void;
  onHighlightIdea: (ideaId: number) => void;
};

function formatViews(value: number | null) {
  return Number(value || 0).toLocaleString("en-US");
}

export default function Topbar({
  ideas,
  onChangeView,
  onHighlightIdea,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    if (!keyword) return [];

    return ideas
      .filter((idea) => {
        const text = [
          idea.title,
          idea.theme,
          idea.language,
          idea.status,
          idea.notes,
          idea.hook,
          idea.storyline,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return text.includes(keyword);
      })
      .slice(0, 8);
  }, [query, ideas]);

  function handleSelectIdea(idea: Idea) {
    setQuery(idea.title);
    setOpen(false);

    onChangeView("ideas");

    setTimeout(() => {
      onHighlightIdea(idea.id);
    }, 100);

    inputRef.current?.blur();
  }

  function handleClear() {
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  }

  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-8">
      <div className="relative w-[520px]">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              setTimeout(() => {
                setOpen(false);
              }, 150);
            }}
            placeholder="Search ideas..."
            className="w-full border rounded-xl pl-11 pr-10 py-3 outline-none focus:ring-2 focus:ring-zinc-900/10"
          />

          {query && (
            <button
              onMouseDown={(event) => event.preventDefault()}
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {open && query.trim() && (
          <div className="absolute top-full left-[252px] right-0 mt-2 bg-white border rounded-2xl shadow-xl z-50 overflow-hidden">
            {results.length > 0 ? (
              <div className="max-h-96 overflow-auto">
                {results.map((idea) => (
                  <button
                    key={idea.id}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      handleSelectIdea(idea);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0"
                  >
                    <div className="font-medium">
                      {idea.title}
                    </div>

                    <div className="text-xs text-gray-500 mt-1">
                      ID #{idea.id} · {idea.theme || "-"} · {idea.language || "-"} · {idea.status || "Idea"} · {formatViews(idea.views)} views
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-4 py-4 text-sm text-gray-500">
                No ideas found.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="font-semibold">
        Loan
      </div>
    </header>
  );
}