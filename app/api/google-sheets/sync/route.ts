import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

import type {
  CompetitorChannel,
  CompetitorGroup,
  CompetitorVideo,
} from "@/types/competitor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PAGE_SIZE = 1000;
const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

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

type ThumbnailTrendItem = {
  topic: string;
  keyword: string;
  layout: string;
  thumbnailUrl: string;
  traffic: number;
};

function numberOrZero(value: number | null | undefined) {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? value
    : 0;
}

function textOrBlank(
  value: string | null | undefined
) {
  return value?.trim() || "";
}

function escapeFormulaText(value: string) {
  return value.replace(/"/g, '""');
}

function imageFormula(
  thumbnailUrl: string | null | undefined
) {
  if (!thumbnailUrl) {
    return "";
  }

  return `=IMAGE("${escapeFormulaText(
    thumbnailUrl
  )}";4;90;160)`;
}

function parseDurationToSeconds(
  duration: string | null | undefined
) {
  if (!duration) {
    return 0;
  }

  const match = duration.match(
    /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/
  );

  if (!match) {
    return 0;
  }

  const days = Number(match[1] || 0);
  const hours = Number(match[2] || 0);
  const minutes = Number(match[3] || 0);
  const seconds = Number(match[4] || 0);

  return (
    days * 86400 +
    hours * 3600 +
    minutes * 60 +
    seconds
  );
}

function getThumbnailUrl(video: CompetitorVideo) {
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

function normalizeThumbnailLayout(
  style: string | null | undefined
) {
  const original = textOrBlank(style);

  if (!original) {
    return "Chưa phân loại";
  }

  const normalized = original.toLowerCase();

  if (
    normalized.includes("bố cục 3") ||
    normalized.includes("layout 3") ||
    normalized.includes("three-way") ||
    normalized.includes("triple") ||
    /(^|\D)3(\D|$)/.test(normalized)
  ) {
    return "Bố cục 3";
  }

  if (
    normalized.includes("bố cục 2") ||
    normalized.includes("layout 2") ||
    normalized.includes("split") ||
    normalized.includes("two-way") ||
    normalized.includes("before after") ||
    normalized.includes("before/after") ||
    /(^|\D)2(\D|$)/.test(normalized)
  ) {
    return "Bố cục 2";
  }

  return original;
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
      .order(orderColumn, {
        ascending,
      })
      .range(
        from,
        from + PAGE_SIZE - 1
      );

    if (error) {
      throw new Error(
        `${tableName}: ${error.message}`
      );
    }

    const page = (data || []) as T[];

    allRows.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return allRows;
}

async function fetchRecentSnapshots() {
  const snapshots: SnapshotRow[] = [];
  const cutoff = new Date(
    Date.now() - 14 * MILLIS_PER_DAY
  ).toISOString();

  let from = 0;

  try {
    while (true) {
      const { data, error } = await supabase
        .from("competitor_video_snapshots")
        .select("*")
        .gte("captured_at", cutoff)
        .order("captured_at", {
          ascending: false,
        })
        .range(
          from,
          from + PAGE_SIZE - 1
        );

      if (error) {
        /*
         * Bảng snapshot chưa tồn tại hoặc chưa có quyền:
         * không làm hỏng toàn bộ quá trình sync.
         */
        console.warn(
          "Snapshot table unavailable:",
          error.message
        );

        return [];
      }

      const page =
        (data || []) as SnapshotRow[];

      snapshots.push(...page);

      if (page.length < PAGE_SIZE) {
        break;
      }

      from += PAGE_SIZE;
    }
  } catch (error) {
    console.warn(
      "Cannot load snapshots:",
      error
    );

    return [];
  }

  return snapshots;
}

async function sendToAppsScript(
  action: string,
  payload: Record<string, unknown>
) {
  const webAppUrl =
    process.env.GOOGLE_SHEETS_WEBAPP_URL;

  const secret =
    process.env.GOOGLE_SHEETS_WEBAPP_SECRET;

  if (!webAppUrl) {
    throw new Error(
      "Thiếu GOOGLE_SHEETS_WEBAPP_URL."
    );
  }

  if (!secret) {
    throw new Error(
      "Thiếu GOOGLE_SHEETS_WEBAPP_SECRET."
    );
  }

  const response = await fetch(
    webAppUrl,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "text/plain;charset=utf-8",
        Accept: "application/json",
      },
      body: JSON.stringify({
        action,
        secret,
        ...payload,
      }),
      redirect: "follow",
      cache: "no-store",
    }
  );

  const rawText =
    await response.text();

  let result: AppsScriptResponse;

  try {
    result = JSON.parse(rawText);
  } catch {
    throw new Error(
      `Apps Script không trả về JSON ở action ${action}: ` +
        rawText.slice(0, 300)
    );
  }

  if (
    !response.ok ||
    result.success !== true
  ) {
    throw new Error(
      result.error ||
        `Apps Script lỗi tại action ${action}.`
    );
  }

  return result;
}

