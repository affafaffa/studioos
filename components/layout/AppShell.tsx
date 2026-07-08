"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import Dashboard from "@/components/dashboard/Dashboard";
import type { Idea } from "@/types/idea";
import type { ActiveView } from "@/types/navigation";

type Props = {
  ideas: Idea[];
};

export default function AppShell({ ideas }: Props) {
  const [activeView, setActiveView] =
    useState<ActiveView>("dashboard");

  return (
    <main className="flex h-screen bg-gray-100">
      <Sidebar
        activeView={activeView}
        onChangeView={setActiveView}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />

        <div className="flex-1 overflow-auto">
          <Dashboard
            ideas={ideas}
            activeView={activeView}
            onChangeView={setActiveView}
          />
        </div>
      </div>
    </main>
  );
}