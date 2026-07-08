"use client";

import { useMemo, useState } from "react";
import type { Idea } from "@/types/idea";
import DeleteIdeaButton from "./DeleteIdeaButton";

type Props = {
  ideas: Idea[];
};

export default function IdeaBank({ ideas }: Props) {
  const [search, setSearch] = useState("");
  const [theme, setTheme] = useState("All");
  const [status, setStatus] = useState("All");

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
            {filteredIdeas.length} / {ideas.length} ideas
          </div>
        </div>

        <div className="flex gap-3 mt-6">
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

      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500">
          <tr>
            <th className="text-left p-4">Title</th>
            <th className="text-left p-4">Theme</th>
            <th className="text-left p-4">Language</th>
            <th className="text-left p-4">Status</th>
            <th className="text-left p-4">Score</th>
            <th className="text-left p-4">Views</th>
            <th className="text-left p-4">CTR</th>
            <th className="text-left p-4">Revenue</th>
            <th className="text-left p-4">Actions</th>
          </tr>
        </thead>

        <tbody>
          {filteredIdeas.map((idea) => (
            <tr
              key={idea.id}
              className="border-t hover:bg-gray-50"
            >
              <td className="p-4 font-medium">
                {idea.title}
              </td>

              <td className="p-4">
                {idea.theme || "-"}
              </td>

              <td className="p-4">
                {idea.language || "-"}
              </td>

              <td className="p-4">
                <span className="px-3 py-1 rounded-full bg-gray-100">
                  {idea.status || "Idea"}
                </span>
              </td>

              <td className="p-4 font-semibold">
                {idea.score || 0}
              </td>

              <td className="p-4">
                {Number(idea.views || 0).toLocaleString()}
              </td>

              <td className="p-4">
                {Number(idea.ctr || 0).toFixed(1)}%
              </td>

              <td className="p-4">
                ${Number(idea.revenue || 0).toFixed(0)}
              </td>

              <td className="p-4">
                <DeleteIdeaButton
                  ideaId={idea.id}
                  title={idea.title}
                />
              </td>
            </tr>
          ))}

          {filteredIdeas.length === 0 && (
            <tr>
              <td
                colSpan={9}
                className="p-8 text-center text-gray-500"
              >
                No ideas found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}