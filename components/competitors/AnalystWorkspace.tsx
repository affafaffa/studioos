"use client";

import { useEffect, useState } from "react";
import {
  ChevronRight,
  LineChart,
  Rocket,
  Target,
} from "lucide-react";
import AnalystActionCenter from "@/components/competitors/AnalystActionCenter";
import CompetitorGroupAnalyst from "@/components/competitors/CompetitorGroupAnalyst";
import type {
  CompetitorChannel,
  CompetitorGroup,
  CompetitorVideo,
} from "@/types/competitor";

type AnalystSection = "group-drilldown" | "action-center";

type Props = {
  competitorGroups: CompetitorGroup[];
  competitorChannels: CompetitorChannel[];
  competitorVideos: CompetitorVideo[];
};

const analystSections = {
  "group-drilldown": {
    label: "Group Drilldown",
    description:
      "Deep analysis by competitor group: traffic, market share, top channels, top videos and keywords.",
    icon: LineChart,
    color: "from-blue-500 to-cyan-500",
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
  },
  "action-center": {
    label: "Action Center",
    description:
      "Turn signals into actions: create remix ideas, save insights, mark groups and export reports.",
    icon: Rocket,
    color: "from-rose-500 to-orange-500",
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-700",
  },
};

export default function AnalystWorkspace({
  competitorGroups,
  competitorChannels,
  competitorVideos,
}: Props) {
  const [activeSection, setActiveSection] =
    useState<AnalystSection>("group-drilldown");

  useEffect(() => {
    const savedSection = window.localStorage.getItem(
      "studioos-analyst-section"
    ) as AnalystSection | null;

    if (savedSection) {
      setActiveSection(savedSection);
    }

    function handleSectionChange(event: Event) {
      const customEvent = event as CustomEvent<{
        section?: AnalystSection;
      }>;

      if (customEvent.detail?.section) {
        setActiveSection(customEvent.detail.section);
      }
    }

    window.addEventListener(
      "studioos-analyst-section-change",
      handleSectionChange
    );

    return () => {
      window.removeEventListener(
        "studioos-analyst-section-change",
        handleSectionChange
      );
    };
  }, []);

  function handleSectionClick(section: AnalystSection) {
    setActiveSection(section);

    window.localStorage.setItem(
      "studioos-analyst-section",
      section
    );

    window.dispatchEvent(
      new CustomEvent("studioos-analyst-section-change", {
        detail: {
          section,
        },
      })
    );
  }

  const selectedStyle = analystSections[activeSection];
  const SelectedIcon = selectedStyle.icon;

  return (
    <div className="space-y-6 studioos-readable">
      <div className="rounded-3xl bg-zinc-950 text-white p-7 shadow">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-2 text-sm">
              <Target size={16} />
              Analyst Workspace
            </div>

            <h2 className="text-3xl font-bold mt-4">
              Competitor Analyst
            </h2>

            <p className="text-zinc-300 mt-2 max-w-3xl">
              Analyst được tách thành các mục con riêng để không làm rối trang drilldown.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow border p-4">
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(analystSections) as AnalystSection[]).map((section) => {
            const style = analystSections[section];
            const Icon = style.icon;
            const isActive = activeSection === section;

            return (
              <button
                key={section}
                onClick={() => handleSectionClick(section)}
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

                  <div className="min-w-0 flex-1">
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

                  <ChevronRight
                    size={18}
                    className={isActive ? style.text : "text-slate-300"}
                  />
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
              Current Analyst Page
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

      {activeSection === "group-drilldown" && (
        <CompetitorGroupAnalyst
          competitorGroups={competitorGroups}
          competitorChannels={competitorChannels}
          competitorVideos={competitorVideos}
        />
      )}

      {activeSection === "action-center" && (
        <AnalystActionCenter
          competitorGroups={competitorGroups}
          competitorChannels={competitorChannels}
          competitorVideos={competitorVideos}
        />
      )}
    </div>
  );
}
