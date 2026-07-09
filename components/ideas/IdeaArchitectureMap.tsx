"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Brain,
  ChevronDown,
  ChevronRight,
  Crown,
  Layers,
  Lightbulb,
  Network,
  Search,
  Sparkles,
  Target,
  WandSparkles,
} from "lucide-react";
import type { Idea } from "@/types/idea";

type Props = {
  ideas: Idea[];
};

type IdeaNode = {
  key: string;
  label: string;
  ideas: Idea[];
  children: IdeaNode[];
};

const palette = [
  {
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-700",
    fill: "bg-rose-500",
    soft: "bg-rose-100",
  },
  {
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-700",
    fill: "bg-orange-500",
    soft: "bg-orange-100",
  },
  {
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-700",
    fill: "bg-purple-500",
    soft: "bg-purple-100",
  },
  {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    fill: "bg-blue-500",
    soft: "bg-blue-100",
  },
  {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    fill: "bg-emerald-500",
    soft: "bg-emerald-100",
  },
  {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    fill: "bg-amber-500",
    soft: "bg-amber-100",
  },
];

function getColor(index: number) {
  return palette[index % palette.length];
}

function normalizeText(value: string | null | undefined, fallback: string) {
  const text = String(value || "").trim();

  return text || fallback;
}

function detectThemeCluster(idea: Idea) {
  const title = idea.title.toLowerCase();
  const explicit = normalizeText(idea.theme_cluster, "");

  if (explicit) return explicit;

  if (title.includes("poor") && title.includes("rich")) {
    return "Poor vs Rich";
  }

  if (title.includes("makeover")) {
    return "Makeover";
  }

  if (title.includes("adopted")) {
    return "Adopted";
  }

  if (title.includes("mermaid")) {
    return "Mermaid";
  }

  if (title.includes("huntrix") || title.includes("demon")) {
    return "K-pop Demon Hunters";
  }

  if (title.includes("school")) {
    return "School Drama";
  }

  return normalizeText(idea.theme, "General Story");
}

function detectNiche(idea: Idea) {
  const title = idea.title.toLowerCase();
  const explicit = normalizeText(idea.niche, "");

  if (explicit) return explicit;

  if (title.includes("giga rich")) {
    return "Poor vs Rich vs Giga Rich";
  }

  if (title.includes("fashion contest")) {
    return "Fashion Contest";
  }

  if (title.includes("ballet contest")) {
    return "Ballet Contest";
  }

  if (title.includes("princess")) {
    return "Princess Transformation";
  }

  if (title.includes("family")) {
    return "Family Drama";
  }

  if (title.includes("school")) {
    return "School Setting";
  }

  if (title.includes("mermaid")) {
    return "Mermaid Transformation";
  }

  return normalizeText(idea.theme, "General Niche");
}

function getPriority(idea: Idea) {
  const explicit = normalizeText(idea.priority_level, "");

  if (explicit) return explicit;

  const score = Number(idea.score || 0);

  if (score >= 90) return "Focus";
  if (score >= 75) return "Test";

  return "Backlog";
}

