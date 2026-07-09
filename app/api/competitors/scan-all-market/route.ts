import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type CompetitorChannelRow = {
  id: number;
  group_id: number | null;
  channel_name: string;
  channel_url: string | null;
  youtube_channel_id: string | null;
  last_synced_at?: string | null;
};

type YoutubeThumbnail = {
  url?: string;
};

type YoutubeSnippet = {
  title?: string;
  description?: string;
  channelTitle?: string;
  publishedAt?: string;
  categoryId?: string;
  tags?: string[];
  thumbnails?: {
    default?: YoutubeThumbnail;
    medium?: YoutubeThumbnail;
    high?: YoutubeThumbnail;
    standard?: YoutubeThumbnail;
    maxres?: YoutubeThumbnail;
  };
};

type YoutubeVideoItem = {
  id: string;
  snippet?: YoutubeSnippet;
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
  contentDetails?: {
    duration?: string;
  };
};

function toNumber(value: unknown) {
  const parsed = Number(value || 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function getYoutubeApiKey() {
  return (
    process.env.YOUTUBE_API_KEY ||
    process.env.GOOGLE_YOUTUBE_API_KEY ||
    ""
  );
}

function extractChannelId(url: string) {
  const match = url.match(/\/channel\/(UC[a-zA-Z0-9_-]+)/);

  return match ? match[1] : "";
}

function extractHandle(url: string) {
  const match = url.match(/youtube\.com\/@([^/?&]+)/i);

  if (match) return match[1];

  const plainHandle = url.match(/^@([^/?&]+)/);

  if (plainHandle) return plainHandle[1];

  return "";
}

function getBestThumbnail(snippet?: YoutubeSnippet) {
  return (
    snippet?.thumbnails?.maxres?.url ||
    snippet?.thumbnails?.standard?.url ||
    snippet?.thumbnails?.high?.url ||
    snippet?.thumbnails?.medium?.url ||
    snippet?.thumbnails?.default?.url ||
    ""
  );
}

async function youtubeGet(
  path: string,
  params: Record<string, string>
) {
  const apiKey = getYoutubeApiKey();

  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });

  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString(), {
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        `YouTube API failed for ${path}`
    );
  }

  return data;
}

async function resolveChannel(channel: CompetitorChannelRow) {
  const fromColumn = cleanText(channel.youtube_channel_id);

  if (fromColumn) {
    return fromColumn;
  }

  const url = cleanText(channel.channel_url);

  const fromUrl = extractChannelId(url);

  if (fromUrl) {
    return fromUrl;
  }

  const handle = extractHandle(url || channel.channel_name);

  if (!handle) {
    return "";
  }

  const data = await youtubeGet("channels", {
    part: "id",
    forHandle: handle.replace(/^@/, ""),
  });

  const id = data?.items?.[0]?.id;

  return cleanText(id);
}

