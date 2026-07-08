"use client";

import KPICard from "./KPICard";
import IdeaBank from "./IdeaBank";
import AddIdeaButton from "./AddIdeaButton";
import AIBrainstormPanel from "./AIBrainstormPanel";
import type { Idea } from "@/types/idea";
import type { ActiveView } from "@/types/navigation";

type Props = {
  ideas: Idea[];
  activeView: ActiveView;
  onChangeView: (view: ActiveView) => void;
  highlightedIdeaId: number | null;
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
  action?: React.ReactNode;
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
  ideas,
  activeView,
  highlightedIdeaId,
}: Props) {
  const totalIdeas = ideas.length;

  const publishedIdeas = ideas.filter(
    (idea) => idea.status === "Published"
  );

  const publishedCount = publishedIdeas.length;

  const totalRevenue = ideas.reduce(
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

  const topIdeas = [...ideas]
    .sort(
      (a, b) =>
        Number(b.views || 0) - Number(a.views || 0)
    )
    .slice(0, 5);

  const themeStats = Array.from(
    ideas.reduce((map, idea) => {
      const theme = idea.theme || "Unknown";
      map.set(theme, (map.get(theme) || 0) + 1);
      return map;
    }, new Map<string, number>())
  ).sort((a, b) => b[1] - a[1]);

  const kpiCards = (
    <div className="grid grid-cols-4 gap-6 mb-8">
      <KPICard
        title="Ideas"
        value={formatNumber(totalIdeas)}
      />

      <KPICard
        title="Published"
        value={formatNumber(publishedCount)}
      />

      <KPICard
        title="Revenue"
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
          description="Manage your full YouTube idea bank."
          action={<AddIdeaButton ideas={ideas} />}
        />

        <IdeaBank
          ideas={ideas}
          highlightedIdeaId={highlightedIdeaId}
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

        <AIBrainstormPanel existingIdeas={ideas} />
      </div>
    );
  }

  if (activeView === "analytics") {
    return (
      <div className="p-8 bg-gray-100 min-h-screen">
        <SectionHeader
          title="Analytics"
          description="Quick overview of idea performance."
        />

        {kpiCards}

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
            </div>
          </div>
        </div>
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

        <PlaceholderView
          title="Video Pipeline"
          description="This section will later track script, thumbnail, editing, published links, retention, RPM and revenue by video."
        />
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
        action={<AddIdeaButton ideas={ideas} />}
      />

      {kpiCards}

      <AIBrainstormPanel existingIdeas={ideas} />

      <IdeaBank
        ideas={ideas}
        highlightedIdeaId={highlightedIdeaId}
      />
    </div>
  );
}