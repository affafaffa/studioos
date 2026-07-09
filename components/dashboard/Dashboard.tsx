"use client";

import type { ReactNode } from "react";
import KPICard from "./KPICard";
import IdeaBank from "./IdeaBank";
import IdeaWorkspace from "@/components/ideas/IdeaWorkspace";
import AddIdeaButton from "./AddIdeaButton";
import AIBrainstormPanel from "./AIBrainstormPanel";
import VideoPipeline from "@/components/videos/VideoPipeline";
import BulkImportChannelsButton from "@/components/competitors/BulkImportChannelsButton";
import CompetitorWorkspace from "@/components/competitors/CompetitorWorkspace";
import AnalystWorkspace from "@/components/competitors/AnalystWorkspace";
import type { Idea } from "@/types/idea";
import type { Video as StudioVideo } from "@/types/video";
import type {
  CompetitorChannel,
  CompetitorGroup,
  CompetitorVideo,
} from "@/types/competitor";
import type { ActiveView } from "@/types/navigation";

type Props = {
  ideas?: Idea[];
  videos?: StudioVideo[];
  competitorGroups?: CompetitorGroup[];
  competitorChannels?: CompetitorChannel[];
  competitorVideos?: CompetitorVideo[];
  competitorRemixes?: any[];
  activeView: ActiveView;
  onChangeView?: (view: ActiveView) => void;
  highlightedIdeaId?: number | null;
  onOpenIdeaFromRemix?: (ideaId: number) => void;
};

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

