"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  ImageIcon,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import RemixCompetitorVideoButton from "@/components/competitors/RemixCompetitorVideoButton";
import type {
  CompetitorChannel,
  CompetitorGroup,
  CompetitorVideo,
} from "@/types/competitor";

type Props = {
  competitorGroups?: CompetitorGroup[];
  competitorChannels?: CompetitorChannel[];
  competitorVideos?: CompetitorVideo[];
};

type SortKey =
  | "views_desc"
  | "views_asc"
  | "views_per_day_desc"
  | "published_desc"
  | "published_asc"
  | "score_desc"
  | "likes_desc"
  | "comments_desc";

const PAGE_SIZE = 30;

function formatNumber(value: number | null | undefined) {
  return Number(value || 0).toLocaleString("en-US");
}

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function extractVideoIdFromUrl(url: string) {
  const text = url.trim();

  const patterns = [
    /watch\?v=([a-zA-Z0-9_-]+)/,
    /youtu\.be\/([a-zA-Z0-9_-]+)/,
    /shorts\/([a-zA-Z0-9_-]+)/,
    /embed\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      return match[1];
    }
  }

  if (/^[a-zA-Z0-9_-]{8,}$/.test(text)) {
    return text;
  }

  return "";
}

function buildVideoUrl(videoId: string) {
  if (!videoId) return "";

  return `https://www.youtube.com/watch?v=${videoId}`;
}

