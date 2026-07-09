"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  ExternalLink,
  ImageIcon,
  Lightbulb,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { CompetitorRemix } from "@/types/competitor";

type Props = {
  competitorRemixes?: CompetitorRemix[];
  onOpenIdea?: (ideaId: number) => void;
};

type SortKey =
  | "created_desc"
  | "created_asc"
  | "score_desc"
  | "score_asc"
  | "title_asc"
  | "source_views_desc";

function formatNumber(value: number | null | undefined) {
  return Number(value || 0).toLocaleString("en-US");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function extractVideoIdFromUrl(url: string | null | undefined) {
  if (!url) return "";

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

function buildYoutubeThumbnailUrl(videoId: string) {
  if (!videoId) return "";

  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

function getRemixThumbnail(remix: CompetitorRemix) {
  if (remix.source_thumbnail_url) {
    return remix.source_thumbnail_url;
  }

  const videoId = extractVideoIdFromUrl(remix.source_video_url);

  return buildYoutubeThumbnailUrl(videoId);
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!value) return;

    await navigator.clipboard.writeText(value);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 1200);
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-black"
    >
      <Copy size={13} />
      {copied ? "Copied" : label}
    </button>
  );
}

export default function CompetitorRemixLab({
  competitorRemixes = [],
  onOpenIdea,
}: Props) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("All");
  const [themeFilter, setThemeFilter] = useState("All");
  const [languageFilter, setLanguageFilter] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("created_desc");
  const [deleteLoadingId, setDeleteLoadingId] = useState<number | null>(
    null
  );

  const groups = useMemo(() => {
    return [
      "All",
      ...Array.from(
        new Set(
          competitorRemixes
            .map((remix) => remix.source_group)
            .filter((item): item is string => Boolean(item))
        )
      ),
    ];
  }, [competitorRemixes]);

  const themes = useMemo(() => {
    return [
      "All",
      ...Array.from(
        new Set(
          competitorRemixes
            .map((remix) => remix.theme)
            .filter((item): item is string => Boolean(item))
        )
      ),
    ];
  }, [competitorRemixes]);

  const languages = useMemo(() => {
    return [
      "All",
      ...Array.from(
        new Set(
          competitorRemixes
            .map((remix) => remix.language)
            .filter((item): item is string => Boolean(item))
        )
      ),
    ];
  }, [competitorRemixes]);

  const filteredRemixes = competitorRemixes.filter((remix) => {
    const keyword = search.trim().toLowerCase();

    const text = [
      remix.source_title,
      remix.source_channel,
      remix.source_group,
      remix.remixed_title,
      remix.theme,
      remix.language,
      remix.hook,
      remix.thumbnail_prompt,
      remix.storyline,
      remix.notes,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = !keyword || text.includes(keyword);

    const matchesGroup =
      groupFilter === "All" || remix.source_group === groupFilter;

    const matchesTheme =
      themeFilter === "All" || remix.theme === themeFilter;

    const matchesLanguage =
      languageFilter === "All" || remix.language === languageFilter;

    return (
      matchesSearch &&
      matchesGroup &&
      matchesTheme &&
      matchesLanguage
    );
  });

  const sortedRemixes = [...filteredRemixes].sort((a, b) => {
    if (sortKey === "created_desc") {
      return (
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
      );
    }

    if (sortKey === "created_asc") {
      return (
        new Date(a.created_at || 0).getTime() -
        new Date(b.created_at || 0).getTime()
      );
    }

    if (sortKey === "score_desc") {
      return Number(b.score || 0) - Number(a.score || 0);
    }

    if (sortKey === "score_asc") {
      return Number(a.score || 0) - Number(b.score || 0);
    }

    if (sortKey === "title_asc") {
      return a.remixed_title.localeCompare(b.remixed_title);
    }

    if (sortKey === "source_views_desc") {
      return (
        Number(b.source_view_count || 0) -
        Number(a.source_view_count || 0)
      );
    }

    return 0;
  });

  const savedIdeaCount = competitorRemixes.filter(
    (remix) => remix.saved_idea_id
  ).length;

  const averageScore =
    competitorRemixes.length > 0
      ? competitorRemixes.reduce(
          (sum, remix) => sum + Number(remix.score || 0),
          0
        ) / competitorRemixes.length
      : 0;

  const topTheme =
    themes
      .filter((theme) => theme !== "All")
      .map((theme) => ({
        theme,
        count: competitorRemixes.filter(
          (remix) => remix.theme === theme
        ).length,
      }))
      .sort((a, b) => b.count - a.count)[0]?.theme || "-";

  async function handleDelete(remix: CompetitorRemix) {
    const confirmed = window.confirm(
      `Delete this remix log?\n\n${remix.remixed_title}\n\nThe saved idea will stay in Idea Bank.`
    );

    if (!confirmed) return;

    setDeleteLoadingId(remix.id);

    const { error } = await supabase
      .from("competitor_remixes")
      .delete()
      .eq("id", remix.id);

    setDeleteLoadingId(null);

    if (error) {
      alert(error.message);
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-sm text-gray-500">Total Remixes</p>
          <p className="text-3xl font-bold mt-2">
            {formatNumber(competitorRemixes.length)}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-sm text-gray-500">Saved Ideas</p>
          <p className="text-3xl font-bold mt-2">
            {formatNumber(savedIdeaCount)}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-sm text-gray-500">Avg Remix Score</p>
          <p className="text-3xl font-bold mt-2">
            {averageScore.toFixed(0)}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-sm text-gray-500">Top Theme</p>
          <p className="text-2xl font-bold mt-2 truncate">
            {topTheme}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">
                Competitor Remix Lab
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Review all competitor-inspired ideas saved into Idea Bank.
              </p>
            </div>

            <button
              onClick={() => router.refresh()}
              className="inline-flex items-center gap-2 border px-5 py-3 rounded-xl hover:bg-gray-50"
            >
              <RefreshCw size={18} />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-5 gap-3 mt-6">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search remixes..."
                className="border rounded-xl pl-9 pr-4 py-2 w-full"
              />
            </div>

            <select
              value={groupFilter}
              onChange={(event) =>
                setGroupFilter(event.target.value)
              }
              className="border rounded-xl px-4 py-2"
            >
              {groups.map((group) => (
                <option key={group}>{group}</option>
              ))}
            </select>

            <select
              value={themeFilter}
              onChange={(event) =>
                setThemeFilter(event.target.value)
              }
              className="border rounded-xl px-4 py-2"
            >
              {themes.map((theme) => (
                <option key={theme}>{theme}</option>
              ))}
            </select>

            <select
              value={languageFilter}
              onChange={(event) =>
                setLanguageFilter(event.target.value)
              }
              className="border rounded-xl px-4 py-2"
            >
              {languages.map((language) => (
                <option key={language}>{language}</option>
              ))}
            </select>

            <select
              value={sortKey}
              onChange={(event) =>
                setSortKey(event.target.value as SortKey)
              }
              className="border rounded-xl px-4 py-2"
            >
              <option value="created_desc">Newest Remix</option>
              <option value="created_asc">Oldest Remix</option>
              <option value="score_desc">Score: High → Low</option>
              <option value="score_asc">Score: Low → High</option>
              <option value="source_views_desc">Source Views: High → Low</option>
              <option value="title_asc">Title A → Z</option>
            </select>
          </div>

          <div className="mt-4 text-sm text-gray-500">
            Showing {formatNumber(sortedRemixes.length)} /{" "}
            {formatNumber(competitorRemixes.length)} remixes
          </div>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left p-4 min-w-56">
                  Source
                </th>

                <th className="text-left p-4 min-w-96">
                  Remixed Idea
                </th>

                <th className="text-left p-4">
                  Group
                </th>

                <th className="text-left p-4">
                  Channel
                </th>

                <th className="text-left p-4">
                  Theme
                </th>

                <th className="text-left p-4">
                  Score
                </th>

                <th className="text-left p-4">
                  Created
                </th>

                <th className="text-left p-4 min-w-72">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {sortedRemixes.map((remix) => {
                const thumbnail = getRemixThumbnail(remix);

                return (
                  <tr
                    key={remix.id}
                    className="border-t hover:bg-gray-50"
                  >
                    <td className="p-4">
                      {thumbnail ? (
                        <img
                          src={thumbnail}
                          alt={remix.source_title || "Source thumbnail"}
                          className="w-44 aspect-video object-cover rounded-xl border bg-gray-100"
                        />
                      ) : (
                        <div className="w-44 aspect-video rounded-xl border bg-gray-50 flex items-center justify-center text-gray-400">
                          <ImageIcon size={24} />
                        </div>
                      )}

                      <div className="text-xs text-gray-500 mt-2">
                        {formatNumber(remix.source_view_count)} source views
                      </div>

                      {remix.source_published_at && (
                        <div className="text-xs text-gray-400 mt-1">
                          Published: {formatDate(remix.source_published_at)}
                        </div>
                      )}
                    </td>

                    <td className="p-4">
                      <div className="flex items-start gap-2">
                        <Lightbulb
                          size={18}
                          className="text-purple-600 mt-0.5"
                        />

                        <div>
                          <p className="font-bold">
                            {remix.remixed_title}
                          </p>

                          <p className="text-xs text-gray-400 mt-1">
                            Remix ID #{remix.id} · Saved Idea #{remix.saved_idea_id || "-"}
                          </p>

                          <p className="text-xs text-gray-500 mt-2">
                            Source: {remix.source_title || "-"}
                          </p>

                          {remix.hook && (
                            <p className="text-xs text-gray-500 mt-2">
                              Hook: {remix.hook}
                            </p>
                          )}

                          <div className="flex gap-3 mt-3">
                            <CopyButton
                              value={remix.remixed_title}
                              label="Copy title"
                            />

                            {remix.thumbnail_prompt && (
                              <CopyButton
                                value={remix.thumbnail_prompt}
                                label="Copy thumbnail prompt"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      {remix.source_group || "-"}
                    </td>

                    <td className="p-4">
                      {remix.source_channel || "-"}
                    </td>

                    <td className="p-4">
                      <span className="px-3 py-1 rounded-full bg-zinc-100 text-zinc-700">
                        {remix.theme || "-"}
                      </span>
                    </td>

                    <td className="p-4 font-semibold">
                      {Number(remix.score || 0)}
                    </td>

                    <td className="p-4 text-gray-600">
                      {formatDate(remix.created_at)}
                    </td>

                    <td className="p-4">
                      <div className="flex flex-wrap items-center gap-4">
                        {remix.saved_idea_id && (
                          <button
                            onClick={() =>
                              onOpenIdea?.(Number(remix.saved_idea_id))
                            }
                            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
                          >
                            <Lightbulb size={16} />
                            Open Idea
                          </button>
                        )}

                        {remix.source_video_url && (
                          <a
                            href={remix.source_video_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-gray-600 hover:text-black"
                          >
                            <ExternalLink size={16} />
                            Source
                          </a>
                        )}

                        <button
                          onClick={() => handleDelete(remix)}
                          disabled={deleteLoadingId === remix.id}
                          className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          <Trash2 size={16} />
                          {deleteLoadingId === remix.id
                            ? "Deleting..."
                            : "Delete Log"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {sortedRemixes.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="p-8 text-center text-gray-500"
                  >
                    No remixes yet. Go to Competitor Video Metadata, choose a video, click Remix, then save it to Idea Bank.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}