async function syncOneChannel({
  channel,
  maxVideosPerChannel,
  publishedAfterIso,
}: {
  channel: CompetitorChannelRow;
  maxVideosPerChannel: number;
  publishedAfterIso: string;
}) {
  const youtubeChannelId = await resolveChannel(channel);

  if (!youtubeChannelId) {
    throw new Error("Cannot resolve YouTube channel id.");
  }

  const channelData = await youtubeGet("channels", {
    part: "snippet,statistics,contentDetails",
    id: youtubeChannelId,
  });

  const channelItem = channelData?.items?.[0];

  if (!channelItem) {
    throw new Error("YouTube channel not found.");
  }

  const channelSnippet = channelItem.snippet || {};
  const channelStats = channelItem.statistics || {};
  const uploadsPlaylistId =
    channelItem.contentDetails?.relatedPlaylists?.uploads || "";

  await supabase
    .from("competitor_channels")
    .update({
      youtube_channel_id: youtubeChannelId,
      channel_name:
        channel.channel_name ||
        channelSnippet.title ||
        "Competitor Channel",
      channel_description: channelSnippet.description || "",
      channel_thumbnail_url:
        channelSnippet.thumbnails?.high?.url ||
        channelSnippet.thumbnails?.medium?.url ||
        channelSnippet.thumbnails?.default?.url ||
        "",
      subscriber_count: toNumber(channelStats.subscriberCount),
      channel_view_count: toNumber(channelStats.viewCount),
      video_count: toNumber(channelStats.videoCount),
      uploads_playlist_id: uploadsPlaylistId || null,
      last_synced_at: new Date().toISOString(),
      sync_status: "Synced",
      sync_error: null,
      raw_metadata: channelItem,
    })
    .eq("id", channel.id);

  if (!uploadsPlaylistId) {
    return {
      syncedVideos: 0,
      snapshotRows: 0,
    };
  }

  const videoIds: string[] = [];
  let pageToken = "";

  while (videoIds.length < maxVideosPerChannel) {
    const playlistData = await youtubeGet("playlistItems", {
      part: "snippet",
      playlistId: uploadsPlaylistId,
      maxResults: String(Math.min(50, maxVideosPerChannel - videoIds.length)),
      pageToken,
    });

    const items = playlistData?.items || [];

    for (const item of items) {
      const publishedAt = cleanText(item?.snippet?.publishedAt);
      const videoId = cleanText(item?.snippet?.resourceId?.videoId);

      if (!videoId) continue;

      if (publishedAfterIso && publishedAt < publishedAfterIso) {
        continue;
      }

      videoIds.push(videoId);

      if (videoIds.length >= maxVideosPerChannel) {
        break;
      }
    }

    pageToken = playlistData?.nextPageToken || "";

    if (!pageToken || items.length === 0) {
      break;
    }
  }

  if (videoIds.length === 0) {
    return {
      syncedVideos: 0,
      snapshotRows: 0,
    };
  }

  const videoRows: YoutubeVideoItem[] = [];

  for (let index = 0; index < videoIds.length; index += 50) {
    const chunk = videoIds.slice(index, index + 50);

    const videoData = await youtubeGet("videos", {
      part: "snippet,statistics,contentDetails",
      id: chunk.join(","),
    });

    videoRows.push(...(videoData?.items || []));
  }

  const payload = videoRows.map((video) => {
    const snippet = video.snippet || {};
    const statistics = video.statistics || {};
    const contentDetails = video.contentDetails || {};
    const thumbnailUrl = getBestThumbnail(snippet);

    return {
      competitor_channel_id: channel.id,
      group_id: channel.group_id,
      youtube_video_id: video.id,
      video_url: `https://www.youtube.com/watch?v=${video.id}`,

      title: snippet.title || "Untitled",
      description: snippet.description || "",
      channel_title: snippet.channelTitle || channel.channel_name,
      published_at: snippet.publishedAt || null,

      thumbnail_url: thumbnailUrl,
      thumbnail_default_url: snippet.thumbnails?.default?.url || null,
      thumbnail_medium_url: snippet.thumbnails?.medium?.url || null,
      thumbnail_high_url: snippet.thumbnails?.high?.url || null,
      thumbnail_standard_url: snippet.thumbnails?.standard?.url || null,
      thumbnail_maxres_url: snippet.thumbnails?.maxres?.url || null,

      duration: contentDetails.duration || null,
      category_id: snippet.categoryId || null,
      tags: Array.isArray(snippet.tags) ? snippet.tags : null,

      view_count: toNumber(statistics.viewCount),
      like_count: toNumber(statistics.likeCount),
      comment_count: toNumber(statistics.commentCount),

      raw_snippet: snippet,
      raw_statistics: statistics,
      raw_content_details: contentDetails,

      last_synced_at: new Date().toISOString(),
    };
  });

  const { error: upsertError } = await supabase
    .from("competitor_videos")
    .upsert(payload, {
      onConflict: "youtube_video_id",
    });

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  const { data: savedVideos } = await supabase
    .from("competitor_videos")
    .select("id,youtube_video_id")
    .in("youtube_video_id", videoRows.map((video) => video.id));

  const statsMap = new Map(
    videoRows.map((video) => [
      video.id,
      {
        view_count: toNumber(video.statistics?.viewCount),
        like_count: toNumber(video.statistics?.likeCount),
        comment_count: toNumber(video.statistics?.commentCount),
      },
    ])
  );

  const snapshotPayload =
    savedVideos?.map((video) => {
      const stats = statsMap.get(video.youtube_video_id) || {
        view_count: 0,
        like_count: 0,
        comment_count: 0,
      };

      return {
        competitor_video_id: video.id,
        view_count: stats.view_count,
        like_count: stats.like_count,
        comment_count: stats.comment_count,
      };
    }) || [];

  if (snapshotPayload.length > 0) {
    await supabase
      .from("competitor_video_snapshots")
      .insert(snapshotPayload);
  }

  return {
    syncedVideos: payload.length,
    snapshotRows: snapshotPayload.length,
  };
}

