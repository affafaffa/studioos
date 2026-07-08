import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { CompetitorChannel } from "@/types/competitor";

type YouTubeThumbnail = {
  url?: string;
  width?: number;
  height?: number;
};

type YouTubeChannelItem = {
  id: string;
  snippet?: {
    title?: string;
    description?: string;
    thumbnails?: Record<string, YouTubeThumbnail>;
    country?: string;
  };
  statistics?: {
    subscriberCount?: string;
    viewCount?: string;
    videoCount?: string;
  };
  contentDetails?: {
    relatedPlaylists?: {
      uploads?: string;
    };
  };
};

type YouTubeChannelsResponse = {
  items?: YouTubeChannelItem[];
};

type YouTubePlaylistItem = {
  snippet?: {
    publishedAt?: string;
    title?: string;
    channelTitle?: string;
    resourceId?: {
      videoId?: string;
    };
  };
  contentDetails?: {
    videoId?: string;
    videoPublishedAt?: string;
  };
};

type YouTubePlaylistItemsResponse = {
  nextPageToken?: string;
  items?: YouTubePlaylistItem[];
};

type YouTubeVideoItem = {
  id: string;
  snippet?: {
    publishedAt?: string;
    channelId?: string;
    title?: string;
    description?: string;
    channelTitle?: string;
    tags?: string[];
    categoryId?: string;
    thumbnails?: Record<string, YouTubeThumbnail>;
  };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
  contentDetails?: {
    duration?: string;
  };
};

type YouTubeVideosResponse = {
  items?: YouTubeVideoItem[];
};

function numberFromText(value: string | undefined) {
  return Number(value || 0);
}

function extractChannelIdFromText(value: string | null | undefined) {
  if (!value) return "";

  const match = value.match(/(UC[a-zA-Z0-9_-]{20,})/);

  return match?.[1] || "";
}

function extractHandleFromText(value: string | null | undefined) {
  if (!value) return "";

  const match = value.match(/@([a-zA-Z0-9._-]+)/);

  return match?.[1] || "";
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

  return "";
}

function buildVideoUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function getBestThumbnail(
  thumbnails: Record<string, YouTubeThumbnail> | undefined
) {
  if (!thumbnails) return "";

  return (
    thumbnails.maxres?.url ||
    thumbnails.standard?.url ||
    thumbnails.high?.url ||
    thumbnails.medium?.url ||
    thumbnails.default?.url ||
    ""
  );
}

function getThumbnail(
  thumbnails: Record<string, YouTubeThumbnail> | undefined,
  key: string
) {
  return thumbnails?.[key]?.url || "";
}

async function youtubeGet<T>(
  endpoint: string,
  params: Record<string, string>
): Promise<T> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    throw new Error("Missing YOUTUBE_API_KEY in .env.local.");
  }

  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });

  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString(), {
    cache: "no-store",
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `YouTube API error ${response.status}: ${text.slice(0, 500)}`
    );
  }

  return JSON.parse(text) as T;
}

async function getChannelById(channelId: string) {
  const result = await youtubeGet<YouTubeChannelsResponse>("channels", {
    part: "snippet,statistics,contentDetails",
    id: channelId,
  });

  return result.items?.[0] || null;
}

async function getChannelByHandle(handle: string) {
  const cleanHandle = handle.replace(/^@/, "");

  const result = await youtubeGet<YouTubeChannelsResponse>("channels", {
    part: "snippet,statistics,contentDetails",
    forHandle: cleanHandle,
  });

  return result.items?.[0] || null;
}

async function resolveYouTubeChannel(channel: CompetitorChannel) {
  const explicitId =
    channel.youtube_channel_id ||
    extractChannelIdFromText(channel.channel_url) ||
    extractChannelIdFromText(channel.channel_name);

  if (explicitId) {
    const channelItem = await getChannelById(explicitId);

    if (channelItem) return channelItem;
  }

  const handle =
    extractHandleFromText(channel.channel_url) ||
    extractHandleFromText(channel.channel_name);

  if (handle) {
    const channelItem = await getChannelByHandle(handle);

    if (channelItem) return channelItem;
  }

  return null;
}

