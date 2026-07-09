"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Crown,
  GitBranch,
  Layers,
  Lightbulb,
  Loader2,
  Network,
  Save,
  Search,
  Sparkles,
  Target,
  WandSparkles,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Idea } from "@/types/idea";

type Props = {
  ideas: Idea[];
};

type GeneratedIdea = {
  title: string;
  theme: string;
  hook: string;
  thumbnail_prompt: string;
  storyline: string;
  notes: string;
  score: number;
  story_pillar: string;
  theme_cluster: string;
  niche: string;
  idea_angle: string;
  idea_formula: string;
  source_type: string;
  source_signal: string;
  priority_level: string;
  parent_path: string;
};

const defaultClusters = [
  "Poor vs Rich",
  "Makeover",
  "Adopted",
  "K-pop Demon Hunters",
  "Mermaid",
  "School Drama",
  "Princess Transformation",
  "Family Drama",
];

const defaultNichesByCluster: Record<string, string[]> = {
  "Poor vs Rich": [
    "Poor vs Rich vs Giga Rich",
    "Rich Girl vs Poor Girl",
    "Poor Family vs Giga Rich Family",
    "Poor Girl in Rich School",
  ],
  Makeover: [
    "Princess Makeover",
    "Mermaid Makeover",
    "From Nerd to Popular",
    "Broken Doll Makeover",
  ],
  Adopted: [
    "Adopted by Billionaire Family",
    "Poor Girl Adopted by Royal Family",
    "Adopted by K-pop Family",
    "Secret Heiress Adopted",
  ],
  "K-pop Demon Hunters": [
    "Huntrix Fashion Contest",
    "Secret Demon Hunter School",
    "K-pop Stage Transformation",
    "Demon Hunter Princess",
  ],
  Mermaid: [
    "Mermaid Princess Transformation",
    "Poor Mermaid vs Rich Mermaid",
    "Mermaid School Challenge",
    "Human Girl Becomes Mermaid",
  ],
  "School Drama": [
    "Poor Girl in Rich School",
    "Bullied Girl Becomes Popular",
    "School Talent Contest",
    "Secret Princess at School",
  ],
  "Princess Transformation": [
    "Poor Girl Becomes Princess",
    "Secret Royal Identity",
    "Princess Contest",
    "Royal Family Challenge",
  ],
  "Family Drama": [
    "Poor Sister vs Rich Sister",
    "Secret Billionaire Family",
    "Lost Daughter Returns",
    "Fake Daughter vs Real Daughter",
  ],
};

const marketSignalSuggestions = [
  "Huntrix",
  "K-pop Demon Hunters",
  "Fashion Contest",
  "Poor vs Rich vs Giga Rich",
  "Mermaid Makeover",
  "Princess Makeover",
  "From Nerd to Popular",
  "Adopted by Billionaire Family",
  "Secret Vampire Party",
  "School Talent Contest",
];

function cleanText(value: string | null | undefined, fallback: string) {
  const text = String(value || "").trim();

  return text || fallback;
}

function getPriorityClass(priority: string) {
  if (priority === "Focus") {
    return "bg-rose-600 text-white";
  }

  if (priority === "Test") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-slate-100 text-slate-600";
}

function getScoreClass(score: number) {
  if (score >= 92) return "text-rose-700 bg-rose-50 border-rose-200";
  if (score >= 84) return "text-amber-700 bg-amber-50 border-amber-200";

  return "text-slate-700 bg-slate-50 border-slate-200";
}

function unique(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean))
  );
}

