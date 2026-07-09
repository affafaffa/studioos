"use client";

import { Fragment, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Crown,
  Eye,
  Layers,
  LineChart as LineChartIcon,
  PieChart,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
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

type MetricMode = "views" | "videos" | "viewsPerDay";

type GroupMarketRow = {
  groupId: number | null;
  groupKey: string;
  groupName: string;
  category: string;
  totalViews: number;
  totalVideos: number;
  channelCount: number;
  avgViews: number;
  viewsPerDay: number;
  marketShare: number;
  previousMonthViews: number;
  monthOverMonthGrowth: number;
  topVideoTitle: string;
  topVideoViews: number;
  topVideoUrl: string | null;
  topChannel: string;
  dailyRows: DailyMarketRow[];
};

type DailyMarketRow = {
  date: string;
  views: number;
  videos: number;
  viewsPerDay: number;
  share: number;
};

const colorPalette = [
  {
    bg: "#fff1f2",
    softBg: "#ffe4e6",
    border: "#fb7185",
    text: "#be123c",
    fill: "#e11d48",
    gradient: "linear-gradient(90deg, #fb7185, #e11d48)",
  },
  {
    bg: "#fff7ed",
    softBg: "#ffedd5",
    border: "#fb923c",
    text: "#c2410c",
    fill: "#f97316",
    gradient: "linear-gradient(90deg, #fdba74, #f97316)",
  },
  {
    bg: "#fefce8",
    softBg: "#fef3c7",
    border: "#facc15",
    text: "#a16207",
    fill: "#eab308",
    gradient: "linear-gradient(90deg, #fde047, #eab308)",
  },
  {
    bg: "#f0fdf4",
    softBg: "#dcfce7",
    border: "#4ade80",
    text: "#15803d",
    fill: "#22c55e",
    gradient: "linear-gradient(90deg, #86efac, #22c55e)",
  },
  {
    bg: "#eff6ff",
    softBg: "#dbeafe",
    border: "#60a5fa",
    text: "#1d4ed8",
    fill: "#3b82f6",
    gradient: "linear-gradient(90deg, #93c5fd, #3b82f6)",
  },
  {
    bg: "#f5f3ff",
    softBg: "#ede9fe",
    border: "#a78bfa",
    text: "#6d28d9",
    fill: "#8b5cf6",
    gradient: "linear-gradient(90deg, #c4b5fd, #8b5cf6)",
  },
  {
    bg: "#fdf2f8",
    softBg: "#fce7f3",
    border: "#f472b6",
    text: "#be185d",
    fill: "#ec4899",
    gradient: "linear-gradient(90deg, #f9a8d4, #ec4899)",
  },
  {
    bg: "#ecfeff",
    softBg: "#cffafe",
    border: "#22d3ee",
    text: "#0e7490",
    fill: "#06b6d4",
    gradient: "linear-gradient(90deg, #67e8f9, #06b6d4)",
  },
];

function getPalette(index: number) {
  return colorPalette[index % colorPalette.length];
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

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return `${date.getUTCFullYear()}-${String(
    date.getUTCMonth() + 1
  ).padStart(2, "0")}`;
}

function getDayKey(value: string | null | undefined) {
  if (!value) return "Unknown";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return `${date.getUTCFullYear()}-${String(
    date.getUTCMonth() + 1
  ).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function formatMonthLabel(monthKey: string) {
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

function getPreviousMonthKey(monthKey: string) {
  if (monthKey === "Unknown") return "Unknown";

  const [yearText, monthText] = monthKey.split("-");
  const date = new Date(Date.UTC(Number(yearText), Number(monthText) - 2, 1));

  return `${date.getUTCFullYear()}-${String(
    date.getUTCMonth() + 1
  ).padStart(2, "0")}`;
}

function getMetricValue(row: GroupMarketRow, metricMode: MetricMode) {
  if (metricMode === "videos") return row.totalVideos;
  if (metricMode === "viewsPerDay") return row.viewsPerDay;

  return row.totalViews;
}

function getMetricLabel(metricMode: MetricMode) {
  if (metricMode === "videos") return "Video volume";
  if (metricMode === "viewsPerDay") return "Views/day velocity";

  return "Public traffic";
}

function getMetricDisplay(value: number, metricMode: MetricMode) {
  if (metricMode === "videos") {
    return `${formatNumber(value)} videos`;
  }

  return formatNumber(Math.round(value));
}

function getGrowthLabel(value: number) {
  if (!Number.isFinite(value)) return "-";
  if (value > 0) return `+${value.toFixed(1)}%`;
  return `${value.toFixed(1)}%`;
}

function MetricCard({
  title,
  value,
  description,
  icon,
  colorIndex,
}: {
  title: string;
  value: string;
  description: string;
  icon: ReactNode;
  colorIndex: number;
}) {
  const palette = getPalette(colorIndex);

  return (
    <div
      className="rounded-2xl border shadow-sm p-5"
      style={{
        backgroundColor: palette.bg,
        borderColor: palette.border,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className="text-sm font-medium"
            style={{ color: palette.text }}
          >
            {title}
          </p>

          <p className="text-3xl font-bold mt-2 text-zinc-950">
            {value}
          </p>

          <p className="text-xs text-gray-500 mt-2">
            {description}
          </p>
        </div>

        <div
          className="w-11 h-11 rounded-2xl text-white flex items-center justify-center"
          style={{ background: palette.gradient }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function MarketShareBarChart({
  rows,
  metricMode,
  selectedGroupKey,
  onSelectGroup,
}: {
  rows: GroupMarketRow[];
  metricMode: MetricMode;
  selectedGroupKey: string;
  onSelectGroup: (groupKey: string) => void;
}) {
  const [hoveredGroupKey, setHoveredGroupKey] = useState("");

  const topRows = rows.slice(0, 8);

  const activeRow =
    rows.find((row) => row.groupKey === hoveredGroupKey) ||
    rows.find((row) => row.groupKey === selectedGroupKey) ||
    topRows[0];

  const maxMetric = Math.max(
    1,
    ...topRows.map((row) => getMetricValue(row, metricMode))
  );

  let donutCursor = 0;

  const donutSegments = topRows.map((row, index) => {
    const palette = getPalette(index);
    const start = donutCursor;
    const end = donutCursor + Math.max(0, row.marketShare);
    donutCursor = end;

    return `${palette.fill} ${start}% ${end}%`;
  });

  if (donutCursor < 100) {
    donutSegments.push(`#e5e7eb ${donutCursor}% 100%`);
  }

  return (
    <div className="bg-white rounded-3xl border shadow-sm p-6">
      <div className="flex items-start justify-between gap-6 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-purple-50 text-purple-700 px-3 py-1 text-xs font-semibold">
            <PieChart size={14} />
            Market share chart
          </div>

          <h3 className="text-2xl font-bold mt-3">
            Traffic Share by Group
          </h3>

          <p className="text-sm text-gray-500 mt-1">
            Hover hoặc bấm vào từng group để xem thị phần, traffic, views/day và top video.
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs text-gray-500">
            Ranking basis
          </p>

          <p className="text-lg font-bold">
            {getMetricLabel(metricMode)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="space-y-4">
          {topRows.map((row, index) => {
            const palette = getPalette(index);
            const metric = getMetricValue(row, metricMode);
            const width = Math.max(4, (metric / maxMetric) * 100);
            const isSelected = row.groupKey === selectedGroupKey;

            return (
              <button
                key={row.groupKey}
                onMouseEnter={() => setHoveredGroupKey(row.groupKey)}
                onFocus={() => setHoveredGroupKey(row.groupKey)}
                onClick={() => onSelectGroup(row.groupKey)}
                title={`${row.groupName}: ${formatPercent(row.marketShare)} share · ${formatNumber(row.totalViews)} views · ${formatNumber(Math.round(row.viewsPerDay))} views/day`}
                className="w-full text-left rounded-2xl border p-4 transition"
                style={{
                  backgroundColor: isSelected ? palette.bg : "white",
                  borderColor: isSelected ? palette.border : "#e5e7eb",
                }}
              >
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl text-white flex items-center justify-center text-sm font-bold"
                      style={{ background: palette.gradient }}
                    >
                      {index + 1}
                    </div>

                    <div>
                      <p className="font-bold text-zinc-950">
                        {row.groupName}
                      </p>

                      <p className="text-xs text-gray-500">
                        {row.totalVideos} videos · {row.channelCount} channels
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className="font-bold"
                      style={{ color: palette.text }}
                    >
                      {formatPercent(row.marketShare)}
                    </p>

                    <p className="text-xs text-gray-500">
                      share
                    </p>
                  </div>
                </div>

                <div
                  className="h-3 rounded-full overflow-hidden"
                  style={{ backgroundColor: palette.softBg }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${width}%`,
                      background: palette.gradient,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                  <span>
                    {getMetricDisplay(metric, metricMode)}
                  </span>

                  <span>
                    {formatNumber(row.totalViews)} views
                  </span>
                </div>
              </button>
            );
          })}

          {topRows.length === 0 && (
            <div className="rounded-2xl border border-dashed p-8 text-center text-gray-500">
              No group market data for this month.
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-zinc-950 text-white p-6">
          {activeRow ? (
            <>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-white/75">
                    Selected group
                  </p>

                  <h4 className="text-2xl font-bold mt-2">
                    {activeRow.groupName}
                  </h4>
                </div>

                <div className="w-12 h-12 rounded-2xl bg-white text-zinc-950 flex items-center justify-center">
                  <Crown size={22} />
                </div>
              </div>

              <div className="flex justify-center mt-6">
                <div
                  className="w-44 h-44 rounded-full flex items-center justify-center"
                  style={{
                    background: `conic-gradient(${donutSegments.join(", ")})`,
                  }}
                >
                  <div className="w-28 h-28 rounded-full bg-zinc-950 flex flex-col items-center justify-center">
                    <p className="text-xs text-zinc-400">
                      Share
                    </p>

                    <p className="text-2xl font-bold">
                      {formatPercent(activeRow.marketShare)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="rounded-2xl bg-white/15 border border-white/20 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-white/75">Traffic</p>
                  <p className="text-2xl font-bold mt-1">
                    {formatNumber(activeRow.totalViews)}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/15 border border-white/20 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-white/75">Views/day</p>
                  <p className="text-2xl font-bold mt-1">
                    {formatNumber(Math.round(activeRow.viewsPerDay))}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/15 border border-white/20 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-white/75">Videos</p>
                  <p className="text-2xl font-bold mt-1">
                    {formatNumber(activeRow.totalVideos)}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/15 border border-white/20 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-white/75">MoM</p>
                  <p className="text-2xl font-bold mt-1">
                    {getGrowthLabel(activeRow.monthOverMonthGrowth)}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-white/10 border border-white/10 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-white/75">
                  Top video
                </p>

                {activeRow.topVideoUrl ? (
                  <a
                    href={activeRow.topVideoUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    className="font-semibold mt-2 leading-5 block text-white hover:underline"
                  >
                    {activeRow.topVideoTitle}
                  </a>
                ) : (
                  <p className="font-semibold mt-2 leading-5">
                    {activeRow.topVideoTitle}
                  </p>
                )}

                <p className="text-xs text-white/60 mt-2">
                  {activeRow.topChannel} · {formatNumber(activeRow.topVideoViews)} views
                </p>
              </div>
            </>
          ) : (
            <p className="text-zinc-400">
              Hover a group to see details.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function DailyTrafficLineChart({
  row,
}: {
  row: GroupMarketRow | undefined;
}) {
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(
    null
  );

  if (!row) {
    return (
      <div className="bg-white rounded-3xl border shadow-sm p-6">
        <h3 className="text-xl font-bold">
          Daily Traffic Trend
        </h3>

        <div className="mt-6 rounded-2xl border border-dashed p-10 text-center text-gray-500">
          Select a group to see daily traffic.
        </div>
      </div>
    );
  }

  const chartRows = [...row.dailyRows]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-31);

  const width = 720;
  const height = 260;
  const paddingX = 42;
  const paddingTop = 34;
  const paddingBottom = 46;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxViews = Math.max(1, ...chartRows.map((item) => item.views));

  const points = chartRows.map((item, index) => {
    const x =
      chartRows.length === 1
        ? width / 2
        : paddingX +
          (index / Math.max(1, chartRows.length - 1)) *
            (width - paddingX * 2);

    const y =
      paddingTop + chartHeight - (item.views / maxViews) * chartHeight;

    return {
      ...item,
      x,
      y,
    };
  });

  const path = points
    .map((point, index) => {
      return `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`;
    })
    .join(" ");

  const hoveredPoint =
    hoveredPointIndex !== null ? points[hoveredPointIndex] : null;

  return (
    <div className="bg-white rounded-3xl border shadow-sm p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-semibold">
            <LineChartIcon size={14} />
            Daily traffic trend
          </div>

          <h3 className="text-2xl font-bold mt-3">
            {row.groupName}
          </h3>

          <p className="text-sm text-gray-500 mt-1">
            Chạm hoặc hover vào điểm trên chart để xem traffic theo ngày.
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs text-gray-500">
            Total traffic
          </p>

          <p className="text-2xl font-bold">
            {formatNumber(row.totalViews)}
          </p>
        </div>
      </div>

      {chartRows.length > 0 ? (
        <div className="mt-6">
          <div className="relative rounded-2xl border bg-gray-50 p-4 overflow-hidden">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-72 text-zinc-900"
            >
              <line
                x1={paddingX}
                y1={paddingTop + chartHeight}
                x2={width - paddingX}
                y2={paddingTop + chartHeight}
                stroke="currentColor"
                opacity="0.12"
                strokeWidth="2"
              />

              <line
                x1={paddingX}
                y1={paddingTop}
                x2={paddingX}
                y2={paddingTop + chartHeight}
                stroke="currentColor"
                opacity="0.12"
                strokeWidth="2"
              />

              <path
                d={path}
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {points.map((point, index) => (
                <circle
                  key={`${point.date}-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r={hoveredPointIndex === index ? 7 : 5}
                  fill="white"
                  stroke="currentColor"
                  strokeWidth="3"
                  onMouseEnter={() => setHoveredPointIndex(index)}
                  onMouseLeave={() => setHoveredPointIndex(null)}
                >
                  <title>
                    {point.date} · {formatNumber(point.views)} views · {formatPercent(point.share)} daily share
                  </title>
                </circle>
              ))}

              {points.length > 0 && (
                <>
                  <text
                    x={paddingX}
                    y={height - 12}
                    fontSize="13"
                    fill="currentColor"
                    opacity="0.55"
                  >
                    {points[0].date}
                  </text>

                  <text
                    x={width - paddingX}
                    y={height - 12}
                    textAnchor="end"
                    fontSize="13"
                    fill="currentColor"
                    opacity="0.55"
                  >
                    {points[points.length - 1].date}
                  </text>
                </>
              )}
            </svg>

            {hoveredPoint && (
              <div className="absolute top-5 right-5 rounded-2xl bg-zinc-950 text-white p-4 shadow-lg w-64">
                <p className="text-xs text-zinc-400">
                  {hoveredPoint.date}
                </p>

                <p className="text-2xl font-bold mt-1">
                  {formatNumber(hoveredPoint.views)}
                </p>

                <p className="text-xs text-white/60 mt-1">
                  {hoveredPoint.videos} videos · {formatPercent(hoveredPoint.share)} daily share
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed p-10 text-center text-gray-500">
          No daily traffic data for this group.
        </div>
      )}
    </div>
  );
}

export default function CompetitorMarketShareDashboard({
  competitorGroups,
  competitorChannels,
  competitorVideos,
}: Props) {
  const [selectedMonth, setSelectedMonth] = useState<string>("latest");
  const [metricMode, setMetricMode] = useState<MetricMode>("views");
  const [expandedGroupKey, setExpandedGroupKey] = useState<string>("");
  const [selectedGroupKey, setSelectedGroupKey] = useState<string>("");
  const [search, setSearch] = useState("");
  const [marketPage, setMarketPage] = useState(1);

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
        },
      ])
    );
  }, [competitorChannels]);

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
      ? availableMonths[0] || "Unknown"
      : selectedMonth;

  const previousMonth = getPreviousMonthKey(activeMonth);

  const marketRows = useMemo(() => {
    const videosInMonth = competitorVideos.filter(
      (video) => getMonthKey(getVideoDate(video)) === activeMonth
    );

    const previousVideos = competitorVideos.filter(
      (video) => getMonthKey(getVideoDate(video)) === previousMonth
    );

    const totalMarketViews = videosInMonth.reduce(
      (sum, video) => sum + Number(video.view_count || 0),
      0
    );

    const totalMarketViewsPerDay = videosInMonth.reduce(
      (sum, video) => sum + getViewsPerDay(video),
      0
    );

    const totalMarketVideos = videosInMonth.length;

    const dailyMarketTotal = new Map<string, number>();

    videosInMonth.forEach((video) => {
      const day = getDayKey(getVideoDate(video));

      dailyMarketTotal.set(
        day,
        (dailyMarketTotal.get(day) || 0) + Number(video.view_count || 0)
      );
    });

    const groupIds = new Set<number | null>();

    videosInMonth.forEach((video) => {
      const channel = channelMap.get(Number(video.competitor_channel_id || 0));
      const resolvedGroupId = video.group_id || channel?.groupId || null;

      groupIds.add(resolvedGroupId);
    });

    previousVideos.forEach((video) => {
      const channel = channelMap.get(Number(video.competitor_channel_id || 0));
      const resolvedGroupId = video.group_id || channel?.groupId || null;

      groupIds.add(resolvedGroupId);
    });

    const rows = Array.from(groupIds).map((groupId): GroupMarketRow => {
      const groupInfo = groupId ? groupMap.get(groupId) : null;
      const groupKey = groupId === null ? "ungrouped" : String(groupId);

      const groupVideos = videosInMonth.filter((video) => {
        const channel = channelMap.get(Number(video.competitor_channel_id || 0));
        const resolvedGroupId = video.group_id || channel?.groupId || null;

        return resolvedGroupId === groupId;
      });

      const previousGroupVideos = previousVideos.filter((video) => {
        const channel = channelMap.get(Number(video.competitor_channel_id || 0));
        const resolvedGroupId = video.group_id || channel?.groupId || null;

        return resolvedGroupId === groupId;
      });

      const totalViews = groupVideos.reduce(
        (sum, video) => sum + Number(video.view_count || 0),
        0
      );

      const previousMonthViews = previousGroupVideos.reduce(
        (sum, video) => sum + Number(video.view_count || 0),
        0
      );

      const viewsPerDay = groupVideos.reduce(
        (sum, video) => sum + getViewsPerDay(video),
        0
      );

      const channels = new Set(
        groupVideos
          .map((video) => Number(video.competitor_channel_id || 0))
          .filter(Boolean)
      );

      const topVideo = [...groupVideos].sort(
        (a, b) => Number(b.view_count || 0) - Number(a.view_count || 0)
      )[0];

      const topChannel = topVideo
        ? channelMap.get(Number(topVideo.competitor_channel_id || 0))?.name ||
          topVideo.channel_title ||
          "-"
        : "-";

      const dayMap = new Map<string, DailyMarketRow>();

      groupVideos.forEach((video) => {
        const day = getDayKey(getVideoDate(video));

        const current = dayMap.get(day) || {
          date: day,
          views: 0,
          videos: 0,
          viewsPerDay: 0,
          share: 0,
        };

        current.views += Number(video.view_count || 0);
        current.videos += 1;
        current.viewsPerDay += getViewsPerDay(video);

        dayMap.set(day, current);
      });

      const dailyRows = Array.from(dayMap.values())
        .map((row) => ({
          ...row,
          share:
            (row.views / Math.max(1, dailyMarketTotal.get(row.date) || 0)) *
            100,
        }))
        .sort((a, b) => b.date.localeCompare(a.date));

      const monthOverMonthGrowth =
        previousMonthViews > 0
          ? ((totalViews - previousMonthViews) / previousMonthViews) * 100
          : totalViews > 0
            ? 100
            : 0;

      return {
        groupId,
        groupKey,
        groupName: groupInfo?.name || "Ungrouped",
        category: groupInfo?.category || "Uncategorized",
        totalViews,
        totalVideos: groupVideos.length,
        channelCount: channels.size,
        avgViews: groupVideos.length > 0 ? totalViews / groupVideos.length : 0,
        viewsPerDay,
        marketShare:
          metricMode === "videos"
            ? (groupVideos.length / Math.max(1, totalMarketVideos)) * 100
            : metricMode === "viewsPerDay"
              ? (viewsPerDay / Math.max(1, totalMarketViewsPerDay)) * 100
              : (totalViews / Math.max(1, totalMarketViews)) * 100,
        previousMonthViews,
        monthOverMonthGrowth,
        topVideoTitle: topVideo?.title || "-",
        topVideoViews: Number(topVideo?.view_count || 0),
        topVideoUrl: topVideo?.video_url || null,
        topChannel,
        dailyRows,
      };
    });

    return rows.sort(
      (a, b) => getMetricValue(b, metricMode) - getMetricValue(a, metricMode)
    );
  }, [
    activeMonth,
    previousMonth,
    competitorVideos,
    channelMap,
    groupMap,
    metricMode,
  ]);

  const filteredRows = marketRows.filter((row) => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    return (
      row.groupName.toLowerCase().includes(query) ||
      row.category.toLowerCase().includes(query) ||
      row.topChannel.toLowerCase().includes(query)
    );
  });

  const MARKET_TABLE_PAGE_SIZE = 12;

  const totalMarketPages = Math.max(
    1,
    Math.ceil(filteredRows.length / MARKET_TABLE_PAGE_SIZE)
  );

  const safeMarketPage = Math.min(marketPage, totalMarketPages);

  const paginatedMarketRows = filteredRows.slice(
    (safeMarketPage - 1) * MARKET_TABLE_PAGE_SIZE,
    safeMarketPage * MARKET_TABLE_PAGE_SIZE
  );

  const selectedRow =
    filteredRows.find((row) => row.groupKey === selectedGroupKey) ||
    filteredRows[0];

  const totalViews = filteredRows.reduce(
    (sum, row) => sum + row.totalViews,
    0
  );

  const totalVideos = filteredRows.reduce(
    (sum, row) => sum + row.totalVideos,
    0
  );

  const totalViewsPerDay = filteredRows.reduce(
    (sum, row) => sum + row.viewsPerDay,
    0
  );

  const topGroup = filteredRows[0];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-zinc-950 text-white p-7 shadow">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-2 text-sm">
              <BarChart3 size={16} />
              Competitor Market Analytics
            </div>

            <h2 className="text-3xl font-bold mt-4">
              Group Market Share
            </h2>

            <p className="text-zinc-300 mt-2 max-w-3xl">
              Visualize competitor group traffic share by month, views/day, video volume and daily traffic movement.
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm text-zinc-400">Selected month</p>

            <p className="text-3xl font-bold mt-1">
              {formatMonthLabel(activeMonth)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="Total traffic"
          value={formatNumber(totalViews)}
          description="Public views from synced competitor videos"
          icon={<Eye size={20} />}
          colorIndex={0}
        />

        <MetricCard
          title="Views/day"
          value={formatNumber(Math.round(totalViewsPerDay))}
          description="Estimated current traffic velocity"
          icon={<Zap size={20} />}
          colorIndex={1}
        />

        <MetricCard
          title="Videos"
          value={formatNumber(totalVideos)}
          description="Videos published in selected month"
          icon={<Layers size={20} />}
          colorIndex={3}
        />

        <MetricCard
          title="Top group"
          value={topGroup?.groupName || "-"}
          description={`${formatPercent(topGroup?.marketShare)} current share`}
          icon={<Crown size={20} />}
          colorIndex={5}
        />
      </div>

      <div className="bg-white rounded-2xl shadow p-5">
        <div className="grid grid-cols-4 gap-3">
          <select
            value={selectedMonth}
            onChange={(event) => {
              setSelectedMonth(event.target.value);
              setExpandedGroupKey("");
              setSelectedGroupKey("");
              setMarketPage(1);
            }}
            className="border rounded-xl px-4 py-3"
          >
            <option value="latest">Latest month</option>

            {availableMonths.map((month) => (
              <option key={month} value={month}>
                {formatMonthLabel(month)}
              </option>
            ))}
          </select>

          <select
            value={metricMode}
            onChange={(event) => {
              setMetricMode(event.target.value as MetricMode);
              setMarketPage(1);
            }}
            className="border rounded-xl px-4 py-3"
          >
            <option value="views">Market share by traffic</option>
            <option value="viewsPerDay">Market share by views/day</option>
            <option value="videos">Market share by video count</option>
          </select>

          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setMarketPage(1);
            }}
            placeholder="Search group..."
            className="border rounded-xl px-4 py-3"
          />

          <button
            onClick={() => {
              setSelectedMonth("latest");
              setMetricMode("views");
              setSearch("");
              setExpandedGroupKey("");
              setSelectedGroupKey("");
              setMarketPage(1);
            }}
            className="border rounded-xl px-4 py-3 hover:bg-gray-50"
          >
            Reset
          </button>
        </div>
      </div>

      <MarketShareBarChart
        rows={filteredRows}
        metricMode={metricMode}
        selectedGroupKey={selectedRow?.groupKey || ""}
        onSelectGroup={(groupKey) => {
          setSelectedGroupKey(groupKey);
          setExpandedGroupKey(groupKey);
        }}
      />

      <DailyTrafficLineChart row={selectedRow} />

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-purple-600" />

            <h3 className="text-xl font-bold">
              Monthly Group Share Table
            </h3>
          </div>

          <p className="text-sm text-gray-500 mt-1">
            Bảng màu giúp nhìn nhanh group nào đang chiếm thị phần mạnh nhất. Bấm vào từng dòng để mở daily breakdown.
          </p>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left p-4">Rank</th>
                <th className="text-left p-4 min-w-64">Group</th>
                <th className="text-left p-4">Market Share</th>
                <th className="text-left p-4">Traffic</th>
                <th className="text-left p-4">Views/day</th>
                <th className="text-left p-4">Videos</th>
                <th className="text-left p-4">Channels</th>
                <th className="text-left p-4">MoM</th>
                <th className="text-left p-4 min-w-72">Top Video</th>
                <th className="text-left p-4">Open</th>
              </tr>
            </thead>

            <tbody>
              {paginatedMarketRows.map((row, index) => {
                const displayIndex = (safeMarketPage - 1) * MARKET_TABLE_PAGE_SIZE + index;
                const isExpanded = expandedGroupKey === row.groupKey;
                const palette = getPalette(displayIndex);
                const isSelected = selectedRow?.groupKey === row.groupKey;

                return (
                  <Fragment key={row.groupKey}>
                    <tr
                      onClick={() => {
                        setSelectedGroupKey(row.groupKey);
                        setExpandedGroupKey(
                          isExpanded ? "" : row.groupKey
                        );
                      }}
                      className="border-t cursor-pointer transition"
                      style={{
                        backgroundColor: isSelected ? palette.bg : "white",
                        borderLeft: `6px solid ${palette.border}`,
                      }}
                      title={`${row.groupName}: ${formatPercent(row.marketShare)} share · ${formatNumber(row.totalViews)} views`}
                    >
                      <td className="p-4">
                        <div
                          className="inline-flex items-center gap-2 rounded-full px-3 py-1 font-bold"
                          style={{
                            backgroundColor: palette.softBg,
                            color: palette.text,
                          }}
                        >
                          {displayIndex === 0 ? <Trophy size={14} /> : null}
                          #{displayIndex + 1}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-12 rounded-full"
                            style={{ background: palette.gradient }}
                          />

                          <div>
                            <p className="font-bold text-base text-zinc-950">
                              {row.groupName}
                            </p>

                            <p className="text-xs text-gray-500 mt-1">
                              {row.category}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-36 h-3 rounded-full overflow-hidden"
                            style={{ backgroundColor: palette.softBg }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(0, row.marketShare)
                                )}%`,
                                background: palette.gradient,
                              }}
                            />
                          </div>

                          <span
                            className="font-bold"
                            style={{ color: palette.text }}
                          >
                            {formatPercent(row.marketShare)}
                          </span>
                        </div>
                      </td>

                      <td className="p-4 font-semibold">
                        {formatNumber(row.totalViews)}
                      </td>

                      <td className="p-4">
                        {formatNumber(Math.round(row.viewsPerDay))}
                      </td>

                      <td className="p-4">
                        {formatNumber(row.totalVideos)}
                      </td>

                      <td className="p-4">
                        {formatNumber(row.channelCount)}
                      </td>

                      <td
                        className={`p-4 font-semibold ${
                          row.monthOverMonthGrowth >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {getGrowthLabel(row.monthOverMonthGrowth)}
                      </td>

                      <td className="p-4">
                        {row.topVideoUrl ? (
                          <a
                            href={row.topVideoUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(event) => event.stopPropagation()}
                            className="font-medium text-blue-700 hover:underline"
                          >
                            {row.topVideoTitle}
                          </a>
                        ) : (
                          <p className="font-medium">
                            {row.topVideoTitle}
                          </p>
                        )}

                        <p className="text-xs text-gray-500 mt-1">
                          {row.topChannel} · {formatNumber(row.topVideoViews)} views
                        </p>
                      </td>

                      <td className="p-4">
                        {isExpanded ? (
                          <ChevronUp size={18} />
                        ) : (
                          <ChevronDown size={18} />
                        )}
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-gray-50">
                        <td colSpan={10} className="p-6">
                          <div className="grid grid-cols-[1fr_1.2fr] gap-6">
                            <div className="bg-white rounded-2xl border p-5">
                              <h4 className="font-bold text-lg">
                                {row.groupName} Traffic Summary
                              </h4>

                              <div className="grid grid-cols-2 gap-4 mt-5">
                                <div className="rounded-xl border p-4">
                                  <p className="text-xs text-gray-500">
                                    Market Share
                                  </p>

                                  <p
                                    className="text-2xl font-bold mt-1"
                                    style={{ color: palette.text }}
                                  >
                                    {formatPercent(row.marketShare)}
                                  </p>
                                </div>

                                <div className="rounded-xl border p-4">
                                  <p className="text-xs text-gray-500">
                                    Total Traffic
                                  </p>

                                  <p className="text-2xl font-bold mt-1">
                                    {formatNumber(row.totalViews)}
                                  </p>
                                </div>

                                <div className="rounded-xl border p-4">
                                  <p className="text-xs text-gray-500">
                                    Avg Views / Video
                                  </p>

                                  <p className="text-2xl font-bold mt-1">
                                    {formatNumber(Math.round(row.avgViews))}
                                  </p>
                                </div>

                                <div className="rounded-xl border p-4">
                                  <p className="text-xs text-gray-500">
                                    Previous Month
                                  </p>

                                  <p className="text-2xl font-bold mt-1">
                                    {formatNumber(row.previousMonthViews)}
                                  </p>
                                </div>
                              </div>

                              <div
                                className="mt-5 rounded-xl text-white p-4"
                                style={{ background: palette.gradient }}
                              >
                                <p className="text-sm text-white/80">
                                  Power insight
                                </p>

                                <p className="text-lg font-bold mt-1">
                                  {row.groupName} owns{" "}
                                  {formatPercent(row.marketShare)} of{" "}
                                  {formatMonthLabel(activeMonth)} traffic.
                                </p>
                              </div>
                            </div>

                            <div className="bg-white rounded-2xl border overflow-hidden">
                              <div className="p-5 border-b flex items-center gap-2">
                                <CalendarDays size={18} />

                                <h4 className="font-bold">
                                  Daily Traffic Breakdown
                                </h4>
                              </div>

                              <div className="max-h-80 overflow-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-50 text-gray-500">
                                    <tr>
                                      <th className="text-left p-3">Date</th>
                                      <th className="text-left p-3">Traffic</th>
                                      <th className="text-left p-3">Videos</th>
                                      <th className="text-left p-3">Views/day</th>
                                      <th className="text-left p-3">Daily Share</th>
                                    </tr>
                                  </thead>

                                  <tbody>
                                    {row.dailyRows.map((day) => (
                                      <tr
                                        key={`${row.groupKey}-${day.date}`}
                                        className="border-t"
                                      >
                                        <td className="p-3 font-medium">
                                          {day.date}
                                        </td>

                                        <td className="p-3">
                                          {formatNumber(day.views)}
                                        </td>

                                        <td className="p-3">
                                          {formatNumber(day.videos)}
                                        </td>

                                        <td className="p-3">
                                          {formatNumber(
                                            Math.round(day.viewsPerDay)
                                          )}
                                        </td>

                                        <td
                                          className="p-3 font-semibold"
                                          style={{ color: palette.text }}
                                        >
                                          {formatPercent(day.share)}
                                        </td>
                                      </tr>
                                    ))}

                                    {row.dailyRows.length === 0 && (
                                      <tr>
                                        <td
                                          colSpan={5}
                                          className="p-6 text-center text-gray-500"
                                        >
                                          No daily data for this group.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}

              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-gray-500">
                    No market share data for this month.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {paginatedMarketRows.length} / {filteredRows.length} groups · Page {safeMarketPage} / {totalMarketPages}
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setMarketPage((page) => Math.max(1, page - 1))
              }
              disabled={safeMarketPage === 1}
              className="px-4 py-2 rounded-xl border bg-white disabled:opacity-50 hover:bg-gray-50"
            >
              Previous
            </button>

            <button
              onClick={() =>
                setMarketPage((page) => Math.min(totalMarketPages, page + 1))
              }
              disabled={safeMarketPage === totalMarketPages}
              className="px-4 py-2 rounded-xl border bg-white disabled:opacity-50 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {selectedRow && (
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users size={20} />

            <h3 className="text-xl font-bold">
              Selected Group Detail: {selectedRow.groupName}
            </h3>
          </div>

          <p className="text-gray-500">
            This group generated{" "}
            <span className="font-semibold text-gray-900">
              {formatNumber(selectedRow.totalViews)}
            </span>{" "}
            public views in {formatMonthLabel(activeMonth)}, across{" "}
            <span className="font-semibold text-gray-900">
              {formatNumber(selectedRow.totalVideos)}
            </span>{" "}
            videos and{" "}
            <span className="font-semibold text-gray-900">
              {formatNumber(selectedRow.channelCount)}
            </span>{" "}
            tracked channels.
          </p>
        </div>
      )}
    </div>
  );
}
