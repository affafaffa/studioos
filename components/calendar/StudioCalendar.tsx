"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Crown,
  Lightbulb,
  Search,
  Sparkles,
  Target,
} from "lucide-react";
import type { Idea } from "@/types/idea";

type Props = {
  ideas: Idea[];
};

function cleanText(value: unknown, fallback: string) {
  const text = String(value || "").trim();

  return text || fallback;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function getPriority(idea: Idea) {
  const explicit = cleanText(idea.priority_level, "");

  if (explicit) return explicit;

  const score = Number(idea.score || 0);

  if (score >= 90) return "Focus";
  if (score >= 75) return "Test";

  return "Backlog";
}

function getCluster(idea: Idea) {
  return cleanText(
    idea.theme_cluster,
    cleanText(idea.theme, "General Story")
  );
}

function getNiche(idea: Idea) {
  return cleanText(idea.niche, "General Niche");
}

function getPriorityClass(priority: string) {
  if (priority === "Focus") {
    return "bg-rose-600 text-white";
  }

  if (priority === "Test") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-slate-100 text-slate-700";
}

function getStatusClass(status: string | null | undefined) {
  const value = cleanText(status, "Idea");

  if (value === "Published") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (value === "Testing") {
    return "bg-purple-100 text-purple-700";
  }

  if (value === "Draft") {
    return "bg-blue-100 text-blue-700";
  }

  return "bg-slate-100 text-slate-700";
}

export default function StudioCalendar({
  ideas,
}: Props) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  useEffect(() => {
    function handleGlobalSearch(event: Event) {
      const customEvent = event as CustomEvent<{
        query?: string;
        activeView?: string;
      }>;

      if (customEvent.detail?.activeView === "calendar") {
        setQuery(customEvent.detail.query || "");
      }
    }

    window.addEventListener(
      "studioos-global-search-change",
      handleGlobalSearch
    );

    return () => {
      window.removeEventListener(
        "studioos-global-search-change",
        handleGlobalSearch
      );
    };
  }, []);

  const sortedIdeas = useMemo(() => {
    const text = query.trim().toLowerCase();

    return [...ideas]
      .filter((idea) => {
        if (statusFilter && (idea.status || "Idea") !== statusFilter) {
          return false;
        }

        if (priorityFilter && getPriority(idea) !== priorityFilter) {
          return false;
        }

        if (!text) return true;

        return (
          idea.title.toLowerCase().includes(text) ||
          getCluster(idea).toLowerCase().includes(text) ||
          getNiche(idea).toLowerCase().includes(text) ||
          String(idea.hook || "").toLowerCase().includes(text)
        );
      })
      .sort((a, b) => {
        return (
          new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime()
        );
      });
  }, [
    ideas,
    query,
    statusFilter,
    priorityFilter,
  ]);

  const focusIdeas = sortedIdeas.filter(
    (idea) => getPriority(idea) === "Focus"
  );

  const draftIdeas = sortedIdeas.filter(
    (idea) => idea.status === "Draft"
  );

  const testingIdeas = sortedIdeas.filter(
    (idea) => idea.status === "Testing"
  );

  const publishedIdeas = sortedIdeas.filter(
    (idea) => idea.status === "Published"
  );

  const columns = [
    {
      title: "Focus",
      description: "Ideas nên ưu tiên triển khai",
      ideas: focusIdeas,
      icon: Crown,
      bg: "bg-rose-50",
      border: "border-rose-200",
      text: "text-rose-700",
    },
    {
      title: "Draft",
      description: "Ideas đang chuẩn bị",
      ideas: draftIdeas,
      icon: Lightbulb,
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-700",
    },
    {
      title: "Testing",
      description: "Ideas đang test",
      ideas: testingIdeas,
      icon: Target,
      bg: "bg-purple-50",
      border: "border-purple-200",
      text: "text-purple-700",
    },
    {
      title: "Published",
      description: "Ideas đã publish",
      ideas: publishedIdeas,
      icon: CheckCircle2,
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-700",
    },
  ];

  return (
    <div className="space-y-6 studioos-readable">
      <div className="rounded-3xl bg-zinc-950 text-white p-7 shadow">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-2 text-sm">
              <CalendarDays size={16} />
              Content Calendar
            </div>

            <h2 className="text-3xl font-bold mt-4">
              Planning calendar
            </h2>

            <p className="text-zinc-300 mt-2 max-w-3xl">
              Dùng Calendar để nhìn idea theo trạng thái sản xuất: Focus, Draft, Testing và Published.
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm text-zinc-400">
              Visible plans
            </p>

            <p className="text-3xl font-bold mt-1">
              {sortedIdeas.length.toLocaleString("en-US")}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow p-5">
        <div className="grid grid-cols-[1fr_220px_220px] gap-3">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search calendar plans by title, cluster, niche, hook..."
              className="w-full border rounded-2xl pl-11 pr-4 py-3 outline-none focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="border rounded-2xl px-4 py-3"
          >
            <option value="">All Status</option>
            <option value="Idea">Idea</option>
            <option value="Draft">Draft</option>
            <option value="Testing">Testing</option>
            <option value="Published">Published</option>
            <option value="Archived">Archived</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value)}
            className="border rounded-2xl px-4 py-3"
          >
            <option value="">All Priorities</option>
            <option value="Focus">Focus</option>
            <option value="Test">Test</option>
            <option value="Backlog">Backlog</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {columns.map((column) => {
          const Icon = column.icon;

          return (
            <div
              key={column.title}
              className={`rounded-3xl border p-5 ${column.bg} ${column.border}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className={`text-sm font-bold ${column.text}`}>
                    {column.title}
                  </p>

                  <p className="text-3xl font-bold text-zinc-950 mt-2">
                    {column.ideas.length.toLocaleString("en-US")}
                  </p>

                  <p className="text-xs text-slate-600 mt-2">
                    {column.description}
                  </p>
                </div>

                <div className="w-12 h-12 rounded-2xl bg-zinc-950 text-white flex items-center justify-center">
                  <Icon size={22} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-4 gap-4">
        {columns.map((column) => (
          <div
            key={column.title}
            className="bg-white rounded-3xl border shadow overflow-hidden"
          >
            <div className={`p-5 border-b ${column.bg}`}>
              <p className={`text-xs font-bold uppercase tracking-wide ${column.text}`}>
                {column.title}
              </p>

              <h3 className="font-bold text-xl mt-2">
                {column.description}
              </h3>
            </div>

            <div className="p-4 space-y-3 max-h-[680px] overflow-auto">
              {column.ideas.slice(0, 30).map((idea) => {
                const priority = getPriority(idea);

                return (
                  <div
                    key={idea.id}
                    className="rounded-2xl border p-4 hover:shadow-sm transition"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${getPriorityClass(priority)}`}>
                        {priority}
                      </span>

                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(idea.status)}`}>
                        {idea.status || "Idea"}
                      </span>
                    </div>

                    <p className="font-bold mt-3 leading-5">
                      {idea.title}
                    </p>

                    <p className="text-xs text-slate-500 mt-2">
                      {getCluster(idea)} / {getNiche(idea)}
                    </p>

                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-3">
                      <Clock size={13} />
                      Updated {formatDate(idea.updated_at || idea.created_at)}
                    </div>
                  </div>
                );
              })}

              {column.ideas.length === 0 && (
                <div className="rounded-2xl border border-dashed p-8 text-center text-slate-500">
                  No items.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl border shadow p-6">
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-amber-600" />

          <h3 className="text-xl font-bold">
            Calendar rule
          </h3>
        </div>

        <p className="text-slate-600 mt-3 leading-7">
          Calendar hiện đang dùng trạng thái của Idea Bank để lập kế hoạch. Khi idea được mark Focus, Draft, Testing hoặc Published, nó sẽ tự xuất hiện ở đúng cột tương ứng.
        </p>
      </div>
    </div>
  );
}
