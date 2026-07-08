import KPICard from "./KPICard";
import IdeaBank from "./IdeaBank";
import AddIdeaButton from "./AddIdeaButton";
import AIBrainstormPanel from "./AIBrainstormPanel";
import type { Idea } from "@/types/idea";

type Props = {
  ideas: Idea[];
};

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

function formatMoney(value: number) {
  return `$${value.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
}

export default function Dashboard({ ideas }: Props) {
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

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>

          <p className="text-gray-500 mt-1">
            Your YouTube studio command center
          </p>
        </div>

        <AddIdeaButton ideas={ideas} />
      </div>

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

      <AIBrainstormPanel existingIdeas={ideas} />

      <IdeaBank ideas={ideas} />
    </div>
  );
}