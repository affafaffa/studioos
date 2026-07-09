"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUpRight,
  BookOpen,
  Copy,
  Crown,
  Database,
  Edit3,
  Eye,
  Filter,
  Layers,
  LayoutGrid,
  Lightbulb,
  List,
  Network,
  Search,
  Sparkles,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Idea } from "@/types/idea";

type Props = {
  ideas: Idea[];
  highlightedIdeaId?: number | null;
};

type ViewMode = "board" | "cards" | "table";

type SortMode =
  | "priority"
  | "score"
  | "newest"
  | "views"
  | "cluster";

type EnrichedIdea = Idea & {
  storyPillarLabel: string;
  clusterLabel: string;
  nicheLabel: string;
  priorityLabel: string;
};

type EditForm = {
  title: string;
  theme: string;
  status: string;
  score: string;
  language: string;
  story_pillar: string;
  theme_cluster: string;
  niche: string;
  idea_angle: string;
  idea_formula: string;
  priority_level: string;
  source_signal: string;
  hook: string;
  thumbnail_prompt: string;
  storyline: string;
  notes: string;
};

const pageSize = 18;

const priorityOrder: Record<string, number> = {
  Focus: 3,
  Test: 2,
  Backlog: 1,
};

const colorPalette = [
  {
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-700",
    fill: "bg-rose-500",
    soft: "bg-rose-100",
  },
  {
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-700",
    fill: "bg-orange-500",
    soft: "bg-orange-100",
  },
  {
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-700",
    fill: "bg-purple-500",
    soft: "bg-purple-100",
  },
  {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    fill: "bg-blue-500",
    soft: "bg-blue-100",
  },
  {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    fill: "bg-emerald-500",
    soft: "bg-emerald-100",
  },
  {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    fill: "bg-amber-500",
    soft: "bg-amber-100",
  },
];

function getColor(index: number) {
  return colorPalette[index % colorPalette.length];
}

function cleanText(value: unknown, fallback: string) {
  const text = String(value || "").trim();

  return text || fallback;
}

function getScore(idea: Idea) {
  return Number(idea.score || 0);
}

function getViews(idea: Idea) {
  return Number(idea.views || 0);
}

function detectCluster(idea: Idea) {
  const explicit = cleanText(idea.theme_cluster, "");

  if (explicit) return explicit;

  const title = idea.title.toLowerCase();

  if (title.includes("poor") && title.includes("rich")) {
    return "Poor vs Rich";
  }

  if (title.includes("makeover")) {
    return "Makeover";
  }

  if (title.includes("adopt")) {
    return "Adopted";
  }

  if (title.includes("huntrix") || title.includes("demon")) {
    return "K-pop Demon Hunters";
  }

  if (title.includes("mermaid")) {
    return "Mermaid";
  }

  if (title.includes("school")) {
    return "School Drama";
  }

  if (title.includes("princess")) {
    return "Princess Transformation";
  }

  if (title.includes("family")) {
    return "Family Drama";
  }

  return cleanText(idea.theme, "General Story");
}

function detectNiche(idea: Idea) {
  const explicit = cleanText(idea.niche, "");

  if (explicit) return explicit;

  const title = idea.title.toLowerCase();

  if (title.includes("giga rich")) {
    return "Poor vs Rich vs Giga Rich";
  }

  if (title.includes("fashion contest")) {
    return "Fashion Contest";
  }

  if (title.includes("ballet contest")) {
    return "Ballet Contest";
  }

  if (title.includes("princess")) {
    return "Princess Transformation";
  }

  if (title.includes("school")) {
    return "School Setting";
  }

  if (title.includes("family")) {
    return "Family Drama";
  }

  if (title.includes("mermaid")) {
    return "Mermaid Transformation";
  }

  if (title.includes("huntrix")) {
    return "Huntrix Fashion Contest";
  }

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

function enrichIdea(idea: Idea): EnrichedIdea {
  return {
    ...idea,
    storyPillarLabel: cleanText(idea.story_pillar, "Story"),
    clusterLabel: detectCluster(idea),
    nicheLabel: detectNiche(idea),
    priorityLabel: getPriority(idea),
  };
}

function unique(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));
}

function averageScore(ideas: EnrichedIdea[]) {
  if (ideas.length === 0) return 0;

  return (
    ideas.reduce((sum, idea) => sum + getScore(idea), 0) /
    ideas.length
  );
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toISOString().slice(0, 10);
}

