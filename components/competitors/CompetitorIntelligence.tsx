"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  Folder,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type {
  CompetitorChannel,
  CompetitorGroup,
} from "@/types/competitor";

type Props = {
  competitorGroups?: CompetitorGroup[];
  competitorChannels?: CompetitorChannel[];
};

const channelStatusOptions = [
  "Active",
  "Watchlist",
  "Paused",
  "Archived",
];

const statusStyles: Record<string, string> = {
  Active: "bg-green-50 text-green-700 border-green-100",
  Watchlist: "bg-blue-50 text-blue-700 border-blue-100",
  Paused: "bg-yellow-50 text-yellow-700 border-yellow-100",
  Archived: "bg-gray-50 text-gray-700 border-gray-100",
};

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

function GroupFormModal({
  mode,
  group,
  onClose,
}: {
  mode: "add" | "edit";
  group?: CompetitorGroup;
  onClose: () => void;
}) {
  const router = useRouter();

  const [name, setName] = useState(group?.name || "");
  const [category, setCategory] = useState(group?.category || "");
  const [priority, setPriority] = useState(
    Number(group?.priority || 0)
  );
  const [description, setDescription] = useState(
    group?.description || ""
  );

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setErrorMessage("Group name is required.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const payload = {
      name,
      category,
      priority,
      description,
    };

    const { error } =
      mode === "add"
        ? await supabase.from("competitor_groups").insert(payload)
        : await supabase
            .from("competitor_groups")
            .update(payload)
            .eq("id", group?.id);

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl">
        <div className="border-b p-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">
              {mode === "add" ? "New Competitor Group" : "Edit Competitor Group"}
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Create a folder for competitor channels.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl border flex items-center justify-center hover:bg-gray-50"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">
              Group Name
            </label>

            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Baby Doll Media"
              className="w-full border rounded-xl px-4 py-3"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Category
              </label>

              <input
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="Baby Doll / Mermaid / Kids Animation"
                className="w-full border rounded-xl px-4 py-3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Priority
              </label>

              <input
                type="number"
                value={priority}
                onChange={(event) =>
                  setPriority(Number(event.target.value))
                }
                className="w-full border rounded-xl px-4 py-3"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Description
            </label>

            <textarea
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              rows={4}
              placeholder="Main competitor group with many baby doll / transformation channels..."
              className="w-full border rounded-xl px-4 py-3"
            />
          </div>

          {errorMessage && (
            <p className="text-sm text-red-600">
              {errorMessage}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl border"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-3 rounded-xl bg-zinc-900 text-white disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ChannelFormModal({
  mode,
  groups,
  channel,
  onClose,
}: {
  mode: "add" | "edit";
  groups: CompetitorGroup[];
  channel?: CompetitorChannel;
  onClose: () => void;
}) {
  const router = useRouter();

  const [groupId, setGroupId] = useState(
    channel?.group_id ? String(channel.group_id) : ""
  );
  const [channelName, setChannelName] = useState(
    channel?.channel_name || ""
  );
  const [channelUrl, setChannelUrl] = useState(
    channel?.channel_url || ""
  );
  const [youtubeChannelId, setYoutubeChannelId] = useState(
    channel?.youtube_channel_id || ""
  );
  const [niche, setNiche] = useState(channel?.niche || "");
  const [language, setLanguage] = useState(
    channel?.language || "EN"
  );
  const [country, setCountry] = useState(
    channel?.country || "US"
  );
  const [status, setStatus] = useState(
    channel?.status || "Active"
  );
  const [notes, setNotes] = useState(channel?.notes || "");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!channelName.trim()) {
      setErrorMessage("Channel name is required.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const payload = {
      group_id: groupId ? Number(groupId) : null,
      channel_name: channelName,
      channel_url: channelUrl,
      youtube_channel_id: youtubeChannelId,
      niche,
      language,
      country,
      status,
      notes,
    };

    const { error } =
      mode === "add"
        ? await supabase.from("competitor_channels").insert(payload)
        : await supabase
            .from("competitor_channels")
            .update(payload)
            .eq("id", channel?.id);

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-auto rounded-2xl shadow-xl">
        <div className="sticky top-0 bg-white border-b p-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">
              {mode === "add" ? "New Competitor Channel" : "Edit Competitor Channel"}
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Add a YouTube channel to competitor tracking.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl border flex items-center justify-center hover:bg-gray-50"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">
              Competitor Group
            </label>

            <select
              value={groupId}
              onChange={(event) => setGroupId(event.target.value)}
              className="w-full border rounded-xl px-4 py-3"
            >
              <option value="">No group</option>

              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Channel Name
            </label>

            <input
              value={channelName}
              onChange={(event) =>
                setChannelName(event.target.value)
              }
              placeholder="Baby Doll Stories"
              className="w-full border rounded-xl px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Channel URL
            </label>

            <input
              value={channelUrl}
              onChange={(event) =>
                setChannelUrl(event.target.value)
              }
              placeholder="https://www.youtube.com/@channelname"
              className="w-full border rounded-xl px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              YouTube Channel ID
            </label>

            <input
              value={youtubeChannelId}
              onChange={(event) =>
                setYoutubeChannelId(event.target.value)
              }
              placeholder="UCxxxxxxxxxxxxxxxx"
              className="w-full border rounded-xl px-4 py-3"
            />

            <p className="text-xs text-gray-500 mt-2">
              Sprint sau mình sẽ làm tool tự lấy Channel ID từ URL.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Niche
              </label>

              <input
                value={niche}
                onChange={(event) => setNiche(event.target.value)}
                placeholder="Baby Doll"
                className="w-full border rounded-xl px-4 py-3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Language
              </label>

              <select
                value={language}
                onChange={(event) =>
                  setLanguage(event.target.value)
                }
                className="w-full border rounded-xl px-4 py-3"
              >
                <option>EN</option>
                <option>ES</option>
                <option>PT</option>
                <option>FR</option>
                <option>DE</option>
                <option>JP</option>
                <option>VI</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Country
              </label>

              <input
                value={country}
                onChange={(event) =>
                  setCountry(event.target.value)
                }
                placeholder="US"
                className="w-full border rounded-xl px-4 py-3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Status
              </label>

              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value)
                }
                className="w-full border rounded-xl px-4 py-3"
              >
                {channelStatusOptions.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Notes
            </label>

            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              placeholder="Strong competitor in baby doll transformation videos..."
              className="w-full border rounded-xl px-4 py-3"
            />
          </div>

          {errorMessage && (
            <p className="text-sm text-red-600">
              {errorMessage}
            </p>
          )}

          <div className="sticky bottom-0 bg-white border-t pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl border"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-3 rounded-xl bg-zinc-900 text-white disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Channel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CompetitorIntelligence({
  competitorGroups = [],
  competitorChannels = [],
}: Props) {
  const router = useRouter();

  const [openGroupModal, setOpenGroupModal] = useState(false);
  const [openChannelModal, setOpenChannelModal] = useState(false);
  const [editingGroup, setEditingGroup] =
    useState<CompetitorGroup | null>(null);
  const [editingChannel, setEditingChannel] =
    useState<CompetitorChannel | null>(null);

  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [nicheFilter, setNicheFilter] = useState("All");

  const groupMap = useMemo(() => {
    return new Map(
      competitorGroups.map((group) => [group.id, group])
    );
  }, [competitorGroups]);

  const niches = useMemo(() => {
    return [
      "All",
      ...Array.from(
        new Set(
          competitorChannels
            .map((channel) => channel.niche)
            .filter(Boolean)
        )
      ),
    ] as string[];
  }, [competitorChannels]);

  const filteredChannels = competitorChannels.filter((channel) => {
    const keyword = search.trim().toLowerCase();

    const groupName = channel.group_id
      ? groupMap.get(channel.group_id)?.name
      : "";

    const text = [
      channel.channel_name,
      channel.channel_url,
      channel.youtube_channel_id,
      channel.niche,
      channel.language,
      channel.country,
      channel.status,
      channel.notes,
      groupName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = !keyword || text.includes(keyword);

    const matchesGroup =
      groupFilter === "All" ||
      String(channel.group_id || "") === groupFilter;

    const matchesStatus =
      statusFilter === "All" || channel.status === statusFilter;

    const matchesNiche =
      nicheFilter === "All" || channel.niche === nicheFilter;

    return (
      matchesSearch &&
      matchesGroup &&
      matchesStatus &&
      matchesNiche
    );
  });

  const activeChannels = competitorChannels.filter(
    (channel) => channel.status === "Active"
  );

  const watchlistChannels = competitorChannels.filter(
    (channel) => channel.status === "Watchlist"
  );

  async function handleDeleteGroup(group: CompetitorGroup) {
    const confirmed = window.confirm(
      `Delete this competitor group?\n\n${group.name}\n\nChannels inside this group will not be deleted, but they will lose the group link.`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("competitor_groups")
      .delete()
      .eq("id", group.id);

    if (error) {
      alert(error.message);
      return;
    }

    router.refresh();
  }

  async function handleDeleteChannel(channel: CompetitorChannel) {
    const confirmed = window.confirm(
      `Delete this competitor channel?\n\n${channel.channel_name}`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("competitor_channels")
      .delete()
      .eq("id", channel.id);

    if (error) {
      alert(error.message);
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-sm text-gray-500">Competitor Groups</p>
          <p className="text-3xl font-bold mt-2">
            {formatNumber(competitorGroups.length)}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-sm text-gray-500">Tracked Channels</p>
          <p className="text-3xl font-bold mt-2">
            {formatNumber(competitorChannels.length)}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-sm text-gray-500">Active Channels</p>
          <p className="text-3xl font-bold mt-2">
            {formatNumber(activeChannels.length)}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-sm text-gray-500">Watchlist</p>
          <p className="text-3xl font-bold mt-2">
            {formatNumber(watchlistChannels.length)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center">
              <Folder size={20} />
            </div>

            <div>
              <h2 className="text-xl font-bold">
                Competitor Groups
              </h2>

              <p className="text-sm text-gray-500">
                Organize competitor channels into folders.
              </p>
            </div>
          </div>

          <button
            onClick={() => setOpenGroupModal(true)}
            className="inline-flex items-center gap-2 bg-zinc-900 text-white px-5 py-3 rounded-xl hover:bg-zinc-800"
          >
            <Plus size={18} />
            New Group
          </button>
        </div>

        {competitorGroups.length > 0 ? (
          <div className="grid grid-cols-3 gap-4">
            {competitorGroups.map((group) => {
              const channelCount = competitorChannels.filter(
                (channel) => channel.group_id === group.id
              ).length;

              return (
                <div
                  key={group.id}
                  className="rounded-2xl border p-5 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold">{group.name}</h3>

                      <p className="text-sm text-gray-500 mt-1">
                        {group.category || "No category"}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setEditingGroup(group)}
                        className="text-gray-500 hover:text-black"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        onClick={() => handleDeleteGroup(group)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mt-4 line-clamp-3">
                    {group.description || "No description."}
                  </p>

                  <div className="flex items-center justify-between mt-5 text-sm">
                    <span className="text-gray-500">
                      {channelCount} channels
                    </span>

                    <span className="font-medium">
                      Priority {group.priority || 0}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed p-8 text-center text-gray-500">
            No competitor groups yet.
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center">
                <Users size={20} />
              </div>

              <div>
                <h2 className="text-xl font-bold">
                  Competitor Channels
                </h2>

                <p className="text-sm text-gray-500">
                  Track competitor YouTube channels before syncing videos.
                </p>
              </div>
            </div>

            <button
              onClick={() => setOpenChannelModal(true)}
              className="inline-flex items-center gap-2 bg-zinc-900 text-white px-5 py-3 rounded-xl hover:bg-zinc-800"
            >
              <Plus size={18} />
              New Channel
            </button>
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search channels..."
              className="border rounded-xl px-4 py-2 w-80"
            />

            <select
              value={groupFilter}
              onChange={(event) =>
                setGroupFilter(event.target.value)
              }
              className="border rounded-xl px-4 py-2"
            >
              <option value="All">All Groups</option>

              {competitorGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="border rounded-xl px-4 py-2"
            >
              <option>All</option>

              {channelStatusOptions.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>

            <select
              value={nicheFilter}
              onChange={(event) =>
                setNicheFilter(event.target.value)
              }
              className="border rounded-xl px-4 py-2"
            >
              {niches.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>

            <div className="text-sm text-gray-500 flex items-center">
              {formatNumber(filteredChannels.length)} / {formatNumber(competitorChannels.length)} channels
            </div>
          </div>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left p-4 min-w-72">
                  Channel
                </th>

                <th className="text-left p-4">
                  Group
                </th>

                <th className="text-left p-4">
                  Niche
                </th>

                <th className="text-left p-4">
                  Language
                </th>

                <th className="text-left p-4">
                  Country
                </th>

                <th className="text-left p-4">
                  Status
                </th>

                <th className="text-left p-4 min-w-60">
                  Notes
                </th>

                <th className="text-left p-4 min-w-52">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredChannels.map((channel) => {
                const group = channel.group_id
                  ? groupMap.get(channel.group_id)
                  : null;

                const statusName = channel.status || "Active";

                const statusClass =
                  statusStyles[statusName] ||
                  "bg-gray-50 text-gray-700 border-gray-100";

                return (
                  <tr
                    key={channel.id}
                    className="border-t hover:bg-gray-50"
                  >
                    <td className="p-4">
                      <div className="font-medium">
                        {channel.channel_name}
                      </div>

                      <div className="text-xs text-gray-400 mt-1">
                        ID #{channel.id}
                      </div>

                      {channel.channel_url && (
                        <a
                          href={channel.channel_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 mt-2"
                        >
                          Open Channel
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </td>

                    <td className="p-4">
                      {group?.name || "-"}
                    </td>

                    <td className="p-4">
                      {channel.niche || "-"}
                    </td>

                    <td className="p-4">
                      {channel.language || "-"}
                    </td>

                    <td className="p-4">
                      {channel.country || "-"}
                    </td>

                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full border text-xs font-medium ${statusClass}`}
                      >
                        {statusName}
                      </span>
                    </td>

                    <td className="p-4 text-gray-600">
                      <div className="line-clamp-2">
                        {channel.notes || "-"}
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setEditingChannel(channel)}
                          className="inline-flex items-center gap-2 text-gray-600 hover:text-black"
                        >
                          <Pencil size={16} />
                          Edit
                        </button>

                        <button
                          onClick={() => handleDeleteChannel(channel)}
                          className="inline-flex items-center gap-2 text-red-600 hover:text-red-700"
                        >
                          <Trash2 size={16} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredChannels.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="p-8 text-center text-gray-500"
                  >
                    No competitor channels found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {openGroupModal && (
        <GroupFormModal
          mode="add"
          onClose={() => setOpenGroupModal(false)}
        />
      )}

      {editingGroup && (
        <GroupFormModal
          mode="edit"
          group={editingGroup}
          onClose={() => setEditingGroup(null)}
        />
      )}

      {openChannelModal && (
        <ChannelFormModal
          mode="add"
          groups={competitorGroups}
          onClose={() => setOpenChannelModal(false)}
        />
      )}

      {editingChannel && (
        <ChannelFormModal
          mode="edit"
          groups={competitorGroups}
          channel={editingChannel}
          onClose={() => setEditingChannel(null)}
        />
      )}
    </div>
  );
}