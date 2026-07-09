"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  Lightbulb,
  Save,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { CompetitorVideo } from "@/types/competitor";

type Props = {
  video: CompetitorVideo;
  channelName: string;
  groupName: string;
};

type RemixIdea = {
  title: string;
  theme: string;
  language: string;
  hook: string;
  thumbnail_prompt: string;
  storyline: string;
  notes: string;
  score: number;

  source_keywords: string[];
  keyword_strategy: string;
  market_angle: string;
  search_intent: string;
  differentiation_note: string;
};

type KeywordPack = {
  selectedKeywords?: string[];
  breakoutKeywords?: {
    keyword: string;
    market_stage: string;
    breakout_score: number;
    views_per_day: number;
  }[];
  growthKeywords?: {
    keyword: string;
    growth_score: number;
    discovery_reason: string;
  }[];
  adoptionKeywords?: {
    keyword: string;
    adoption_score: number;
    channel_count: number;
  }[];
};

function getBestThumbnail(video?: CompetitorVideo | null) {
  if (!video) return "";

  return (
    video.thumbnail_maxres_url ||
    video.thumbnail_standard_url ||
    video.thumbnail_high_url ||
    video.thumbnail_medium_url ||
    video.thumbnail_url ||
    video.thumbnail_default_url ||
    ""
  );
}

function formatNumber(value: number | null | undefined) {
  return Number(value || 0).toLocaleString("en-US");
}

function DetailBlock({
  label,
  value,
}: {
  label: string;
  value: string;
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

        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-black"
        >
          <Copy size={14} />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <p className="text-sm leading-6 whitespace-pre-wrap">
        {value || "-"}
      </p>
    </div>
  );
}

function KeywordPills({ keywords }: { keywords: string[] }) {
  if (keywords.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No keyword radar phrases attached.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {keywords.map((keyword) => (
        <span
          key={keyword}
          className="rounded-full border bg-purple-50 text-purple-700 border-purple-100 px-3 py-1 text-xs font-medium"
        >
          {keyword}
        </span>
      ))}
    </div>
  );
}

