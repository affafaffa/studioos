"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ExternalLink,
  Eye,
  Flame,
  Gauge,
  Heart,
  LineChart,
  PlayCircle,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  Video,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import CompetitorChannelGrowthChart from "@/components/competitors/CompetitorChannelGrowthChart";
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

type LooseChannel = CompetitorChannel & Record<string, unknown>;
type LooseVideo = CompetitorVideo & Record<string, unknown>;

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

function cleanText(value: unknown, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

function toNumber(value: unknown) {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function formatNumber(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString("en-US");
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0%";
  return `${value.toFixed(2)}%`;
}

function getChannelId(channel: LooseChannel) {
  return Number(channel.id || 0);
}

function looksLikeYoutubeChannelId(value: string) {
  return /^UC[a-zA-Z0-9_-]{10,}$/.test(value);
}

function getChannelName(channel: LooseChannel, videos: LooseVideo[] = []) {
  const rawMetadata = channel.raw_metadata as any;

  const metadataTitle = cleanText(
    rawMetadata?.snippet?.title,
    ""
  );

  if (metadataTitle && !looksLikeYoutubeChannelId(metadataTitle)) {
    return metadataTitle;
  }

  const videoChannelTitle = cleanText(videos[0]?.channel_title, "");

  if (videoChannelTitle && !looksLikeYoutubeChannelId(videoChannelTitle)) {
    return videoChannelTitle;
  }

  const channelName = cleanText(channel.channel_name, "");

  if (channelName && !looksLikeYoutubeChannelId(channelName)) {
    return channelName;
  }

  return cleanText(channel.youtube_channel_id, "Untitled Channel");
}

function getChannelAvatar(channel: LooseChannel) {
  const rawMetadata = channel.raw_metadata as any;

  return cleanText(
    channel.channel_thumbnail_url ||
      rawMetadata?.snippet?.thumbnails?.high?.url ||
      rawMetadata?.snippet?.thumbnails?.medium?.url ||
      rawMetadata?.snippet?.thumbnails?.default?.url,
    ""
  );
}

function getChannelGroupId(channel: LooseChannel) {
  return Number(channel.group_id || 0);
}

function getVideoChannelId(video: LooseVideo) {
  return Number(video.competitor_channel_id || 0);
}

function getVideoViews(video: LooseVideo) {
  return toNumber(video.view_count || video.views);
}

function getVideoLikes(video: LooseVideo) {
  return toNumber(video.like_count || video.likes);
}

function getVideoComments(video: LooseVideo) {
  return toNumber(video.comment_count || video.comments);
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

function estimateCpm(channel: LooseChannel, topTitles: string[]) {
  const country = cleanText(channel.country, "").toUpperCase();
  const language = cleanText(channel.language, "").toUpperCase();
  const niche = cleanText(channel.niche, "").toLowerCase();
  const titleText = topTitles.join(" ").toLowerCase();

  let low = 1.2;
  let high = 3.5;
  const reasons: string[] = [];

  if (["US", "CA", "UK", "AU"].includes(country)) {
    low += 1.5;
    high += 3.5;
    reasons.push("Tier-1 country");
  }

  if (language === "EN") {
    low += 0.6;
    high += 1.4;
    reasons.push("English content");
  }

  if (
    niche.includes("finance") ||
    niche.includes("business") ||
    titleText.includes("rich") ||
    titleText.includes("money")
  ) {
    low += 1.2;
    high += 3.2;
    reasons.push("Money / rich angle");
  }

  if (
    niche.includes("kids") ||
    niche.includes("baby") ||
    titleText.includes("baby") ||
    titleText.includes("doll")
  ) {
    low -= 0.3;
    high -= 0.6;
    reasons.push("Kids / doll content may be lower monetization");
  }

  if (
    titleText.includes("makeover") ||
    titleText.includes("fashion") ||
    titleText.includes("princess")
  ) {
    low += 0.4;
    high += 1.0;
    reasons.push("Fashion / makeover angle");
  }

  low = Math.max(0.5, low);
  high = Math.max(low + 0.5, high);

  return {
    low,
    high,
    label: `$${low.toFixed(1)} - $${high.toFixed(1)}`,
    reasons: reasons.length ? reasons : ["Generic entertainment estimate"],
  };
}

function extractKeywords(videos: LooseVideo[]) {
  const stopWords = new Set([
    "the",
    "and",
    "with",
    "from",
    "into",
    "for",
    "this",
    "that",
    "video",
    "videos",
    "official",
    "full",
    "new",
    "best",
    "funny",
    "kids",
    "story",
  ]);

  const map = new Map<string, { phrase: string; count: number; views: number }>();

  videos.forEach((video) => {
    const title = getVideoTitle(video)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const words = title
      .split(" ")
      .filter((word) => word.length >= 3 && !stopWords.has(word));

    const phrases: string[] = [];

    words.forEach((word) => phrases.push(word));

    for (let index = 0; index < words.length - 1; index += 1) {
      phrases.push(`${words[index]} ${words[index + 1]}`);
    }

    phrases.forEach((phrase) => {
      const current = map.get(phrase) || {
        phrase,
        count: 0,
        views: 0,
      };

      current.count += 1;
      current.views += getVideoViews(video);

      map.set(phrase, current);
    });
  });

  return Array.from(map.values())
    .sort((a, b) => b.views - a.views)
    .slice(0, 20);
}

export default function CompetitorChannelAnalyzer({
  competitorGroups,
  competitorChannels,
  competitorVideos,
}: Props) {
  const [query, setQuery] = useState("");
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(
    competitorChannels[0]?.id ? Number(competitorChannels[0].id) : null
  );
  const [snapshots, setSnapshots] = useState<ChannelSnapshot[]>([]);
  const [videoSnapshots, setVideoSnapshots] = useState<VideoSnapshot[]>([]);

  useEffect(() => {
    async function loadSnapshots() {
      const { data: channelSnapshotRows } = await supabase
        .from("competitor_channel_snapshots")
        .select(
          "competitor_channel_id,subscriber_count,channel_view_count,video_count,captured_at"
        )
        .order("captured_at", { ascending: true });

      setSnapshots((channelSnapshotRows || []) as ChannelSnapshot[]);

      const { data: videoSnapshotRows } = await supabase
        .from("competitor_video_snapshots")
        .select(
          "competitor_video_id,view_count,like_count,comment_count,captured_at"
        )
        .order("captured_at", { ascending: true })
        .limit(20000);

      setVideoSnapshots((videoSnapshotRows || []) as VideoSnapshot[]);
    }

    loadSnapshots();
  }, []);

  const channelRows = useMemo(() => {
    const text = query.trim().toLowerCase();

    return competitorChannels
      .filter((channel) => {
        if (!text) return true;

        return (
          getChannelName(channel as LooseChannel).toLowerCase().includes(text) ||
          cleanText((channel as LooseChannel).niche, "").toLowerCase().includes(text) ||
          cleanText((channel as LooseChannel).country, "").toLowerCase().includes(text)
        );
      })
      .map((channel) => {
        const channelId = getChannelId(channel as LooseChannel);

        const videos = competitorVideos.filter(
          (video) => getVideoChannelId(video as LooseVideo) === channelId
        );

        const views = videos.reduce(
          (sum, video) => sum + getVideoViews(video as LooseVideo),
          0
        );

        const likes = videos.reduce(
          (sum, video) => sum + getVideoLikes(video as LooseVideo),
          0
        );

        const comments = videos.reduce(
          (sum, video) => sum + getVideoComments(video as LooseVideo),
          0
        );

        const engagementRate = views > 0 ? ((likes + comments) / views) * 100 : 0;

        return {
          channel,
          channelId,
          name: getChannelName(channel as LooseChannel, videos.map((video) => video as LooseVideo)),
          niche: cleanText((channel as LooseChannel).niche, "General"),
          country: cleanText((channel as LooseChannel).country, "-"),
          views,
          likes,
          comments,
          engagementRate,
          videoCount: videos.length,
        };
      })
      .sort((a, b) => b.views - a.views);
  }, [competitorChannels, competitorVideos, query]);

  const selected =
    channelRows.find((item) => item.channelId === selectedChannelId) ||
    channelRows[0];

  const selectedChannel = selected?.channel as LooseChannel | undefined;
  const selectedVideos = useMemo(() => {
    if (!selected) return [];

    return competitorVideos
      .filter(
        (video) => getVideoChannelId(video as LooseVideo) === selected.channelId
      )
      .map((video) => video as LooseVideo)
      .sort((a, b) => getVideoViews(b) - getVideoViews(a));
  }, [competitorVideos, selected]);

  const selectedSnapshots = useMemo(() => {
    if (!selected) return [];

    return snapshots.filter(
      (snapshot) => snapshot.competitor_channel_id === selected.channelId
    );
  }, [snapshots, selected]);

  const firstSnapshot = selectedSnapshots[0];
  const lastSnapshot = selectedSnapshots[selectedSnapshots.length - 1];

  const currentSubs = toNumber(selectedChannel?.subscriber_count);
  const currentChannelViews = toNumber(selectedChannel?.channel_view_count);
  const currentVideoCount = toNumber(selectedChannel?.video_count);

  const subGrowth =
    firstSnapshot && lastSnapshot
      ? toNumber(lastSnapshot.subscriber_count) -
        toNumber(firstSnapshot.subscriber_count)
      : 0;

  const viewGrowth =
    firstSnapshot && lastSnapshot
      ? toNumber(lastSnapshot.channel_view_count) -
        toNumber(firstSnapshot.channel_view_count)
      : 0;

  const contentGrowth =
    firstSnapshot && lastSnapshot
      ? toNumber(lastSnapshot.video_count) - toNumber(firstSnapshot.video_count)
      : 0;

  const totalViews = selectedVideos.reduce(
    (sum, video) => sum + getVideoViews(video),
    0
  );
  const totalLikes = selectedVideos.reduce(
    (sum, video) => sum + getVideoLikes(video),
    0
  );
  const totalComments = selectedVideos.reduce(
    (sum, video) => sum + getVideoComments(video),
    0
  );

  const engagementRate =
    totalViews > 0 ? ((totalLikes + totalComments) / totalViews) * 100 : 0;
  const likeViewRate = totalViews > 0 ? (totalLikes / totalViews) * 100 : 0;
  const commentViewRate = totalViews > 0 ? (totalComments / totalViews) * 100 : 0;

  const selectedVideoIds = selectedVideos.map((video) => Number(video.id || 0));

  const selectedVideoSnapshots = videoSnapshots.filter((snapshot) =>
    selectedVideoIds.includes(Number(snapshot.competitor_video_id || 0))
  );

  const topTitles = selectedVideos.slice(0, 20).map(getVideoTitle);
  const cpm = selectedChannel
    ? estimateCpm(selectedChannel, topTitles)
    : {
        low: 0,
        high: 0,
        label: "$0.0 - $0.0",
        reasons: [],
      };

  const keywords = extractKeywords(selectedVideos);

  const selectedGroup = competitorGroups.find(
    (group) =>
      Number(group.id) ===
      (selectedChannel ? getChannelGroupId(selectedChannel) : 0)
  );

  return (
    <div className="space-y-6 studioos-readable">
      <div className="rounded-3xl bg-zinc-950 text-white p-7 shadow">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-4 py-2 text-sm">
              <Gauge size={16} />
              Competitor / Channel Analyzer
            </div>

            <h2 className="text-3xl font-bold mt-4">
              Analyze each competitor channel
            </h2>

            <p className="text-zinc-300 mt-2 max-w-3xl">
              Soi từng kênh đối thủ theo traffic, engagement, growth, top content, keyword pattern và CPM dự đoán.
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm text-zinc-400">Channels</p>
            <p className="text-3xl font-bold mt-1">
              {competitorChannels.length.toLocaleString("en-US")}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[360px_1fr] gap-6">
        <div className="bg-white rounded-3xl border shadow overflow-hidden">
          <div className="p-5 border-b">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search channel..."
                className="w-full border rounded-2xl pl-10 pr-4 py-3 outline-none focus:ring-4 focus:ring-purple-100"
              />
            </div>
          </div>

          <div className="max-h-[900px] overflow-auto p-3 space-y-3">
            {channelRows.map((row) => {
              const rowAvatar = getChannelAvatar(row.channel as LooseChannel);

              return (
                <button
                  key={row.channelId}
                  onClick={() => setSelectedChannelId(row.channelId)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selected?.channelId === row.channelId
                      ? "bg-zinc-950 text-white border-zinc-950"
                      : "bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 overflow-hidden border shrink-0">
                      {rowAvatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={rowAvatar}
                          alt={row.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">
                          {row.name.slice(0, 1)}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="font-bold leading-5 truncate">
                        {row.name}
                      </p>

                      <p
                        className={`text-xs mt-1 ${
                          selected?.channelId === row.channelId
                            ? "text-zinc-400"
                            : "text-slate-500"
                        }`}
                      >
                        {row.niche} · {row.country}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div>
                      <p className="text-xs opacity-70">Traffic</p>
                      <p className="font-bold">{formatNumber(row.views)}</p>
                    </div>

                    <div>
                      <p className="text-xs opacity-70">ER</p>
                      <p className="font-bold">{formatPercent(row.engagementRate)}</p>
                    </div>
                  </div>
                </button>
              );
            })}

            {channelRows.length === 0 && (
              <div className="rounded-2xl border border-dashed p-8 text-center text-slate-500">
                No channels found.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {selected && selectedChannel ? (
            <>
              <div className="bg-white rounded-3xl border shadow p-6">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex items-center gap-5 min-w-0">
                    <div className="w-20 h-20 rounded-3xl bg-slate-100 overflow-hidden border shrink-0">
                      {getChannelAvatar(selectedChannel) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getChannelAvatar(selectedChannel)}
                          alt={selected.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-2xl">
                          {selected.name.slice(0, 1)}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wide text-purple-700">
                        Selected Channel
                      </p>

                      <h3 className="text-4xl font-bold mt-2 leading-tight text-zinc-950">
                        {selected.name}
                      </h3>

                      <p className="text-slate-500 mt-2">
                        {cleanText(selectedGroup?.name, "No group")} ·{" "}
                        {cleanText(selectedChannel.niche, "General")} ·{" "}
                        {cleanText(selectedChannel.country, "-")}
                      </p>

                      {selectedChannel.youtube_channel_id && (
                        <p className="text-xs text-slate-400 mt-1">
                          YouTube ID: {String(selectedChannel.youtube_channel_id)}
                        </p>
                      )}
                    </div>
                  </div>

                  {selectedChannel.channel_url && (
                    <a
                      href={String(selectedChannel.channel_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-2xl border px-4 py-3 font-bold inline-flex items-center gap-2 hover:bg-slate-50 shrink-0"
                    >
                      Open Channel
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <MetricCard
                  title="Traffic"
                  value={formatNumber(totalViews || currentChannelViews)}
                  description="Tracked video views"
                  icon={<Eye size={21} />}
                  tone="purple"
                />

                <MetricCard
                  title="Engagement Rate"
                  value={formatPercent(engagementRate)}
                  description="(likes + comments) / views"
                  icon={<Heart size={21} />}
                  tone="rose"
                />

                <MetricCard
                  title="Like / View"
                  value={formatPercent(likeViewRate)}
                  description="Likes divided by views"
                  icon={<TrendingUp size={21} />}
                  tone="blue"
                />

                <MetricCard
                  title="Predicted CPM"
                  value={cpm.label}
                  description="Estimated, not real RPM"
                  icon={<Sparkles size={21} />}
                  tone="amber"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <MetricCard
                  title="View Growth"
                  value={formatNumber(viewGrowth)}
                  description={
                    selectedSnapshots.length
                      ? "Since first channel snapshot"
                      : "Needs at least 2 scans"
                  }
                  icon={<LineChart size={21} />}
                  tone="emerald"
                />

                <MetricCard
                  title="Sub Growth"
                  value={formatNumber(subGrowth || currentSubs)}
                  description={
                    selectedSnapshots.length
                      ? "Subscriber change from snapshots"
                      : "Current subscriber count"
                  }
                  icon={<Users size={21} />}
                  tone="blue"
                />

                <MetricCard
                  title="Content Growth"
                  value={formatNumber(contentGrowth || currentVideoCount)}
                  description={
                    selectedSnapshots.length
                      ? "Video count change from snapshots"
                      : "Current total video count"
                  }
                  icon={<Video size={21} />}
                  tone="purple"
                />
              </div>

              <CompetitorChannelGrowthChart
                snapshots={selectedSnapshots}
                videoSnapshots={selectedVideoSnapshots}
                videos={selectedVideos}
                currentSubs={currentSubs}
                currentViews={currentChannelViews || totalViews}
                currentVideos={currentVideoCount || selectedVideos.length}
              />

              <div className="grid grid-cols-[1fr_380px] gap-6">
                <div className="bg-white rounded-3xl border shadow overflow-hidden">
                  <div className="p-6 border-b">
                    <div className="flex items-center gap-2">
                      <Flame size={20} className="text-rose-600" />
                      <h3 className="text-xl font-bold">Top Content</h3>
                    </div>

                    <p className="text-sm text-slate-600 mt-1">
                      Video có traffic cao nhất của kênh này.
                    </p>
                  </div>

                  <div className="p-5 space-y-4 max-h-[720px] overflow-y-auto pr-3">
                    {selectedVideos.slice(0, 50).map((video, index) => (
                      <TopVideoCard
                        key={`${cleanText(video.id)}-${index}`}
                        video={video}
                        rank={index + 1}
                      />
                    ))}

                    {selectedVideos.length === 0 && (
                      <div className="rounded-2xl border border-dashed p-8 text-center text-slate-500">
                        No videos synced for this channel yet.
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white rounded-3xl border shadow p-6">
                    <div className="flex items-center gap-2">
                      <BarChart3 size={20} className="text-amber-600" />
                      <h3 className="text-xl font-bold">Channel Keywords</h3>
                    </div>

                    <div className="space-y-3 mt-5 max-h-[720px] overflow-y-auto pr-3">
                      {keywords.slice(0, 80).map((keyword, index) => (
                        <div
                          key={`${keyword.phrase}-${index}`}
                          className="rounded-2xl border p-4 hover:bg-slate-50 transition"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-sm font-black shrink-0 ${
                                index === 0
                                  ? "bg-amber-100 text-amber-700"
                                  : index === 1
                                  ? "bg-slate-100 text-slate-700"
                                  : index === 2
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-purple-50 text-purple-700"
                              }`}>
                                #{index + 1}
                              </div>

                              <div className="min-w-0">
                                <p className="font-bold capitalize leading-5">
                                  {keyword.phrase}
                                </p>

                                <p className="text-xs text-slate-500 mt-1">
                                  Used in {keyword.count} videos
                                </p>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-purple-700">
                                {formatNumber(keyword.views)}
                              </p>

                              <p className="text-[11px] text-slate-400">
                                views
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-purple-600"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(
                                    6,
                                    keywords[0]?.views
                                      ? (keyword.views / keywords[0].views) * 100
                                      : 0
                                  )
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}

                      {keywords.length === 0 && (
                        <p className="text-sm text-slate-500">
                          No keywords yet.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl border shadow p-6">
                    <div className="flex items-center gap-2">
                      <Sparkles size={20} className="text-purple-600" />
                      <h3 className="text-xl font-bold">CPM Logic</h3>
                    </div>

                    <p className="text-sm text-slate-600 mt-3 leading-6">
                      Đây là CPM dự đoán để đánh giá market value, không phải RPM thật của kênh đối thủ.
                    </p>

                    <div className="space-y-3 mt-5">
                      {cpm.reasons.map((reason) => (
                        <div
                          key={reason}
                          className="rounded-2xl bg-purple-50 border border-purple-200 p-4 text-purple-700 font-bold text-sm"
                        >
                          {reason}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-3xl border shadow p-10 text-center text-slate-500">
              No channel selected.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  description,
  icon,
  tone,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  tone: "purple" | "rose" | "blue" | "amber" | "emerald";
}) {
  const toneClass = {
    purple: "bg-purple-50 border-purple-200 text-purple-700",
    rose: "bg-rose-50 border-rose-200 text-rose-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
  }[tone];

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${toneClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold">{title}</p>
          <p className="text-3xl font-bold text-zinc-950 mt-2">{value}</p>
          <p className="text-xs text-slate-600 mt-2">{description}</p>
        </div>

        <div className="w-12 h-12 rounded-2xl bg-zinc-950 text-white flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  );
}

function TopVideoCard({
  video,
  rank,
}: {
  video: LooseVideo;
  rank: number;
}) {
  const title = getVideoTitle(video);
  const thumbnail = getVideoThumbnail(video);
  const views = getVideoViews(video);
  const likes = getVideoLikes(video);
  const comments = getVideoComments(video);
  const url = cleanText(video.video_url, "");

  return (
    <div className="rounded-3xl border p-4">
      <div className="flex gap-4">
        <div className="w-44 h-28 rounded-2xl bg-slate-100 overflow-hidden shrink-0">
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnail}
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              <PlayCircle size={28} />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-rose-700">Top #{rank}</p>

          <h4 className="font-bold text-lg leading-6 mt-2 line-clamp-2">
            {title}
          </h4>

          <div className="grid grid-cols-3 gap-3 mt-4">
            <div>
              <p className="text-xs text-slate-500">Views</p>
              <p className="font-bold">{formatNumber(views)}</p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Likes</p>
              <p className="font-bold">{formatNumber(likes)}</p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Comments</p>
              <p className="font-bold">{formatNumber(comments)}</p>
            </div>
          </div>

          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-blue-700 font-bold text-sm"
            >
              Open video
              <ExternalLink size={15} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
