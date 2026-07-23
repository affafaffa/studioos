import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

import type {
  CompetitorChannel,
  CompetitorVideo,
} from "@/types/competitor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const PAGE_SIZE = 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 90;
const TOP_TRENDS = 10;
const REPRESENTATIVE_THUMBS = 5;
const YOUTUBE_SEARCH_RESULTS_PER_KEYWORD = 10;
const YOUTUBE_SEED_LIMIT = 10;

type AppsScriptResponse = {
  success?: boolean;
  error?: string;
  message?: string;
  [key: string]: unknown;
};

type SnapshotRow = {
  id: number;
  competitor_video_id: number | null;
  view_count: number | null;
  captured_at: string;
};

type SourceVideo = {
  source: "StudioOS" | "YouTube Market";
  internalId: number | null;
  videoId: string;
  title: string;
  description: string;
  tags: string[];
  channelName: string;
  publishedAt: string;
  duration: string;
  viewCount: number;
  thumbnailUrl: string;
  videoUrl: string;
  thumbnailStyle: string;
  rawSnippet: Record<string, unknown> | null;
};

type ClassifiedVideo = SourceVideo & {
  keyword: string;
  majorTopic: string;
  nicheTopic: string;
  layout: string;
  colors: string[];
  characters: string[];
  visualSignature: string;
  trafficPerDay: number;
  publishedTime: number;
};

type TrendGroup = {
  keyword: string;
  majorTopic: string;
  nicheTopic: string;
  layout: string;
  colors: string[];
  characters: string[];
  visualSignature: string;
  keywordVolumeEstimate: number;
  observedVideoCount: number;
  channelCount: number;
  channels: string[];
  totalTrafficPerDay: number;
  newestPublishedTime: number;
  trendScore: number;
  videos: ClassifiedVideo[];
};

