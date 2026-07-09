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

const bannedBrandPhrases = [
  "tim tin",
  "multi do",
  "multi do challenge",
  "troom",
  "troom troom",
  "la la life",
  "lalalife",
  "crazy casa",
  "woohoo",
  "bona media",
  "baby doll stories official channel",
  "official channel",
];

const blockedExactPhrases = new Set([
  "visual story",
  "story",
  "stories",
  "story tim tin",
  "tim tin visual story",
  "story tim tin visual story",
  "multi do visual story",
  "story multi do",
  "story multi do visual story",
  "troom visual story",
  "story troom visual story",
  "comedy",
  "movie",
  "recap",
  "contrast",
  "official",
  "official channel",
  "full episode",
  "funny video",
  "cartoon animation",
  "baby doll stories",
]);

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
  "full",
  "episode",
  "video",
  "official",
  "channel",

  "el",
  "la",
  "los",
  "las",
  "un",
  "una",
  "unos",
  "unas",
  "de",
  "del",
  "y",
  "o",
  "en",
  "con",
  "sin",
  "por",
  "para",
  "que",
  "se",
  "su",
  "sus",
  "mi",
  "mis",
  "tu",
  "tus",
  "como",
  "quien",
  "cuando",
  "donde",
]);

const weakWords = new Set([
  "story",
  "stories",
  "visual",
  "animation",
  "cartoon",
  "comedy",
  "movie",
  "recap",
  "contrast",
  "challenge",
  "official",
  "channel",
  "girl",
  "boy",
  "girls",
  "boys",
  "video",
  "episode",
  "funny",
  "kids",
]);

const themeSeeds = [
  "baby doll",
  "doll",
  "mermaid",
  "princess",
  "vampire",
  "queen",
  "fairy",
  "angel",
  "demon",
  "zombie",
  "witch",
  "school",
  "rainbow",
  "magic",
  "family",
];

const statusSeeds = [
  "rich vs poor",
  "poor vs rich",
  "good vs bad",
  "angel vs demon",
  "gold vs trash",
  "gold vs silver",
  "diamond vs broken",
  "giga rich",
  "rich",
  "poor",
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
  "contest",
  "challenge",
  "battle",
  "secret party",
  "party",
  "secret room",
  "school makeover",
  "wedding",
  "fashion show",
  "beauty contest",
];

const localeSeeds = [
  "arabic",
  "spanish",
  "hindi",
  "korean",
  "english",
  "portuguese",
  "french",
];

const knownNichePatterns = [
  "rich vs poor baby doll",
  "poor vs rich baby doll",
  "giga rich baby doll",
  "rich girl baby doll",
  "poor girl baby doll",
  "baby doll transformation",
  "baby doll makeover",
  "baby doll dance contest",
  "baby doll challenge",
  "baby doll secret room",
  "baby doll beauty contest",
  "baby doll fashion show",
  "arabic baby doll",
  "spanish baby doll",

  "rich vs poor princess",
  "princess makeover",
  "princess transformation",
  "rainbow princess",
  "gold princess",
  "magic princess",

  "poor mermaid transformation",
  "mermaid transformation",
  "rich vs poor mermaid",

  "vampire transformation",
  "vampire secret party",
  "vampire makeover",
  "vampire princess",

  "school makeover",
  "secret room challenge",
  "dance contest",
  "rich vs poor dance contest",
];

function canonicalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/\brico\b|\brica\b|\bricos\b|\bricas\b/g, " rich ")
    .replace(/\bpobre\b|\bpobres\b/g, " poor ")
    .replace(/\bvampira\b|\bvampiro\b|\bvampiros\b|\bvampiras\b/g, " vampire ")
    .replace(/\bsirena\b|\bsirenas\b/g, " mermaid ")
    .replace(/\bprincesa\b|\bprincesas\b/g, " princess ")
    .replace(/\breina\b|\breinas\b/g, " queen ")
    .replace(/\bescuela\b/g, " school ")
    .replace(/\bbaile\b/g, " dance ")
    .replace(/\bconcurso\b/g, " contest ")
    .replace(/\bfiesta\b/g, " party ")
    .replace(/\bsecreto\b|\bsecreta\b/g, " secret ")
    .replace(/\bmagia\b|\bmágica\b|\bmagico\b|\bmágico\b/g, " magic ")
    .replace(/\bdorado\b|\bdorada\b/g, " gold ")
    .replace(/\bdiamante\b/g, " diamond ")
    .replace(/\broto\b|\brota\b/g, " broken ");
}