function FlowStep({
  index,
  label,
  value,
  tone,
}: {
  index: number;
  label: string;
  value: string;
  tone: "rose" | "purple" | "blue" | "emerald";
}) {
  const toneClass = {
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  }[tone];

  const dotClass = {
    rose: "bg-rose-500",
    purple: "bg-purple-500",
    blue: "bg-blue-500",
    emerald: "bg-emerald-500",
  }[tone];

  return (
    <div className={`rounded-3xl border p-5 ${toneClass}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-2xl ${dotClass} text-white flex items-center justify-center font-bold`}>
          {index}
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wide">
            {label}
          </p>

          <p className="text-lg font-bold text-zinc-950 mt-1">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function IdeaResultCard({
  idea,
  index,
  selected,
  onToggle,
}: {
  idea: GeneratedIdea;
  index: number;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`rounded-3xl border p-5 transition ${
        selected
          ? "bg-purple-50 border-purple-300 shadow-sm"
          : "bg-white border-slate-200 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-zinc-950 text-white px-3 py-1 text-xs font-bold">
              #{index + 1}
            </span>

            <span className={`rounded-full px-3 py-1 text-xs font-bold ${getPriorityClass(idea.priority_level)}`}>
              {idea.priority_level}
            </span>

            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${getScoreClass(Number(idea.score || 0))}`}>
              Score {idea.score}
            </span>
          </div>

          <h3 className="text-xl font-bold mt-4">
            {idea.title}
          </h3>

          <p className="text-sm text-slate-500 mt-2">
            {idea.story_pillar} / {idea.theme_cluster} / {idea.niche}
          </p>
        </div>

        <button
          onClick={onToggle}
          className={`rounded-2xl px-4 py-3 font-bold ${
            selected
              ? "bg-purple-600 text-white"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          {selected ? "Selected" : "Select"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-5">
        <div className="rounded-2xl bg-white border p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-rose-700">
            Hook
          </p>

          <p className="text-sm text-slate-700 mt-2">
            {idea.hook}
          </p>
        </div>

        <div className="rounded-2xl bg-white border p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
            Thumbnail
          </p>

          <p className="text-sm text-slate-700 mt-2">
            {idea.thumbnail_prompt}
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-white border p-4 mt-4">
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
          Storyline
        </p>

        <p className="text-sm text-slate-700 mt-2">
          {idea.storyline}
        </p>
      </div>
    </div>
  );
}

export default function BrainstormFlowV2({
  ideas,
}: Props) {
  const router = useRouter();

  const [storyPillar, setStoryPillar] = useState("Story");
  const [themeCluster, setThemeCluster] = useState("Poor vs Rich");
  const [niche, setNiche] = useState("Poor vs Rich vs Giga Rich");
  const [marketSignal, setMarketSignal] = useState("Huntrix Fashion Contest");
  const [targetAudience, setTargetAudience] = useState("US kids and family audience");
  const [visualStyle, setVisualStyle] = useState("bright contrast, transformation, expressive faces");
  const [language, setLanguage] = useState("EN");
  const [ideaCount, setIdeaCount] = useState(8);

  const [generatedIdeas, setGeneratedIdeas] = useState<GeneratedIdea[]>([]);
  const [selectedIdeaIndexes, setSelectedIdeaIndexes] = useState<Set<number>>(
    new Set()
  );

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [generationMode, setGenerationMode] = useState("");

  const clusterOptions = useMemo(() => {
    const detected = ideas.map((idea) =>
      cleanText(idea.theme_cluster, "")
    );

    return unique([...defaultClusters, ...detected]);
  }, [ideas]);

  const nicheOptions = useMemo(() => {
    const detected = ideas
      .filter((idea) => cleanText(idea.theme_cluster, "") === themeCluster)
      .map((idea) => cleanText(idea.niche, ""));

    return unique([
      ...(defaultNichesByCluster[themeCluster] || []),
      ...detected,
    ]);
  }, [
    ideas,
    themeCluster,
  ]);

  function handleSelectCluster(value: string) {
    setThemeCluster(value);

    const nextNiche =
      defaultNichesByCluster[value]?.[0] ||
      ideas.find((idea) => cleanText(idea.theme_cluster, "") === value)?.niche ||
      "General Niche";

    setNiche(cleanText(nextNiche, "General Niche"));
  }

  async function handleGenerate() {
    setLoading(true);
    setErrorMessage("");
    setMessage("");
    setGenerationMode("");

    const response = await fetch("/api/brainstorm-flow-v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        storyPillar,
        themeCluster,
        niche,
        marketSignal,
        targetAudience,
        visualStyle,
        language,
        ideaCount,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setErrorMessage(data.error || "Brainstorm failed.");
      setLoading(false);
      return;
    }

    const nextIdeas = (data.ideas || []) as GeneratedIdea[];

    setGeneratedIdeas(nextIdeas);
    setSelectedIdeaIndexes(
      new Set(nextIdeas.map((_, index) => index))
    );
    setGenerationMode(data.mode || "");

    if (data.warning) {
      setMessage(data.warning);
    }

    setLoading(false);
  }

  function toggleIdea(index: number) {
    setSelectedIdeaIndexes((current) => {
      const next = new Set(current);

      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }

      return next;
    });
  }

  async function handleSaveSelected() {
    const ideasToSave = generatedIdeas.filter((_, index) =>
      selectedIdeaIndexes.has(index)
    );

    if (ideasToSave.length === 0) {
      setErrorMessage("Please select at least one idea to save.");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setMessage("");

    const payload = ideasToSave.map((idea) => ({
      title: idea.title,
      theme: idea.theme || idea.theme_cluster,
      status: "Idea",
      score: Number(idea.score || 85),
      language,
      hook: idea.hook,
      thumbnail_prompt: idea.thumbnail_prompt,
      storyline: idea.storyline,
      notes: idea.notes,
      story_pillar: idea.story_pillar || storyPillar,
      theme_cluster: idea.theme_cluster || themeCluster,
      niche: idea.niche || niche,
      idea_angle: idea.idea_angle || marketSignal,
      idea_formula: idea.idea_formula,
      source_type: "Brainstorm Flow V2",
      source_signal: idea.source_signal || marketSignal,
      priority_level: idea.priority_level || "Test",
      parent_path:
        idea.parent_path ||
        `${storyPillar} / ${themeCluster} / ${niche}`,
    }));

    const { error } = await supabase
      .from("ideas")
      .insert(payload);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setMessage(`Saved ${ideasToSave.length} ideas into Idea Bank.`);
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="space-y-6 studioos-readable">
      <div className="rounded-3xl bg-zinc-950 text-white p-7 shadow">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-2 text-sm">
              <WandSparkles size={16} />
              Brainstorm Flow V2
            </div>

            <h2 className="text-3xl font-bold mt-4">
              Generate ideas through a creative hierarchy
            </h2>

            <p className="text-zinc-300 mt-2 max-w-3xl">
              Start from Story Pillar, narrow into Theme Cluster, then Niche, then create specific YouTube story ideas with hook, thumbnail and storyline.
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm text-zinc-400">
              Generated
            </p>

            <p className="text-3xl font-bold mt-1">
              {generatedIdeas.length}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <FlowStep
          index={1}
          label="Story Pillar"
          value={storyPillar}
          tone="rose"
        />

        <FlowStep
          index={2}
          label="Theme Cluster"
          value={themeCluster}
          tone="purple"
        />

        <FlowStep
          index={3}
          label="Niche"
          value={niche}
          tone="blue"
        />

        <FlowStep
          index={4}
          label="Market Signal"
          value={marketSignal}
          tone="emerald"
        />
      </div>

      <div className="grid grid-cols-[1fr_0.8fr] gap-6">
        <div className="bg-white rounded-3xl border shadow p-6">
          <div className="flex items-center gap-2">
            <GitBranch size={20} className="text-purple-600" />

            <h3 className="text-xl font-bold">
              Build Brainstorm Flow
            </h3>
          </div>

          <p className="text-sm text-slate-600 mt-1">
            Đi từ ý lớn đến ngách nhỏ, rồi mới sinh idea cụ thể.
          </p>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div>
              <label className="block text-sm font-bold mb-2">
                Story Pillar
              </label>

              <input
                value={storyPillar}
                onChange={(event) => setStoryPillar(event.target.value)}
                className="w-full border rounded-2xl px-4 py-3"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">
                Language
              </label>

              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="w-full border rounded-2xl px-4 py-3"
              >
                <option>EN</option>
                <option>ES</option>
                <option>PT</option>
                <option>FR</option>
                <option>DE</option>
                <option>VI</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">
                Theme Cluster
              </label>

              <select
                value={themeCluster}
                onChange={(event) =>
                  handleSelectCluster(event.target.value)
                }
                className="w-full border rounded-2xl px-4 py-3"
              >
                {clusterOptions.map((cluster) => (
                  <option key={cluster} value={cluster}>
                    {cluster}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">
                Niche / Angle
              </label>

              <select
                value={niche}
                onChange={(event) => setNiche(event.target.value)}
                className="w-full border rounded-2xl px-4 py-3"
              >
                {nicheOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}

                {!nicheOptions.includes(niche) && (
                  <option value={niche}>
                    {niche}
                  </option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">
                Market Signal
              </label>

              <input
                value={marketSignal}
                onChange={(event) => setMarketSignal(event.target.value)}
                placeholder="Huntrix / K-pop Demon Hunters / Fashion Contest..."
                className="w-full border rounded-2xl px-4 py-3"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">
                Idea Count
              </label>

              <select
                value={ideaCount}
                onChange={(event) => setIdeaCount(Number(event.target.value))}
                className="w-full border rounded-2xl px-4 py-3"
              >
                <option value={5}>5 ideas</option>
                <option value={8}>8 ideas</option>
                <option value={10}>10 ideas</option>
                <option value={15}>15 ideas</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">
                Target Audience
              </label>

              <input
                value={targetAudience}
                onChange={(event) => setTargetAudience(event.target.value)}
                className="w-full border rounded-2xl px-4 py-3"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">
                Visual Style
              </label>

              <input
                value={visualStyle}
                onChange={(event) => setVisualStyle(event.target.value)}
                className="w-full border rounded-2xl px-4 py-3"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="rounded-2xl bg-zinc-950 text-white px-6 py-4 font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Brain size={18} />
              )}
              Generate Flow Ideas
            </button>

            <button
              onClick={handleSaveSelected}
              disabled={saving || generatedIdeas.length === 0}
              className="rounded-2xl border px-6 py-4 font-bold flex items-center gap-2 hover:bg-slate-50 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Save size={18} />
              )}
              Save Selected
            </button>
          </div>

          {message && (
            <p className="mt-5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-3 text-sm font-semibold">
              {message}
            </p>
          )}

          {errorMessage && (
            <p className="mt-5 rounded-2xl bg-red-50 text-red-700 border border-red-200 px-4 py-3 text-sm font-semibold">
              {errorMessage}
            </p>
          )}
        </div>

        <div className="bg-white rounded-3xl border shadow p-6">
          <div className="flex items-center gap-2">
            <Network size={20} className="text-rose-600" />

            <h3 className="text-xl font-bold">
              Flow Preview
            </h3>
          </div>

          <p className="text-sm text-slate-600 mt-1">
            Đây là cấu trúc mà idea mới sẽ được đưa vào Idea Bank.
          </p>

          <div className="mt-6 space-y-4">
            <div className="rounded-3xl bg-rose-50 border border-rose-200 p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-rose-700">
                Story Pillar
              </p>

              <p className="text-2xl font-bold mt-2">
                {storyPillar}
              </p>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="rotate-90 text-slate-400" />
            </div>

            <div className="rounded-3xl bg-purple-50 border border-purple-200 p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-purple-700">
                Theme Cluster
              </p>

              <p className="text-2xl font-bold mt-2">
                {themeCluster}
              </p>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="rotate-90 text-slate-400" />
            </div>

            <div className="rounded-3xl bg-blue-50 border border-blue-200 p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                Niche
              </p>

              <p className="text-2xl font-bold mt-2">
                {niche}
              </p>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="rotate-90 text-slate-400" />
            </div>

            <div className="rounded-3xl bg-emerald-50 border border-emerald-200 p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                Specific Ideas
              </p>

              <p className="text-2xl font-bold mt-2">
                {ideaCount} outputs
              </p>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-sm font-bold mb-3">
              Quick Market Signals
            </p>

            <div className="flex flex-wrap gap-2">
              {marketSignalSuggestions.map((signal) => (
                <button
                  key={signal}
                  onClick={() => setMarketSignal(signal)}
                  className="rounded-full bg-slate-100 text-slate-700 px-3 py-2 text-xs font-bold hover:bg-slate-200"
                >
                  {signal}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {generatedIdeas.length > 0 && (
        <div className="bg-white rounded-3xl border shadow overflow-hidden">
          <div className="p-6 border-b flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Lightbulb size={20} className="text-amber-600" />

                <h3 className="text-xl font-bold">
                  Generated Specific Ideas
                </h3>
              </div>

              <p className="text-sm text-slate-600 mt-1">
                Select the ideas you want to save into Idea Bank.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-purple-50 text-purple-700 px-4 py-2 text-sm font-bold">
                {selectedIdeaIndexes.size} selected
              </span>

              {generationMode && (
                <span className="rounded-full bg-slate-100 text-slate-700 px-4 py-2 text-sm font-bold">
                  {generationMode}
                </span>
              )}
            </div>
          </div>

          <div className="p-6 space-y-5">
            {generatedIdeas.map((idea, index) => (
              <IdeaResultCard
                key={`${idea.title}-${index}`}
                idea={idea}
                index={index}
                selected={selectedIdeaIndexes.has(index)}
                onToggle={() => toggleIdea(index)}
              />
            ))}
          </div>
        </div>
      )}

      {generatedIdeas.length === 0 && (
        <div className="bg-white rounded-3xl border border-dashed p-10 text-center">
          <div className="w-14 h-14 rounded-3xl bg-purple-50 text-purple-700 flex items-center justify-center mx-auto">
            <Search size={24} />
          </div>

          <h3 className="text-xl font-bold mt-4">
            No generated ideas yet
          </h3>

          <p className="text-slate-600 mt-2">
            Choose a story pillar, cluster, niche and market signal, then generate structured ideas.
          </p>
        </div>
      )}

      <div className="bg-white rounded-3xl border shadow p-6">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={20} className="text-emerald-600" />

          <h3 className="text-xl font-bold">
            Brainstorm Rule
          </h3>
        </div>

        <p className="text-slate-600 mt-3">
          Từ bây giờ, idea mới sẽ được tạo theo hệ phân cấp: Story Pillar → Theme Cluster → Niche → Specific Idea. Nhờ vậy Idea Bank sẽ có cấu trúc rõ, dễ nhìn, dễ remix và dễ phân tích.
        </p>
      </div>
    </div>
  );
}