type YouTubeSearchResponse = {
  pageInfo?: {
    totalResults?: number;
  };
  items?: Array<{
    id?: {
      videoId?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

type YouTubeVideosResponse = {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      description?: string;
      channelTitle?: string;
      publishedAt?: string;
      tags?: string[];
      liveBroadcastContent?: string;
      thumbnails?: {
        maxres?: { url?: string };
        standard?: { url?: string };
        high?: { url?: string };
        medium?: { url?: string };
        default?: { url?: string };
      };
    };
    contentDetails?: {
      duration?: string;
    };
    statistics?: {
      viewCount?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

const KEYWORD_RULES: Array<{
  phrases: string[];
  keyword: string;
  major: string;
  niche: string;
}> = [
  {
    phrases: ["poor", "rich", "giga rich"],
    keyword: "Poor vs Rich vs Giga Rich",
    major: "Poor vs Rich",
    niche: "Poor vs Rich vs Giga Rich",
  },
  {
    phrases: ["poor", "rich", "billionaire"],
    keyword: "Poor vs Rich vs Giga Rich",
    major: "Poor vs Rich",
    niche: "Poor vs Rich vs Giga Rich",
  },
  {
    phrases: ["kpop", "demon hunters"],
    keyword: "KPop Demon Hunters",
    major: "KPop Demon Hunters",
    niche: "KPop Demon Hunters",
  },
  {
    phrases: ["rainbow", "huntrix"],
    keyword: "Rainbow Huntrix",
    major: "KPop Demon Hunters",
    niche: "Rainbow Huntrix",
  },
  {
    phrases: ["huntrix", "makeover"],
    keyword: "Huntrix Makeover",
    major: "Makeover",
    niche: "Huntrix Makeover",
  },
  {
    phrases: ["mermaid", "makeover"],
    keyword: "Mermaid Makeover",
    major: "Makeover",
    niche: "Mermaid Makeover",
  },
  {
    phrases: ["room", "makeover"],
    keyword: "Room Makeover",
    major: "Makeover",
    niche: "Room Makeover",
  },
  {
    phrases: ["secret room", "makeover"],
    keyword: "Secret Room Makeover",
    major: "Secret Room",
    niche: "Secret Room Makeover",
  },
  {
    phrases: ["princess", "wedding"],
    keyword: "Princess Wedding",
    major: "Wedding",
    niche: "Princess Wedding",
  },
  {
    phrases: ["mermaid", "wedding"],
    keyword: "Mermaid Wedding",
    major: "Wedding",
    niche: "Mermaid Wedding",
  },
  {
    phrases: ["rainbow", "makeover"],
    keyword: "Rainbow Makeover",
    major: "Makeover",
    niche: "Rainbow Makeover",
  },
  {
    phrases: ["pink", "blue"],
    keyword: "Pink vs Blue",
    major: "Color Challenge",
    niche: "Pink vs Blue",
  },
  {
    phrases: ["gold", "silver"],
    keyword: "Gold vs Silver",
    major: "Color Challenge",
    niche: "Gold vs Silver",
  },
  {
    phrases: ["secret room"],
    keyword: "Secret Room",
    major: "Secret Room",
    niche: "Secret Room Challenge",
  },
  {
    phrases: ["huntrix"],
    keyword: "Huntrix",
    major: "KPop Demon Hunters",
    niche: "Huntrix",
  },
  {
    phrases: ["rainbow"],
    keyword: "Rainbow",
    major: "Rainbow",
    niche: "Rainbow",
  },
  {
    phrases: ["makeover"],
    keyword: "Makeover",
    major: "Makeover",
    niche: "Makeover",
  },
  {
    phrases: ["wedding"],
    keyword: "Wedding",
    major: "Wedding",
    niche: "Wedding",
  },
  {
    phrases: ["mermaid"],
    keyword: "Mermaid",
    major: "Mermaid",
    niche: "Mermaid",
  },
  {
    phrases: ["princess"],
    keyword: "Princess",
    major: "Princess",
    niche: "Princess",
  },
];

const CHARACTER_RULES: Array<[string[], string]> = [
  [["huntrix"], "Huntrix"],
  [["rumi"], "Rumi"],
  [["mira"], "Mira"],
  [["zoey"], "Zoey"],
  [["jinu"], "Jinu"],
  [["wednesday"], "Wednesday"],
  [["enid"], "Enid"],
  [["barbie"], "Barbie"],
  [["elsa"], "Elsa"],
  [["ariel"], "Ariel"],
  [["ladybug"], "Ladybug"],
  [["cat noir"], "Cat Noir"],
  [["princess"], "Princess"],
  [["mermaid"], "Mermaid"],
  [["vampire"], "Vampire"],
  [["zombie"], "Zombie"],
  [["baby"], "Baby"],
  [["doll"], "Doll"],
];

const COLOR_RULES: Array<[string[], string]> = [
  [["rainbow"], "Rainbow"],
  [["pink"], "Pink"],
  [["blue"], "Blue"],
  [["red"], "Red"],
  [["purple"], "Purple"],
  [["green"], "Green"],
  [["black"], "Black"],
  [["white"], "White"],
  [["gold"], "Gold"],
  [["silver"], "Silver"],
  [["neon"], "Neon"],
  [["pastel"], "Pastel"],
];

function numberOrZero(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function escapeFormulaText(value: string): string {
  return value.replace(/"/g, '""');
}

function imageFormula(url: string): string {
  return url
    ? `=IMAGE("${escapeFormulaText(url)}";4;100;178)`
    : "";
}

function linkFormula(url: string): string {
  return url
    ? `=HYPERLINK("${escapeFormulaText(url)}";"Mở video YouTube")`
    : "";
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9#+'\s/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase();
      if (["vs", "and", "of", "to"].includes(lower)) return lower;
      if (lower === "kpop") return "KPop";
      if (lower === "huntrix") return "Huntrix";
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function parseDurationToSeconds(duration: string): number {
  if (!duration) return 0;

  const match = duration.match(
    /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/
  );

  if (!match) return 0;

  return (
    Number(match[1] || 0) * 86400 +
    Number(match[2] || 0) * 3600 +
    Number(match[3] || 0) * 60 +
    Number(match[4] || 0)
  );
}

function getBestThumbnail(video: CompetitorVideo): string {
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

function getVideoUrl(videoId: string, url?: string | null): string {
  return url || `https://www.youtube.com/watch?v=${videoId}`;
}

function formatDate(value: string): string {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp)
    ? new Date(timestamp).toISOString().slice(0, 10)
    : "";
}

function hasAll(source: string, phrases: string[]): boolean {
  return phrases.every((phrase) => source.includes(phrase));
}

function detectKeyword(source: string): {
  keyword: string;
  major: string;
  niche: string;
} | null {
  for (const rule of KEYWORD_RULES) {
    if (hasAll(source, rule.phrases)) {
      return {
        keyword: rule.keyword,
        major: rule.major,
        niche: rule.niche,
      };
    }
  }

  return null;
}

function detectTerms(
  source: string,
  rules: Array<[string[], string]>
): string[] {
  return rules
    .filter(([phrases]) => hasAll(source, phrases))
    .map(([, label]) => label)
    .filter((label, index, array) => array.indexOf(label) === index)
    .slice(0, 3);
}

function detectLayout(source: string, style: string): string {
  const normalizedStyle = normalize(style || "");
  const vsCount = (source.match(/\bvs\b/g) || []).length;

  if (
    normalizedStyle.includes("layout 3") ||
    normalizedStyle.includes("bo cuc 3") ||
    normalizedStyle.includes("three panel") ||
    normalizedStyle.includes("triple") ||
    vsCount >= 2
  ) {
    return "Bố cục 3";
  }

  if (
    normalizedStyle.includes("layout 2") ||
    normalizedStyle.includes("bo cuc 2") ||
    normalizedStyle.includes("split") ||
    normalizedStyle.includes("two panel") ||
    normalizedStyle.includes("before after") ||
    vsCount === 1
  ) {
    return "Bố cục 2";
  }

  if (
    normalizedStyle.includes("collage") ||
    normalizedStyle.includes("grid")
  ) {
    return "Collage";
  }

  if (
    normalizedStyle.includes("center") ||
    normalizedStyle.includes("single hero")
  ) {
    return "Nhân vật trung tâm";
  }

  return "Bố cục chung";
}

function isShortOrLive(video: SourceVideo): boolean {
  const durationSeconds = parseDurationToSeconds(video.duration);
  const source = normalize(
    [video.title, video.description, ...video.tags].join(" | ")
  );

  const liveBroadcastContent = String(
    video.rawSnippet?.liveBroadcastContent || "none"
  ).toLowerCase();

  return (
    (durationSeconds > 0 && durationSeconds <= 180) ||
    video.videoUrl.toLowerCase().includes("/shorts/") ||
    source.includes("#shorts") ||
    source.includes("youtube shorts") ||
    (liveBroadcastContent !== "none" && liveBroadcastContent !== "") ||
    source.includes("live stream") ||
    source.includes("livestream") ||
    source.includes("live now")
  );
}

async function fetchAllRows<T>(
  table: string,
  orderColumn: string,
  ascending = true
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order(orderColumn, { ascending })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`${table}: ${error.message}`);

    const page = (data || []) as T[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function fetchSnapshots(): Promise<SnapshotRow[]> {
  const cutoff = new Date(Date.now() - 30 * DAY_MS).toISOString();
  const rows: SnapshotRow[] = [];
  let from = 0;

  try {
    while (true) {
      const { data, error } = await supabase
        .from("competitor_video_snapshots")
        .select("*")
        .gte("captured_at", cutoff)
        .order("captured_at", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (error) return [];

      const page = (data || []) as SnapshotRow[];
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
  } catch {
    return [];
  }

  return rows;
}

function buildSnapshotMap(
  snapshots: SnapshotRow[]
): Map<number, SnapshotRow[]> {
  const map = new Map<number, SnapshotRow[]>();

  for (const snapshot of snapshots) {
    if (snapshot.competitor_video_id === null) continue;
    const current = map.get(snapshot.competitor_video_id) || [];
    current.push(snapshot);
    map.set(snapshot.competitor_video_id, current);
  }

  for (const values of map.values()) {
    values.sort(
      (a, b) =>
        new Date(b.captured_at).getTime() -
        new Date(a.captured_at).getTime()
    );
  }

  return map;
}

function estimateTrafficPerDay(
  video: SourceVideo,
  snapshotMap: Map<number, SnapshotRow[]>
): number {
  if (video.internalId !== null) {
    const snapshots = snapshotMap.get(video.internalId) || [];

    if (snapshots.length >= 2) {
      const latest = snapshots[0];
      const previous = snapshots[1];
      const elapsedDays = Math.max(
        (new Date(latest.captured_at).getTime() -
          new Date(previous.captured_at).getTime()) /
          DAY_MS,
        1 / 24
      );

      return Math.max(
        0,
        Math.round(
          (numberOrZero(latest.view_count) -
            numberOrZero(previous.view_count)) /
            elapsedDays
        )
      );
    }
  }

  const publishedTime = new Date(video.publishedAt).getTime();
  if (!Number.isFinite(publishedTime)) return 0;

  const ageDays = Math.max(1, (Date.now() - publishedTime) / DAY_MS);
  return Math.max(0, Math.round(video.viewCount / ageDays));
}

function competitorToSource(
  video: CompetitorVideo,
  channelById: Map<number, CompetitorChannel>
): SourceVideo {
  const channel =
    video.competitor_channel_id === null
      ? null
      : channelById.get(video.competitor_channel_id) || null;

  return {
    source: "StudioOS",
    internalId: video.id,
    videoId: video.youtube_video_id,
    title: video.title || "",
    description: video.description || "",
    tags: video.tags || [],
    channelName: video.channel_title || channel?.channel_name || "Không rõ kênh",
    publishedAt: video.published_at || "",
    duration: video.duration || "",
    viewCount: numberOrZero(video.view_count),
    thumbnailUrl: getBestThumbnail(video),
    videoUrl: getVideoUrl(video.youtube_video_id, video.video_url),
    thumbnailStyle: video.thumbnail_style || "",
    rawSnippet: video.raw_snippet,
  };
}

function classifyVideo(
  video: SourceVideo,
  snapshotMap: Map<number, SnapshotRow[]>
): ClassifiedVideo | null {
  const cutoffTime = Date.now() - WINDOW_DAYS * DAY_MS;
  const publishedTime = new Date(video.publishedAt).getTime();

  if (!Number.isFinite(publishedTime) || publishedTime < cutoffTime) return null;
  if (!video.thumbnailUrl || !video.videoUrl || isShortOrLive(video)) return null;

  const sourceText = normalize(
    [
      video.title,
      video.description,
      ...video.tags,
      video.thumbnailStyle,
    ].join(" | ")
  );

  const keywordData = detectKeyword(sourceText);
  if (!keywordData) return null;

  const colors = detectTerms(sourceText, COLOR_RULES);
  const characters = detectTerms(sourceText, CHARACTER_RULES);
  const layout = detectLayout(sourceText, video.thumbnailStyle);

  const visualSignature = [
    layout,
    colors.length ? colors.join("+") : "Mixed color",
    characters.length ? characters.join("+") : "Mixed character",
  ].join(" • ");

  return {
    ...video,
    keyword: keywordData.keyword,
    majorTopic: keywordData.major,
    nicheTopic: keywordData.niche,
    layout,
    colors,
    characters,
    visualSignature,
    trafficPerDay: estimateTrafficPerDay(video, snapshotMap),
    publishedTime,
  };
}

function buildSeedKeywords(videos: ClassifiedVideo[]): string[] {
  const map = new Map<string, { traffic: number; count: number }>();

  for (const video of videos) {
    const current = map.get(video.keyword) || { traffic: 0, count: 0 };
    current.traffic += video.trafficPerDay;
    current.count += 1;
    map.set(video.keyword, current);
  }

  const ranked = Array.from(map.entries())
    .sort(
      (a, b) =>
        b[1].traffic - a[1].traffic ||
        b[1].count - a[1].count
    )
    .map(([keyword]) => keyword);

  const defaults = KEYWORD_RULES
    .map((rule) => rule.keyword)
    .filter((keyword, index, array) => array.indexOf(keyword) === index);

  return Array.from(new Set([...ranked, ...defaults])).slice(
    0,
    YOUTUBE_SEED_LIMIT
  );
}

function chunk<T>(values: T[], size: number): T[][] {
  const output: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    output.push(values.slice(index, index + size));
  }
  return output;
}

async function fetchJson<T>(url: URL): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const text = await response.text();

  let parsed: T;
  try {
    parsed = JSON.parse(text) as T;
  } catch {
    throw new Error(`YouTube API không trả JSON: ${text.slice(0, 200)}`);
  }

  if (!response.ok) {
    const maybeError = parsed as { error?: { message?: string } };
    throw new Error(
      maybeError.error?.message || `YouTube API HTTP ${response.status}`
    );
  }

  return parsed;
}

async function expandFromYouTube(
  keywords: string[]
): Promise<{
  videos: SourceVideo[];
  keywordVolume: Map<string, number>;
  enabled: boolean;
}> {
  const apiKey = process.env.YOUTUBE_API_KEY || "";

  const keywordVolume = new Map<string, number>();
  if (!apiKey || keywords.length === 0) {
    return { videos: [], keywordVolume, enabled: false };
  }

  const publishedAfter = new Date(
    Date.now() - WINDOW_DAYS * DAY_MS
  ).toISOString();

  const idsByKeyword = new Map<string, string[]>();
  const allIds = new Set<string>();

  for (const keyword of keywords) {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("type", "video");
    url.searchParams.set("q", keyword);
    url.searchParams.set("order", "viewCount");
    url.searchParams.set("maxResults", String(YOUTUBE_SEARCH_RESULTS_PER_KEYWORD));
    url.searchParams.set("publishedAfter", publishedAfter);
    url.searchParams.set("regionCode", "US");
    url.searchParams.set("relevanceLanguage", "en");
    url.searchParams.set("safeSearch", "none");
    url.searchParams.set("key", apiKey);

    const result = await fetchJson<YouTubeSearchResponse>(url);
    const ids = (result.items || [])
      .map((item) => item.id?.videoId || "")
      .filter(Boolean);

    idsByKeyword.set(keyword, ids);
    ids.forEach((id) => allIds.add(id));
    keywordVolume.set(keyword, Math.max(0, result.pageInfo?.totalResults || ids.length));
  }

  const videoDetails = new Map<string, SourceVideo>();

  for (const idChunk of chunk(Array.from(allIds), 50)) {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "snippet,statistics,contentDetails");
    url.searchParams.set("id", idChunk.join(","));
    url.searchParams.set("key", apiKey);

    const result = await fetchJson<YouTubeVideosResponse>(url);

    for (const item of result.items || []) {
      const id = item.id || "";
      const snippet = item.snippet;
      if (!id || !snippet) continue;

      const thumbnailUrl =
        snippet.thumbnails?.maxres?.url ||
        snippet.thumbnails?.standard?.url ||
        snippet.thumbnails?.high?.url ||
        snippet.thumbnails?.medium?.url ||
        snippet.thumbnails?.default?.url ||
        "";

      videoDetails.set(id, {
        source: "YouTube Market",
        internalId: null,
        videoId: id,
        title: snippet.title || "",
        description: snippet.description || "",
        tags: snippet.tags || [],
        channelName: snippet.channelTitle || "Không rõ kênh",
        publishedAt: snippet.publishedAt || "",
        duration: item.contentDetails?.duration || "",
        viewCount: Number(item.statistics?.viewCount || 0),
        thumbnailUrl,
        videoUrl: `https://www.youtube.com/watch?v=${id}`,
        thumbnailStyle: "",
        rawSnippet: {
          liveBroadcastContent: snippet.liveBroadcastContent || "none",
        },
      });
    }
  }

  const output: SourceVideo[] = [];
  const seen = new Set<string>();

  for (const keyword of keywords) {
    for (const id of idsByKeyword.get(keyword) || []) {
      const video = videoDetails.get(id);
      if (!video || seen.has(id)) continue;
      seen.add(id);
      output.push(video);
    }
  }

  return { videos: output, keywordVolume, enabled: true };
}

function groupTrends(
  videos: ClassifiedVideo[],
  keywordVolume: Map<string, number>
): TrendGroup[] {
  const groups = new Map<string, ClassifiedVideo[]>();
  const globallySeenVideoIds = new Set<string>();

  for (const video of videos) {
    if (globallySeenVideoIds.has(video.videoId)) continue;
    globallySeenVideoIds.add(video.videoId);

    const key = [
      normalize(video.keyword),
      normalize(video.layout),
      normalize(video.colors.join("+")),
      normalize(video.characters.join("+")),
    ].join("|||");

    const current = groups.get(key) || [];
    current.push(video);
    groups.set(key, current);
  }

  const output: TrendGroup[] = [];

  for (const groupVideos of groups.values()) {
    const sorted = [...groupVideos].sort(
      (a, b) =>
        b.trafficPerDay - a.trafficPerDay ||
        b.publishedTime - a.publishedTime
    );

    const first = sorted[0];
    const channels = Array.from(
      new Set(sorted.map((video) => video.channelName).filter(Boolean))
    );
    const totalTrafficPerDay = sorted.reduce(
      (sum, video) => sum + video.trafficPerDay,
      0
    );
    const keywordVolumeEstimate = Math.max(
      keywordVolume.get(first.keyword) || 0,
      videos.filter((video) => video.keyword === first.keyword).length
    );
    const observedVideoCount = sorted.length;
    const newestPublishedTime = Math.max(
      ...sorted.map((video) => video.publishedTime)
    );
    const maxTraffic = Math.max(...sorted.map((video) => video.trafficPerDay));

    const hasTrendSignal =
      observedVideoCount >= 2 ||
      channels.length >= 2 ||
      maxTraffic >= 10000;

    if (!hasTrendSignal) continue;

    const trendScore = Math.round(
      totalTrafficPerDay *
        (1 + Math.log1p(keywordVolumeEstimate)) *
        (1 + 0.08 * Math.log1p(channels.length))
    );

    output.push({
      keyword: first.keyword,
      majorTopic: first.majorTopic,
      nicheTopic: first.nicheTopic,
      layout: first.layout,
      colors: first.colors,
      characters: first.characters,
      visualSignature: first.visualSignature,
      keywordVolumeEstimate,
      observedVideoCount,
      channelCount: channels.length,
      channels,
      totalTrafficPerDay,
      newestPublishedTime,
      trendScore,
      videos: sorted,
    });
  }

  return output
    .sort(
      (a, b) =>
        b.trendScore - a.trendScore ||
        b.totalTrafficPerDay - a.totalTrafficPerDay ||
        b.keywordVolumeEstimate - a.keywordVolumeEstimate ||
        b.newestPublishedTime - a.newestPublishedTime
    )
    .slice(0, TOP_TRENDS);
}

function selectDiverseVideos(videos: ClassifiedVideo[]): ClassifiedVideo[] {
  const selected: ClassifiedVideo[] = [];
  const selectedIds = new Set<string>();
  const usedChannels = new Set<string>();

  for (const video of videos) {
    if (selected.length >= REPRESENTATIVE_THUMBS) break;
    if (selectedIds.has(video.videoId) || usedChannels.has(video.channelName)) continue;

    selected.push(video);
    selectedIds.add(video.videoId);
    usedChannels.add(video.channelName);
  }

  for (const video of videos) {
    if (selected.length >= REPRESENTATIVE_THUMBS) break;
    if (selectedIds.has(video.videoId)) continue;

    selected.push(video);
    selectedIds.add(video.videoId);
  }

  return selected;
}

function buildSheetRows(groups: TrendGroup[], updatedDate: string): unknown[][] {
  const rows: unknown[][] = [];

  groups.forEach((group, groupIndex) => {
    const representatives = selectDiverseVideos(group.videos);

    representatives.forEach((video, videoIndex) => {
      rows.push([
        groupIndex + 1,
        group.keyword,
        group.majorTopic,
        group.nicheTopic,
        group.visualSignature,
        group.layout,
        group.colors.join(", ") || "Mixed",
        group.characters.join(", ") || "Mixed",
        group.keywordVolumeEstimate,
        group.observedVideoCount,
        group.channelCount,
        group.totalTrafficPerDay,
        group.trendScore,
        updatedDate,
        videoIndex + 1,
        imageFormula(video.thumbnailUrl),
        linkFormula(video.videoUrl),
        video.title,
        video.channelName,
        video.trafficPerDay,
        formatDate(video.publishedAt),
        video.source,
        video.videoId,
      ]);
    });
  });

  return rows;
}

async function sendToAppsScript(rows: unknown[][]): Promise<AppsScriptResponse> {
  const webAppUrl = process.env.GOOGLE_SHEETS_WEBAPP_URL;
  const secret = process.env.GOOGLE_SHEETS_WEBAPP_SECRET;

  if (!webAppUrl) throw new Error("Thiếu GOOGLE_SHEETS_WEBAPP_URL.");
  if (!secret) throw new Error("Thiếu GOOGLE_SHEETS_WEBAPP_SECRET.");

  const response = await fetch(webAppUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
      Accept: "application/json",
    },
    body: JSON.stringify({
      action: "syncKeywordThumbnailTrends",
      secret,
      rows,
    }),
    redirect: "follow",
    cache: "no-store",
  });

  const text = await response.text();
  let result: AppsScriptResponse;

  try {
    result = JSON.parse(text) as AppsScriptResponse;
  } catch {
    throw new Error(`Apps Script không trả JSON: ${text.slice(0, 300)}`);
  }

  if (!response.ok || result.success !== true) {
    throw new Error(result.error || "Apps Script từ chối cập nhật xu hướng.");
  }

  return result;
}

export async function POST() {
  try {
    const [channels, competitorVideos, snapshots] = await Promise.all([
      fetchAllRows<CompetitorChannel>(
        "competitor_channels",
        "channel_name",
        true
      ),
      fetchAllRows<CompetitorVideo>(
        "competitor_videos",
        "published_at",
        false
      ),
      fetchSnapshots(),
    ]);

    const channelById = new Map(channels.map((channel) => [channel.id, channel]));
    const snapshotMap = buildSnapshotMap(snapshots);

    const studioSourceVideos = competitorVideos.map((video) =>
      competitorToSource(video, channelById)
    );

    const studioClassified = studioSourceVideos
      .map((video) => classifyVideo(video, snapshotMap))
      .filter((video): video is ClassifiedVideo => video !== null);

    const seedKeywords = buildSeedKeywords(studioClassified);
    const marketExpansion = await expandFromYouTube(seedKeywords);

    const marketClassified = marketExpansion.videos
      .map((video) => classifyVideo(video, snapshotMap))
      .filter((video): video is ClassifiedVideo => video !== null);

    const combinedByVideoId = new Map<string, ClassifiedVideo>();

    for (const video of [...studioClassified, ...marketClassified]) {
      const existing = combinedByVideoId.get(video.videoId);

      if (!existing || video.trafficPerDay > existing.trafficPerDay) {
        combinedByVideoId.set(video.videoId, video);
      }
    }

    const combined = Array.from(combinedByVideoId.values());
    const trendGroups = groupTrends(combined, marketExpansion.keywordVolume);
    const updatedDate = new Date().toISOString().slice(0, 10);
    const rows = buildSheetRows(trendGroups, updatedDate);

    await sendToAppsScript(rows);

    return NextResponse.json({
      success: true,
      message: "Đã cập nhật top 10 keyword trend và thumbnail đại diện.",
      counts: {
        studioVideos: studioClassified.length,
        marketVideos: marketClassified.length,
        trendGroups: trendGroups.length,
        thumbnailRows: rows.length,
      },
      marketExpansion: {
        enabled: marketExpansion.enabled,
        seedKeywords,
      },
      ranking: {
        primary: "trendScore_desc",
        inputs: [
          "totalTrafficPerDay",
          "keywordVolumeEstimate",
          "channelDiversity",
          "recency",
        ],
      },
      rules: {
        windowDays: WINDOW_DAYS,
        topTrends: TOP_TRENDS,
        representativeThumbsPerTrend: REPRESENTATIVE_THUMBS,
        uniqueVideoLinks: true,
        diverseChannelsFirst: true,
        repeatedKeywordsAllowedAcrossVisualClusters: true,
        shortsExcluded: true,
        livestreamsExcluded: true,
      },
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Keyword trend sync failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Không thể cập nhật keyword trends.",
      },
      { status: 500 }
    );
  }
}
