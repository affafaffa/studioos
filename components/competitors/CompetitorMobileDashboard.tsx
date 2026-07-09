"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  ExternalLink,
  Flame,
  FolderSearch,
  PlayCircle,
  Search,
  Sparkles,
  TrendingUp,
  Users,
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
  onOpenDesktopHint?: () => void;
};

type LooseGroup = CompetitorGroup & Record<string, unknown>;
type LooseChannel = CompetitorChannel & Record<string, unknown>;
type LooseVideo = CompetitorVideo & Record<string, unknown>;

type MobileTab = "overview" | "groups" | "videos" | "keywords";

function cleanText(value: unknown, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

function toNumber(value: unknown) {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function formatNumber(value: number) {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  return value.toLocaleString("en-US");
}

function getVideoViews(video: LooseVideo) {
  return toNumber(video.view_count || video.views);
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

function getGroupName(group: LooseGroup) {
  return cleanText(group.name, "Untitled Group");
}

function getGroupCategory(group: LooseGroup) {
  return cleanText(group.category, "General");
}

function getChannelGroupId(channel: LooseChannel) {
  return Number(channel.group_id || 0);
}

function getVideoGroupId(video: LooseVideo) {
  return Number(video.group_id || 0);
}

function extractKeywordPhrases(videos: CompetitorVideo[]) {
  const stopWords = new Set([
    "the",
    "and",
    "with",
    "from",
    "into",
    "for",
    "this",
    "that",
    "https",
    "www",
    "youtube",
    "watch",
    "shorts",
    "video",
    "videos",
    "official",
    "full",
    "new",
    "best",
    "funny",
  ]);

  const phraseMap = new Map<
    string,
    {
      phrase: string;
      count: number;
      views: number;
      example: string;
    }
  >();

  videos.forEach((video) => {
    const title = getVideoTitle(video as LooseVideo)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const words = title
      .split(" ")
      .filter((word) => word.length >= 3 && !stopWords.has(word));

    const phrases: string[] = [];

    for (let index = 0; index < words.length - 1; index += 1) {
      phrases.push(`${words[index]} ${words[index + 1]}`);
    }

    for (let index = 0; index < words.length - 2; index += 1) {
      phrases.push(`${words[index]} ${words[index + 1]} ${words[index + 2]}`);
    }

    phrases.forEach((phrase) => {
      const current = phraseMap.get(phrase) || {
        phrase,
        count: 0,
        views: 0,
        example: getVideoTitle(video as LooseVideo),
      };

      current.count += 1;
      current.views += getVideoViews(video as LooseVideo);

      phraseMap.set(phrase, current);
    });
  });

  return Array.from(phraseMap.values())
    .filter((item) => item.count >= 1)
    .sort((a, b) => b.views - a.views)
    .slice(0, 20);
}

export default function CompetitorMobileDashboard({
  competitorGroups,
  competitorChannels,
  competitorVideos,
}: Props) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<MobileTab>("overview");

  const filteredGroups = useMemo(() => {
    const text = query.trim().toLowerCase();

    return competitorGroups.filter((group) => {
      if (!text) return true;

      return (
        getGroupName(group as LooseGroup).toLowerCase().includes(text) ||
        getGroupCategory(group as LooseGroup).toLowerCase().includes(text)
      );
    });
  }, [competitorGroups, query]);

  const topVideos = useMemo(() => {
    const text = query.trim().toLowerCase();

    return [...competitorVideos]
      .filter((video) => {
        if (!text) return true;

        return getVideoTitle(video as LooseVideo)
          .toLowerCase()
          .includes(text);
      })
      .sort(
        (a, b) =>
          getVideoViews(b as LooseVideo) - getVideoViews(a as LooseVideo)
      )
      .slice(0, 30);
  }, [competitorVideos, query]);

  const groupRows = useMemo(() => {
    return filteredGroups
      .map((group) => {
        const groupId = Number(group.id || 0);

        const channels = competitorChannels.filter(
          (channel) => getChannelGroupId(channel as LooseChannel) === groupId
        );

        const videos = competitorVideos.filter(
          (video) => getVideoGroupId(video as LooseVideo) === groupId
        );

        const views = videos.reduce((sum, video) => {
          return sum + getVideoViews(video as LooseVideo);
        }, 0);

        const topVideo = [...videos].sort(
          (a, b) =>
            getVideoViews(b as LooseVideo) - getVideoViews(a as LooseVideo)
        )[0];

        return {
          id: groupId,
          name: getGroupName(group as LooseGroup),
          category: getGroupCategory(group as LooseGroup),
          channels: channels.length,
          videos: videos.length,
          views,
          topVideoTitle: topVideo
            ? getVideoTitle(topVideo as LooseVideo)
            : "No top video yet",
        };
      })
      .sort((a, b) => b.views - a.views);
  }, [
    filteredGroups,
    competitorChannels,
    competitorVideos,
  ]);

  const totalViews = useMemo(() => {
    return competitorVideos.reduce((sum, video) => {
      return sum + getVideoViews(video as LooseVideo);
    }, 0);
  }, [competitorVideos]);

  const keywordRows = useMemo(() => {
    return extractKeywordPhrases(competitorVideos);
  }, [competitorVideos]);

  const tabs: {
    id: MobileTab;
    label: string;
  }[] = [
    {
      id: "overview",
      label: "Overview",
    },
    {
      id: "groups",
      label: "Groups",
    },
    {
      id: "videos",
      label: "Videos",
    },
    {
      id: "keywords",
      label: "Keywords",
    },
  ];

  return (
    <div className="lg:hidden studioos-readable space-y-4">
      <div className="rounded-3xl bg-zinc-950 text-white p-5">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-3 py-1 text-xs font-bold">
          <FolderSearch size={14} />
          Mobile Competitor View
        </div>

        <h2 className="text-2xl font-bold mt-4">
          Market overview
        </h2>

        <p className="text-zinc-300 mt-2 text-sm leading-6">
          Mobile đã chuyển sang card view để đọc nhanh: nhóm nào mạnh, video nào viral, keyword nào đáng lấy.
        </p>
      </div>

      <div className="bg-white rounded-3xl border p-4">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search groups, videos, keywords..."
            className="w-full border rounded-2xl pl-11 pr-4 py-3 outline-none focus:ring-4 focus:ring-purple-100"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl border bg-purple-50 border-purple-200 p-4">
          <div className="flex items-center gap-2 text-purple-700">
            <BarChart3 size={17} />
            <p className="text-sm font-bold">Views</p>
          </div>

          <p className="text-3xl font-bold mt-2">
            {formatNumber(totalViews)}
          </p>

          <p className="text-xs text-slate-600 mt-1">
            total public views
          </p>
        </div>

        <div className="rounded-3xl border bg-blue-50 border-blue-200 p-4">
          <div className="flex items-center gap-2 text-blue-700">
            <Users size={17} />
            <p className="text-sm font-bold">Channels</p>
          </div>

          <p className="text-3xl font-bold mt-2">
            {formatNumber(competitorChannels.length)}
          </p>

          <p className="text-xs text-slate-600 mt-1">
            tracked channels
          </p>
        </div>

        <div className="rounded-3xl border bg-rose-50 border-rose-200 p-4">
          <div className="flex items-center gap-2 text-rose-700">
            <Flame size={17} />
            <p className="text-sm font-bold">Videos</p>
          </div>

          <p className="text-3xl font-bold mt-2">
            {formatNumber(competitorVideos.length)}
          </p>

          <p className="text-xs text-slate-600 mt-1">
            metadata rows
          </p>
        </div>

        <div className="rounded-3xl border bg-amber-50 border-amber-200 p-4">
          <div className="flex items-center gap-2 text-amber-700">
            <Sparkles size={17} />
            <p className="text-sm font-bold">Groups</p>
          </div>

          <p className="text-3xl font-bold mt-2">
            {formatNumber(competitorGroups.length)}
          </p>

          <p className="text-xs text-slate-600 mt-1">
            market groups
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border p-2 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-2xl px-4 py-3 text-sm font-bold ${
                activeTab === tab.id
                  ? "bg-zinc-950 text-white"
                  : "bg-slate-50 text-slate-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="space-y-3">
          <div className="bg-white rounded-3xl border p-5">
            <div className="flex items-center gap-2">
              <TrendingUp size={19} className="text-purple-600" />

              <h3 className="text-xl font-bold">
                Top market groups
              </h3>
            </div>

            <p className="text-sm text-slate-600 mt-1">
              Nhóm có tổng views cao nhất.
            </p>

            <div className="space-y-3 mt-4">
              {groupRows.slice(0, 5).map((group, index) => (
                <div
                  key={group.id || group.name}
                  className="rounded-2xl border p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-500">
                        #{index + 1}
                      </p>

                      <h4 className="font-bold text-lg mt-1">
                        {group.name}
                      </h4>

                      <p className="text-sm text-slate-500 mt-1">
                        {group.category}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-bold">
                        {formatNumber(group.views)}
                      </p>

                      <p className="text-xs text-slate-500">
                        views
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 mt-3">
                    {group.channels} channels · {group.videos} videos
                  </p>
                </div>
              ))}

              {groupRows.length === 0 && (
                <p className="text-sm text-slate-500">
                  No competitor groups yet.
                </p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border p-5">
            <div className="flex items-center gap-2">
              <PlayCircle size={19} className="text-rose-600" />

              <h3 className="text-xl font-bold">
                Viral video signals
              </h3>
            </div>

            <div className="space-y-3 mt-4">
              {topVideos.slice(0, 5).map((video, index) => (
                <VideoCard
                  key={`${cleanText((video as LooseVideo).id)}-${index}`}
                  video={video as LooseVideo}
                  rank={index + 1}
                />
              ))}

              {topVideos.length === 0 && (
                <p className="text-sm text-slate-500">
                  No competitor videos yet.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "groups" && (
        <div className="space-y-3">
          {groupRows.map((group, index) => (
            <div
              key={group.id || group.name}
              className="bg-white rounded-3xl border p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-purple-700">
                    Market Group #{index + 1}
                  </p>

                  <h3 className="text-xl font-bold mt-2">
                    {group.name}
                  </h3>

                  <p className="text-sm text-slate-500 mt-1">
                    {group.category}
                  </p>
                </div>

                <div className="rounded-2xl bg-purple-50 text-purple-700 px-3 py-2 font-bold">
                  {formatNumber(group.views)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="rounded-2xl bg-slate-50 border p-3">
                  <p className="text-xs text-slate-500">
                    Channels
                  </p>

                  <p className="font-bold mt-1">
                    {group.channels}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 border p-3">
                  <p className="text-xs text-slate-500">
                    Videos
                  </p>

                  <p className="font-bold mt-1">
                    {group.videos}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 mt-4">
                <p className="text-xs font-bold text-amber-700">
                  Top Video
                </p>

                <p className="text-sm mt-1 leading-5">
                  {group.topVideoTitle}
                </p>
              </div>
            </div>
          ))}

          {groupRows.length === 0 && (
            <div className="bg-white rounded-3xl border p-8 text-center text-slate-500">
              No groups match this search.
            </div>
          )}
        </div>
      )}

      {activeTab === "videos" && (
        <div className="space-y-3">
          {topVideos.map((video, index) => (
            <VideoCard
              key={`${cleanText((video as LooseVideo).id)}-${index}`}
              video={video as LooseVideo}
              rank={index + 1}
            />
          ))}

          {topVideos.length === 0 && (
            <div className="bg-white rounded-3xl border p-8 text-center text-slate-500">
              No videos match this search.
            </div>
          )}
        </div>
      )}

      {activeTab === "keywords" && (
        <div className="space-y-3">
          <div className="bg-white rounded-3xl border p-5">
            <div className="flex items-center gap-2">
              <Sparkles size={19} className="text-amber-600" />

              <h3 className="text-xl font-bold">
                Keyword signals
              </h3>
            </div>

            <p className="text-sm text-slate-600 mt-1">
              Gợi ý phrase lấy từ title video có views cao.
            </p>
          </div>

          {keywordRows.map((keyword, index) => (
            <div
              key={`${keyword.phrase}-${index}`}
              className="bg-white rounded-3xl border p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-amber-700">
                    Keyword #{index + 1}
                  </p>

                  <h3 className="text-xl font-bold mt-2 capitalize">
                    {keyword.phrase}
                  </h3>
                </div>

                <div className="text-right">
                  <p className="font-bold">
                    {formatNumber(keyword.views)}
                  </p>

                  <p className="text-xs text-slate-500">
                    views
                  </p>
                </div>
              </div>

              <p className="text-sm text-slate-500 mt-3">
                Appears in {keyword.count} videos
              </p>

              <div className="rounded-2xl bg-slate-50 border p-3 mt-4">
                <p className="text-xs text-slate-500">
                  Example
                </p>

                <p className="text-sm mt-1 leading-5">
                  {keyword.example}
                </p>
              </div>
            </div>
          ))}

          {keywordRows.length === 0 && (
            <div className="bg-white rounded-3xl border p-8 text-center text-slate-500">
              No keyword signals yet.
            </div>
          )}
        </div>
      )}

      <div className="rounded-3xl bg-slate-50 border p-5">
        <p className="font-bold">
          Mobile rule
        </p>

        <p className="text-sm text-slate-600 mt-2 leading-6">
          Mobile dùng card view để đọc nhanh. Bản desktop vẫn giữ bảng đầy đủ, chart, radar và metadata chi tiết.
        </p>
      </div>
    </div>
  );
}

function VideoCard({
  video,
  rank,
}: {
  video: LooseVideo;
  rank: number;
}) {
  const title = getVideoTitle(video);
  const views = getVideoViews(video);
  const thumbnail = getVideoThumbnail(video);
  const channelTitle = cleanText(video.channel_title, "Unknown channel");
  const publishedAt = cleanText(video.published_at, "");
  const videoUrl = cleanText(video.video_url, "");

  return (
    <div className="bg-white rounded-3xl border p-4">
      <div className="flex gap-4">
        <div className="w-28 h-20 rounded-2xl bg-slate-100 overflow-hidden shrink-0">
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnail}
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              <PlayCircle size={24} />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-rose-700">
              Viral #{rank}
            </p>

            <p className="text-xs font-bold text-slate-500">
              {formatNumber(views)} views
            </p>
          </div>

          <h3 className="font-bold leading-5 mt-2 line-clamp-3">
            {title}
          </h3>

          <p className="text-xs text-slate-500 mt-2">
            {channelTitle}
          </p>

          {publishedAt && (
            <p className="text-xs text-slate-400 mt-1">
              {publishedAt.slice(0, 10)}
            </p>
          )}
        </div>
      </div>

      {videoUrl && (
        <a
          href={videoUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 rounded-2xl border px-4 py-3 font-bold text-sm flex items-center justify-center gap-2"
        >
          Open video
          <ExternalLink size={15} />
        </a>
      )}
    </div>
  );
}
