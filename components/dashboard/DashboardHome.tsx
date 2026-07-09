"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  Crown,
  Database,
  FolderSearch,
  Lightbulb,
  Search,
  Sparkles,
  Target,
  TrendingUp,
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

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
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

function KpiCard({
  title,
  value,
  description,
  icon,
  tone,
}: {
  title: string;
  value: string;
  description: string;
  icon: ReactNode;
  tone: "rose" | "amber" | "purple" | "blue";
}) {
  const toneClass = {
    rose: "bg-rose-50 border-rose-200 text-rose-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
  }[tone];

  const iconClass = {
    rose: "bg-rose-600",
    amber: "bg-amber-500",
    purple: "bg-purple-600",
    blue: "bg-blue-600",
  }[tone];

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${toneClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold">{title}</p>

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

function CommandCard({
  title,
  description,
  icon,
  tone,
  onClick,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  tone: "purple" | "rose" | "blue" | "emerald" | "amber";
  onClick: () => void;
}) {
  const toneClass = {
    purple: "bg-purple-50 border-purple-200 text-purple-700",
    rose: "bg-rose-50 border-rose-200 text-rose-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
  }[tone];

  const iconClass = {
    purple: "bg-purple-600",
    rose: "bg-rose-600",
    blue: "bg-blue-600",
    emerald: "bg-emerald-600",
    amber: "bg-amber-500",
  }[tone];

  return (
    <button
      onClick={onClick}
      className={`rounded-3xl border p-5 text-left shadow-sm hover:shadow-md transition ${toneClass}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-zinc-950">
            {title}
          </h3>

          <p className="text-sm text-slate-600 mt-2 leading-6">
            {description}
          </p>
        </div>

        <div
          className={`w-12 h-12 rounded-2xl ${iconClass} text-white flex items-center justify-center`}
        >
          {icon}
        </div>
      </div>

      <div className="mt-5 inline-flex items-center gap-2 text-sm font-bold">
        Open
        <ArrowRight size={16} />
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

  const focusIdeas = ideas.filter(
    (idea) => getPriority(idea) === "Focus"
  );

  const testIdeas = ideas.filter(
    (idea) => getPriority(idea) === "Test"
  );

  const totalCompetitorViews = competitorVideos.reduce(
    (sum, video) =>
      sum + toNumber((video as LooseVideo).view_count),
    0
  );

  const topIdea = [...ideas].sort(
    (a, b) => Number(b.score || 0) - Number(a.score || 0)
  )[0];

  const topVideo = [...competitorVideos].sort(
    (a, b) =>
      toNumber((b as LooseVideo).view_count) -
      toNumber((a as LooseVideo).view_count)
  )[0] as LooseVideo | undefined;

  const clusterRows = useMemo(() => {
    const map = new Map<string, Idea[]>();

    ideas.forEach((idea) => {
      const cluster = getCluster(idea);
      map.set(cluster, [...(map.get(cluster) || []), idea]);
    });

    return Array.from(map.entries())
      .map(([cluster, clusterIdeas]) => ({
        cluster,
        ideas: clusterIdeas,
        count: clusterIdeas.length,
        focusCount: clusterIdeas.filter(
          (idea) => getPriority(idea) === "Focus"
        ).length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [ideas]);

  const searchResults = useMemo(() => {
    const text = query.trim().toLowerCase();

    if (!text) {
      return {
        ideas: [],
        groups: [],
        channels: [],
        videos: [],
      };
    }

    return {
      ideas: ideas
        .filter((idea) => {
          return (
            idea.title.toLowerCase().includes(text) ||
            getCluster(idea).toLowerCase().includes(text) ||
            getNiche(idea).toLowerCase().includes(text) ||
            String(idea.hook || "").toLowerCase().includes(text)
          );
        })
        .slice(0, 6),

      groups: competitorGroups
        .filter((group) =>
          group.name.toLowerCase().includes(text)
        )
        .slice(0, 6),

      channels: competitorChannels
        .filter((channel) =>
          channel.channel_name.toLowerCase().includes(text)
        )
        .slice(0, 6),

      videos: competitorVideos
        .filter((video) =>
          cleanText((video as LooseVideo).title, "")
            .toLowerCase()
            .includes(text)
        )
        .slice(0, 6),
    };
  }, [
    query,
    ideas,
    competitorGroups,
    competitorChannels,
    competitorVideos,
  ]);

  return (
    <div className="space-y-6 studioos-readable">
      <div className="rounded-3xl bg-zinc-950 text-white p-7 shadow">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-2 text-sm">
              <Sparkles size={16} />
              StudioOS Command Center
            </div>

            <h2 className="text-3xl font-bold mt-4">
              Workspace overview
            </h2>

            <p className="text-zinc-300 mt-2 max-w-3xl">
              Theo dõi ideas, competitor signals, analyst actions và lịch planning trong một dashboard gọn hơn.
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm text-zinc-400">
              Active workspace
            </p>

            <p className="text-3xl font-bold mt-1">
              StudioOS
            </p>
          </div>
        </div>
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
            placeholder="Search ideas, clusters, competitor groups, channels, videos..."
            className="w-full border rounded-2xl pl-11 pr-4 py-4 outline-none focus:ring-4 focus:ring-blue-100"
          />
        </div>

        {query.trim() && (
          <div className="grid grid-cols-4 gap-4 mt-5">
            <div className="rounded-2xl border p-4">
              <p className="font-bold mb-3">Ideas</p>

              <div className="space-y-3">
                {searchResults.ideas.map((idea) => (
                  <button
                    key={idea.id}
                    onClick={() => onChangeView("ideas")}
                    className="block text-left text-sm hover:text-blue-700"
                  >
                    <span className="font-bold">{idea.title}</span>

                    <span className="block text-xs text-slate-500">
                      {getCluster(idea)} / {getNiche(idea)}
                    </span>
                  </button>
                ))}

                {searchResults.ideas.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No ideas.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border p-4">
              <p className="font-bold mb-3">Groups</p>

              <div className="space-y-3">
                {searchResults.groups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => onChangeView("competitors")}
                    className="block text-left text-sm font-bold hover:text-blue-700"
                  >
                    {group.name}
                  </button>
                ))}

                {searchResults.groups.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No groups.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border p-4">
              <p className="font-bold mb-3">Channels</p>

              <div className="space-y-3">
                {searchResults.channels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => onChangeView("competitors")}
                    className="block text-left text-sm font-bold hover:text-blue-700"
                  >
                    {channel.channel_name}
                  </button>
                ))}

                {searchResults.channels.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No channels.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border p-4">
              <p className="font-bold mb-3">Videos</p>

              <div className="space-y-3">
                {searchResults.videos.map((video, index) => {
                  const loose = video as LooseVideo;

                  return (
                    <button
                      key={`${cleanText(loose.id, "")}-${index}`}
                      onClick={() => onChangeView("competitors")}
                      className="block text-left text-sm hover:text-blue-700"
                    >
                      <span className="font-bold">
                        {cleanText(loose.title, "Untitled")}
                      </span>
                    </button>
                  );
                })}

                {searchResults.videos.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No videos.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          title="Ideas"
          value={formatNumber(ideas.length)}
          description="Total saved ideas"
          icon={<Lightbulb size={22} />}
          tone="rose"
        />

        <KpiCard
          title="Focus Ideas"
          value={formatNumber(focusIdeas.length)}
          description="High priority concepts"
          icon={<Crown size={22} />}
          tone="amber"
        />

        <KpiCard
          title="Competitor Views"
          value={formatNumber(totalCompetitorViews)}
          description="Tracked public market views"
          icon={<TrendingUp size={22} />}
          tone="purple"
        />

        <KpiCard
          title="Channels"
          value={formatNumber(competitorChannels.length)}
          description="Tracked competitor channels"
          icon={<FolderSearch size={22} />}
          tone="blue"
        />
      </div>

      <div className="grid grid-cols-5 gap-4">
        <CommandCard
          title="Ideas"
          description="Strategy map, brainstorm flow, remix engine and idea bank."
          icon={<Lightbulb size={22} />}
          tone="purple"
          onClick={() => onChangeView("ideas")}
        />

        <CommandCard
          title="Competitors"
          description="Groups, channels, keyword radar, remix lab and metadata."
          icon={<FolderSearch size={22} />}
          tone="rose"
          onClick={() => onChangeView("competitors")}
        />

        <CommandCard
          title="Analyst"
          description="Group drilldown and action center for decisions."
          icon={<Target size={22} />}
          tone="blue"
          onClick={() => onChangeView("analyst")}
        />

        <CommandCard
          title="Calendar"
          description="Plan production and content testing by date."
          icon={<CalendarDays size={22} />}
          tone="emerald"
          onClick={() => onChangeView("calendar")}
        />

        <CommandCard
          title="Settings"
          description="Workspace preferences and configuration."
          icon={<Database size={22} />}
          tone="amber"
          onClick={() => onChangeView("settings")}
        />
      </div>

      <div className="grid grid-cols-[1fr_1fr] gap-6">
        <div className="bg-white rounded-3xl border shadow p-6">
          <h3 className="text-xl font-bold">
            Top Creative Clusters
          </h3>

          <p className="text-sm text-slate-600 mt-1">
            Các nhánh idea lớn đang có nhiều ý tưởng nhất.
          </p>

          <div className="space-y-4 mt-5">
            {clusterRows.map((row) => (
              <div key={row.cluster}>
                <div className="flex items-center justify-between gap-4 mb-2">
                  <p className="font-bold">{row.cluster}</p>

                  <p className="text-sm text-slate-500">
                    {row.count} ideas · {row.focusCount} focus
                  </p>
                </div>

                <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-zinc-950"
                    style={{
                      width: `${Math.min(100, Math.max(8, row.count * 12))}%`,
                    }}
                  />
                </div>
              </div>
            ))}

            {clusterRows.length === 0 && (
              <p className="text-sm text-slate-500">
                No clusters yet.
              </p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl border shadow p-6">
          <h3 className="text-xl font-bold">
            What needs attention
          </h3>

          <p className="text-sm text-slate-600 mt-1">
            Gợi ý nhanh để bạn biết nên xử lý gì tiếp.
          </p>

          <div className="space-y-4 mt-5">
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-rose-700">
                Best Idea
              </p>

              <p className="font-bold mt-2">
                {topIdea?.title || "No idea yet"}
              </p>
            </div>

            <div className="rounded-2xl bg-purple-50 border border-purple-200 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-purple-700">
                Top Competitor Video
              </p>

              <p className="font-bold mt-2">
                {cleanText(topVideo?.title, "No competitor video yet")}
              </p>
            </div>

            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                Testing Pool
              </p>

              <p className="font-bold mt-2">
                {formatNumber(testIdeas.length)} ideas are ready for testing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
