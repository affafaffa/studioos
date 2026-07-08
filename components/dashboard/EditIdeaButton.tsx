"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Idea } from "@/types/idea";

type Props = {
  idea: Idea;
};

export default function EditIdeaButton({ idea }: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState(idea.title || "");
  const [theme, setTheme] = useState(idea.theme || "Huntrix");
  const [language, setLanguage] = useState(idea.language || "EN");
  const [status, setStatus] = useState(idea.status || "Idea");

  const [score, setScore] = useState(Number(idea.score || 0));
  const [views, setViews] = useState(Number(idea.views || 0));
  const [ctr, setCtr] = useState(Number(idea.ctr || 0));
  const [rpm, setRpm] = useState(Number(idea.rpm || 0));
  const [revenue, setRevenue] = useState(Number(idea.revenue || 0));

  const [hook, setHook] = useState(idea.hook || "");
  const [thumbnailPrompt, setThumbnailPrompt] = useState(
    idea.thumbnail_prompt || ""
  );
  const [storyline, setStoryline] = useState(
    idea.storyline || ""
  );
  const [notes, setNotes] = useState(idea.notes || "");

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

    const { error } = await supabase
      .from("ideas")
      .update({
        title,
        theme,
        language,
        status,
        score,
        views,
        ctr,
        rpm,
        revenue,
        hook,
        thumbnail_prompt: thumbnailPrompt,
        storyline,
        notes,
      })
      .eq("id", idea.id);

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 text-gray-600 hover:text-black"
      >
        <Pencil size={16} />
        Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-5xl max-h-[90vh] overflow-auto rounded-2xl shadow-xl">
            <div className="sticky top-0 bg-white border-b p-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">
                  Edit Idea
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Update title, performance data and AI brief.
                </p>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-xl border flex items-center justify-center hover:bg-gray-50"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Title
                </label>

                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full border rounded-xl px-4 py-3"
                />
              </div>

              <div className="grid grid-cols-4 gap-4">
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
                    onChange={(event) =>
                      setScore(Number(event.target.value))
                    }
                    className="w-full border rounded-xl px-4 py-3"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Views
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={views}
                    onChange={(event) =>
                      setViews(Number(event.target.value))
                    }
                    className="w-full border rounded-xl px-4 py-3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    CTR
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={ctr}
                    onChange={(event) =>
                      setCtr(Number(event.target.value))
                    }
                    className="w-full border rounded-xl px-4 py-3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    RPM
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={rpm}
                    onChange={(event) =>
                      setRpm(Number(event.target.value))
                    }
                    className="w-full border rounded-xl px-4 py-3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Revenue
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={revenue}
                    onChange={(event) =>
                      setRevenue(Number(event.target.value))
                    }
                    className="w-full border rounded-xl px-4 py-3"
                  />
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-bold mb-4">
                  AI Brief
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Hook
                    </label>

                    <textarea
                      value={hook}
                      onChange={(event) => setHook(event.target.value)}
                      rows={3}
                      placeholder="Gold vs Silver creates instant contrast..."
                      className="w-full border rounded-xl px-4 py-3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Thumbnail Prompt
                    </label>

                    <textarea
                      value={thumbnailPrompt}
                      onChange={(event) =>
                        setThumbnailPrompt(event.target.value)
                      }
                      rows={5}
                      placeholder="A high-contrast YouTube thumbnail..."
                      className="w-full border rounded-xl px-4 py-3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Storyline
                    </label>

                    <textarea
                      value={storyline}
                      onChange={(event) =>
                        setStoryline(event.target.value)
                      }
                      rows={5}
                      placeholder="The main character enters a visual challenge..."
                      className="w-full border rounded-xl px-4 py-3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Notes
                    </label>

                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      rows={4}
                      placeholder="Strong visual contrast, transformation hook..."
                      className="w-full border rounded-xl px-4 py-3"
                    />
                  </div>
                </div>
              </div>

              {errorMessage && (
                <p className="text-sm text-red-600">
                  {errorMessage}
                </p>
              )}

              <div className="sticky bottom-0 bg-white border-t pt-4 flex justify-end gap-3">
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
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}