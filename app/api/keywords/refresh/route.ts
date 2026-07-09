import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { CompetitorVideo } from "@/types/competitor";

type CandidateKeyword = {
  keyword: string;
  category: string;
  source: string;
};

type KeywordAggregate = {
  keyword: string;
  keywordSlug: string;
  category: string;
  videoIds: Set<number>;
  channelIds: Set<number>;
  groupIds: Set<number>;
  totalViews: number;
  maxViews: number;
  totalViewsPerDay: number;
  latestPublishedAt: string | null;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  matches: KeywordMatch[];
};

type KeywordMatch = {
  keyword: string;
  keywordSlug: string;
  competitorVideoId: number;
  videoTitle: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  channelTitle: string | null;
  competitorChannelId: number | null;
  groupId: number | null;
  publishedAt: string | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  viewsPerDay: number;
  matchSource: string;
};

const stopWords = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "for",
  "to",
  "of",
  "in",
  "on",
  "with",
  "without",
  "from",
  "into",
  "by",
  "at",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "this",
  "that",
  "these",
  "those",
  "who",
  "what",
  "when",
  "where",
  "why",
  "how",
  "new",
  "official",
  "channel",
  "video",
  "story",
  "stories",
  "animation",
  "cartoon",
  "full",
  "episode",
  "compilation",
  "kids",
  "funny",
  "girl",
  "boy",
  "girls",
  "boys",
  "baby",
]);

const blockedPhrases = new Set([
  "official channel",
  "full episode",
  "for kids",
  "funny video",
  "cartoon animation",
  "baby doll stories",
]);