function buildThumbnailUrl(videoId: string) {
  if (!videoId) return "";

  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

function getBestThumbnail(video?: CompetitorVideo | null) {
  if (!video) return "";

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

function getViewsPerDay(video: CompetitorVideo) {
  const views = Number(video.view_count || 0);

  if (!video.published_at) {
    return views;
  }

  const publishedTime = new Date(video.published_at).getTime();

  if (!publishedTime) {
    return views;
  }

  const ageDays = Math.max(
    1,
    (Date.now() - publishedTime) / (1000 * 60 * 60 * 24)
  );

  return views / ageDays;
}

function isWithinPublishedWindow(
  video: CompetitorVideo,
  publishedWindow: string
) {
  if (publishedWindow === "All") return true;

  if (!video.published_at) return false;

  const days = Number(publishedWindow);
  const publishedTime = new Date(video.published_at).getTime();
  const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

  return publishedTime >= cutoffTime;
}

function parseJsonSafely(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function VideoUrlModal({
  mode,
  video,
  competitorGroups,
  competitorChannels,
  onClose,
}: {
  mode: "add" | "edit";
  video?: CompetitorVideo;
  competitorGroups: CompetitorGroup[];
  competitorChannels: CompetitorChannel[];
  onClose: () => void;
}) {
  const router = useRouter();

  const [competitorChannelId, setCompetitorChannelId] = useState(
    video?.competitor_channel_id
      ? String(video.competitor_channel_id)
      : competitorChannels.length > 0
        ? String(competitorChannels[0].id)
        : ""
  );

  const selectedChannel = competitorChannels.find(
    (channel) => String(channel.id) === competitorChannelId
  );

  const selectedGroup = selectedChannel?.group_id
    ? competitorGroups.find(
        (group) => group.id === selectedChannel.group_id
      )
    : null;

  const [videoUrl, setVideoUrl] = useState(video?.video_url || "");
  const [youtubeVideoId, setYoutubeVideoId] = useState(
    video?.youtube_video_id || ""
  );

  const [title, setTitle] = useState(video?.title || "");
  const [thumbnailUrl, setThumbnailUrl] = useState(
    getBestThumbnail(video) || ""
  );

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function handleVideoUrlChange(value: string) {
    setVideoUrl(value);

    const id = extractVideoIdFromUrl(value);

    if (id) {
      setYoutubeVideoId(id);

      if (!thumbnailUrl) {
        setThumbnailUrl(buildThumbnailUrl(id));
      }

      if (!title.trim()) {
        setTitle(`YouTube Video ${id}`);
      }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!competitorChannelId) {
      setErrorMessage("Please choose a competitor channel.");
      return;
    }

    const finalVideoId =
      youtubeVideoId || extractVideoIdFromUrl(videoUrl);

    if (!finalVideoId.trim()) {
      setErrorMessage("Please paste a valid YouTube video URL.");
      return;
    }

    const finalVideoUrl = videoUrl || buildVideoUrl(finalVideoId);
    const finalThumbnailUrl =
      thumbnailUrl || buildThumbnailUrl(finalVideoId);
    const finalTitle =
      title.trim() || `YouTube Video ${finalVideoId}`;

    setLoading(true);
    setErrorMessage("");

    const payload = {
      competitor_channel_id: Number(competitorChannelId),
      group_id: selectedChannel?.group_id || null,

      youtube_video_id: finalVideoId,
      video_url: finalVideoUrl,

      title: finalTitle,
      channel_title: selectedChannel?.channel_name || "",

      thumbnail_url: finalThumbnailUrl,
      thumbnail_default_url: finalThumbnailUrl,
      thumbnail_medium_url: finalThumbnailUrl,
      thumbnail_high_url: finalThumbnailUrl,
      thumbnail_standard_url: finalThumbnailUrl,
      thumbnail_maxres_url: finalThumbnailUrl,

      theme: selectedChannel?.niche || "",
      idea_type: "",
      hook_type: "",
      title_formula: "",
      thumbnail_style: "official YouTube thumbnail captured",
      ai_summary:
        "Temporary metadata from pasted URL. Use Sync Channel to auto-fill title, views, date and analysis.",
      last_synced_at: new Date().toISOString(),
    };

    const { error } =
      mode === "add"
        ? await supabase.from("competitor_videos").upsert(payload, {
            onConflict: "youtube_video_id",
          })
        : await supabase
            .from("competitor_videos")
            .update(payload)
            .eq("id", video?.id);

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-3xl max-h-[90vh] overflow-auto rounded-2xl shadow-xl">
        <div className="sticky top-0 bg-white border-b p-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">
              {mode === "add" ? "Add YouTube URL" : "Edit YouTube URL"}
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Paste URL only. Use Sync Channel to auto-fill full metadata.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl border flex items-center justify-center hover:bg-gray-50"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">
              Competitor Channel
            </label>

            <select
              value={competitorChannelId}
              onChange={(event) =>
                setCompetitorChannelId(event.target.value)
              }
              className="w-full border rounded-xl px-4 py-3"
            >
              <option value="">Choose channel</option>

              {competitorChannels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  #{channel.id} · {channel.channel_name}
                </option>
              ))}
            </select>

            <p className="text-xs text-gray-500 mt-2">
              Group: {selectedGroup?.name || "-"}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              YouTube Video URL
            </label>

            <input
              value={videoUrl}
              onChange={(event) =>
                handleVideoUrlChange(event.target.value)
              }
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full border rounded-xl px-4 py-3"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Auto Video ID
              </label>

              <input
                value={youtubeVideoId}
                onChange={(event) =>
                  setYoutubeVideoId(event.target.value)
                }
                className="w-full border rounded-xl px-4 py-3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Temporary Title
              </label>

              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full border rounded-xl px-4 py-3"
              />
            </div>
          </div>

          {thumbnailUrl && (
            <div className="rounded-2xl border overflow-hidden w-full max-w-md">
              <img
                src={thumbnailUrl}
                alt="Thumbnail preview"
                className="w-full aspect-video object-cover bg-gray-100"
              />
            </div>
          )}

          {errorMessage && (
            <p className="text-sm text-red-600">
              {errorMessage}
            </p>
          )}

          <div className="sticky bottom-0 bg-white border-t pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl border"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-3 rounded-xl bg-zinc-900 text-white disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save URL"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CompetitorVideosPanel({
  competitorGroups = [],
  competitorChannels = [],
  competitorVideos = [],
}: Props) {
  const router = useRouter();

  const [openAdd, setOpenAdd] = useState(false);
  const [editingVideo, setEditingVideo] =
    useState<CompetitorVideo | null>(null);

  const [showSyncPanel, setShowSyncPanel] = useState(true);
  const [showVideoTable, setShowVideoTable] = useState(true);

  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("All");
  const [channelFilter, setChannelFilter] = useState("All");
  const [themeFilter, setThemeFilter] = useState("All");
  const [ideaTypeFilter, setIdeaTypeFilter] = useState("All");
  const [hookTypeFilter, setHookTypeFilter] = useState("All");
  const [minViews, setMinViews] = useState("");
  const [publishedWindow, setPublishedWindow] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("views_desc");
  const [currentPage, setCurrentPage] = useState(1);

  const [syncMode, setSyncMode] = useState<"channel" | "group">(
    "channel"
  );

  const [syncChannelId, setSyncChannelId] = useState(
    competitorChannels.length > 0
      ? String(competitorChannels[0].id)
      : ""
  );

  const [syncGroupId, setSyncGroupId] = useState(
    competitorGroups.length > 0
      ? String(competitorGroups[0].id)
      : ""
  );

  const [syncDays, setSyncDays] = useState("7");
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const [syncError, setSyncError] = useState("");

  useEffect(() => {
    if (!syncChannelId && competitorChannels.length > 0) {
      setSyncChannelId(String(competitorChannels[0].id));
    }

    if (!syncGroupId && competitorGroups.length > 0) {
      setSyncGroupId(String(competitorGroups[0].id));
    }
  }, [
    competitorChannels,
    competitorGroups,
    syncChannelId,
    syncGroupId,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    groupFilter,
    channelFilter,
    themeFilter,
    ideaTypeFilter,
    hookTypeFilter,
    minViews,
    publishedWindow,
    sortKey,
  ]);

  const groupMap = useMemo(() => {
    return new Map(
      competitorGroups.map((group) => [group.id, group])
    );
  }, [competitorGroups]);

  const channelMap = useMemo(() => {
    return new Map(
      competitorChannels.map((channel) => [channel.id, channel])
    );
  }, [competitorChannels]);

  const syncGroupChannels = useMemo(() => {
    if (!syncGroupId) return [];

    return competitorChannels.filter(
      (channel) => String(channel.group_id || "") === syncGroupId
    );
  }, [competitorChannels, syncGroupId]);

  const themes = useMemo(() => {
    return [
      "All",
      ...Array.from(
        new Set(
          competitorVideos
            .map((video) => video.theme)
            .filter(Boolean)
        )
      ),
    ] as string[];
  }, [competitorVideos]);

  const ideaTypes = useMemo(() => {
    return [
      "All",
      ...Array.from(
        new Set(
          competitorVideos
            .map((video) => video.idea_type)
            .filter(Boolean)
        )
      ),
    ] as string[];
  }, [competitorVideos]);

  const hookTypes = useMemo(() => {
    return [
      "All",
      ...Array.from(
        new Set(
          competitorVideos
            .map((video) => video.hook_type)
            .filter(Boolean)
        )
      ),
    ] as string[];
  }, [competitorVideos]);

  const filteredVideos = competitorVideos.filter((video) => {
    const keyword = search.trim().toLowerCase();

    const channel = video.competitor_channel_id
      ? channelMap.get(video.competitor_channel_id)
      : null;

    const group = video.group_id
      ? groupMap.get(video.group_id)
      : null;

    const text = [
      video.title,
      video.youtube_video_id,
      video.description,
      video.theme,
      video.idea_type,
      video.hook_type,
      video.title_formula,
      video.thumbnail_style,
      video.ai_summary,
      channel?.channel_name,
      group?.name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = !keyword || text.includes(keyword);

    const matchesGroup =
      groupFilter === "All" ||
      String(video.group_id || "") === groupFilter;

    const matchesChannel =
      channelFilter === "All" ||
      String(video.competitor_channel_id || "") === channelFilter;

    const matchesTheme =
      themeFilter === "All" || video.theme === themeFilter;

    const matchesIdeaType =
      ideaTypeFilter === "All" ||
      video.idea_type === ideaTypeFilter;

    const matchesHookType =
      hookTypeFilter === "All" ||
      video.hook_type === hookTypeFilter;

    const matchesMinViews =
      !minViews || Number(video.view_count || 0) >= Number(minViews);

    const matchesPublishedWindow = isWithinPublishedWindow(
      video,
      publishedWindow
    );

    return (
      matchesSearch &&
      matchesGroup &&
      matchesChannel &&
      matchesTheme &&
      matchesIdeaType &&
      matchesHookType &&
      matchesMinViews &&
      matchesPublishedWindow
    );
  });

  const sortedVideos = [...filteredVideos].sort((a, b) => {
    if (sortKey === "views_desc") {
      return Number(b.view_count || 0) - Number(a.view_count || 0);
    }

    if (sortKey === "views_asc") {
      return Number(a.view_count || 0) - Number(b.view_count || 0);
    }

    if (sortKey === "views_per_day_desc") {
      return getViewsPerDay(b) - getViewsPerDay(a);
    }

    if (sortKey === "published_desc") {
      return (
        new Date(b.published_at || 0).getTime() -
        new Date(a.published_at || 0).getTime()
      );
    }

    if (sortKey === "published_asc") {
      return (
        new Date(a.published_at || 0).getTime() -
        new Date(b.published_at || 0).getTime()
      );
    }

    if (sortKey === "score_desc") {
      return (
        Number(b.performance_score || 0) -
        Number(a.performance_score || 0)
      );
    }

    if (sortKey === "likes_desc") {
      return Number(b.like_count || 0) - Number(a.like_count || 0);
    }

    if (sortKey === "comments_desc") {
      return (
        Number(b.comment_count || 0) -
        Number(a.comment_count || 0)
      );
    }

    return Number(b.view_count || 0) - Number(a.view_count || 0);
  });

  const totalPages = Math.max(
    1,
    Math.ceil(sortedVideos.length / PAGE_SIZE)
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedVideos = sortedVideos.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE
  );

  const pageStart =
    sortedVideos.length === 0
      ? 0
      : (safeCurrentPage - 1) * PAGE_SIZE + 1;

  const pageEnd = Math.min(
    safeCurrentPage * PAGE_SIZE,
    sortedVideos.length
  );

  const totalViews = competitorVideos.reduce(
    (sum, video) => sum + Number(video.view_count || 0),
    0
  );

  const videosWithThumbnail = competitorVideos.filter((video) =>
    Boolean(getBestThumbnail(video))
  );

  const topVideo = [...competitorVideos].sort(
    (a, b) => Number(b.view_count || 0) - Number(a.view_count || 0)
  )[0];

  const filteredTotalViews = sortedVideos.reduce(
    (sum, video) => sum + Number(video.view_count || 0),
    0
  );

  async function syncOneChannel(channelId: number) {
    const response = await fetch("/api/youtube/sync-channel-videos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        competitorChannelId: channelId,
        days: Number(syncDays),
      }),
    });

    const text = await response.text();
    const result = text ? parseJsonSafely(text) : null;

    if (!result) {
      throw new Error("Sync API did not return valid JSON.");
    }

    if (!response.ok) {
      throw new Error(result.error || "Sync failed.");
    }

    return result as {
      imported?: number;
      message?: string;
      channelTitle?: string;
    };
  }

  async function handleSync() {
    setSyncing(true);
    setSyncMessage("");
    setSyncError("");
    setSyncProgress("");

    try {
      if (syncMode === "channel") {
        if (!syncChannelId) {
          throw new Error("Please choose a competitor channel.");
        }

        setSyncProgress("Syncing 1 channel...");

        const result = await syncOneChannel(Number(syncChannelId));

        setSyncMessage(
          result.message ||
            `Synced ${result.imported || 0} videos.`
        );

        setSyncProgress("");
        setSyncing(false);
        router.refresh();
        return;
      }

      if (!syncGroupId) {
        throw new Error("Please choose a competitor group.");
      }

      const channelsToSync = syncGroupChannels;

      if (channelsToSync.length === 0) {
        throw new Error("This group has no channels to sync.");
      }

      let totalImported = 0;
      const failedChannels: string[] = [];

      for (let index = 0; index < channelsToSync.length; index += 1) {
        const channel = channelsToSync[index];

        setSyncProgress(
          `Syncing ${index + 1}/${channelsToSync.length}: ${channel.channel_name}`
        );

        try {
          const result = await syncOneChannel(channel.id);
          totalImported += Number(result.imported || 0);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown error";

          failedChannels.push(`${channel.channel_name}: ${message}`);
        }
      }

      setSyncing(false);
      setSyncProgress("");

      if (failedChannels.length > 0) {
        setSyncError(
          `Group sync finished with ${failedChannels.length} failed channels. First error: ${failedChannels[0]}`
        );
      }

      setSyncMessage(
        `Group sync finished. Imported/updated ${totalImported} videos from ${channelsToSync.length} channels.`
      );

      router.refresh();
    } catch (error) {
      setSyncing(false);
      setSyncProgress("");

      const message =
        error instanceof Error ? error.message : "Unknown sync error";

      setSyncError(message);
    }
  }

  async function handleDelete(video: CompetitorVideo) {
    const confirmed = window.confirm(
      `Delete this competitor video?\n\n${video.title}`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("competitor_videos")
      .delete()
      .eq("id", video.id);

    if (error) {
      alert(error.message);
      return;
    }

    router.refresh();
  }

  function goToPreviousPage() {
    setCurrentPage((page) => Math.max(1, page - 1));
  }

  function goToNextPage() {
    setCurrentPage((page) => Math.min(totalPages, page + 1));
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-sm text-gray-500">Competitor Videos</p>
          <p className="text-3xl font-bold mt-2">
            {formatNumber(competitorVideos.length)}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-sm text-gray-500">With Thumbnail</p>
          <p className="text-3xl font-bold mt-2">
            {formatNumber(videosWithThumbnail.length)}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-sm text-gray-500">Total Public Views</p>
          <p className="text-3xl font-bold mt-2">
            {formatNumber(totalViews)}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-sm text-gray-500">Top Video Views</p>
          <p className="text-3xl font-bold mt-2">
            {formatNumber(topVideo?.view_count || 0)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow">
        <div className="p-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">
              Sync Competitor Videos
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Sync one channel or an entire competitor group within a selected time window.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpenAdd(true)}
              className="inline-flex items-center gap-2 border px-5 py-3 rounded-xl hover:bg-gray-50"
            >
              <Plus size={18} />
              Add Single URL
            </button>

            <button
              onClick={() => setShowSyncPanel((value) => !value)}
              className="inline-flex items-center gap-2 border px-5 py-3 rounded-xl hover:bg-gray-50"
            >
              {showSyncPanel ? (
                <>
                  <ChevronUp size={18} />
                  Collapse
                </>
              ) : (
                <>
                  <ChevronDown size={18} />
                  Expand
                </>
              )}
            </button>
          </div>
        </div>

        {showSyncPanel && (
          <div className="px-6 pb-6">
            <div className="flex flex-wrap gap-3">
              <select
                value={syncMode}
                onChange={(event) =>
                  setSyncMode(event.target.value as "channel" | "group")
                }
                className="border rounded-xl px-4 py-3"
              >
                <option value="channel">Sync 1 Channel</option>
                <option value="group">Sync Group</option>
              </select>

              {syncMode === "channel" ? (
                <select
                  value={syncChannelId}
                  onChange={(event) =>
                    setSyncChannelId(event.target.value)
                  }
                  className="border rounded-xl px-4 py-3 min-w-96"
                >
                  <option value="">Choose channel</option>

                  {competitorChannels.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      #{channel.id} · {channel.channel_name}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={syncGroupId}
                  onChange={(event) =>
                    setSyncGroupId(event.target.value)
                  }
                  className="border rounded-xl px-4 py-3 min-w-80"
                >
                  <option value="">Choose group</option>

                  {competitorGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={syncDays}
                onChange={(event) => setSyncDays(event.target.value)}
                className="border rounded-xl px-4 py-3"
              >
                <option value="7">Last 7 days</option>
                <option value="20">Last 20 days</option>
                <option value="30">Last 30 days</option>
                <option value="60">Last 60 days</option>
                <option value="90">Last 90 days</option>
              </select>

              <button
                onClick={handleSync}
                disabled={
                  syncing ||
                  (syncMode === "channel" && !syncChannelId) ||
                  (syncMode === "group" && !syncGroupId)
                }
                className="inline-flex items-center gap-2 bg-zinc-900 text-white px-5 py-3 rounded-xl hover:bg-zinc-800 disabled:opacity-50"
              >
                <RefreshCw
                  size={18}
                  className={syncing ? "animate-spin" : ""}
                />

                {syncing
                  ? "Syncing..."
                  : syncMode === "group"
                    ? `Sync Group (${syncGroupChannels.length})`
                    : "Sync Videos"}
              </button>
            </div>

            {syncMode === "group" && syncGroupId && (
              <p className="text-sm text-gray-500 mt-3">
                Selected group has {syncGroupChannels.length} channels.
              </p>
            )}

            {syncProgress && (
              <div className="mt-4 rounded-xl border bg-gray-50 text-gray-700 p-4 text-sm">
                {syncProgress}
              </div>
            )}

            {syncMessage && (
              <div className="mt-4 rounded-xl border border-green-100 bg-green-50 text-green-700 p-4 text-sm">
                {syncMessage}
              </div>
            )}

            {syncError && (
              <div className="mt-4 rounded-xl border border-red-100 bg-red-50 text-red-700 p-4 text-sm">
                {syncError}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">
                Competitor Video Metadata
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Filter, sort, remix and browse synced competitor videos. Showing 30 videos per page.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500 text-right">
                <div>
                  {formatNumber(sortedVideos.length)} / {formatNumber(competitorVideos.length)} videos
                </div>

                <div>
                  Filtered views: {formatNumber(filteredTotalViews)}
                </div>
              </div>

              <button
                onClick={() => setShowVideoTable((value) => !value)}
                className="inline-flex items-center gap-2 border px-5 py-3 rounded-xl hover:bg-gray-50"
              >
                {showVideoTable ? (
                  <>
                    <ChevronUp size={18} />
                    Collapse
                  </>
                ) : (
                  <>
                    <ChevronDown size={18} />
                    Expand
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 mt-6">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search videos..."
              className="border rounded-xl px-4 py-2"
            />

            <select
              value={groupFilter}
              onChange={(event) =>
                setGroupFilter(event.target.value)
              }
              className="border rounded-xl px-4 py-2"
            >
              <option value="All">All Groups</option>

              {competitorGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>

            <select
              value={channelFilter}
              onChange={(event) =>
                setChannelFilter(event.target.value)
              }
              className="border rounded-xl px-4 py-2"
            >
              <option value="All">All Channels</option>

              {competitorChannels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.channel_name}
                </option>
              ))}
            </select>

            <select
              value={themeFilter}
              onChange={(event) =>
                setThemeFilter(event.target.value)
              }
              className="border rounded-xl px-4 py-2"
            >
              {themes.map((theme) => (
                <option key={theme}>{theme}</option>
              ))}
            </select>

            <select
              value={ideaTypeFilter}
              onChange={(event) =>
                setIdeaTypeFilter(event.target.value)
              }
              className="border rounded-xl px-4 py-2"
            >
              {ideaTypes.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>

            <select
              value={hookTypeFilter}
              onChange={(event) =>
                setHookTypeFilter(event.target.value)
              }
              className="border rounded-xl px-4 py-2"
            >
              {hookTypes.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>

            <select
              value={publishedWindow}
              onChange={(event) =>
                setPublishedWindow(event.target.value)
              }
              className="border rounded-xl px-4 py-2"
            >
              <option value="All">All Published Dates</option>
              <option value="7">Published last 7 days</option>
              <option value="20">Published last 20 days</option>
              <option value="30">Published last 30 days</option>
              <option value="60">Published last 60 days</option>
              <option value="90">Published last 90 days</option>
            </select>

            <input
              value={minViews}
              onChange={(event) => setMinViews(event.target.value)}
              placeholder="Min views..."
              type="number"
              min="0"
              className="border rounded-xl px-4 py-2"
            />

            <select
              value={sortKey}
              onChange={(event) =>
                setSortKey(event.target.value as SortKey)
              }
              className="border rounded-xl px-4 py-2"
            >
              <option value="views_desc">Traffic: High → Low</option>
              <option value="views_asc">Traffic: Low → High</option>
              <option value="views_per_day_desc">Views/day: High → Low</option>
              <option value="published_desc">Newest Published</option>
              <option value="published_asc">Oldest Published</option>
              <option value="score_desc">Score: High → Low</option>
              <option value="likes_desc">Likes: High → Low</option>
              <option value="comments_desc">Comments: High → Low</option>
            </select>

            <button
              onClick={() => {
                setSearch("");
                setGroupFilter("All");
                setChannelFilter("All");
                setThemeFilter("All");
                setIdeaTypeFilter("All");
                setHookTypeFilter("All");
                setMinViews("");
                setPublishedWindow("All");
                setSortKey("views_desc");
                setCurrentPage(1);
              }}
              className="border rounded-xl px-4 py-2 hover:bg-gray-50"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {showVideoTable && (
          <>
            <div className="px-6 py-4 border-b flex items-center justify-between gap-4 bg-gray-50">
              <div className="text-sm text-gray-600">
                Showing{" "}
                <span className="font-semibold">
                  {formatNumber(pageStart)} - {formatNumber(pageEnd)}
                </span>{" "}
                of{" "}
                <span className="font-semibold">
                  {formatNumber(sortedVideos.length)}
                </span>{" "}
                videos
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={goToPreviousPage}
                  disabled={safeCurrentPage === 1}
                  className="inline-flex items-center gap-2 border px-4 py-2 rounded-xl bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>

                <select
                  value={safeCurrentPage}
                  onChange={(event) =>
                    setCurrentPage(Number(event.target.value))
                  }
                  className="border rounded-xl px-4 py-2 bg-white"
                >
                  {Array.from({ length: totalPages }).map((_, index) => (
                    <option key={index + 1} value={index + 1}>
                      Page {index + 1} / {totalPages}
                    </option>
                  ))}
                </select>

                <button
                  onClick={goToNextPage}
                  disabled={safeCurrentPage === totalPages}
                  className="inline-flex items-center gap-2 border px-4 py-2 rounded-xl bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="text-left p-4 min-w-64">
                      Thumbnail
                    </th>

                    <th className="text-left p-4 min-w-96">
                      Video
                    </th>

                    <th className="text-left p-4">
                      Group
                    </th>

                    <th className="text-left p-4">
                      Channel
                    </th>

                    <th className="text-left p-4">
                      Theme
                    </th>

                    <th className="text-left p-4">
                      Idea Type
                    </th>

                    <th className="text-left p-4">
                      Hook
                    </th>

                    <th className="text-left p-4">
                      Views
                    </th>

                    <th className="text-left p-4">
                      Views/day
                    </th>

                    <th className="text-left p-4">
                      Likes
                    </th>

                    <th className="text-left p-4">
                      Comments
                    </th>

                    <th className="text-left p-4">
                      Published
                    </th>

                    <th className="text-left p-4">
                      Score
                    </th>

                    <th className="text-left p-4 min-w-72">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedVideos.map((video) => {
                    const channel = video.competitor_channel_id
                      ? channelMap.get(video.competitor_channel_id)
                      : null;

                    const group = video.group_id
                      ? groupMap.get(video.group_id)
                      : null;

                    const thumbnail = getBestThumbnail(video);

                    return (
                      <tr
                        key={video.id}
                        className="border-t hover:bg-gray-50"
                      >
                        <td className="p-4">
                          {thumbnail ? (
                            <img
                              src={thumbnail}
                              alt={video.title}
                              className="w-48 aspect-video object-cover rounded-xl border bg-gray-100"
                            />
                          ) : (
                            <div className="w-48 aspect-video rounded-xl border bg-gray-50 flex items-center justify-center text-gray-400">
                              <ImageIcon size={24} />
                            </div>
                          )}
                        </td>

                        <td className="p-4 max-w-xl">
                          <div className="font-semibold leading-5 line-clamp-2">
                            {video.title}
                          </div>

                          <div className="text-xs text-gray-400 mt-1">
                            ID #{video.id} · Video ID {video.youtube_video_id}
                          </div>

                          {video.title_formula && (
                            <div className="text-xs text-gray-500 mt-2 line-clamp-2">
                              Formula: {video.title_formula}
                            </div>
                          )}

                          {video.thumbnail_style && (
                            <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                              Thumbnail: {video.thumbnail_style}
                            </div>
                          )}

                          {video.video_url && (
                            <a
                              href={video.video_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 mt-2"
                            >
                              Open YouTube
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </td>

                        <td className="p-4">
                          {group?.name || "-"}
                        </td>

                        <td className="p-4">
                          {channel?.channel_name || video.channel_title || "-"}
                        </td>

                        <td className="p-4">
                          <span className="px-3 py-1 rounded-full bg-zinc-100 text-zinc-700">
                            {video.theme || "-"}
                          </span>
                        </td>

                        <td className="p-4">
                          {video.idea_type || "-"}
                        </td>

                        <td className="p-4">
                          {video.hook_type || "-"}
                        </td>

                        <td className="p-4 font-semibold">
                          {formatNumber(video.view_count)}
                        </td>

                        <td className="p-4 font-semibold">
                          {formatNumber(Math.round(getViewsPerDay(video)))}
                        </td>

                        <td className="p-4">
                          {formatNumber(video.like_count)}
                        </td>

                        <td className="p-4">
                          {formatNumber(video.comment_count)}
                        </td>

                        <td className="p-4 text-gray-600">
                          {formatDate(video.published_at)}
                        </td>

                        <td className="p-4 font-semibold">
                          {Number(video.performance_score || 0)}
                        </td>

                        <td className="p-4">
                          <div className="flex flex-wrap items-center gap-4">
                            <RemixCompetitorVideoButton
                              video={video}
                              channelName={channel?.channel_name || video.channel_title || ""}
                              groupName={group?.name || ""}
                            />

                            <button
                              onClick={() => setEditingVideo(video)}
                              className="inline-flex items-center gap-2 text-gray-600 hover:text-black"
                            >
                              <Pencil size={16} />
                              Edit
                            </button>

                            <button
                              onClick={() => handleDelete(video)}
                              className="inline-flex items-center gap-2 text-red-600 hover:text-red-700"
                            >
                              <Trash2 size={16} />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {paginatedVideos.length === 0 && (
                    <tr>
                      <td
                        colSpan={14}
                        className="p-8 text-center text-gray-500"
                      >
                        No competitor videos found. Sync a channel/group or reset filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t flex items-center justify-between gap-4 bg-gray-50">
              <div className="text-sm text-gray-600">
                Page {safeCurrentPage} / {totalPages} · 30 videos per page
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={goToPreviousPage}
                  disabled={safeCurrentPage === 1}
                  className="inline-flex items-center gap-2 border px-4 py-2 rounded-xl bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>

                <button
                  onClick={goToNextPage}
                  disabled={safeCurrentPage === totalPages}
                  className="inline-flex items-center gap-2 border px-4 py-2 rounded-xl bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {openAdd && (
        <VideoUrlModal
          mode="add"
          competitorGroups={competitorGroups}
          competitorChannels={competitorChannels}
          onClose={() => setOpenAdd(false)}
        />
      )}

      {editingVideo && (
        <VideoUrlModal
          mode="edit"
          video={editingVideo}
          competitorGroups={competitorGroups}
          competitorChannels={competitorChannels}
          onClose={() => setEditingVideo(null)}
        />
      )}
    </div>
  );
}