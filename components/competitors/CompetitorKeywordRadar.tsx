"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ExternalLink,
  Flame,
  ImageIcon,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type CompetitorKeyword = {
  id: number;
  keyword: string;
  keyword_slug: string;
  category: string | null;
  video_count: number | null;
  channel_count: number | null;
  group_count: number | null;
  total_views: number | null;
  avg_views: number | null;
  max_views: number | null;
  total_views_per_day: number | null;
  latest_published_at: string | null;
  first_seen_at: string | null;
  last_seen_at: string | null;
  trend_score: number | null;
  traffic_score: number | null;
  velocity_score: number | null;
  opportunity_score: number | null;
  keyword_rank: number | null;
  external_google_volume: number | null;
  external_youtube_volume: number | null;
  external_trend_score: number | null;
  source: string | null;
  last_refreshed_at: string | null;
  created_at: string;
  updated_at: string | null;
};

type KeywordVideoMatch = {
  id: number;
  keyword_id: number | null;
  competitor_video_id: number | null;
  keyword: string;
  keyword_slug: string;
  video_title: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  channel_title: string | null;
  competitor_channel_id: number | null;
  group_id: number | null;
  published_at: string | null;
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  views_per_day: number | null;
  match_source: string | null;
  created_at: string;
};

type SortKey =
  | "rank"
  | "trend_score"
  | "total_views"
  | "views_per_day"
  | "video_count"
  | "opportunity_score"
  | "latest";

const PAGE_SIZE = 20;

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

function getRankTier(rank: number | null | undefined) {
  const safeRank = Number(rank || 9999);

  if (safeRank <= 3) {
    return {
      label: "Hot",
      icon: "🔥",
      row: "bg-red-50/70 border-l-4 border-red-500",
      badge: "bg-red-100 text-red-700 border-red-200",
    };
  }

  if (safeRank <= 10) {
    return {
      label: "Top 10",
      icon: "⚡",
      row: "bg-orange-50/70 border-l-4 border-orange-400",
      badge: "bg-orange-100 text-orange-700 border-orange-200",
    };
  }

  if (safeRank <= 30) {
    return {
      label: "Rising",
      icon: "📈",
      row: "bg-purple-50/60 border-l-4 border-purple-400",
      badge: "bg-purple-100 text-purple-700 border-purple-200",
    };
  }

  return {
    label: "Watch",
    icon: "👀",
    row: "border-l-4 border-transparent",
    badge: "bg-zinc-100 text-zinc-700 border-zinc-200",
  };
}

function getCategoryStyle(category: string | null) {
  const text = category || "SEO Phrase";

  if (text.includes("Contrast")) {
    return "bg-pink-100 text-pink-700 border-pink-200";
  }

  if (text.includes("Transformation")) {
    return "bg-purple-100 text-purple-700 border-purple-200";
  }

  if (text.includes("Status")) {
    return "bg-amber-100 text-amber-700 border-amber-200";
  }

  if (text.includes("Theme")) {
    return "bg-blue-100 text-blue-700 border-blue-200";
  }

  if (text.includes("Challenge")) {
    return "bg-green-100 text-green-700 border-green-200";
  }

  if (text.includes("Locale")) {
    return "bg-cyan-100 text-cyan-700 border-cyan-200";
  }

  return "bg-zinc-100 text-zinc-700 border-zinc-200";
}

