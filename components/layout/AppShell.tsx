"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import Dashboard from "@/components/dashboard/Dashboard";
import type { Idea } from "@/types/idea";
import type { Video } from "@/types/video";
import type {
  CompetitorChannel,
  CompetitorGroup,
} from "@/types/competitor";
import type { ActiveView } from "@/types/navigation";

type Props = {
  ideas: Idea[];
  videos: Video[];
  competitorGroups: CompetitorGroup[];
  competitorChannels: CompetitorChannel[];
};

export default function AppShell({
  ideas,
  videos,
  competitorGroups,
  competitorChannels,
}: Props) {
  const [activeView, setActiveView] =
    useState<ActiveView>("dashboard");

  const [highlightedIdeaId, setHighlightedIdeaId] =
    useState<number | null>(null);

  function handleHighlightIdea(ideaId: number) {
    setHighlightedIdeaId(null);

    setTimeout(() => {
      setHighlightedIdeaId(ideaId);
    }, 50);
  }

  return (
    <main className="flex h-screen bg-gray-100">
      <Sidebar
        activeView={activeView}
        onChangeView={setActiveView}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar
          ideas={ideas}
          onChangeView={setActiveView}
          onHighlightIdea={handleHighlightIdea}
        />

        <div className="flex-1 overflow-auto">
          <Dashboard
            ideas={ideas}
            videos={videos}
            competitorGroups={competitorGroups}
            competitorChannels={competitorChannels}
            activeView={activeView}
            onChangeView={setActiveView}
            highlightedIdeaId={highlightedIdeaId}
          />
        </div>
      </div>
    </main>
  );
}