function getAverageScore(ideas: Idea[]) {
  if (ideas.length === 0) return 0;

  return (
    ideas.reduce((sum, idea) => sum + Number(idea.score || 0), 0) /
    ideas.length
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

function buildTree(ideas: Idea[]) {
  const pillarMap = new Map<string, Map<string, Map<string, Idea[]>>>();

  ideas.forEach((idea) => {
    const pillar = normalizeText(idea.story_pillar, "Story");
    const cluster = detectThemeCluster(idea);
    const niche = detectNiche(idea);

    if (!pillarMap.has(pillar)) {
      pillarMap.set(pillar, new Map());
    }

    const clusterMap = pillarMap.get(pillar)!;

    if (!clusterMap.has(cluster)) {
      clusterMap.set(cluster, new Map());
    }

    const nicheMap = clusterMap.get(cluster)!;

    if (!nicheMap.has(niche)) {
      nicheMap.set(niche, []);
    }

    nicheMap.get(niche)!.push(idea);
  });

  return Array.from(pillarMap.entries()).map(([pillar, clusterMap]) => {
    const clusterNodes = Array.from(clusterMap.entries()).map(
      ([cluster, nicheMap]) => {
        const nicheNodes = Array.from(nicheMap.entries()).map(
          ([niche, nicheIdeas]) => ({
            key: `${pillar}-${cluster}-${niche}`,
            label: niche,
            ideas: nicheIdeas,
            children: [],
          })
        );

        return {
          key: `${pillar}-${cluster}`,
          label: cluster,
          ideas: nicheNodes.flatMap((node) => node.ideas),
          children: nicheNodes,
        };
      }
    );

    return {
      key: pillar,
      label: pillar,
      ideas: clusterNodes.flatMap((node) => node.ideas),
      children: clusterNodes,
    };
  });
}

function StatCard({
  label,
  value,
  description,
  icon,
  colorIndex,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  colorIndex: number;
}) {
  const color = getColor(colorIndex);

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${color.bg} ${color.border}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-sm font-bold ${color.text}`}>
            {label}
          </p>

          <p className="text-3xl font-bold mt-2 text-zinc-950">
            {value}
          </p>

          <p className="text-xs text-slate-600 mt-2">
            {description}
          </p>
        </div>

        <div className={`w-12 h-12 rounded-2xl ${color.fill} text-white flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function IdeaMiniCard({
  idea,
}: {
  idea: Idea;
}) {
  const priority = getPriority(idea);

  return (
    <div className="rounded-2xl border bg-white p-4 hover:shadow-sm transition">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-zinc-950 leading-5">
            {idea.title}
          </p>

          <p className="text-xs text-slate-500 mt-2">
            ID #{idea.id} · {idea.status || "Idea"} · Score {Number(idea.score || 0)}
          </p>
        </div>

        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${getPriorityClass(priority)}`}>
          {priority}
        </span>
      </div>

      {idea.hook && (
        <p className="text-sm text-slate-600 mt-3 line-clamp-2">
          {idea.hook}
        </p>
      )}
    </div>
  );
}

export default function IdeaArchitectureMap({
  ideas,
}: Props) {
  const [selectedPillar, setSelectedPillar] = useState("");
  const [selectedCluster, setSelectedCluster] = useState("");
  const [selectedNiche, setSelectedNiche] = useState("");
  const [search, setSearch] = useState("");
  const [expandedKey, setExpandedKey] = useState("");

  const filteredIdeas = useMemo(() => {
    const query = search.trim().toLowerCase();

    return ideas.filter((idea) => {
      const pillar = normalizeText(idea.story_pillar, "Story");
      const cluster = detectThemeCluster(idea);
      const niche = detectNiche(idea);

      if (selectedPillar && pillar !== selectedPillar) return false;
      if (selectedCluster && cluster !== selectedCluster) return false;
      if (selectedNiche && niche !== selectedNiche) return false;

      if (!query) return true;

      return (
        idea.title.toLowerCase().includes(query) ||
        pillar.toLowerCase().includes(query) ||
        cluster.toLowerCase().includes(query) ||
        niche.toLowerCase().includes(query) ||
        String(idea.hook || "").toLowerCase().includes(query)
      );
    });
  }, [
    ideas,
    search,
    selectedPillar,
    selectedCluster,
    selectedNiche,
  ]);

  const tree = useMemo(() => buildTree(filteredIdeas), [filteredIdeas]);

  const allPillars = useMemo(() => {
    return Array.from(
      new Set(ideas.map((idea) => normalizeText(idea.story_pillar, "Story")))
    ).sort();
  }, [ideas]);

  const allClusters = useMemo(() => {
    return Array.from(new Set(ideas.map(detectThemeCluster))).sort();
  }, [ideas]);

  const allNiches = useMemo(() => {
    return Array.from(new Set(ideas.map(detectNiche))).sort();
  }, [ideas]);

  const focusIdeas = filteredIdeas.filter(
    (idea) => getPriority(idea) === "Focus"
  );

  const testIdeas = filteredIdeas.filter(
    (idea) => getPriority(idea) === "Test"
  );

  const topClusters = useMemo(() => {
    const map = new Map<string, Idea[]>();

    filteredIdeas.forEach((idea) => {
      const cluster = detectThemeCluster(idea);
      map.set(cluster, [...(map.get(cluster) || []), idea]);
    });

    return Array.from(map.entries())
      .map(([cluster, clusterIdeas]) => ({
        cluster,
        ideas: clusterIdeas,
        count: clusterIdeas.length,
        avgScore: getAverageScore(clusterIdeas),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [filteredIdeas]);

  const selectedNodeIdeas = useMemo(() => {
    if (selectedNiche) {
      return filteredIdeas.filter((idea) => detectNiche(idea) === selectedNiche);
    }

    if (selectedCluster) {
      return filteredIdeas.filter((idea) => detectThemeCluster(idea) === selectedCluster);
    }

    return focusIdeas.length > 0 ? focusIdeas : filteredIdeas.slice(0, 8);
  }, [
    filteredIdeas,
    focusIdeas,
    selectedCluster,
    selectedNiche,
  ]);

  return (
    <div className="space-y-6 studioos-readable">
      <div className="rounded-3xl bg-zinc-950 text-white p-7 shadow">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-2 text-sm">
              <Network size={16} />
              Idea Architecture
            </div>

            <h2 className="text-3xl font-bold mt-4">
              Story Map
            </h2>

            <p className="text-zinc-300 mt-2 max-w-3xl">
              Organize ideas by Story Pillar → Theme Cluster → Niche → Specific Idea, so brainstorm and remix follow a clear creative system.
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm text-zinc-400">
              Current ideas
            </p>

            <p className="text-3xl font-bold mt-1">
              {filteredIdeas.length.toLocaleString("en-US")}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Ideas"
          value={filteredIdeas.length.toLocaleString("en-US")}
          description="Ideas inside current architecture view"
          icon={<Lightbulb size={22} />}
          colorIndex={0}
        />

        <StatCard
          label="Focus Ideas"
          value={focusIdeas.length.toLocaleString("en-US")}
          description="High-priority concepts to execute first"
          icon={<Crown size={22} />}
          colorIndex={1}
        />

        <StatCard
          label="Test Ideas"
          value={testIdeas.length.toLocaleString("en-US")}
          description="Good concepts for controlled testing"
          icon={<Target size={22} />}
          colorIndex={2}
        />

        <StatCard
          label="Clusters"
          value={topClusters.length.toLocaleString("en-US")}
          description="Theme clusters detected from idea bank"
          icon={<Layers size={22} />}
          colorIndex={3}
        />
      </div>

      <div className="bg-white rounded-3xl border shadow p-5">
        <div className="grid grid-cols-4 gap-3">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, hook, cluster..."
              className="w-full border rounded-2xl pl-11 pr-4 py-3"
            />
          </div>

          <select
            value={selectedPillar}
            onChange={(event) => {
              setSelectedPillar(event.target.value);
              setSelectedCluster("");
              setSelectedNiche("");
            }}
            className="border rounded-2xl px-4 py-3"
          >
            <option value="">All Story Pillars</option>

            {allPillars.map((pillar) => (
              <option key={pillar} value={pillar}>
                {pillar}
              </option>
            ))}
          </select>

          <select
            value={selectedCluster}
            onChange={(event) => {
              setSelectedCluster(event.target.value);
              setSelectedNiche("");
            }}
            className="border rounded-2xl px-4 py-3"
          >
            <option value="">All Theme Clusters</option>

            {allClusters.map((cluster) => (
              <option key={cluster} value={cluster}>
                {cluster}
              </option>
            ))}
          </select>

          <select
            value={selectedNiche}
            onChange={(event) => setSelectedNiche(event.target.value)}
            className="border rounded-2xl px-4 py-3"
          >
            <option value="">All Niches</option>

            {allNiches.map((niche) => (
              <option key={niche} value={niche}>
                {niche}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-[1.1fr_0.9fr] gap-6">
        <div className="bg-white rounded-3xl border shadow overflow-hidden">
          <div className="p-6 border-b">
            <div className="flex items-center gap-2">
              <Brain size={20} className="text-purple-600" />

              <h3 className="text-xl font-bold">
                Architecture Flow
              </h3>
            </div>

            <p className="text-sm text-slate-600 mt-1">
              Click a cluster or niche to inspect its ideas.
            </p>
          </div>

          <div className="p-6 space-y-5">
            {tree.map((pillarNode, pillarIndex) => {
              const pillarColor = getColor(pillarIndex);

              return (
                <div
                  key={pillarNode.key}
                  className={`rounded-3xl border p-5 ${pillarColor.bg} ${pillarColor.border}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl ${pillarColor.fill} text-white flex items-center justify-center`}>
                        <Sparkles size={22} />
                      </div>

                      <div>
                        <p className={`text-xs font-bold uppercase tracking-wide ${pillarColor.text}`}>
                          Story Pillar
                        </p>

                        <h4 className="text-2xl font-bold">
                          {pillarNode.label}
                        </h4>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-bold">
                        {pillarNode.ideas.length}
                      </p>

                      <p className="text-xs text-slate-500">
                        ideas
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {pillarNode.children.map((clusterNode, clusterIndex) => {
                      const clusterColor = getColor(clusterIndex + pillarIndex + 1);
                      const isExpanded = expandedKey === clusterNode.key;

                      return (
                        <div
                          key={clusterNode.key}
                          className="rounded-2xl bg-white border overflow-hidden"
                        >
                          <button
                            onClick={() => {
                              setSelectedCluster(clusterNode.label);
                              setSelectedNiche("");
                              setExpandedKey(isExpanded ? "" : clusterNode.key);
                            }}
                            className="w-full p-4 flex items-center justify-between gap-4 hover:bg-slate-50"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl ${clusterColor.fill} text-white flex items-center justify-center`}>
                                {isExpanded ? (
                                  <ChevronDown size={17} />
                                ) : (
                                  <ChevronRight size={17} />
                                )}
                              </div>

                              <div className="text-left">
                                <p className={`text-xs font-bold uppercase tracking-wide ${clusterColor.text}`}>
                                  Theme Cluster
                                </p>

                                <p className="font-bold text-zinc-950">
                                  {clusterNode.label}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <span className={`rounded-full px-3 py-1 text-xs font-bold ${clusterColor.soft} ${clusterColor.text}`}>
                                {clusterNode.children.length} niches
                              </span>

                              <span className="font-bold">
                                {clusterNode.ideas.length} ideas
                              </span>
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="border-t bg-slate-50 p-4 space-y-3">
                              {clusterNode.children.map((nicheNode, nicheIndex) => {
                                const nicheColor = getColor(nicheIndex + clusterIndex + 2);

                                return (
                                  <button
                                    key={nicheNode.key}
                                    onClick={() => {
                                      setSelectedCluster(clusterNode.label);
                                      setSelectedNiche(nicheNode.label);
                                    }}
                                    className={`w-full rounded-2xl border bg-white p-4 text-left hover:shadow-sm transition ${
                                      selectedNiche === nicheNode.label
                                        ? `${nicheColor.border}`
                                        : "border-slate-200"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-4">
                                      <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-xl ${nicheColor.soft} ${nicheColor.text} flex items-center justify-center`}>
                                          <ArrowRight size={15} />
                                        </div>

                                        <div>
                                          <p className={`text-xs font-bold uppercase tracking-wide ${nicheColor.text}`}>
                                            Niche / Angle
                                          </p>

                                          <p className="font-bold">
                                            {nicheNode.label}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="text-right">
                                        <p className="font-bold">
                                          {nicheNode.ideas.length}
                                        </p>

                                        <p className="text-xs text-slate-500">
                                          ideas
                                        </p>
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {tree.length === 0 && (
              <div className="rounded-3xl border border-dashed p-10 text-center text-slate-500">
                No idea architecture data yet.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl border shadow overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center gap-2">
                <WandSparkles size={20} className="text-rose-600" />

                <h3 className="text-xl font-bold">
                  Ideas in Selected Branch
                </h3>
              </div>

              <p className="text-sm text-slate-600 mt-1">
                Important ideas are shown with stronger labels.
              </p>
            </div>

            <div className="p-5 space-y-4 max-h-[720px] overflow-auto">
              {selectedNodeIdeas.map((idea) => (
                <IdeaMiniCard key={idea.id} idea={idea} />
              ))}

              {selectedNodeIdeas.length === 0 && (
                <div className="rounded-2xl border border-dashed p-8 text-center text-slate-500">
                  No ideas in this branch.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border shadow p-6">
            <h3 className="text-xl font-bold">
              Top Theme Clusters
            </h3>

            <p className="text-sm text-slate-600 mt-1">
              Clusters with more ideas should become main creative lanes.
            </p>

            <div className="space-y-4 mt-5">
              {topClusters.map((cluster, index) => {
                const color = getColor(index);
                const width = Math.min(100, Math.max(8, cluster.count * 12));

                return (
                  <button
                    key={cluster.cluster}
                    onClick={() => {
                      setSelectedCluster(cluster.cluster);
                      setSelectedNiche("");
                    }}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold">
                        {cluster.cluster}
                      </p>

                      <p className={`text-sm font-bold ${color.text}`}>
                        {cluster.count} ideas · Avg {cluster.avgScore.toFixed(0)}
                      </p>
                    </div>

                    <div className={`h-3 rounded-full overflow-hidden ${color.soft}`}>
                      <div
                        className={`h-full rounded-full ${color.fill}`}
                        style={{
                          width: `${width}%`,
                        }}
                      />
                    </div>
                  </button>
                );
              })}

              {topClusters.length === 0 && (
                <p className="text-sm text-slate-500">
                  No clusters yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow p-6">
        <div className="flex items-center gap-2">
          <Target size={20} className="text-emerald-600" />

          <h3 className="text-xl font-bold">
            Architecture Rule
          </h3>
        </div>

        <p className="text-slate-600 mt-3">
          Từ sprint sau, mọi brainstorm và remix sẽ phải đi qua flow này: chọn Story Pillar, chọn Theme Cluster, chọn Niche, rồi mới sinh Specific Idea.
          Như vậy idea mới sẽ không bị rời rạc mà được đưa đúng vào nhánh chiến lược.
        </p>
      </div>
    </div>
  );
}