function formatMoney(value: number) {
  return `$${value.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
}

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>

        <p className="text-gray-500 mt-1">
          {description}
        </p>
      </div>

      {action}
    </div>
  );
}

function PlaceholderView({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow p-10">
      <h2 className="text-2xl font-bold">{title}</h2>

      <p className="text-gray-500 mt-3 max-w-2xl">
        {description}
      </p>

      <div className="mt-8 rounded-2xl border border-dashed p-8 text-gray-500">
        This module will be built in the next sprints.
      </div>
    </div>
  );
}

export default function Dashboard({
  ideas = [],
  videos = [],
  competitorGroups = [],
  competitorChannels = [],
  competitorVideos = [],
  competitorRemixes = [],
  activeView,
  highlightedIdeaId = null,
  onOpenIdeaFromRemix,
}: Props) {
  const safeIdeas = ideas || [];
  const safeVideos = videos || [];
  const safeCompetitorGroups = competitorGroups || [];
  const safeCompetitorChannels = competitorChannels || [];
  const safeCompetitorVideos = competitorVideos || [];
  const safeCompetitorRemixes = competitorRemixes || [];

  const totalIdeas = safeIdeas.length;

  const publishedIdeas = safeIdeas.filter(
    (idea) => idea.status === "Published"
  );

  const publishedCount = publishedIdeas.length;

  const totalRevenue = safeIdeas.reduce(
    (sum, idea) => sum + Number(idea.revenue || 0),
    0
  );

  const averageCtr =
    publishedIdeas.length > 0
      ? publishedIdeas.reduce(
          (sum, idea) => sum + Number(idea.ctr || 0),
          0
        ) / publishedIdeas.length
      : 0;

  const topIdeas = [...safeIdeas]
    .sort(
      (a, b) =>
        Number(b.views || 0) - Number(a.views || 0)
    )
    .slice(0, 5);

  const themeStats = Array.from(
    safeIdeas.reduce((map, idea) => {
      const theme = idea.theme || "Unknown";
      map.set(theme, (map.get(theme) || 0) + 1);
      return map;
    }, new Map<string, number>())
  ).sort((a, b) => b[1] - a[1]);

  const videoRevenue = safeVideos.reduce(
    (sum, video) => sum + Number(video.revenue || 0),
    0
  );

  const publishedVideos = safeVideos.filter(
    (video) => video.status === "Published"
  );

  const kpiCards = (
    <div className="grid grid-cols-4 gap-6 mb-8">
      <KPICard
        title="Ideas"
        value={formatNumber(totalIdeas)}
      />

      <KPICard
        title="Published Ideas"
        value={formatNumber(publishedCount)}
      />

      <KPICard
        title="Idea Revenue"
        value={formatMoney(totalRevenue)}
      />

      <KPICard
        title="Avg CTR"
        value={`${averageCtr.toFixed(1)}%`}
      />
    </div>
  );

  if (activeView === "ideas") {
    return (
      <div className="p-8 bg-gray-100 min-h-screen">
        <SectionHeader
          title="Ideas"
          description="Build ideas through a structured creative architecture: story pillar, theme cluster, niche and specific concept."
          action={<AddIdeaButton ideas={safeIdeas} />}
        />

        <IdeaWorkspace
          ideas={safeIdeas}
          highlightedIdeaId={highlightedIdeaId}
          competitorGroups={safeCompetitorGroups}
          competitorChannels={safeCompetitorChannels}
          competitorVideos={safeCompetitorVideos}
        />
      </div>
    );
  }

  if (activeView === "videos") {
    return (
      <div className="p-8 bg-gray-100 min-h-screen">
        <SectionHeader
          title="Videos"
          description="Track video production, publishing and performance."
        />

        <VideoPipeline
          ideas={safeIdeas}
          videos={safeVideos}
        />
      </div>
    );
  }

  if (activeView === "competitors") {
    return (
      <div className="p-8 bg-gray-100 min-h-screen">
        <SectionHeader
          title="Competitors"
          description="Track competitor groups, market share, keywords, remixes and video metadata."
          action={
            <BulkImportChannelsButton
              groups={safeCompetitorGroups}
              existingChannels={safeCompetitorChannels}
            />
          }
        />

        <CompetitorWorkspace
          competitorGroups={safeCompetitorGroups}
          competitorChannels={safeCompetitorChannels}
          competitorVideos={safeCompetitorVideos}
          competitorRemixes={safeCompetitorRemixes}
          onOpenIdea={onOpenIdeaFromRemix}
        />
      </div>
    );
  }

  if (activeView === "analyst") {
    return (
      <div className="p-8 bg-gray-100 min-h-screen">
        <SectionHeader
          title="Analyst"
          description="Analyze competitor groups and turn research signals into actions."
        />

        <AnalystWorkspace
          competitorGroups={safeCompetitorGroups}
          competitorChannels={safeCompetitorChannels}
          competitorVideos={safeCompetitorVideos}
        />
      </div>
    );
  }

  if (activeView === "analytics") {
    return (
      <div className="p-8 bg-gray-100 min-h-screen">
        <SectionHeader
          title="Analytics"
          description="Quick overview of idea, video and competitor tracking."
        />

        {kpiCards}

        <div className="grid grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Videos"
            value={formatNumber(safeVideos.length)}
          />

          <KPICard
            title="Published Videos"
            value={formatNumber(publishedVideos.length)}
          />

          <KPICard
            title="Competitor Channels"
            value={formatNumber(safeCompetitorChannels.length)}
          />

          <KPICard
            title="Total Revenue"
            value={formatMoney(totalRevenue + videoRevenue)}
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-xl font-bold mb-4">
              Top Ideas by Views
            </h2>

            <div className="space-y-4">
              {topIdeas.map((idea) => (
                <div
                  key={idea.id}
                  className="flex items-center justify-between border-b pb-3 last:border-b-0"
                >
                  <div>
                    <p className="font-medium">{idea.title}</p>

                    <p className="text-sm text-gray-500">
                      {idea.theme || "-"} · {idea.status || "Idea"}
                    </p>
                  </div>

                  <p className="font-bold">
                    {Number(idea.views || 0).toLocaleString("en-US")}
                  </p>
                </div>
              ))}

              {topIdeas.length === 0 && (
                <p className="text-sm text-gray-500">
                  No ideas yet.
                </p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-xl font-bold mb-4">
              Ideas by Theme
            </h2>

            <div className="space-y-4">
              {themeStats.map(([theme, count]) => (
                <div
                  key={theme}
                  className="flex items-center justify-between border-b pb-3 last:border-b-0"
                >
                  <p className="font-medium">{theme}</p>

                  <p className="font-bold">
                    {count} ideas
                  </p>
                </div>
              ))}

              {themeStats.length === 0 && (
                <p className="text-sm text-gray-500">
                  No theme data yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeView === "ai") {
    return (
      <div className="p-8 bg-gray-100 min-h-screen">
        <SectionHeader
          title="AI Assistant"
          description="Generate, improve and save creative briefs."
        />

        <AIBrainstormPanel existingIdeas={safeIdeas} />
      </div>
    );
  }

  if (activeView === "calendar") {
    return (
      <div className="p-8 bg-gray-100 min-h-screen">
        <SectionHeader
          title="Calendar"
          description="Plan publishing schedule and production deadlines."
        />

        <PlaceholderView
          title="Content Calendar"
          description="This section will later show upload schedule, production deadlines and batch planning for your channels."
        />
      </div>
    );
  }

  if (activeView === "settings") {
    return (
      <div className="p-8 bg-gray-100 min-h-screen">
        <SectionHeader
          title="Settings"
          description="StudioOS configuration and workspace settings."
        />

        <PlaceholderView
          title="Workspace Settings"
          description="This section will later manage channels, themes, languages, AI settings, Supabase security and team access."
        />
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <SectionHeader
        title="Dashboard"
        description="Your YouTube studio command center."
        action={<AddIdeaButton ideas={safeIdeas} />}
      />

      {kpiCards}

      <AIBrainstormPanel existingIdeas={safeIdeas} />

      <IdeaBank
        ideas={safeIdeas}
        highlightedIdeaId={highlightedIdeaId}
      />
    </div>
  );
}