function detectTheme(title: string, channel: CompetitorChannel) {
  const text = `${title} ${channel.niche || ""}`.toLowerCase();

  const rules = [
    ["Huntrix", ["huntrix"]],
    ["Baby Doll", ["baby doll", "babydoll", "doll", "baby"]],
    ["Mermaid", ["mermaid", "ocean", "sea princess"]],
    ["Princess", ["princess", "queen", "royal"]],
    ["School", ["school", "student", "teacher", "classroom"]],
    ["Fashion", ["fashion", "dress", "outfit", "makeover"]],
    ["Rainbow", ["rainbow", "color", "colour"]],
    ["Magic", ["magic", "witch", "spell", "fairy"]],
    ["Wedding", ["wedding", "bride", "groom"]],
  ] as const;

  for (const [theme, keywords] of rules) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      return theme;
    }
  }

  return channel.niche || "Unknown";
}

function detectIdeaType(title: string) {
  const text = title.toLowerCase();

  const rules = [
    ["Rich vs Poor", ["rich vs poor", "poor vs rich", "rich and poor"]],
    ["Gold vs Silver", ["gold vs silver", "silver vs gold"]],
    ["Angel vs Demon", ["angel vs demon", "demon vs angel"]],
    ["Good vs Bad", ["good vs bad", "bad vs good"]],
    ["Princess Makeover", ["princess makeover"]],
    ["Mermaid Transformation", ["mermaid transformation"]],
    ["Transformation", ["transformation", "transform", "glow up", "glow-up"]],
    ["Makeover", ["makeover", "make up", "beauty"]],
    ["Challenge", ["challenge", "battle", "competition"]],
    ["Secret Room", ["secret room", "hidden room"]],
    ["Wedding", ["wedding", "bride"]],
    ["Baby Story", ["baby", "pregnant", "mommy"]],
  ] as const;

  for (const [ideaType, keywords] of rules) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      return ideaType;
    }
  }

  return "Story";
}

function detectHookType(title: string) {
  const text = title.toLowerCase();

  if (text.includes(" vs ") || text.includes("rich") || text.includes("poor")) {
    return "Contrast";
  }

  if (
    text.includes("transformation") ||
    text.includes("transform") ||
    text.includes("glow up")
  ) {
    return "Transformation";
  }

  if (text.includes("secret") || text.includes("hidden")) {
    return "Mystery";
  }

  if (text.includes("challenge") || text.includes("battle")) {
    return "Challenge";
  }

  if (text.includes("makeover")) {
    return "Makeover";
  }

  return "Visual Story";
}

function buildTitleFormula(title: string, ideaType: string, theme: string) {
  const hasVs = title.toLowerCase().includes(" vs ");

  if (hasVs) {
    return `[${ideaType}] + [Character] + [${theme}] + [Outcome]`;
  }

  if (ideaType.includes("Transformation")) {
    return `[Character] + [Problem] + [Transformation] + [Reveal]`;
  }

  if (ideaType.includes("Makeover")) {
    return `[Character] + [Makeover] + [Before/After]`;
  }

  return `[Character] + [Conflict] + [Visual Story]`;
}

function detectThumbnailStyle(title: string, thumbnailUrl: string) {
  const text = title.toLowerCase();

  const styles: string[] = [];

  if (text.includes(" vs ")) {
    styles.push("split-screen contrast");
  }

  if (
    text.includes("rich") ||
    text.includes("poor") ||
    text.includes("gold") ||
    text.includes("silver")
  ) {
    styles.push("strong visual status contrast");
  }

  if (
    text.includes("transformation") ||
    text.includes("glow") ||
    text.includes("makeover")
  ) {
    styles.push("before/after transformation");
  }

  if (text.includes("mermaid")) {
    styles.push("fantasy ocean visual");
  }

  if (text.includes("princess")) {
    styles.push("princess/fashion visual");
  }

  if (thumbnailUrl) {
    styles.push("official YouTube thumbnail captured");
  }

  return styles.length > 0
    ? styles.join(", ")
    : "thumbnail captured from YouTube";
}

function calculatePerformanceScore(viewCount: number, publishedAt: string | undefined) {
  const publishedTime = publishedAt
    ? new Date(publishedAt).getTime()
    : Date.now();

  const ageDays = Math.max(
    1,
    (Date.now() - publishedTime) / (1000 * 60 * 60 * 24)
  );

  const viewsPerDay = viewCount / ageDays;

  return Math.min(100, Math.round(Math.log10(viewsPerDay + 1) * 25));
}