function cleanKeyword(value: string) {
  return value
    .replace(/[^\p{L}\p{N}\s&+-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKeyword(value: string) {
  const cleaned = cleanKeyword(value).toLowerCase();

  return cleaned
    .split(" ")
    .filter(Boolean)
    .join(" ");
}

function slugifyKeyword(value: string) {
  return normalizeKeyword(value)
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isUsefulKeyword(value: string) {
  const keyword = normalizeKeyword(value);
  const slug = slugifyKeyword(keyword);

  if (!keyword || !slug) return false;
  if (keyword.length < 4) return false;
  if (blockedPhrases.has(keyword)) return false;

  const words = keyword.split(" ");

  if (words.length > 6) return false;
  if (words.length === 1 && words[0].length < 5) return false;

  const nonStopWords = words.filter((word) => !stopWords.has(word));

  return nonStopWords.length > 0;
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

function addCandidate(
  list: CandidateKeyword[],
  keyword: string | null | undefined,
  category: string,
  source: string
) {
  if (!keyword) return;

  const normalized = normalizeKeyword(keyword);

  if (!isUsefulKeyword(normalized)) return;

  list.push({
    keyword: normalized,
    category,
    source,
  });
}

function detectKeywordCategory(keyword: string) {
  const text = keyword.toLowerCase();

  if (text.includes(" vs ") || text.includes(" vs")) {
    return "Contrast";
  }

  if (
    text.includes("transformation") ||
    text.includes("transform") ||
    text.includes("glow up") ||
    text.includes("makeover")
  ) {
    return "Transformation";
  }

  if (
    text.includes("rich") ||
    text.includes("poor") ||
    text.includes("gold") ||
    text.includes("diamond") ||
    text.includes("broke") ||
    text.includes("broken")
  ) {
    return "Status";
  }

  if (
    text.includes("mermaid") ||
    text.includes("princess") ||
    text.includes("queen") ||
    text.includes("magic") ||
    text.includes("angel") ||
    text.includes("demon")
  ) {
    return "Theme";
  }

  if (
    text.includes("challenge") ||
    text.includes("contest") ||
    text.includes("battle")
  ) {
    return "Challenge";
  }

  return "Keyword";
}

function extractKnownPatterns(title: string) {
  const text = title.toLowerCase();

  const patterns = [
    "rich vs poor",
    "poor vs rich",
    "gold vs silver",
    "diamond vs broken",
    "angel vs demon",
    "good vs bad",
    "princess makeover",
    "mermaid transformation",
    "baby doll",
    "rich girl",
    "poor girl",
    "giga rich",
    "dance contest",
    "school makeover",
    "secret room",
    "glow up",
    "makeover story",
    "transformation story",
    "rainbow princess",
    "gold princess",
    "poor mermaid",
    "magic princess",
  ];

  return patterns.filter((pattern) => text.includes(pattern));
}

function extractTitlePhrases(title: string) {
  const candidates: string[] = [];

  const titleParts = title
    .split(/[|:!?()[\]{}]+/g)
    .map((part) => cleanKeyword(part))
    .filter((part) => part.length >= 4 && part.length <= 80);

  candidates.push(...titleParts);

  const tokens =
    title
      .toLowerCase()
      .match(/[a-zA-Z0-9]+/g)
      ?.filter((token) => token.length > 1) || [];

  for (let size = 2; size <= 4; size += 1) {
    for (let index = 0; index <= tokens.length - size; index += 1) {
      const gram = tokens.slice(index, index + size);

      if (stopWords.has(gram[0]) || stopWords.has(gram[gram.length - 1])) {
        continue;
      }

      candidates.push(gram.join(" "));
    }
  }

  return candidates;
}

function extractCandidates(video: CompetitorVideo) {
  const candidates: CandidateKeyword[] = [];
  const title = video.title || "";

  addCandidate(candidates, video.theme, "Theme", "theme");
  addCandidate(candidates, video.idea_type, "Idea Type", "idea_type");
  addCandidate(candidates, video.hook_type, "Hook", "hook_type");

  extractKnownPatterns(title).forEach((pattern) => {
    addCandidate(
      candidates,
      pattern,
      detectKeywordCategory(pattern),
      "known_pattern"
    );
  });

  extractTitlePhrases(title).forEach((phrase) => {
    addCandidate(
      candidates,
      phrase,
      detectKeywordCategory(phrase),
      "title_phrase"
    );
  });

  if (Array.isArray(video.tags)) {
    video.tags.slice(0, 12).forEach((tag) => {
      addCandidate(candidates, tag, "Tag", "youtube_tag");
    });
  }

  const unique = new Map<string, CandidateKeyword>();

  candidates.forEach((candidate) => {
    const slug = slugifyKeyword(candidate.keyword);

    if (!unique.has(slug)) {
      unique.set(slug, candidate);
    }
  });

  return Array.from(unique.values());
}

function updateDateMax(
  current: string | null,
  next: string | null
) {
  if (!next) return current;
  if (!current) return next;

  return new Date(next).getTime() > new Date(current).getTime()
    ? next
    : current;
}

function updateDateMin(
  current: string | null,
  next: string | null
) {
  if (!next) return current;
  if (!current) return next;

  return new Date(next).getTime() < new Date(current).getTime()
    ? next
    : current;
}

function calculateScores(aggregate: KeywordAggregate) {
  const videoCount = aggregate.videoIds.size;
  const channelCount = aggregate.channelIds.size;

  const latestAgeDays = aggregate.latestPublishedAt
    ? Math.max(
        1,
        (Date.now() - new Date(aggregate.latestPublishedAt).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 365;

  const trafficScore = Math.min(
    100,
    Math.round(Math.log10(aggregate.totalViews + 1) * 18)
  );

  const velocityScore = Math.min(
    100,
    Math.round(Math.log10(aggregate.totalViewsPerDay + 1) * 24)
  );

  const densityScore = Math.min(
    35,
    Math.round(Math.log10(videoCount + 1) * 18)
  );

  const spreadScore = Math.min(
    25,
    Math.round(Math.log10(channelCount + 1) * 15)
  );

  const recencyScore = Math.max(
    0,
    Math.round(25 - Math.min(25, latestAgeDays / 2))
  );

  const trendScore = Math.min(
    100,
    Math.round(
      trafficScore * 0.3 +
        velocityScore * 0.35 +
        densityScore +
        spreadScore +
        recencyScore
    )
  );

  const opportunityScore = Math.min(
    100,
    Math.round(
      trendScore * 0.65 +
        Math.min(20, videoCount * 2) +
        Math.min(15, channelCount * 3)
    )
  );

  return {
    trafficScore,
    velocityScore,
    trendScore,
    opportunityScore,
  };
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

export async function POST() {
  try {
    const { data: videos, error: videosError } = await supabase
      .from("competitor_videos")
      .select("*")
      .order("view_count", { ascending: false })
      .limit(10000);

    if (videosError) {
      throw videosError;
    }

    const safeVideos = (videos || []) as CompetitorVideo[];

    const aggregates = new Map<string, KeywordAggregate>();

    safeVideos.forEach((video) => {
      const candidates = extractCandidates(video);
      const views = Number(video.view_count || 0);
      const viewsPerDay = getViewsPerDay(video);
      const thumbnailUrl = getBestThumbnail(video);

      candidates.forEach((candidate) => {
        const keywordSlug = slugifyKeyword(candidate.keyword);

        if (!keywordSlug) return;

        if (!aggregates.has(keywordSlug)) {
          aggregates.set(keywordSlug, {
            keyword: candidate.keyword,
            keywordSlug,
            category: candidate.category,
            videoIds: new Set<number>(),
            channelIds: new Set<number>(),
            groupIds: new Set<number>(),
            totalViews: 0,
            maxViews: 0,
            totalViewsPerDay: 0,
            latestPublishedAt: null,
            firstSeenAt: null,
            lastSeenAt: null,
            matches: [],
          });
        }

        const aggregate = aggregates.get(keywordSlug)!;

        if (aggregate.videoIds.has(video.id)) {
          return;
        }

        aggregate.videoIds.add(video.id);

        if (video.competitor_channel_id) {
          aggregate.channelIds.add(video.competitor_channel_id);
        }

        if (video.group_id) {
          aggregate.groupIds.add(video.group_id);
        }

        aggregate.totalViews += views;
        aggregate.maxViews = Math.max(aggregate.maxViews, views);
        aggregate.totalViewsPerDay += viewsPerDay;

        aggregate.latestPublishedAt = updateDateMax(
          aggregate.latestPublishedAt,
          video.published_at
        );

        aggregate.firstSeenAt = updateDateMin(
          aggregate.firstSeenAt,
          video.published_at
        );

        aggregate.lastSeenAt = updateDateMax(
          aggregate.lastSeenAt,
          video.published_at
        );

        aggregate.matches.push({
          keyword: candidate.keyword,
          keywordSlug,
          competitorVideoId: video.id,
          videoTitle: video.title,
          videoUrl: video.video_url,
          thumbnailUrl,
          channelTitle: video.channel_title,
          competitorChannelId: video.competitor_channel_id,
          groupId: video.group_id,
          publishedAt: video.published_at,
          viewCount: views,
          likeCount: Number(video.like_count || 0),
          commentCount: Number(video.comment_count || 0),
          viewsPerDay,
          matchSource: candidate.source,
        });
      });
    });

    const keywordAggregates = Array.from(aggregates.values())
      .filter((aggregate) => {
        return (
          aggregate.videoIds.size >= 2 ||
          aggregate.totalViews >= 50000 ||
          aggregate.totalViewsPerDay >= 5000
        );
      })
      .sort((a, b) => {
        const scoreA = calculateScores(a).trendScore;
        const scoreB = calculateScores(b).trendScore;

        return scoreB - scoreA;
      })
      .slice(0, 500);

    await supabase
      .from("competitor_keyword_video_matches")
      .delete()
      .neq("id", 0);

    await supabase
      .from("competitor_keywords")
      .delete()
      .neq("id", 0);

    const keywordRows = keywordAggregates.map((aggregate, index) => {
      const scores = calculateScores(aggregate);
      const videoCount = aggregate.videoIds.size;
      const avgViews =
        videoCount > 0 ? aggregate.totalViews / videoCount : 0;

      return {
        keyword: aggregate.keyword,
        keyword_slug: aggregate.keywordSlug,
        category: aggregate.category,

        video_count: videoCount,
        channel_count: aggregate.channelIds.size,
        group_count: aggregate.groupIds.size,

        total_views: Math.round(aggregate.totalViews),
        avg_views: Math.round(avgViews),
        max_views: Math.round(aggregate.maxViews),
        total_views_per_day: Math.round(aggregate.totalViewsPerDay),

        latest_published_at: aggregate.latestPublishedAt,
        first_seen_at: aggregate.firstSeenAt,
        last_seen_at: aggregate.lastSeenAt,

        trend_score: scores.trendScore,
        traffic_score: scores.trafficScore,
        velocity_score: scores.velocityScore,
        opportunity_score: scores.opportunityScore,

        keyword_rank: index + 1,
        source: "competitor_videos",
        last_refreshed_at: new Date().toISOString(),
      };
    });

    const insertedKeywords: {
      id: number;
      keyword_slug: string;
    }[] = [];

    for (const chunk of chunkArray(keywordRows, 500)) {
      const { data, error } = await supabase
        .from("competitor_keywords")
        .insert(chunk)
        .select("id, keyword_slug");

      if (error) {
        throw error;
      }

      insertedKeywords.push(...(data || []));
    }

    const keywordIdMap = new Map(
      insertedKeywords.map((item) => [item.keyword_slug, item.id])
    );

    const matchRows = keywordAggregates.flatMap((aggregate) => {
      const keywordId = keywordIdMap.get(aggregate.keywordSlug);

      if (!keywordId) return [];

      return aggregate.matches
        .sort((a, b) => b.viewCount - a.viewCount)
        .slice(0, 100)
        .map((match) => ({
          keyword_id: keywordId,
          competitor_video_id: match.competitorVideoId,

          keyword: match.keyword,
          keyword_slug: match.keywordSlug,

          video_title: match.videoTitle,
          video_url: match.videoUrl,
          thumbnail_url: match.thumbnailUrl,
          channel_title: match.channelTitle,
          competitor_channel_id: match.competitorChannelId,
          group_id: match.groupId,

          published_at: match.publishedAt,
          view_count: match.viewCount,
          like_count: match.likeCount,
          comment_count: match.commentCount,
          views_per_day: Math.round(match.viewsPerDay),

          match_source: match.matchSource,
        }));
    });

    for (const chunk of chunkArray(matchRows, 500)) {
      const { error } = await supabase
        .from("competitor_keyword_video_matches")
        .insert(chunk);

      if (error) {
        throw error;
      }
    }

    return NextResponse.json({
      ok: true,
      keywordCount: keywordRows.length,
      matchCount: matchRows.length,
      videoCount: safeVideos.length,
      message: `Refreshed ${keywordRows.length} keywords from ${safeVideos.length} competitor videos.`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown keyword refresh error";

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