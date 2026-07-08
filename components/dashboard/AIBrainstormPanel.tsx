"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Save, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { findMostSimilarIdea } from "@/lib/duplicate";
import type { Idea } from "@/types/idea";

type GeneratedIdea = {
  title: string;
  theme: string;
  language: string;
  status: string;
  score: number;
  hook: string;
  thumbnail_prompt: string;
  storyline: string;
  notes: string;
};

type Props = {
  existingIdeas: Idea[];
};

export default function AIBrainstormPanel({
  existingIdeas,
}: Props) {
  const router = useRouter();

  const [theme, setTheme] = useState("Huntrix");
  const [language, setLanguage] = useState("EN");
  const [count, setCount] = useState(10);
  const [ideas, setIdeas] = useState<GeneratedIdea[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingTitle, setSavingTitle] = useState("");
  const [savingAll, setSavingAll] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const ideaWithDuplicateInfo = useMemo(() => {
    return ideas.map((idea) => {
      const duplicate = findMostSimilarIdea(
        idea.title,
        existingIdeas
      );

      return {
        idea,
        duplicate,
      };
    });
  }, [ideas, existingIdeas]);

  const safeIdeas = ideaWithDuplicateInfo
    .filter((item) => !item.duplicate.isDuplicate)
    .map((item) => item.idea);

  const duplicateIdeas = ideaWithDuplicateInfo
    .filter((item) => item.duplicate.isDuplicate)
    .map((item) => item.idea);

  async function handleGenerate() {
    setLoading(true);
    setErrorMessage("");
    setIdeas([]);

    const response = await fetch("/api/brainstorm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        theme,
        language,
        count,
      }),
    });

    const result = await response.json();

    setLoading(false);

    if (!response.ok) {
      setErrorMessage(result.error || "Failed to generate ideas.");
      return;
    }

    setIdeas(result.ideas || []);
  }

  async function saveIdeasToSupabase(
    ideasToSave: GeneratedIdea[]
  ) {
    const payload = ideasToSave.map((idea) => ({
      title: idea.title,
      theme: idea.theme,
      language: idea.language,
      status: idea.status || "Idea",
      score: idea.score || 80,
      views: 0,
      ctr: 0,
      rpm: 0,
      revenue: 0,
      notes: idea.notes || "",
      hook: idea.hook || "",
      thumbnail_prompt: idea.thumbnail_prompt || "",
      storyline: idea.storyline || "",
    }));

    const { error } = await supabase
      .from("ideas")
      .insert(payload);

    return error;
  }

  async function handleSaveIdea(idea: GeneratedIdea) {
    const duplicate = findMostSimilarIdea(
      idea.title,
      existingIdeas
    );

    if (duplicate.isDuplicate) {
      const confirmed = window.confirm(
        `This AI idea looks similar to an existing idea.\n\nExisting: ${duplicate.idea?.title}\nSimilarity: ${duplicate.percentage}%\n\nSave anyway?`
      );

      if (!confirmed) return;
    }

    setSavingTitle(idea.title);

    const error = await saveIdeasToSupabase([idea]);

    setSavingTitle("");

    if (error) {
      alert(error.message);
      return;
    }

    setIdeas((current) =>
      current.filter((item) => item.title !== idea.title)
    );

    router.refresh();
  }

  async function handleSaveAllSafeIdeas() {
    if (safeIdeas.length === 0) {
      alert("No safe ideas to save.");
      return;
    }

    const confirmed = window.confirm(
      `Save ${safeIdeas.length} safe ideas?\n\n${duplicateIdeas.length} duplicate ideas will be skipped.`
    );

    if (!confirmed) return;

    setSavingAll(true);

    const error = await saveIdeasToSupabase(safeIdeas);

    setSavingAll(false);

    if (error) {
      alert(error.message);
      return;
    }

    setIdeas((current) =>
      current.filter((idea) =>
        duplicateIdeas.some(
          (duplicateIdea) => duplicateIdea.title === idea.title
        )
      )
    );

    router.refresh();
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6 mb-8">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center">
            <Bot size={20} />
          </div>

          <div>
            <h2 className="text-xl font-bold">AI Brainstorm</h2>
            <p className="text-sm text-gray-500">
              Generate titles, hooks, thumbnail prompts and storylines.
            </p>
          </div>
        </div>

        {ideas.length > 0 && (
          <div className="text-sm text-gray-500 text-right">
            <div>{safeIdeas.length} safe ideas</div>
            <div>{duplicateIdeas.length} possible duplicates</div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={theme}
          onChange={(event) => setTheme(event.target.value)}
          className="border rounded-xl px-4 py-3"
        >
          <option>Huntrix</option>
          <option>Mermaid</option>
          <option>Princess</option>
          <option>School</option>
          <option>Fashion</option>
          <option>Rainbow</option>
          <option>Magic</option>
        </select>

        <select
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
          className="border rounded-xl px-4 py-3"
        >
          <option>EN</option>
          <option>JP</option>
          <option>ES</option>
          <option>PT</option>
          <option>FR</option>
          <option>DE</option>
          <option>VI</option>
        </select>

        <input
          type="number"
          min="3"
          max="20"
          value={count}
          onChange={(event) => setCount(Number(event.target.value))}
          className="border rounded-xl px-4 py-3 w-28"
        />

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="bg-zinc-900 text-white px-5 py-3 rounded-xl disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate Ideas"}
        </button>

        {ideas.length > 0 && (
          <button
            onClick={handleSaveAllSafeIdeas}
            disabled={savingAll || safeIdeas.length === 0}
            className="border px-5 py-3 rounded-xl hover:bg-gray-50 disabled:opacity-50"
          >
            {savingAll
              ? "Saving..."
              : `Save All Safe (${safeIdeas.length})`}
          </button>
        )}
      </div>

      {errorMessage && (
        <p className="text-red-600 text-sm mt-4">
          {errorMessage}
        </p>
      )}

      {ideas.length > 0 && (
        <div className="mt-6 space-y-4">
          {ideaWithDuplicateInfo.map(({ idea, duplicate }) => {
            const isDuplicate = duplicate.isDuplicate;

            return (
              <div
                key={idea.title}
                className={`border rounded-2xl p-5 flex items-start justify-between gap-4 ${
                  isDuplicate
                    ? "border-red-100 bg-red-50/40"
                    : "bg-white"
                }`}
              >
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">
                        {idea.title}
                      </h3>

                      {isDuplicate && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                          <ShieldAlert size={13} />
                          Duplicate risk
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-500 mt-1">
                      {idea.theme} · {idea.language} · Score {idea.score}
                    </p>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase">
                      Hook
                    </p>
                    <p className="text-sm mt-1">
                      {idea.hook}
                    </p>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase">
                      Thumbnail Prompt
                    </p>
                    <p className="text-sm mt-1">
                      {idea.thumbnail_prompt}
                    </p>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase">
                      Storyline
                    </p>
                    <p className="text-sm mt-1">
                      {idea.storyline}
                    </p>
                  </div>

                  <p className="text-sm text-gray-600">
                    {idea.notes}
                  </p>

                  {duplicate.idea && (
                    <div
                      className={`rounded-xl border p-3 text-sm ${
                        duplicate.isDuplicate
                          ? "bg-red-50 text-red-700 border-red-100"
                          : "bg-yellow-50 text-yellow-700 border-yellow-100"
                      }`}
                    >
                      <p className="font-semibold">
                        {duplicate.isDuplicate
                          ? "Possible duplicate detected"
                          : "Similar idea found"}
                      </p>

                      <p className="mt-1">
                        Similar to:{" "}
                        <span className="font-medium">
                          {duplicate.idea.title}
                        </span>
                      </p>

                      <p className="mt-1">
                        Similarity: {duplicate.percentage}%
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleSaveIdea(idea)}
                  disabled={savingTitle === idea.title}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border hover:bg-gray-50 disabled:opacity-50 shrink-0"
                >
                  <Save size={16} />
                  {savingTitle === idea.title ? "Saving..." : "Save"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}