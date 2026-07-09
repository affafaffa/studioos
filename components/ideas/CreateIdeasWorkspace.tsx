"use client";

import { useState } from "react";
import {
  ArrowRight,
  FolderSearch,
  Lightbulb,
  Shuffle,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import BrainstormFlowV2 from "@/components/ideas/BrainstormFlowV2";
import RemixRuleEngine from "@/components/ideas/RemixRuleEngine";
import type { Idea } from "@/types/idea";
import type {
  CompetitorChannel,
  CompetitorGroup,
  CompetitorVideo,
} from "@/types/competitor";

type Props = {
  ideas: Idea[];
  competitorGroups: CompetitorGroup[];
  competitorChannels: CompetitorChannel[];
  competitorVideos: CompetitorVideo[];
};

type CreateMode = "market-signal" | "competitor-source";

export default function CreateIdeasWorkspace({
  ideas,
  competitorGroups,
  competitorChannels,
  competitorVideos,
}: Props) {
  const [mode, setMode] = useState<CreateMode>("market-signal");

  return (
    <div className="space-y-6 studioos-readable">
      <div className="rounded-3xl bg-zinc-950 text-white p-7 shadow">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-2 text-sm">
              <WandSparkles size={16} />
              Step 1 · Create
            </div>

            <h2 className="text-3xl font-bold mt-4">
              Create ideas with one clear flow
            </h2>

            <p className="text-zinc-300 mt-2 max-w-3xl">
              Chọn một trong hai cách tạo idea: tạo từ market signal hoặc remix từ competitor source. Sau khi save, idea sẽ đi sang Review Ideas.
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm text-zinc-400">
              Next step
            </p>

            <p className="text-2xl font-bold mt-1">
              Review Ideas
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <button
          onClick={() => setMode("market-signal")}
          className={`rounded-3xl border p-6 text-left transition ${
            mode === "market-signal"
              ? "bg-rose-50 border-rose-300 ring-4 ring-rose-100"
              : "bg-white border-slate-200 hover:shadow-md"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-rose-100 text-rose-700 px-3 py-1 text-xs font-bold">
                <Sparkles size={14} />
                Create from Market Signal
              </div>

              <h3 className="text-2xl font-bold mt-4">
                Brainstorm new ideas
              </h3>

              <p className="text-slate-600 mt-2 leading-6">
                Dùng khi bạn có keyword, trend, chủ đề đang lên hoặc ngách muốn test.
              </p>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center">
              <Lightbulb size={22} />
            </div>
          </div>

          <div className="mt-5 inline-flex items-center gap-2 font-bold text-rose-700">
            Use this flow
            <ArrowRight size={17} />
          </div>
        </button>

        <button
          onClick={() => setMode("competitor-source")}
          className={`rounded-3xl border p-6 text-left transition ${
            mode === "competitor-source"
              ? "bg-amber-50 border-amber-300 ring-4 ring-amber-100"
              : "bg-white border-slate-200 hover:shadow-md"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 text-amber-700 px-3 py-1 text-xs font-bold">
                <Shuffle size={14} />
                Create from Competitor Source
              </div>

              <h3 className="text-2xl font-bold mt-4">
                Remix source signals
              </h3>

              <p className="text-slate-600 mt-2 leading-6">
                Dùng khi bạn thấy một video đối thủ có signal tốt và muốn xào lại thành idea gốc.
              </p>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center">
              <FolderSearch size={22} />
            </div>
          </div>

          <div className="mt-5 inline-flex items-center gap-2 font-bold text-amber-700">
            Use this flow
            <ArrowRight size={17} />
          </div>
        </button>
      </div>

      {mode === "market-signal" && (
        <BrainstormFlowV2 ideas={ideas} />
      )}

      {mode === "competitor-source" && (
        <RemixRuleEngine
          ideas={ideas}
          competitorGroups={competitorGroups}
          competitorChannels={competitorChannels}
          competitorVideos={competitorVideos}
        />
      )}
    </div>
  );
}
