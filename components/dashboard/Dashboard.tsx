"use client";

import type { ReactNode } from "react";
import AddIdeaButton from "./AddIdeaButton";
import AIBrainstormPanel from "./AIBrainstormPanel";
import DashboardHome from "@/components/dashboard/DashboardHome";
import BulkImportChannelsButton from "@/components/competitors/BulkImportChannelsButton";
import CompetitorWorkspace from "@/components/competitors/CompetitorWorkspace";
import AnalystWorkspace from "@/components/competitors/AnalystWorkspace";
import IdeaWorkspace from "@/components/ideas/IdeaWorkspace";
import StudioCalendar from "@/components/calendar/StudioCalendar";
import StudioSettings from "@/components/settings/StudioSettings";
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

export default function Dashboard({
  ideas = [],
  videos = [],
  competitorGroups = [],
  competitorChannels = [],
  competitorVideos = [],
  competitorRemixes = [],
  activeView,
  onChangeView,
  highlightedIdeaId = null,
  onOpenIdeaFromRemix,
}: Props) {
  const safeIdeas = ideas || [];
  const safeVideos = videos || [];
  const safeCompetitorGroups = competitorGroups || [];
  const safeCompetitorChannels = competitorChannels || [];
  const safeCompetitorVideos = competitorVideos || [];
  const safeCompetitorRemixes = competitorRemixes || [];

  if (activeView === "dashboard") {
    return (
      <div className="p-8 bg-gray-100 min-h-screen">
        <SectionHeader
          title="Dashboard"
          description="Your simplified StudioOS command center."
        />

        <DashboardHome
          ideas={safeIdeas}
          competitorGroups={safeCompetitorGroups}
          competitorChannels={safeCompetitorChannels}
          competitorVideos={safeCompetitorVideos}
          onChangeView={onChangeView || (() => {})}
        />
      </div>
    );
  }

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
          description="Plan ideas by production status and priority."
        />

        <StudioCalendar ideas={safeIdeas} />
      </div>
    );
  }

  if (activeView === "settings") {
    return (
      <div className="p-8 bg-gray-100 min-h-screen">
        <SectionHeader
          title="Settings"
          description="StudioOS configuration, preferences and workspace health."
        />

        <StudioSettings
          ideas={safeIdeas}
          competitorGroups={safeCompetitorGroups}
          competitorChannels={safeCompetitorChannels}
          competitorVideos={safeCompetitorVideos}
        />
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <SectionHeader
        title="Dashboard"
        description="Your simplified StudioOS command center."
      />

      <DashboardHome
        ideas={safeIdeas}
        competitorGroups={safeCompetitorGroups}
        competitorChannels={safeCompetitorChannels}
        competitorVideos={safeCompetitorVideos}
        onChangeView={onChangeView || (() => {})}
      />
    </div>
  );
}
