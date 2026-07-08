"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Copy, X, Sparkles, Save } from "lucide-react";
import type { Idea } from "@/types/idea";
import { supabase } from "@/lib/supabase";

type Props = {
  idea: Idea;
};

type ImprovedBrief = {
  hook: string;
  thumbnail_prompt: string;
  storyline: string;
  notes: string;
};

function parseJsonSafely(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function DetailBlock({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
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
    <div className="rounded-2xl border bg-gray-50 p-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-xs font-semibold uppercase text-gray-500">
          {label}
        </p>

        {value && (
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-black"
          >
            <Copy size={14} />
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>

      <p className="text-sm leading-6 whitespace-pre-wrap">
        {value || "-"}
      </p>
    </div>
  );
}

export default function ViewIdeaButton({ idea }: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);

  const [hook, setHook] = useState(idea.hook || "");
  const [thumbnailPrompt, setThumbnailPrompt] = useState(
    idea.thumbnail_prompt || ""
  );
  const [storyline, setStoryline] = useState(
    idea.storyline || ""
  );
  const [notes, setNotes] = useState(idea.notes || "");

  const [improvedBrief, setImprovedBrief] =
    useState<ImprovedBrief | null>(null);

  const [improving, setImproving] = useState(false);
  const [savingImproved, setSavingImproved] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleImproveBrief() {
    setImproving(true);
    setErrorMessage("");
    setImprovedBrief(null);

    try {
      const response = await fetch("/api/improve-brief", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: idea.title,
          theme: idea.theme,
          language: idea.language,
          hook,
          thumbnail_prompt: thumbnailPrompt,
          storyline,
          notes,
        }),
      });

      const text = await response.text();
      const result = text ? parseJsonSafely(text) : null;

      setImproving(false);

      if (!result) {
        setErrorMessage(
          "AI Improve API did not return valid JSON. Please check app/api/improve-brief/route.ts and restart the dev server."
        );
        return;
      }

      if (!response.ok) {
        setErrorMessage(result.error || "Failed to improve brief.");
        return;
      }

      if (!result.brief) {
        setErrorMessage("AI response is missing brief data.");
        return;
      }

      setImprovedBrief(result.brief);
    } catch (error) {
      setImproving(false);

      const message =
        error instanceof Error ? error.message : "Unknown error";

      setErrorMessage(message);
    }
  }

  async function handleSaveImprovedBrief() {
    if (!improvedBrief) return;

    setSavingImproved(true);
    setErrorMessage("");

    const { error } = await supabase
      .from("ideas")
      .update({
        hook: improvedBrief.hook,
        thumbnail_prompt: improvedBrief.thumbnail_prompt,
        storyline: improvedBrief.storyline,
        notes: improvedBrief.notes,
      })
      .eq("id", idea.id);

    setSavingImproved(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setHook(improvedBrief.hook);
    setThumbnailPrompt(improvedBrief.thumbnail_prompt);
    setStoryline(improvedBrief.storyline);
    setNotes(improvedBrief.notes);
    setImprovedBrief(null);

    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
      >
        <Eye size={16} />
        View
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-5xl max-h-[90vh] overflow-auto rounded-2xl shadow-xl">
            <div className="sticky top-0 bg-white border-b p-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">
                  {idea.title}
                </h2>

                <p className="text-sm text-gray-500 mt-2">
                  {idea.theme || "-"} · {idea.language || "-"} · {idea.status || "Idea"} · Score {idea.score || 0}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleImproveBrief}
                  disabled={improving}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  <Sparkles size={16} />
                  {improving ? "Improving..." : "AI Improve Brief"}
                </button>

                <button
                  onClick={() => setOpen(false)}
                  className="w-9 h-9 rounded-xl border flex items-center justify-center hover:bg-gray-50"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {errorMessage && (
                <div className="rounded-xl border border-red-100 bg-red-50 text-red-700 p-4 text-sm">
                  {errorMessage}
                </div>
              )}

              <DetailBlock
                label="Hook"
                value={hook}
              />

              <DetailBlock
                label="Thumbnail Prompt"
                value={thumbnailPrompt}
              />

              <DetailBlock
                label="Storyline"
                value={storyline}
              />

              <DetailBlock
                label="Notes"
                value={notes}
              />

              {improvedBrief && (
                <div className="rounded-2xl border-2 border-zinc-900 p-5 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold">
                        AI Improved Brief Preview
                      </h3>

                      <p className="text-sm text-gray-500 mt-1">
                        Review the improved version before saving.
                      </p>
                    </div>

                    <button
                      onClick={handleSaveImprovedBrief}
                      disabled={savingImproved}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50"
                    >
                      <Save size={16} />
                      {savingImproved
                        ? "Saving..."
                        : "Save Improved Brief"}
                    </button>
                  </div>

                  <DetailBlock
                    label="Improved Hook"
                    value={improvedBrief.hook}
                  />

                  <DetailBlock
                    label="Improved Thumbnail Prompt"
                    value={improvedBrief.thumbnail_prompt}
                  />

                  <DetailBlock
                    label="Improved Storyline"
                    value={improvedBrief.storyline}
                  />

                  <DetailBlock
                    label="Improved Notes"
                    value={improvedBrief.notes}
                  />
                </div>
              )}

              <div className="grid grid-cols-4 gap-4 pt-2">
                <div className="rounded-2xl border p-4">
                  <p className="text-xs text-gray-500 uppercase">
                    Views
                  </p>
                  <p className="text-lg font-bold mt-1">
                    {Number(idea.views || 0).toLocaleString("en-US")}
                  </p>
                </div>

                <div className="rounded-2xl border p-4">
                  <p className="text-xs text-gray-500 uppercase">
                    CTR
                  </p>
                  <p className="text-lg font-bold mt-1">
                    {Number(idea.ctr || 0).toFixed(1)}%
                  </p>
                </div>

                <div className="rounded-2xl border p-4">
                  <p className="text-xs text-gray-500 uppercase">
                    RPM
                  </p>
                  <p className="text-lg font-bold mt-1">
                    ${Number(idea.rpm || 0).toFixed(2)}
                  </p>
                </div>

                <div className="rounded-2xl border p-4">
                  <p className="text-xs text-gray-500 uppercase">
                    Revenue
                  </p>
                  <p className="text-lg font-bold mt-1">
                    ${Number(idea.revenue || 0).toLocaleString("en-US")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}