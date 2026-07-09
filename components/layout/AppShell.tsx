"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import Dashboard from "@/components/dashboard/Dashboard";
import type { Idea } from "@/types/idea";
import type { Video as StudioVideo } from "@/types/video";
import type {
  CompetitorChannel,
  CompetitorGroup,
  CompetitorVideo,
} from "@/types/competitor";
import type { ActiveView } from "@/types/navigation";

type Props = {
  ideas: Idea[];
  videos: StudioVideo[];
  competitorGroups: CompetitorGroup[];
  competitorChannels: CompetitorChannel[];
  competitorVideos: CompetitorVideo[];
  competitorRemixes?: any[];
};

function normalizeView(value: string | null): ActiveView {
  if (
    value === "dashboard" ||
    value === "ideas" ||
    value === "competitors" ||
    value === "analyst" ||
    value === "ai" ||
    value === "calendar" ||
    value === "settings"
  ) {
    return value;
  }

  return "dashboard";
}

export default function AppShell({
  ideas,
  videos,
  competitorGroups,
  competitorChannels,
  competitorVideos,
  competitorRemixes = [],
}: Props) {
  const [activeView, setActiveView] =
    useState<ActiveView>("dashboard");

  const [highlightedIdeaId, setHighlightedIdeaId] =
    useState<number | null>(null);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const savedView = window.localStorage.getItem(
      "studioos-active-view"
    );

    const nextView = normalizeView(savedView);

    setActiveView(nextView);

    if (savedView !== nextView) {
      window.localStorage.setItem(
        "studioos-active-view",
        nextView
      );
    }
  }, []);

  function handleChangeView(view: ActiveView) {
    setActiveView(view);

    window.localStorage.setItem(
      "studioos-active-view",
      view
    );
  }

  function handleOpenIdeaFromRemix(ideaId: number) {
    setHighlightedIdeaId(ideaId);
    handleChangeView("ideas");

    window.localStorage.setItem(
      "studioos-idea-section",
      "review-ideas"
    );

    window.dispatchEvent(
      new CustomEvent("studioos-idea-section-change", {
        detail: {
          section: "review-ideas",
        },
      })
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 overflow-x-hidden">
      <Sidebar
        activeView={activeView}
        onChangeView={handleChangeView}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <Topbar
        activeView={activeView}
        onOpenMobileMenu={() => setMobileSidebarOpen(true)}
      />

      <main className="pt-16 lg:ml-[252px] min-w-0">
        <Dashboard
          ideas={ideas}
          videos={videos}
          competitorGroups={competitorGroups}
          competitorChannels={competitorChannels}
          competitorVideos={competitorVideos}
          competitorRemixes={competitorRemixes}
          activeView={activeView}
          onChangeView={handleChangeView}
          highlightedIdeaId={highlightedIdeaId}
          onOpenIdeaFromRemix={handleOpenIdeaFromRemix}
        />
      </main>
    </div>
  );
}
