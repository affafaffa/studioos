"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Copy,
  Eye,
  Flame,
  Lightbulb,
  Loader2,
  Search,
  Target,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Idea } from "@/types/idea";

type Props = {
  ideas: Idea[];
  highlightedIdeaId?: number | null;
  onOpenCalendar?: () => void;
};

type ReviewIdea = Idea & {
  clusterLabel: string;
  nicheLabel: string;
  priorityLabel: string;
};

function cleanText(value: unknown, fallback: string) {
  const text = String(value || "").trim();

  return text || fallback;
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
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

function getScore(idea: Idea) {
  return Number(idea.score || 0);
}

function getCluster(idea: Idea) {
  const explicit = cleanText(idea.theme_cluster, "");

  if (explicit) return explicit;

  const title = idea.title.toLowerCase();

  if (title.includes("poor") && title.includes("rich")) return "Poor vs Rich";
  if (title.includes("makeover")) return "Makeover";
  if (title.includes("adopt")) return "Adopted";
  if (title.includes("huntrix") || title.includes("demon")) return "K-pop Demon Hunters";
  if (title.includes("mermaid")) return "Mermaid";
  if (title.includes("school")) return "School Drama";

  return cleanText(idea.theme, "General Story");
}

function getNiche(idea: Idea) {
  const explicit = cleanText(idea.niche, "");

  if (explicit) return explicit;

  const title = idea.title.toLowerCase();

  if (title.includes("giga rich")) return "Poor vs Rich vs Giga Rich";
  if (title.includes("fashion contest")) return "Fashion Contest";
  if (title.includes("ballet contest")) return "Ballet Contest";
  if (title.includes("princess")) return "Princess Transformation";
  if (title.includes("school")) return "School Setting";
  if (title.includes("family")) return "Family Drama";
  if (title.includes("mermaid")) return "Mermaid Transformation";

  return cleanText(idea.theme, "General Niche");
}

function getPriority(idea: Idea) {
  const explicit = cleanText(idea.priority_level, "");

  if (explicit) return explicit;

  const score = getScore(idea);

  if (score >= 90) return "Focus";
  if (score >= 75) return "Test";

  return "Backlog";
}

function enrichIdea(idea: Idea): ReviewIdea {
  return {
    ...idea,
    clusterLabel: getCluster(idea),
    nicheLabel: getNiche(idea),
    priorityLabel: getPriority(idea),
  };
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

  if (value === "Ready to Plan") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (
    value === "Script" ||
    value === "Thumbnail" ||
    value === "Editing" ||
    value === "Ready to Publish"
  ) {
    return "bg-blue-100 text-blue-700";
  }

  if (value === "Published") {
    return "bg-zinc-950 text-white";
  }

  return "bg-slate-100 text-slate-700";
}

function isPlanned(idea: Idea) {
  return [
    "Ready to Plan",
    "Script",
    "Thumbnail",
    "Editing",
    "Ready to Publish",
    "Published",
  ].includes(cleanText(idea.status, "Idea"));
}

function buildBrief(idea: ReviewIdea) {
  return [
    `Title: ${idea.title}`,
    `Path: ${cleanText(idea.story_pillar, "Story")} / ${idea.clusterLabel} / ${idea.nicheLabel}`,
    `Priority: ${idea.priorityLabel}`,
    `Status: ${idea.status || "Idea"}`,
    `Score: ${getScore(idea)}`,
    ``,
    `Hook:`,
    idea.hook || "-",
    ``,
    `Thumbnail Prompt:`,
    idea.thumbnail_prompt || "-",
    ``,
    `Storyline:`,
    idea.storyline || "-",
    ``,
    `Notes:`,
    idea.notes || "-",
  ].join("\n");
}

function ReviewCard({
  idea,
  highlighted,
  working,
  onView,
  onPlan,
  onOpenCalendar,
}: {
  idea: ReviewIdea;
  highlighted: boolean;
  working: boolean;
  onView: () => void;
  onPlan: () => void;
  onOpenCalendar?: () => void;
}) {
  const planned = isPlanned(idea);

  return (
    <div
      className={`rounded-3xl border bg-white p-5 transition hover:shadow-md ${
        highlighted
          ? "border-amber-400 ring-4 ring-amber-100"
          : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${getPriorityClass(idea.priorityLabel)}`}
            >
              {idea.priorityLabel}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(idea.status)}`}
            >
              {idea.status || "Idea"}
            </span>

            <span className="rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-xs font-bold">
              Score {getScore(idea)}
            </span>
          </div>

          <h3 className="font-bold text-lg mt-4 leading-6 text-zinc-950">
            {idea.title}
          </h3>

          <p className="text-xs text-slate-500 mt-2">
            {idea.clusterLabel} / {idea.nicheLabel}
          </p>
        </div>
      </div>

      {idea.hook && (
        <div className="rounded-2xl bg-slate-50 border p-4 mt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-rose-700">
            Hook
          </p>

          <p className="text-sm text-slate-700 mt-2 line-clamp-3">
            {idea.hook}
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="rounded-2xl bg-slate-50 border p-3">
          <p className="text-xs text-slate-500">
            Source
          </p>

          <p className="font-bold mt-1 truncate">
            {idea.source_type || "Manual"}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 border p-3">
          <p className="text-xs text-slate-500">
            Updated
          </p>

          <p className="font-bold mt-1">
            {formatDate(idea.updated_at || idea.created_at)}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 border p-3">
          <p className="text-xs text-slate-500">
            Views
          </p>

          <p className="font-bold mt-1">
            {formatNumber(Number(idea.views || 0))}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t">
        <button
          onClick={onView}
          className="inline-flex items-center gap-2 text-blue-700 font-bold text-sm"
        >
          <Eye size={16} />
          View brief
        </button>

        {planned ? (
          <button
            onClick={onOpenCalendar}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 text-white px-4 py-3 font-bold text-sm"
          >
            <CalendarDays size={16} />
            Open Calendar
          </button>
        ) : (
          <button
            onClick={onPlan}
            disabled={working}
            className="inline-flex items-center gap-2 rounded-2xl bg-zinc-950 text-white px-4 py-3 font-bold text-sm disabled:opacity-50"
          >
            {working ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CalendarDays size={16} />
            )}
            Plan this idea
          </button>
        )}
      </div>
    </div>
  );
}

export default function IdeaBank({
  ideas,
  highlightedIdeaId = null,
  onOpenCalendar,
}: Props) {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedIdea, setSelectedIdea] = useState<ReviewIdea | null>(null);
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const enrichedIdeas = useMemo(() => {
    return ideas.map(enrichIdea);
  }, [ideas]);

  const filteredIdeas = useMemo(() => {
    const text = query.trim().toLowerCase();

    return enrichedIdeas
      .filter((idea) => {
        if (priorityFilter && idea.priorityLabel !== priorityFilter) {
          return false;
        }

        if (statusFilter) {
          if (statusFilter === "Not Planned" && isPlanned(idea)) {
            return false;
          }

          if (statusFilter === "Planned" && !isPlanned(idea)) {
            return false;
          }
        }

        if (!text) return true;

        return (
          idea.title.toLowerCase().includes(text) ||
          idea.clusterLabel.toLowerCase().includes(text) ||
          idea.nicheLabel.toLowerCase().includes(text) ||
          String(idea.hook || "").toLowerCase().includes(text) ||
          String(idea.storyline || "").toLowerCase().includes(text)
        );
      })
      .sort((a, b) => {
        const plannedA = isPlanned(a) ? 1 : 0;
        const plannedB = isPlanned(b) ? 1 : 0;

        if (plannedA !== plannedB) {
          return plannedA - plannedB;
        }

        return getScore(b) - getScore(a);
      });
  }, [
    enrichedIdeas,
    query,
    priorityFilter,
    statusFilter,
  ]);

  const notPlannedIdeas = enrichedIdeas.filter((idea) => !isPlanned(idea));
  const plannedIdeas = enrichedIdeas.filter((idea) => isPlanned(idea));
  const focusIdeas = notPlannedIdeas.filter(
    (idea) => idea.priorityLabel === "Focus"
  );

  const recommendedIdeas = [...notPlannedIdeas]
    .sort((a, b) => getScore(b) - getScore(a))
    .slice(0, 3);

  async function planIdea(idea: ReviewIdea) {
    setWorkingId(idea.id);
    setMessage("");

    const { error } = await supabase
      .from("ideas")
      .update({
        status: "Ready to Plan",
        priority_level: idea.priorityLabel || "Test",
      })
      .eq("id", idea.id);

    if (error) {
      setMessage(error.message);
      setWorkingId(null);
      return;
    }

    setMessage(
      `"${idea.title}" was moved to Calendar → Ready to Plan.`
    );

    setWorkingId(null);
    router.refresh();
  }

  async function copyBrief(idea: ReviewIdea) {
    await navigator.clipboard.writeText(buildBrief(idea));
    setMessage("Copied idea brief.");
  }

  return (
    <div className="space-y-6 studioos-readable">
      <div className="rounded-3xl bg-zinc-950 text-white p-7 shadow">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-2 text-sm">
              <Lightbulb size={16} />
              Step 2 · Review
            </div>

            <h2 className="text-3xl font-bold mt-4">
              Review ideas and choose what to plan
            </h2>

            <p className="text-zinc-300 mt-2 max-w-3xl">
              Mục này chỉ dùng để chọn idea đáng làm. Idea nào đủ tốt thì bấm Plan this idea, nó sẽ chuyển sang Calendar ở cột Ready to Plan.
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm text-zinc-400">
              Main action
            </p>

            <p className="text-2xl font-bold mt-1">
              Plan this idea
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-3xl border bg-rose-50 border-rose-200 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-rose-700">
                Need Review
              </p>

              <p className="text-3xl font-bold mt-2">
                {notPlannedIdeas.length}
              </p>

              <p className="text-xs text-slate-600 mt-2">
                Ideas chưa được đưa sang Calendar
              </p>
            </div>

            <Flame className="text-rose-700" />
          </div>
        </div>

        <div className="rounded-3xl border bg-amber-50 border-amber-200 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-amber-700">
                Focus Candidates
              </p>

              <p className="text-3xl font-bold mt-2">
                {focusIdeas.length}
              </p>

              <p className="text-xs text-slate-600 mt-2">
                Nên xem trước
              </p>
            </div>

            <Target className="text-amber-700" />
          </div>
        </div>

        <div className="rounded-3xl border bg-emerald-50 border-emerald-200 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-emerald-700">
                Planned
              </p>

              <p className="text-3xl font-bold mt-2">
                {plannedIdeas.length}
              </p>

              <p className="text-xs text-slate-600 mt-2">
                Đã chuyển sang Calendar
              </p>
            </div>

            <CheckCircle2 className="text-emerald-700" />
          </div>
        </div>

        <button
          onClick={onOpenCalendar}
          className="rounded-3xl border bg-zinc-950 text-white p-5 text-left hover:bg-zinc-800"
        >
          <p className="text-sm text-zinc-400">
            Next Step
          </p>

          <p className="text-2xl font-bold mt-2">
            Open Calendar
          </p>

          <p className="text-xs text-zinc-400 mt-2">
            Kéo thả idea qua các cột sản xuất
          </p>
        </button>
      </div>

      {recommendedIdeas.length > 0 && (
        <div className="bg-white rounded-3xl border shadow p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 text-amber-700 px-3 py-1 text-xs font-bold">
                <Flame size={14} />
                Recommended Queue
              </div>

              <h3 className="text-xl font-bold mt-3">
                Start with these ideas
              </h3>

              <p className="text-sm text-slate-600 mt-1">
                Đây là 3 idea có score cao nhất chưa được plan.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-5">
            {recommendedIdeas.map((idea) => (
              <div
                key={idea.id}
                className="rounded-2xl border bg-slate-50 p-4"
              >
                <p className="font-bold leading-5">
                  {idea.title}
                </p>

                <p className="text-xs text-slate-500 mt-2">
                  {idea.clusterLabel} / {idea.nicheLabel}
                </p>

                <button
                  onClick={() => planIdea(idea)}
                  disabled={workingId === idea.id}
                  className="mt-4 rounded-xl bg-zinc-950 text-white px-4 py-2 text-sm font-bold disabled:opacity-50"
                >
                  Plan this idea
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
              placeholder="Search ideas by title, cluster, niche, hook..."
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

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="border rounded-2xl px-4 py-3"
          >
            <option value="">All Planning Status</option>
            <option value="Not Planned">Not Planned</option>
            <option value="Planned">Planned</option>
          </select>
        </div>

        {message && (
          <p className="mt-4 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-3 text-sm font-semibold">
            {message}
          </p>
        )}
      </div>

      <div className="bg-white rounded-3xl border shadow overflow-hidden">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">
              Review Queue
            </h3>

            <p className="text-sm text-slate-600 mt-1">
              Mỗi card chỉ có một action chính: Plan this idea.
            </p>
          </div>

          <p className="text-sm text-slate-500">
            {filteredIdeas.length} ideas
          </p>
        </div>

        <div className="p-6 grid grid-cols-3 gap-5">
          {filteredIdeas.map((idea) => (
            <ReviewCard
              key={idea.id}
              idea={idea}
              highlighted={highlightedIdeaId === idea.id}
              working={workingId === idea.id}
              onView={() => setSelectedIdea(idea)}
              onPlan={() => planIdea(idea)}
              onOpenCalendar={onOpenCalendar}
            />
          ))}

          {filteredIdeas.length === 0 && (
            <div className="col-span-3 rounded-3xl border border-dashed p-10 text-center text-slate-500">
              No ideas match this review view.
            </div>
          )}
        </div>
      </div>

      {selectedIdea && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                  Idea Brief
                </p>

                <h2 className="text-2xl font-bold mt-2">
                  {selectedIdea.title}
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  {selectedIdea.clusterLabel} / {selectedIdea.nicheLabel}
                </p>
              </div>

              <button
                onClick={() => setSelectedIdea(null)}
                className="w-10 h-10 rounded-2xl border flex items-center justify-center hover:bg-slate-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-2xl border p-4">
                  <p className="text-xs text-slate-500">Priority</p>
                  <p className="font-bold mt-1">{selectedIdea.priorityLabel}</p>
                </div>

                <div className="rounded-2xl border p-4">
                  <p className="text-xs text-slate-500">Status</p>
                  <p className="font-bold mt-1">{selectedIdea.status || "Idea"}</p>
                </div>

                <div className="rounded-2xl border p-4">
                  <p className="text-xs text-slate-500">Score</p>
                  <p className="font-bold mt-1">{getScore(selectedIdea)}</p>
                </div>
              </div>

              <div className="rounded-2xl border p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-rose-700">
                  Hook
                </p>

                <p className="text-slate-700 mt-3 whitespace-pre-wrap">
                  {selectedIdea.hook || "-"}
                </p>
              </div>

              <div className="rounded-2xl border p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                  Thumbnail Prompt
                </p>

                <p className="text-slate-700 mt-3 whitespace-pre-wrap">
                  {selectedIdea.thumbnail_prompt || "-"}
                </p>
              </div>

              <div className="rounded-2xl border p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                  Storyline
                </p>

                <p className="text-slate-700 mt-3 whitespace-pre-wrap">
                  {selectedIdea.storyline || "-"}
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => copyBrief(selectedIdea)}
                  className="rounded-2xl border px-5 py-3 font-bold inline-flex items-center gap-2 hover:bg-slate-50"
                >
                  <Copy size={17} />
                  Copy Brief
                </button>

                {isPlanned(selectedIdea) ? (
                  <button
                    onClick={onOpenCalendar}
                    className="rounded-2xl bg-emerald-600 text-white px-5 py-3 font-bold inline-flex items-center gap-2"
                  >
                    <CalendarDays size={17} />
                    Open Calendar
                  </button>
                ) : (
                  <button
                    onClick={() => planIdea(selectedIdea)}
                    className="rounded-2xl bg-zinc-950 text-white px-5 py-3 font-bold inline-flex items-center gap-2"
                  >
                    <CalendarDays size={17} />
                    Plan this idea
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-3xl bg-amber-50 border border-amber-200 p-6">
        <div className="flex items-center gap-2 text-amber-700">
          <ArrowRight size={20} />

          <h3 className="text-xl font-bold text-zinc-950">
            Review rule
          </h3>
        </div>

        <p className="text-slate-700 mt-3">
          Idea Bank bây giờ không phải nơi chứa mọi thứ để nhìn cho vui. Nó là bước Review. Khi idea đủ tốt, bấm Plan this idea để đưa sang Calendar và kéo thả trong production board.
        </p>
      </div>
    </div>
  );
}
