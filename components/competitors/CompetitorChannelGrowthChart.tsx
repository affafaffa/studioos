"use client";

import { useMemo, useState } from "react";
import {
  AreaChart,
  BarChart3,
  CalendarDays,
  Clock,
  Eye,
  LineChart,
  PlayCircle,
} from "lucide-react";

type ChannelSnapshot = {
  competitor_channel_id: number;
  subscriber_count: number;
  channel_view_count: number;
  video_count: number;
  captured_at: string;
};

type VideoSnapshot = {
  competitor_video_id: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  captured_at: string;
};

type LooseVideo = Record<string, unknown>;

type Props = {
  snapshots: ChannelSnapshot[];
  videoSnapshots: VideoSnapshot[];
  videos: LooseVideo[];
  currentSubs: number;
  currentViews: number;
  currentVideos: number;
};

type MetricKey = "traffic" | "subs" | "content";
type RangeKey = "day" | "week" | "month";

type TrafficBucket = {
  key: string;
  label: string;
  rawDate: string;
  value: number;
  episodes: {
    videoId: number;
    title: string;
    traffic: number;
    thumbnail: string;
    url: string;
  }[];
};

function safeNumber(value: unknown) {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function cleanText(value: unknown, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

function formatNumber(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString("en-US");
}

function getVideoId(video: LooseVideo) {
  return safeNumber(video.id);
}

function getVideoTitle(video: LooseVideo) {
  return cleanText(video.title, "Untitled video");
}

function getVideoThumbnail(video: LooseVideo) {
  return cleanText(
    video.thumbnail_maxres_url ||
      video.thumbnail_high_url ||
      video.thumbnail_url ||
      video.thumbnail_medium_url,
    ""
  );
}

function getVideoUrl(video: LooseVideo) {
  return cleanText(video.video_url, "");
}

function getVideoViews(video: LooseVideo) {
  return safeNumber(video.view_count || video.views);
}

function getVideoPublishedAt(video: LooseVideo) {
  return cleanText(video.published_at, "");
}

function getWeekNumber(date: Date) {
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const pastDays = (date.getTime() - firstDay.getTime()) / 86400000;
  return Math.ceil((pastDays + firstDay.getDay() + 1) / 7);
}

function getBucketKey(value: string, range: RangeKey) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  const year = date.getFullYear();

  if (range === "day") {
    return `${date.toISOString().slice(0, 10)} ${String(date.getHours()).padStart(2, "0")}:00`;
  }

  if (range === "week") {
    return date.toISOString().slice(0, 10);
  }

  return `${year}-W${String(getWeekNumber(date)).padStart(2, "0")}`;
}

function formatBucketLabel(value: string, range: RangeKey) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  if (range === "day") {
    return `${String(date.getHours()).padStart(2, "0")}:00`;
  }

  if (range === "week") {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
    });
  }

  return `Week ${getWeekNumber(date)}`;
}

function getRangeCopy(range: RangeKey) {
  if (range === "day") {
    return {
      title: "Hourly traffic breakdown",
      description: "Daily view: traffic is grouped by hour. The table shows which episodes pulled traffic in each hour.",
      tableFirstCol: "Hour",
    };
  }

  if (range === "week") {
    return {
      title: "Daily traffic breakdown",
      description: "Weekly view: traffic is grouped by day. The table shows which episodes pulled traffic each day.",
      tableFirstCol: "Date",
    };
  }

  return {
    title: "Weekly traffic breakdown",
    description: "Monthly view: traffic is grouped by week. The table shows which episodes pulled traffic each week.",
    tableFirstCol: "Week",
  };
}

