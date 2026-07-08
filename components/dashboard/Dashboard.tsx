import KPICard from "./KPICard";
import IdeaBank from "./IdeaBank";
import AddIdeaButton from "./AddIdeaButton";
import type { Idea } from "@/types/idea";

type Props = {
  ideas: Idea[];
};

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

        <AddIdeaButton />
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
        <KPICard title="Ideas" value={totalIdeas.toLocaleString()} />

        <KPICard title="Published" value={publishedCount.toString()} />

        <KPICard title="Revenue" value={`$${totalRevenue.toFixed(0)}`} />

        <KPICard title="Avg CTR" value={`${averageCtr.toFixed(1)}%`} />
      </div>

      <IdeaBank ideas={ideas} />
    </div>
  );
}