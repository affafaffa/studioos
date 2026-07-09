"use client";

import { useEffect, useState } from "react";
import {
  Lightbulb,
  Network,
  WandSparkles,
} from "lucide-react";
import CreateIdeasWorkspace from "@/components/ideas/CreateIdeasWorkspace";
import IdeaArchitectureMap from "@/components/ideas/IdeaArchitectureMap";
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
  onOpenCalendar?: () => void;
};

type IdeaSection =
  | "create-ideas"
  | "review-ideas"
  | "strategy-map";

const sections = {
  "create-ideas": {
    label: "Create Ideas",
    description:
      "Generate new ideas from market signals or competitor sources.",
    icon: WandSparkles,
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-700",
    color: "from-rose-500 to-orange-500",
  },
  "review-ideas": {
    label: "Review Ideas",
    description:
      "Choose which ideas are worth planning and move them to Calendar.",
    icon: Lightbulb,
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    color: "from-amber-500 to-yellow-500",
  },
  "strategy-map": {
    label: "Strategy Map",
    description:
      "See the full architecture: Story Pillar → Theme Cluster → Niche → Idea.",
    icon: Network,
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-700",
    color: "from-purple-500 to-fuchsia-500",
  },
};

function normalizeSection(value: string | null): IdeaSection {
  if (
    value === "create-ideas" ||
    value === "review-ideas" ||
    value === "strategy-map"
  ) {
    return value;
  }

  return "create-ideas";
}

export default function IdeaWorkspace({
  ideas,
  highlightedIdeaId = null,
  competitorGroups = [],
  competitorChannels = [],
  competitorVideos = [],
  onOpenCalendar,
}: Props) {
  const [activeSection, setActiveSection] =
    useState<IdeaSection>("create-ideas");

  useEffect(() => {
    const savedSection = normalizeSection(
      window.localStorage.getItem("studioos-idea-section")
    );

    setActiveSection(savedSection);

    function handleSectionChange(event: Event) {
      const customEvent = event as CustomEvent<{
        section?: IdeaSection;
      }>;

      setActiveSection(
        normalizeSection(customEvent.detail?.section || null)
      );
    }

    window.addEventListener(
      "studioos-idea-section-change",
      handleSectionChange
    );

    return () => {
      window.removeEventListener(
        "studioos-idea-section-change",
        handleSectionChange
      );
    };
  }, []);

  const selectedStyle = sections[activeSection];
  const SelectedIcon = selectedStyle.icon;

  return (
    <div className="space-y-6 studioos-readable">
      <div
        className={`rounded-3xl border p-6 ${selectedStyle.bg} ${selectedStyle.border}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${selectedStyle.color} text-white flex items-center justify-center shrink-0`}
            >
              <SelectedIcon size={22} />
            </div>

            <div>
              <p className={`text-xs font-bold uppercase tracking-wide ${selectedStyle.text}`}>
                Ideas Workflow
              </p>

              <h2 className="text-2xl font-bold mt-2">
                {selectedStyle.label}
              </h2>

              <p className="text-slate-600 mt-1">
                {selectedStyle.description}
              </p>
            </div>
          </div>

          <div className="hidden xl:flex items-center gap-2 text-sm font-bold text-slate-500">
            <span className={activeSection === "create-ideas" ? "text-rose-700" : ""}>
              Create
            </span>
            <span>→</span>
            <span className={activeSection === "review-ideas" ? "text-amber-700" : ""}>
              Review
            </span>
            <span>→</span>
            <span>
              Plan
            </span>
          </div>
        </div>
      </div>

      {activeSection === "create-ideas" && (
        <CreateIdeasWorkspace
          ideas={ideas}
          competitorGroups={competitorGroups}
          competitorChannels={competitorChannels}
          competitorVideos={competitorVideos}
        />
      )}

      {activeSection === "review-ideas" && (
        <IdeaBank
          ideas={ideas}
          highlightedIdeaId={highlightedIdeaId}
          onOpenCalendar={onOpenCalendar}
        />
      )}

      {activeSection === "strategy-map" && (
        <IdeaArchitectureMap ideas={ideas} />
      )}
    </div>
  );
}
