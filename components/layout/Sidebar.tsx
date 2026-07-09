"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bot,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Database,
  FolderKanban,
  FolderSearch,
  LayoutDashboard,
  Lightbulb,
  LineChart,
  Network,
  PieChart,
  Radar,
  Rocket,
  Settings,
  Shuffle,
  Sparkles,
  Target,
  WandSparkles,
} from "lucide-react";
import type { ActiveView } from "@/types/navigation";

type IdeaSection =
  | "strategy-map"
  | "brainstorm-flow"
  | "remix-rule-engine"
  | "idea-bank";

type CompetitorSection =
  | "market-share"
  | "groups"
  | "keyword-radar"
  | "remix-lab"
  | "video-metadata";

type AnalystSection =
  | "group-drilldown"
  | "action-center";

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
    id: "competitors",
    label: "Competitors",
    icon: FolderSearch,
  },
  {
    id: "analyst",
    label: "Analyst",
    icon: Target,
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

const ideaSections: {
  id: IdeaSection;
  label: string;
  icon: LucideIcon;
  colorClass: string;
}[] = [
  {
    id: "strategy-map",
    label: "Strategy Map",
    icon: Network,
    colorClass: "text-purple-400",
  },
  {
    id: "brainstorm-flow",
    label: "Brainstorm Flow",
    icon: WandSparkles,
    colorClass: "text-rose-400",
  },
  {
    id: "remix-rule-engine",
    label: "Remix Rule Engine",
    icon: Shuffle,
    colorClass: "text-amber-400",
  },
  {
    id: "idea-bank",
    label: "Idea Bank",
    icon: Database,
    colorClass: "text-blue-400",
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

const analystSections: {
  id: AnalystSection;
  label: string;
  icon: LucideIcon;
  colorClass: string;
}[] = [
  {
    id: "group-drilldown",
    label: "Group Drilldown",
    icon: LineChart,
    colorClass: "text-blue-400",
  },
  {
    id: "action-center",
    label: "Action Center",
    icon: Rocket,
    colorClass: "text-rose-400",
  },
];

export default function Sidebar({
  activeView,
  onChangeView,
}: Props) {
  const [activeIdeaSection, setActiveIdeaSection] =
    useState<IdeaSection>("strategy-map");

  const [activeCompetitorSection, setActiveCompetitorSection] =
    useState<CompetitorSection>("market-share");

  const [activeAnalystSection, setActiveAnalystSection] =
    useState<AnalystSection>("group-drilldown");

  useEffect(() => {
    const savedIdeaSection = window.localStorage.getItem(
      "studioos-idea-section"
    ) as IdeaSection | null;

    if (savedIdeaSection) {
      setActiveIdeaSection(savedIdeaSection);
    }

    const savedCompetitorSection = window.localStorage.getItem(
      "studioos-competitor-section"
    ) as CompetitorSection | null;

    if (savedCompetitorSection) {
      setActiveCompetitorSection(savedCompetitorSection);
    }

    const savedAnalystSection = window.localStorage.getItem(
      "studioos-analyst-section"
    ) as AnalystSection | null;

    if (savedAnalystSection) {
      setActiveAnalystSection(savedAnalystSection);
    }

    function handleIdeaSectionChange(event: Event) {
      const customEvent = event as CustomEvent<{
        section?: IdeaSection;
      }>;

      if (customEvent.detail?.section) {
        setActiveIdeaSection(customEvent.detail.section);
      }
    }

    function handleCompetitorSectionChange(event: Event) {
      const customEvent = event as CustomEvent<{
        section?: CompetitorSection;
      }>;

      if (customEvent.detail?.section) {
        setActiveCompetitorSection(customEvent.detail.section);
      }
    }

    function handleAnalystSectionChange(event: Event) {
      const customEvent = event as CustomEvent<{
        section?: AnalystSection;
      }>;

      if (customEvent.detail?.section) {
        setActiveAnalystSection(customEvent.detail.section);
      }
    }

    window.addEventListener(
      "studioos-idea-section-change",
      handleIdeaSectionChange
    );

    window.addEventListener(
      "studioos-competitor-section-change",
      handleCompetitorSectionChange
    );

    window.addEventListener(
      "studioos-analyst-section-change",
      handleAnalystSectionChange
    );

    return () => {
      window.removeEventListener(
        "studioos-idea-section-change",
        handleIdeaSectionChange
      );

      window.removeEventListener(
        "studioos-competitor-section-change",
        handleCompetitorSectionChange
      );

      window.removeEventListener(
        "studioos-analyst-section-change",
        handleAnalystSectionChange
      );
    };
  }, []);

  function handleMainClick(view: ActiveView) {
    onChangeView(view);

    if (view === "ideas") {
      window.localStorage.setItem(
        "studioos-idea-section",
        activeIdeaSection
      );

      window.dispatchEvent(
        new CustomEvent("studioos-idea-section-change", {
          detail: {
            section: activeIdeaSection,
          },
        })
      );
    }

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

    if (view === "analyst") {
      window.localStorage.setItem(
        "studioos-analyst-section",
        activeAnalystSection
      );

      window.dispatchEvent(
        new CustomEvent("studioos-analyst-section-change", {
          detail: {
            section: activeAnalystSection,
          },
        })
      );
    }
  }

  function handleIdeaSectionClick(section: IdeaSection) {
    setActiveIdeaSection(section);
    onChangeView("ideas");

    window.localStorage.setItem(
      "studioos-idea-section",
      section
    );

    window.dispatchEvent(
      new CustomEvent("studioos-idea-section-change", {
        detail: {
          section,
        },
      })
    );
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

  function handleAnalystSectionClick(section: AnalystSection) {
    setActiveAnalystSection(section);
    onChangeView("analyst");

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

  const ideasOpen = activeView === "ideas";
  const competitorOpen = activeView === "competitors";
  const analystOpen = activeView === "analyst";

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
          const isIdeas = item.id === "ideas";
          const isCompetitor = item.id === "competitors";
          const isAnalyst = item.id === "analyst";

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

                {isIdeas &&
                  (ideasOpen ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  ))}

                {isCompetitor &&
                  (competitorOpen ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  ))}

                {isAnalyst &&
                  (analystOpen ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  ))}
              </button>

              {isIdeas && ideasOpen && (
                <div className="mt-2 ml-3 pl-3 border-l border-zinc-800 space-y-1">
                  {ideaSections.map((section) => {
                    const SectionIcon = section.icon;
                    const isSectionActive =
                      activeIdeaSection === section.id;

                    return (
                      <button
                        key={section.id}
                        onClick={() =>
                          handleIdeaSectionClick(section.id)
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

              {isAnalyst && analystOpen && (
                <div className="mt-2 ml-3 pl-3 border-l border-zinc-800 space-y-1">
                  {analystSections.map((section) => {
                    const SectionIcon = section.icon;
                    const isSectionActive =
                      activeAnalystSection === section.id;

                    return (
                      <button
                        key={section.id}
                        onClick={() =>
                          handleAnalystSectionClick(section.id)
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
