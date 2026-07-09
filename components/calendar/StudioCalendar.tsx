"use client";

import { DragEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  GripVertical,
  Lightbulb,
  Loader2,
  Search,
  Sparkles,
  Target,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Idea } from "@/types/idea";

type Props = {
  ideas: Idea[];
};

type BoardStage =
  | "Idea Pool"
  | "Ready to Plan"
  | "Script"
  | "Thumbnail"
  | "Editing"
  | "Ready to Publish"
  | "Published";

const stages: {
  id: BoardStage;
  title: string;
  description: string;
  color: string;
}[] = [
  {
    id: "Idea Pool",
    title: "Idea Pool",
    description: "Ideas chưa chọn để sản xuất",
    color: "bg-slate-50 border-slate-200 text-slate-700",
  },
  {
    id: "Ready to Plan",
    title: "Ready to Plan",
    description: "Idea đã được chọn từ Review",
    color: "bg-emerald-50 border-emerald-200 text-emerald-700",
  },
  {
    id: "Script",
    title: "Script",
    description: "Đang viết script",
    color: "bg-blue-50 border-blue-200 text-blue-700",
  },
  {
    id: "Thumbnail",
    title: "Thumbnail",
    description: "Đang làm thumbnail",
    color: "bg-amber-50 border-amber-200 text-amber-700",
  },
  {
    id: "Editing",
    title: "Editing",
    description: "Đang edit video",
    color: "bg-purple-50 border-purple-200 text-purple-700",
  },
  {
    id: "Ready to Publish",
    title: "Ready to Publish",
    description: "Sẵn sàng đăng",
    color: "bg-rose-50 border-rose-200 text-rose-700",
  },
  {
    id: "Published",
    title: "Published",
    description: "Đã publish",
    color: "bg-zinc-950 border-zinc-950 text-white",
  },
];

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

