import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

import type {
  CompetitorChannel,
  CompetitorGroup,
  CompetitorVideo,
} from "@/types/competitor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const PAGE_SIZE = 1000;
const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;
const TREND_WINDOW_DAYS = 90;
const TOP_TRENDS_PER_SYNC = 10;
const MAX_THUMBNAILS_PER_TREND = 8;

const BOILERPLATE_LABELS = [
  "official youtube thumbnail captured",
  "youtube thumbnail captured",
  "thumbnail captured",
  "official youtube thumbnail",
  "unknown",
  "none",
  "n/a",
];

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
  like_count: number | null;
  comment_count: number | null;
  captured_at: string;
};

type TrendItem = {
  videoId: string;
  majorTopic: string;
  nicheTopic: string;
  keyword: string;
  layout: string;
  channelName: string;
  thumbnailUrl: string;
  videoUrl: string;
  publishedDate: string;
  publishedTime: number;
  trafficPerDay: number;
};

type TrendGroup = {
  majorTopic: string;
  nicheTopic: string;
  keyword: string;
  layout: string;
  channels: string[];
  volume90Days: number;
  totalTrafficPerDay: number;
  newestPublishedTime: number;
  maxVideoTrafficPerDay: number;
  items: TrendItem[];
};

function numberOrZero(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function textOrBlank(value: string | null | undefined): string {
  return value?.trim() || "";
}

function escapeFormulaText(value: string): string {
  return value.replace(/"/g, '""');
}

function imageFormula(thumbnailUrl: string | null | undefined): string {
  if (!thumbnailUrl) return "";
  return `=IMAGE("${escapeFormulaText(thumbnailUrl)}";4;90;160)`;
}

function linkedImageFormula(
  videoUrl: string | null | undefined,
  thumbnailUrl: string | null | undefined
): string {
  if (!thumbnailUrl) return "";
  if (!videoUrl) return imageFormula(thumbnailUrl);

  return `=HYPERLINK("${escapeFormulaText(videoUrl)}";IMAGE("${escapeFormulaText(
    thumbnailUrl
  )}";4;90;160))`;
}

function youtubeLinkFormula(
  videoUrl: string,
  publishedDate: string
): string {
  if (!videoUrl) return "";

  const label = publishedDate
    ? `YouTube • ${publishedDate}`
    : "Mở YouTube";

  return `=HYPERLINK("${escapeFormulaText(
    videoUrl
  )}";"${escapeFormulaText(label)}")`;
}

function parseDurationToSeconds(
  duration: string | null | undefined
): number {
  if (!duration) return 0;

  const match = duration.match(
    /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/
  );

  if (!match) return 0;

  const days = Number(match[1] || 0);
  const hours = Number(match[2] || 0);
  const minutes = Number(match[3] || 0);
  const seconds = Number(match[4] || 0);

  return days * 86400 + hours * 3600 + minutes * 60 + seconds;
}

function getThumbnailUrl(video: CompetitorVideo): string {
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

function getVideoUrl(video: CompetitorVideo): string {
  return (
    video.video_url ||
    (video.youtube_video_id
      ? `https://www.youtube.com/watch?v=${video.youtube_video_id}`
      : "")
  );
}

function normalizeText(value: string): string {
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
      if (["vs", "and", "of", "to"].includes(word.toLowerCase())) {
        return word.toLowerCase();
      }
      if (word.toLowerCase() === "kpop") return "KPop";
      if (word.toLowerCase() === "huntrix") return "Huntrix";
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function cleanLabel(
  value: string | null | undefined,
  fallback = ""
): string {
  const original = textOrBlank(value);
  if (!original) return fallback;

  const normalized = normalizeText(original);
  if (BOILERPLATE_LABELS.some((label) => normalized.includes(label))) {
    return fallback;
  }

  const cleaned = original.replace(/\s+/g, " ").trim();
  if (cleaned.length < 2 || cleaned.length > 80) return fallback;

  return titleCase(cleaned);
}

function formatDateOnly(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function getRawString(
  record: Record<string, unknown> | null,
  key: string
): string {
  if (!record) return "";
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function buildSourceText(
  video: CompetitorVideo,
  channel: CompetitorChannel | null,
  _group: CompetitorGroup | null
): string {
  return normalizeText(
    [
      video.title,
      video.description,
      ...(video.tags || []),
      video.theme,
      video.idea_type,
      video.title_formula,
      video.thumbnail_style,
      video.ai_summary,
      channel?.niche,
    ]
      .filter(Boolean)
      .join(" | ")
  );
}

function hasAll(source: string, phrases: string[]): boolean {
  return phrases.every((phrase) => source.includes(phrase));
}

function hasAny(source: string, phrases: string[]): boolean {
  return phrases.some((phrase) => source.includes(phrase));
}

function detectMajorTopic(
  source: string,
  video: CompetitorVideo,
  channel: CompetitorChannel | null,
  group: CompetitorGroup | null
): string {
  if (hasAll(source, ["mermaid", "makeover"])) return "Mermaid Makeover";
  if (hasAll(source, ["room", "makeover"])) return "Room Makeover";

  if (
    hasAny(source, [
      "poor vs rich vs giga rich",
      "poor rich giga rich",
      "poor vs rich vs billionaire",
      "poor rich billionaire",
    ])
  ) {
    return "Poor vs Rich vs Giga Rich";
  }

  if (hasAny(source, ["secret room", "hidden room"])) return "Secret Room";
  if (source.includes("rainbow")) return "Rainbow";
  if (source.includes("wedding")) return "Wedding";

  if (
    hasAny(source, [
      "kpop demon hunters",
      "k pop demon hunters",
      "huntrix",
    ])
  ) {
    return "KPop Demon Hunters";
  }

  if (source.includes("makeover")) return "Makeover";

  if (
    hasAny(source, [
      "funny hacks",
      "diy hacks",
      "life hacks",
      "hacks",
    ])
  ) {
    return "Funny Hacks";
  }

  if (source.includes("princess")) return "Princess";
  if (source.includes("mermaid")) return "Mermaid";

  return (
    cleanLabel(video.theme) ||
    cleanLabel(video.idea_type) ||
    cleanLabel(channel?.niche) ||
    "Chưa phân chủ đề"
  );
}

function detectNicheTopic(source: string, majorTopic: string): string {
  const rules: Array<[string[], string]> = [
    [["rainbow", "huntrix"], "Rainbow Huntrix"],
    [["princess", "wedding"], "Princess Wedding"],
    [["mermaid", "wedding"], "Mermaid Wedding"],
    [["huntrix", "makeover"], "Huntrix Makeover"],
    [["secret room", "makeover"], "Secret Room Makeover"],
    [["mermaid", "makeover"], "Mermaid Makeover"],
    [["rainbow", "makeover"], "Rainbow Makeover"],
    [["room", "makeover"], "Room Makeover"],
    [["poor", "rich", "giga rich"], "Poor vs Rich vs Giga Rich"],
    [["poor", "rich", "billionaire"], "Poor vs Rich vs Giga Rich"],
    [["poor", "rich"], "Poor vs Rich"],
    [["pink", "blue"], "Pink vs Blue"],
    [["gold", "silver"], "Gold vs Silver"],
    [["wednesday", "enid"], "Wednesday vs Enid"],
    [["kpop", "demon hunters"], "KPop Demon Hunters"],
  ];

  for (const [phrases, label] of rules) {
    if (hasAll(source, phrases)) return label;
  }

  const concepts: Array<[string, string]> = [
    ["rainbow", "Rainbow"],
    ["huntrix", "Huntrix"],
    ["princess", "Princess"],
    ["mermaid", "Mermaid"],
    ["secret room", "Secret Room"],
    ["hidden room", "Secret Room"],
    ["pink vs blue", "Pink vs Blue"],
    ["poor vs rich", "Poor vs Rich"],
    ["wedding", "Wedding"],
    ["makeover", "Makeover"],
    ["school", "School"],
    ["vampire", "Vampire"],
    ["zombie", "Zombie"],
    ["baby", "Baby"],
    ["doll", "Doll"],
  ];

  const matched = concepts
    .filter(([phrase]) => source.includes(phrase))
    .map(([, label]) => label)
    .filter((label, index, array) => array.indexOf(label) === index)
    .slice(0, 2);

  return matched.length ? matched.join(" ") : majorTopic;
}

function detectKeyword(
  source: string,
  video: CompetitorVideo,
  nicheTopic: string
): string {
  const rules: Array<[string[], string]> = [
    [["poor", "rich", "giga rich"], "Poor vs Rich vs Giga Rich"],
    [["poor", "rich", "billionaire"], "Poor vs Rich vs Giga Rich"],
    [["rainbow", "huntrix"], "Rainbow Huntrix"],
    [["princess", "wedding"], "Princess Wedding"],
    [["mermaid", "wedding"], "Mermaid Wedding"],
    [["secret room", "makeover"], "Secret Room Makeover"],
    [["room", "makeover"], "Room Makeover"],
    [["mermaid", "makeover"], "Mermaid Makeover"],
    [["rainbow", "makeover"], "Rainbow Makeover"],
    [["pink", "blue"], "Pink vs Blue"],
    [["gold", "silver"], "Gold vs Silver"],
    [["kpop", "demon hunters"], "KPop Demon Hunters"],
    [["huntrix"], "Huntrix"],
    [["poor", "rich"], "Poor vs Rich"],
    [["secret room"], "Secret Room"],
    [["wedding"], "Wedding"],
    [["makeover"], "Makeover"],
    [["rainbow"], "Rainbow"],
    [["princess"], "Princess"],
    [["mermaid"], "Mermaid"],
    [["hacks"], "Funny Hacks"],
  ];

  for (const [phrases, label] of rules) {
    if (hasAll(source, phrases)) return label;
  }

  return (
    cleanLabel(video.theme) ||
    cleanLabel(video.idea_type) ||
    cleanLabel(video.title_formula) ||
    nicheTopic
  );
}

function countVsTerms(source: string): number {
  return (source.match(/\bvs\b/g) || []).length;
}

function detectLayout(
  source: string,
  style: string | null | undefined
): string {
  const normalizedStyle = normalizeText(style || "");
  const vsCount = countVsTerms(source);

  if (
    hasAny(normalizedStyle, [
      "layout 3",
      "bo cuc 3",
      "three way",
      "triple",
      "3 panel",
      "three panel",
    ]) ||
    vsCount >= 2
  ) {
    return "Bố cục 3";
  }

  if (
    hasAny(normalizedStyle, [
      "layout 2",
      "bo cuc 2",
      "split",
      "two way",
      "2 panel",
      "two panel",
      "before after",
    ]) ||
    vsCount === 1
  ) {
    return "Bố cục 2";
  }

  if (hasAny(normalizedStyle, ["collage", "grid", "multiple panels"])) {
    return "Bố cục collage";
  }

  if (hasAny(normalizedStyle, ["center", "central", "single hero"])) {
    return "Bố cục trung tâm";
  }

  return cleanLabel(style, "Chưa phân loại");
}

function isRecentVideo(
  video: CompetitorVideo,
  cutoffTime: number
): boolean {
  if (!video.published_at) return false;
  const publishedTime = new Date(video.published_at).getTime();
  return Number.isFinite(publishedTime) && publishedTime >= cutoffTime;
}

function isShortVideo(
  video: CompetitorVideo,
  source: string
): boolean {
  const durationSeconds = parseDurationToSeconds(video.duration);
  const url = getVideoUrl(video).toLowerCase();

  return (
    (durationSeconds > 0 && durationSeconds <= 180) ||
    url.includes("/shorts/") ||
    hasAny(source, [
      "#shorts",
      "youtube shorts",
      "short video",
      "yt shorts",
    ])
  );
}

function isLivestream(
  video: CompetitorVideo,
  source: string
): boolean {
  const broadcastContent = normalizeText(
    getRawString(video.raw_snippet, "liveBroadcastContent")
  );

  if (broadcastContent && broadcastContent !== "none") return true;

  return hasAny(source, [
    "#livestream",
    "live stream",
    "livestream",
    "live now",
    "watch live",
    "truc tiep",
  ]);
}

async function fetchAllRows<T>(
  tableName: string,
  orderColumn: string,
  ascending = true
): Promise<T[]> {
  const allRows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .order(orderColumn, { ascending })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`${tableName}: ${error.message}`);
    }

    const page = (data || []) as T[];
    allRows.push(...page);

    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allRows;
}

async function fetchRecentSnapshots(): Promise<SnapshotRow[]> {
  const snapshots: SnapshotRow[] = [];
  const cutoff = new Date(
    Date.now() - 30 * MILLIS_PER_DAY
  ).toISOString();

  let from = 0;

  try {
    while (true) {
      const { data, error } = await supabase
        .from("competitor_video_snapshots")
        .select("*")
        .gte("captured_at", cutoff)
        .order("captured_at", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        console.warn("Snapshot table unavailable:", error.message);
        return [];
      }

      const page = (data || []) as SnapshotRow[];
      snapshots.push(...page);

      if (page.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
  } catch (error) {
    console.warn("Cannot load snapshots:", error);
    return [];
  }

  return snapshots;
}

async function sendToAppsScript(
  action: string,
  payload: Record<string, unknown>
): Promise<AppsScriptResponse> {
  const webAppUrl = process.env.GOOGLE_SHEETS_WEBAPP_URL;
  const secret = process.env.GOOGLE_SHEETS_WEBAPP_SECRET;

  if (!webAppUrl) {
    throw new Error("Thiếu GOOGLE_SHEETS_WEBAPP_URL.");
  }

  if (!secret) {
    throw new Error("Thiếu GOOGLE_SHEETS_WEBAPP_SECRET.");
  }

  const response = await fetch(webAppUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
      Accept: "application/json",
    },
    body: JSON.stringify({
      action,
      secret,
      ...payload,
    }),
    redirect: "follow",
    cache: "no-store",
  });

  const rawText = await response.text();
  let result: AppsScriptResponse;

  try {
    result = JSON.parse(rawText);
  } catch {
    throw new Error(
      `Apps Script không trả về JSON tại action ${action}: ` +
        rawText.slice(0, 300)
    );
  }

  if (!response.ok || result.success !== true) {
    throw new Error(
      result.error || `Apps Script lỗi tại action ${action}.`
    );
  }

  return result;
}

function createSnapshotMap(
  snapshots: SnapshotRow[]
): Map<number, SnapshotRow[]> {
  const map = new Map<number, SnapshotRow[]>();

  for (const snapshot of snapshots) {
    if (snapshot.competitor_video_id === null) continue;

    const current =
      map.get(snapshot.competitor_video_id) || [];

    current.push(snapshot);
    map.set(snapshot.competitor_video_id, current);
  }

  for (const rows of map.values()) {
    rows.sort(
      (a, b) =>
        new Date(b.captured_at).getTime() -
        new Date(a.captured_at).getTime()
    );
  }

  return map;
}

function calculateTrafficPerDay(
  video: CompetitorVideo,
  snapshotMap: Map<number, SnapshotRow[]>
): number {
  const snapshots = snapshotMap.get(video.id) || [];

  if (snapshots.length >= 2) {
    const latest = snapshots[0];
    const previous = snapshots[1];

    const elapsedDays = Math.max(
      (new Date(latest.captured_at).getTime() -
        new Date(previous.captured_at).getTime()) /
        MILLIS_PER_DAY,
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

  if (snapshots.length === 1) {
    const latest = snapshots[0];

    const elapsedDays = Math.max(
      (Date.now() - new Date(latest.captured_at).getTime()) /
        MILLIS_PER_DAY,
      1 / 24
    );

    const delta =
      numberOrZero(video.view_count) -
      numberOrZero(latest.view_count);

    if (delta > 0) {
      return Math.round(delta / elapsedDays);
    }
  }

  if (!video.published_at) return 0;

  const publishedTime =
    new Date(video.published_at).getTime();

  if (!Number.isFinite(publishedTime)) return 0;

  const ageDays = Math.max(
    1,
    (Date.now() - publishedTime) / MILLIS_PER_DAY
  );

  return Math.max(
    0,
    Math.round(numberOrZero(video.view_count) / ageDays)
  );
}

function buildTrendItems(
  videos: CompetitorVideo[],
  channelById: Map<number, CompetitorChannel>,
  groupById: Map<number, CompetitorGroup>,
  snapshotMap: Map<number, SnapshotRow[]>
): TrendItem[] {
  const cutoffTime =
    Date.now() - TREND_WINDOW_DAYS * MILLIS_PER_DAY;

  const items: TrendItem[] = [];

  for (const video of videos) {
    const channel =
      video.competitor_channel_id === null
        ? null
        : channelById.get(video.competitor_channel_id) || null;

    const groupId =
      video.group_id ?? channel?.group_id;

    const group =
      groupId == null
        ? null
        : groupById.get(groupId) || null;

    const source =
      buildSourceText(video, channel, group);

    if (!isRecentVideo(video, cutoffTime)) continue;
    if (isShortVideo(video, source)) continue;
    if (isLivestream(video, source)) continue;

    const thumbnailUrl = getThumbnailUrl(video);
    if (!thumbnailUrl) continue;

    const majorTopic =
      detectMajorTopic(source, video, channel, group);

    const nicheTopic =
      detectNicheTopic(source, majorTopic);

    const keyword =
      detectKeyword(source, video, nicheTopic);

    const layout =
      detectLayout(source, video.thumbnail_style);

    if (
      majorTopic === "Chưa phân chủ đề" ||
      !keyword ||
      layout === "Chưa phân loại"
    ) {
      continue;
    }

    const publishedTime = video.published_at
      ? new Date(video.published_at).getTime()
      : 0;

    items.push({
      videoId: video.youtube_video_id,
      majorTopic,
      nicheTopic,
      keyword,
      layout,
      channelName:
        video.channel_title ||
        channel?.channel_name ||
        "Không rõ kênh",
      thumbnailUrl,
      videoUrl: getVideoUrl(video),
      publishedDate:
        formatDateOnly(video.published_at),
      publishedTime:
        Number.isFinite(publishedTime) ? publishedTime : 0,
      trafficPerDay:
        calculateTrafficPerDay(video, snapshotMap),
    });
  }

  return items;
}

function buildTrendGroups(
  items: TrendItem[]
): TrendGroup[] {
  const grouped =
    new Map<string, TrendItem[]>();

  for (const item of items) {
    const key = [
      normalizeText(item.majorTopic),
      normalizeText(item.nicheTopic),
      normalizeText(item.keyword),
      normalizeText(item.layout),
    ].join("|||");

    const current =
      grouped.get(key) || [];

    if (
      !current.some(
        (existing) =>
          existing.videoId === item.videoId
      )
    ) {
      current.push(item);
    }

    grouped.set(key, current);
  }

  const candidates: TrendGroup[] = [];

  for (const groupItems of grouped.values()) {
    const sortedItems =
      [...groupItems].sort(
        (a, b) =>
          b.trafficPerDay - a.trafficPerDay ||
          b.publishedTime - a.publishedTime
      );

    const first = sortedItems[0];

    const channels =
      Array.from(
        new Set(
          sortedItems
            .map((item) => item.channelName)
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b));

    const totalTrafficPerDay =
      sortedItems.reduce(
        (sum, item) =>
          sum + item.trafficPerDay,
        0
      );

    const newestPublishedTime =
      Math.max(
        ...sortedItems.map(
          (item) => item.publishedTime
        )
      );

    const maxVideoTrafficPerDay =
      Math.max(
        ...sortedItems.map(
          (item) => item.trafficPerDay
        )
      );

    const hasTrendSignal =
      sortedItems.length >= 2 ||
      channels.length >= 2 ||
      maxVideoTrafficPerDay >= 10000;

    if (!hasTrendSignal) continue;

    candidates.push({
      majorTopic: first.majorTopic,
      nicheTopic: first.nicheTopic,
      keyword: first.keyword,
      layout: first.layout,
      channels,
      volume90Days: sortedItems.length,
      totalTrafficPerDay,
      newestPublishedTime,
      maxVideoTrafficPerDay,
      items: sortedItems,
    });
  }

  return candidates
    .sort(
      (a, b) =>
        b.totalTrafficPerDay - a.totalTrafficPerDay ||
        b.newestPublishedTime - a.newestPublishedTime ||
        b.volume90Days - a.volume90Days
    )
    .slice(0, TOP_TRENDS_PER_SYNC);
}

function buildThumbnailTrendRows(
  items: TrendItem[],
  updatedDate: string
): unknown[][] {
  const groups =
    buildTrendGroups(items);

  const rows: unknown[][] = [];

  for (const group of groups) {
    const topItems =
      group.items.slice(
        0,
        MAX_THUMBNAILS_PER_TREND
      );

    const imageCells: unknown[] = [];
    const linkCells: unknown[] = [];

    for (const item of topItems) {
      imageCells.push(
        imageFormula(item.thumbnailUrl)
      );

      linkCells.push(
        youtubeLinkFormula(
          item.videoUrl,
          item.publishedDate
        )
      );
    }

    while (
      imageCells.length <
      MAX_THUMBNAILS_PER_TREND
    ) {
      imageCells.push("");
      linkCells.push("");
    }

    rows.push([
      "Loan",
      updatedDate,
      group.channels.join("\n"),
      group.majorTopic,
      group.nicheTopic,
      group.keyword,
      group.totalTrafficPerDay,
      group.layout,
      group.volume90Days,
      ...imageCells,
    ]);

    rows.push([
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      ...linkCells,
    ]);
  }

  return rows;
}

function buildChannelClusterRows(
  channels: CompetitorChannel[],
  groupById: Map<number, CompetitorGroup>
): unknown[][] {
  return channels.map((channel) => {
    const group =
      channel.group_id == null
        ? null
        : groupById.get(channel.group_id) || null;

    return [
      channel.country ||
        channel.language ||
        group?.category ||
        "",
      group?.name ||
        "Chưa phân hệ thống",
      channel.youtube_channel_id || "",
      channel.channel_name,
      "direct",
      group?.priority ?? "",
      channel.notes || "",
    ];
  });
}

function buildChannelOverviewRows(
  groups: CompetitorGroup[],
  channels: CompetitorChannel[]
): unknown[][] {
  const rows: unknown[][] = [];

  const channelsByGroup =
    new Map<
      number | null,
      CompetitorChannel[]
    >();

  for (const channel of channels) {
    const current =
      channelsByGroup.get(
        channel.group_id
      ) || [];

    current.push(channel);

    channelsByGroup.set(
      channel.group_id,
      current
    );
  }

  for (const group of groups) {
    const systemChannels =
      channelsByGroup.get(group.id) || [];

    if (!systemChannels.length) continue;

    rows.push([
      group.name,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);

    systemChannels.forEach(
      (channel, index) => {
        rows.push([
          index + 1,
          channel.channel_name,
          channel.channel_url || "",
          channel.youtube_channel_id || "",
          channel.country ||
            channel.language ||
            group.category ||
            "",
          channel.created_at || "",
          "",
          numberOrZero(
            channel.channel_view_count
          ),
          "",
          channel.niche || "",
        ]);
      }
    );
  }

  const ungrouped =
    channelsByGroup.get(null) || [];

  if (ungrouped.length) {
    rows.push([
      "Chưa phân hệ thống",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);

    ungrouped.forEach(
      (channel, index) => {
        rows.push([
          index + 1,
          channel.channel_name,
          channel.channel_url || "",
          channel.youtube_channel_id || "",
          channel.country ||
            channel.language ||
            "",
          channel.created_at || "",
          "",
          numberOrZero(
            channel.channel_view_count
          ),
          "",
          channel.niche || "",
        ]);
      }
    );
  }

  return rows;
}

export async function POST(request: Request) {
  try {
    const scope =
      new URL(request.url)
        .searchParams.get("scope") ||
      "all";

    const [
      groups,
      channels,
      videos,
      snapshots,
    ] = await Promise.all([
      fetchAllRows<CompetitorGroup>(
        "competitor_groups",
        "priority",
        false
      ),
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
      fetchRecentSnapshots(),
    ]);

    const syncedAt =
      new Date().toISOString();

    const snapshotDate =
      syncedAt.slice(0, 10);

    const groupById =
      new Map(
        groups.map((group) => [
          group.id,
          group,
        ])
      );

    const channelById =
      new Map(
        channels.map((channel) => [
          channel.id,
          channel,
        ])
      );

    const snapshotMap =
      createSnapshotMap(snapshots);

    const trendItems =
      buildTrendItems(
        videos,
        channelById,
        groupById,
        snapshotMap
      );

    const thumbnailTrendRows =
      buildThumbnailTrendRows(
        trendItems,
        snapshotDate
      );

    if (scope === "thumbnail-trends") {
      await sendToAppsScript(
        "syncThumbnailTrends",
        {
          rows: thumbnailTrendRows,
        }
      );

      return NextResponse.json({
        success: true,
        message:
          "Đã cập nhật Xu hướng thumb 90 ngày gần nhất.",
        counts: {
          sourceVideos: videos.length,
          eligibleTrendVideos:
            trendItems.length,
          thumbnailGroups:
            Math.floor(thumbnailTrendRows.length / 2),
        },
        filters: {
          days: TREND_WINDOW_DAYS,
          topTrends: TOP_TRENDS_PER_SYNC,
          shortsExcluded: true,
          livestreamsExcluded: true,
          sortedBy: "totalTrafficPerDay_desc",
        },
        syncedAt,
      });
    }

    const channelClusterRows =
      buildChannelClusterRows(
        channels,
        groupById
      );

    const channelOverviewRows =
      buildChannelOverviewRows(
        groups,
        channels
      );

    const videoLibraryRows =
      videos.map((video) => {
        const channel =
          video.competitor_channel_id == null
            ? null
            : channelById.get(
                video.competitor_channel_id
              ) || null;

        const groupId =
          video.group_id ??
          channel?.group_id;

        const group =
          groupId == null
            ? null
            : groupById.get(groupId) ||
              null;

        return [
          channel?.country ||
            channel?.language ||
            group?.category ||
            "",
          group?.name ||
            "Chưa phân hệ thống",
          channel?.youtube_channel_id ||
            "",
          video.channel_title ||
            channel?.channel_name ||
            "",
          video.youtube_video_id,
          video.title,
          video.published_at || "",
          getVideoUrl(video),
          getThumbnailUrl(video),
          numberOrZero(
            video.view_count
          ),
          numberOrZero(
            video.like_count
          ),
          numberOrZero(
            video.comment_count
          ),
          parseDurationToSeconds(
            video.duration
          ),
          video.last_synced_at ||
            syncedAt,
          (video.tags || []).join(
            " | "
          ),
          video.thumbnail_style || "",
          video.ai_summary || "",
        ];
      });

    const snapshotRows =
      videos.map((video) => {
        const channel =
          video.competitor_channel_id == null
            ? null
            : channelById.get(
                video.competitor_channel_id
              ) || null;

        const groupId =
          video.group_id ??
          channel?.group_id;

        const group =
          groupId == null
            ? null
            : groupById.get(groupId) ||
              null;

        const source =
          buildSourceText(
            video,
            channel,
            group
          );

        const majorTopic =
          detectMajorTopic(
            source,
            video,
            channel,
            group
          );

        return [
          `${snapshotDate}_${video.youtube_video_id}`,
          snapshotDate,
          syncedAt,
          channel?.country ||
            channel?.language ||
            group?.category ||
            "",
          group?.name ||
            "Chưa phân hệ thống",
          channel?.youtube_channel_id ||
            "",
          video.channel_title ||
            channel?.channel_name ||
            "",
          video.youtube_video_id,
          video.title,
          video.published_at || "",
          getVideoUrl(video),
          getThumbnailUrl(video),
          numberOrZero(
            video.view_count
          ),
          numberOrZero(
            video.like_count
          ),
          numberOrZero(
            video.comment_count
          ),
          parseDurationToSeconds(
            video.duration
          ),
          syncedAt,
          majorTopic,
          "",
          "",
          "",
          detectLayout(
            source,
            video.thumbnail_style
          ),
          "",
          video.hook_type || "",
          detectNicheTopic(
            source,
            majorTopic
          ),
          "direct",
          `${video.youtube_video_id}_${numberOrZero(
            video.view_count
          )}_${snapshotDate}`,
        ];
      });

    const videosBySystem =
      new Map<string, unknown[][]>();

    for (const video of videos) {
      const channel =
        video.competitor_channel_id == null
          ? null
          : channelById.get(
              video.competitor_channel_id
            ) || null;

      const groupId =
        video.group_id ??
        channel?.group_id;

      const group =
        groupId == null
          ? null
          : groupById.get(groupId) ||
            null;

      const systemName =
        group?.name ||
        "Chưa phân hệ thống";

      const rows =
        videosBySystem.get(
          systemName
        ) || [];

      const thumbnailUrl =
        getThumbnailUrl(video);

      rows.push([
        linkedImageFormula(
          getVideoUrl(video),
          thumbnailUrl
        ),
        thumbnailUrl,
        video.title,
        video.channel_title ||
          channel?.channel_name ||
          "",
        numberOrZero(
          video.view_count
        ),
        numberOrZero(
          video.like_count
        ),
        numberOrZero(
          video.comment_count
        ),
        video.duration || "",
        video.published_at || "",
        getVideoUrl(video),
        numberOrZero(
          channel?.video_count
        ),
        numberOrZero(
          channel?.subscriber_count
        ),
        numberOrZero(
          channel?.channel_view_count
        ),
      ]);

      videosBySystem.set(
        systemName,
        rows
      );
    }

    const systems =
      Array.from(
        videosBySystem.entries()
      ).map(
        ([systemName, rows]) => ({
          systemName,
          rows: rows.sort(
            (a, b) =>
              numberOrZero(
                b[4] as number
              ) -
              numberOrZero(
                a[4] as number
              )
          ),
        })
      );

    await sendToAppsScript(
      "syncChannelClusters",
      { rows: channelClusterRows }
    );

    await sendToAppsScript(
      "syncChannelOverview",
      { rows: channelOverviewRows }
    );

    await sendToAppsScript(
      "syncVideoLibrary",
      { rows: videoLibraryRows }
    );

    await sendToAppsScript(
      "appendVideoSnapshots",
      { rows: snapshotRows }
    );

    await sendToAppsScript(
      "syncAllSystemVideos",
      { systems }
    );

    await sendToAppsScript(
      "syncThumbnailTrends",
      { rows: thumbnailTrendRows }
    );

    return NextResponse.json({
      success: true,
      message:
        "Đã đồng bộ dữ liệu StudioOS sang Google Sheet.",
      counts: {
        groups: groups.length,
        channels: channels.length,
        videos: videos.length,
        systems: systems.length,
        eligibleTrendVideos:
          trendItems.length,
        thumbnailGroups:
          Math.floor(thumbnailTrendRows.length / 2),
        snapshots:
          snapshotRows.length,
      },
      filters: {
        trendDays:
          TREND_WINDOW_DAYS,
        shortsExcluded: true,
        livestreamsExcluded: true,
      },
      syncedAt,
    });
  } catch (error) {
    console.error(
      "Google Sheets market sync failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Không thể đồng bộ dữ liệu.",
      },
      { status: 500 }
    );
  }
}