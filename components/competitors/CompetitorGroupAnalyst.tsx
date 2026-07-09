"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  Crown,
  Eye,
  Layers,
  LineChart,
  PlayCircle,
  Search,
  Sparkles,
  TrendingUp,
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

type KeywordMatchRow = {
  id: number;
  keyword_id: number | null;
  keyword: string;
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

type GroupRow = {
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
  topVideoViews: number;
};

type ChannelRow = {
  channelId: number | null;
  channelName: string;
  traffic: number;
  viewsPerDay: number;
  videos: number;
  topVideoTitle: string;
  topVideoUrl: string | null;
  topVideoViews: number;
};

type KeywordRow = {
  keyword: string;
  traffic: number;
  viewsPerDay: number;
  videos: number;
  topVideoTitle: string;
  latestDate: string;
};

const pageSize = 10;

const colors = [
  {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    fill: "bg-rose-500",
  },
  {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    fill: "bg-orange-500",
  },
  {
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
    fill: "bg-purple-500",
  },
  {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    fill: "bg-blue-500",
  },
  {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    fill: "bg-emerald-500",
  },
];

function getColor(index: number) {
  return colors[index % colors.length];
}

function formatNumber(value: number | null | undefined) {
  return Number(value || 0).toLocaleString("en-US");
}

function formatPercent(value: number | null | undefined) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function getMonthKey(value: string | null | undefined) {
  if (!value) return "Unknown";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown";

  return `${date.getUTCFullYear()}-${String(
    date.getUTCMonth() + 1
  ).padStart(2, "0")}`;
}

function formatMonthLabel(monthKey: string) {
  if (monthKey === "all") return "All time";
  if (monthKey === "Unknown") return "Unknown";

  const [year, month] = monthKey.split("-");

  return `${month}/${year}`;
}

function getVideoDate(video: CompetitorVideo) {
  return video.published_at || video.created_at || "";
}

function getViewsPerDay(video: CompetitorVideo) {
  const views = Number(video.view_count || 0);

  if (!video.published_at) return views;

  const publishedTime = new Date(video.published_at).getTime();

  if (!publishedTime) return views;

  const ageDays = Math.max(
    1,
    (Date.now() - publishedTime) / (1000 * 60 * 60 * 24)
  );

  return views / ageDays;
}

function getBestThumbnail(video: CompetitorVideo) {
  return (
    video.thumbnail_maxres_url ||
    video.thumbnail_standard_url ||
    video.thumbnail_high_url ||
    video.thumbnail_medium_url ||
    video.thumbnail_url ||
    video.thumbnail_default_url ||
    ""
  );
}

function getVideoUrl(video: CompetitorVideo) {
  if (video.video_url) return video.video_url;

  if (video.youtube_video_id) {
    return `https://www.youtube.com/watch?v=${video.youtube_video_id}`;
  }

  return "";
}

function KpiCard({
  title,
  value,
  description,
  icon,
  colorIndex,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  colorIndex: number;
}) {
  const color = getColor(colorIndex);

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${color.bg} ${color.border}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-sm font-bold ${color.text}`}>
            {title}
          </p>

          <p className="text-3xl font-bold mt-2 text-zinc-950">
            {value}
          </p>

          <p className="text-xs text-slate-600 mt-2">
            {description}
          </p>
        </div>

        <div className={`w-12 h-12 rounded-2xl ${color.fill} text-white flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function MiniMonthlyChart({
  rows,
}: {
  rows: {
    month: string;
    traffic: number;
    share: number;
  }[];
}) {
  const chartRows = rows.slice(-8);
  const maxTraffic = Math.max(1, ...chartRows.map((row) => row.traffic));

  return (
    <div className="bg-white rounded-3xl border shadow-sm p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-bold">
            <LineChart size={14} />
            Monthly trend
          </div>

          <h3 className="text-2xl font-bold mt-3">
            Group traffic by month
          </h3>

          <p className="text-sm text-slate-600 mt-1">
            Xem group này tăng giảm traffic và thị phần qua từng tháng.
          </p>
        </div>
      </div>

      <div className="mt-6 h-72 flex items-end gap-3 border-b border-slate-200 pb-4">
        {chartRows.map((row) => {
          const height = Math.max(8, (row.traffic / maxTraffic) * 220);

          return (
            <div
              key={row.month}
              className="flex-1 flex flex-col items-center justify-end gap-2"
              title={`${formatMonthLabel(row.month)} · ${formatNumber(row.traffic)} views · ${formatPercent(row.share)} share`}
            >
              <div className="text-xs font-bold text-slate-700">
                {formatPercent(row.share)}
              </div>

              <div
                className="w-full rounded-t-2xl bg-zinc-900"
                style={{
                  height,
                }}
              />

              <div className="text-xs text-slate-500">
                {formatMonthLabel(row.month)}
              </div>
            </div>
          );
        })}

        {chartRows.length === 0 && (
          <div className="w-full h-full flex items-center justify-center text-slate-500">
            No monthly data.
          </div>
        )}
      </div>
    </div>
  );
}

export default function CompetitorGroupAnalyst({
  competitorGroups,
  competitorChannels,
  competitorVideos,
}: Props) {
  const [selectedGroupKey, setSelectedGroupKey] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("latest");
  const [search, setSearch] = useState("");
  const [videoPage, setVideoPage] = useState(1);
  const [channelPage, setChannelPage] = useState(1);
  const [keywordMatches, setKeywordMatches] = useState<KeywordMatchRow[]>([]);
  const [keywordLoading, setKeywordLoading] = useState(false);

  useEffect(() => {
    async function loadKeywordMatches() {
      setKeywordLoading(true);

      const { data, error } = await supabase
        .from("competitor_keyword_video_matches")
        .select(
          "id, keyword_id, keyword, keyword_slug, competitor_video_id, video_title, video_url, thumbnail_url, channel_title, competitor_channel_id, group_id, published_at, view_count, views_per_day, match_source"
        )
        .limit(7000);

      if (!error && data) {
        setKeywordMatches(data as KeywordMatchRow[]);
      }

      setKeywordLoading(false);
    }

    loadKeywordMatches();
  }, []);

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

  function resolveVideoGroupId(video: CompetitorVideo) {
    const channel = channelMap.get(Number(video.competitor_channel_id || 0));

    return video.group_id || channel?.groupId || null;
  }

  const availableMonths = useMemo(() => {
    return Array.from(
      new Set(
        competitorVideos
          .map((video) => getMonthKey(getVideoDate(video)))
          .filter((month) => month !== "Unknown")
      )
    ).sort((a, b) => b.localeCompare(a));
  }, [competitorVideos]);

  const activeMonth =
    selectedMonth === "latest"
      ? availableMonths[0] || "all"
      : selectedMonth;

  const videosInScope = useMemo(() => {
    if (activeMonth === "all") return competitorVideos;

    return competitorVideos.filter(
      (video) => getMonthKey(getVideoDate(video)) === activeMonth
    );
  }, [activeMonth, competitorVideos]);

  const totalMarketTraffic = videosInScope.reduce(
    (sum, video) => sum + Number(video.view_count || 0),
    0
  );

  const groupRows = useMemo(() => {
    const groupIds = new Set<number | null>();

    competitorGroups.forEach((group) => groupIds.add(group.id));

    videosInScope.forEach((video) => {
      groupIds.add(resolveVideoGroupId(video));
    });

    const rows = Array.from(groupIds).map((groupId): GroupRow => {
      const groupInfo = groupId ? groupMap.get(groupId) : null;
      const groupKey = groupId === null ? "ungrouped" : String(groupId);

      const groupVideos = videosInScope.filter(
        (video) => resolveVideoGroupId(video) === groupId
      );

      const traffic = groupVideos.reduce(
        (sum, video) => sum + Number(video.view_count || 0),
        0
      );

      const viewsPerDay = groupVideos.reduce(
        (sum, video) => sum + getViewsPerDay(video),
        0
      );

      const channelIds = new Set(
        groupVideos
          .map((video) => Number(video.competitor_channel_id || 0))
          .filter(Boolean)
      );

      const topVideo = [...groupVideos].sort(
        (a, b) => Number(b.view_count || 0) - Number(a.view_count || 0)
      )[0];

      return {
        groupKey,
        groupId,
        groupName: groupInfo?.name || "Ungrouped",
        category: groupInfo?.category || "Uncategorized",
        traffic,
        viewsPerDay,
        videos: groupVideos.length,
        channels: channelIds.size,
        marketShare:
          traffic / Math.max(1, totalMarketTraffic) * 100,
        topVideoTitle: topVideo?.title || "-",
        topVideoUrl: topVideo ? getVideoUrl(topVideo) : null,
        topVideoViews: Number(topVideo?.view_count || 0),
      };
    });

    return rows
      .filter((row) => row.traffic > 0 || row.videos > 0)
      .sort((a, b) => b.traffic - a.traffic);
  }, [
    competitorGroups,
    groupMap,
    totalMarketTraffic,
    videosInScope,
  ]);

  useEffect(() => {
    if (!selectedGroupKey && groupRows.length > 0) {
      setSelectedGroupKey(groupRows[0].groupKey);
    }
  }, [groupRows, selectedGroupKey]);

  const selectedGroup =
    groupRows.find((row) => row.groupKey === selectedGroupKey) ||
    groupRows[0];

  const selectedGroupId =
    selectedGroup?.groupKey === "ungrouped"
      ? null
      : Number(selectedGroup?.groupKey || 0);

  const selectedGroupVideos = useMemo(() => {
    if (!selectedGroup) return [];

    return videosInScope
      .filter((video) => resolveVideoGroupId(video) === selectedGroupId)
      .filter((video) => {
        const query = search.trim().toLowerCase();

        if (!query) return true;

        return (
          video.title.toLowerCase().includes(query) ||
          String(video.channel_title || "").toLowerCase().includes(query)
        );
      })
      .sort((a, b) => Number(b.view_count || 0) - Number(a.view_count || 0));
  }, [
    search,
    selectedGroup,
    selectedGroupId,
    videosInScope,
  ]);

  const monthlyRows = useMemo(() => {
    if (!selectedGroup) return [];

    const months = Array.from(
      new Set(
        competitorVideos
          .map((video) => getMonthKey(getVideoDate(video)))
          .filter((month) => month !== "Unknown")
      )
    ).sort((a, b) => a.localeCompare(b));

    return months.map((month) => {
      const monthVideos = competitorVideos.filter(
        (video) => getMonthKey(getVideoDate(video)) === month
      );

      const monthTotal = monthVideos.reduce(
        (sum, video) => sum + Number(video.view_count || 0),
        0
      );

      const groupVideos = monthVideos.filter(
        (video) => resolveVideoGroupId(video) === selectedGroupId
      );

      const traffic = groupVideos.reduce(
        (sum, video) => sum + Number(video.view_count || 0),
        0
      );

      return {
        month,
        traffic,
        videos: groupVideos.length,
        share: traffic / Math.max(1, monthTotal) * 100,
      };
    });
  }, [
    competitorVideos,
    selectedGroup,
    selectedGroupId,
  ]);

  const topChannels = useMemo(() => {
    const channelStats = new Map<number | null, ChannelRow>();

    selectedGroupVideos.forEach((video) => {
      const channelId = Number(video.competitor_channel_id || 0) || null;
      const channel = channelId ? channelMap.get(channelId) : null;
      const key = channelId;

      const current =
        channelStats.get(key) ||
        {
          channelId,
          channelName: channel?.name || video.channel_title || "Unknown Channel",
          traffic: 0,
          viewsPerDay: 0,
          videos: 0,
          topVideoTitle: "-",
          topVideoUrl: null,
          topVideoViews: 0,
        };

      const views = Number(video.view_count || 0);

      current.traffic += views;
      current.viewsPerDay += getViewsPerDay(video);
      current.videos += 1;

      if (views > current.topVideoViews) {
        current.topVideoTitle = video.title;
        current.topVideoUrl = getVideoUrl(video);
        current.topVideoViews = views;
      }

      channelStats.set(key, current);
    });

    return Array.from(channelStats.values()).sort(
      (a, b) => b.traffic - a.traffic
    );
  }, [channelMap, selectedGroupVideos]);

  const topKeywords = useMemo(() => {
    const videoGroupMap = new Map<number, number | null>();

    competitorVideos.forEach((video) => {
      videoGroupMap.set(video.id, resolveVideoGroupId(video));
    });

    const keywordMap = new Map<string, KeywordRow>();

    keywordMatches.forEach((match) => {
      const resolvedGroupId =
        match.group_id ||
        (match.competitor_video_id
          ? videoGroupMap.get(match.competitor_video_id)
          : null) ||
        null;

      if (resolvedGroupId !== selectedGroupId) return;

      if (
        activeMonth !== "all" &&
        getMonthKey(match.published_at) !== activeMonth
      ) {
        return;
      }

      const keyword = match.keyword || "Unknown Keyword";
      const current =
        keywordMap.get(keyword) ||
        {
          keyword,
          traffic: 0,
          viewsPerDay: 0,
          videos: 0,
          topVideoTitle: "-",
          latestDate: "-",
        };

      current.traffic += Number(match.view_count || 0);
      current.viewsPerDay += Number(match.views_per_day || 0);
      current.videos += 1;

      if (Number(match.view_count || 0) >= current.traffic) {
        current.topVideoTitle = match.video_title || "-";
      }

      if (
        match.published_at &&
        (current.latestDate === "-" ||
          new Date(match.published_at).getTime() >
            new Date(current.latestDate).getTime())
      ) {
        current.latestDate = match.published_at;
      }

      keywordMap.set(keyword, current);
    });

    return Array.from(keywordMap.values())
      .sort((a, b) => b.viewsPerDay - a.viewsPerDay)
      .slice(0, 12);
  }, [
    activeMonth,
    competitorVideos,
    keywordMatches,
    selectedGroupId,
  ]);

  const totalVideoPages = Math.max(
    1,
    Math.ceil(selectedGroupVideos.length / pageSize)
  );

  const totalChannelPages = Math.max(
    1,
    Math.ceil(topChannels.length / pageSize)
  );

  const safeVideoPage = Math.min(videoPage, totalVideoPages);
  const safeChannelPage = Math.min(channelPage, totalChannelPages);

  const paginatedVideos = selectedGroupVideos.slice(
    (safeVideoPage - 1) * pageSize,
    safeVideoPage * pageSize
  );

  const paginatedChannels = topChannels.slice(
    (safeChannelPage - 1) * pageSize,
    safeChannelPage * pageSize
  );

  return (
    <div className="space-y-6 studioos-readable">
      <div className="rounded-3xl bg-zinc-950 text-white p-7 shadow">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-2 text-sm">
              <BarChart3 size={16} />
              Competitor Analyst
            </div>

            <h1 className="text-3xl font-bold mt-4">
              Competitor Group Drilldown
            </h1>

            <p className="text-zinc-300 mt-2 max-w-3xl">
              Chọn từng group để xem traffic, market share, top channel, top video và keyword opportunity riêng của group đó.
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm text-zinc-400">
              Current period
            </p>

            <p className="text-3xl font-bold mt-1">
              {formatMonthLabel(activeMonth)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow p-5">
        <div className="grid grid-cols-[1fr_220px_1fr] gap-4">
          <select
            value={selectedGroupKey}
            onChange={(event) => {
              setSelectedGroupKey(event.target.value);
              setVideoPage(1);
              setChannelPage(1);
            }}
            className="border rounded-2xl px-4 py-3 font-semibold"
          >
            {groupRows.map((group) => (
              <option key={group.groupKey} value={group.groupKey}>
                {group.groupName} · {formatNumber(group.traffic)} views
              </option>
            ))}
          </select>

          <select
            value={selectedMonth}
            onChange={(event) => {
              setSelectedMonth(event.target.value);
              setVideoPage(1);
              setChannelPage(1);
            }}
            className="border rounded-2xl px-4 py-3 font-semibold"
          >
            <option value="latest">Latest month</option>
            <option value="all">All time</option>

            {availableMonths.map((month) => (
              <option key={month} value={month}>
                {formatMonthLabel(month)}
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
              onChange={(event) => {
                setSearch(event.target.value);
                setVideoPage(1);
              }}
              placeholder="Search videos or channels in selected group..."
              className="w-full border rounded-2xl pl-11 pr-4 py-3"
            />
          </div>
        </div>
      </div>

      {selectedGroup && (
        <>
          <div className="grid grid-cols-5 gap-4">
            <KpiCard
              title="Group Traffic"
              value={formatNumber(selectedGroup.traffic)}
              description="Public views in selected period"
              icon={<Eye size={22} />}
              colorIndex={0}
            />

            <KpiCard
              title="Market Share"
              value={formatPercent(selectedGroup.marketShare)}
              description="Share of tracked competitor traffic"
              icon={<Crown size={22} />}
              colorIndex={1}
            />

            <KpiCard
              title="Views/day"
              value={formatNumber(Math.round(selectedGroup.viewsPerDay))}
              description="Estimated current velocity"
              icon={<Zap size={22} />}
              colorIndex={2}
            />

            <KpiCard
              title="Videos"
              value={formatNumber(selectedGroup.videos)}
              description="Published videos in period"
              icon={<Layers size={22} />}
              colorIndex={3}
            />

            <KpiCard
              title="Channels"
              value={formatNumber(selectedGroup.channels)}
              description="Tracked channels in group"
              icon={<Users size={22} />}
              colorIndex={4}
            />
          </div>

          <div className="grid grid-cols-[1.1fr_0.9fr] gap-6">
            <MiniMonthlyChart rows={monthlyRows} />

            <div className="bg-white rounded-3xl border shadow-sm p-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 text-amber-700 px-3 py-1 text-xs font-bold">
                <Sparkles size={14} />
                Group insight
              </div>

              <h3 className="text-2xl font-bold mt-3">
                {selectedGroup.groupName}
              </h3>

              <p className="text-slate-600 mt-2">
                Group này đang chiếm{" "}
                <span className="font-bold text-zinc-950">
                  {formatPercent(selectedGroup.marketShare)}
                </span>{" "}
                traffic trong kỳ đang chọn, với{" "}
                <span className="font-bold text-zinc-950">
                  {formatNumber(selectedGroup.videos)}
                </span>{" "}
                videos và{" "}
                <span className="font-bold text-zinc-950">
                  {formatNumber(Math.round(selectedGroup.viewsPerDay))}
                </span>{" "}
                views/day.
              </p>

              <div className="mt-5 rounded-2xl bg-zinc-950 text-white p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-white/70">
                  Top video
                </p>

                {selectedGroup.topVideoUrl ? (
                  <a
                    href={selectedGroup.topVideoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-lg font-bold mt-2 hover:underline"
                  >
                    {selectedGroup.topVideoTitle}
                  </a>
                ) : (
                  <p className="text-lg font-bold mt-2">
                    {selectedGroup.topVideoTitle}
                  </p>
                )}

                <p className="text-sm text-white/60 mt-2">
                  {formatNumber(selectedGroup.topVideoViews)} views
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="bg-white rounded-3xl border shadow overflow-hidden">
        <div className="p-6 border-b flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold">
              Top Channels in Group
            </h3>

            <p className="text-sm text-slate-600 mt-1">
              Kênh nào trong group đang tạo traffic mạnh nhất.
            </p>
          </div>

          <div className="text-sm text-slate-500">
            Page {safeChannelPage} / {totalChannelPages}
          </div>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left p-4">Rank</th>
                <th className="text-left p-4">Channel</th>
                <th className="text-left p-4">Traffic</th>
                <th className="text-left p-4">Views/day</th>
                <th className="text-left p-4">Videos</th>
                <th className="text-left p-4">Top Video</th>
              </tr>
            </thead>

            <tbody>
              {paginatedChannels.map((channel, index) => {
                const rank = (safeChannelPage - 1) * pageSize + index + 1;
                const color = getColor(rank - 1);

                return (
                  <tr
                    key={`${channel.channelId}-${channel.channelName}`}
                    className="border-t"
                    style={{
                      borderLeft: `6px solid currentColor`,
                    }}
                  >
                    <td className={`p-4 font-bold ${color.text}`}>
                      #{rank}
                    </td>

                    <td className="p-4 font-bold">
                      {channel.channelName}
                    </td>

                    <td className="p-4 font-semibold">
                      {formatNumber(channel.traffic)}
                    </td>

                    <td className="p-4">
                      {formatNumber(Math.round(channel.viewsPerDay))}
                    </td>

                    <td className="p-4">
                      {formatNumber(channel.videos)}
                    </td>

                    <td className="p-4">
                      {channel.topVideoUrl ? (
                        <a
                          href={channel.topVideoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-700 font-semibold hover:underline"
                        >
                          {channel.topVideoTitle}
                        </a>
                      ) : (
                        <span>{channel.topVideoTitle}</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {paginatedChannels.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No channel data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t bg-slate-50 px-6 py-4 flex justify-end gap-2">
          <button
            onClick={() => setChannelPage((page) => Math.max(1, page - 1))}
            disabled={safeChannelPage === 1}
            className="px-4 py-2 rounded-xl border bg-white disabled:opacity-50"
          >
            Previous
          </button>

          <button
            onClick={() =>
              setChannelPage((page) => Math.min(totalChannelPages, page + 1))
            }
            disabled={safeChannelPage === totalChannelPages}
            className="px-4 py-2 rounded-xl border bg-white disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="bg-white rounded-3xl border shadow overflow-hidden">
          <div className="p-6 border-b flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold">
                Top Videos in Group
              </h3>

              <p className="text-sm text-slate-600 mt-1">
                Video mạnh nhất của group trong kỳ đang chọn.
              </p>
            </div>

            <div className="text-sm text-slate-500">
              Page {safeVideoPage} / {totalVideoPages}
            </div>
          </div>

          <div className="divide-y">
            {paginatedVideos.map((video, index) => {
              const rank = (safeVideoPage - 1) * pageSize + index + 1;
              const thumbnail = getBestThumbnail(video);
              const videoUrl = getVideoUrl(video);

              return (
                <div
                  key={video.id}
                  className="p-4 grid grid-cols-[160px_1fr_auto] gap-4 items-center hover:bg-slate-50"
                >
                  <div className="w-40 aspect-video rounded-2xl overflow-hidden bg-slate-100 border">
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt={video.title}
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
                      #{rank} · {video.channel_title || "-"}
                    </p>

                    {videoUrl ? (
                      <a
                        href={videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-zinc-950 hover:text-blue-700 hover:underline"
                      >
                        {video.title}
                      </a>
                    ) : (
                      <p className="font-bold text-zinc-950">
                        {video.title}
                      </p>
                    )}

                    <p className="text-sm text-slate-500 mt-2">
                      {formatMonthLabel(getMonthKey(getVideoDate(video)))} ·{" "}
                      {formatNumber(Number(video.like_count || 0))} likes ·{" "}
                      {formatNumber(Number(video.comment_count || 0))} comments
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      {formatNumber(Number(video.view_count || 0))}
                    </p>

                    <p className="text-xs text-slate-500">
                      views
                    </p>
                  </div>
                </div>
              );
            })}

            {paginatedVideos.length === 0 && (
              <div className="p-10 text-center text-slate-500">
                No video data.
              </div>
            )}
          </div>

          <div className="border-t bg-slate-50 px-6 py-4 flex justify-end gap-2">
            <button
              onClick={() => setVideoPage((page) => Math.max(1, page - 1))}
              disabled={safeVideoPage === 1}
              className="px-4 py-2 rounded-xl border bg-white disabled:opacity-50"
            >
              Previous
            </button>

            <button
              onClick={() =>
                setVideoPage((page) => Math.min(totalVideoPages, page + 1))
              }
              disabled={safeVideoPage === totalVideoPages}
              className="px-4 py-2 rounded-xl border bg-white disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl border shadow overflow-hidden">
          <div className="p-6 border-b">
            <div className="inline-flex items-center gap-2 rounded-full bg-purple-50 text-purple-700 px-3 py-1 text-xs font-bold">
              <TrendingUp size={14} />
              Group keyword opportunity
            </div>

            <h3 className="text-xl font-bold mt-3">
              Top Keyword Phrases
            </h3>

            <p className="text-sm text-slate-600 mt-1">
              Keyword phrases nổi trong group này.
            </p>
          </div>

          <div className="divide-y">
            {topKeywords.map((keyword, index) => {
              const color = getColor(index);

              return (
                <div key={keyword.keyword} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${color.bg} ${color.text}`}>
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
                </div>
              );
            })}

            {keywordLoading && (
              <div className="p-8 text-center text-slate-500">
                Loading keyword matches...
              </div>
            )}

            {!keywordLoading && topKeywords.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                No keyword data for this group yet.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow p-6">
        <div className="flex items-center gap-2">
          <ArrowUpRight size={20} className="text-emerald-600" />

          <h3 className="text-xl font-bold">
            Analyst takeaway
          </h3>
        </div>

        <p className="text-slate-600 mt-3">
          Dùng trang này để quyết định group nào nên theo dõi sát, group nào đang giảm tốc, và video/keyword nào đáng remix tiếp.
          Ưu tiên group có market share cao, views/day cao, top channel rõ ràng và keyword phrase có tín hiệu tăng.
        </p>
      </div>
    </div>
  );
}
