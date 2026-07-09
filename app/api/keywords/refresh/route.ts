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

const hardBadWords = [
  "http",
  "https",
  "www",
  "com",
  "youtube",
  "youtubecom",
  "youtu",
  "playlist",
  "subscribe",
  "channel",
  "movie",
  "movies",
  "recap",
  "story",
  "stories",
  "english english",
  "full movies",
  "diy",
  "comedy",
  "hermano",
  "hermana",
  "chico",
  "chica",
  "sibling",
  "brother",
  "sister",
  "enemy",
  "enemigo",
];

const bannedStandaloneKeywords = new Set([
  "baby doll",
  "doll",
  "school",
  "food",
  "vampire",
  "princess",
  "mermaid",
  "demon",
  "angel",
  "secret",
  "rich",
  "poor",
  "giga rich",
  "challenge",
  "makeover",
  "transformation",
  "movie",
  "recap",
]);

const trendEntities = [
  "kpop demon hunters",
  "demon hunters",
  "huntrix",
];

const themes = [
  "baby doll",
  "princess",
  "mermaid",
  "vampire",
  "kpop demon hunters",
  "demon hunters",
  "huntrix",
  "angel",
  "demon",
  "queen",
  "fairy",
  "witch",
  "zombie",
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
  "secret room",
  "secret room challenge",
  "secret party",
  "party",
  "wedding",
  "battle",
  "24 hours",
  "food challenge 24 hours",
];

const localeWords = [
  "arabic",
  "spanish",
  "hindi",
  "korean",
  "english",
  "portuguese",
  "french",
];

const fromToStartWords = [
  "nerd",
  "poor",
  "broke",
  "ugly",
  "unpopular",
  "normal",
  "bad",
  "homeless",
];

const fromToEndWords = [
  "popular",
  "rich",
  "princess",
  "beautiful",
  "queen",
  "famous",
  "good",
  "millionaire",
];

function stripUrls(value: string) {
  return value
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/www\.\S+/gi, " ")
    .replace(/\b\S+\.(com|net|org|co|io|app|tv|me|vn)\S*/gi, " ")
    .replace(/\b(?:youtu\.be|youtube\.com|m\.youtube\.com)\/\S*/gi, " ");
}

