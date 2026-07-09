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

const bannedStandaloneKeywords = new Set([
  "baby doll",
  "doll",
  "story",
  "stories",
  "visual story",
  "contrast",
  "movie",
  "recap",
  "comedy",
  "challenge",
  "makeover",
  "transformation",
  "vampire",
  "princess",
  "mermaid",
  "demon",
  "angel",
  "secret",
  "rich",
  "poor",
  "giga rich",
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
  "new",
  "full",
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

const trendEntityPhrases = [
  "kpop demon hunters",
  "k pop demon hunters",
  "k-pop demon hunters",
  "huntrix",
  "demon hunters",
  "saja boys",
];

const exactMarketPhrases = [
  "poor vs rich",
  "rich vs poor",
  "poor vs rich vs giga rich",
  "rich vs poor vs giga rich",
  "giga rich",
  "rich vs poor baby doll",
  "poor vs rich baby doll",
  "poor vs rich vs giga rich baby doll",
  "rich vs poor vs giga rich baby doll",
  "giga rich baby doll",

  "kpop demon hunters",
  "k pop demon hunters",
  "k-pop demon hunters",
  "huntrix",
  "demon hunters",
  "huntrix transformation",
  "huntrix makeover",
  "huntrix party",

  "princess makeover",
  "princess transformation",
  "princess challenge",
  "rainbow princess",
  "magic princess",
  "gold princess",

  "mermaid challenge",
  "mermaid makeover",
  "mermaid transformation",
  "poor mermaid transformation",
  "rich vs poor mermaid",

  "vampire secret party",
  "vampire transformation",
  "vampire makeover",
  "vampire party",
  "vampire princess",

  "baby doll makeover",
  "baby doll transformation",
  "baby doll dance contest",
  "baby doll beauty contest",
  "baby doll fashion show",
  "baby doll challenge",
  "baby doll contest",
  "arabic baby doll",
  "spanish baby doll",

  "we build a secret room",
  "we built a secret room",
  "build a secret room",
  "built a secret room",
  "secret room challenge",
  "secret room",
  "secret base",
  "secret house",
  "secret door",
  "secret party",
  "secret school",

  "school makeover",
  "dance contest",
  "beauty contest",
  "fashion show",
];

const themes = [
  "baby doll",
  "princess",
  "mermaid",
  "vampire",
  "demon",
  "angel",
  "huntrix",
  "kpop demon hunters",
  "demon hunters",
  "queen",
  "fairy",
  "witch",
  "zombie",
  "school",
];

const actions = [
  "makeover",
  "transformation",
  "glow up",
  "challenge",
  "contest",
  "dance contest",
  "beauty contest",
  "fashion show",
  "secret party",
  "secret room",
  "party",
  "wedding",
  "battle",
];

const statusChains = [
  "poor vs rich vs giga rich",
  "rich vs poor vs giga rich",
  "poor vs rich",
  "rich vs poor",
  "good vs bad",
  "angel vs demon",
  "gold vs trash",
  "gold vs silver",
  "diamond vs broken",
];

function canonicalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/\bk-pop\b/g, " kpop ")
    .replace(/\bk pop\b/g, " kpop ")
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
    .replace(/\bcuarto\b|\bhabitación\b|\bhabitacion\b/g, " room ")
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

function cleanText(value: string) {
  return value
    .replace(/[^\p{L}\p{N}\s&+-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeForSearch(value: string) {
  return cleanText(removeBrandNoise(canonicalizeText(value)))
    .split(" ")
    .filter(Boolean)
    .join(" ");
}

function normalizeForExactScan(value: string) {
  return cleanText(canonicalizeText(value))
    .split(" ")
    .filter(Boolean)
    .join(" ");
}

function slugifyKeyword(value: string) {
  return normalizeForSearch(value)
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCaseKeyword(value: string) {
  return normalizeForSearch(value)
    .split(" ")
    .map((word) => {
      if (word === "vs") return "vs";
      if (word === "kpop") return "Kpop";
      if (word.length <= 2) return word.toUpperCase();

      return `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
    })
    .join(" ");
}

function getPrimaryTitle(title: string) {
  return title.split("|")[0] || title;
}

function hasBrandNoise(value: string) {
  const text = normalizeForExactScan(value);

  return bannedBrandPhrases.some((phrase) => text.includes(phrase));
}

function isWeakStandalone(value: string) {
  const keyword = normalizeForSearch(value);
  const words = keyword.split(" ").filter(Boolean);

  if (bannedStandaloneKeywords.has(keyword)) return true;

  if (words.length === 1) {
    return !trendEntityPhrases.includes(keyword);
  }

  const meaningfulWords = words.filter(
    (word) => !stopWords.has(word) && !weakWords.has(word)
  );

  return meaningfulWords.length === 0;
}

function isMarketPhrase(value: string) {
  const keyword = normalizeForSearch(value);
  const words = keyword.split(" ").filter(Boolean);

  if (!keyword) return false;
  if (hasBrandNoise(keyword)) return false;
  if (keyword.includes("visual story")) return false;
  if (keyword.includes("story tim")) return false;
  if (keyword.includes("story multi")) return false;
  if (keyword.includes("story troom")) return false;
  if (isWeakStandalone(keyword)) return false;
  if (words.length > 8) return false;

  if (trendEntityPhrases.some((phrase) => keyword.includes(normalizeForSearch(phrase)))) {
    return true;
  }

  if (exactMarketPhrases.some((phrase) => keyword === normalizeForSearch(phrase))) {
    return true;
  }

  if (statusChains.some((chain) => keyword === normalizeForSearch(chain))) {
    return true;
  }

  const hasStatusChain = statusChains.some((chain) =>
    keyword.includes(normalizeForSearch(chain))
  );

  const hasTheme = themes.some((theme) =>
    keyword.includes(normalizeForSearch(theme))
  );

  const hasAction = actions.some((action) =>
    keyword.includes(normalizeForSearch(action))
  );

  if (hasStatusChain) return true;
  if (hasTheme && hasAction) return true;

  return false;
}

function detectCategory(keyword: string) {
  const text = normalizeForSearch(keyword);

  if (trendEntityPhrases.some((phrase) => text.includes(normalizeForSearch(phrase)))) {
    return "Trend / Fandom";
  }

  if (text.includes("secret room") || text.includes("build a secret")) {
    return "Secret Build Trend";
  }

  if (text.includes(" vs ")) {
    return "Contrast Cluster";
  }

  if (
    text.includes("makeover") ||
    text.includes("transformation") ||
    text.includes("glow up")
  ) {
    return "Transformation Cluster";
  }

  if (
    text.includes("contest") ||
    text.includes("challenge") ||
    text.includes("battle")
  ) {
    return "Challenge Cluster";
  }

  if (
    text.includes("arabic") ||
    text.includes("spanish") ||
    text.includes("hindi") ||
    text.includes("korean")
  ) {
    return "Locale Cluster";
  }

  return "Phrase Cluster";
}

function addCandidate(
  list: CandidateKeyword[],
  keyword: string | null | undefined,
  category: string,
  source: string,
  qualityWeight = 1
) {
  if (!keyword) return;

  const normalized = normalizeForSearch(keyword);

  if (!isMarketPhrase(normalized)) return;

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

function extractExactMarketPhrases(text: string) {
  const normalized = normalizeForSearch(text);

  return exactMarketPhrases.filter((phrase) =>
    normalized.includes(normalizeForSearch(phrase))
  );
}

function extractTrendEntities(text: string) {
  const normalized = normalizeForSearch(text);

  return trendEntityPhrases.filter((phrase) =>
    normalized.includes(normalizeForSearch(phrase))
  );
}

function extractStatusChains(text: string) {
  const normalized = normalizeForSearch(text);

  const matches = normalized.match(
    /(?:poor|rich|giga rich|gold|trash|diamond|broken|good|bad|angel|demon)(?:\s+vs\s+(?:poor|rich|giga rich|gold|trash|diamond|broken|good|bad|angel|demon)){1,3}/g
  );

  return matches || [];
}

function extractSecretBuildPhrases(text: string) {
  const normalized = normalizeForSearch(text);

  const matches = normalized.match(
    /(?:we\s+)?(?:build|built|make|made|create|created|hide|hid)\s+(?:a\s+)?secret\s+(?:room|house|base|door|school|party|world|pool|tunnel|castle)/g
  );

  return matches || [];
}

function extractExactNgrams(text: string) {
  const normalized = normalizeForSearch(text);

  const tokens =
    normalized
      .match(/[a-z0-9]+/g)
      ?.filter((token) => token.length > 1) || [];

  const phrases: string[] = [];

  for (let size = 2; size <= 6; size += 1) {
    for (let index = 0; index <= tokens.length - size; index += 1) {
      const phrase = tokens.slice(index, index + size).join(" ");

      if (isMarketPhrase(phrase)) {
        phrases.push(phrase);
      }
    }
  }

  return phrases;
}

function extractCombinedMarketPhrases(text: string) {
  const normalized = normalizeForSearch(text);

  const foundStatusChains = statusChains.filter((chain) =>
    normalized.includes(normalizeForSearch(chain))
  );

  const foundThemes = themes.filter((theme) =>
    normalized.includes(normalizeForSearch(theme))
  );

  const foundActions = actions.filter((action) =>
    normalized.includes(normalizeForSearch(action))
  );

  const phrases: string[] = [];

  foundStatusChains.forEach((chain) => {
    phrases.push(chain);

    foundThemes.forEach((theme) => {
      phrases.push(`${chain} ${theme}`);
    });
  });

  foundThemes.forEach((theme) => {
    foundActions.forEach((action) => {
      phrases.push(`${theme} ${action}`);
    });
  });

  return phrases;
}

function extractTagPhrases(tags: string[] | null) {
  if (!Array.isArray(tags)) return [];

  return tags
    .map((tag) => normalizeForSearch(tag))
    .filter((tag) => isMarketPhrase(tag));
}

function uniqueItems(items: string[]) {
  return Array.from(new Set(items.map(normalizeForSearch))).filter(Boolean);
}

function extractCandidates(video: CompetitorVideo) {
  const candidates: CandidateKeyword[] = [];

  const title = getPrimaryTitle(video.title || "");
  const description = video.description || "";
  const tags = Array.isArray(video.tags) ? video.tags : [];

  const highSignalText = [
    title,
    tags.join(" "),
  ].join(" ");

  const fullText = [
    title,
    description.slice(0, 1500),
    tags.join(" "),
  ].join(" ");

  uniqueItems(extractExactMarketPhrases(fullText)).forEach((phrase) => {
    addCandidate(
      candidates,
      phrase,
      detectCategory(phrase),
      "exact_market_phrase_title_description_tags",
      2
    );
  });

  uniqueItems(extractTrendEntities(fullText)).forEach((phrase) => {
    addCandidate(
      candidates,
      phrase,
      "Trend / Fandom",
      "trend_entity_title_description_tags",
      2.1
    );
  });

  uniqueItems(extractStatusChains(fullText)).forEach((phrase) => {
    addCandidate(
      candidates,
      phrase,
      "Contrast Cluster",
      "status_chain_title_description_tags",
      1.9
    );
  });

  uniqueItems(extractSecretBuildPhrases(fullText)).forEach((phrase) => {
    addCandidate(
      candidates,
      phrase,
      "Secret Build Trend",
      "secret_build_phrase_title_description_tags",
      1.9
    );
  });

  uniqueItems(extractCombinedMarketPhrases(highSignalText)).forEach((phrase) => {
    addCandidate(
      candidates,
      phrase,
      detectCategory(phrase),
      "combined_phrase_from_same_video",
      1.65
    );
  });

  uniqueItems(extractExactNgrams(highSignalText)).forEach((phrase) => {
    addCandidate(
      candidates,
      phrase,
      detectCategory(phrase),
      "exact_ngram_title_tags",
      1.45
    );
  });

  uniqueItems(extractTagPhrases(tags)).forEach((phrase) => {
    addCandidate(
      candidates,
      phrase,
      detectCategory(phrase),
      "youtube_tag_exact_phrase",
      1.3
    );
  });

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
    Math.round(averageQuality * 48)
  );

  const trendScore = Math.min(
    100,
    Math.round(
      trafficScore * 0.25 +
        velocityScore * 0.3 +
        usageScore * 0.12 +
        spreadScore * 0.1 +
        recencyScore * 0.08 +
        qualityScore * 0.15
    )
  );

  const saturationPenalty = Math.min(28, videoCount * 0.3);

  const opportunityScore = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        trendScore * 0.55 +
          velocityScore * 0.22 +
          qualityScore * 0.3 -
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
          aggregate.videoIds.size >= 1 &&
          (aggregate.totalViews >= 30000 ||
            aggregate.totalViewsPerDay >= 3000 ||
            aggregate.channelIds.size >= 2)
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
        source: "exact_phrase_market_keywords_v5",
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
      message: `Exact Phrase Radar refreshed ${keywordRows.length} market keyword phrases from title, description and tags of ${safeVideos.length} competitor videos.`,
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