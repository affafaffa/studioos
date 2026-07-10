"use client";

import type { ReactNode } from "react";
import AddIdeaButton from "./AddIdeaButton";
import AIBrainstormPanel from "./AIBrainstormPanel";
import DashboardHome from "@/components/dashboard/DashboardHome";
import BulkImportChannelsButton from "@/components/competitors/BulkImportChannelsButton";
import CompetitorMarketScanButton from "@/components/competitors/CompetitorMarketScanButton";
import CompetitorMobileDashboard from "@/components/competitors/CompetitorMobileDashboard";
import CompetitorDesktopRouter from "@/components/competitors/CompetitorDesktopRouter";
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
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6 lg:mb-8">
      <div className="min-w-0">
        <h1 className="text-2xl lg:text-3xl font-bold">
          {title}
        </h1>

        <p className="text-gray-500 mt-1 text-sm lg:text-base leading-6">
          {description}
        </p>
      </div>

      {action && (
        <div className="w-full lg:w-auto overflow-x-auto">
          {action}
        </div>
      )}
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
  const safeCompetitorGroups = competitorGroups || [];
  const safeCompetitorChannels = competitorChannels || [];
  const safeCompetitorVideos = competitorVideos || [];
  const safeCompetitorRemixes = competitorRemixes || [];

  function openCalendar() {
    if (onChangeView) {
      onChangeView("calendar");
    }
  }

  if (activeView === "dashboard") {
    return (
      <div className="px-3 py-4 sm:p-6 lg:p-8 bg-gray-100 min-h-screen overflow-x-hidden">
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
      <div className="px-3 py-4 sm:p-6 lg:p-8 bg-gray-100 min-h-screen overflow-x-hidden">
        <SectionHeader
          title="Ideas"
          description="Create, review and plan ideas through one clear workflow."
          action={<AddIdeaButton ideas={safeIdeas} />}
        />

        <IdeaWorkspace
          ideas={safeIdeas}
          highlightedIdeaId={highlightedIdeaId}
          competitorGroups={safeCompetitorGroups}
          competitorChannels={safeCompetitorChannels}
          competitorVideos={safeCompetitorVideos}
          onOpenCalendar={openCalendar}
        />
      </div>
    );
  }

  if (activeView === "competitors") {
    return (
      <div className="px-3 py-4 sm:p-6 lg:p-8 bg-gray-100 min-h-screen overflow-x-hidden">
        <SectionHeader
          title="Competitors"
          description="Scan the market, track competitor groups, keywords, viral videos, thumbnails and metadata."
          action={
            <div className="flex items-center gap-3 min-w-max">
              <CompetitorMarketScanButton
                groups={safeCompetitorGroups}
                channels={safeCompetitorChannels}
              />

              <BulkImportChannelsButton
                groups={safeCompetitorGroups}
                existingChannels={safeCompetitorChannels}
              />
            </div>
          }
        />

        <CompetitorMobileDashboard
          competitorGroups={safeCompetitorGroups}
          competitorChannels={safeCompetitorChannels}
          competitorVideos={safeCompetitorVideos}
        />

        <div className="hidden lg:block">
          <CompetitorDesktopRouter
            competitorGroups={safeCompetitorGroups}
            competitorChannels={safeCompetitorChannels}
            competitorVideos={safeCompetitorVideos}
            competitorRemixes={safeCompetitorRemixes}
            onOpenIdea={onOpenIdeaFromRemix}
          />
        </div>
      </div>
    );
  }

  if (activeView === "analyst") {
    return (
      <div className="px-3 py-4 sm:p-6 lg:p-8 bg-gray-100 min-h-screen overflow-x-hidden">
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
      <div className="px-3 py-4 sm:p-6 lg:p-8 bg-gray-100 min-h-screen overflow-x-hidden">
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
      <div className="px-3 py-4 sm:p-6 lg:p-8 bg-gray-100 min-h-screen overflow-x-hidden">
        <SectionHeader
          title="Calendar"
          description="Drag ideas across the production workflow."
        />

        <StudioCalendar ideas={safeIdeas} />
      </div>
    );
  }

  if (activeView === "settings") {
    return (
      <div className="px-3 py-4 sm:p-6 lg:p-8 bg-gray-100 min-h-screen overflow-x-hidden">
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
    <div className="px-3 py-4 sm:p-6 lg:p-8 bg-gray-100 min-h-screen overflow-x-hidden">
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