function buildTrafficBuckets({
  videos,
  videoSnapshots,
  range,
}: {
  videos: LooseVideo[];
  videoSnapshots: VideoSnapshot[];
  range: RangeKey;
}) {
  const videoMap = new Map<number, LooseVideo>();

  videos.forEach((video) => {
    videoMap.set(getVideoId(video), video);
  });

  const snapshotsByVideo = new Map<number, VideoSnapshot[]>();

  videoSnapshots.forEach((snapshot) => {
    const videoId = safeNumber(snapshot.competitor_video_id);
    snapshotsByVideo.set(videoId, [
      ...(snapshotsByVideo.get(videoId) || []),
      snapshot,
    ]);
  });

  const bucketMap = new Map<string, TrafficBucket>();

  snapshotsByVideo.forEach((rows, videoId) => {
    const sorted = [...rows].sort(
      (a, b) => new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime()
    );

    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1];
      const current = sorted[index];

      const delta = Math.max(
        0,
        safeNumber(current.view_count) - safeNumber(previous.view_count)
      );

      if (delta <= 0) continue;

      const bucketKey = getBucketKey(current.captured_at, range);
      const video = videoMap.get(videoId) || {};
      const existing = bucketMap.get(bucketKey) || {
        key: bucketKey,
        label: formatBucketLabel(current.captured_at, range),
        rawDate: current.captured_at,
        value: 0,
        episodes: [],
      };

      existing.value += delta;

      const existingEpisode = existing.episodes.find(
        (episode) => episode.videoId === videoId
      );

      if (existingEpisode) {
        existingEpisode.traffic += delta;
      } else {
        existing.episodes.push({
          videoId,
          title: getVideoTitle(video),
          traffic: delta,
          thumbnail: getVideoThumbnail(video),
          url: getVideoUrl(video),
        });
      }

      bucketMap.set(bucketKey, existing);
    }
  });

  const fromSnapshots = Array.from(bucketMap.values())
    .map((bucket) => ({
      ...bucket,
      episodes: bucket.episodes.sort((a, b) => b.traffic - a.traffic).slice(0, 5),
    }))
    .sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());

  if (fromSnapshots.length > 0) {
    return fromSnapshots;
  }

  const fallbackMap = new Map<string, TrafficBucket>();

  videos.forEach((video) => {
    const publishedAt = getVideoPublishedAt(video) || new Date().toISOString();
    const bucketKey = getBucketKey(publishedAt, range);
    const views = getVideoViews(video);

    const existing = fallbackMap.get(bucketKey) || {
      key: bucketKey,
      label: formatBucketLabel(publishedAt, range),
      rawDate: publishedAt,
      value: 0,
      episodes: [],
    };

    existing.value += views;
    existing.episodes.push({
      videoId: getVideoId(video),
      title: getVideoTitle(video),
      traffic: views,
      thumbnail: getVideoThumbnail(video),
      url: getVideoUrl(video),
    });

    fallbackMap.set(bucketKey, existing);
  });

  return Array.from(fallbackMap.values())
    .map((bucket) => ({
      ...bucket,
      episodes: bucket.episodes.sort((a, b) => b.traffic - a.traffic).slice(0, 5),
    }))
    .sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime())
    .slice(-12);
}

function buildCumulativeBuckets({
  snapshots,
  currentValue,
  metric,
  range,
}: {
  snapshots: ChannelSnapshot[];
  currentValue: number;
  metric: MetricKey;
  range: RangeKey;
}) {
  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime()
  );

  const rows = sorted.length
    ? sorted
    : [
        {
          competitor_channel_id: 0,
          subscriber_count: currentValue,
          channel_view_count: currentValue,
          video_count: currentValue,
          captured_at: new Date().toISOString(),
        },
      ];

  const bucketMap = new Map<string, TrafficBucket>();

  rows.forEach((snapshot) => {
    const key = getBucketKey(snapshot.captured_at, range);
    const value =
      metric === "subs"
        ? safeNumber(snapshot.subscriber_count)
        : safeNumber(snapshot.video_count);

    bucketMap.set(key, {
      key,
      label: formatBucketLabel(snapshot.captured_at, range),
      rawDate: snapshot.captured_at,
      value,
      episodes: [],
    });
  });

  const output = Array.from(bucketMap.values()).sort(
    (a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime()
  );

  if (output.length === 1) {
    return [
      { ...output[0], label: "Start" },
      { ...output[0], label: "Now" },
    ];
  }

  return output;
}

