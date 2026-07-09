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
  maxVideoViewsPerDay: number;
  totalViewsPerDay: number;
  latestPublishedAt: string | null;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  qualityWeightSum: number;
  matches: KeywordMatch[];
};

type KeywordHistoryRow = {
  keyword_slug: string;
  keyword: string;
  total_views: number | null;
  total_views_per_day: number | null;
  video_count: number | null;
  channel_count: number | null;
  trend_score: number | null;
  opportunity_score: number | null;
  captured_at: string;
};

type ScoreBenchmarks = {
  maxTotalViews: number;
  maxViewsPerDay: number;
  maxSingleVideoViewsPerDay: number;
  maxVideoCount: number;
  maxChannelCount: number;
  maxGrowthPerDay: number;
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

const strongSignalWords = [
  "vs",
  "rich",
  "poor",
  "giga",
  "gold",
  "trash",
  "diamond",
  "broken",
  "makeover",
  "transformation",
  "glow",
  "challenge",
  "contest",
  "battle",
  "secret",
  "room",
  "build",
  "built",
  "kpop",
  "demon",
  "hunters",
  "huntrix",
  "princess",
  "mermaid",
  "vampire",
  "baby",
  "doll",
  "school",
  "party",
  "fashion",
  "beauty",
  "arabic",
  "spanish",
];

const phraseProtectionPatterns = [
  /(?:poor|rich|giga rich|gold|trash|diamond|broken|good|bad|angel|demon)(?:\s+vs\s+(?:poor|rich|giga rich|gold|trash|diamond|broken|good|bad|angel|demon)){1,3}/g,
  /(?:kpop|k pop|k-pop)\s+demon\s+hunters/g,
  /demon\s+hunters/g,
  /huntrix(?:\s+[a-z0-9]+){0,3}/g,
  /(?:we\s+)?(?:build|built|make|made|create|created)\s+(?:a\s+)?secret\s+(?:room|house|base|door|school|party|world|pool|tunnel|castle)/g,
  /secret\s+(?:room|house|base|door|school|party|world|pool|tunnel|castle)(?:\s+challenge)?/g,
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

function hasStrongSignal(value: string) {
  const text = normalizeForSearch(value);

  return strongSignalWords.some((word) => text.includes(word));
}

function isWeakStandalone(value: string) {
  const keyword = normalizeForSearch(value);
  const words = keyword.split(" ").filter(Boolean);

  if (bannedStandaloneKeywords.has(keyword)) return true;

  if (words.length === 1) {
    return !["huntrix"].includes(keyword);
  }

  const meaningfulWords = words.filter(
    (word) => !stopWords.has(word) && !weakWords.has(word)
  );

  return meaningfulWords.length === 0;
}

function hasBadPhraseShape(value: string) {
  const keyword = normalizeForSearch(value);

  if (!keyword) return true;
  if (hasBrandNoise(keyword)) return true;
  if (keyword.includes("visual story")) return true;
  if (keyword.includes("story tim")) return true;
  if (keyword.includes("story multi")) return true;
  if (keyword.includes("story troom")) return true;
  if (keyword.includes("party secret")) return true;
  if (keyword.includes("mo colarse")) return true;
  if (keyword.includes("colarse")) return true;
  if (keyword.includes("convierte")) return true;

  return false;
}

function isMarketPhrase(value: string) {
  const keyword = normalizeForSearch(value);
  const words = keyword.split(" ").filter(Boolean);

  if (hasBadPhraseShape(keyword)) return false;
  if (isWeakStandalone(keyword)) return false;
  if (words.length > 8) return false;

  if (keyword === "huntrix") return true;
  if (keyword.includes("kpop demon hunters")) return true;
  if (keyword.includes("demon hunters")) return true;

  if (keyword.includes("secret")) {
    const validSecret =
      keyword.includes("secret room") ||
      keyword.includes("secret house") ||
      keyword.includes("secret base") ||
      keyword.includes("secret door") ||
      keyword.includes("secret school") ||
      keyword.includes("secret party") ||
      keyword.includes("build a secret") ||
      keyword.includes("built a secret");

    if (!validSecret) return false;
  }

  if (keyword.includes("demon")) {
    const validDemon =
      keyword.includes("kpop demon hunters") ||
      keyword.includes("demon hunters") ||
      keyword.includes("angel vs demon");

    if (!validDemon) return false;
  }

  if (keyword.includes(" vs ")) return true;

  const hasTheme =
    keyword.includes("baby doll") ||
    keyword.includes("princess") ||
    keyword.includes("mermaid") ||
    keyword.includes("vampire") ||
    keyword.includes("huntrix") ||
    keyword.includes("kpop") ||
    keyword.includes("demon hunters") ||
    keyword.includes("school");

  const hasAction =
    keyword.includes("makeover") ||
    keyword.includes("transformation") ||
    keyword.includes("glow up") ||
    keyword.includes("challenge") ||
    keyword.includes("contest") ||
    keyword.includes("fashion show") ||
    keyword.includes("beauty contest") ||
    keyword.includes("secret room") ||
    keyword.includes("secret party") ||
    keyword.includes("dance contest");

  const hasLocale =
    keyword.includes("arabic") ||
    keyword.includes("spanish") ||
    keyword.includes("hindi") ||
    keyword.includes("korean");

  if (hasTheme && hasAction) return true;
  if (hasLocale && hasTheme) return true;

  if (words.length >= 3 && hasStrongSignal(keyword)) return true;

  return false;
}

function detectCategory(keyword: string) {
  const text = normalizeForSearch(keyword);

  if (
    text.includes("kpop") ||
    text.includes("demon hunters") ||
    text.includes("huntrix")
  ) {
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

  return "Discovered Phrase";
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

function extractProtectedPatternPhrases(text: string) {
  const normalized = normalizeForSearch(text);
  const phrases: string[] = [];

  phraseProtectionPatterns.forEach((pattern) => {
    const matches = normalized.match(pattern);

    if (matches) {
      phrases.push(...matches);
    }
  });

  return phrases;
}

function extractExactNgrams(text: string) {
  const normalized = normalizeForSearch(text);

  const tokens =
    normalized
      .match(/[a-z0-9]+/g)
      ?.filter((token) => token.length > 1) || [];

  const phrases: string[] = [];

  for (let size = 2; size <= 7; size += 1) {
    for (let index = 0; index <= tokens.length - size; index += 1) {
      const phrase = tokens.slice(index, index + size).join(" ");

      if (isMarketPhrase(phrase)) {
        phrases.push(phrase);
      }
    }
  }

  return phrases;
}

function extractTagPhrases(tags: string[] | null) {
  if (!Array.isArray(tags)) return [];

  return tags
    .map((tag) => normalizeForSearch(tag))
    .filter((tag) => isMarketPhrase(tag));
}

function extractTitleSegments(title: string) {
  return title
    .split(/[|:!?()[\]{}]+/g)
    .map((part) => normalizeForSearch(part))
    .filter((part) => isMarketPhrase(part));
}

function uniqueItems(items: string[]) {
  return Array.from(new Set(items.map(normalizeForSearch))).filter(Boolean);
}

function extractCandidates(video: CompetitorVideo) {
  const candidates: CandidateKeyword[] = [];

  const title = getPrimaryTitle(video.title || "");
  const description = video.description || "";
  const tags = Array.isArray(video.tags) ? video.tags : [];

  const titleAndTags = [title, tags.join(" ")].join(" ");

  const fullText = [
    title,
    description.slice(0, 1800),
    tags.join(" "),
  ].join(" ");

  uniqueItems(extractProtectedPatternPhrases(fullText)).forEach((phrase) => {
    addCandidate(
      candidates,
      phrase,
      detectCategory(phrase),
      "protected_exact_pattern",
      2.2
    );
  });

  uniqueItems(extractTitleSegments(title)).forEach((phrase) => {
    addCandidate(
      candidates,
      phrase,
      detectCategory(phrase),
      "exact_title_segment",
      1.9
    );
  });

  uniqueItems(extractExactNgrams(titleAndTags)).forEach((phrase) => {
    addCandidate(
      candidates,
      phrase,
      detectCategory(phrase),
      "exact_ngram_title_tags",
      1.65
    );
  });

  uniqueItems(extractTagPhrases(tags)).forEach((phrase) => {
    addCandidate(
      candidates,
      phrase,
      detectCategory(phrase),
      "youtube_tag_exact_phrase",
      1.45
    );
  });

  uniqueItems(extractExactNgrams(description.slice(0, 800))).forEach(
    (phrase) => {
      addCandidate(
        candidates,
        phrase,
        detectCategory(phrase),
        "description_phrase",
        0.9
      );
    }
  );

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

function getLatestHistoryMap(historyRows: KeywordHistoryRow[]) {
  const map = new Map<string, KeywordHistoryRow>();

  historyRows.forEach((row) => {
    const existing = map.get(row.keyword_slug);

    if (!existing) {
      map.set(row.keyword_slug, row);
      return;
    }

    const existingTime = new Date(existing.captured_at).getTime();
    const rowTime = new Date(row.captured_at).getTime();

    if (rowTime > existingTime) {
      map.set(row.keyword_slug, row);
    }
  });

  return map;
}

function getGrowthMetrics(
  aggregate: KeywordAggregate,
  previous: KeywordHistoryRow | undefined,
  benchmarks: ScoreBenchmarks
) {
  if (!previous) {
    const breakoutProxy = normalizedLog(
      aggregate.maxVideoViewsPerDay,
      benchmarks.maxSingleVideoViewsPerDay
    );

    return {
      previousTotalViews: 0,
      viewsGrowth: 0,
      growthRate: 0,
      growthScore: breakoutProxy,
    };
  }

  const previousViews = Number(previous.total_views || 0);
  const viewsGrowth = Math.max(0, aggregate.totalViews - previousViews);

  const previousTime = new Date(previous.captured_at).getTime();
  const ageDays = Math.max(
    1,
    (Date.now() - previousTime) / (1000 * 60 * 60 * 24)
  );

  const growthPerDay = viewsGrowth / ageDays;

  const growthRate =
    previousViews > 0 ? viewsGrowth / previousViews : viewsGrowth > 0 ? 1 : 0;

  const growthVolumeScore = normalizedLog(
    growthPerDay,
    benchmarks.maxGrowthPerDay
  );

  const growthRateScore = Math.min(
    100,
    Math.round(Math.log10(growthRate * 100 + 1) * 35)
  );

  const growthScore = Math.min(
    100,
    Math.round(growthVolumeScore * 0.7 + growthRateScore * 0.3)
  );

  return {
    previousTotalViews: previousViews,
    viewsGrowth: Math.round(viewsGrowth),
    growthRate,
    growthScore,
  };
}

function calculateScores({
  aggregate,
  benchmarks,
  previous,
}: {
  aggregate: KeywordAggregate;
  benchmarks: ScoreBenchmarks;
  previous?: KeywordHistoryRow;
}) {
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

  const breakoutScore = Math.min(
    100,
    Math.round(
      normalizedLog(
        aggregate.maxVideoViewsPerDay,
        benchmarks.maxSingleVideoViewsPerDay
      ) * 0.75 +
        Math.max(0, 100 - Math.min(100, latestAgeDays * 2)) * 0.25
    )
  );

  const usageScore = normalizedLog(videoCount, benchmarks.maxVideoCount);

  const spreadScore = normalizedLog(channelCount, benchmarks.maxChannelCount);

  const adoptionScore = Math.min(
    100,
    Math.round(usageScore * 0.45 + spreadScore * 0.55)
  );

  const averageQuality =
    videoCount > 0 ? aggregate.qualityWeightSum / videoCount : 1;

  const phraseQualityScore = Math.min(
    100,
    Math.round(averageQuality * 45)
  );

  const growthMetrics = getGrowthMetrics(
    aggregate,
    previous,
    benchmarks
  );

  const trendScore = Math.min(
    100,
    Math.round(
      trafficScore * 0.12 +
        velocityScore * 0.22 +
        breakoutScore * 0.22 +
        adoptionScore * 0.14 +
        growthMetrics.growthScore * 0.18 +
        phraseQualityScore * 0.12
    )
  );

  const saturationPenalty = Math.min(25, videoCount * 0.22);

  const opportunityScore = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        trendScore * 0.5 +
          breakoutScore * 0.22 +
          growthMetrics.growthScore * 0.18 +
          phraseQualityScore * 0.18 -
          saturationPenalty
      )
    )
  );

  return {
    trafficScore,
    velocityScore,
    breakoutScore,
    adoptionScore,
    phraseQualityScore,
    growthScore: growthMetrics.growthScore,
    previousTotalViews: growthMetrics.previousTotalViews,
    viewsGrowth: growthMetrics.viewsGrowth,
    growthRate: growthMetrics.growthRate,
    trendScore,
    opportunityScore,
  };
}

function getMarketStage({
  videoCount,
  channelCount,
  breakoutScore,
  growthScore,
  adoptionScore,
  trendScore,
}: {
  videoCount: number;
  channelCount: number;
  breakoutScore: number;
  growthScore: number;
  adoptionScore: number;
  trendScore: number;
}) {
  if (breakoutScore >= 80 && videoCount <= 3) {
    return "Single-Channel Breakout";
  }

  if (growthScore >= 75) {
    return "Accelerating";
  }

  if (channelCount >= 4 && adoptionScore >= 55) {
    return "Cross-Channel Adoption";
  }

  if (trendScore >= 70) {
    return "Rising";
  }

  return "Watch";
}

function getDiscoveryReason({
  marketStage,
  videoCount,
  channelCount,
  totalViews,
  viewsPerDay,
  viewsGrowth,
}: {
  marketStage: string;
  videoCount: number;
  channelCount: number;
  totalViews: number;
  viewsPerDay: number;
  viewsGrowth: number;
}) {
  if (marketStage === "Single-Channel Breakout") {
    return `High velocity from 1 breakout source: ${Math.round(
      viewsPerDay
    ).toLocaleString("en-US")} views/day.`;
  }

  if (marketStage === "Accelerating") {
    return `Traffic growth detected since last refresh: +${viewsGrowth.toLocaleString(
      "en-US"
    )} views.`;
  }

  if (marketStage === "Cross-Channel Adoption") {
    return `Market adoption detected across ${channelCount} channels and ${videoCount} videos.`;
  }

  if (marketStage === "Rising") {
    return `Rising phrase with ${totalViews.toLocaleString(
      "en-US"
    )} internal competitor views.`;
  }

  return `Watchlist phrase from competitor title, description or tags.`;
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
    const [videosResult, historyResult] = await Promise.all([
      supabase
        .from("competitor_videos")
        .select("*")
        .order("view_count", { ascending: false })
        .limit(10000),

      supabase
        .from("competitor_keyword_history")
        .select("*")
        .gte(
          "captured_at",
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        )
        .order("captured_at", { ascending: false })
        .limit(10000),
    ]);

    if (videosResult.error) {
      throw videosResult.error;
    }

    if (historyResult.error) {
      throw historyResult.error;
    }

    const safeVideos = (videosResult.data || []) as CompetitorVideo[];

    const historyRows =
      (historyResult.data || []) as KeywordHistoryRow[];

    const latestHistoryMap = getLatestHistoryMap(historyRows);

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
            maxVideoViewsPerDay: 0,
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
        aggregate.maxVideoViewsPerDay = Math.max(
          aggregate.maxVideoViewsPerDay,
          viewsPerDay
        );
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
            aggregate.maxVideoViewsPerDay >= 8000 ||
            aggregate.channelIds.size >= 2)
        );
      }
    );

    const growthValues = rawAggregates.map((aggregate) => {
      const previous = latestHistoryMap.get(aggregate.keywordSlug);

      if (!previous) return aggregate.maxVideoViewsPerDay;

      const previousViews = Number(previous.total_views || 0);
      const previousTime = new Date(previous.captured_at).getTime();

      const ageDays = Math.max(
        1,
        (Date.now() - previousTime) / (1000 * 60 * 60 * 24)
      );

      return Math.max(0, aggregate.totalViews - previousViews) / ageDays;
    });

    const benchmarks: ScoreBenchmarks = {
      maxTotalViews: Math.max(
        1,
        ...rawAggregates.map((item) => item.totalViews)
      ),
      maxViewsPerDay: Math.max(
        1,
        ...rawAggregates.map((item) => item.totalViewsPerDay)
      ),
      maxSingleVideoViewsPerDay: Math.max(
        1,
        ...rawAggregates.map((item) => item.maxVideoViewsPerDay)
      ),
      maxVideoCount: Math.max(
        1,
        ...rawAggregates.map((item) => item.videoIds.size)
      ),
      maxChannelCount: Math.max(
        1,
        ...rawAggregates.map((item) => item.channelIds.size)
      ),
      maxGrowthPerDay: Math.max(1, ...growthValues),
    };

    const keywordAggregates = rawAggregates
      .sort((a, b) => {
        const scoreA = calculateScores({
          aggregate: a,
          benchmarks,
          previous: latestHistoryMap.get(a.keywordSlug),
        });

        const scoreB = calculateScores({
          aggregate: b,
          benchmarks,
          previous: latestHistoryMap.get(b.keywordSlug),
        });

        const finalA =
          scoreA.trendScore * 0.55 +
          scoreA.opportunityScore * 0.25 +
          scoreA.breakoutScore * 0.2;

        const finalB =
          scoreB.trendScore * 0.55 +
          scoreB.opportunityScore * 0.25 +
          scoreB.breakoutScore * 0.2;

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
      const previous = latestHistoryMap.get(aggregate.keywordSlug);

      const scores = calculateScores({
        aggregate,
        benchmarks,
        previous,
      });

      const videoCount = aggregate.videoIds.size;
      const channelCount = aggregate.channelIds.size;
      const avgViews =
        videoCount > 0 ? aggregate.totalViews / videoCount : 0;

      const marketStage = getMarketStage({
        videoCount,
        channelCount,
        breakoutScore: scores.breakoutScore,
        growthScore: scores.growthScore,
        adoptionScore: scores.adoptionScore,
        trendScore: scores.trendScore,
      });

      return {
        keyword: aggregate.keyword,
        keyword_slug: aggregate.keywordSlug,
        category: aggregate.category,

        video_count: videoCount,
        channel_count: channelCount,
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

        growth_score: scores.growthScore,
        breakout_score: scores.breakoutScore,
        adoption_score: scores.adoptionScore,
        phrase_quality_score: scores.phraseQualityScore,

        previous_total_views: scores.previousTotalViews,
        views_growth: scores.viewsGrowth,
        growth_rate: Number(scores.growthRate.toFixed(4)),

        discovery_reason: getDiscoveryReason({
          marketStage,
          videoCount,
          channelCount,
          totalViews: aggregate.totalViews,
          viewsPerDay: aggregate.totalViewsPerDay,
          viewsGrowth: scores.viewsGrowth,
        }),

        market_stage: marketStage,
        keyword_rank: index + 1,
        source: "dynamic_market_discovery_engine_v6",
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

    const historyRowsToInsert = keywordRows.map((keyword) => ({
      keyword_slug: keyword.keyword_slug,
      keyword: keyword.keyword,
      category: keyword.category,

      video_count: keyword.video_count,
      channel_count: keyword.channel_count,
      group_count: keyword.group_count,

      total_views: keyword.total_views,
      total_views_per_day: keyword.total_views_per_day,

      trend_score: keyword.trend_score,
      opportunity_score: keyword.opportunity_score,
      growth_score: keyword.growth_score,
      breakout_score: keyword.breakout_score,
      adoption_score: keyword.adoption_score,

      captured_at: new Date().toISOString(),
    }));

    for (const chunk of chunkArray(historyRowsToInsert, 500)) {
      const { error } = await supabase
        .from("competitor_keyword_history")
        .insert(chunk);

      if (error) {
        throw error;
      }
    }

    await supabase
      .from("competitor_keyword_history")
      .delete()
      .lt(
        "captured_at",
        new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString()
      );

    return NextResponse.json({
      ok: true,
      keywordCount: keywordRows.length,
      matchCount: matchRows.length,
      videoCount: safeVideos.length,
      message: `Dynamic Keyword Discovery refreshed ${keywordRows.length} market phrases from ${safeVideos.length} competitor videos. Growth will become stronger after daily refresh history is collected.`,
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