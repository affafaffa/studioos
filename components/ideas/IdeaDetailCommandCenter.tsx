"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowUpRight,
  CheckCircle2,
  Clipboard,
  Copy,
  Crown,
  Edit3,
  ExternalLink,
  FileText,
  Flame,
  GitBranch,
  Image,
  Layers,
  Lightbulb,
  Loader2,
  PlayCircle,
  Rocket,
  Save,
  Send,
  Sparkles,
  Target,
  Trash2,
  WandSparkles,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Idea } from "@/types/idea";

type Props = {
  idea: Idea;
  onClose: () => void;
  onEdit: () => void;
  onDeleted?: () => void;
};

type IdeaActionLog = {
  id: number;
  idea_id: number | null;
  action_type: string;
  title: string;
  summary: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

const priorityStyles = {
  Focus: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    fill: "bg-rose-600",
    icon: Flame,
  },
  Test: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    fill: "bg-amber-500",
    icon: Target,
  },
  Backlog: {
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
    fill: "bg-slate-600",
    icon: Layers,
  },
};

function cleanText(value: unknown, fallback: string) {
  const text = String(value || "").trim();

  return text || fallback;
}

function numberValue(value: unknown) {
  const parsed = Number(value || 0);

  return Number.isFinite(parsed) ? parsed : 0;
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

function getPriority(idea: Idea) {
  const explicit = cleanText(idea.priority_level, "");

  if (explicit) return explicit as "Focus" | "Test" | "Backlog";

  const score = numberValue(idea.score);

  if (score >= 90) return "Focus";
  if (score >= 75) return "Test";

  return "Backlog";
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

  return cleanText(idea.theme, "General Niche");
}

function getStatusStyle(status: string | null | undefined) {
  const value = cleanText(status, "Idea");

  if (value === "Published") {
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  }

  if (value === "Testing") {
    return "bg-purple-100 text-purple-700 border-purple-200";
  }

  if (value === "Draft") {
    return "bg-blue-100 text-blue-700 border-blue-200";
  }

  if (value === "Archived") {
    return "bg-slate-100 text-slate-700 border-slate-200";
  }

  return "bg-zinc-100 text-zinc-700 border-zinc-200";
}

function buildIdeaBrief(idea: Idea) {
  const storyPillar = cleanText(idea.story_pillar, "Story");
  const cluster = detectCluster(idea);
  const niche = detectNiche(idea);

  return [
    `StudioOS Idea Brief`,
    ``,
    `Title: ${idea.title}`,
    `ID: #${idea.id}`,
    `Architecture: ${storyPillar} / ${cluster} / ${niche}`,
    `Priority: ${getPriority(idea)}`,
    `Status: ${idea.status || "Idea"}`,
    `Score: ${numberValue(idea.score)}`,
    `Language: ${idea.language || "EN"}`,
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
    `Idea Formula:`,
    idea.idea_formula || "-",
    ``,
    `Source Signal:`,
    idea.source_signal || "-",
    ``,
    `Source Video:`,
    idea.source_video_title || "-",
    idea.source_video_url || "-",
    ``,
    `Remix Rule:`,
    idea.remix_rule || "-",
    ``,
    `Remix Strategy:`,
    idea.remix_strategy || "-",
    ``,
    `Notes:`,
    idea.notes || "-",
  ].join("\n");
}

function MetricCard({
  label,
  value,
  description,
  icon,
  tone,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  tone: "rose" | "amber" | "purple" | "blue" | "emerald";
}) {
  const toneClass = {
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  }[tone];

  const iconClass = {
    rose: "bg-rose-600",
    amber: "bg-amber-500",
    purple: "bg-purple-500",
    blue: "bg-blue-500",
    emerald: "bg-emerald-500",
  }[tone];

  return (
    <div className={`rounded-3xl border p-5 ${toneClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold">
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
          className={`w-12 h-12 rounded-2xl ${iconClass} text-white flex items-center justify-center`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function BriefSection({
  title,
  label,
  children,
  tone,
}: {
  title: string;
  label: string;
  children: React.ReactNode;
  tone: "rose" | "blue" | "emerald" | "purple" | "amber" | "slate";
}) {
  const toneClass = {
    rose: "text-rose-700 bg-rose-50 border-rose-200",
    blue: "text-blue-700 bg-blue-50 border-blue-200",
    emerald: "text-emerald-700 bg-emerald-50 border-emerald-200",
    purple: "text-purple-700 bg-purple-50 border-purple-200",
    amber: "text-amber-700 bg-amber-50 border-amber-200",
    slate: "text-slate-700 bg-slate-50 border-slate-200",
  }[tone];

  return (
    <div className={`rounded-3xl border p-5 ${toneClass}`}>
      <p className="text-xs font-bold uppercase tracking-wide">
        {label}
      </p>

      <h3 className="text-xl font-bold text-zinc-950 mt-2">
        {title}
      </h3>

      <div className="text-slate-700 mt-4 whitespace-pre-wrap leading-7">
        {children}
      </div>
    </div>
  );
}

export default function IdeaDetailCommandCenter({
  idea,
  onClose,
  onEdit,
  onDeleted,
}: Props) {
  const router = useRouter();

  const [logs, setLogs] = useState<IdeaActionLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const storyPillar = cleanText(idea.story_pillar, "Story");
  const cluster = detectCluster(idea);
  const niche = detectNiche(idea);
  const priority = getPriority(idea);
  const priorityStyle = priorityStyles[priority] || priorityStyles.Backlog;
  const PriorityIcon = priorityStyle.icon;

  const briefText = useMemo(() => buildIdeaBrief(idea), [idea]);

  async function loadLogs() {
    setLoadingLogs(true);

    const { data, error } = await supabase
      .from("idea_action_logs")
      .select("*")
      .eq("idea_id", idea.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      setLogs(data as IdeaActionLog[]);
    }

    setLoadingLogs(false);
  }

  useEffect(() => {
    loadLogs();
  }, [idea.id]);

  async function saveLog({
    actionType,
    title,
    summary,
    payload,
  }: {
    actionType: string;
    title: string;
    summary: string;
    payload?: Record<string, unknown>;
  }) {
    await supabase
      .from("idea_action_logs")
      .insert({
        idea_id: idea.id,
        action_type: actionType,
        title,
        summary,
        payload: payload || {},
      });

    await loadLogs();
  }

  async function copyText(text: string, successMessage: string) {
    await navigator.clipboard.writeText(text);
    setMessage(successMessage);

    await saveLog({
      actionType: "copied",
      title: successMessage,
      summary: successMessage,
    });
  }

  function exportBrief() {
    const blob = new Blob([briefText], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `idea-${idea.id}-brief.txt`;
    link.click();

    URL.revokeObjectURL(url);

    setMessage("Exported idea brief.");

    saveLog({
      actionType: "exported",
      title: "Exported idea brief",
      summary: "Idea brief was exported as a text file.",
    });
  }

  async function updateIdea(
    payload: Record<string, unknown>,
    successMessage: string,
    actionType: string
  ) {
    setWorking(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("ideas")
      .update(payload)
      .eq("id", idea.id);

    if (error) {
      setErrorMessage(error.message);
      setWorking(false);
      return;
    }

    await saveLog({
      actionType,
      title: successMessage,
      summary: successMessage,
      payload,
    });

    setMessage(successMessage);
    setWorking(false);
    router.refresh();
  }

  async function sendToVideoPipeline() {
    setWorking(true);
    setMessage("");
    setErrorMessage("");

    const { data, error } = await supabase
      .from("videos")
      .insert({
        idea_id: idea.id,
        title: idea.title,
        status: "Idea",
        channel: null,
        owner: null,
        notes: [
          `Created from Idea Command Center.`,
          `Idea ID: #${idea.id}`,
          `Path: ${storyPillar} / ${cluster} / ${niche}`,
          `Priority: ${priority}`,
          ``,
          `Hook:`,
          idea.hook || "-",
          ``,
          `Thumbnail Prompt:`,
          idea.thumbnail_prompt || "-",
          ``,
          `Storyline:`,
          idea.storyline || "-",
        ].join("\n"),
      })
      .select("id")
      .single();

    if (error) {
      setErrorMessage(error.message);
      setWorking(false);
      return;
    }

    await saveLog({
      actionType: "sent_to_video_pipeline",
      title: `Sent to Video Pipeline #${data?.id || "-"}`,
      summary: `Created a video pipeline item from Idea #${idea.id}.`,
      payload: {
        video_id: data?.id || null,
      },
    });

    await supabase
      .from("ideas")
      .update({
        status: "Draft",
      })
      .eq("id", idea.id);

    setMessage("Sent to Video Pipeline and marked idea as Draft.");
    setWorking(false);
    router.refresh();
  }

  async function deleteIdea() {
    const confirmed = window.confirm(
      `Delete this idea?\n\n${idea.title}`
    );

    if (!confirmed) return;

    setWorking(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("ideas")
      .delete()
      .eq("id", idea.id);

    if (error) {
      setErrorMessage(error.message);
      setWorking(false);
      return;
    }

    setWorking(false);

    if (onDeleted) {
      onDeleted();
    }

    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[1500px] max-h-[92vh] overflow-auto studioos-readable">
        <div className="sticky top-0 z-10 bg-white border-b p-6">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs font-bold ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}`}>
                  {priority}
                </span>

                <span className={`rounded-full border px-3 py-1 text-xs font-bold ${getStatusStyle(idea.status)}`}>
                  {idea.status || "Idea"}
                </span>

                <span className="rounded-full bg-zinc-950 text-white px-3 py-1 text-xs font-bold">
                  Idea #{idea.id}
                </span>
              </div>

              <h2 className="text-3xl font-bold mt-4">
                {idea.title}
              </h2>

              <p className="text-slate-600 mt-2">
                {storyPillar} / {cluster} / {niche}
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-11 h-11 rounded-2xl border flex items-center justify-center hover:bg-slate-50 shrink-0"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="rounded-3xl bg-zinc-950 text-white p-6">
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-2 text-sm">
                  <Lightbulb size={16} />
                  Idea Command Center
                </div>

                <h3 className="text-2xl font-bold mt-4">
                  Creative brief, production handoff and action history
                </h3>

                <p className="text-zinc-300 mt-2 max-w-3xl">
                  Use this page to inspect the idea, copy production assets, send it to Video Pipeline, and track every decision around this concept.
                </p>
              </div>

              <div className={`w-16 h-16 rounded-3xl ${priorityStyle.fill} text-white flex items-center justify-center shrink-0`}>
                <PriorityIcon size={28} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-4">
            <MetricCard
              label="Score"
              value={String(numberValue(idea.score))}
              description="Creative priority score"
              icon={<Crown size={22} />}
              tone="rose"
            />

            <MetricCard
              label="Views"
              value={formatNumber(numberValue(idea.views))}
              description="Tracked performance"
              icon={<PlayCircle size={22} />}
              tone="amber"
            />

            <MetricCard
              label="CTR"
              value={`${numberValue(idea.ctr).toFixed(1)}%`}
              description="Click-through rate"
              icon={<Target size={22} />}
              tone="purple"
            />

            <MetricCard
              label="RPM"
              value={`$${numberValue(idea.rpm).toFixed(2)}`}
              description="Revenue per mille"
              icon={<Rocket size={22} />}
              tone="blue"
            />

            <MetricCard
              label="Revenue"
              value={`$${formatNumber(numberValue(idea.revenue))}`}
              description="Estimated revenue"
              icon={<Sparkles size={22} />}
              tone="emerald"
            />
          </div>

          {(message || errorMessage) && (
            <div>
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

          <div className="grid grid-cols-[1.1fr_0.9fr] gap-6">
            <div className="space-y-5">
              <BriefSection
                label="Hook"
                title="Opening hook"
                tone="rose"
              >
                {idea.hook || "No hook yet."}
              </BriefSection>

              <BriefSection
                label="Thumbnail"
                title="Thumbnail production prompt"
                tone="blue"
              >
                {idea.thumbnail_prompt || "No thumbnail prompt yet."}
              </BriefSection>

              <BriefSection
                label="Storyline"
                title="Story structure"
                tone="emerald"
              >
                {idea.storyline || "No storyline yet."}
              </BriefSection>

              <div className="grid grid-cols-2 gap-5">
                <BriefSection
                  label="Formula"
                  title="Idea formula"
                  tone="purple"
                >
                  {idea.idea_formula || "-"}
                </BriefSection>

                <BriefSection
                  label="Angle"
                  title="Idea angle"
                  tone="amber"
                >
                  {idea.idea_angle || idea.source_signal || "-"}
                </BriefSection>
              </div>
            </div>

            <div className="space-y-5">
              <div className="bg-white rounded-3xl border shadow p-5">
                <div className="flex items-center gap-2">
                  <GitBranch size={20} className="text-purple-600" />

                  <h3 className="text-xl font-bold">
                    Strategy Path
                  </h3>
                </div>

                <div className="space-y-3 mt-5">
                  <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-rose-700">
                      Story Pillar
                    </p>

                    <p className="font-bold mt-1">
                      {storyPillar}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-purple-50 border border-purple-200 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-purple-700">
                      Theme Cluster
                    </p>

                    <p className="font-bold mt-1">
                      {cluster}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                      Niche
                    </p>

                    <p className="font-bold mt-1">
                      {niche}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl border shadow p-5">
                <div className="flex items-center gap-2">
                  <WandSparkles size={20} className="text-amber-600" />

                  <h3 className="text-xl font-bold">
                    Source & Remix
                  </h3>
                </div>

                <div className="space-y-4 mt-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Source Type
                    </p>

                    <p className="font-bold mt-1">
                      {idea.source_type || "Manual"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Source Signal
                    </p>

                    <p className="font-bold mt-1">
                      {idea.source_signal || "-"}
                    </p>
                  </div>

                  {idea.source_video_title && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Source Video
                      </p>

                      <p className="font-bold mt-1">
                        {idea.source_video_title}
                      </p>
                    </div>
                  )}

                  {idea.source_channel_title && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Source Channel
                      </p>

                      <p className="font-bold mt-1">
                        {idea.source_channel_title}
                      </p>
                    </div>
                  )}

                  {idea.source_video_url && (
                    <a
                      href={idea.source_video_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-2xl border px-4 py-3 font-bold hover:bg-slate-50"
                    >
                      <ExternalLink size={17} />
                      Open Source Video
                    </a>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-3xl border shadow p-5">
                <div className="flex items-center gap-2">
                  <Clipboard size={20} className="text-emerald-600" />

                  <h3 className="text-xl font-bold">
                    Command Actions
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-5">
                  <button
                    onClick={() => copyText(briefText, "Copied full idea brief.")}
                    className="rounded-2xl border px-4 py-3 font-bold flex items-center justify-center gap-2 hover:bg-slate-50"
                  >
                    <Copy size={17} />
                    Copy Brief
                  </button>

                  <button
                    onClick={() =>
                      copyText(
                        idea.thumbnail_prompt || "",
                        "Copied thumbnail prompt."
                      )
                    }
                    className="rounded-2xl border px-4 py-3 font-bold flex items-center justify-center gap-2 hover:bg-slate-50"
                  >
                    <Image size={17} />
                    Copy Thumbnail
                  </button>

                  <button
                    onClick={exportBrief}
                    className="rounded-2xl border px-4 py-3 font-bold flex items-center justify-center gap-2 hover:bg-slate-50"
                  >
                    <ArrowDownToLine size={17} />
                    Export Brief
                  </button>

                  <button
                    onClick={onEdit}
                    className="rounded-2xl border px-4 py-3 font-bold flex items-center justify-center gap-2 hover:bg-slate-50"
                  >
                    <Edit3 size={17} />
                    Edit Idea
                  </button>

                  <button
                    onClick={sendToVideoPipeline}
                    disabled={working}
                    className="col-span-2 rounded-2xl bg-zinc-950 text-white px-4 py-4 font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {working ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Send size={18} />
                    )}
                    Send to Video Pipeline
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[0.9fr_1.1fr] gap-6">
            <div className="bg-white rounded-3xl border shadow p-5">
              <div className="flex items-center gap-2">
                <Save size={20} className="text-blue-600" />

                <h3 className="text-xl font-bold">
                  Status Controls
                </h3>
              </div>

              <div className="mt-5 space-y-5">
                <div>
                  <p className="text-sm font-bold mb-3">
                    Priority
                  </p>

                  <div className="grid grid-cols-3 gap-3">
                    {(["Focus", "Test", "Backlog"] as const).map((item) => (
                      <button
                        key={item}
                        onClick={() =>
                          updateIdea(
                            {
                              priority_level: item,
                            },
                            `Marked as ${item}.`,
                            "priority_updated"
                          )
                        }
                        disabled={working}
                        className={`rounded-2xl border px-4 py-3 font-bold disabled:opacity-50 ${
                          priority === item
                            ? "bg-zinc-950 text-white"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-bold mb-3">
                    Production Status
                  </p>

                  <div className="grid grid-cols-3 gap-3">
                    {["Idea", "Draft", "Testing", "Published", "Archived"].map(
                      (status) => (
                        <button
                          key={status}
                          onClick={() =>
                            updateIdea(
                              {
                                status,
                              },
                              `Marked status as ${status}.`,
                              "status_updated"
                            )
                          }
                          disabled={working}
                          className={`rounded-2xl border px-4 py-3 font-bold disabled:opacity-50 ${
                            (idea.status || "Idea") === status
                              ? "bg-zinc-950 text-white"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          {status}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <button
                  onClick={deleteIdea}
                  disabled={working}
                  className="w-full rounded-2xl border border-red-200 bg-red-50 text-red-700 px-4 py-4 font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Trash2 size={18} />
                  Delete Idea
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl border shadow overflow-hidden">
              <div className="p-5 border-b flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <FileText size={20} className="text-slate-700" />

                    <h3 className="text-xl font-bold">
                      Action Log
                    </h3>
                  </div>

                  <p className="text-sm text-slate-600 mt-1">
                    Recent actions taken on this idea.
                  </p>
                </div>

                {loadingLogs && (
                  <Loader2 size={18} className="animate-spin text-slate-400" />
                )}
              </div>

              <div className="divide-y max-h-[420px] overflow-auto">
                {logs.map((log) => (
                  <div key={log.id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-bold">
                          {log.title}
                        </p>

                        <p className="text-sm text-slate-600 mt-1">
                          {log.summary || "-"}
                        </p>
                      </div>

                      <span className="rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-xs font-bold shrink-0">
                        {log.action_type}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-3">
                      {formatDate(log.created_at)}
                    </p>
                  </div>
                ))}

                {!loadingLogs && logs.length === 0 && (
                  <div className="p-8 text-center text-slate-500">
                    No action log yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border shadow p-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={20} className="text-emerald-600" />

              <h3 className="text-xl font-bold">
                Production Handoff Rule
              </h3>
            </div>

            <p className="text-slate-600 mt-3 leading-7">
              Khi một idea đủ tốt, hãy bấm Send to Video Pipeline. StudioOS sẽ tạo một video item mới với title, hook, thumbnail prompt và storyline để team có thể bắt đầu sản xuất.
            </p>
          </div>

          <div className="flex justify-end gap-3 sticky bottom-0 bg-white border-t pt-5">
            <button
              onClick={onClose}
              className="rounded-2xl border px-5 py-3 font-bold hover:bg-slate-50"
            >
              Close
            </button>

            <button
              onClick={onEdit}
              className="rounded-2xl border px-5 py-3 font-bold hover:bg-slate-50 flex items-center gap-2"
            >
              <Edit3 size={17} />
              Edit
            </button>

            <button
              onClick={sendToVideoPipeline}
              disabled={working}
              className="rounded-2xl bg-zinc-950 text-white px-5 py-3 font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {working ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Send size={17} />
              )}
              Send to Video Pipeline
            </button>

            {idea.source_video_url && (
              <a
                href={idea.source_video_url}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border px-5 py-3 font-bold hover:bg-slate-50 flex items-center gap-2"
              >
                <ArrowUpRight size={17} />
                Source
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
