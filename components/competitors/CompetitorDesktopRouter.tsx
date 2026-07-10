"use client";

import { useEffect, useState } from "react";
import CompetitorChannelAnalyzer from "@/components/competitors/CompetitorChannelAnalyzer";
import CompetitorWorkspace from "@/components/competitors/CompetitorWorkspace";
import type {
  CompetitorChannel,
  CompetitorGroup,
  CompetitorVideo,
} from "@/types/competitor";

type Props = {
  competitorGroups: CompetitorGroup[];
  competitorChannels: CompetitorChannel[];
  competitorVideos: CompetitorVideo[];
  competitorRemixes?: any[];
  onOpenIdea?: (ideaId: number) => void;
};

type CompetitorSection =
  | "market-share"
  | "groups"
  | "channel-analyzer"
  | "keyword-radar"
  | "remix-lab"
  | "video-metadata";

function normalizeSection(value: string | null): CompetitorSection {
  if (
    value === "market-share" ||
    value === "groups" ||
    value === "channel-analyzer" ||
    value === "keyword-radar" ||
    value === "remix-lab" ||
    value === "video-metadata"
  ) {
    return value;
  }

  return "market-share";
}

export default function CompetitorDesktopRouter({
  competitorGroups,
  competitorChannels,
  competitorVideos,
  competitorRemixes = [],
  onOpenIdea,
}: Props) {
  const [section, setSection] =
    useState<CompetitorSection>("market-share");

  useEffect(() => {
    setSection(
      normalizeSection(
        window.localStorage.getItem("studioos-competitor-section")
      )
    );

    function handleSectionChange(event: Event) {
      const customEvent = event as CustomEvent<{
        section?: CompetitorSection;
      }>;

      setSection(
        normalizeSection(customEvent.detail?.section || null)
      );
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

  if (section === "channel-analyzer") {
    return (
      <CompetitorChannelAnalyzer
        competitorGroups={competitorGroups}
        competitorChannels={competitorChannels}
        competitorVideos={competitorVideos}
      />
    );
  }

  return (
    <CompetitorWorkspace
      competitorGroups={competitorGroups}
      competitorChannels={competitorChannels}
      competitorVideos={competitorVideos}
      competitorRemixes={competitorRemixes}
      onOpenIdea={onOpenIdea}
    />
  );
}
