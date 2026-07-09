"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowDownToLine,
  BarChart3,
  CheckCircle2,
  Clipboard,
  Copy,
  Crown,
  Eye,
  Flame,
  Lightbulb,
  PlayCircle,
  Rocket,
  Save,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type {
  CompetitorChannel,
  CompetitorGroup,
  CompetitorVideo,
} from "@/types/competitor";

type Props = {
  competitorGroups: CompetitorGroup[];
  competitorChannels: CompetitorChannel[];
  competitorVideos: CompetitorVideo[];
};

type LooseVideo = CompetitorVideo & Record<string, unknown>;

type KeywordMatchRow = {
  id: number;
  keyword_id: number | null;
  keyword: string | null;
  keyword_slug: string | null;
  competitor_video_id: number | null;
  video_title: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  channel_title: string | null;
  competitor_channel_id: number | null;
  group_id: number | null;
  published_at: string | null;
  view_count: number | null;
  views_per_day: number | null;
  match_source: string | null;
};

type AnalystActionRow = {
  id: number;
  action_type: string;
  group_id: number | null;
  group_name: string | null;
  status: string | null;
  title: string;
  summary: string | null;
  source_type: string | null;
  source_video_id: number | null;
  source_video_url: string | null;
  source_keyword: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

type GroupOpportunity = {
  groupKey: string;
  groupId: number | null;
  groupName: string;
  category: string;
  traffic: number;
  viewsPerDay: number;
  videos: number;
  channels: number;
  marketShare: number;
  topVideoTitle: string;
  topVideoUrl: string | null;
  topVideoId: number | null;
  topVideoViews: number;
  score: number;
  recommendedStatus: "Attack" | "Watch" | "Ignore";
};

type KeywordOpportunity = {
  keyword: string;
  traffic: number;
  viewsPerDay: number;
  videos: number;
  topVideoTitle: string;
};

const ACTION_PAGE_SIZE = 8;

const statusConfig = {
  Attack: {
    label: "Attack",
    description: "Ưu tiên remix ngay vì group/key/video đang có tín hiệu mạnh.",
    icon: Rocket,
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    fill: "bg-rose-500",
  },
  Watch: {
    label: "Watch",
    description: "Theo dõi thêm, dùng để build backlog hoặc test nhỏ.",
    icon: Eye,
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    fill: "bg-amber-500",
  },
  Ignore: {
    label: "Ignore",
    description: "Tạm bỏ qua vì tín hiệu traffic/opportunity chưa đủ mạnh.",
    icon: ShieldAlert,
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
    fill: "bg-slate-500",
  },
};

function formatNumber(value: number | null | undefined) {
  return Number(value || 0).toLocaleString("en-US");
}

function formatPercent(value: number | null | undefined) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function toText(value: unknown) {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return String(value);
}

function toNumber(value: unknown) {
  const numberValue = Number(value || 0);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getVideoId(video: CompetitorVideo) {
  return toNumber((video as LooseVideo).id);
}

function getVideoUrl(video: CompetitorVideo) {
  const loose = video as LooseVideo;

  const videoUrl = toText(loose.video_url);

  if (videoUrl) return videoUrl;

  const youtubeVideoId = toText(loose.youtube_video_id);

  if (youtubeVideoId) {
    return `https://www.youtube.com/watch?v=${youtubeVideoId}`;
  }

  return "";
}

function getBestThumbnail(video: CompetitorVideo) {
  const loose = video as LooseVideo;

  return (
    toText(loose.thumbnail_maxres_url) ||
    toText(loose.thumbnail_standard_url) ||
    toText(loose.thumbnail_high_url) ||
    toText(loose.thumbnail_medium_url) ||
    toText(loose.thumbnail_url) ||
    toText(loose.thumbnail_default_url)
  );
}

function getVideoDate(video: CompetitorVideo) {
  const loose = video as LooseVideo;

  return toText(loose.published_at) || toText(loose.created_at);
}

function getViewsPerDay(video: CompetitorVideo) {
  const loose = video as LooseVideo;
  const views = toNumber(loose.view_count);
  const publishedAt = toText(loose.published_at);

  if (!publishedAt) return views;

  const publishedTime = new Date(publishedAt).getTime();

  if (!publishedTime) return views;

  const ageDays = Math.max(
    1,
    (Date.now() - publishedTime) / (1000 * 60 * 60 * 24)
  );

  return views / ageDays;
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
    rose: "bg-rose-500",
    amber: "bg-amber-500",
    purple: "bg-purple-500",
    blue: "bg-blue-500",
    emerald: "bg-emerald-500",
  }[tone];

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${toneClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold">
            {title}
          </p>

          <p className="text-3xl font-bold mt-2 text-zinc-950">
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

export default function AnalystActionCenter({
  competitorGroups,
  competitorChannels,
  competitorVideos,
}: Props) {
  const [selectedGroupKey, setSelectedGroupKey] = useState("");
  const [compareGroupKey, setCompareGroupKey] = useState("");
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [selectedKeyword, setSelectedKeyword] = useState("");
  const [keywordMatches, setKeywordMatches] = useState<KeywordMatchRow[]>([]);
  const [actionLogs, setActionLogs] = useState<AnalystActionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionPage, setActionPage] = useState(1);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const channelMap = useMemo(() => {
    return new Map(
      competitorChannels.map((channel) => [
        channel.id,
        {
          name: channel.channel_name,
          groupId: channel.group_id,
          url: channel.channel_url,
        },
      ])
    );
  }, [competitorChannels]);

  const groupMap = useMemo(() => {
    return new Map(
      competitorGroups.map((group) => [
        group.id,
        {
          name: group.name,
          category: group.category || "Uncategorized",
        },
      ])
    );
  }, [competitorGroups]);

  function resolveVideoGroupId(video: CompetitorVideo) {
    const loose = video as LooseVideo;
    const directGroupId = toNumber(loose.group_id) || null;
    const channelId = toNumber(loose.competitor_channel_id);
    const channel = channelMap.get(channelId);

    return directGroupId || channel?.groupId || null;
  }

  const totalTraffic = competitorVideos.reduce(
    (sum, video) => sum + toNumber((video as LooseVideo).view_count),
    0
  );

  const groupRows = useMemo(() => {
    const groupIds = new Set<number | null>();

    competitorGroups.forEach((group) => groupIds.add(group.id));

    competitorVideos.forEach((video) => {
      groupIds.add(resolveVideoGroupId(video));
    });

    return Array.from(groupIds)
      .map((groupId): GroupOpportunity => {
        const groupInfo = groupId ? groupMap.get(groupId) : null;
        const groupKey = groupId === null ? "ungrouped" : String(groupId);

        const groupVideos = competitorVideos.filter(
          (video) => resolveVideoGroupId(video) === groupId
        );

        const traffic = groupVideos.reduce(
          (sum, video) => sum + toNumber((video as LooseVideo).view_count),
          0
        );

        const viewsPerDay = groupVideos.reduce(
          (sum, video) => sum + getViewsPerDay(video),
          0
        );

        const channelIds = new Set(
          groupVideos
            .map((video) =>
              toNumber((video as LooseVideo).competitor_channel_id)
            )
            .filter(Boolean)
        );

        const topVideo = [...groupVideos].sort(
          (a, b) =>
            toNumber((b as LooseVideo).view_count) -
            toNumber((a as LooseVideo).view_count)
        )[0];

        const marketShare = (traffic / Math.max(1, totalTraffic)) * 100;

        const score = Math.min(
          100,
          Math.round(
            marketShare * 2.1 +
              Math.min(45, viewsPerDay / 45000) +
              Math.min(20, groupVideos.length / 6)
          )
        );

        const recommendedStatus =
          score >= 72 || marketShare >= 15
            ? "Attack"
            : score >= 42
              ? "Watch"
              : "Ignore";

        return {
          groupKey,
          groupId,
          groupName: groupInfo?.name || "Ungrouped",
          category: groupInfo?.category || "Uncategorized",
          traffic,
          viewsPerDay,
          videos: groupVideos.length,
          channels: channelIds.size,
          marketShare,
          topVideoTitle: topVideo ? toText((topVideo as LooseVideo).title) : "-",
          topVideoUrl: topVideo ? getVideoUrl(topVideo) : null,
          topVideoId: topVideo ? getVideoId(topVideo) : null,
          topVideoViews: topVideo
            ? toNumber((topVideo as LooseVideo).view_count)
            : 0,
          score,
          recommendedStatus,
        };
      })
      .filter((group) => group.traffic > 0 || group.videos > 0)
      .sort((a, b) => b.score - a.score);
  }, [
    competitorGroups,
    competitorVideos,
    groupMap,
    totalTraffic,
    channelMap,
  ]);

  useEffect(() => {
    if (!selectedGroupKey && groupRows.length > 0) {
      setSelectedGroupKey(groupRows[0].groupKey);
    }
  }, [groupRows, selectedGroupKey]);

  useEffect(() => {
    setSelectedVideoId(null);
    setSelectedKeyword("");
    setActionPage(1);
  }, [selectedGroupKey]);

  async function loadKeywordMatches() {
    const { data } = await supabase
      .from("competitor_keyword_video_matches")
      .select(
        "id, keyword_id, keyword, keyword_slug, competitor_video_id, video_title, video_url, thumbnail_url, channel_title, competitor_channel_id, group_id, published_at, view_count, views_per_day, match_source"
      )
      .limit(8000);

    setKeywordMatches((data || []) as KeywordMatchRow[]);
  }

  async function loadActionLogs() {
    const { data } = await supabase
      .from("analyst_actions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);

    setActionLogs((data || []) as AnalystActionRow[]);
  }

  useEffect(() => {
    loadKeywordMatches();
    loadActionLogs();
  }, []);

  const selectedGroup =
    groupRows.find((group) => group.groupKey === selectedGroupKey) ||
    groupRows[0];

  const compareGroup =
    groupRows.find((group) => group.groupKey === compareGroupKey) ||
    groupRows.find((group) => group.groupKey !== selectedGroup?.groupKey) ||
    null;

  const selectedGroupId =
    selectedGroup?.groupKey === "ungrouped"
      ? null
      : Number(selectedGroup?.groupKey || 0);

  const selectedGroupVideos = useMemo(() => {
    if (!selectedGroup) return [];

    return competitorVideos
      .filter((video) => resolveVideoGroupId(video) === selectedGroupId)
      .filter((video) => {
        const query = search.trim().toLowerCase();

        if (!query) return true;

        const loose = video as LooseVideo;

        return (
          toText(loose.title).toLowerCase().includes(query) ||
          toText(loose.channel_title).toLowerCase().includes(query)
        );
      })
      .sort(
        (a, b) =>
          toNumber((b as LooseVideo).view_count) -
          toNumber((a as LooseVideo).view_count)
      );
  }, [
    competitorVideos,
    selectedGroup,
    selectedGroupId,
    search,
    channelMap,
  ]);

  const selectedVideo =
    selectedGroupVideos.find((video) => getVideoId(video) === selectedVideoId) ||
    selectedGroupVideos[0];

  const videoGroupMap = useMemo(() => {
    const map = new Map<number, number | null>();

    competitorVideos.forEach((video) => {
      map.set(getVideoId(video), resolveVideoGroupId(video));
    });

    return map;
  }, [competitorVideos, channelMap]);

  const keywordRows = useMemo(() => {
    const keywordMap = new Map<string, KeywordOpportunity>();

    keywordMatches.forEach((match) => {
      const resolvedGroupId =
        match.group_id ||
        (match.competitor_video_id
          ? videoGroupMap.get(match.competitor_video_id)
          : null) ||
        null;

      if (resolvedGroupId !== selectedGroupId) return;

      const keyword = match.keyword || "Unknown Keyword";

      const current =
        keywordMap.get(keyword) ||
        {
          keyword,
          traffic: 0,
          viewsPerDay: 0,
          videos: 0,
          topVideoTitle: "-",
        };

      current.traffic += Number(match.view_count || 0);
      current.viewsPerDay += Number(match.views_per_day || 0);
      current.videos += 1;

      if (Number(match.view_count || 0) >= current.traffic) {
        current.topVideoTitle = match.video_title || "-";
      }

      keywordMap.set(keyword, current);
    });

    return Array.from(keywordMap.values())
      .sort((a, b) => b.viewsPerDay - a.viewsPerDay)
      .slice(0, 20);
  }, [
    keywordMatches,
    selectedGroupId,
    videoGroupMap,
  ]);

  const activeKeyword = selectedKeyword || keywordRows[0]?.keyword || "";

  const activeStatus = selectedGroup?.recommendedStatus || "Watch";
  const statusStyle = statusConfig[activeStatus];
  const StatusIcon = statusStyle.icon;

  const groupActionLogs = actionLogs.filter((log) => {
    if (!selectedGroup) return true;

    const key = log.group_id === null ? "ungrouped" : String(log.group_id);

    return key === selectedGroup.groupKey || log.group_name === selectedGroup.groupName;
  });

  const totalActionPages = Math.max(
    1,
    Math.ceil(groupActionLogs.length / ACTION_PAGE_SIZE)
  );

  const safeActionPage = Math.min(actionPage, totalActionPages);

  const paginatedActionLogs = groupActionLogs.slice(
    (safeActionPage - 1) * ACTION_PAGE_SIZE,
    safeActionPage * ACTION_PAGE_SIZE
  );

  function buildReportText() {
    if (!selectedGroup) return "";

    const sourceTitle = selectedVideo
      ? toText((selectedVideo as LooseVideo).title)
      : selectedGroup.topVideoTitle;

    const sourceUrl = selectedVideo ? getVideoUrl(selectedVideo) : selectedGroup.topVideoUrl;

    return [
      `StudioOS Analyst Action Report`,
      ``,
      `Group: ${selectedGroup.groupName}`,
      `Recommended Status: ${activeStatus}`,
      `Action Score: ${selectedGroup.score}/100`,
      `Market Share: ${formatPercent(selectedGroup.marketShare)}`,
      `Traffic: ${formatNumber(selectedGroup.traffic)}`,
      `Views/day: ${formatNumber(Math.round(selectedGroup.viewsPerDay))}`,
      `Videos: ${formatNumber(selectedGroup.videos)}`,
      `Channels: ${formatNumber(selectedGroup.channels)}`,
      ``,
      `Selected Keyword: ${activeKeyword || "-"}`,
      `Selected Source Video: ${sourceTitle || "-"}`,
      `Source URL: ${sourceUrl || "-"}`,
      ``,
      `Recommended Move: ${
        activeStatus === "Attack"
          ? "Create remix idea and test immediately."
          : activeStatus === "Watch"
            ? "Keep in watchlist and test with a small batch."
            : "Ignore for now unless new traffic spike appears."
      }`,
    ].join("\n");
  }

  async function saveActionLog({
    actionType,
    status,
    title,
    summary,
    sourceType,
  }: {
    actionType: string;
    status?: string;
    title: string;
    summary: string;
    sourceType?: string;
  }) {
    if (!selectedGroup) return;

    const selectedVideoUrl = selectedVideo ? getVideoUrl(selectedVideo) : null;

    const { error } = await supabase
      .from("analyst_actions")
      .insert({
        action_type: actionType,
        group_id: selectedGroup.groupId,
        group_name: selectedGroup.groupName,
        status: status || activeStatus,
        title,
        summary,
        source_type: sourceType || "group",
        source_video_id: selectedVideo ? getVideoId(selectedVideo) : null,
        source_video_url: selectedVideoUrl,
        source_keyword: activeKeyword || null,
        payload: {
          action_score: selectedGroup.score,
          market_share: selectedGroup.marketShare,
          traffic: selectedGroup.traffic,
          views_per_day: selectedGroup.viewsPerDay,
        },
      });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    await loadActionLogs();
  }

  async function handleCreateRemixIdea() {
    if (!selectedGroup) return;

    setLoading(true);
    setErrorMessage("");
    setMessage("");

    const sourceTitle = selectedVideo
      ? toText((selectedVideo as LooseVideo).title)
      : selectedGroup.topVideoTitle;

    const sourceUrl = selectedVideo ? getVideoUrl(selectedVideo) : selectedGroup.topVideoUrl;

    const keywordPart = activeKeyword || selectedGroup.groupName;

    const ideaTitle = `${keywordPart}: High-Velocity ${selectedGroup.groupName} Remix`;

    const { data, error } = await supabase
      .from("ideas")
      .insert({
        title: ideaTitle,
        theme: activeKeyword || selectedGroup.groupName,
        status: "Idea",
        score: Math.max(80, selectedGroup.score),
        language: "EN",
        hook: `Use the proven ${keywordPart} signal from ${selectedGroup.groupName}, but rebuild the story with a new character, new conflict and stronger before-after emotion.`,
        thumbnail_prompt: `Create a high-contrast YouTube thumbnail inspired by the market signal "${keywordPart}". Do not copy the competitor. Use expressive faces, clear transformation, bright color split, readable visual contrast and a new original scene.`,
        storyline: `Original remix direction: take the market signal "${keywordPart}" from ${selectedGroup.groupName}, then create a fresh story with new characters, different setting, stronger emotional stakes, and a clear transformation payoff.`,
        notes: [
          `Created from Analyst Action Center.`,
          `Group: ${selectedGroup.groupName}`,
          `Action Status: ${activeStatus}`,
          `Action Score: ${selectedGroup.score}`,
          `Source video: ${sourceTitle}`,
          `Source URL: ${sourceUrl}`,
          `Source keyword: ${activeKeyword || "-"}`,
        ].join("\n"),
      })
      .select("id")
      .single();

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    await saveActionLog({
      actionType: "idea_created",
      status: activeStatus,
      title: `Created remix idea #${data?.id || "-"}`,
      summary: `Created Idea Bank item from ${selectedGroup.groupName} using keyword "${activeKeyword || "-"}".`,
      sourceType: "remix_idea",
    });

    setMessage(`Saved to Idea Bank: ${ideaTitle}`);
    setLoading(false);
  }

  async function handleSaveInsight() {
    if (!selectedGroup) return;

    setLoading(true);
    setErrorMessage("");
    setMessage("");

    await saveActionLog({
      actionType: "insight_saved",
      status: activeStatus,
      title: `${selectedGroup.groupName} analyst insight`,
      summary: buildReportText(),
      sourceType: "group_report",
    });

    setMessage("Saved group insight to Analyst Action Log.");
    setLoading(false);
  }

  async function handleMarkGroup(status: "Attack" | "Watch" | "Ignore") {
    if (!selectedGroup) return;

    setLoading(true);
    setErrorMessage("");
    setMessage("");

    await saveActionLog({
      actionType: "group_marked",
      status,
      title: `Marked ${selectedGroup.groupName} as ${status}`,
      summary: `${selectedGroup.groupName} was marked as ${status} from Analyst Action Center.`,
      sourceType: "group_status",
    });

    setMessage(`Marked ${selectedGroup.groupName} as ${status}.`);
    setLoading(false);
  }

  async function handleCopyReport() {
    const report = buildReportText();

    await navigator.clipboard.writeText(report);

    setMessage("Copied analyst report.");
  }

  function handleExportReport() {
    const report = buildReportText();

    const blob = new Blob([report], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${selectedGroup?.groupName || "group"}-analyst-report.txt`;
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 studioos-readable">
      <div className="rounded-3xl bg-zinc-950 text-white p-7 shadow">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-2 text-sm">
              <Target size={16} />
              Analyst Action Center
            </div>

            <h1 className="text-3xl font-bold mt-4">
              Turn competitor signals into actions
            </h1>

            <p className="text-zinc-300 mt-2 max-w-3xl">
              Chọn group, xem tín hiệu, tạo remix idea, lưu insight, đánh dấu Attack / Watch / Ignore và export report.
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm text-zinc-400">
              Current action
            </p>

            <p className="text-3xl font-bold mt-1">
              {activeStatus}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow p-5">
        <div className="grid grid-cols-[1fr_1fr_1fr] gap-4">
          <select
            value={selectedGroupKey}
            onChange={(event) => setSelectedGroupKey(event.target.value)}
            className="border rounded-2xl px-4 py-3 font-semibold"
          >
            {groupRows.map((group) => (
              <option key={group.groupKey} value={group.groupKey}>
                {group.groupName} · {formatNumber(group.traffic)} views · {group.recommendedStatus}
              </option>
            ))}
          </select>

          <select
            value={compareGroupKey}
            onChange={(event) => setCompareGroupKey(event.target.value)}
            className="border rounded-2xl px-4 py-3 font-semibold"
          >
            <option value="">Compare with another group</option>

            {groupRows
              .filter((group) => group.groupKey !== selectedGroup?.groupKey)
              .map((group) => (
                <option key={group.groupKey} value={group.groupKey}>
                  {group.groupName} · {formatPercent(group.marketShare)} share
                </option>
              ))}
          </select>

          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search source videos..."
              className="w-full border rounded-2xl pl-11 pr-4 py-3"
            />
          </div>
        </div>
      </div>

      {selectedGroup && (
        <>
          <div className="grid grid-cols-5 gap-4">
            <KpiCard
              title="Action Score"
              value={`${selectedGroup.score}/100`}
              description="Combined signal from share, velocity and volume"
              icon={<Flame size={22} />}
              tone="rose"
            />

            <KpiCard
              title="Market Share"
              value={formatPercent(selectedGroup.marketShare)}
              description="Traffic share inside tracked competitor market"
              icon={<Crown size={22} />}
              tone="amber"
            />

            <KpiCard
              title="Views/day"
              value={formatNumber(Math.round(selectedGroup.viewsPerDay))}
              description="Estimated current traffic velocity"
              icon={<Zap size={22} />}
              tone="purple"
            />

            <KpiCard
              title="Videos"
              value={formatNumber(selectedGroup.videos)}
              description="Source video volume"
              icon={<PlayCircle size={22} />}
              tone="blue"
            />

            <KpiCard
              title="Channels"
              value={formatNumber(selectedGroup.channels)}
              description="Tracked channels in group"
              icon={<Users size={22} />}
              tone="emerald"
            />
          </div>

          <div className="grid grid-cols-[0.9fr_1.1fr] gap-6">
            <div className={`rounded-3xl border shadow p-6 ${statusStyle.bg} ${statusStyle.border}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wide ${statusStyle.text}`}>
                    Recommended action
                  </p>

                  <h2 className="text-3xl font-bold mt-3">
                    {selectedGroup.groupName}: {activeStatus}
                  </h2>

                  <p className="text-slate-600 mt-2">
                    {statusStyle.description}
                  </p>
                </div>

                <div className={`w-14 h-14 rounded-2xl ${statusStyle.fill} text-white flex items-center justify-center`}>
                  <StatusIcon size={25} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-6">
                <button
                  onClick={() => handleMarkGroup("Attack")}
                  disabled={loading}
                  className="rounded-2xl bg-rose-600 text-white px-4 py-3 font-bold disabled:opacity-50"
                >
                  Attack
                </button>

                <button
                  onClick={() => handleMarkGroup("Watch")}
                  disabled={loading}
                  className="rounded-2xl bg-amber-500 text-white px-4 py-3 font-bold disabled:opacity-50"
                >
                  Watch
                </button>

                <button
                  onClick={() => handleMarkGroup("Ignore")}
                  disabled={loading}
                  className="rounded-2xl bg-slate-700 text-white px-4 py-3 font-bold disabled:opacity-50"
                >
                  Ignore
                </button>
              </div>

              {compareGroup && (
                <div className="mt-6 rounded-2xl bg-white border p-4">
                  <p className="font-bold">
                    Compare: {selectedGroup.groupName} vs {compareGroup.groupName}
                  </p>

                  <div className="space-y-4 mt-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{selectedGroup.groupName}</span>
                        <span>{formatNumber(selectedGroup.traffic)}</span>
                      </div>

                      <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-rose-500 rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              (selectedGroup.traffic /
                                Math.max(1, selectedGroup.traffic, compareGroup.traffic)) *
                                100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{compareGroup.groupName}</span>
                        <span>{formatNumber(compareGroup.traffic)}</span>
                      </div>

                      <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              (compareGroup.traffic /
                                Math.max(1, selectedGroup.traffic, compareGroup.traffic)) *
                                100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl border shadow p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-purple-50 text-purple-700 px-3 py-1 text-xs font-bold">
                    <Sparkles size={14} />
                    One-click actions
                  </div>

                  <h2 className="text-2xl font-bold mt-3">
                    Action Builder
                  </h2>

                  <p className="text-slate-600 mt-1">
                    Tạo idea, lưu insight hoặc export report từ tín hiệu đang chọn.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  onClick={handleCreateRemixIdea}
                  disabled={loading || !selectedGroup}
                  className="rounded-2xl bg-zinc-950 text-white px-4 py-4 font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Lightbulb size={18} />
                  Create Remix Idea
                </button>

                <button
                  onClick={handleSaveInsight}
                  disabled={loading || !selectedGroup}
                  className="rounded-2xl border px-4 py-4 font-bold flex items-center justify-center gap-2 hover:bg-slate-50 disabled:opacity-50"
                >
                  <Save size={18} />
                  Save Group Insight
                </button>

                <button
                  onClick={handleCopyReport}
                  disabled={!selectedGroup}
                  className="rounded-2xl border px-4 py-4 font-bold flex items-center justify-center gap-2 hover:bg-slate-50 disabled:opacity-50"
                >
                  <Copy size={18} />
                  Copy Report
                </button>

                <button
                  onClick={handleExportReport}
                  disabled={!selectedGroup}
                  className="rounded-2xl border px-4 py-4 font-bold flex items-center justify-center gap-2 hover:bg-slate-50 disabled:opacity-50"
                >
                  <ArrowDownToLine size={18} />
                  Export Report
                </button>
              </div>

              <div className="mt-6 rounded-2xl bg-slate-50 border p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Selected source
                </p>

                <p className="font-bold mt-2">
                  {selectedVideo
                    ? toText((selectedVideo as LooseVideo).title)
                    : selectedGroup.topVideoTitle}
                </p>

                <p className="text-sm text-slate-600 mt-2">
                  Keyword:{" "}
                  <span className="font-bold text-zinc-950">
                    {activeKeyword || "-"}
                  </span>
                </p>
              </div>

              {message && (
                <p className="mt-4 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-3 text-sm font-semibold">
                  {message}
                </p>
              )}

              {errorMessage && (
                <p className="mt-4 rounded-2xl bg-red-50 text-red-700 border border-red-200 px-4 py-3 text-sm font-semibold">
                  {errorMessage}
                </p>
              )}
            </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-[1.1fr_0.9fr] gap-6">
        <div className="bg-white rounded-3xl border shadow overflow-hidden">
          <div className="p-6 border-b">
            <div className="flex items-center gap-2">
              <Trophy size={20} className="text-rose-600" />

              <h3 className="text-xl font-bold">
                Source Videos to Attack
              </h3>
            </div>

            <p className="text-sm text-slate-600 mt-1">
              Chọn video nguồn để tạo remix idea hoặc action report.
            </p>
          </div>

          <div className="divide-y max-h-[620px] overflow-auto">
            {selectedGroupVideos.slice(0, 30).map((video, index) => {
              const loose = video as LooseVideo;
              const videoId = getVideoId(video);
              const thumbnail = getBestThumbnail(video);
              const videoUrl = getVideoUrl(video);
              const isSelected =
                selectedVideoId === videoId ||
                (!selectedVideoId && index === 0);

              return (
                <div
                  key={videoId}
                  className={`p-4 grid grid-cols-[150px_1fr_auto] gap-4 items-center ${
                    isSelected ? "bg-rose-50" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="w-[150px] aspect-video rounded-2xl overflow-hidden bg-slate-100 border">
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt={toText(loose.title)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <PlayCircle size={28} />
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-500">
                      #{index + 1} · {toText(loose.channel_title) || "-"}
                    </p>

                    {videoUrl ? (
                      <a
                        href={videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-zinc-950 hover:text-blue-700 hover:underline"
                      >
                        {toText(loose.title)}
                      </a>
                    ) : (
                      <p className="font-bold text-zinc-950">
                        {toText(loose.title)}
                      </p>
                    )}

                    <p className="text-sm text-slate-500 mt-2">
                      {formatDate(toText(loose.published_at))} ·{" "}
                      {formatNumber(toNumber(loose.like_count))} likes ·{" "}
                      {formatNumber(toNumber(loose.comment_count))} comments
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      {formatNumber(toNumber(loose.view_count))}
                    </p>

                    <p className="text-xs text-slate-500">
                      views
                    </p>

                    <button
                      onClick={() => setSelectedVideoId(videoId)}
                      className="mt-3 rounded-xl bg-zinc-950 text-white px-4 py-2 text-sm font-bold"
                    >
                      Use Source
                    </button>
                  </div>
                </div>
              );
            })}

            {selectedGroupVideos.length === 0 && (
              <div className="p-10 text-center text-slate-500">
                No source videos found.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl border shadow overflow-hidden">
          <div className="p-6 border-b">
            <div className="inline-flex items-center gap-2 rounded-full bg-purple-50 text-purple-700 px-3 py-1 text-xs font-bold">
              <TrendingUp size={14} />
              Keyword signals
            </div>

            <h3 className="text-xl font-bold mt-3">
              Keywords to Use
            </h3>

            <p className="text-sm text-slate-600 mt-1">
              Chọn key đang có tín hiệu trong group này.
            </p>
          </div>

          <div className="divide-y max-h-[620px] overflow-auto">
            {keywordRows.map((keyword, index) => {
              const isSelected =
                selectedKeyword === keyword.keyword ||
                (!selectedKeyword && index === 0);

              return (
                <button
                  key={keyword.keyword}
                  onClick={() => setSelectedKeyword(keyword.keyword)}
                  className={`w-full text-left p-4 ${
                    isSelected ? "bg-purple-50" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-purple-100 text-purple-700 px-3 py-1 text-xs font-bold">
                          #{index + 1}
                        </span>

                        <p className="font-bold">
                          {keyword.keyword}
                        </p>
                      </div>

                      <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                        {keyword.topVideoTitle}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-bold">
                        {formatNumber(Math.round(keyword.viewsPerDay))}
                      </p>

                      <p className="text-xs text-slate-500">
                        views/day
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}

            {keywordRows.length === 0 && (
              <div className="p-10 text-center text-slate-500">
                No keyword signal yet. Refresh Keyword Radar first.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow overflow-hidden">
        <div className="p-6 border-b flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Clipboard size={20} className="text-emerald-600" />

              <h3 className="text-xl font-bold">
                Analyst Action Log
              </h3>
            </div>

            <p className="text-sm text-slate-600 mt-1">
              Các action đã lưu cho group đang chọn.
            </p>
          </div>

          <div className="text-sm text-slate-500">
            Page {safeActionPage} / {totalActionPages}
          </div>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left p-4">Time</th>
                <th className="text-left p-4">Action</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Source</th>
                <th className="text-left p-4">Summary</th>
              </tr>
            </thead>

            <tbody>
              {paginatedActionLogs.map((log) => (
                <tr key={log.id} className="border-t">
                  <td className="p-4 text-slate-600">
                    {formatDate(log.created_at)}
                  </td>

                  <td className="p-4 font-bold">
                    {log.title}
                  </td>

                  <td className="p-4">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">
                      {log.status || "-"}
                    </span>
                  </td>

                  <td className="p-4">
                    {log.source_video_url ? (
                      <a
                        href={log.source_video_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-700 font-semibold hover:underline"
                      >
                        Open source
                      </a>
                    ) : (
                      log.source_keyword || "-"
                    )}
                  </td>

                  <td className="p-4 text-slate-600 max-w-xl">
                    <p className="line-clamp-2">
                      {log.summary || "-"}
                    </p>
                  </td>
                </tr>
              ))}

              {paginatedActionLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No saved action yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t bg-slate-50 px-6 py-4 flex justify-end gap-2">
          <button
            onClick={() => setActionPage((page) => Math.max(1, page - 1))}
            disabled={safeActionPage === 1}
            className="px-4 py-2 rounded-xl border bg-white disabled:opacity-50"
          >
            Previous
          </button>

          <button
            onClick={() =>
              setActionPage((page) => Math.min(totalActionPages, page + 1))
            }
            disabled={safeActionPage === totalActionPages}
            className="px-4 py-2 rounded-xl border bg-white disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow p-6">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={20} className="text-emerald-600" />

          <h3 className="text-xl font-bold">
            Action Center takeaway
          </h3>
        </div>

        <p className="text-slate-600 mt-3">
          Mục này dùng để biến research thành hành động cụ thể: group nào Attack, video nào remix, keyword nào dùng, và action nào đã lưu.
          Khi có signal tốt, ưu tiên Create Remix Idea rồi theo dõi lại trong Idea Bank.
        </p>
      </div>
    </div>
  );
}