export async function POST(request: Request) {
  try {
    const apiKey = getYoutubeApiKey();

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Missing YOUTUBE_API_KEY or GOOGLE_YOUTUBE_API_KEY in environment variables.",
        },
        {
          status: 400,
        }
      );
    }

    const body = await request.json();

    const offset = Math.max(0, Number(body.offset || 0));
    const limit = Math.min(
      25,
      Math.max(1, Number(body.limit || 5))
    );
    const maxVideosPerChannel = Math.min(
      50,
      Math.max(5, Number(body.maxVideosPerChannel || 25))
    );
    const days = Math.max(1, Number(body.days || 30));
    const staleOnly = Boolean(body.staleOnly);

    const publishedAfterIso = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000
    ).toISOString();

    const staleBeforeMs =
      Date.now() - 20 * 60 * 60 * 1000;

    const {
      data: channels,
      error,
      count,
    } = await supabase
      .from("competitor_channels")
      .select(
        "id,group_id,channel_name,channel_url,youtube_channel_id,last_synced_at",
        {
          count: "exact",
        }
      )
      .order("id", {
        ascending: true,
      })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

    const rows = (channels || []) as CompetitorChannelRow[];

    let scannedChannels = 0;
    let skippedChannels = 0;
    let failedChannels = 0;
    let syncedVideos = 0;
    let snapshotRows = 0;

    const errors: {
      channelId: number;
      channelName: string;
      message: string;
    }[] = [];

    for (const channel of rows) {
      const lastSyncedAt = channel.last_synced_at
        ? new Date(channel.last_synced_at).getTime()
        : 0;

      if (staleOnly && lastSyncedAt && lastSyncedAt > staleBeforeMs) {
        skippedChannels += 1;
        continue;
      }

      try {
        const result = await syncOneChannel({
          channel,
          maxVideosPerChannel,
          publishedAfterIso,
        });

        scannedChannels += 1;
        syncedVideos += result.syncedVideos;
        snapshotRows += result.snapshotRows;
      } catch (channelError) {
        failedChannels += 1;

        const message =
          channelError instanceof Error
            ? channelError.message
            : "Unknown channel sync error";

        errors.push({
          channelId: channel.id,
          channelName: channel.channel_name,
          message,
        });

        await supabase
          .from("competitor_channels")
          .update({
            sync_status: "Error",
            sync_error: message,
            last_synced_at: new Date().toISOString(),
          })
          .eq("id", channel.id);
      }
    }

    const totalChannels = count || 0;
    const nextOffset = offset + limit;
    const done = nextOffset >= totalChannels;

    return NextResponse.json({
      offset,
      limit,
      nextOffset,
      done,
      totalChannels,
      batchRows: rows.length,
      scannedChannels,
      skippedChannels,
      failedChannels,
      syncedVideos,
      snapshotRows,
      errors,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown scan error.",
      },
      {
        status: 500,
      }
    );
  }
}
