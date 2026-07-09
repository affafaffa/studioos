"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  Crown,
  GitBranch,
  Layers,
  Lightbulb,
  Loader2,
  Network,
  PlayCircle,
  RefreshCcw,
  Save,
  Search,
  Shuffle,
  Sparkles,
  Target,
  WandSparkles,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Idea } from "@/types/idea";
import type {
  CompetitorChannel,
  CompetitorGroup,
  CompetitorVideo,
} from "@/types/competitor";

type Props = {
  ideas: Idea[];
  competitorGroups: CompetitorGroup[];
  competitorChannels: CompetitorChannel[];
  competitorVideos: CompetitorVideo[];
};

type LooseVideo = CompetitorVideo & Record<string, unknown>;

type SourceType = "competitor-video" | "idea-bank" | "manual";

type RemixIdea = {
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
  remix_rule: string;
  remix_strategy: string;
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

function toText(value: unknown) {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return String(value);
}

function toNumber(value: unknown) {
  const numberValue = Number(value || 0);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function cleanText(value: string | null | undefined, fallback: string) {
  const text = String(value || "").trim();

  return text || fallback;
}

function unique(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean))
  );
}

function getVideoUrl(video: CompetitorVideo) {
  const loose = video as LooseVideo;

  const videoUrl = toText(loose.video_url);

  if (videoUrl) return videoUrl;

  const youtubeVideoId = toText(loose.youtube_video_id);

  if (youtubeVideoId) {
    return `https://www.youtube.com/watch?v=${youtubeVideoId}`;
  }

  return "";
}

function getBestThumbnail(video: CompetitorVideo) {
  const loose = video as LooseVideo;

  return (
    toText(loose.thumbnail_maxres_url) ||
    toText(loose.thumbnail_standard_url) ||
    toText(loose.thumbnail_high_url) ||
    toText(loose.thumbnail_medium_url) ||
    toText(loose.thumbnail_url) ||
    toText(loose.thumbnail_default_url)
  );
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

function detectClusterFromText(text: string) {
  const lower = text.toLowerCase();

  if (lower.includes("poor") && lower.includes("rich")) return "Poor vs Rich";
  if (lower.includes("makeover")) return "Makeover";
  if (lower.includes("adopt")) return "Adopted";
  if (lower.includes("huntrix") || lower.includes("demon")) return "K-pop Demon Hunters";
  if (lower.includes("mermaid")) return "Mermaid";
  if (lower.includes("school")) return "School Drama";
  if (lower.includes("princess")) return "Princess Transformation";
  if (lower.includes("family")) return "Family Drama";

  return "Poor vs Rich";
}

function detectNicheFromText(text: string, cluster: string) {
  const lower = text.toLowerCase();

  if (lower.includes("giga rich")) return "Poor vs Rich vs Giga Rich";
  if (lower.includes("fashion contest")) return "Fashion Contest";
  if (lower.includes("ballet contest")) return "Ballet Contest";
  if (lower.includes("princess")) return "Princess Transformation";
  if (lower.includes("school")) return "School Setting";
  if (lower.includes("family")) return "Family Drama";
  if (lower.includes("mermaid")) return "Mermaid Transformation";
  if (lower.includes("huntrix")) return "Huntrix Fashion Contest";

  return defaultNichesByCluster[cluster]?.[0] || "General Niche";
}

function SourcePreview({
  sourceType,
  sourceTitle,
  sourceChannel,
  sourceUrl,
  sourceThumbnail,
}: {
  sourceType: SourceType;
  sourceTitle: string;
  sourceChannel: string;
  sourceUrl: string;
  sourceThumbnail: string;
}) {
  return (
    <div className="rounded-3xl bg-white border shadow overflow-hidden">
      <div className="p-5 border-b">
        <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 text-rose-700 px-3 py-1 text-xs font-bold">
          <Shuffle size={14} />
          Source Signal
        </div>

        <h3 className="text-xl font-bold mt-3">
          {sourceTitle || "No source selected"}
        </h3>

        <p className="text-sm text-slate-600 mt-1">
          {sourceType} · {sourceChannel || "Manual Source"}
        </p>
      </div>

      <div className="p-5">
        <div className="aspect-video rounded-2xl bg-slate-100 border overflow-hidden">
          {sourceThumbnail ? (
            <img
              src={sourceThumbnail}
              alt={sourceTitle}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              <PlayCircle size={36} />
            </div>
          )}
        </div>

        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 mt-4 text-blue-700 font-bold hover:underline"
          >
            Open source
            <ArrowRight size={16} />
          </a>
        )}
      </div>
    </div>
  );
}