function createSnapshotMap(
  snapshots: SnapshotRow[]
) {
  const map = new Map<
    number,
    SnapshotRow[]
  >();

  for (const snapshot of snapshots) {
    if (
      snapshot.competitor_video_id === null
    ) {
      continue;
    }

    const current =
      map.get(
        snapshot.competitor_video_id
      ) || [];

    current.push(snapshot);

    map.set(
      snapshot.competitor_video_id,
      current
    );
  }

  for (const rows of map.values()) {
    rows.sort(
      (a, b) =>
        new Date(
          b.captured_at
        ).getTime() -
        new Date(
          a.captured_at
        ).getTime()
    );
  }

  return map;
}

function calculateTraffic(
  video: CompetitorVideo,
  snapshotMap: Map<
    number,
    SnapshotRow[]
  >
) {
  const snapshots =
    snapshotMap.get(video.id) || [];

  if (snapshots.length >= 2) {
    return Math.max(
      0,
      numberOrZero(
        snapshots[0].view_count
      ) -
        numberOrZero(
          snapshots[1].view_count
        )
    );
  }

  if (snapshots.length === 1) {
    const difference =
      numberOrZero(video.view_count) -
      numberOrZero(
        snapshots[0].view_count
      );

    if (difference > 0) {
      return difference;
    }
  }

  if (!video.published_at) {
    return 0;
  }

  const publishedTime =
    new Date(
      video.published_at
    ).getTime();

  if (
    !Number.isFinite(publishedTime)
  ) {
    return 0;
  }

  const ageDays = Math.max(
    1,
    Math.ceil(
      (Date.now() - publishedTime) /
        MILLIS_PER_DAY
    )
  );

  return Math.round(
    numberOrZero(video.view_count) /
      ageDays
  );
}

function buildThumbnailTrendRows(
  items: ThumbnailTrendItem[]
) {
  const groups = new Map<
    string,
    ThumbnailTrendItem[]
  >();

  for (const item of items) {
    const key = [
      item.topic,
      item.keyword,
      item.layout,
    ].join("|||");

    const current =
      groups.get(key) || [];

    current.push(item);

    groups.set(key, current);
  }

  const rows: unknown[][] = [];

  for (const [
    key,
    groupItems,
  ] of groups.entries()) {
    const [
      topic,
      keyword,
      layout,
    ] = key.split("|||");

    groupItems.sort(
      (a, b) =>
        b.traffic - a.traffic
    );

    for (
      let index = 0;
      index < groupItems.length;
      index += 19
    ) {
      const chunk =
        groupItems.slice(
          index,
          index + 19
        );

      const part =
        Math.floor(index / 19) + 1;

      const keywordLabel =
        part === 1
          ? keyword
          : `${keyword} — phần ${part}`;

      const totalTraffic =
        chunk.reduce(
          (sum, item) =>
            sum + item.traffic,
          0
        );

      rows.push([
        "StudioOS",
        topic,
        keywordLabel,
        totalTraffic,
        layout,
        ...chunk.map((item) =>
          imageFormula(
            item.thumbnailUrl
          )
        ),
      ]);
    }
  }

  return rows.sort(
    (a, b) =>
      numberOrZero(b[3] as number) -
      numberOrZero(a[3] as number)
  );
}

