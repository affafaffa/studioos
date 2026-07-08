"use client";

import {
  BarChart3,
  Bot,
  Calendar,
  Clapperboard,
  LayoutDashboard,
  Lightbulb,
  Settings,
} from "lucide-react";
import type { ActiveView } from "@/types/navigation";

type Props = {
  activeView: ActiveView;
  onChangeView: (view: ActiveView) => void;
};

const menuItems: {
  label: string;
  view: ActiveView;
  icon: React.ElementType;
}[] = [
  {
    label: "Dashboard",
    view: "dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Ideas",
    view: "ideas",
    icon: Lightbulb,
  },
  {
    label: "Videos",
    view: "videos",
    icon: Clapperboard,
  },
  {
    label: "Analytics",
    view: "analytics",
    icon: BarChart3,
  },
  {
    label: "AI Assistant",
    view: "ai",
    icon: Bot,
  },
  {
    label: "Calendar",
    view: "calendar",
    icon: Calendar,
  },
  {
    label: "Settings",
    view: "settings",
    icon: Settings,
  },
];

export default function Sidebar({
  activeView,
  onChangeView,
}: Props) {
  return (
    <aside className="w-64 bg-zinc-950 text-white flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-white/10">
        <div className="text-2xl font-bold">
          🎬 StudioOS
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.view;

          return (
            <button
              key={item.view}
              onClick={() => onChangeView(item.view)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition ${
                active
                  ? "bg-white text-zinc-950"
                  : "text-zinc-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}