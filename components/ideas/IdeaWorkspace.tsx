"use client";

import { useState } from "react";
import {
  Database,
  Network,
  Shuffle,
  WandSparkles,
} from "lucide-react";
import BrainstormFlowV2 from "@/components/ideas/BrainstormFlowV2";
import IdeaArchitectureMap from "@/components/ideas/IdeaArchitectureMap";
import RemixRuleEngine from "@/components/ideas/RemixRuleEngine";
import IdeaBank from "@/components/dashboard/IdeaBank";
import type { Idea } from "@/types/idea";
import type {
  CompetitorChannel,
  CompetitorGroup,
  CompetitorVideo,
} from "@/types/competitor";

type Props = {
  ideas: Idea[];
  highlightedIdeaId?: number | null;
  competitorGroups?: CompetitorGroup[];
  competitorChannels?: CompetitorChannel[];
  competitorVideos?: CompetitorVideo[];
};

type IdeaSection =
  | "strategy-map"
  | "brainstorm-flow"
  | "remix-rule-engine"
  | "idea-bank";

const sections = {
  "strategy-map": {
    label: "Strategy Map",
    description:
      "View ideas by Story Pillar → Theme Cluster → Niche → Specific Idea.",
    icon: Network,
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-700",
    color: "from-purple-500 to-fuchsia-500",
  },
  "brainstorm-flow": {
    label: "Brainstorm Flow",
    description:
      "Generate new ideas through a structured creative hierarchy.",
    icon: WandSparkles,
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-700",
    color: "from-rose-500 to-orange-500",
  },
  "remix-rule-engine": {
    label: "Remix Rule Engine",
    description:
      "Turn source videos and ideas into original remixes using strict remix rules.",
    icon: Shuffle,
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    color: "from-amber-500 to-yellow-500",
  },
  "idea-bank": {
    label: "Idea Bank",
    description:
      "Classic table view for editing, viewing and managing individual ideas.",
    icon: Database,
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    color: "from-blue-500 to-cyan-500",
  },
};

export default function IdeaWorkspace({
  ideas,
  highlightedIdeaId = null,
  competitorGroups = [],
  competitorChannels = [],
  competitorVideos = [],
}: Props) {
  const [activeSection, setActiveSection] =
    useState<IdeaSection>("strategy-map");

  const selectedStyle = sections[activeSection];
  const SelectedIcon = selectedStyle.icon;

  return (
    <div className="space-y-6 studioos-readable">
      <div className="bg-white rounded-3xl shadow border p-4">
        <div className="grid grid-cols-4 gap-3">
          {(Object.keys(sections) as IdeaSection[]).map((section) => {
            const style = sections[section];
            const Icon = style.icon;
            const isActive = activeSection === section;

            return (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`rounded-2xl border p-5 text-left transition ${
                  isActive
                    ? `${style.bg} ${style.border}`
                    : "border-gray-100 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${style.color} text-white flex items-center justify-center shrink-0`}
                  >
                    <Icon size={21} />
                  </div>

                  <div>
                    <p
                      className={`font-bold text-lg ${
                        isActive ? style.text : "text-zinc-900"
                      }`}
                    >
                      {style.label}
                    </p>

                    <p className="text-sm text-slate-600 mt-1">
                      {style.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={`rounded-3xl border p-6 ${selectedStyle.bg} ${selectedStyle.border}`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${selectedStyle.color} text-white flex items-center justify-center`}
          >
            <SelectedIcon size={22} />
          </div>

          <div>
            <p className={`text-xs font-bold uppercase tracking-wide ${selectedStyle.text}`}>
              Current Idea Page
            </p>

            <h2 className="text-2xl font-bold mt-2">
              {selectedStyle.label}
            </h2>

            <p className="text-slate-600 mt-1">
              {selectedStyle.description}
            </p>
          </div>
        </div>
      </div>

      {activeSection === "strategy-map" && (
        <IdeaArchitectureMap ideas={ideas} />
      )}

      {activeSection === "brainstorm-flow" && (
        <BrainstormFlowV2 ideas={ideas} />
      )}

      {activeSection === "remix-rule-engine" && (
        <RemixRuleEngine
          ideas={ideas}
          competitorGroups={competitorGroups}
          competitorChannels={competitorChannels}
          competitorVideos={competitorVideos}
        />
      )}

      {activeSection === "idea-bank" && (
        <IdeaBank
          ideas={ideas}
          highlightedIdeaId={highlightedIdeaId}
        />
      )}
    </div>
  );
}