export async function POST() {
  try {
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
      new Map<
        number,
        CompetitorGroup
      >(
        groups.map((group) => [
          group.id,
          group,
        ])
      );

    const channelById =
      new Map<
        number,
        CompetitorChannel
      >(
        channels.map((channel) => [
          channel.id,
          channel,
        ])
      );

    const snapshotMap =
      createSnapshotMap(
        snapshots
      );

    function getGroup(
      groupId:
        | number
        | null
        | undefined
    ) {
      if (groupId === null ||
          groupId === undefined) {
        return null;
      }

      return (
        groupById.get(groupId) ||
        null
      );
    }

    function getChannel(
      channelId:
        | number
        | null
        | undefined
    ) {
      if (
        channelId === null ||
        channelId === undefined
      ) {
        return null;
      }

      return (
        channelById.get(channelId) ||
        null
      );
    }

    const channelClusterRows =
      channels.map((channel) => {
        const group =
          getGroup(channel.group_id);

        return [
          channel.country ||
            channel.language ||
            group?.category ||
            "",
          group?.name ||
            "Chưa phân hệ thống",
          channel.youtube_channel_id ||
            "",
          channel.channel_name,
          "direct",
          group?.priority ?? "",
          channel.notes || "",
        ];
      });

    const channelOverviewRows:
      unknown[][] = [];

    const groupedChannels =
      new Map<
        string,
        CompetitorChannel[]
      >();

    for (const channel of channels) {
      const group =
        getGroup(channel.group_id);

      const groupName =
        group?.name ||
        "Chưa phân hệ thống";

      const current =
        groupedChannels.get(
          groupName
        ) || [];

      current.push(channel);

      groupedChannels.set(
        groupName,
        current
      );
    }

    for (const group of groups) {
      const systemChannels =
        groupedChannels.get(
          group.name
        ) || [];

      if (
        systemChannels.length === 0
      ) {
        continue;
      }

      channelOverviewRows.push([
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
          channelOverviewRows.push([
            index + 1,
            channel.channel_name,
            channel.channel_url || "",
            channel.youtube_channel_id ||
              "",
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

    const ungroupedChannels =
      groupedChannels.get(
        "Chưa phân hệ thống"
      ) || [];

    if (
      ungroupedChannels.length > 0
    ) {
      channelOverviewRows.push([
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

      ungroupedChannels.forEach(
        (channel, index) => {
          channelOverviewRows.push([
            index + 1,
            channel.channel_name,
            channel.channel_url || "",
            channel.youtube_channel_id ||
              "",
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

    const videoLibraryRows =
      videos.map((video) => {
        const channel =
          getChannel(
            video.competitor_channel_id
          );

        const group =
          getGroup(
            video.group_id ??
              channel?.group_id
          );

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
          video.video_url || "",
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
          video.thumbnail_style ||
            "",
          video.ai_summary || "",
        ];
      });

    const snapshotRows =
      videos.map((video) => {
        const channel =
          getChannel(
            video.competitor_channel_id
          );

        const group =
          getGroup(
            video.group_id ??
              channel?.group_id
          );

        const traffic =
          calculateTraffic(
            video,
            snapshotMap
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
          video.video_url || "",
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
          video.theme ||
            video.idea_type ||
            "",
          "",
          "",
          "",
          normalizeThumbnailLayout(
            video.thumbnail_style
          ),
          "",
          video.hook_type || "",
          video.theme ||
            video.title_formula ||
            "",
          "direct",
          `${video.youtube_video_id}_${numberOrZero(
            video.view_count
          )}_${snapshotDate}_${traffic}`,
        ];
      });

    const videosBySystem =
      new Map<
        string,
        unknown[][]
      >();

    const thumbnailTrendItems:
      ThumbnailTrendItem[] = [];

    for (const video of videos) {
      const channel =
        getChannel(
          video.competitor_channel_id
        );

      const group =
        getGroup(
          video.group_id ??
            channel?.group_id
        );

      const systemName =
        group?.name ||
        "Chưa phân hệ thống";

      const thumbnailUrl =
        getThumbnailUrl(video);

      const systemRows =
        videosBySystem.get(
          systemName
        ) || [];

      systemRows.push([
        imageFormula(thumbnailUrl),
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
        video.video_url || "",
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
        systemRows
      );

      if (thumbnailUrl) {
        thumbnailTrendItems.push({
          topic:
            group?.category ||
            group?.name ||
            "Chưa phân chủ đề",

          keyword:
            video.theme ||
            video.idea_type ||
            channel?.niche ||
            video.title_formula ||
            "Chưa phân từ khóa ngách",

          layout:
            normalizeThumbnailLayout(
              video.thumbnail_style
            ),

          thumbnailUrl,

          traffic:
            calculateTraffic(
              video,
              snapshotMap
            ),
        });
      }
    }

    const systems = Array.from(
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

    const thumbnailTrendRows =
      buildThumbnailTrendRows(
        thumbnailTrendItems
      );

    await sendToAppsScript(
      "syncChannelClusters",
      {
        rows: channelClusterRows,
      }
    );

    await sendToAppsScript(
      "syncChannelOverview",
      {
        rows: channelOverviewRows,
      }
    );

    await sendToAppsScript(
      "syncVideoLibrary",
      {
        rows: videoLibraryRows,
      }
    );

    await sendToAppsScript(
      "appendVideoSnapshots",
      {
        rows: snapshotRows,
      }
    );

    await sendToAppsScript(
      "syncAllSystemVideos",
      {
        systems,
      }
    );

    await sendToAppsScript(
      "syncThumbnailTrends",
      {
        rows: thumbnailTrendRows,
      }
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
        thumbnailGroups:
          thumbnailTrendRows.length,
        snapshots:
          snapshotRows.length,
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
      {
        status: 500,
      }
    );
  }
}