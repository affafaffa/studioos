"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AddIdeaButton() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState("Huntrix");
  const [language, setLanguage] = useState("EN");
  const [status, setStatus] = useState("Idea");
  const [score, setScore] = useState(80);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setErrorMessage("Title is required.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const { error } = await supabase.from("ideas").insert({
      title,
      theme,
      language,
      status,
      score,
      views: 0,
      ctr: 0,
      rpm: 0,
      revenue: 0,
    });

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setTitle("");
    setTheme("Huntrix");
    setLanguage("EN");
    setStatus("Idea");
    setScore(80);
    setOpen(false);

    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-zinc-900 text-white px-5 py-3 rounded-xl hover:bg-zinc-800 transition"
      >
        + New Idea
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">New Idea</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Add a new YouTube content idea to StudioOS.
                </p>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-black"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Title
                </label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Gold vs Silver Huntrix..."
                  className="w-full border rounded-xl px-4 py-3"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Theme
                  </label>
                  <select
                    value={theme}
                    onChange={(event) => setTheme(event.target.value)}
                    className="w-full border rounded-xl px-4 py-3"
                  >
                    <option>Huntrix</option>
                    <option>Mermaid</option>
                    <option>Princess</option>
                    <option>School</option>
                    <option>Fashion</option>
                    <option>Rainbow</option>
                    <option>Magic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(event) => setLanguage(event.target.value)}
                    className="w-full border rounded-xl px-4 py-3"
                  >
                    <option>EN</option>
                    <option>JP</option>
                    <option>ES</option>
                    <option>PT</option>
                    <option>FR</option>
                    <option>DE</option>
                    <option>VI</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="w-full border rounded-xl px-4 py-3"
                  >
                    <option>Idea</option>
                    <option>Draft</option>
                    <option>Editing</option>
                    <option>Published</option>
                    <option>Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Score
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={score}
                    onChange={(event) => setScore(Number(event.target.value))}
                    className="w-full border rounded-xl px-4 py-3"
                  />
                </div>
              </div>

              {errorMessage && (
                <p className="text-sm text-red-600">
                  {errorMessage}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-5 py-3 rounded-xl border"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-3 rounded-xl bg-zinc-900 text-white disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save Idea"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}