function getPriorityClass(priority: string) {
  if (priority === "Focus") {
    return "bg-rose-600 text-white";
  }

  if (priority === "Test") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-slate-100 text-slate-600";
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

function getScoreClass(score: number) {
  if (score >= 90) {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }

  if (score >= 75) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  return "bg-slate-50 text-slate-700 border-slate-200";
}

function createEditForm(idea: Idea): EditForm {
  return {
    title: idea.title || "",
    theme: idea.theme || "",
    status: idea.status || "Idea",
    score: String(idea.score || 0),
    language: idea.language || "EN",
    story_pillar: idea.story_pillar || "Story",
    theme_cluster: idea.theme_cluster || detectCluster(idea),
    niche: idea.niche || detectNiche(idea),
    idea_angle: idea.idea_angle || "",
    idea_formula: idea.idea_formula || "",
    priority_level: idea.priority_level || getPriority(idea),
    source_signal: idea.source_signal || "",
    hook: idea.hook || "",
    thumbnail_prompt: idea.thumbnail_prompt || "",
    storyline: idea.storyline || "",
    notes: idea.notes || "",
  };
}

function StatCard({
  label,
  value,
  description,
  icon,
  colorIndex,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  colorIndex: number;
}) {
  const color = getColor(colorIndex);

  return (
    <div
      className={`rounded-3xl border p-5 shadow-sm ${color.bg} ${color.border}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-sm font-bold ${color.text}`}>
            {label}
          </p>

          <p className="text-3xl font-bold text-zinc-950 mt-2">
            {value}
          </p>

          <p className="text-xs text-slate-600 mt-2">
            {description}
          </p>
        </div>

        <div
          className={`w-12 h-12 rounded-2xl ${color.fill} text-white flex items-center justify-center`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function IdeaCard({
  idea,
  highlighted,
  onView,
  onEdit,
  onDelete,
}: {
  idea: EnrichedIdea;
  highlighted: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const priority = idea.priorityLabel;
  const score = getScore(idea);

  return (
    <div
      className={`rounded-3xl border bg-white p-5 transition hover:shadow-md ${
        highlighted
          ? "border-purple-400 ring-4 ring-purple-100"
          : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${getPriorityClass(priority)}`}
            >
              {priority}
            </span>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-bold ${getScoreClass(score)}`}
            >
              Score {score}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(idea.status)}`}
            >
              {idea.status || "Idea"}
            </span>
          </div>

          <h3 className="font-bold text-lg mt-4 leading-6 text-zinc-950">
            {idea.title}
          </h3>

          <p className="text-xs text-slate-500 mt-2">
            ID #{idea.id} · {idea.storyPillarLabel} / {idea.clusterLabel} / {idea.nicheLabel}
          </p>
        </div>
      </div>

      {idea.hook && (
        <div className="rounded-2xl bg-slate-50 border p-4 mt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-rose-700">
            Hook
          </p>

          <p className="text-sm text-slate-700 mt-2">
            {idea.hook}
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="rounded-2xl bg-slate-50 border p-3">
          <p className="text-xs text-slate-500">
            Views
          </p>

          <p className="font-bold mt-1">
            {formatNumber(getViews(idea))}
          </p>
        </div>

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
      </div>

      <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t">
        <button
          onClick={onView}
          className="inline-flex items-center gap-2 text-blue-700 font-bold text-sm"
        >
          <Eye size={16} />
          View
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-2 text-slate-700 font-bold text-sm"
          >
            <Edit3 size={16} />
            Edit
          </button>

          <button
            onClick={onDelete}
            className="inline-flex items-center gap-2 text-red-600 font-bold text-sm"
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function IdeaBank({
  ideas,
  highlightedIdeaId = null,
}: Props) {
  const router = useRouter();

  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [sortMode, setSortMode] = useState<SortMode>("priority");

  const [search, setSearch] = useState("");
  const [pillarFilter, setPillarFilter] = useState("");
  const [clusterFilter, setClusterFilter] = useState("");
  const [nicheFilter, setNicheFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [selectedCluster, setSelectedCluster] = useState("");
  const [selectedNiche, setSelectedNiche] = useState("");
  const [page, setPage] = useState(1);

  const [selectedIdea, setSelectedIdea] = useState<EnrichedIdea | null>(null);
  const [editingIdea, setEditingIdea] = useState<EnrichedIdea | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const enrichedIdeas = useMemo(() => {
    return ideas.map(enrichIdea);
  }, [ideas]);

  const pillars = useMemo(
    () => unique(enrichedIdeas.map((idea) => idea.storyPillarLabel)),
    [enrichedIdeas]
  );

  const clusters = useMemo(
    () => unique(enrichedIdeas.map((idea) => idea.clusterLabel)),
    [enrichedIdeas]
  );

  const niches = useMemo(
    () => unique(enrichedIdeas.map((idea) => idea.nicheLabel)),
    [enrichedIdeas]
  );

  const statuses = useMemo(
    () => unique(enrichedIdeas.map((idea) => idea.status || "Idea")),
    [enrichedIdeas]
  );

  const filteredIdeas = useMemo(() => {
    const query = search.trim().toLowerCase();

    const nextIdeas = enrichedIdeas.filter((idea) => {
      if (pillarFilter && idea.storyPillarLabel !== pillarFilter) return false;
      if (clusterFilter && idea.clusterLabel !== clusterFilter) return false;
      if (nicheFilter && idea.nicheLabel !== nicheFilter) return false;
      if (priorityFilter && idea.priorityLabel !== priorityFilter) return false;
      if (statusFilter && (idea.status || "Idea") !== statusFilter) return false;
      if (selectedCluster && idea.clusterLabel !== selectedCluster) return false;
      if (selectedNiche && idea.nicheLabel !== selectedNiche) return false;

      if (!query) return true;

      return (
        idea.title.toLowerCase().includes(query) ||
        idea.storyPillarLabel.toLowerCase().includes(query) ||
        idea.clusterLabel.toLowerCase().includes(query) ||
        idea.nicheLabel.toLowerCase().includes(query) ||
        String(idea.hook || "").toLowerCase().includes(query) ||
        String(idea.storyline || "").toLowerCase().includes(query) ||
        String(idea.source_signal || "").toLowerCase().includes(query)
      );
    });

    return nextIdeas.sort((a, b) => {
      if (sortMode === "score") {
        return getScore(b) - getScore(a);
      }

      if (sortMode === "newest") {
        return (
          new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime()
        );
      }

      if (sortMode === "views") {
        return getViews(b) - getViews(a);
      }

      if (sortMode === "cluster") {
        return a.clusterLabel.localeCompare(b.clusterLabel);
      }

      return (
        (priorityOrder[b.priorityLabel] || 0) -
          (priorityOrder[a.priorityLabel] || 0) ||
        getScore(b) - getScore(a)
      );
    });
  }, [
    enrichedIdeas,
    search,
    pillarFilter,
    clusterFilter,
    nicheFilter,
    priorityFilter,
    statusFilter,
    selectedCluster,
    selectedNiche,
    sortMode,
  ]);

  const clusterRows = useMemo(() => {
    const map = new Map<string, EnrichedIdea[]>();

    enrichedIdeas.forEach((idea) => {
      if (pillarFilter && idea.storyPillarLabel !== pillarFilter) return;
      if (priorityFilter && idea.priorityLabel !== priorityFilter) return;
      if (statusFilter && (idea.status || "Idea") !== statusFilter) return;

      map.set(idea.clusterLabel, [...(map.get(idea.clusterLabel) || []), idea]);
    });

    return Array.from(map.entries())
      .map(([cluster, clusterIdeas]) => {
        const sorted = [...clusterIdeas].sort(
          (a, b) => getScore(b) - getScore(a)
        );

        return {
          cluster,
          ideas: clusterIdeas,
          count: clusterIdeas.length,
          focusCount: clusterIdeas.filter(
            (idea) => idea.priorityLabel === "Focus"
          ).length,
          avgScore: averageScore(clusterIdeas),
          topIdea: sorted[0],
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [
    enrichedIdeas,
    pillarFilter,
    priorityFilter,
    statusFilter,
  ]);

  const nicheRows = useMemo(() => {
    const map = new Map<string, EnrichedIdea[]>();

    enrichedIdeas.forEach((idea) => {
      if (selectedCluster && idea.clusterLabel !== selectedCluster) return;
      if (clusterFilter && idea.clusterLabel !== clusterFilter) return;

      map.set(idea.nicheLabel, [...(map.get(idea.nicheLabel) || []), idea]);
    });

    return Array.from(map.entries())
      .map(([niche, nicheIdeas]) => ({
        niche,
        ideas: nicheIdeas,
        count: nicheIdeas.length,
        focusCount: nicheIdeas.filter((idea) => idea.priorityLabel === "Focus")
          .length,
        avgScore: averageScore(nicheIdeas),
      }))
      .sort((a, b) => b.count - a.count);
  }, [
    enrichedIdeas,
    selectedCluster,
    clusterFilter,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredIdeas.length / pageSize)
  );

  const safePage = Math.min(page, totalPages);

  const paginatedIdeas = filteredIdeas.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const focusCount = enrichedIdeas.filter(
    (idea) => idea.priorityLabel === "Focus"
  ).length;

  const testCount = enrichedIdeas.filter(
    (idea) => idea.priorityLabel === "Test"
  ).length;

  const backlogCount = enrichedIdeas.filter(
    (idea) => idea.priorityLabel === "Backlog"
  ).length;

  function resetFilters() {
    setSearch("");
    setPillarFilter("");
    setClusterFilter("");
    setNicheFilter("");
    setPriorityFilter("");
    setStatusFilter("");
    setSelectedCluster("");
    setSelectedNiche("");
    setPage(1);
  }

  function openEdit(idea: EnrichedIdea) {
    setEditingIdea(idea);
    setEditForm(createEditForm(idea));
    setMessage("");
    setErrorMessage("");
  }

  async function handleUpdateIdea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingIdea || !editForm) return;

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const payload = {
      title: editForm.title,
      theme: editForm.theme || null,
      status: editForm.status || "Idea",
      score: Number(editForm.score || 0),
      language: editForm.language || "EN",
      story_pillar: editForm.story_pillar || "Story",
      theme_cluster: editForm.theme_cluster || null,
      niche: editForm.niche || null,
      idea_angle: editForm.idea_angle || null,
      idea_formula: editForm.idea_formula || null,
      priority_level: editForm.priority_level || "Backlog",
      source_signal: editForm.source_signal || null,
      parent_path: `${editForm.story_pillar || "Story"} / ${
        editForm.theme_cluster || "General Story"
      } / ${editForm.niche || "General Niche"}`,
      hook: editForm.hook || null,
      thumbnail_prompt: editForm.thumbnail_prompt || null,
      storyline: editForm.storyline || null,
      notes: editForm.notes || null,
    };

    const { error } = await supabase
      .from("ideas")
      .update(payload)
      .eq("id", editingIdea.id);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setMessage("Idea updated.");
    setSaving(false);
    setEditingIdea(null);
    setEditForm(null);
    router.refresh();
  }

  async function handleDeleteIdea(idea: EnrichedIdea) {
    const confirmed = window.confirm(
      `Delete this idea?\n\n${idea.title}`
    );

    if (!confirmed) return;

    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("ideas")
      .delete()
      .eq("id", idea.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMessage("Idea deleted.");
    router.refresh();
  }

  async function copyIdeaBrief(idea: EnrichedIdea) {
    const text = [
      `Title: ${idea.title}`,
      `Path: ${idea.storyPillarLabel} / ${idea.clusterLabel} / ${idea.nicheLabel}`,
      `Priority: ${idea.priorityLabel}`,
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

    await navigator.clipboard.writeText(text);
    setMessage("Copied idea brief.");
  }

  return (
    <div className="space-y-6 studioos-readable">
      <div className="rounded-3xl bg-zinc-950 text-white p-7 shadow">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-2 text-sm">
              <Database size={16} />
              Structured Idea Bank
            </div>

            <h2 className="text-3xl font-bold mt-4">
              Idea Bank UX Rebuild
            </h2>

            <p className="text-zinc-300 mt-2 max-w-3xl">
              Ideas are now organized by Story Pillar → Theme Cluster → Niche → Specific Idea, with priority colors and research-friendly views.
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm text-zinc-400">
              Filtered ideas
            </p>

            <p className="text-3xl font-bold mt-1">
              {formatNumber(filteredIdeas.length)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total Ideas"
          value={formatNumber(enrichedIdeas.length)}
          description="All ideas saved in the bank"
          icon={<Lightbulb size={22} />}
          colorIndex={0}
        />

        <StatCard
          label="Focus"
          value={formatNumber(focusCount)}
          description="High-priority ideas to execute first"
          icon={<Crown size={22} />}
          colorIndex={1}
        />

        <StatCard
          label="Test"
          value={formatNumber(testCount)}
          description="Ideas suitable for controlled testing"
          icon={<Target size={22} />}
          colorIndex={2}
        />

        <StatCard
          label="Backlog"
          value={formatNumber(backlogCount)}
          description="Lower-priority concepts to keep"
          icon={<Layers size={22} />}
          colorIndex={3}
        />
      </div>

      <div className="bg-white rounded-3xl border shadow p-5">
        <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] gap-3">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search title, hook, cluster, niche, source signal..."
              className="w-full border rounded-2xl pl-11 pr-4 py-3"
            />
          </div>

          <select
            value={pillarFilter}
            onChange={(event) => {
              setPillarFilter(event.target.value);
              setPage(1);
            }}
            className="border rounded-2xl px-4 py-3"
          >
            <option value="">All Pillars</option>

            {pillars.map((pillar) => (
              <option key={pillar} value={pillar}>
                {pillar}
              </option>
            ))}
          </select>

          <select
            value={clusterFilter}
            onChange={(event) => {
              setClusterFilter(event.target.value);
              setSelectedCluster("");
              setPage(1);
            }}
            className="border rounded-2xl px-4 py-3"
          >
            <option value="">All Clusters</option>

            {clusters.map((cluster) => (
              <option key={cluster} value={cluster}>
                {cluster}
              </option>
            ))}
          </select>

          <select
            value={nicheFilter}
            onChange={(event) => {
              setNicheFilter(event.target.value);
              setSelectedNiche("");
              setPage(1);
            }}
            className="border rounded-2xl px-4 py-3"
          >
            <option value="">All Niches</option>

            {niches.map((niche) => (
              <option key={niche} value={niche}>
                {niche}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-[0.8fr_0.8fr_0.8fr_1fr] gap-3 mt-3">
          <select
            value={priorityFilter}
            onChange={(event) => {
              setPriorityFilter(event.target.value);
              setPage(1);
            }}
            className="border rounded-2xl px-4 py-3"
          >
            <option value="">All Priorities</option>
            <option value="Focus">Focus</option>
            <option value="Test">Test</option>
            <option value="Backlog">Backlog</option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            className="border rounded-2xl px-4 py-3"
          >
            <option value="">All Status</option>

            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <select
            value={sortMode}
            onChange={(event) => {
              setSortMode(event.target.value as SortMode);
              setPage(1);
            }}
            className="border rounded-2xl px-4 py-3"
          >
            <option value="priority">Priority</option>
            <option value="score">Score high → low</option>
            <option value="newest">Newest updated</option>
            <option value="views">Views high → low</option>
            <option value="cluster">Cluster A → Z</option>
          </select>

          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => setViewMode("board")}
              className={`rounded-2xl border px-4 py-3 font-bold flex items-center justify-center gap-2 ${
                viewMode === "board"
                  ? "bg-zinc-950 text-white"
                  : "bg-white hover:bg-slate-50"
              }`}
            >
              <Network size={16} />
              Board
            </button>

            <button
              onClick={() => setViewMode("cards")}
              className={`rounded-2xl border px-4 py-3 font-bold flex items-center justify-center gap-2 ${
                viewMode === "cards"
                  ? "bg-zinc-950 text-white"
                  : "bg-white hover:bg-slate-50"
              }`}
            >
              <LayoutGrid size={16} />
              Cards
            </button>

            <button
              onClick={() => setViewMode("table")}
              className={`rounded-2xl border px-4 py-3 font-bold flex items-center justify-center gap-2 ${
                viewMode === "table"
                  ? "bg-zinc-950 text-white"
                  : "bg-white hover:bg-slate-50"
              }`}
            >
              <List size={16} />
              Table
            </button>

            <button
              onClick={resetFilters}
              className="rounded-2xl border px-4 py-3 font-bold hover:bg-slate-50 flex items-center justify-center gap-2"
            >
              <Filter size={16} />
              Reset
            </button>
          </div>
        </div>

        {(message || errorMessage) && (
          <div className="mt-4">
            {message && (
              <p className="rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-3 text-sm font-semibold">
                {message}
              </p>
            )}

            {errorMessage && (
              <p className="rounded-2xl bg-red-50 text-red-700 border border-red-200 px-4 py-3 text-sm font-semibold">
                {errorMessage}
              </p>
            )}
          </div>
        )}
      </div>

      {viewMode === "board" && (
        <>
          <div className="bg-white rounded-3xl border shadow overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-purple-600" />

                <h3 className="text-xl font-bold">
                  Theme Cluster Board
                </h3>
              </div>

              <p className="text-sm text-slate-600 mt-1">
                Big creative lanes. Click a cluster to drill down into its niches.
              </p>
            </div>

            <div className="p-6 grid grid-cols-3 gap-4">
              {clusterRows.map((row, index) => {
                const color = getColor(index);
                const isSelected = selectedCluster === row.cluster;
                const width = Math.min(100, Math.max(8, row.count * 8));

                return (
                  <button
                    key={row.cluster}
                    onClick={() => {
                      setSelectedCluster(isSelected ? "" : row.cluster);
                      setSelectedNiche("");
                      setPage(1);
                    }}
                    className={`rounded-3xl border p-5 text-left transition hover:shadow-md ${
                      isSelected
                        ? `${color.bg} ${color.border} ring-4 ring-purple-100`
                        : "bg-white border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className={`text-xs font-bold uppercase tracking-wide ${color.text}`}>
                          Theme Cluster
                        </p>

                        <h4 className="text-xl font-bold mt-2">
                          {row.cluster}
                        </h4>

                        <p className="text-sm text-slate-600 mt-2">
                          {row.count} ideas · {row.focusCount} focus · Avg {row.avgScore.toFixed(0)}
                        </p>
                      </div>

                      <div
                        className={`w-11 h-11 rounded-2xl ${color.fill} text-white flex items-center justify-center`}
                      >
                        <Layers size={20} />
                      </div>
                    </div>

                    <div className={`h-3 rounded-full overflow-hidden mt-5 ${color.soft}`}>
                      <div
                        className={`h-full rounded-full ${color.fill}`}
                        style={{
                          width: `${width}%`,
                        }}
                      />
                    </div>

                    {row.topIdea && (
                      <p className="text-sm text-slate-600 mt-4">
                        Top:{" "}
                        <span className="font-bold text-zinc-950">
                          {row.topIdea.title}
                        </span>
                      </p>
                    )}
                  </button>
                );
              })}

              {clusterRows.length === 0 && (
                <div className="col-span-3 rounded-3xl border border-dashed p-10 text-center text-slate-500">
                  No clusters found.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border shadow overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <BookOpen size={20} className="text-blue-600" />

                  <h3 className="text-xl font-bold">
                    Niche Board
                  </h3>
                </div>

                <p className="text-sm text-slate-600 mt-1">
                  Smaller angles inside the selected cluster.
                </p>
              </div>

              {(selectedCluster || selectedNiche) && (
                <button
                  onClick={() => {
                    setSelectedCluster("");
                    setSelectedNiche("");
                    setPage(1);
                  }}
                  className="rounded-2xl border px-4 py-2 font-bold hover:bg-slate-50"
                >
                  Clear Branch
                </button>
              )}
            </div>

            <div className="p-6 grid grid-cols-4 gap-4">
              {nicheRows.map((row, index) => {
                const color = getColor(index + 2);
                const isSelected = selectedNiche === row.niche;

                return (
                  <button
                    key={row.niche}
                    onClick={() => {
                      setSelectedNiche(isSelected ? "" : row.niche);
                      setPage(1);
                    }}
                    className={`rounded-3xl border p-5 text-left transition hover:shadow-md ${
                      isSelected
                        ? `${color.bg} ${color.border} ring-4 ring-blue-100`
                        : "bg-white border-slate-200"
                    }`}
                  >
                    <p className={`text-xs font-bold uppercase tracking-wide ${color.text}`}>
                      Niche / Angle
                    </p>

                    <h4 className="text-lg font-bold mt-2">
                      {row.niche}
                    </h4>

                    <p className="text-sm text-slate-600 mt-3">
                      {row.count} ideas · {row.focusCount} focus
                    </p>

                    <p className="text-sm font-bold mt-3">
                      Avg score {row.avgScore.toFixed(0)}
                    </p>
                  </button>
                );
              })}

              {nicheRows.length === 0 && (
                <div className="col-span-4 rounded-3xl border border-dashed p-10 text-center text-slate-500">
                  No niches found.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {(viewMode === "board" || viewMode === "cards") && (
        <div className="bg-white rounded-3xl border shadow overflow-hidden">
          <div className="p-6 border-b flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Lightbulb size={20} className="text-amber-600" />

                <h3 className="text-xl font-bold">
                  Ideas in Current View
                </h3>
              </div>

              <p className="text-sm text-slate-600 mt-1">
                More important ideas are shown with stronger color labels.
              </p>
            </div>

            <p className="text-sm text-slate-500">
              Page {safePage} / {totalPages} · {formatNumber(filteredIdeas.length)} ideas
            </p>
          </div>

          <div className="p-6 grid grid-cols-3 gap-5">
            {paginatedIdeas.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                highlighted={highlightedIdeaId === idea.id}
                onView={() => setSelectedIdea(idea)}
                onEdit={() => openEdit(idea)}
                onDelete={() => handleDeleteIdea(idea)}
              />
            ))}

            {paginatedIdeas.length === 0 && (
              <div className="col-span-3 rounded-3xl border border-dashed p-10 text-center text-slate-500">
                No ideas match this view.
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode === "table" && (
        <div className="bg-white rounded-3xl border shadow overflow-hidden">
          <div className="p-6 border-b flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold">
                Idea Table
              </h3>

              <p className="text-sm text-slate-600 mt-1">
                Compact table for scanning and managing ideas.
              </p>
            </div>

            <p className="text-sm text-slate-500">
              Page {safePage} / {totalPages}
            </p>
          </div>

          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left p-4">Architecture</th>
                  <th className="text-left p-4">Idea</th>
                  <th className="text-left p-4">Priority</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Score</th>
                  <th className="text-left p-4">Views</th>
                  <th className="text-left p-4">Updated</th>
                  <th className="text-left p-4">Actions</th>
                </tr>
              </thead>

              <tbody>
                {paginatedIdeas.map((idea) => (
                  <tr
                    key={idea.id}
                    className={`border-t ${
                      highlightedIdeaId === idea.id
                        ? "bg-purple-50"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="p-4">
                      <p className="font-bold">
                        {idea.clusterLabel}
                      </p>

                      <p className="text-xs text-slate-500 mt-1">
                        {idea.storyPillarLabel} / {idea.nicheLabel}
                      </p>
                    </td>

                    <td className="p-4 min-w-[380px]">
                      <p className="font-bold">
                        {idea.title}
                      </p>

                      <p className="text-xs text-slate-500 mt-1">
                        ID #{idea.id}
                      </p>
                    </td>

                    <td className="p-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${getPriorityClass(idea.priorityLabel)}`}
                      >
                        {idea.priorityLabel}
                      </span>
                    </td>

                    <td className="p-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(idea.status)}`}
                      >
                        {idea.status || "Idea"}
                      </span>
                    </td>

                    <td className="p-4 font-bold">
                      {getScore(idea)}
                    </td>

                    <td className="p-4">
                      {formatNumber(getViews(idea))}
                    </td>

                    <td className="p-4">
                      {formatDate(idea.updated_at || idea.created_at)}
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setSelectedIdea(idea)}
                          className="text-blue-700 font-bold"
                        >
                          View
                        </button>

                        <button
                          onClick={() => openEdit(idea)}
                          className="text-slate-700 font-bold"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDeleteIdea(idea)}
                          className="text-red-600 font-bold"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {paginatedIdeas.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-10 text-center text-slate-500"
                    >
                      No ideas match this table view.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border shadow p-5 flex items-center justify-between gap-4">
        <p className="text-sm text-slate-600">
          Showing {formatNumber(paginatedIdeas.length)} / {formatNumber(filteredIdeas.length)} ideas
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={safePage === 1}
            className="rounded-2xl border px-5 py-3 font-bold disabled:opacity-50 hover:bg-slate-50"
          >
            Previous
          </button>

          <button
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
            disabled={safePage === totalPages}
            className="rounded-2xl border px-5 py-3 font-bold disabled:opacity-50 hover:bg-slate-50"
          >
            Next
          </button>
        </div>
      </div>

      {selectedIdea && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-purple-700">
                  Idea Detail
                </p>

                <h2 className="text-2xl font-bold mt-2">
                  {selectedIdea.title}
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  {selectedIdea.storyPillarLabel} / {selectedIdea.clusterLabel} / {selectedIdea.nicheLabel}
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
              <div className="grid grid-cols-4 gap-4">
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

                <div className="rounded-2xl border p-4">
                  <p className="text-xs text-slate-500">Views</p>
                  <p className="font-bold mt-1">{formatNumber(getViews(selectedIdea))}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
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
              </div>

              <div className="rounded-2xl border p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                  Storyline
                </p>

                <p className="text-slate-700 mt-3 whitespace-pre-wrap">
                  {selectedIdea.storyline || "-"}
                </p>
              </div>

              <div className="rounded-2xl border p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                  Notes
                </p>

                <p className="text-slate-700 mt-3 whitespace-pre-wrap">
                  {selectedIdea.notes || "-"}
                </p>
              </div>

              <div className="flex justify-end gap-3">
                {selectedIdea.source_video_url && (
                  <a
                    href={selectedIdea.source_video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border px-5 py-3 font-bold inline-flex items-center gap-2 hover:bg-slate-50"
                  >
                    <ArrowUpRight size={17} />
                    Source
                  </a>
                )}

                <button
                  onClick={() => copyIdeaBrief(selectedIdea)}
                  className="rounded-2xl border px-5 py-3 font-bold inline-flex items-center gap-2 hover:bg-slate-50"
                >
                  <Copy size={17} />
                  Copy Brief
                </button>

                <button
                  onClick={() => {
                    openEdit(selectedIdea);
                    setSelectedIdea(null);
                  }}
                  className="rounded-2xl bg-zinc-950 text-white px-5 py-3 font-bold inline-flex items-center gap-2"
                >
                  <Edit3 size={17} />
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingIdea && editForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                  Edit Idea
                </p>

                <h2 className="text-2xl font-bold mt-2">
                  {editingIdea.title}
                </h2>
              </div>

              <button
                onClick={() => {
                  setEditingIdea(null);
                  setEditForm(null);
                }}
                className="w-10 h-10 rounded-2xl border flex items-center justify-center hover:bg-slate-50"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateIdea} className="p-6 space-y-5">
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-bold mb-2">
                    Title
                  </label>

                  <input
                    value={editForm.title}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        title: event.target.value,
                      })
                    }
                    className="w-full border rounded-2xl px-4 py-3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">
                    Status
                  </label>

                  <select
                    value={editForm.status}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        status: event.target.value,
                      })
                    }
                    className="w-full border rounded-2xl px-4 py-3"
                  >
                    <option>Idea</option>
                    <option>Draft</option>
                    <option>Testing</option>
                    <option>Published</option>
                    <option>Archived</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">
                    Score
                  </label>

                  <input
                    type="number"
                    value={editForm.score}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        score: event.target.value,
                      })
                    }
                    className="w-full border rounded-2xl px-4 py-3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">
                    Story Pillar
                  </label>

                  <input
                    value={editForm.story_pillar}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        story_pillar: event.target.value,
                      })
                    }
                    className="w-full border rounded-2xl px-4 py-3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">
                    Theme Cluster
                  </label>

                  <input
                    value={editForm.theme_cluster}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        theme_cluster: event.target.value,
                      })
                    }
                    className="w-full border rounded-2xl px-4 py-3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">
                    Niche
                  </label>

                  <input
                    value={editForm.niche}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        niche: event.target.value,
                      })
                    }
                    className="w-full border rounded-2xl px-4 py-3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">
                    Priority
                  </label>

                  <select
                    value={editForm.priority_level}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        priority_level: event.target.value,
                      })
                    }
                    className="w-full border rounded-2xl px-4 py-3"
                  >
                    <option>Focus</option>
                    <option>Test</option>
                    <option>Backlog</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">
                    Theme
                  </label>

                  <input
                    value={editForm.theme}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        theme: event.target.value,
                      })
                    }
                    className="w-full border rounded-2xl px-4 py-3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">
                    Language
                  </label>

                  <input
                    value={editForm.language}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        language: event.target.value,
                      })
                    }
                    className="w-full border rounded-2xl px-4 py-3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">
                    Idea Angle
                  </label>

                  <input
                    value={editForm.idea_angle}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        idea_angle: event.target.value,
                      })
                    }
                    className="w-full border rounded-2xl px-4 py-3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">
                    Source Signal
                  </label>

                  <input
                    value={editForm.source_signal}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        source_signal: event.target.value,
                      })
                    }
                    className="w-full border rounded-2xl px-4 py-3"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">
                  Idea Formula
                </label>

                <input
                  value={editForm.idea_formula}
                  onChange={(event) =>
                    setEditForm({
                      ...editForm,
                      idea_formula: event.target.value,
                    })
                  }
                  className="w-full border rounded-2xl px-4 py-3"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">
                    Hook
                  </label>

                  <textarea
                    value={editForm.hook}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        hook: event.target.value,
                      })
                    }
                    rows={5}
                    className="w-full border rounded-2xl px-4 py-3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">
                    Thumbnail Prompt
                  </label>

                  <textarea
                    value={editForm.thumbnail_prompt}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        thumbnail_prompt: event.target.value,
                      })
                    }
                    rows={5}
                    className="w-full border rounded-2xl px-4 py-3"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">
                  Storyline
                </label>

                <textarea
                  value={editForm.storyline}
                  onChange={(event) =>
                    setEditForm({
                      ...editForm,
                      storyline: event.target.value,
                    })
                  }
                  rows={6}
                  className="w-full border rounded-2xl px-4 py-3"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">
                  Notes
                </label>

                <textarea
                  value={editForm.notes}
                  onChange={(event) =>
                    setEditForm({
                      ...editForm,
                      notes: event.target.value,
                    })
                  }
                  rows={6}
                  className="w-full border rounded-2xl px-4 py-3"
                />
              </div>

              <div className="sticky bottom-0 bg-white border-t pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingIdea(null);
                    setEditForm(null);
                  }}
                  className="rounded-2xl border px-5 py-3 font-bold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-2xl bg-zinc-950 text-white px-5 py-3 font-bold disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