function getStage(idea: Idea): BoardStage {
  const status = cleanText(idea.status, "Idea");

  if (
    status === "Ready to Plan" ||
    status === "Script" ||
    status === "Thumbnail" ||
    status === "Editing" ||
    status === "Ready to Publish" ||
    status === "Published"
  ) {
    return status;
  }

  return "Idea Pool";
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

export default function StudioCalendar({
  ideas,
}: Props) {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [draggedIdeaId, setDraggedIdeaId] = useState<number | null>(null);
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

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

  const filteredIdeas = useMemo(() => {
    const text = query.trim().toLowerCase();

    return ideas.filter((idea) => {
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
    });
  }, [
    ideas,
    query,
    priorityFilter,
  ]);

  const groupedIdeas = useMemo(() => {
    const map = new Map<BoardStage, Idea[]>();

    stages.forEach((stage) => {
      map.set(stage.id, []);
    });

    filteredIdeas.forEach((idea) => {
      const stage = getStage(idea);
      map.set(stage, [...(map.get(stage) || []), idea]);
    });

    return map;
  }, [filteredIdeas]);

  async function moveIdeaToStage(ideaId: number, stage: BoardStage) {
    setWorkingId(ideaId);
    setMessage("");

    const nextStatus = stage === "Idea Pool" ? "Idea" : stage;

    const { error } = await supabase
      .from("ideas")
      .update({
        status: nextStatus,
      })
      .eq("id", ideaId);

    if (error) {
      setMessage(error.message);
      setWorkingId(null);
      return;
    }

    setMessage(`Idea moved to ${stage}.`);
    setWorkingId(null);
    router.refresh();
  }

  function handleDragStart(ideaId: number) {
    setDraggedIdeaId(ideaId);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
  }

  function handleDrop(stage: BoardStage) {
    if (!draggedIdeaId) return;

    moveIdeaToStage(draggedIdeaId, stage);
    setDraggedIdeaId(null);
  }

  const readyToPlanCount = groupedIdeas.get("Ready to Plan")?.length || 0;
  const inProductionCount =
    (groupedIdeas.get("Script")?.length || 0) +
    (groupedIdeas.get("Thumbnail")?.length || 0) +
    (groupedIdeas.get("Editing")?.length || 0) +
    (groupedIdeas.get("Ready to Publish")?.length || 0);
  const publishedCount = groupedIdeas.get("Published")?.length || 0;

  return (
    <div className="space-y-6 studioos-readable">
      <div className="rounded-3xl bg-zinc-950 text-white p-7 shadow">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-2 text-sm">
              <CalendarDays size={16} />
              Step 3 · Plan & Execute
            </div>

            <h2 className="text-3xl font-bold mt-4">
              Production planning board
            </h2>

            <p className="text-zinc-300 mt-2 max-w-3xl">
              Kéo thả idea qua các cột để đổi trạng thái sản xuất. Idea từ Review Ideas sẽ xuất hiện ở Ready to Plan.
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm text-zinc-400">
              Drag & drop
            </p>

            <p className="text-2xl font-bold mt-1">
              Enabled
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-3xl border bg-emerald-50 border-emerald-200 p-5">
          <p className="text-sm font-bold text-emerald-700">
            Ready to Plan
          </p>

          <p className="text-3xl font-bold mt-2">
            {readyToPlanCount}
          </p>

          <p className="text-xs text-slate-600 mt-2">
            Ideas vừa được chọn từ Review
          </p>
        </div>

        <div className="rounded-3xl border bg-blue-50 border-blue-200 p-5">
          <p className="text-sm font-bold text-blue-700">
            In Production
          </p>

          <p className="text-3xl font-bold mt-2">
            {inProductionCount}
          </p>

          <p className="text-xs text-slate-600 mt-2">
            Script / Thumbnail / Editing
          </p>
        </div>

        <div className="rounded-3xl border bg-zinc-950 text-white p-5">
          <p className="text-sm text-zinc-400">
            Published
          </p>

          <p className="text-3xl font-bold mt-2">
            {publishedCount}
          </p>

          <p className="text-xs text-zinc-400 mt-2">
            Đã hoàn thành
          </p>
        </div>

        <div className="rounded-3xl border bg-amber-50 border-amber-200 p-5">
          <p className="text-sm font-bold text-amber-700">
            Rule
          </p>

          <p className="text-xl font-bold mt-2">
            Drag cards
          </p>

          <p className="text-xs text-slate-600 mt-2">
            Thả card vào cột mới để đổi status
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow p-5">
        <div className="grid grid-cols-[1fr_220px] gap-3">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search production board by title, cluster, niche, hook..."
              className="w-full border rounded-2xl pl-11 pr-4 py-3 outline-none focus:ring-4 focus:ring-blue-100"
            />
          </div>

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

        {message && (
          <p className="mt-4 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-3 text-sm font-semibold">
            {message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-7 gap-4">
        {stages.map((stage) => {
          const stageIdeas = groupedIdeas.get(stage.id) || [];

          return (
            <div
              key={stage.id}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(stage.id)}
              className="bg-white rounded-3xl border shadow overflow-hidden min-h-[640px]"
            >
              <div className={`p-4 border-b ${stage.color}`}>
                <p className="text-xs font-bold uppercase tracking-wide">
                  {stage.title}
                </p>

                <h3 className="font-bold text-lg mt-2">
                  {stageIdeas.length} ideas
                </h3>

                <p className="text-xs mt-1 opacity-80">
                  {stage.description}
                </p>
              </div>

              <div className="p-3 space-y-3 max-h-[680px] overflow-auto">
                {stageIdeas.map((idea) => {
                  const priority = getPriority(idea);

                  return (
                    <div
                      key={idea.id}
                      draggable
                      onDragStart={() => handleDragStart(idea.id)}
                      className="rounded-2xl border bg-white p-4 hover:shadow-md transition cursor-grab active:cursor-grabbing"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${getPriorityClass(priority)}`}
                        >
                          {priority}
                        </span>

                        {workingId === idea.id ? (
                          <Loader2
                            size={16}
                            className="animate-spin text-slate-400"
                          />
                        ) : (
                          <GripVertical
                            size={16}
                            className="text-slate-400"
                          />
                        )}
                      </div>

                      <p className="font-bold mt-3 leading-5">
                        {idea.title}
                      </p>

                      <p className="text-xs text-slate-500 mt-2">
                        {getCluster(idea)}
                      </p>

                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-3">
                        <Clock size={13} />
                        Updated {formatDate(idea.updated_at || idea.created_at)}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {stages
                          .filter((item) => item.id !== stage.id)
                          .slice(0, 2)
                          .map((nextStage) => (
                            <button
                              key={nextStage.id}
                              onClick={() =>
                                moveIdeaToStage(idea.id, nextStage.id)
                              }
                              className="rounded-xl border px-2 py-2 text-xs font-bold hover:bg-slate-50"
                            >
                              {nextStage.id}
                            </button>
                          ))}
                      </div>
                    </div>
                  );
                })}

                {stageIdeas.length === 0 && (
                  <div className="rounded-2xl border border-dashed p-6 text-center text-slate-400">
                    Drop idea here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-3xl border shadow p-6">
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-amber-600" />

          <h3 className="text-xl font-bold">
            Calendar rule
          </h3>
        </div>

        <p className="text-slate-600 mt-3 leading-7">
          Review Ideas chỉ chọn idea. Calendar mới là nơi sản xuất. Kéo idea qua Ready to Plan, Script, Thumbnail, Editing, Ready to Publish và Published để quản lý flow.
        </p>
      </div>
    </div>
  );
}