function ScoreBar({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  const safeValue = Math.max(0, Math.min(100, Number(value || 0)));

  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span>{safeValue}</span>
      </div>

      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-zinc-900"
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}

export default function CompetitorKeywordRadar() {
  const [keywords, setKeywords] = useState<CompetitorKeyword[]>([]);
  const [matches, setMatches] = useState<KeywordVideoMatch[]>([]);

  const [selectedKeywordId, setSelectedKeywordId] =
    useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [topLimit, setTopLimit] = useState("20");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [currentPage, setCurrentPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setErrorMessage("");

    const [keywordsResult, matchesResult] = await Promise.all([
      supabase
        .from("competitor_keywords")
        .select("*")
        .order("keyword_rank", { ascending: true })
        .limit(500),

      supabase
        .from("competitor_keyword_video_matches")
        .select("*")
        .order("view_count", { ascending: false })
        .limit(5000),
    ]);

    setLoading(false);

    if (keywordsResult.error) {
      setErrorMessage(keywordsResult.error.message);
      return;
    }

    if (matchesResult.error) {
      setErrorMessage(matchesResult.error.message);
      return;
    }

    const nextKeywords =
      (keywordsResult.data || []) as CompetitorKeyword[];

    setKeywords(nextKeywords);
    setMatches((matchesResult.data || []) as KeywordVideoMatch[]);

    if (!selectedKeywordId && nextKeywords.length > 0) {
      setSelectedKeywordId(nextKeywords[0].id);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, topLimit, sortKey]);

  async function handleRefreshKeywords() {
    setRefreshing(true);
    setMessage("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/keywords/refresh", {
        method: "POST",
      });

      const result = await response.json();

      setRefreshing(false);

      if (!response.ok) {
        setErrorMessage(result.error || "Keyword refresh failed.");
        return;
      }

      setMessage(result.message || "Keyword Radar refreshed.");

      await loadData();
    } catch (error) {
      setRefreshing(false);

      const message =
        error instanceof Error ? error.message : "Unknown refresh error";

      setErrorMessage(message);
    }
  }

  const categories = useMemo(() => {
    return [
      "All",
      ...Array.from(
        new Set(
          keywords
            .map((keyword) => keyword.category)
            .filter((item): item is string => Boolean(item))
        )
      ),
    ];
  }, [keywords]);

  const filteredKeywords = keywords.filter((keyword) => {
    const keywordText = keyword.keyword.toLowerCase();
    const query = search.trim().toLowerCase();

    const matchesSearch = !query || keywordText.includes(query);

    const matchesCategory =
      categoryFilter === "All" || keyword.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const sortedKeywords = [...filteredKeywords].sort((a, b) => {
    if (sortKey === "rank") {
      return Number(a.keyword_rank || 9999) - Number(b.keyword_rank || 9999);
    }

    if (sortKey === "trend_score") {
      return Number(b.trend_score || 0) - Number(a.trend_score || 0);
    }

    if (sortKey === "total_views") {
      return Number(b.total_views || 0) - Number(a.total_views || 0);
    }

    if (sortKey === "views_per_day") {
      return (
        Number(b.total_views_per_day || 0) -
        Number(a.total_views_per_day || 0)
      );
    }

    if (sortKey === "video_count") {
      return Number(b.video_count || 0) - Number(a.video_count || 0);
    }

    if (sortKey === "opportunity_score") {
      return (
        Number(b.opportunity_score || 0) -
        Number(a.opportunity_score || 0)
      );
    }

    if (sortKey === "latest") {
      return (
        new Date(b.latest_published_at || 0).getTime() -
        new Date(a.latest_published_at || 0).getTime()
      );
    }

    return 0;
  });

  const limitedKeywords = sortedKeywords.slice(0, Number(topLimit));

  const totalPages = Math.max(
    1,
    Math.ceil(limitedKeywords.length / PAGE_SIZE)
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedKeywords = limitedKeywords.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE
  );

  const selectedKeyword =
    keywords.find((keyword) => keyword.id === selectedKeywordId) ||
    paginatedKeywords[0] ||
    keywords[0];

  const selectedMatches = selectedKeyword
    ? matches
        .filter((match) => match.keyword_id === selectedKeyword.id)
        .sort(
          (a, b) => Number(b.view_count || 0) - Number(a.view_count || 0)
        )
        .slice(0, 30)
    : [];

  const totalInternalViews = keywords.reduce(
    (sum, keyword) => sum + Number(keyword.total_views || 0),
    0
  );

  const topKeyword = [...keywords].sort(
    (a, b) => Number(b.trend_score || 0) - Number(a.trend_score || 0)
  )[0];

  const lastRefreshedAt =
    keywords
      .map((keyword) => keyword.last_refreshed_at)
      .filter(Boolean)
      .sort()
      .reverse()[0] || null;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-zinc-950 text-white p-7 shadow">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-2 text-sm">
              <Sparkles size={16} />
              Smart SEO Research
            </div>

            <h2 className="text-3xl font-bold mt-4">
              Keyword Radar
            </h2>

            <p className="text-zinc-300 mt-2 max-w-3xl">
              Find rising keyword clusters from competitor videos. Generic single-word tags are filtered out. Prioritize SEO phrases, theme clusters, contrast combos and transformation hooks.
            </p>
          </div>

          <button
            onClick={handleRefreshKeywords}
            disabled={refreshing}
            className="inline-flex items-center gap-2 bg-white text-zinc-900 px-5 py-3 rounded-xl hover:bg-zinc-100 disabled:opacity-50"
          >
            <RefreshCw
              size={18}
              className={refreshing ? "animate-spin" : ""}
            />
            {refreshing ? "Refreshing..." : "Refresh Keywords"}
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-7">
          <div className="rounded-2xl bg-white/10 border border-white/10 p-5">
            <p className="text-sm text-zinc-300">SEO Clusters</p>
            <p className="text-3xl font-bold mt-2">
              {formatNumber(keywords.length)}
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 border border-white/10 p-5">
            <p className="text-sm text-zinc-300">Internal Traffic</p>
            <p className="text-3xl font-bold mt-2">
              {formatNumber(totalInternalViews)}
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 border border-white/10 p-5">
            <p className="text-sm text-zinc-300">Top Keyword</p>
            <p className="text-2xl font-bold mt-2 truncate">
              {topKeyword?.keyword || "-"}
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 border border-white/10 p-5">
            <p className="text-sm text-zinc-300">Last Refresh</p>
            <p className="text-xl font-bold mt-2">
              {formatDate(lastRefreshedAt)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center gap-2">
            <TrendingUp size={22} className="text-purple-600" />

            <h3 className="text-xl font-bold">
              Ranked Keyword Clusters
            </h3>
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
                placeholder="Search keyword clusters..."
                className="border rounded-xl pl-9 pr-4 py-2 w-full"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(event.target.value)
              }
              className="border rounded-xl px-4 py-2"
            >
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>

            <select
              value={topLimit}
              onChange={(event) => setTopLimit(event.target.value)}
              className="border rounded-xl px-4 py-2"
            >
              <option value="10">Top 10</option>
              <option value="20">Top 20</option>
              <option value="50">Top 50</option>
              <option value="100">Top 100</option>
              <option value="500">Top 500</option>
            </select>

            <select
              value={sortKey}
              onChange={(event) =>
                setSortKey(event.target.value as SortKey)
              }
              className="border rounded-xl px-4 py-2"
            >
              <option value="rank">Smart Rank</option>
              <option value="trend_score">Trend Score</option>
              <option value="total_views">Traffic Volume</option>
              <option value="views_per_day">Views/day</option>
              <option value="video_count">Video Count</option>
              <option value="opportunity_score">Opportunity Score</option>
              <option value="latest">Latest Published</option>
            </select>

            <button
              onClick={() => {
                setSearch("");
                setCategoryFilter("All");
                setTopLimit("20");
                setSortKey("rank");
                setCurrentPage(1);
              }}
              className="border rounded-xl px-4 py-2 hover:bg-gray-50"
            >
              Reset
            </button>
          </div>

          {message && (
            <div className="mt-4 rounded-xl border border-green-100 bg-green-50 text-green-700 p-4 text-sm">
              {message}
            </div>
          )}

          {errorMessage && (
            <div className="mt-4 rounded-xl border border-red-100 bg-red-50 text-red-700 p-4 text-sm">
              {errorMessage}
            </div>
          )}
        </div>

        <div className="grid grid-cols-[1.45fr_1fr]">
          <div className="border-r overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-left p-4">Rank</th>
                  <th className="text-left p-4">Keyword Cluster</th>
                  <th className="text-left p-4">Type</th>
                  <th className="text-left p-4">Videos</th>
                  <th className="text-left p-4">Channels</th>
                  <th className="text-left p-4">Traffic</th>
                  <th className="text-left p-4">Views/day</th>
                  <th className="text-left p-4">Trend</th>
                  <th className="text-left p-4">Opp.</th>
                </tr>
              </thead>

              <tbody>
                {loading && (
                  <tr>
                    <td
                      colSpan={9}
                      className="p-8 text-center text-gray-500"
                    >
                      Loading keywords...
                    </td>
                  </tr>
                )}

                {!loading &&
                  paginatedKeywords.map((keyword) => {
                    const isSelected =
                      selectedKeyword?.id === keyword.id;

                    const tier = getRankTier(keyword.keyword_rank);
                    const categoryStyle = getCategoryStyle(keyword.category);

                    return (
                      <tr
                        key={keyword.id}
                        onClick={() => setSelectedKeywordId(keyword.id)}
                        className={`border-t cursor-pointer ${
                          isSelected
                            ? "bg-purple-50"
                            : tier.row
                        }`}
                      >
                        <td className="p-4">
                          <div
                            className={`inline-flex items-center gap-1 border rounded-full px-3 py-1 text-xs font-bold ${tier.badge}`}
                          >
                            <span>{tier.icon}</span>
                            #{keyword.keyword_rank || "-"}
                          </div>

                          <div className="text-xs text-gray-400 mt-2">
                            {tier.label}
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="font-bold text-base">
                            {keyword.keyword}
                          </div>

                          <div className="text-xs text-gray-400 mt-1">
                            Latest: {formatDate(keyword.latest_published_at)}
                          </div>
                        </td>

                        <td className="p-4">
                          <span
                            className={`px-3 py-1 rounded-full border text-xs font-medium ${categoryStyle}`}
                          >
                            {keyword.category || "SEO Phrase"}
                          </span>
                        </td>

                        <td className="p-4 font-semibold">
                          {formatNumber(keyword.video_count)}
                        </td>

                        <td className="p-4">
                          {formatNumber(keyword.channel_count)}
                        </td>

                        <td className="p-4 font-semibold">
                          {formatNumber(keyword.total_views)}
                        </td>

                        <td className="p-4">
                          {formatNumber(
                            Math.round(
                              Number(keyword.total_views_per_day || 0)
                            )
                          )}
                        </td>

                        <td className="p-4 font-semibold">
                          {Number(keyword.trend_score || 0)}
                        </td>

                        <td className="p-4 font-semibold">
                          {Number(keyword.opportunity_score || 0)}
                        </td>
                      </tr>
                    );
                  })}

                {!loading && paginatedKeywords.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="p-8 text-center text-gray-500"
                    >
                      No keyword clusters yet. Click Refresh Keywords.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="border-t bg-gray-50 px-4 py-3 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Page {safeCurrentPage} / {totalPages}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                  disabled={safeCurrentPage === 1}
                  className="border rounded-xl px-4 py-2 bg-white disabled:opacity-50"
                >
                  Previous
                </button>

                <button
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.min(totalPages, page + 1)
                    )
                  }
                  disabled={safeCurrentPage === totalPages}
                  className="border rounded-xl px-4 py-2 bg-white disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 bg-gray-50">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={20} />

              <h3 className="font-bold">
                Videos Using This Keyword
              </h3>
            </div>

            {selectedKeyword && (
              <div className="bg-white rounded-2xl border p-4 mb-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase text-gray-500 font-semibold">
                      Selected Cluster
                    </p>

                    <p className="text-2xl font-bold mt-1">
                      {selectedKeyword.keyword}
                    </p>
                  </div>

                  <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                    <Flame size={22} />
                  </div>
                </div>

                <p className="text-sm text-gray-500 mt-3">
                  {formatNumber(selectedKeyword.video_count)} videos ·{" "}
                  {formatNumber(selectedKeyword.total_views)} views · Trend{" "}
                  {Number(selectedKeyword.trend_score || 0)}
                </p>

                <div className="space-y-3 mt-4">
                  <ScoreBar
                    label="Traffic"
                    value={Number(selectedKeyword.traffic_score || 0)}
                  />

                  <ScoreBar
                    label="Velocity"
                    value={Number(selectedKeyword.velocity_score || 0)}
                  />

                  <ScoreBar
                    label="Opportunity"
                    value={Number(selectedKeyword.opportunity_score || 0)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-4 max-h-[720px] overflow-auto pr-1">
              {selectedMatches.map((match) => (
                <div
                  key={match.id}
                  className="bg-white rounded-2xl border p-4"
                >
                  {match.thumbnail_url ? (
                    <img
                      src={match.thumbnail_url}
                      alt={match.video_title || "Video thumbnail"}
                      className="w-full aspect-video object-cover rounded-xl border bg-gray-100"
                    />
                  ) : (
                    <div className="w-full aspect-video rounded-xl border bg-gray-50 flex items-center justify-center text-gray-400">
                      <ImageIcon size={24} />
                    </div>
                  )}

                  <p className="font-semibold mt-3 leading-5">
                    {match.video_title || "-"}
                  </p>

                  <p className="text-xs text-gray-500 mt-2">
                    {match.channel_title || "-"} ·{" "}
                    {formatNumber(match.view_count)} views ·{" "}
                    {formatNumber(match.views_per_day)} views/day
                  </p>

                  <p className="text-xs text-gray-400 mt-1">
                    Published: {formatDate(match.published_at)} · Source:{" "}
                    {match.match_source || "-"}
                  </p>

                  {match.video_url && (
                    <a
                      href={match.video_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 mt-3"
                    >
                      Open YouTube
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              ))}

              {selectedMatches.length === 0 && (
                <div className="bg-white rounded-2xl border p-6 text-sm text-gray-500">
                  Select a keyword cluster to see which videos and channels use it.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}