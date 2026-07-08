"use client";

import {
  LayoutDashboard,
  Lightbulb,
  Video,
  BarChart3,
  Bot,
  Calendar,
  Settings,
} from "lucide-react";

const menus = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
  },
  {
    icon: Lightbulb,
    label: "Ideas",
  },
  {
    icon: Video,
    label: "Videos",
  },
  {
    icon: BarChart3,
    label: "Analytics",
  },
  {
    icon: Bot,
    label: "AI Assistant",
  },
  {
    icon: Calendar,
    label: "Calendar",
  },
  {
    icon: Settings,
    label: "Settings",
  },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-zinc-900 text-white h-screen p-6">
      <h1 className="text-2xl font-bold mb-10">
        🎬 StudioOS
      </h1>

      <nav className="space-y-2">
        {menus.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-zinc-800 transition"
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