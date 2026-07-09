"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Database,
  FolderKanban,
  Layers,
  PieChart,
  Radar,
  Sparkles,
  Upload,
} from "lucide-react";
import BulkImportChannelsButton from "@/components/competitors/BulkImportChannelsButton";
import CompetitorIntelligence from "@/components/competitors/CompetitorIntelligence";
import CompetitorKeywordRadar from "@/components/competitors/CompetitorKeywordRadar";
import CompetitorMarketShareDashboard from "@/components/competitors/CompetitorMarketShareDashboard";
import CompetitorRemixLab from "@/components/competitors/CompetitorRemixLab";
import CompetitorVideosPanel from "@/components/competitors/CompetitorVideosPanel";
import type {
  CompetitorChannel,
  CompetitorGroup,
  CompetitorVideo,
} from "@/types/competitor";

type CompetitorSection =
  | "market-share"
  | "groups"
  | "keyword-radar"
  | "remix-lab"
  | "video-metadata";

type Props = {
  competitorGroups: CompetitorGroup[];
  competitorChannels: CompetitorChannel[];
  competitorVideos: CompetitorVideo[];
  competitorRemixes: any[];
  onOpenIdea?: (ideaId: number) => void;
};

const sectionStyles = {
  "market-share": {
    label: "Group Market Share",
    description:
      "Traffic share, views/day, monthly and daily market movement.",
    icon: PieChart,
    color: "from-rose-500 to-orange-500",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
  },
  groups: {
    label: "Groups & Channels",
    description:
      "Manage competitor groups and tracked YouTube channels.",
    icon: FolderKanban,
    color: "from-blue-500 to-cyan-500",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  "keyword-radar": {
    label: "Keyword Radar",
    description:
      "Find rising market phrases from competitor titles, descriptions and tags.",
    icon: Radar,
    color: "from-purple-500 to-fuchsia-500",
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
  },
  "remix-lab": {
    label: "Competitor Remix Lab",
    description:
      "Review competitor-inspired ideas saved into Idea Bank.",
    icon: Sparkles,
    color: "from-amber-500 to-yellow-500",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  "video-metadata": {
    label: "Competitor Video Metadata",
    description:
      "Browse synced videos, thumbnails, views and remix actions.",
    icon: Database,
    color: "from-emerald-500 to-teal-500",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
};

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

function WorkspaceStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "rose" | "blue" | "purple" | "emerald";
}) {
  const toneClass = {
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
        {label}
      </p>

      <p className="text-2xl font-bold mt-2">
        {value}
      </p>
    </div>
  );
}

export default function CompetitorWorkspace({
  competitorGroups,
  competitorChannels,
  competitorVideos,
  competitorRemixes,
  onOpenIdea,
}: Props) {
  const [activeSection, setActiveSection] =
    useState<CompetitorSection>("market-share");

  useEffect(() => {
    const savedSection = window.localStorage.getItem(
      "studioos-competitor-section"
    ) as CompetitorSection | null;

    if (savedSection) {
      setActiveSection(savedSection);
    }

    function handleSectionChange(event: Event) {
      const customEvent = event as CustomEvent<{
        section?: CompetitorSection;
      }>;

      if (customEvent.detail?.section) {
        setActiveSection(customEvent.detail.section);
      }
    }

    window.addEventListener(
      "studioos-competitor-section-change",
      handleSectionChange
    );

    return () => {
      window.removeEventListener(
        "studioos-competitor-section-change",
        handleSectionChange
      );
    };
  }, []);

  const totalViews = competitorVideos.reduce(
    (sum, video) => sum + Number(video.view_count || 0),
    0
  );

  const videosWithThumbnail = competitorVideos.filter((video) => {
    return Boolean(
      video.thumbnail_maxres_url ||
        video.thumbnail_standard_url ||
        video.thumbnail_high_url ||
        video.thumbnail_medium_url ||
        video.thumbnail_url ||
        video.thumbnail_default_url
    );
  }).length;

  const activeChannels = competitorChannels.filter(
    (channel) => channel.status === "Active"
  ).length;

  const selectedStyle = sectionStyles[activeSection];
  const SelectedIcon = selectedStyle.icon;

  const sectionItems = useMemo(() => {
    return [
      {
        id: "market-share" as const,
        count: competitorGroups.length,
      },
      {
        id: "groups" as const,
        count: competitorChannels.length,
      },
      {
        id: "keyword-radar" as const,
        count: competitorVideos.length,
      },
      {
        id: "remix-lab" as const,
        count: competitorRemixes.length,
      },
      {
        id: "video-metadata" as const,
        count: competitorVideos.length,
      },
    ];
  }, [
    competitorGroups.length,
    competitorChannels.length,
    competitorRemixes.length,
    competitorVideos.length,
  ]);

  function handleSectionClick(section: CompetitorSection) {
    setActiveSection(section);

    window.localStorage.setItem(
      "studioos-competitor-section",
      section
    );

    window.dispatchEvent(
      new CustomEvent("studioos-competitor-section-change", {
        detail: {
          section,
        },
      })
    );
  }

  function handleOpenIdea(ideaId: number) {
    if (onOpenIdea) {
      onOpenIdea(ideaId);
      return;
    }

    window.dispatchEvent(
      new CustomEvent("studioos-open-idea", {
        detail: {
          ideaId,
        },
      })
    );
  }

  return (
    <div className="space-y-6 studioos-readable competitor-readable">
      <div className="rounded-3xl bg-zinc-950 text-white p-7 shadow">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-2 text-sm">
              <Layers size={16} />
              Competitor Command Center
            </div>

            <h2 className="text-3xl font-bold mt-4">
              Competitor Workspace
            </h2>

            <p className="text-zinc-300 mt-2 max-w-3xl">
              Competitor research is split into focused pages: market share, groups, keyword radar, remix lab and video metadata.
            </p>
          </div>

          <div className="hidden xl:block">
            <BulkImportChannelsButton
              groups={competitorGroups}
              existingChannels={competitorChannels}
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-7">
          <WorkspaceStat
            label="Groups"
            value={formatNumber(competitorGroups.length)}
            tone="rose"
          />

          <WorkspaceStat
            label="Channels"
            value={formatNumber(competitorChannels.length)}
            tone="blue"
          />

          <WorkspaceStat
            label="Videos"
            value={formatNumber(competitorVideos.length)}
            tone="purple"
          />

          <WorkspaceStat
            label="Public Views"
            value={formatNumber(totalViews)}
            tone="emerald"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow border p-4">
        <div className="grid grid-cols-5 gap-3">
          {sectionItems.map((item) => {
            const style = sectionStyles[item.id];
            const Icon = style.icon;
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSectionClick(item.id)}
                className={`rounded-2xl border p-4 text-left transition ${
                  isActive
                    ? `${style.bg} ${style.border}`
                    : "border-gray-100 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${style.color} text-white flex items-center justify-center shrink-0`}
                  >
                    <Icon size={18} />
                  </div>

                  <div className="min-w-0">
                    <p
                      className={`font-bold text-sm ${
                        isActive ? style.text : "text-zinc-900"
                      }`}
                    >
                      {style.label}
                    </p>

                    <p className="text-xs text-gray-500 mt-1">
                      {formatNumber(item.count)} records
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
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${selectedStyle.color} text-white flex items-center justify-center`}
            >
              <SelectedIcon size={22} />
            </div>

            <div>
              <p
                className={`text-xs font-bold uppercase tracking-wide ${selectedStyle.text}`}
              >
                Current Page
              </p>

              <h2 className="text-2xl font-bold mt-2">
                {selectedStyle.label}
              </h2>

              <p className="text-gray-600 mt-1">
                {selectedStyle.description}
              </p>
            </div>
          </div>

          {activeSection === "groups" && (
            <div className="flex items-center gap-3">
              <div className="hidden 2xl:block">
                <BulkImportChannelsButton
                  groups={competitorGroups}
                  existingChannels={competitorChannels}
                />
              </div>

              <div className="w-12 h-12 rounded-2xl bg-white border flex items-center justify-center">
                <Upload size={20} className={selectedStyle.text} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="min-w-0">
        {activeSection === "market-share" && (
          <CompetitorMarketShareDashboard
            competitorGroups={competitorGroups}
            competitorChannels={competitorChannels}
            competitorVideos={competitorVideos}
          />
        )}

        {activeSection === "groups" && (
          <CompetitorIntelligence
            competitorGroups={competitorGroups}
            competitorChannels={competitorChannels}
          />
        )}

        {activeSection === "keyword-radar" && (
          <CompetitorKeywordRadar />
        )}

        {activeSection === "remix-lab" && (
          <CompetitorRemixLab
            competitorRemixes={competitorRemixes}
            onOpenIdea={handleOpenIdea}
          />
        )}

        {activeSection === "video-metadata" && (
          <CompetitorVideosPanel
            competitorGroups={competitorGroups}
            competitorChannels={competitorChannels}
            competitorVideos={competitorVideos}
          />
        )}
      </div>

      <div className="bg-white rounded-3xl shadow p-5 border">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
          Quick Health
        </p>

        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="rounded-2xl border p-4">
            <p className="text-sm text-gray-500">
              Active channels
            </p>

            <p className="text-2xl font-bold mt-1">
              {formatNumber(activeChannels)}
            </p>
          </div>

          <div className="rounded-2xl border p-4">
            <p className="text-sm text-gray-500">
              Videos with thumbnail
            </p>

            <p className="text-2xl font-bold mt-1">
              {formatNumber(videosWithThumbnail)}
            </p>
          </div>

          <div className="rounded-2xl border p-4">
            <p className="text-sm text-gray-500">
              Remixes
            </p>

            <p className="text-2xl font-bold mt-1">
              {formatNumber(competitorRemixes.length)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
