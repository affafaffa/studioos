"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Database,
  FolderKanban,
  FolderSearch,
  LayoutDashboard,
  Lightbulb,
  PieChart,
  Radar,
  Settings,
  Sparkles,
  Video,
} from "lucide-react";
import type { ActiveView } from "@/types/navigation";

type CompetitorSection =
  | "market-share"
  | "groups"
  | "keyword-radar"
  | "remix-lab"
  | "video-metadata";

type Props = {
  activeView: ActiveView;
  onChangeView: (view: ActiveView) => void;
};

const navItems: {
  id: ActiveView;
  label: string;
  icon: LucideIcon;
}[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "ideas",
    label: "Ideas",
    icon: Lightbulb,
  },
  {
    id: "videos",
    label: "Videos",
    icon: Video,
  },
  {
    id: "competitors",
    label: "Competitors",
    icon: FolderSearch,
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
  },
  {
    id: "ai",
    label: "AI Assistant",
    icon: Bot,
  },
  {
    id: "calendar",
    label: "Calendar",
    icon: CalendarDays,
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
  },
];

const competitorSections: {
  id: CompetitorSection;
  label: string;
  icon: LucideIcon;
  colorClass: string;
}[] = [
  {
    id: "market-share",
    label: "Group Market Share",
    icon: PieChart,
    colorClass: "text-rose-400",
  },
  {
    id: "groups",
    label: "Groups & Channels",
    icon: FolderKanban,
    colorClass: "text-blue-400",
  },
  {
    id: "keyword-radar",
    label: "Keyword Radar",
    icon: Radar,
    colorClass: "text-purple-400",
  },
  {
    id: "remix-lab",
    label: "Competitor Remix Lab",
    icon: Sparkles,
    colorClass: "text-amber-400",
  },
  {
    id: "video-metadata",
    label: "Video Metadata",
    icon: Database,
    colorClass: "text-emerald-400",
  },
];

export default function Sidebar({
  activeView,
  onChangeView,
}: Props) {
  const [activeCompetitorSection, setActiveCompetitorSection] =
    useState<CompetitorSection>("market-share");

  useEffect(() => {
    const savedSection = window.localStorage.getItem(
      "studioos-competitor-section"
    ) as CompetitorSection | null;

    if (savedSection) {
      setActiveCompetitorSection(savedSection);
    }

    function handleSectionChange(event: Event) {
      const customEvent = event as CustomEvent<{
        section?: CompetitorSection;
      }>;

      if (customEvent.detail?.section) {
        setActiveCompetitorSection(customEvent.detail.section);
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

  function handleMainClick(view: ActiveView) {
    onChangeView(view);

    if (view === "competitors") {
      window.localStorage.setItem(
        "studioos-competitor-section",
        activeCompetitorSection
      );

      window.dispatchEvent(
        new CustomEvent("studioos-competitor-section-change", {
          detail: {
            section: activeCompetitorSection,
          },
        })
      );
    }
  }

  function handleCompetitorSectionClick(section: CompetitorSection) {
    setActiveCompetitorSection(section);
    onChangeView("competitors");

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

  const competitorOpen = activeView === "competitors";

  return (
    <aside className="w-[252px] bg-zinc-950 text-white min-h-screen fixed left-0 top-0 border-r border-zinc-800 z-40">
      <div className="h-16 flex items-center px-6 border-b border-zinc-800">
        <div>
          <h1 className="text-xl font-bold">
            🎬 StudioOS
          </h1>

          <p className="text-xs text-zinc-500 mt-1">
            YouTube command center
          </p>
        </div>
      </div>

      <nav className="p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          const isCompetitor = item.id === "competitors";

          return (
            <div key={item.id}>
              <button
                onClick={() => handleMainClick(item.id)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-left transition ${
                  isActive
                    ? "bg-white text-zinc-950"
                    : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} />

                  <span className="text-[14.5px] font-semibold">
                    {item.label}
                  </span>
                </div>

                {isCompetitor &&
                  (competitorOpen ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  ))}
              </button>

              {isCompetitor && competitorOpen && (
                <div className="mt-2 ml-3 pl-3 border-l border-zinc-800 space-y-1">
                  {competitorSections.map((section) => {
                    const SectionIcon = section.icon;
                    const isSectionActive =
                      activeCompetitorSection === section.id;

                    return (
                      <button
                        key={section.id}
                        onClick={() =>
                          handleCompetitorSectionClick(section.id)
                        }
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
                          isSectionActive
                            ? "bg-zinc-800 text-white"
                            : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                        }`}
                      >
                        <SectionIcon
                          size={16}
                          className={section.colorClass}
                        />

                        <span className="text-[13.5px] font-semibold leading-5">
                          {section.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