export default function RemixCompetitorVideoButton({
  video,
  channelName,
  groupName,
}: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [remixIdea, setRemixIdea] = useState<RemixIdea | null>(null);
  const [keywordPack, setKeywordPack] = useState<KeywordPack | null>(null);

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [modeMessage, setModeMessage] = useState("");

  async function handleGenerateRemix() {
    setOpen(true);
    setGenerating(true);
    setErrorMessage("");
    setSavedMessage("");
    setModeMessage("");
    setRemixIdea(null);
    setKeywordPack(null);

    try {
      const response = await fetch("/api/remix-competitor-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          competitorVideoId: video.id,
          title: video.title,
          theme: video.theme,
          idea_type: video.idea_type,
          hook_type: video.hook_type,
          title_formula: video.title_formula,
          thumbnail_style: video.thumbnail_style,
          channel_name: channelName,
          group_name: groupName,
          view_count: video.view_count,
        }),
      });

      const result = await response.json();

      setGenerating(false);

      if (!response.ok || !result.idea) {
        setErrorMessage(result.error || "Failed to remix competitor video.");
        return;
      }

      setRemixIdea(result.idea);
      setKeywordPack(result.keywordPack || null);

      if (result.mode === "mock") {
        setModeMessage(
          "Mock mode is on. Remix V2 used Keyword Radar logic but not OpenAI."
        );
      }

      if (result.mode === "fallback") {
        setModeMessage(
          `AI fallback used. ${result.warning || ""}`
        );
      }
    } catch (error) {
      setGenerating(false);

      const message =
        error instanceof Error ? error.message : "Unknown remix error";

      setErrorMessage(message);
    }
  }

  async function handleSaveToIdeaBank() {
    if (!remixIdea) return;

    setSaving(true);
    setErrorMessage("");
    setSavedMessage("");

    const sourceThumbnailUrl = getBestThumbnail(video);

    const keywordList = remixIdea.source_keywords || [];

    const fullNotes = `${remixIdea.notes}

Market Keyword Strategy:
${remixIdea.keyword_strategy}

Market Angle:
${remixIdea.market_angle}

Search Intent:
${remixIdea.search_intent}

Differentiation:
${remixIdea.differentiation_note}

Keyword Radar Phrases:
${keywordList.map((keyword) => `- ${keyword}`).join("\n")}

Source competitor video:
${video.title}

Source URL:
${video.video_url || "-"}

Source channel:
${channelName || "-"}

Source group:
${groupName || "-"}

Source public views:
${Number(video.view_count || 0).toLocaleString("en-US")}

Reminder:
This is a market-pattern remix. Do not copy the competitor title, thumbnail, characters, or exact scenes.`;

    const { data: ideaData, error: ideaError } = await supabase
      .from("ideas")
      .insert({
        title: remixIdea.title,
        theme: remixIdea.theme,
        language: remixIdea.language || "EN",
        status: "Idea",
        score: remixIdea.score || 90,
        views: 0,
        ctr: 0,
        rpm: 0,
        revenue: 0,
        hook: remixIdea.hook,
        thumbnail_prompt: remixIdea.thumbnail_prompt,
        storyline: remixIdea.storyline,
        notes: fullNotes,
      })
      .select("id")
      .single();

    if (ideaError) {
      setSaving(false);
      setErrorMessage(ideaError.message);
      return;
    }

    const { error: remixError } = await supabase
      .from("competitor_remixes")
      .insert({
        competitor_video_id: video.id,
        saved_idea_id: ideaData?.id || null,

        source_title: video.title,
        source_video_url: video.video_url,
        source_channel: channelName,
        source_group: groupName,
        source_thumbnail_url: sourceThumbnailUrl || null,
        source_view_count: Number(video.view_count || 0),
        source_published_at: video.published_at || null,

        remixed_title: remixIdea.title,
        theme: remixIdea.theme,
        language: remixIdea.language || "EN",
        hook: remixIdea.hook,
        thumbnail_prompt: remixIdea.thumbnail_prompt,
        storyline: remixIdea.storyline,
        notes: fullNotes,
        score: remixIdea.score || 90,
        status: "Saved",

        source_keywords: keywordList,
        remix_strategy: remixIdea.keyword_strategy,
        market_angle: remixIdea.market_angle,
        search_intent: remixIdea.search_intent,
        differentiation_note: remixIdea.differentiation_note,
        keyword_context: keywordPack || {},
      });

    if (remixError) {
      setSaving(false);
      setErrorMessage(remixError.message);
      return;
    }

    setSaving(false);
    setSavedMessage("Saved to Idea Bank and Remix Lab with Keyword Radar strategy.");
    router.refresh();
  }

  return (
    <>
      <button
        onClick={handleGenerateRemix}
        className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-800"
      >
        <Sparkles size={16} />
        Remix V2
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-6xl max-h-[90vh] overflow-auto rounded-2xl shadow-xl">
            <div className="sticky top-0 bg-white border-b p-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">
                  Remix V2 with Keyword Radar
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Generate an original idea using competitor video signals plus rising market keywords.
                </p>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-xl border flex items-center justify-center hover:bg-gray-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="rounded-2xl border p-5">
                <p className="text-xs font-semibold uppercase text-gray-500">
                  Source Competitor Video
                </p>

                <h3 className="font-bold mt-2">
                  {video.title}
                </h3>

                <p className="text-sm text-gray-500 mt-2">
                  {groupName || "-"} · {channelName || "-"} ·{" "}
                  {formatNumber(video.view_count)} views
                </p>

                <p className="text-sm text-gray-500 mt-1">
                  {video.theme || "-"} · {video.idea_type || "-"} ·{" "}
                  {video.hook_type || "-"}
                </p>
              </div>

              {generating && (
                <div className="rounded-2xl border bg-gray-50 p-6 text-sm text-gray-600">
                  Generating strategic remix from Keyword Radar...
                </div>
              )}

              {modeMessage && (
                <div className="rounded-xl border border-yellow-100 bg-yellow-50 text-yellow-700 p-4 text-sm">
                  {modeMessage}
                </div>
              )}

              {errorMessage && (
                <div className="rounded-xl border border-red-100 bg-red-50 text-red-700 p-4 text-sm">
                  {errorMessage}
                </div>
              )}

              {savedMessage && (
                <div className="rounded-xl border border-green-100 bg-green-50 text-green-700 p-4 text-sm">
                  {savedMessage}
                </div>
              )}

              {keywordPack && (
                <div className="rounded-2xl border p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp size={18} className="text-purple-600" />

                    <h3 className="font-bold">
                      Keyword Radar Pack Used
                    </h3>
                  </div>

                  <KeywordPills
                    keywords={keywordPack.selectedKeywords || []}
                  />

                  <div className="grid grid-cols-3 gap-4 mt-5">
                    <div className="rounded-xl bg-gray-50 border p-4">
                      <p className="text-xs font-semibold uppercase text-gray-500">
                        Breakout
                      </p>

                      <p className="text-sm mt-2">
                        {(keywordPack.breakoutKeywords || [])
                          .slice(0, 3)
                          .map((item) => item.keyword)
                          .join(", ") || "-"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 border p-4">
                      <p className="text-xs font-semibold uppercase text-gray-500">
                        Growth
                      </p>

                      <p className="text-sm mt-2">
                        {(keywordPack.growthKeywords || [])
                          .slice(0, 3)
                          .map((item) => item.keyword)
                          .join(", ") || "-"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 border p-4">
                      <p className="text-xs font-semibold uppercase text-gray-500">
                        Adoption
                      </p>

                      <p className="text-sm mt-2">
                        {(keywordPack.adoptionKeywords || [])
                          .slice(0, 3)
                          .map((item) => item.keyword)
                          .join(", ") || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {remixIdea && (
                <div className="space-y-4">
                  <div className="rounded-2xl border-2 border-zinc-900 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase text-gray-500">
                          New Strategic Idea
                        </p>

                        <h3 className="text-2xl font-bold mt-2">
                          {remixIdea.title}
                        </h3>

                        <p className="text-sm text-gray-500 mt-2">
                          {remixIdea.theme} · {remixIdea.language || "EN"} · Score{" "}
                          {remixIdea.score || 90}
                        </p>
                      </div>

                      <button
                        onClick={handleSaveToIdeaBank}
                        disabled={saving}
                        className="inline-flex items-center gap-2 bg-zinc-900 text-white px-5 py-3 rounded-xl hover:bg-zinc-800 disabled:opacity-50"
                      >
                        <Save size={18} />
                        {saving ? "Saving..." : "Save to Idea Bank"}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border bg-purple-50 p-4">
                    <p className="text-xs font-semibold uppercase text-purple-700 mb-2">
                      Source Keywords
                    </p>

                    <KeywordPills keywords={remixIdea.source_keywords || []} />
                  </div>

                  <DetailBlock
                    label="Keyword Strategy"
                    value={remixIdea.keyword_strategy}
                  />

                  <DetailBlock
                    label="Market Angle"
                    value={remixIdea.market_angle}
                  />

                  <DetailBlock
                    label="Search Intent"
                    value={remixIdea.search_intent}
                  />

                  <DetailBlock
                    label="Differentiation Note"
                    value={remixIdea.differentiation_note}
                  />

                  <DetailBlock
                    label="Hook"
                    value={remixIdea.hook}
                  />

                  <DetailBlock
                    label="Thumbnail Prompt"
                    value={remixIdea.thumbnail_prompt}
                  />

                  <DetailBlock
                    label="Storyline"
                    value={remixIdea.storyline}
                  />

                  <DetailBlock
                    label="Notes"
                    value={remixIdea.notes}
                  />

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={handleGenerateRemix}
                      disabled={generating}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Lightbulb size={18} />
                      Generate Another Strategic Remix
                    </button>

                    <button
                      onClick={handleSaveToIdeaBank}
                      disabled={saving}
                      className="inline-flex items-center gap-2 bg-zinc-900 text-white px-5 py-3 rounded-xl hover:bg-zinc-800 disabled:opacity-50"
                    >
                      <Save size={18} />
                      {saving ? "Saving..." : "Save to Idea Bank"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}