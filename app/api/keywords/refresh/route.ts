import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { CompetitorVideo } from "@/types/competitor";

type CandidateKeyword = {
  keyword: string;
  category: string;
  source: string;
  qualityWeight: number;
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
  qualityWeightSum: number;
  matches: KeywordMatch[];
};

type ScoreBenchmarks = {
  maxTotalViews: number;
  maxViewsPerDay: number;
  maxVideoCount: number;
  maxChannelCount: number;
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
  "full",
  "episode",
  "compilation",
  "kids",
  "funny",
]);

const genericSingleWords = new Set([
  "story",
  "stories",
  "animation",
  "cartoon",
  "comedy",
  "movie",
  "recap",
  "contrast",
  "visual",
  "official",
  "challenge",
  "transformation",
  "makeover",
  "girl",
  "boy",
  "baby",
  "doll",
  "arabic",
]);

const blockedExactPhrases = new Set([
  "visual story",
  "contrast",
  "comedy",
  "movie",
  "recap",
  "official channel",
  "full episode",
  "funny video",
  "cartoon animation",
  "baby doll stories",
  "baby doll official",
  "stories official",
]);

const strongSeedWords = new Set([
  "mermaid",
  "princess",
  "vampire",
  "huntrix",
  "zombie",
  "angel",
  "demon",
  "queen",
  "fairy",
]);