function removeBrandNoise(value: string) {
  let text = value.toLowerCase();

  bannedBrandPhrases.forEach((phrase) => {
    text = text.replaceAll(phrase, " ");
  });

  return text;
}

function cleanKeyword(value: string) {
  return value
    .replace(/[^\p{L}\p{N}\s&+-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKeyword(value: string) {
  return cleanKeyword(removeBrandNoise(canonicalizeText(value)))
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

function getPrimaryTitle(title: string) {
  return title.split("|")[0] || title;
}

function containsBrandNoise(value: string) {
  const text = normalizeKeyword(value);

  return bannedBrandPhrases.some((phrase) => text.includes(phrase));
}

function findSeeds(text: string, seeds: string[]) {
  const normalized = normalizeKeyword(text);

  return seeds
    .filter((seed) => normalized.includes(seed))
    .sort((a, b) => b.length - a.length);
}

function dedupeSeeds(items: string[]) {
  const result: string[] = [];

  items.forEach((item) => {
    const isCovered = result.some(
      (existing) =>
        existing.includes(item) || item.includes(existing)
    );

    if (!isCovered) {
      result.push(item);
    }
  });

  return result;
}

function detectCategory(keyword: string) {
  const text = normalizeKeyword(keyword);

  if (text.includes(" vs ")) return "Contrast Niche";
  if (text.includes("rich") || text.includes("poor") || text.includes("gold") || text.includes("diamond") || text.includes("broken")) {
    return "Status + Theme";
  }
  if (text.includes("transformation") || text.includes("makeover") || text.includes("glow up")) {
    return "Transformation Niche";
  }
  if (text.includes("contest") || text.includes("challenge") || text.includes("battle")) {
    return "Challenge Niche";
  }
  if (localeSeeds.some((locale) => text.includes(locale))) {
    return "Locale Niche";
  }
  if (themeSeeds.some((theme) => text.includes(theme))) {
    return "Theme Niche";
  }

  return "Niche Topic";
}

function hasRealNicheIntent(value: string) {
  const keyword = normalizeKeyword(value);
  const words = keyword.split(" ").filter(Boolean);

  if (!keyword) return false;
  if (containsBrandNoise(keyword)) return false;
  if (blockedExactPhrases.has(keyword)) return false;
  if (keyword.includes("visual story")) return false;
  if (keyword.includes("story tim")) return false;
  if (keyword.includes("story multi")) return false;

  if (words.length < 2 || words.length > 6) return false;

  const meaningfulWords = words.filter(
    (word) => !stopWords.has(word) && !weakWords.has(word)
  );

  if (meaningfulWords.length < 1) return false;

  const hasTheme = themeSeeds.some((theme) => keyword.includes(theme));
  const hasStatus = statusSeeds.some((status) => keyword.includes(status));
  const hasAction = actionSeeds.some((action) => keyword.includes(action));
  const hasLocale = localeSeeds.some((locale) => keyword.includes(locale));
  const hasVs = keyword.includes(" vs ");

  if (hasVs && hasTheme) return true;
  if (hasStatus && hasTheme) return true;
  if (hasTheme && hasAction) return true;
  if (hasLocale && hasTheme) return true;

  if (keyword === "baby doll") return true;

  return false;
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

  if (!hasRealNicheIntent(normalized)) return;

  list.push({
    keyword: titleCaseKeyword(normalized),
    category,
    source,
    qualityWeight,
  });
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

function extractKnownNichePatterns(title: string) {
  const normalized = normalizeKeyword(title);

  return knownNichePatterns.filter((pattern) =>
    normalized.includes(pattern)
  );
}

function extractVsPatterns(title: string) {
  const normalized = normalizeKeyword(title);

  const matches = normalized.match(
    /[a-z0-9]+(?:\s+[a-z0-9]+){0,2}\s+vs\s+[a-z0-9]+(?:\s+[a-z0-9]+){0,2}/g
  );

  return matches || [];
}

function extractNicheClusters(video: CompetitorVideo) {
  const primaryTitle = getPrimaryTitle(video.title || "");
  const searchableText = [
    primaryTitle,
    video.theme || "",
    video.idea_type || "",
  ].join(" ");

  const titleThemes = dedupeSeeds(findSeeds(searchableText, themeSeeds));
  const titleStatuses = dedupeSeeds(findSeeds(searchableText, statusSeeds));
  const titleActions = dedupeSeeds(findSeeds(searchableText, actionSeeds));
  const titleLocales = dedupeSeeds(findSeeds(searchableText, localeSeeds));

  const clusters: string[] = [];

  titleThemes.forEach((theme) => {
    if (theme === "doll" && titleThemes.includes("baby doll")) {
      return;
    }

    if (theme === "baby doll") {
      clusters.push("baby doll");
    }

    titleStatuses.forEach((status) => {
      clusters.push(`${status} ${theme}`);
    });

    titleActions.forEach((action) => {
      clusters.push(`${theme} ${action}`);
    });

    titleLocales.forEach((locale) => {
      clusters.push(`${locale} ${theme}`);
    });

    titleStatuses.forEach((status) => {
      titleActions.forEach((action) => {
        clusters.push(`${status} ${theme} ${action}`);
      });
    });
  });

  return clusters;
}

function extractTitleSeoPhrases(title: string) {
  const primaryTitle = normalizeKeyword(getPrimaryTitle(title));

  const tokens =
    primaryTitle
      .match(/[a-z0-9]+/g)
      ?.filter(
        (token) =>
          token.length > 1 &&
          !stopWords.has(token) &&
          !weakWords.has(token)
      ) || [];

  const phrases: string[] = [];

  for (let size = 2; size <= 5; size += 1) {
    for (let index = 0; index <= tokens.length - size; index += 1) {
      const phrase = tokens.slice(index, index + size).join(" ");

      if (hasRealNicheIntent(phrase)) {
        phrases.push(phrase);
      }
    }
  }

  return phrases;
}

function extractCandidates(video: CompetitorVideo) {
  const candidates: CandidateKeyword[] = [];
  const primaryTitle = getPrimaryTitle(video.title || "");

  extractKnownNichePatterns(primaryTitle).forEach((pattern) => {
    addCandidate(
      candidates,
      pattern,
      detectCategory(pattern),
      "known_niche_pattern",
      1.7
    );
  });

  extractNicheClusters(video).forEach((cluster) => {
    addCandidate(
      candidates,
      cluster,
      detectCategory(cluster),
      "niche_cluster",
      1.6
    );
  });

  extractVsPatterns(primaryTitle).forEach((pattern) => {
    addCandidate(
      candidates,
      pattern,
      "Contrast Niche",
      "vs_pattern",
      1.5
    );
  });

  extractTitleSeoPhrases(primaryTitle).forEach((phrase) => {
    addCandidate(
      candidates,
      phrase,
      detectCategory(phrase),
      "title_niche_phrase",
      1.15
    );
  });

  if (Array.isArray(video.tags)) {
    video.tags.slice(0, 12).forEach((tag) => {
      addCandidate(
        candidates,
        tag,
        detectCategory(tag),
        "youtube_tag",
        0.7
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
    Math.round(averageQuality * 58)
  );

  const trendScore = Math.min(
    100,
    Math.round(
      trafficScore * 0.24 +
        velocityScore * 0.3 +
        usageScore * 0.15 +
        spreadScore * 0.1 +
        recencyScore * 0.09 +
        qualityScore * 0.12
    )
  );

  const saturationPenalty = Math.min(30, videoCount * 0.35);

  const opportunityScore = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        trendScore * 0.55 +
          velocityScore * 0.22 +
          qualityScore * 0.28 -
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
          scoreA.trendScore * 0.72 + scoreA.opportunityScore * 0.28;

        const finalB =
          scoreB.trendScore * 0.72 + scoreB.opportunityScore * 0.28;

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
        source: "competitor_videos_niche_topics_v3",
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
      message: `Niche Radar refreshed ${keywordRows.length} real topic keywords from ${safeVideos.length} competitor videos.`,
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