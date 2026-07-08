"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";

type GeneratedIdea = {
  title: string;
  theme: string;
  language: string;
  status: string;
  score: number;
  notes: string;
};

export default function AIBrainstormPanel() {
  const router = useRouter();

  const [theme, setTheme] = useState("Huntrix");
  const [language, setLanguage] = useState("EN");
  const [count, setCount] = useState(10);
  const [ideas, setIdeas] = useState<GeneratedIdea[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingTitle, setSavingTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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

  async function handleSaveIdea(idea: GeneratedIdea) {
    setSavingTitle(idea.title);

    const { error } = await supabase.from("ideas").insert({
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
    });

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

  return (
    <div className="bg-white rounded-2xl shadow p-6 mb-8">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center">
          <Bot size={20} />
        </div>

        <div>
          <h2 className="text-xl font-bold">AI Brainstorm</h2>
          <p className="text-sm text-gray-500">
            Generate new YouTube ideas and save them to your Idea Bank.
          </p>
        </div>
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
      </div>

      {errorMessage && (
        <p className="text-red-600 text-sm mt-4">
          {errorMessage}
        </p>
      )}

      {ideas.length > 0 && (
        <div className="mt-6 space-y-3">
          {ideas.map((idea) => (
            <div
              key={idea.title}
              className="border rounded-2xl p-4 flex items-start justify-between gap-4"
            >
              <div>
                <h3 className="font-semibold">
                  {idea.title}
                </h3>

                <p className="text-sm text-gray-500 mt-1">
                  {idea.theme} · {idea.language} · Score {idea.score}
                </p>

                <p className="text-sm text-gray-600 mt-2">
                  {idea.notes}
                </p>
              </div>

              <button
                onClick={() => handleSaveIdea(idea)}
                disabled={savingTitle === idea.title}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border hover:bg-gray-50 disabled:opacity-50"
              >
                <Save size={16} />
                {savingTitle === idea.title ? "Saving..." : "Save"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}