const knownPatterns = [
  "rich vs poor",
  "poor vs rich",
  "giga rich",
  "rich girl",
  "poor girl",
  "gold vs trash",
  "gold vs silver",
  "diamond vs broken",
  "angel vs demon",
  "good vs bad",
  "baby doll",
  "baby doll arabic",
  "rich vs poor baby doll",
  "baby doll transformation",
  "baby doll makeover",
  "baby doll visual story",
  "mermaid transformation",
  "princess makeover",
  "vampire party",
  "vampire transformation",
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

const themeSeeds = [
  "baby doll",
  "mermaid",
  "princess",
  "vampire",
  "angel",
  "demon",
  "queen",
  "fairy",
  "school",
  "rainbow",
  "magic",
  "tim tin",
  "huntrix",
];

const statusSeeds = [
  "rich",
  "poor",
  "giga rich",
  "gold",
  "diamond",
  "broken",
  "trash",
  "secret",
  "royal",
  "dark",
  "light",
];

const actionSeeds = [
  "transformation",
  "makeover",
  "glow up",
  "dance contest",
  "challenge",
  "battle",
  "visual story",
  "story",
];

function cleanKeyword(value: string) {
  return value
    .replace(/[^\p{L}\p{N}\s&+-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKeyword(value: string) {
  return cleanKeyword(value)
    .toLowerCase()
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

function titleCaseKeyword(value: string) {
  return normalizeKeyword(value)
    .split(" ")
    .map((word) => {
      if (word === "vs") return "vs";
      if (word.length <= 2) return word.toUpperCase();

      return `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
    })
    .join(" ");
}

function isUsefulKeyword(value: string) {
  const keyword = normalizeKeyword(value);
  const slug = slugifyKeyword(keyword);

  if (!keyword || !slug) return false;
  if (keyword.length < 4) return false;
  if (blockedExactPhrases.has(keyword)) return false;

  const words = keyword.split(" ");

  if (words.length > 6) return false;

  if (words.length === 1) {
    return (
      strongSeedWords.has(words[0]) &&
      !genericSingleWords.has(words[0])
    );
  }

  const nonStopWords = words.filter((word) => !stopWords.has(word));

  if (nonStopWords.length === 0) return false;

  const allWordsGeneric = words.every((word) =>
    genericSingleWords.has(word)
  );

  if (allWordsGeneric) return false;

  const hasIntentWord = words.some((word) =>
    [
      "vs",
      "rich",
      "poor",
      "gold",
      "diamond",
      "broken",
      "trash",
      "transformation",
      "makeover",
      "glow",
      "contest",
      "challenge",
      "battle",
      "princess",
      "mermaid",
      "vampire",
      "magic",
      "angel",
      "demon",
      "baby",
      "doll",
      "arabic",
      "tim",
      "tin",
      "school",
    ].includes(word)
  );

  return hasIntentWord || words.length >= 3;
}

function detectKeywordCategory(keyword: string) {
  const text = keyword.toLowerCase();

  if (text.includes(" vs ") || text.includes(" vs")) {
    return "Contrast Combo";
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
    text.includes("broken") ||
    text.includes("trash")
  ) {
    return "Status Combo";
  }

  if (
    text.includes("contest") ||
    text.includes("challenge") ||
    text.includes("battle")
  ) {
    return "Challenge";
  }

  if (
    text.includes("arabic") ||
    text.includes("spanish") ||
    text.includes("hindi") ||
    text.includes("korean")
  ) {
    return "Locale Cluster";
  }

  if (
    text.includes("mermaid") ||
    text.includes("princess") ||
    text.includes("vampire") ||
    text.includes("queen") ||
    text.includes("magic") ||
    text.includes("angel") ||
    text.includes("demon") ||
    text.includes("baby doll")
  ) {
    return "Theme Cluster";
  }

  return "SEO Phrase";
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
  source: string,
  qualityWeight = 1
) {
  if (!keyword) return;

  const normalized = normalizeKeyword(keyword);

  if (!isUsefulKeyword(normalized)) return;

  list.push({
    keyword: titleCaseKeyword(normalized),
    category,
    source,
    qualityWeight,
  });
}

function extractKnownPatterns(title: string) {
  const text = title.toLowerCase();

  return knownPatterns.filter((pattern) => text.includes(pattern));
}

function extractVsPatterns(title: string) {
  const text = title.toLowerCase();
  const matches = text.match(
    /[a-z0-9]+(?:\s+[a-z0-9]+){0,2}\s+vs\s+[a-z0-9]+(?:\s+[a-z0-9]+){0,2}/g
  );

  return matches || [];
}

function extractTitlePhrases(title: string) {
  const candidates: string[] = [];

  const cleanedTitle = cleanKeyword(title);

  const titleParts = cleanedTitle
    .split(/[|:!?()[\]{}]+/g)
    .map((part) => normalizeKeyword(part))
    .filter((part) => {
      const words = part.split(" ");

      return words.length >= 2 && words.length <= 6;
    });

  candidates.push(...titleParts);

  const tokens =
    title
      .toLowerCase()
      .match(/[a-zA-Z0-9]+/g)
      ?.filter((token) => token.length > 1) || [];

  for (let size = 2; size <= 5; size += 1) {
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

function findSeedsInText(text: string, seeds: string[]) {
  const normalized = normalizeKeyword(text);

  return seeds.filter((seed) => normalized.includes(seed));
}

function extractCompositeClusters(video: CompetitorVideo) {
  const title = video.title || "";
  const theme = normalizeKeyword(video.theme || "");
  const ideaType = normalizeKeyword(video.idea_type || "");
  const hookType = normalizeKeyword(video.hook_type || "");

  const titleThemes = findSeedsInText(title, themeSeeds);
  const titleStatuses = findSeedsInText(title, statusSeeds);
  const titleActions = findSeedsInText(title, actionSeeds);

  const allThemes = Array.from(
    new Set([theme, ...titleThemes].filter(Boolean))
  );

  const allStatuses = Array.from(
    new Set([ideaType, ...titleStatuses].filter(Boolean))
  );

  const allActions = Array.from(
    new Set([hookType, ...titleActions].filter(Boolean))
  );

  const clusters: string[] = [];

  allThemes.forEach((themeItem) => {
    allStatuses.forEach((statusItem) => {
      clusters.push(`${statusItem} ${themeItem}`);
    });

    allActions.forEach((actionItem) => {
      clusters.push(`${themeItem} ${actionItem}`);
    });

    allStatuses.forEach((statusItem) => {
      allActions.forEach((actionItem) => {
        clusters.push(`${statusItem} ${themeItem} ${actionItem}`);
      });
    });
  });

  return clusters;
}

function extractCandidates(video: CompetitorVideo) {
  const candidates: CandidateKeyword[] = [];
  const title = video.title || "";

  addCandidate(
    candidates,
    video.theme,
    "Theme Cluster",
    "theme",
    1.15
  );

  extractCompositeClusters(video).forEach((cluster) => {
    addCandidate(
      candidates,
      cluster,
      detectKeywordCategory(cluster),
      "composite_cluster",
      1.55
    );
  });

  extractKnownPatterns(title).forEach((pattern) => {
    addCandidate(
      candidates,
      pattern,
      detectKeywordCategory(pattern),
      "known_pattern",
      1.5
    );
  });

  extractVsPatterns(title).forEach((pattern) => {
    addCandidate(
      candidates,
      pattern,
      "Contrast Combo",
      "vs_pattern",
      1.45
    );
  });

  extractTitlePhrases(title).forEach((phrase) => {
    addCandidate(
      candidates,
      phrase,
      detectKeywordCategory(phrase),
      "title_phrase",
      1
    );
  });

  if (Array.isArray(video.tags)) {
    video.tags.slice(0, 12).forEach((tag) => {
      addCandidate(
        candidates,
        tag,
        detectKeywordCategory(tag),
        "youtube_tag",
        0.75
      );
    });
  }

  const unique = new Map<string, CandidateKeyword>();

  candidates.forEach((candidate) => {
    const slug = slugifyKeyword(candidate.keyword);

    if (!slug) return;

    const existing = unique.get(slug);

    if (!existing || candidate.qualityWeight > existing.qualityWeight) {
      unique.set(slug, candidate);
    }
  });

  return Array.from(unique.values());
}

function updateDateMax(current: string | null, next: string | null) {
  if (!next) return current;
  if (!current) return next;

  return new Date(next).getTime() > new Date(current).getTime()
    ? next
    : current;
}

function updateDateMin(current: string | null, next: string | null) {
  if (!next) return current;
  if (!current) return next;

  return new Date(next).getTime() < new Date(current).getTime()
    ? next
    : current;
}

function normalizedLog(value: number, maxValue: number) {
  if (value <= 0 || maxValue <= 0) return 0;

  return Math.round(
    (Math.log10(value + 1) / Math.log10(maxValue + 1)) * 100
  );
}

function calculateScores(
  aggregate: KeywordAggregate,
  benchmarks: ScoreBenchmarks
) {
  const videoCount = aggregate.videoIds.size;
  const channelCount = aggregate.channelIds.size;

  const latestAgeDays = aggregate.latestPublishedAt
    ? Math.max(
        1,
        (Date.now() - new Date(aggregate.latestPublishedAt).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 365;

  const trafficScore = normalizedLog(
    aggregate.totalViews,
    benchmarks.maxTotalViews
  );

  const velocityScore = normalizedLog(
    aggregate.totalViewsPerDay,
    benchmarks.maxViewsPerDay
  );

  const usageScore = normalizedLog(
    videoCount,
    benchmarks.maxVideoCount
  );

  const spreadScore = normalizedLog(
    channelCount,
    benchmarks.maxChannelCount
  );

  const recencyScore = Math.max(
    0,
    Math.round(100 - Math.min(100, latestAgeDays * 2))
  );

  const averageQuality =
    videoCount > 0 ? aggregate.qualityWeightSum / videoCount : 1;

  const qualityScore = Math.min(
    100,
    Math.round(averageQuality * 55)
  );

  const trendScore = Math.min(
    100,
    Math.round(
      trafficScore * 0.25 +
        velocityScore * 0.3 +
        usageScore * 0.15 +
        spreadScore * 0.1 +
        recencyScore * 0.1 +
        qualityScore * 0.1
    )
  );

  const saturationPenalty = Math.min(35, videoCount * 0.6);

  const opportunityScore = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        trendScore * 0.55 +
          velocityScore * 0.25 +
          qualityScore * 0.25 -
          saturationPenalty
      )
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
            qualityWeightSum: 0,
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
        aggregate.qualityWeightSum += candidate.qualityWeight;

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

    const rawAggregates = Array.from(aggregates.values()).filter(
      (aggregate) => {
        return (
          aggregate.videoIds.size >= 2 ||
          aggregate.totalViews >= 50000 ||
          aggregate.totalViewsPerDay >= 5000
        );
      }
    );

    const benchmarks: ScoreBenchmarks = {
      maxTotalViews: Math.max(
        1,
        ...rawAggregates.map((item) => item.totalViews)
      ),
      maxViewsPerDay: Math.max(
        1,
        ...rawAggregates.map((item) => item.totalViewsPerDay)
      ),
      maxVideoCount: Math.max(
        1,
        ...rawAggregates.map((item) => item.videoIds.size)
      ),
      maxChannelCount: Math.max(
        1,
        ...rawAggregates.map((item) => item.channelIds.size)
      ),
    };

    const keywordAggregates = rawAggregates
      .sort((a, b) => {
        const scoreA = calculateScores(a, benchmarks);
        const scoreB = calculateScores(b, benchmarks);

        const finalA =
          scoreA.trendScore * 0.7 + scoreA.opportunityScore * 0.3;

        const finalB =
          scoreB.trendScore * 0.7 + scoreB.opportunityScore * 0.3;

        return finalB - finalA;
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
      const scores = calculateScores(aggregate, benchmarks);
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
        source: "competitor_videos_smart_clusters",
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
      message: `Smart Radar refreshed ${keywordRows.length} SEO keyword clusters from ${safeVideos.length} competitor videos.`,
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