function RemixIdeaCard({
  idea,
  index,
  selected,
  onToggle,
}: {
  idea: RemixIdea;
  index: number;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`rounded-3xl border p-5 transition ${
        selected
          ? "bg-rose-50 border-rose-300 shadow-sm"
          : "bg-white border-slate-200 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-zinc-950 text-white px-3 py-1 text-xs font-bold">
              Remix #{index + 1}
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
              ? "bg-rose-600 text-white"
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
          Remix Strategy
        </p>

        <p className="text-sm text-slate-700 mt-2">
          {idea.remix_strategy}
        </p>
      </div>
    </div>
  );
}

export default function RemixRuleEngine({
  ideas,
  competitorGroups,
  competitorChannels,
  competitorVideos,
}: Props) {
  const router = useRouter();

  const [sourceType, setSourceType] = useState<SourceType>("competitor-video");
  const [sourceVideoId, setSourceVideoId] = useState("");
  const [sourceIdeaId, setSourceIdeaId] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [search, setSearch] = useState("");

  const [storyPillar, setStoryPillar] = useState("Story");
  const [themeCluster, setThemeCluster] = useState("Poor vs Rich");
  const [niche, setNiche] = useState("Poor vs Rich vs Giga Rich");
  const [marketSignal, setMarketSignal] = useState("Huntrix Fashion Contest");

  const [remixGoal, setRemixGoal] = useState(
    "Create an original YouTube story idea using the source only as a market signal."
  );
  const [remixRule, setRemixRule] = useState(
    "Keep market logic. Change characters, setting, conflict, twist, thumbnail scene and payoff."
  );
  const [targetAudience, setTargetAudience] = useState(
    "US kids and family audience"
  );
  const [visualStyle, setVisualStyle] = useState(
    "bright contrast, transformation, expressive faces"
  );
  const [language, setLanguage] = useState("EN");
  const [ideaCount, setIdeaCount] = useState(6);

  const [generatedIdeas, setGeneratedIdeas] = useState<RemixIdea[]>([]);
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(
    new Set()
  );

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [generationMode, setGenerationMode] = useState("");

  const channelMap = useMemo(() => {
    return new Map(
      competitorChannels.map((channel) => [
        channel.id,
        {
          name: channel.channel_name,
          groupId: channel.group_id,
          url: channel.channel_url,
        },
      ])
    );
  }, [competitorChannels]);

  const groupMap = useMemo(() => {
    return new Map(
      competitorGroups.map((group) => [
        group.id,
        {
          name: group.name,
          category: group.category || "Uncategorized",
        },
      ])
    );
  }, [competitorGroups]);

  const sortedVideos = useMemo(() => {
    return [...competitorVideos]
      .filter((video) => {
        const query = search.trim().toLowerCase();

        if (!query) return true;

        const loose = video as LooseVideo;

        return (
          toText(loose.title).toLowerCase().includes(query) ||
          toText(loose.channel_title).toLowerCase().includes(query)
        );
      })
      .sort(
        (a, b) =>
          toNumber((b as LooseVideo).view_count) -
          toNumber((a as LooseVideo).view_count)
      )
      .slice(0, 300);
  }, [competitorVideos, search]);

  const selectedVideo = sortedVideos.find(
    (video) => String((video as LooseVideo).id) === sourceVideoId
  ) || sortedVideos[0];

  const selectedIdea = ideas.find(
    (idea) => String(idea.id) === sourceIdeaId
  ) || ideas[0];

  const clusterOptions = useMemo(() => {
    const detected = ideas.map((idea) => cleanText(idea.theme_cluster, ""));

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
  }, [ideas, themeCluster]);

  const sourceData = useMemo(() => {
    if (sourceType === "idea-bank") {
      const title = selectedIdea?.title || "";
      const cluster = detectClusterFromText(title);
      const detectedNiche = detectNicheFromText(title, cluster);

      return {
        title,
        description: selectedIdea?.storyline || selectedIdea?.hook || selectedIdea?.notes || "",
        channel: "Idea Bank",
        url: "",
        thumbnail: selectedIdea?.thumbnail || "",
        signal: selectedIdea?.source_signal || selectedIdea?.theme || cluster,
        detectedCluster: selectedIdea?.theme_cluster || cluster,
        detectedNiche: selectedIdea?.niche || detectedNiche,
      };
    }

    if (sourceType === "manual") {
      const cluster = detectClusterFromText(manualTitle + " " + manualDescription);
      const detectedNiche = detectNicheFromText(
        manualTitle + " " + manualDescription,
        cluster
      );

      return {
        title: manualTitle,
        description: manualDescription,
        channel: "Manual Source",
        url: "",
        thumbnail: "",
        signal: marketSignal,
        detectedCluster: cluster,
        detectedNiche,
      };
    }

    if (selectedVideo) {
      const loose = selectedVideo as LooseVideo;
      const channelId = toNumber(loose.competitor_channel_id);
      const channel = channelMap.get(channelId);
      const groupId = toNumber(loose.group_id) || channel?.groupId || null;
      const group = groupId ? groupMap.get(groupId) : null;
      const title = toText(loose.title);
      const cluster = detectClusterFromText(title);
      const detectedNiche = detectNicheFromText(title, cluster);

      return {
        title,
        description: toText(loose.description),
        channel: toText(loose.channel_title) || channel?.name || "Competitor Channel",
        url: getVideoUrl(selectedVideo),
        thumbnail: getBestThumbnail(selectedVideo),
        signal: group?.name || title,
        detectedCluster: cluster,
        detectedNiche,
      };
    }

    return {
      title: "",
      description: "",
      channel: "",
      url: "",
      thumbnail: "",
      signal: marketSignal,
      detectedCluster: themeCluster,
      detectedNiche: niche,
    };
  }, [
    sourceType,
    selectedIdea,
    selectedVideo,
    manualTitle,
    manualDescription,
    marketSignal,
    themeCluster,
    niche,
    channelMap,
    groupMap,
  ]);

  function applyDetectedTaxonomy() {
    setThemeCluster(sourceData.detectedCluster);
    setNiche(sourceData.detectedNiche);
    setMarketSignal(sourceData.signal || sourceData.detectedCluster);
  }

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

    const response = await fetch("/api/remix-rule-engine-v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        storyPillar,
        themeCluster,
        niche,
        marketSignal,
        sourceTitle: sourceData.title,
        sourceDescription: sourceData.description,
        sourceChannel: sourceData.channel,
        sourceUrl: sourceData.url,
        remixGoal,
        remixRule,
        targetAudience,
        visualStyle,
        language,
        ideaCount,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setErrorMessage(data.error || "Remix failed.");
      setLoading(false);
      return;
    }

    const nextIdeas = (data.ideas || []) as RemixIdea[];

    setGeneratedIdeas(nextIdeas);
    setSelectedIndexes(new Set(nextIdeas.map((_, index) => index)));
    setGenerationMode(data.mode || "");

    if (data.warning) {
      setMessage(data.warning);
    }

    setLoading(false);
  }

  function toggleIdea(index: number) {
    setSelectedIndexes((current) => {
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
      selectedIndexes.has(index)
    );

    if (ideasToSave.length === 0) {
      setErrorMessage("Please select at least one remix idea.");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setMessage("");

    const payload = ideasToSave.map((idea) => ({
      title: idea.title,
      theme: idea.theme || idea.theme_cluster,
      status: "Idea",
      score: Number(idea.score || 88),
      language,
      hook: idea.hook,
      thumbnail_prompt: idea.thumbnail_prompt,
      storyline: idea.storyline,
      notes: [
        idea.notes,
        "",
        `Source title: ${sourceData.title}`,
        `Source channel: ${sourceData.channel}`,
        `Source URL: ${sourceData.url}`,
        `Remix rule: ${idea.remix_rule}`,
        `Remix strategy: ${idea.remix_strategy}`,
      ].join("\n"),
      story_pillar: idea.story_pillar || storyPillar,
      theme_cluster: idea.theme_cluster || themeCluster,
      niche: idea.niche || niche,
      idea_angle: idea.idea_angle || marketSignal,
      idea_formula: idea.idea_formula,
      source_type: "Remix Rule Engine V2",
      source_signal: idea.source_signal || marketSignal,
      priority_level: idea.priority_level || "Test",
      parent_path:
        idea.parent_path ||
        `${storyPillar} / ${themeCluster} / ${niche}`,
      source_video_url: sourceData.url || null,
      source_video_title: sourceData.title || null,
      source_channel_title: sourceData.channel || null,
      remix_rule: idea.remix_rule,
      remix_strategy: idea.remix_strategy,
    }));

    const { error } = await supabase
      .from("ideas")
      .insert(payload);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setMessage(`Saved ${ideasToSave.length} remix ideas into Idea Bank.`);
    setSaving(false);
    router.refresh();
  }

  async function copyRule() {
    const text = [
      `Source: ${sourceData.title}`,
      `Source Channel: ${sourceData.channel}`,
      `Source URL: ${sourceData.url}`,
      `Story Pillar: ${storyPillar}`,
      `Theme Cluster: ${themeCluster}`,
      `Niche: ${niche}`,
      `Market Signal: ${marketSignal}`,
      `Remix Rule: ${remixRule}`,
      `Remix Goal: ${remixGoal}`,
    ].join("\n");

    await navigator.clipboard.writeText(text);
    setMessage("Copied remix rule brief.");
  }

  return (
    <div className="space-y-6 studioos-readable">
      <div className="rounded-3xl bg-zinc-950 text-white p-7 shadow">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-2 text-sm">
              <Shuffle size={16} />
              Remix Rule Engine V2
            </div>

            <h2 className="text-3xl font-bold mt-4">
              Remix source signals into original ideas
            </h2>

            <p className="text-zinc-300 mt-2 max-w-3xl">
              Pick a competitor video, Idea Bank item, or manual source. The engine extracts market logic, then rebuilds a new original idea through Story Pillar → Theme Cluster → Niche.
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm text-zinc-400">
              Remix outputs
            </p>

            <p className="text-3xl font-bold mt-1">
              {generatedIdeas.length}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-3xl border bg-rose-50 border-rose-200 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-rose-700">
            Source
          </p>

          <p className="text-xl font-bold mt-2">
            {sourceType}
          </p>
        </div>

        <div className="rounded-3xl border bg-purple-50 border-purple-200 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-purple-700">
            Theme Cluster
          </p>

          <p className="text-xl font-bold mt-2">
            {themeCluster}
          </p>
        </div>

        <div className="rounded-3xl border bg-blue-50 border-blue-200 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
            Niche
          </p>

          <p className="text-xl font-bold mt-2">
            {niche}
          </p>
        </div>

        <div className="rounded-3xl border bg-emerald-50 border-emerald-200 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
            Market Signal
          </p>

          <p className="text-xl font-bold mt-2">
            {marketSignal}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-[0.9fr_1.1fr] gap-6">
        <SourcePreview
          sourceType={sourceType}
          sourceTitle={sourceData.title}
          sourceChannel={sourceData.channel}
          sourceUrl={sourceData.url}
          sourceThumbnail={sourceData.thumbnail}
        />

        <div className="bg-white rounded-3xl border shadow p-6">
          <div className="flex items-center gap-2">
            <GitBranch size={20} className="text-rose-600" />

            <h3 className="text-xl font-bold">
              Source Selection
            </h3>
          </div>

          <p className="text-sm text-slate-600 mt-1">
            Chọn nguồn để remix. Nguồn chỉ dùng làm signal, không copy.
          </p>

          <div className="grid grid-cols-3 gap-3 mt-5">
            <button
              onClick={() => setSourceType("competitor-video")}
              className={`rounded-2xl border px-4 py-3 font-bold ${
                sourceType === "competitor-video"
                  ? "bg-rose-50 border-rose-300 text-rose-700"
                  : "hover:bg-slate-50"
              }`}
            >
              Competitor Video
            </button>

            <button
              onClick={() => setSourceType("idea-bank")}
              className={`rounded-2xl border px-4 py-3 font-bold ${
                sourceType === "idea-bank"
                  ? "bg-purple-50 border-purple-300 text-purple-700"
                  : "hover:bg-slate-50"
              }`}
            >
              Idea Bank
            </button>

            <button
              onClick={() => setSourceType("manual")}
              className={`rounded-2xl border px-4 py-3 font-bold ${
                sourceType === "manual"
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "hover:bg-slate-50"
              }`}
            >
              Manual
            </button>
          </div>

          {sourceType === "competitor-video" && (
            <div className="space-y-3 mt-5">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search competitor videos..."
                  className="w-full border rounded-2xl pl-11 pr-4 py-3"
                />
              </div>

              <select
                value={sourceVideoId}
                onChange={(event) => setSourceVideoId(event.target.value)}
                className="w-full border rounded-2xl px-4 py-3"
              >
                {sortedVideos.map((video) => {
                  const loose = video as LooseVideo;

                  return (
                    <option
                      key={toText(loose.id)}
                      value={toText(loose.id)}
                    >
                      {formatOptionTitle(toText(loose.title), toNumber(loose.view_count))}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {sourceType === "idea-bank" && (
            <div className="mt-5">
              <select
                value={sourceIdeaId}
                onChange={(event) => setSourceIdeaId(event.target.value)}
                className="w-full border rounded-2xl px-4 py-3"
              >
                {ideas.map((idea) => (
                  <option key={idea.id} value={idea.id}>
                    #{idea.id} · {idea.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {sourceType === "manual" && (
            <div className="grid grid-cols-1 gap-3 mt-5">
              <input
                value={manualTitle}
                onChange={(event) => setManualTitle(event.target.value)}
                placeholder="Paste source title..."
                className="w-full border rounded-2xl px-4 py-3"
              />

              <textarea
                value={manualDescription}
                onChange={(event) => setManualDescription(event.target.value)}
                placeholder="Paste source description / pattern / notes..."
                rows={5}
                className="w-full border rounded-2xl px-4 py-3"
              />
            </div>
          )}

          <div className="flex items-center gap-3 mt-5">
            <button
              onClick={applyDetectedTaxonomy}
              className="rounded-2xl border px-4 py-3 font-bold flex items-center gap-2 hover:bg-slate-50"
            >
              <RefreshCcw size={17} />
              Auto Detect Flow
            </button>

            <button
              onClick={copyRule}
              className="rounded-2xl border px-4 py-3 font-bold flex items-center gap-2 hover:bg-slate-50"
            >
              <Copy size={17} />
              Copy Rule
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow p-6">
        <div className="flex items-center gap-2">
          <Network size={20} className="text-purple-600" />

          <h3 className="text-xl font-bold">
            Remix Architecture
          </h3>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-6">
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
              Theme Cluster
            </label>

            <select
              value={themeCluster}
              onChange={(event) => handleSelectCluster(event.target.value)}
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
              Niche
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
              Market Signal
            </label>

            <input
              value={marketSignal}
              onChange={(event) => setMarketSignal(event.target.value)}
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
              <option value={3}>3 ideas</option>
              <option value={6}>6 ideas</option>
              <option value={8}>8 ideas</option>
              <option value={10}>10 ideas</option>
              <option value={12}>12 ideas</option>
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

        <div className="grid grid-cols-2 gap-4 mt-5">
          <div>
            <label className="block text-sm font-bold mb-2">
              Remix Rule
            </label>

            <textarea
              value={remixRule}
              onChange={(event) => setRemixRule(event.target.value)}
              rows={4}
              className="w-full border rounded-2xl px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">
              Remix Goal
            </label>

            <textarea
              value={remixGoal}
              onChange={(event) => setRemixGoal(event.target.value)}
              rows={4}
              className="w-full border rounded-2xl px-4 py-3"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={handleGenerate}
            disabled={loading || !sourceData.title}
            className="rounded-2xl bg-zinc-950 text-white px-6 py-4 font-bold flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <WandSparkles size={18} />
            )}
            Generate Original Remixes
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

      {generatedIdeas.length > 0 && (
        <div className="bg-white rounded-3xl border shadow overflow-hidden">
          <div className="p-6 border-b flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Lightbulb size={20} className="text-amber-600" />

                <h3 className="text-xl font-bold">
                  Original Remix Ideas
                </h3>
              </div>

              <p className="text-sm text-slate-600 mt-1">
                Select remixes to save into Idea Bank.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-rose-50 text-rose-700 px-4 py-2 text-sm font-bold">
                {selectedIndexes.size} selected
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
              <RemixIdeaCard
                key={`${idea.title}-${index}`}
                idea={idea}
                index={index}
                selected={selectedIndexes.has(index)}
                onToggle={() => toggleIdea(index)}
              />
            ))}
          </div>
        </div>
      )}

      {generatedIdeas.length === 0 && (
        <div className="bg-white rounded-3xl border border-dashed p-10 text-center">
          <div className="w-14 h-14 rounded-3xl bg-rose-50 text-rose-700 flex items-center justify-center mx-auto">
            <Shuffle size={24} />
          </div>

          <h3 className="text-xl font-bold mt-4">
            No remix generated yet
          </h3>

          <p className="text-slate-600 mt-2">
            Pick a source, define the remix architecture, then generate original remixes.
          </p>
        </div>
      )}

      <div className="bg-white rounded-3xl border shadow p-6">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={20} className="text-emerald-600" />

          <h3 className="text-xl font-bold">
            Remix Rule
          </h3>
        </div>

        <p className="text-slate-600 mt-3">
          Remix không được copy source. Engine chỉ giữ lại market logic như contrast, transformation, curiosity, payoff. Mọi thứ khác phải đổi: nhân vật, setting, xung đột, twist, thumbnail scene và ending.
        </p>
      </div>
    </div>
  );
}

function formatOptionTitle(title: string, views: number) {
  const shortTitle = title.length > 120 ? `${title.slice(0, 120)}...` : title;

  return `${shortTitle} · ${views.toLocaleString("en-US")} views`;
}
