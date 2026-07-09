"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  CheckCircle2,
  Database,
  FolderSearch,
  KeyRound,
  Lightbulb,
  Lock,
  Save,
  Search,
  Settings,
  Shield,
  Sparkles,
  User,
} from "lucide-react";
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

type PreferenceState = {
  workspaceName: string;
  ownerName: string;
  defaultLanguage: string;
  defaultMarket: string;
  defaultNiche: string;
};

const defaultPreferences: PreferenceState = {
  workspaceName: "StudioOS",
  ownerName: "Loan",
  defaultLanguage: "EN",
  defaultMarket: "US",
  defaultNiche: "Baby Doll / Story",
};

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

function SettingCard({
  title,
  description,
  icon,
  tone,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  tone: "rose" | "purple" | "blue" | "emerald" | "amber" | "slate";
  children?: React.ReactNode;
}) {
  const toneClass = {
    rose: "bg-rose-50 border-rose-200 text-rose-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    slate: "bg-slate-50 border-slate-200 text-slate-700",
  }[tone];

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${toneClass}`}>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-zinc-950 text-white flex items-center justify-center shrink-0">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-bold text-zinc-950">
            {title}
          </h3>

          <p className="text-sm text-slate-600 mt-1 leading-6">
            {description}
          </p>

          {children && (
            <div className="mt-5">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StudioSettings({
  ideas,
  competitorGroups,
  competitorChannels,
  competitorVideos,
}: Props) {
  const [query, setQuery] = useState("");
  const [preferences, setPreferences] =
    useState<PreferenceState>(defaultPreferences);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem("studioos-preferences");

    if (saved) {
      try {
        setPreferences({
          ...defaultPreferences,
          ...JSON.parse(saved),
        });
      } catch {
        setPreferences(defaultPreferences);
      }
    }

    function handleGlobalSearch(event: Event) {
      const customEvent = event as CustomEvent<{
        query?: string;
        activeView?: string;
      }>;

      if (customEvent.detail?.activeView === "settings") {
        setQuery(customEvent.detail.query || "");
      }
    }

    window.addEventListener(
      "studioos-global-search-change",
      handleGlobalSearch
    );

    return () => {
      window.removeEventListener(
        "studioos-global-search-change",
        handleGlobalSearch
      );
    };
  }, []);

  const settingGroups = useMemo(() => {
    return [
      {
        id: "workspace",
        title: "Workspace Preferences",
        keywords: "workspace owner language market niche preference",
      },
      {
        id: "security",
        title: "Security & Access",
        keywords: "password auth token login private gate security",
      },
      {
        id: "database",
        title: "Database Health",
        keywords: "supabase ideas competitors channels videos data",
      },
      {
        id: "ai",
        title: "AI Configuration",
        keywords: "openai mock mode brainstorm remix ai model",
      },
      {
        id: "navigation",
        title: "Navigation",
        keywords: "sidebar ideas competitors analyst calendar settings",
      },
    ];
  }, []);

  const visibleGroups = useMemo(() => {
    const text = query.trim().toLowerCase();

    if (!text) return new Set(settingGroups.map((group) => group.id));

    return new Set(
      settingGroups
        .filter((group) => {
          return (
            group.title.toLowerCase().includes(text) ||
            group.keywords.toLowerCase().includes(text)
          );
        })
        .map((group) => group.id)
    );
  }, [
    query,
    settingGroups,
  ]);

  function savePreferences() {
    window.localStorage.setItem(
      "studioos-preferences",
      JSON.stringify(preferences)
    );

    setMessage("Settings saved on this browser.");
  }

  return (
    <div className="space-y-6 studioos-readable">
      <div className="rounded-3xl bg-zinc-950 text-white p-7 shadow">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-2 text-sm">
              <Settings size={16} />
              Workspace Settings
            </div>

            <h2 className="text-3xl font-bold mt-4">
              StudioOS configuration
            </h2>

            <p className="text-zinc-300 mt-2 max-w-3xl">
              Quản lý workspace, search settings, security reminder, database status và AI configuration.
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm text-zinc-400">
              Owner
            </p>

            <p className="text-3xl font-bold mt-1">
              {preferences.ownerName}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow p-5">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search settings: workspace, security, database, AI..."
            className="w-full border rounded-2xl pl-11 pr-4 py-3 outline-none focus:ring-4 focus:ring-blue-100"
          />
        </div>
      </div>

      {message && (
        <p className="rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-3 text-sm font-semibold">
          {message}
        </p>
      )}

      <div className="grid grid-cols-4 gap-4">
        <SettingCard
          title="Ideas"
          description={`${formatNumber(ideas.length)} saved ideas`}
          icon={<Lightbulb size={22} />}
          tone="rose"
        />

        <SettingCard
          title="Groups"
          description={`${formatNumber(competitorGroups.length)} competitor groups`}
          icon={<FolderSearch size={22} />}
          tone="purple"
        />

        <SettingCard
          title="Channels"
          description={`${formatNumber(competitorChannels.length)} tracked channels`}
          icon={<Database size={22} />}
          tone="blue"
        />

        <SettingCard
          title="Videos"
          description={`${formatNumber(competitorVideos.length)} competitor metadata rows`}
          icon={<Sparkles size={22} />}
          tone="emerald"
        />
      </div>

      {visibleGroups.has("workspace") && (
        <SettingCard
          title="Workspace Preferences"
          description="Các setting này lưu trên trình duyệt hiện tại để cá nhân hoá UI."
          icon={<User size={22} />}
          tone="blue"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2 text-zinc-950">
                Workspace Name
              </label>

              <input
                value={preferences.workspaceName}
                onChange={(event) =>
                  setPreferences({
                    ...preferences,
                    workspaceName: event.target.value,
                  })
                }
                className="w-full border rounded-2xl px-4 py-3 text-zinc-950"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 text-zinc-950">
                Owner Name
              </label>

              <input
                value={preferences.ownerName}
                onChange={(event) =>
                  setPreferences({
                    ...preferences,
                    ownerName: event.target.value,
                  })
                }
                className="w-full border rounded-2xl px-4 py-3 text-zinc-950"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 text-zinc-950">
                Default Language
              </label>

              <select
                value={preferences.defaultLanguage}
                onChange={(event) =>
                  setPreferences({
                    ...preferences,
                    defaultLanguage: event.target.value,
                  })
                }
                className="w-full border rounded-2xl px-4 py-3 text-zinc-950"
              >
                <option>EN</option>
                <option>ES</option>
                <option>PT</option>
                <option>FR</option>
                <option>DE</option>
                <option>VI</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 text-zinc-950">
                Default Market
              </label>

              <input
                value={preferences.defaultMarket}
                onChange={(event) =>
                  setPreferences({
                    ...preferences,
                    defaultMarket: event.target.value,
                  })
                }
                className="w-full border rounded-2xl px-4 py-3 text-zinc-950"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-bold mb-2 text-zinc-950">
                Default Niche
              </label>

              <input
                value={preferences.defaultNiche}
                onChange={(event) =>
                  setPreferences({
                    ...preferences,
                    defaultNiche: event.target.value,
                  })
                }
                className="w-full border rounded-2xl px-4 py-3 text-zinc-950"
              />
            </div>
          </div>

          <button
            onClick={savePreferences}
            className="mt-5 rounded-2xl bg-zinc-950 text-white px-5 py-3 font-bold inline-flex items-center gap-2"
          >
            <Save size={17} />
            Save Preferences
          </button>
        </SettingCard>
      )}

      {visibleGroups.has("security") && (
        <SettingCard
          title="Security & Access"
          description="StudioOS đang dùng password gate qua environment variables trên local/Vercel."
          icon={<Lock size={22} />}
          tone="rose"
        >
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl bg-white border p-4">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 size={18} />
                <p className="font-bold">Password Gate</p>
              </div>

              <p className="text-sm text-slate-600 mt-2">
                Enabled by STUDIOOS_PASSWORD and STUDIOOS_AUTH_TOKEN.
              </p>
            </div>

            <div className="rounded-2xl bg-white border p-4">
              <div className="flex items-center gap-2 text-blue-700">
                <Shield size={18} />
                <p className="font-bold">Private Workspace</p>
              </div>

              <p className="text-sm text-slate-600 mt-2">
                Không share password công khai.
              </p>
            </div>

            <div className="rounded-2xl bg-white border p-4">
              <div className="flex items-center gap-2 text-amber-700">
                <KeyRound size={18} />
                <p className="font-bold">API Keys</p>
              </div>

              <p className="text-sm text-slate-600 mt-2">
                Không commit .env.local lên GitHub.
              </p>
            </div>
          </div>
        </SettingCard>
      )}

      {visibleGroups.has("database") && (
        <SettingCard
          title="Database Health"
          description="Tổng quan nhanh các bảng dữ liệu chính đang dùng trong StudioOS."
          icon={<Database size={22} />}
          tone="emerald"
        >
          <div className="grid grid-cols-4 gap-4">
            <div className="rounded-2xl bg-white border p-4">
              <p className="text-sm text-slate-500">Ideas</p>
              <p className="text-2xl font-bold text-zinc-950 mt-1">
                {formatNumber(ideas.length)}
              </p>
            </div>

            <div className="rounded-2xl bg-white border p-4">
              <p className="text-sm text-slate-500">Groups</p>
              <p className="text-2xl font-bold text-zinc-950 mt-1">
                {formatNumber(competitorGroups.length)}
              </p>
            </div>

            <div className="rounded-2xl bg-white border p-4">
              <p className="text-sm text-slate-500">Channels</p>
              <p className="text-2xl font-bold text-zinc-950 mt-1">
                {formatNumber(competitorChannels.length)}
              </p>
            </div>

            <div className="rounded-2xl bg-white border p-4">
              <p className="text-sm text-slate-500">Metadata Videos</p>
              <p className="text-2xl font-bold text-zinc-950 mt-1">
                {formatNumber(competitorVideos.length)}
              </p>
            </div>
          </div>
        </SettingCard>
      )}

      {visibleGroups.has("ai") && (
        <SettingCard
          title="AI Configuration"
          description="Các tính năng AI đang nằm trong Brainstorm Flow, Remix Rule Engine và AI Assistant."
          icon={<Bot size={22} />}
          tone="purple"
        >
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl bg-white border p-4">
              <p className="font-bold text-zinc-950">
                Brainstorm Flow V2
              </p>

              <p className="text-sm text-slate-600 mt-2">
                Sinh idea theo Story Pillar → Cluster → Niche.
              </p>
            </div>

            <div className="rounded-2xl bg-white border p-4">
              <p className="font-bold text-zinc-950">
                Remix Rule Engine
              </p>

              <p className="text-sm text-slate-600 mt-2">
                Remix source signal thành idea mới.
              </p>
            </div>

            <div className="rounded-2xl bg-white border p-4">
              <p className="font-bold text-zinc-950">
                Mock / OpenAI Mode
              </p>

              <p className="text-sm text-slate-600 mt-2">
                Kiểm tra trong Vercel Environment Variables.
              </p>
            </div>
          </div>
        </SettingCard>
      )}

      {visibleGroups.has("navigation") && (
        <SettingCard
          title="Navigation"
          description="Sidebar đã được tối giản: bỏ Videos và Analytics khỏi giao diện chính."
          icon={<Settings size={22} />}
          tone="amber"
        >
          <div className="grid grid-cols-5 gap-3">
            {[
              "Dashboard",
              "Ideas",
              "Competitors",
              "Analyst",
              "AI Assistant",
              "Calendar",
              "Settings",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl bg-white border p-4 font-bold text-zinc-950 text-center"
              >
                {item}
              </div>
            ))}
          </div>
        </SettingCard>
      )}
    </div>
  );
}