function buildAiSummary({
  title,
  theme,
  ideaType,
  hookType,
  viewCount,
}: {
  title: string;
  theme: string;
  ideaType: string;
  hookType: string;
  viewCount: number;
}) {
  return `Auto analysis: "${title}" uses ${hookType.toLowerCase()} hook, belongs to ${theme} theme, and follows ${ideaType} idea pattern. Public views: ${viewCount.toLocaleString("en-US")}.`;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const competitorChannelId = Number(body.competitorChannelId);
    const days = Math.min(Math.max(Number(body.days || 7), 1), 365);

    if (!competitorChannelId) {
      return NextResponse.json(
        { error: "Missing competitorChannelId." },
        { status: 400 }
      );
    }

    const { data: channel, error: channelError } = await supabase
      .from("competitor_channels")
      .select("*")
      .eq("id", competitorChannelId)
      .single();

    if (channelError || !channel) {
      return NextResponse.json(
        { error: channelError?.message || "Competitor channel not found." },
        { status: 404 }
      );
    }

    await supabase
      .from("competitor_channels")
      .update({
        sync_status: "Syncing",
        sync_error: null,
      })
      .eq("id", competitorChannelId);

    const resolvedChannel = await resolveYouTubeChannel(
      channel as CompetitorChannel
    );

    if (!resolvedChannel) {
      await supabase
        .from("competitor_channels")
        .update({
          sync_status: "Error",
          sync_error:
            "Could not resolve YouTube channel. Please use /channel/UC... URL, @handle URL, or fill youtube_channel_id.",
        })
        .eq("id", competitorChannelId);

      return NextResponse.json(
        {
          error:
            "Could not resolve YouTube channel. Please use /channel/UC... URL, @handle URL, or fill youtube_channel_id.",
        },
        { status: 400 }
      );
    }

    const uploadsPlaylistId =
      resolvedChannel.contentDetails?.relatedPlaylists?.uploads || "";

    if (!uploadsPlaylistId) {
      throw new Error("Could not find uploads playlist for this channel.");
    }

    const channelThumbnail = getBestThumbnail(
      resolvedChannel.snippet?.thumbnails
    );

    await supabase
      .from("competitor_channels")
      .update({
        youtube_channel_id: resolvedChannel.id,
        channel_name:
          resolvedChannel.snippet?.title || channel.channel_name,
        channel_description:
          resolvedChannel.snippet?.description || "",
        channel_thumbnail_url: channelThumbnail || null,
        subscriber_count: numberFromText(
          resolvedChannel.statistics?.subscriberCount
        ),
        channel_view_count: numberFromText(
          resolvedChannel.statistics?.viewCount
        ),
        video_count: numberFromText(
          resolvedChannel.statistics?.videoCount
        ),
        uploads_playlist_id: uploadsPlaylistId,
        sync_status: "Syncing videos",
        sync_error: null,
        raw_metadata: resolvedChannel as unknown as Record<string, unknown>,
      })
      .eq("id", competitorChannelId);

    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

    const videoIds: string[] = [];
    let nextPageToken = "";
    let reachedOlderVideo = false;
    let pageCount = 0;

    do {
      const playlistResult =
        await youtubeGet<YouTubePlaylistItemsResponse>("playlistItems", {
          part: "snippet,contentDetails",
          playlistId: uploadsPlaylistId,
          maxResults: "50",
          pageToken: nextPageToken,
        });

      const items = playlistResult.items || [];

      for (const item of items) {
        const videoId =
          item.contentDetails?.videoId ||
          item.snippet?.resourceId?.videoId ||
          "";

        const publishedAt =
          item.contentDetails?.videoPublishedAt ||
          item.snippet?.publishedAt ||
          "";

        if (!videoId || !publishedAt) continue;

        const publishedTime = new Date(publishedAt).getTime();

        if (publishedTime >= cutoffTime) {
          videoIds.push(videoId);
        } else {
          reachedOlderVideo = true;
        }
      }

      nextPageToken = playlistResult.nextPageToken || "";
      pageCount += 1;
    } while (nextPageToken && !reachedOlderVideo && pageCount < 50);

    const uniqueVideoIds = Array.from(new Set(videoIds));

    if (uniqueVideoIds.length === 0) {
      await supabase
        .from("competitor_channels")
        .update({
          sync_status: "Synced",
          last_synced_at: new Date().toISOString(),
          sync_error: null,
        })
        .eq("id", competitorChannelId);

      return NextResponse.json({
        ok: true,
        imported: 0,
        message: `No videos found in the last ${days} days.`,
      });
    }

    const videoItems: YouTubeVideoItem[] = [];

    for (const chunk of chunkArray(uniqueVideoIds, 50)) {
      const videoResult = await youtubeGet<YouTubeVideosResponse>("videos", {
        part: "snippet,statistics,contentDetails",
        id: chunk.join(","),
      });

      videoItems.push(...(videoResult.items || []));
    }

    const rows = videoItems.map((video) => {
      const title = video.snippet?.title || `YouTube Video ${video.id}`;
      const thumbnailUrl = getBestThumbnail(video.snippet?.thumbnails);

      const viewCount = numberFromText(video.statistics?.viewCount);
      const likeCount = numberFromText(video.statistics?.likeCount);
      const commentCount = numberFromText(video.statistics?.commentCount);

      const theme = detectTheme(title, channel as CompetitorChannel);
      const ideaType = detectIdeaType(title);
      const hookType = detectHookType(title);
      const titleFormula = buildTitleFormula(title, ideaType, theme);
      const thumbnailStyle = detectThumbnailStyle(title, thumbnailUrl);
      const performanceScore = calculatePerformanceScore(
        viewCount,
        video.snippet?.publishedAt
      );

      return {
        competitor_channel_id: competitorChannelId,
        group_id: channel.group_id || null,

        youtube_video_id: video.id,
        video_url: buildVideoUrl(video.id),

        title,
        description: video.snippet?.description || "",
        channel_title:
          video.snippet?.channelTitle ||
          resolvedChannel.snippet?.title ||
          channel.channel_name,
        published_at: video.snippet?.publishedAt || null,

        thumbnail_url: thumbnailUrl || null,
        thumbnail_default_url: getThumbnail(video.snippet?.thumbnails, "default") || null,
        thumbnail_medium_url: getThumbnail(video.snippet?.thumbnails, "medium") || null,
        thumbnail_high_url: getThumbnail(video.snippet?.thumbnails, "high") || null,
        thumbnail_standard_url: getThumbnail(video.snippet?.thumbnails, "standard") || null,
        thumbnail_maxres_url: getThumbnail(video.snippet?.thumbnails, "maxres") || null,

        duration: video.contentDetails?.duration || "",
        category_id: video.snippet?.categoryId || "",
        tags: video.snippet?.tags || [],

        view_count: viewCount,
        like_count: likeCount,
        comment_count: commentCount,

        theme,
        idea_type: ideaType,
        hook_type: hookType,
        title_formula: titleFormula,
        thumbnail_style: thumbnailStyle,
        ai_summary: buildAiSummary({
          title,
          theme,
          ideaType,
          hookType,
          viewCount,
        }),
        performance_score: performanceScore,

        raw_snippet: video.snippet || {},
        raw_statistics: video.statistics || {},
        raw_content_details: video.contentDetails || {},

        last_synced_at: new Date().toISOString(),
      };
    });

    const { data: upsertedVideos, error: upsertError } = await supabase
      .from("competitor_videos")
      .upsert(rows, {
        onConflict: "youtube_video_id",
      })
      .select("id, view_count, like_count, comment_count");

    if (upsertError) {
      throw upsertError;
    }

    const snapshots = (upsertedVideos || []).map((video) => ({
      competitor_video_id: video.id,
      view_count: Number(video.view_count || 0),
      like_count: Number(video.like_count || 0),
      comment_count: Number(video.comment_count || 0),
    }));

    if (snapshots.length > 0) {
      await supabase.from("competitor_video_snapshots").insert(snapshots);
    }

    await supabase
      .from("competitor_channels")
      .update({
        sync_status: "Synced",
        last_synced_at: new Date().toISOString(),
        sync_error: null,
      })
      .eq("id", competitorChannelId);

    return NextResponse.json({
      ok: true,
      imported: rows.length,
      days,
      channelTitle: resolvedChannel.snippet?.title || channel.channel_name,
      message: `Synced ${rows.length} videos from the last ${days} days.`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown sync error";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}