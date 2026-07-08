"use client";

import { useMemo, useState } from "react";
import type { Idea } from "@/types/idea";
import DeleteIdeaButton from "./DeleteIdeaButton";
import EditIdeaButton from "./EditIdeaButton";

type Props = {
  ideas: Idea[];
};

type SortKey =
  | "score"
  | "views"
  | "ctr"
  | "revenue"
  | "updated_at";

type SortDirection = "asc" | "desc";

const statusStyles: Record<string, string> = {
  Idea: "bg-blue-50 text-blue-700 border-blue-100",
  Draft: "bg-yellow-50 text-yellow-700 border-yellow-100",
  Editing: "bg-purple-50 text-purple-700 border-purple-100",
  Published: "bg-green-50 text-green-700 border-green-100",
  Rejected: "bg-red-50 text-red-700 border-red-100",
};

function formatNumber(value: number | null) {
  return Number(value || 0).toLocaleString("en-US");
}

function formatPercent(value: number | null) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatMoney(value: number | null) {
  return `$${Number(value || 0).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
}

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function SortButton({
  label,
  sortKey,
  currentKey,
  direction,
  onClick,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  direction: SortDirection;
  onClick: (key: SortKey) => void;
}) {
  const active = currentKey === sortKey;

  return (
    <button
      onClick={() => onClick(sortKey)}
      className="inline-flex items-center gap-1 hover:text-black"
    >
      {label}
      <span className="text-xs">
        {active ? (direction === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </button>
  );
}

export default function IdeaBank({ ideas }: Props) {
  const [search, setSearch] = useState("");
  const [theme, setTheme] = useState("All");
  const [status, setStatus] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortDirection, setSortDirection] =
    useState<SortDirection>("desc");

  const themes = useMemo(() => {
    return [
      "All",
      ...Array.from(
        new Set(
          ideas
            .map((idea) => idea.theme)
            .filter(Boolean)
        )
      ),
    ] as string[];
  }, [ideas]);

  const statuses = useMemo(() => {
    return [
      "All",
      ...Array.from(
        new Set(
          ideas
            .map((idea) => idea.status)
            .filter(Boolean)
        )
      ),
    ] as string[];
  }, [ideas]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((current) =>
        current === "asc" ? "desc" : "asc"
      );
      return;
    }

    setSortKey(key);
    setSortDirection("desc");
  }

  const filteredIdeas = ideas.filter((idea) => {
    const matchesSearch = idea.title
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesTheme =
      theme === "All" || idea.theme === theme;

    const matchesStatus =
      status === "All" || idea.status === status;

    return matchesSearch && matchesTheme && matchesStatus;
  });

  const sortedIdeas = [...filteredIdeas].sort((a, b) => {
    if (sortKey === "updated_at") {
      const aTime = new Date(a.updated_at || a.created_at).getTime();
      const bTime = new Date(b.updated_at || b.created_at).getTime();

      return sortDirection === "asc"
        ? aTime - bTime
        : bTime - aTime;
    }

    const aValue = Number(a[sortKey] || 0);
    const bValue = Number(b[sortKey] || 0);

    return sortDirection === "asc"
      ? aValue - bValue
      : bValue - aValue;
  });

  return (
    <div className="bg-white rounded-2xl shadow overflow-hidden">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Idea Bank</h2>

            <p className="text-gray-500 text-sm mt-1">
              Track themes, language, status and performance.
            </p>
          </div>

          <div className="text-sm text-gray-500">
            {formatNumber(sortedIdeas.length)} / {formatNumber(ideas.length)} ideas
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-6">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by title..."
            className="border rounded-xl px-4 py-2 w-80"
          />

          <select
            value={theme}
            onChange={(event) => setTheme(event.target.value)}
            className="border rounded-xl px-4 py-2"
          >
            {themes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="border rounded-xl px-4 py-2"
          >
            {statuses.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-left p-4 min-w-72">Title</th>
              <th className="text-left p-4">Theme</th>
              <th className="text-left p-4">Language</th>
              <th className="text-left p-4">Status</th>

              <th className="text-left p-4">
                <SortButton
                  label="Score"
                  sortKey="score"
                  currentKey={sortKey}
                  direction={sortDirection}
                  onClick={handleSort}
                />
              </th>

              <th className="text-left p-4">
                <SortButton
                  label="Views"
                  sortKey="views"
                  currentKey={sortKey}
                  direction={sortDirection}
                  onClick={handleSort}
                />
              </th>

              <th className="text-left p-4">
                <SortButton
                  label="CTR"
                  sortKey="ctr"
                  currentKey={sortKey}
                  direction={sortDirection}
                  onClick={handleSort}
                />
              </th>

              <th className="text-left p-4">
                <SortButton
                  label="Revenue"
                  sortKey="revenue"
                  currentKey={sortKey}
                  direction={sortDirection}
                  onClick={handleSort}
                />
              </th>

              <th className="text-left p-4">
                <SortButton
                  label="Updated"
                  sortKey="updated_at"
                  currentKey={sortKey}
                  direction={sortDirection}
                  onClick={handleSort}
                />
              </th>

              <th className="text-left p-4">Actions</th>
            </tr>
          </thead>

          <tbody>
            {sortedIdeas.map((idea) => {
              const statusName = idea.status || "Idea";
              const statusClass =
                statusStyles[statusName] ||
                "bg-gray-50 text-gray-700 border-gray-100";

              return (
                <tr
                  key={idea.id}
                  className="border-t hover:bg-gray-50"
                >
                  <td className="p-4 font-medium">
                    <div>{idea.title}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      ID #{idea.id}
                    </div>
                  </td>

                  <td className="p-4">
                    <span className="px-3 py-1 rounded-full bg-zinc-100 text-zinc-700">
                      {idea.theme || "-"}
                    </span>
                  </td>

                  <td className="p-4">
                    {idea.language || "-"}
                  </td>

                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full border text-xs font-medium ${statusClass}`}
                    >
                      {statusName}
                    </span>
                  </td>

                  <td className="p-4 font-semibold">
                    {idea.score || 0}
                  </td>

                  <td className="p-4">
                    {formatNumber(idea.views)}
                  </td>

                  <td className="p-4">
                    {formatPercent(idea.ctr)}
                  </td>

                  <td className="p-4">
                    {formatMoney(idea.revenue)}
                  </td>

                  <td className="p-4 text-gray-500">
                    {formatDate(idea.updated_at || idea.created_at)}
                  </td>

                  <td className="p-4">
                    <div className="flex items-center gap-4">
                      <EditIdeaButton idea={idea} />

                      <DeleteIdeaButton
                        ideaId={idea.id}
                        title={idea.title}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}

            {sortedIdeas.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="p-8 text-center text-gray-500"
                >
                  No ideas found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}