export default function CompetitorChannelGrowthChart({
  snapshots,
  videoSnapshots,
  videos,
  currentSubs,
  currentViews,
  currentVideos,
}: Props) {
  const [metric, setMetric] = useState<MetricKey>("traffic");
  const [range, setRange] = useState<RangeKey>("week");
  const [selectedBucketKey, setSelectedBucketKey] = useState<string | null>(null);

  const copy = getRangeCopy(range);

  const series = useMemo(() => {
    if (metric === "traffic") {
      return buildTrafficBuckets({
        videos,
        videoSnapshots,
        range,
      });
    }

    return buildCumulativeBuckets({
      snapshots,
      currentValue: metric === "subs" ? currentSubs : currentVideos,
      metric,
      range,
    });
  }, [
    metric,
    range,
    videos,
    videoSnapshots,
    snapshots,
    currentSubs,
    currentVideos,
  ]);

  const total = series.reduce((sum, item) => sum + item.value, 0);
  const maxValue = Math.max(...series.map((item) => item.value), 1);

  const width = 920;
  const height = 330;
  const paddingX = 46;
  const paddingY = 42;

  const points = series.map((item, index) => {
    const x =
      paddingX +
      (index / Math.max(1, series.length - 1)) *
        (width - paddingX * 2);

    const y =
      height -
      paddingY -
      (item.value / maxValue) *
        (height - paddingY * 2);

    return {
      ...item,
      x,
      y,
    };
  });

  const linePath = points
    .map((point, index) =>
      index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
    )
    .join(" ");

  const areaPath = `${linePath} L ${points[points.length - 1]?.x || paddingX} ${
    height - paddingY
  } L ${points[0]?.x || paddingX} ${height - paddingY} Z`;

  const selectedBucket =
    series.find((item) => item.key === selectedBucketKey) || null;

  const visibleBuckets = selectedBucket ? [selectedBucket] : series;

  const metricTabs: {
    id: MetricKey;
    label: string;
  }[] = [
    {
      id: "traffic",
      label: "Traffic breakdown",
    },
    {
      id: "subs",
      label: "Followers growth",
    },
    {
      id: "content",
      label: "Content growth",
    },
  ];

  const rangeTabs: {
    id: RangeKey;
    label: string;
  }[] = [
    {
      id: "day",
      label: "Daily",
    },
    {
      id: "week",
      label: "Weekly",
    },
    {
      id: "month",
      label: "Monthly",
    },
  ];

  return (
    <div className="bg-white rounded-3xl border shadow overflow-hidden">
      <div className="p-6 border-b">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2">
              <LineChart size={20} className="text-blue-600" />

              <h3 className="text-xl font-bold">
                Growth timeline
              </h3>
            </div>

            <p className="text-sm text-slate-600 mt-1">
              {metric === "traffic"
                ? copy.description
                : "Cumulative growth from channel-level snapshots."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {rangeTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setRange(tab.id);
                  setSelectedBucketKey(null);
                }}
                className={`rounded-2xl px-4 py-2 text-sm font-bold ${
                  range === tab.id
                    ? "bg-zinc-950 text-white"
                    : "bg-slate-50 text-slate-600 border"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-5">
          {metricTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setMetric(tab.id);
                setSelectedBucketKey(null);
              }}
              className={`pb-3 text-sm font-bold border-b-4 transition ${
                metric === tab.id
                  ? "border-orange-400 text-orange-600"
                  : "border-transparent text-slate-400 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-3xl bg-blue-50 border border-blue-200 p-4">
            <div className="flex items-center gap-2 text-blue-700">
              <Clock size={17} />
              <p className="text-sm font-bold">
                Breakdown
              </p>
            </div>

            <p className="text-2xl font-bold mt-2">
              {copy.tableFirstCol}
            </p>
          </div>

          <div className="rounded-3xl bg-emerald-50 border border-emerald-200 p-4">
            <div className="flex items-center gap-2 text-emerald-700">
              <Eye size={17} />
              <p className="text-sm font-bold">
                Total traffic
              </p>
            </div>

            <p className="text-2xl font-bold mt-2">
              {formatNumber(metric === "traffic" ? total : series[series.length - 1]?.value || 0)}
            </p>
          </div>

          <div className="rounded-3xl bg-orange-50 border border-orange-200 p-4">
            <div className="flex items-center gap-2 text-orange-700">
              <BarChart3 size={17} />
              <p className="text-sm font-bold">
                Episodes
              </p>
            </div>

            <p className="text-2xl font-bold mt-2">
              {videos.length.toLocaleString("en-US")}
            </p>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full min-w-[760px] h-[360px]"
            role="img"
            aria-label="Traffic breakdown chart"
          >
            <defs>
              <linearGradient id="trafficArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(59 130 246)" stopOpacity="0.24" />
                <stop offset="100%" stopColor="rgb(59 130 246)" stopOpacity="0.03" />
              </linearGradient>
            </defs>

            {[0, 1, 2, 3].map((line) => {
              const y =
                paddingY + (line / 3) * (height - paddingY * 2);

              return (
                <line
                  key={line}
                  x1={paddingX}
                  x2={width - paddingX}
                  y1={y}
                  y2={y}
                  stroke="rgb(226 232 240)"
                  strokeWidth="1"
                />
              );
            })}

            <path d={areaPath} fill="url(#trafficArea)" />

            <path
              d={linePath}
              fill="none"
              stroke="rgb(96 165 250)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {points.map((point, index) => {
              const isSelected = selectedBucketKey === point.key;

              return (
                <g
                  key={`${point.key}-${index}`}
                  onClick={() =>
                    setSelectedBucketKey(
                      selectedBucketKey === point.key ? null : point.key
                    )
                  }
                  style={{
                    cursor: "pointer",
                  }}
                >
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="18"
                    fill="transparent"
                  />

                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={isSelected ? "10" : "7"}
                    fill={isSelected ? "rgb(249 115 22)" : "rgb(59 130 246)"}
                    stroke="white"
                    strokeWidth="4"
                  />

                  <rect
                    x={point.x - 7}
                    y={height - paddingY + 18}
                    width="14"
                    height="54"
                    rx="7"
                    fill={isSelected ? "rgb(249 115 22)" : "rgb(59 130 246)"}
                    opacity={isSelected ? "1" : "0.85"}
                  />

                  <text
                    x={point.x}
                    y={height - 12}
                    textAnchor="middle"
                    fontSize="13"
                    fontWeight={isSelected ? "700" : "400"}
                    fill={isSelected ? "rgb(249 115 22)" : "rgb(100 116 139)"}
                  >
                    {point.label}
                  </text>
                </g>
              );
            })}

            <text
              x={paddingX}
              y={24}
              fontSize="13"
              fill="rgb(100 116 139)"
            >
              {formatNumber(maxValue)}
            </text>

            <text
              x={paddingX}
              y={height - paddingY - 8}
              fontSize="13"
              fill="rgb(100 116 139)"
            >
              0
            </text>
          </svg>
        </div>

        {metric === "traffic" && selectedBucket && (
          <div className="mt-6 rounded-3xl border bg-orange-50 border-orange-200 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-orange-700">
                  Selected Point
                </p>

                <h4 className="text-xl font-bold mt-2">
                  {selectedBucket.label}
                </h4>

                <p className="text-sm text-slate-600 mt-1">
                  Đây là các tập kéo traffic trong mốc bạn vừa bấm trên biểu đồ.
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm text-orange-700 font-bold">
                  Traffic
                </p>

                <p className="text-3xl font-bold">
                  {formatNumber(selectedBucket.value)}
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedBucketKey(null)}
              className="mt-4 rounded-2xl bg-white border px-4 py-2 text-sm font-bold hover:bg-slate-50"
            >
              Show all points
            </button>
          </div>
        )}

        {metric === "traffic" && (
          <div className="mt-6 rounded-3xl border overflow-hidden">
            <div className="p-5 border-b bg-slate-50">
              <h4 className="text-lg font-bold">
                {copy.title}
              </h4>

              <p className="text-sm text-slate-600 mt-1">
                Bấm vào một điểm trên biểu đồ để lọc bảng theo đúng mốc đó. Bấm Show all points để xem lại toàn bộ.
              </p>
            </div>

            <div className="max-h-[520px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="border-b">
                    <th className="text-left p-4">
                      {copy.tableFirstCol}
                    </th>
                    <th className="text-left p-4">
                      Traffic
                    </th>
                    <th className="text-left p-4">
                      Top episodes
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {visibleBuckets.map((bucket) => (
                    <tr key={bucket.key} className="border-b align-top">
                      <td className="p-4 font-bold whitespace-nowrap">
                        {bucket.label}
                      </td>

                      <td className="p-4 font-bold text-blue-700 whitespace-nowrap">
                        {formatNumber(bucket.value)}
                      </td>

                      <td className="p-4">
                        <div className="space-y-3">
                          {bucket.episodes.map((episode, index) => (
                            <div
                              key={`${bucket.key}-${episode.videoId}-${index}`}
                              className="flex items-center gap-3"
                            >
                              <div className="w-16 h-10 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                                {episode.thumbnail ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={episode.thumbnail}
                                    alt={episode.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                                    <PlayCircle size={18} />
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="font-bold line-clamp-1">
                                  #{index + 1} {episode.title}
                                </p>

                                <p className="text-xs text-slate-500">
                                  {formatNumber(episode.traffic)} views
                                </p>
                              </div>
                            </div>
                          ))}

                          {bucket.episodes.length === 0 && (
                            <p className="text-slate-500">
                              No episode breakdown.
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {series.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-slate-500">
                        No traffic data yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {videoSnapshots.length < 2 && metric === "traffic" && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 mt-5">
            <p className="font-bold text-amber-700">
              Traffic breakdown needs repeated scans
            </p>

            <p className="text-sm text-slate-600 mt-1">
              Để Daily có traffic từng giờ, bạn cần chạy Scan All Market nhiều lần trong ngày. Weekly cần scan hằng ngày. Monthly cần scan đều theo tuần.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
