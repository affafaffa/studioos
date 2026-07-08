"use client";

import { useState } from "react";
import { Eye, Copy, X } from "lucide-react";
import type { Idea } from "@/types/idea";

type Props = {
  idea: Idea;
};

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
  const [open, setOpen] = useState(false);

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
          <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-auto rounded-2xl shadow-xl">
            <div className="sticky top-0 bg-white border-b p-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">
                  {idea.title}
                </h2>

                <p className="text-sm text-gray-500 mt-2">
                  {idea.theme || "-"} · {idea.language || "-"} · {idea.status || "Idea"} · Score {idea.score || 0}
                </p>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-xl border flex items-center justify-center hover:bg-gray-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <DetailBlock
                label="Hook"
                value={idea.hook}
              />

              <DetailBlock
                label="Thumbnail Prompt"
                value={idea.thumbnail_prompt}
              />

              <DetailBlock
                label="Storyline"
                value={idea.storyline}
              />

              <DetailBlock
                label="Notes"
                value={idea.notes}
              />

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