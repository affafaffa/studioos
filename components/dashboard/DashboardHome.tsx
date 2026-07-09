"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Crown,
  FolderSearch,
  Lightbulb,
  Search,
  Sparkles,
  Target,
  WandSparkles,
} from "lucide-react";
import type { Idea } from "@/types/idea";
import type {
  CompetitorChannel,
  CompetitorGroup,
  CompetitorVideo,
} from "@/types/competitor";
import type { ActiveView } from "@/types/navigation";

type Props = {
  ideas: Idea[];
  competitorGroups: CompetitorGroup[];
  competitorChannels: CompetitorChannel[];
  competitorVideos: CompetitorVideo[];
  onChangeView: (view: ActiveView) => void;
};

type LooseVideo = CompetitorVideo & Record<string, unknown>;

function cleanText(value: unknown, fallback: string) {
  const text = String(value || "").trim();

  return text || fallback;
}

function toNumber(value: unknown) {
  const numberValue = Number(value || 0);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getPriority(idea: Idea) {
  const explicit = cleanText(idea.priority_level, "");

  if (explicit) return explicit;

  const score = Number(idea.score || 0);

  if (score >= 90) return "Focus";
  if (score >= 75) return "Test";

  return "Backlog";
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

function getCluster(idea: Idea) {
  return cleanText(
    idea.theme_cluster,
    cleanText(idea.theme, "General Story")
  );
}

function openIdeaSection(section: string, onChangeView: (view: ActiveView) => void) {
  window.localStorage.setItem("studioos-idea-section", section);

  window.dispatchEvent(
    new CustomEvent("studioos-idea-section-change", {
      detail: {
        section,
      },
    })
  );

  onChangeView("ideas");
}

function FocusPanel({
  title,
  description,
  value,
  action,
  tone,
  onClick,
}: {
  title: string;
  description: string;
  value: string;
  action: string;
  tone: "rose" | "amber" | "emerald";
  onClick: () => void;
}) {
  const toneClass = {
    rose: "bg-rose-50 border-rose-200 text-rose-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
  }[tone];

  return (
    <button
      onClick={onClick}
      className={`rounded-3xl border p-6 text-left shadow-sm hover:shadow-md transition ${toneClass}`}
    >
      <p className="text-sm font-bold">
        {title}
      </p>

      <p className="text-4xl font-bold text-zinc-950 mt-3">
        {value}
      </p>

      <p className="text-sm text-slate-600 mt-3 leading-6">
        {description}
      </p>

      <div className="inline-flex items-center gap-2 mt-5 font-bold">
        {action}
        <ArrowRight size={17} />
      </div>
    </button>
  );
}

export default function DashboardHome({
  ideas,
  competitorGroups,
  competitorChannels,
  competitorVideos,
  onChangeView,
}: Props) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    function handleGlobalSearch(event: Event) {
      const customEvent = event as CustomEvent<{
        query?: string;
        activeView?: ActiveView;
      }>;

      if (customEvent.detail?.activeView === "dashboard") {
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

  const notPlannedIdeas = ideas.filter((idea) => !isPlanned(idea));
  const readyToPlanIdeas = ideas.filter(
    (idea) => idea.status === "Ready to Plan"
  );
  const inProductionIdeas = ideas.filter((idea) =>
    ["Script", "Thumbnail", "Editing", "Ready to Publish"].includes(
      cleanText(idea.status, "Idea")
    )
  );

  const topSignals = useMemo(() => {
    return [...competitorVideos]
      .sort(
        (a, b) =>
          toNumber((b as LooseVideo).view_count) -
          toNumber((a as LooseVideo).view_count)
      )
      .slice(0, 5);
  }, [competitorVideos]);

  const topReviewIdeas = useMemo(() => {
    return [...notPlannedIdeas]
      .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
      .slice(0, 5);
  }, [notPlannedIdeas]);

  const searchResults = useMemo(() => {
    const text = query.trim().toLowerCase();

    if (!text) {
      return [];
    }

    return ideas
      .filter((idea) => {
        return (
          idea.title.toLowerCase().includes(text) ||
          getCluster(idea).toLowerCase().includes(text) ||
          String(idea.hook || "").toLowerCase().includes(text)
        );
      })
      .slice(0, 8);
  }, [
    query,
    ideas,
  ]);

  return (
    <div className="space-y-6 studioos-readable">
      <div className="rounded-3xl bg-zinc-950 text-white p-7 shadow">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-2 text-sm">
              <Sparkles size={16} />
              Today Focus
            </div>

            <h2 className="text-3xl font-bold mt-4">
              What should you do next?
            </h2>

            <p className="text-zinc-300 mt-2 max-w-3xl">
              Dashboard bây giờ chỉ trả lời một câu: hôm nay nên tạo idea, review idea hay kéo sản xuất trong Calendar?
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm text-zinc-400">
              Workflow
            </p>

            <p className="text-2xl font-bold mt-1">
              Create → Review → Plan
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <FocusPanel
          title="Create"
          value="New"
          description="Tạo idea mới từ market signal hoặc competitor source."
          action="Create Ideas"
          tone="rose"
          onClick={() => openIdeaSection("create-ideas", onChangeView)}
        />

        <FocusPanel
          title="Review"
          value={String(notPlannedIdeas.length)}
          description="Ideas chưa được chọn để đưa sang Calendar."
          action="Review Ideas"
          tone="amber"
          onClick={() => openIdeaSection("review-ideas", onChangeView)}
        />

        <FocusPanel
          title="Plan"
          value={String(readyToPlanIdeas.length)}
          description="Ideas đang chờ kéo thả vào production board."
          action="Open Calendar"
          tone="emerald"
          onClick={() => onChangeView("calendar")}
        />
      </div>

      <div className="bg-white rounded-3xl border shadow p-5">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search ideas quickly..."
            className="w-full border rounded-2xl pl-11 pr-4 py-4 outline-none focus:ring-4 focus:ring-blue-100"
          />
        </div>

        {query.trim() && (
          <div className="mt-5 grid grid-cols-2 gap-4">
            {searchResults.map((idea) => (
              <button
                key={idea.id}
                onClick={() => openIdeaSection("review-ideas", onChangeView)}
                className="rounded-2xl border p-4 text-left hover:bg-slate-50"
              >
                <p className="font-bold">
                  {idea.title}
                </p>

                <p className="text-xs text-slate-500 mt-1">
                  {getCluster(idea)} · {getPriority(idea)}
                </p>
              </button>
            ))}

            {searchResults.length === 0 && (
              <div className="col-span-2 rounded-2xl border border-dashed p-8 text-center text-slate-500">
                No ideas found.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-[1fr_1fr_1fr] gap-6">
        <div className="bg-white rounded-3xl border shadow p-6">
          <div className="flex items-center gap-2">
            <Crown size={20} className="text-amber-600" />

            <h3 className="text-xl font-bold">
              Review First
            </h3>
          </div>

          <p className="text-sm text-slate-600 mt-1">
            Các idea nên xem trước khi plan.
          </p>

          <div className="space-y-4 mt-5">
            {topReviewIdeas.map((idea) => (
              <button
                key={idea.id}
                onClick={() => openIdeaSection("review-ideas", onChangeView)}
                className="w-full rounded-2xl border p-4 text-left hover:bg-slate-50"
              >
                <p className="font-bold leading-5">
                  {idea.title}
                </p>

                <p className="text-xs text-slate-500 mt-2">
                  Score {idea.score || 0} · {getCluster(idea)}
                </p>
              </button>
            ))}

            {topReviewIdeas.length === 0 && (
              <p className="text-sm text-slate-500">
                No review ideas.
              </p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl border shadow p-6">
          <div className="flex items-center gap-2">
            <CalendarDays size={20} className="text-emerald-600" />

            <h3 className="text-xl font-bold">
              Production Queue
            </h3>
          </div>

          <p className="text-sm text-slate-600 mt-1">
            Trạng thái sản xuất hiện tại.
          </p>

          <div className="space-y-4 mt-5">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                Ready to Plan
              </p>

              <p className="text-2xl font-bold mt-1">
                {readyToPlanIdeas.length}
              </p>
            </div>

            <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                In Production
              </p>

              <p className="text-2xl font-bold mt-1">
                {inProductionIdeas.length}
              </p>
            </div>

            <button
              onClick={() => onChangeView("calendar")}
              className="w-full rounded-2xl bg-zinc-950 text-white px-4 py-3 font-bold"
            >
              Open Calendar Board
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl border shadow p-6">
          <div className="flex items-center gap-2">
            <FolderSearch size={20} className="text-purple-600" />

            <h3 className="text-xl font-bold">
              Top Signals
            </h3>
          </div>

          <p className="text-sm text-slate-600 mt-1">
            Video đối thủ có public views cao.
          </p>

          <div className="space-y-4 mt-5">
            {topSignals.map((video, index) => {
              const loose = video as LooseVideo;

              return (
                <button
                  key={`${cleanText(loose.id, "")}-${index}`}
                  onClick={() => onChangeView("competitors")}
                  className="w-full rounded-2xl border p-4 text-left hover:bg-slate-50"
                >
                  <p className="font-bold leading-5">
                    {cleanText(loose.title, "Untitled")}
                  </p>

                  <p className="text-xs text-slate-500 mt-2">
                    {toNumber(loose.view_count).toLocaleString("en-US")} views
                  </p>
                </button>
              );
            })}

            {topSignals.length === 0 && (
              <p className="text-sm text-slate-500">
                No competitor signals yet.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow p-6">
        <div className="flex items-center gap-2">
          <WandSparkles size={20} className="text-rose-600" />

          <h3 className="text-xl font-bold">
            StudioOS workflow
          </h3>
        </div>

        <p className="text-slate-600 mt-3 leading-7">
          Không cần nhìn tất cả module cùng lúc nữa. Bắt đầu ở Create Ideas, chọn ý tốt ở Review Ideas, rồi kéo thả sản xuất trong Calendar.
        </p>
      </div>
    </div>
  );
}