function canonicalizeForeignText(value: string) {
  let text = value.toLowerCase();

  text = text
    .replace(/\bk-pop\b/g, " kpop ")
    .replace(/\bk pop\b/g, " kpop ")

    .replace(/cazadores\s+de\s+demonios/g, " demon hunters ")
    .replace(/cazadoras\s+de\s+demonios/g, " demon hunters ")
    .replace(/demonios\s+kpop/g, " kpop demon hunters ")
    .replace(/kpop\s+demonios/g, " kpop demon hunters ")

    .replace(/fiesta\s+secreta\s+de\s+vampiros/g, " vampire secret party ")
    .replace(/fiesta\s+secreta\s+de\s+vampiras/g, " vampire secret party ")
    .replace(/fiesta\s+de\s+vampiros/g, " vampire party ")
    .replace(/fiesta\s+de\s+vampiras/g, " vampire party ")
    .replace(/colarse\s+en\s+la\s+fiesta\s+secreta\s+de\s+vampiros/g, " vampire secret party ")
    .replace(/colarse\s+en\s+la\s+fiesta\s+secreta\s+de\s+vampiras/g, " vampire secret party ")

    .replace(/se\s+convierte\s+en\s+vampira/g, " vampire transformation ")
    .replace(/se\s+convierte\s+en\s+vampiro/g, " vampire transformation ")
    .replace(/convertirse\s+en\s+vampira/g, " vampire transformation ")
    .replace(/convertirse\s+en\s+vampiro/g, " vampire transformation ")

    .replace(/construimos\s+una\s+habitaci[oó]n\s+secreta/g, " we build a secret room ")
    .replace(/construimos\s+un\s+cuarto\s+secreto/g, " we build a secret room ")
    .replace(/construy[oó]\s+una\s+habitaci[oó]n\s+secreta/g, " built a secret room ")
    .replace(/habitaci[oó]n\s+secreta/g, " secret room ")
    .replace(/cuarto\s+secreto/g, " secret room ")
    .replace(/casa\s+secreta/g, " secret house ")
    .replace(/puerta\s+secreta/g, " secret door ")

    .replace(/concurso\s+de\s+baile/g, " dance contest ")
    .replace(/concurso\s+de\s+belleza/g, " beauty contest ")
    .replace(/desfile\s+de\s+moda/g, " fashion show ")

    .replace(/de\s+nerd\s+a\s+popular/g, " from nerd to popular ")
    .replace(/de\s+pobre\s+a\s+rica/g, " from poor to rich ")
    .replace(/de\s+pobre\s+a\s+rico/g, " from poor to rich ")
    .replace(/de\s+fea\s+a\s+popular/g, " from ugly to popular ")
    .replace(/de\s+feo\s+a\s+popular/g, " from ugly to popular ")

    .replace(/\brico\b|\brica\b|\bricos\b|\bricas\b/g, " rich ")
    .replace(/\bpobre\b|\bpobres\b/g, " poor ")
    .replace(/\bbroke\b/g, " poor ")
    .replace(/\bvampira\b|\bvampiro\b|\bvampiros\b|\bvampiras\b/g, " vampire ")
    .replace(/\bsirena\b|\bsirenas\b/g, " mermaid ")
    .replace(/\bprincesa\b|\bprincesas\b/g, " princess ")
    .replace(/\breina\b|\breinas\b/g, " queen ")
    .replace(/\bescuela\b/g, " school ")
    .replace(/\bbaile\b/g, " dance ")
    .replace(/\bconcurso\b/g, " contest ")
    .replace(/\bfiesta\b/g, " party ")
    .replace(/\bsecreto\b|\bsecreta\b/g, " secret ")
    .replace(/\bcuarto\b|\bhabitaci[oó]n\b/g, " room ")
    .replace(/\bmagia\b|\bmágica\b|\bmágico\b/g, " magic ")
    .replace(/\bdorado\b|\bdorada\b/g, " gold ")
    .replace(/\bdiamante\b/g, " diamond ")
    .replace(/\broto\b|\brota\b/g, " broken ")

    .replace(/\bhermano\b|\bhermana\b|\bhermanos\b|\bhermanas\b/g, " sibling ")
    .replace(/\benemiga\b|\benemigo\b|\benemigos\b|\benemigas\b/g, " enemy ")
    .replace(/\bchico\b|\bchica\b|\bchicos\b|\bchicas\b/g, " kid ");

  return text;
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

function normalize(value: string) {
  return cleanText(removeBrandNoise(canonicalizeForeignText(stripUrls(value))))
    .split(" ")
    .filter(Boolean)
    .join(" ");
}

function slugifyKeyword(value: string) {
  return normalize(value)
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCaseKeyword(value: string) {
  return normalize(value)
    .split(" ")
    .map((word) => {
      if (word === "vs") return "vs";
      if (word === "to") return "to";
      if (word === "from") return "From";
      if (word === "kpop") return "Kpop";
      if (word.length <= 2) return word.toUpperCase();

      return `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
    })
    .join(" ");
}

function getPrimaryTitle(title: string) {
  return title.split("|")[0] || title;
}

function includesAny(text: string, items: string[]) {
  return items.some((item) => text.includes(item));
}

function hasHardNoise(phrase: string) {
  const text = normalize(phrase);

  if (!text) return true;

  if (includesAny(text, hardBadWords)) return true;

  if (text.includes("school")) {
    const allowedSchool =
      text.includes("school makeover") ||
      text.includes("secret school") ||
      text.includes("school challenge 24 hours");

    if (!allowedSchool) return true;
  }

  if (text.includes("secret")) {
    const allowedSecret =
      text.includes("secret room") ||
      text.includes("secret house") ||
      text.includes("secret base") ||
      text.includes("secret door") ||
      text.includes("secret school") ||
      text.includes("secret party") ||
      text.includes("build a secret") ||
      text.includes("built a secret");

    if (!allowedSecret) return true;
  }

  if (text.includes("demon")) {
    const allowedDemon =
      text.includes("kpop demon hunters") ||
      text.includes("demon hunters") ||
      text.includes("angel vs demon");

    if (!allowedDemon) return true;
  }

  return false;
}

function hasTheme(text: string) {
  const normalized = normalize(text);

  return themes.some((theme) => normalized.includes(theme));
}

function hasAction(text: string) {
  const normalized = normalize(text);

  return actions.some((action) => normalized.includes(action));
}

function findThemes(text: string) {
  const normalized = normalize(text);

  return themes
    .filter((theme) => normalized.includes(theme))
    .sort((a, b) => b.length - a.length);
}

function findActions(text: string) {
  const normalized = normalize(text);

  return actions
    .filter((action) => normalized.includes(action))
    .sort((a, b) => b.length - a.length);
}

function findLocales(text: string) {
  const normalized = normalize(text);

  return localeWords.filter((locale) => normalized.includes(locale));
}

function detectStatusPhrases(text: string) {
  const normalized = normalize(text);
  const phrases: string[] = [];

  if (
    normalized.includes("poor") &&
    normalized.includes("rich") &&
    normalized.includes("giga rich")
  ) {
    phrases.push("poor vs rich vs giga rich");
  }

  if (normalized.includes("poor vs rich")) {
    phrases.push("poor vs rich");
  }

  if (normalized.includes("rich vs poor")) {
    phrases.push("rich vs poor");
  }

  if (
    normalized.includes("poor") &&
    normalized.includes("rich") &&
    !phrases.includes("poor vs rich") &&
    !phrases.includes("rich vs poor")
  ) {
    phrases.push("rich vs poor");
  }

  if (normalized.includes("angel vs demon")) {
    phrases.push("angel vs demon");
  }

  if (normalized.includes("good vs bad")) {
    phrases.push("good vs bad");
  }

  if (normalized.includes("gold vs trash")) {
    phrases.push("gold vs trash");
  }

  if (normalized.includes("diamond vs broken")) {
    phrases.push("diamond vs broken");
  }

  if (normalized.includes("rich vs broke")) {
    phrases.push("rich vs poor");
  }

  return Array.from(new Set(phrases));
}

function detectFromToPhrases(text: string) {
  const normalized = normalize(text);
  const phrases: string[] = [];

  const regex = /from\s+([a-z0-9]+)\s+to\s+([a-z0-9]+)/g;
  const matches = normalized.matchAll(regex);

  for (const match of matches) {
    const start = match[1];
    const end = match[2];

    if (fromToStartWords.includes(start) && fromToEndWords.includes(end)) {
      phrases.push(`from ${start} to ${end}`);
    }
  }

  return Array.from(new Set(phrases));
}

function detectSecretBuildPhrases(text: string) {
  const normalized = normalize(text);
  const phrases: string[] = [];

  const patterns = [
    /(?:we\s+)?build\s+a\s+secret\s+(room|house|base|door|school|party)/g,
    /(?:we\s+)?built\s+a\s+secret\s+(room|house|base|door|school|party)/g,
    /secret\s+(room|house|base|door|school|party)\s+challenge/g,
    /secret\s+(room|house|base|door|school|party)/g,
  ];

  patterns.forEach((pattern) => {
    const matches = normalized.matchAll(pattern);

    for (const match of matches) {
      phrases.push(match[0]);
    }
  });

  return Array.from(new Set(phrases));
}

function detectTrendEntities(text: string) {
  const normalized = normalize(text);

  return trendEntities.filter((entity) => normalized.includes(entity));
}

function isValidMarketPhrase(phrase: string) {
  const normalized = normalize(phrase);
  const words = normalized.split(" ").filter(Boolean);

  if (!normalized) return false;
  if (hasHardNoise(normalized)) return false;
  if (bannedStandaloneKeywords.has(normalized)) return false;
  if (words.length < 2 && normalized !== "huntrix") return false;
  if (words.length > 8) return false;

  if (normalized === "huntrix") return true;
  if (normalized.includes("kpop demon hunters")) return true;
  if (normalized.includes("demon hunters")) return true;
  if (normalized.includes(" vs ")) return true;
  if (normalized.startsWith("from ") && normalized.includes(" to ")) return true;
  if (normalized.includes("secret room")) return true;
  if (normalized.includes("build a secret")) return true;
  if (normalized.includes("built a secret")) return true;

  const hasLocale = localeWords.some((locale) =>
    normalized.includes(locale)
  );

  if (hasTheme(normalized) && hasAction(normalized)) return true;
  if (hasLocale && hasTheme(normalized)) return true;

  if (
    normalized.includes("food challenge 24 hours") ||
    normalized.includes("challenge 24 hours")
  ) {
    return true;
  }

  return false;
}

function detectCategory(keyword: string) {
  const text = normalize(keyword);

  if (
    text.includes("kpop") ||
    text.includes("demon hunters") ||
    text.includes("huntrix")
  ) {
    return "Trend / Fandom";
  }

  if (text.includes("from ") && text.includes(" to ")) {
    return "Transformation Arc";
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
    text.includes("battle") ||
    text.includes("24 hours")
  ) {
    return "Challenge Cluster";
  }

  if (localeWords.some((locale) => text.includes(locale))) {
    return "Locale Cluster";
  }

  return "Market Phrase";
}

function addCandidate(
  list: CandidateKeyword[],
  keyword: string | null | undefined,
  source: string,
  qualityWeight = 1
) {
  if (!keyword) return;

  const normalized = normalize(keyword);

  if (!isValidMarketPhrase(normalized)) return;

  list.push({
    keyword: titleCaseKeyword(normalized),
    category: detectCategory(normalized),
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

function buildMarketPhrasesFromText(text: string) {
  const phrases: string[] = [];

  const statusPhrases = detectStatusPhrases(text);
  const fromToPhrases = detectFromToPhrases(text);
  const secretPhrases = detectSecretBuildPhrases(text);
  const trends = detectTrendEntities(text);
  const foundThemes = findThemes(text);
  const foundActions = findActions(text);
  const foundLocales = findLocales(text);

  phrases.push(...statusPhrases);
  phrases.push(...fromToPhrases);
  phrases.push(...secretPhrases);
  phrases.push(...trends);

  statusPhrases.forEach((status) => {
    foundThemes.forEach((theme) => {
      phrases.push(`${status} ${theme}`);
    });
  });

  foundThemes.forEach((theme) => {
    foundActions.forEach((action) => {
      phrases.push(`${theme} ${action}`);
    });
  });

  statusPhrases.forEach((status) => {
    foundThemes.forEach((theme) => {
      foundActions.forEach((action) => {
        phrases.push(`${status} ${theme} ${action}`);
      });
    });
  });

  foundLocales.forEach((locale) => {
    foundThemes.forEach((theme) => {
      phrases.push(`${locale} ${theme}`);
    });
  });

  trends.forEach((trend) => {
    foundActions.forEach((action) => {
      phrases.push(`${trend} ${action}`);
    });
  });

  return Array.from(new Set(phrases.map(normalize))).filter(
    isValidMarketPhrase
  );
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
    description.slice(0, 1800),
    tags.join(" "),
  ].join(" ");

  buildMarketPhrasesFromText(highSignalText).forEach((phrase) => {
    addCandidate(
      candidates,
      phrase,
      "market_template_title_tags",
      2.2
    );
  });

  buildMarketPhrasesFromText(fullText).forEach((phrase) => {
    addCandidate(
      candidates,
      phrase,
      "market_template_title_description_tags",
      1.6
    );
  });

  tags.forEach((tag) => {
    const normalizedTag = normalize(tag);

    if (isValidMarketPhrase(normalizedTag)) {
      addCandidate(
        candidates,
        normalizedTag,
        "clean_youtube_tag",
        1.4
      );
    }
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
      ) *
        0.75 +
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

  const phraseQualityScore = Math.min(100, Math.round(averageQuality * 45));

  const growthMetrics = getGrowthMetrics(aggregate, previous, benchmarks);

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
    return `Template market phrase. High velocity from breakout source: ${Math.round(
      viewsPerDay
    ).toLocaleString("en-US")} views/day.`;
  }

  if (marketStage === "Accelerating") {
    return `Template market phrase. Traffic growth detected since last refresh: +${viewsGrowth.toLocaleString(
      "en-US"
    )} views.`;
  }

  if (marketStage === "Cross-Channel Adoption") {
    return `Template market phrase adopted across ${channelCount} channels and ${videoCount} videos.`;
  }

  if (marketStage === "Rising") {
    return `Template market phrase with ${totalViews.toLocaleString(
      "en-US"
    )} internal competitor views.`;
  }

  return "Template market phrase from competitor title, description or tags.";
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
    const historyRows = (historyResult.data || []) as KeywordHistoryRow[];
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
        source: "market_phrase_template_engine_v9",
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
      message: `Market Phrase Template Engine refreshed ${keywordRows.length} clean market phrases from ${safeVideos.length} competitor videos. Raw n-gram noise was removed.`,
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
