"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Idea } from "@/types/idea";
import type { Video } from "@/types/video";

type Props = {
  ideas?: Idea[];
  videos?: Video[];
};

const statusOptions = [
  "Idea",
  "Script",
  "Thumbnail",
  "Editing",
  "Ready",
  "Published",
  "Paused",
];

const statusStyles: Record<string, string> = {
  Idea: "bg-blue-50 text-blue-700 border-blue-100",
  Script: "bg-yellow-50 text-yellow-700 border-yellow-100",
  Thumbnail: "bg-orange-50 text-orange-700 border-orange-100",
  Editing: "bg-purple-50 text-purple-700 border-purple-100",
  Ready: "bg-emerald-50 text-emerald-700 border-emerald-100",
  Published: "bg-green-50 text-green-700 border-green-100",
  Paused: "bg-gray-50 text-gray-700 border-gray-100",
};

function formatNumber(value: number | null) {
  return Number(value || 0).toLocaleString("en-US");
}

function formatPercent(value: number | null) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatMoney(value: number | null) {
  return `$${Number(value || 0).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
}

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function VideoFormModal({
  mode,
  ideas,
  video,
  onClose,
}: {
  mode: "add" | "edit";
  ideas: Idea[];
  video?: Video;
  onClose: () => void;
}) {
  const router = useRouter();

  const [ideaId, setIdeaId] = useState(
    video?.idea_id ? String(video.idea_id) : ""
  );

  const [title, setTitle] = useState(video?.title || "");
  const [channel, setChannel] = useState(
    video?.channel || "BaBaBop"
  );
  const [status, setStatus] = useState(
    video?.status || "Idea"
  );
  const [owner, setOwner] = useState(video?.owner || "");
  const [publishDate, setPublishDate] = useState(
    video?.publish_date || ""
  );
  const [youtubeUrl, setYoutubeUrl] = useState(
    video?.youtube_url || ""
  );

  const [views, setViews] = useState(Number(video?.views || 0));
  const [ctr, setCtr] = useState(Number(video?.ctr || 0));
  const [rpm, setRpm] = useState(Number(video?.rpm || 0));
  const [revenue, setRevenue] = useState(
    Number(video?.revenue || 0)
  );

  const [notes, setNotes] = useState(video?.notes || "");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function handleIdeaChange(value: string) {
    setIdeaId(value);

    if (!title.trim()) {
      const selectedIdea = ideas.find(
        (idea) => String(idea.id) === value
      );

      if (selectedIdea) {
        setTitle(selectedIdea.title);
      }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setErrorMessage("Video title is required.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const payload = {
      idea_id: ideaId ? Number(ideaId) : null,
      title,
      channel,
      status,
      owner,
      publish_date: publishDate || null,
      youtube_url: youtubeUrl,
      views,
      ctr,
      rpm,
      revenue,
      notes,
    };

    const { error } =
      mode === "add"
        ? await supabase.from("videos").insert(payload)
        : await supabase
            .from("videos")
            .update(payload)
            .eq("id", video?.id);

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
      <div className="bg-white w-full max-w-5xl max-h-[90vh] overflow-auto rounded-2xl shadow-xl">
        <div className="sticky top-0 bg-white border-b p-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">
              {mode === "add" ? "New Video" : "Edit Video"}
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Track production status, publishing data and video performance.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl border flex items-center justify-center hover:bg-gray-50"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Linked Idea
            </label>

            <select
              value={ideaId}
              onChange={(event) =>
                handleIdeaChange(event.target.value)
              }
              className="w-full border rounded-xl px-4 py-3"
            >
              <option value="">No linked idea</option>

              {ideas.map((idea) => (
                <option key={idea.id} value={idea.id}>
                  #{idea.id} · {idea.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Video Title
            </label>

            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Gold vs Silver Huntrix Makeover"
              className="w-full border rounded-xl px-4 py-3"
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Channel
              </label>

              <input
                value={channel}
                onChange={(event) => setChannel(event.target.value)}
                placeholder="BaBaBop"
                className="w-full border rounded-xl px-4 py-3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Status
              </label>

              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="w-full border rounded-xl px-4 py-3"
              >
                {statusOptions.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Owner
              </label>

              <input
                value={owner}
                onChange={(event) => setOwner(event.target.value)}
                placeholder="Editor / Designer"
                className="w-full border rounded-xl px-4 py-3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Publish Date
              </label>

              <input
                type="date"
                value={publishDate}
                onChange={(event) =>
                  setPublishDate(event.target.value)
                }
                className="w-full border rounded-xl px-4 py-3"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              YouTube URL
            </label>

            <input
              value={youtubeUrl}
              onChange={(event) =>
                setYoutubeUrl(event.target.value)
              }
              placeholder="https://youtube.com/watch?v=..."
              className="w-full border rounded-xl px-4 py-3"
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Views
              </label>

              <input
                type="number"
                min="0"
                value={views}
                onChange={(event) =>
                  setViews(Number(event.target.value))
                }
                className="w-full border rounded-xl px-4 py-3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                CTR
              </label>

              <input
                type="number"
                min="0"
                step="0.1"
                value={ctr}
                onChange={(event) =>
                  setCtr(Number(event.target.value))
                }
                className="w-full border rounded-xl px-4 py-3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                RPM
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={rpm}
                onChange={(event) =>
                  setRpm(Number(event.target.value))
                }
                className="w-full border rounded-xl px-4 py-3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Revenue
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={revenue}
                onChange={(event) =>
                  setRevenue(Number(event.target.value))
                }
                className="w-full border rounded-xl px-4 py-3"
              />
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
              placeholder="Script status, thumbnail notes, editing feedback..."
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
              {loading ? "Saving..." : "Save Video"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function VideoPipeline({
  ideas = [],
  videos = [],
}: Props) {
  const router = useRouter();

  const [openAdd, setOpenAdd] = useState(false);
  const [editingVideo, setEditingVideo] =
    useState<Video | null>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [channel, setChannel] = useState("All");

  const ideaTitleMap = useMemo(() => {
    return new Map(ideas.map((idea) => [idea.id, idea.title]));
  }, [ideas]);

  const channels = useMemo(() => {
    return [
      "All",
      ...Array.from(
        new Set(
          videos
            .map((video) => video.channel)
            .filter(Boolean)
        )
      ),
    ] as string[];
  }, [videos]);

  const filteredVideos = videos.filter((video) => {
    const keyword = search.trim().toLowerCase();

    const text = [
      video.title,
      video.channel,
      video.status,
      video.owner,
      video.notes,
      video.idea_id
        ? ideaTitleMap.get(video.idea_id)
        : "",
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = !keyword || text.includes(keyword);

    const matchesStatus =
      status === "All" || video.status === status;

    const matchesChannel =
      channel === "All" || video.channel === channel;

    return matchesSearch && matchesStatus && matchesChannel;
  });

  const sortedVideos = [...filteredVideos].sort((a, b) => {
    const aTime = new Date(a.updated_at || a.created_at).getTime();
    const bTime = new Date(b.updated_at || b.created_at).getTime();

    return bTime - aTime;
  });

  const publishedVideos = videos.filter(
    (video) => video.status === "Published"
  );

  const inProductionVideos = videos.filter((video) =>
    ["Script", "Thumbnail", "Editing", "Ready"].includes(
      video.status || ""
    )
  );

  const totalRevenue = videos.reduce(
    (sum, video) => sum + Number(video.revenue || 0),
    0
  );

  async function handleDelete(video: Video) {
    const confirmed = window.confirm(
      `Delete this video?\n\n${video.title}`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("videos")
      .delete()
      .eq("id", video.id);

    if (error) {
      alert(error.message);
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-sm text-gray-500">Videos</p>
          <p className="text-3xl font-bold mt-2">
            {formatNumber(videos.length)}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-sm text-gray-500">In Production</p>
          <p className="text-3xl font-bold mt-2">
            {formatNumber(inProductionVideos.length)}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-sm text-gray-500">Published</p>
          <p className="text-3xl font-bold mt-2">
            {formatNumber(publishedVideos.length)}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-sm text-gray-500">Video Revenue</p>
          <p className="text-3xl font-bold mt-2">
            {formatMoney(totalRevenue)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">
                Video Pipeline
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Track production, publishing and performance by video.
              </p>
            </div>

            <button
              onClick={() => setOpenAdd(true)}
              className="inline-flex items-center gap-2 bg-zinc-900 text-white px-5 py-3 rounded-xl hover:bg-zinc-800"
            >
              <Plus size={18} />
              New Video
            </button>
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search videos..."
              className="border rounded-xl px-4 py-2 w-80"
            />

            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value)
              }
              className="border rounded-xl px-4 py-2"
            >
              <option>All</option>

              {statusOptions.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>

            <select
              value={channel}
              onChange={(event) =>
                setChannel(event.target.value)
              }
              className="border rounded-xl px-4 py-2"
            >
              {channels.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>

            <div className="text-sm text-gray-500 flex items-center">
              {formatNumber(sortedVideos.length)} / {formatNumber(videos.length)} videos
            </div>
          </div>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left p-4 min-w-80">
                  Video
                </th>

                <th className="text-left p-4 min-w-72">
                  Source Idea
                </th>

                <th className="text-left p-4">
                  Channel
                </th>

                <th className="text-left p-4">
                  Status
                </th>

                <th className="text-left p-4">
                  Publish
                </th>

                <th className="text-left p-4">
                  Views
                </th>

                <th className="text-left p-4">
                  CTR
                </th>

                <th className="text-left p-4">
                  Revenue
                </th>

                <th className="text-left p-4 min-w-52">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {sortedVideos.map((video) => {
                const statusName = video.status || "Idea";
                const statusClass =
                  statusStyles[statusName] ||
                  "bg-gray-50 text-gray-700 border-gray-100";

                const linkedIdeaTitle = video.idea_id
                  ? ideaTitleMap.get(video.idea_id)
                  : "";

                return (
                  <tr
                    key={video.id}
                    className="border-t hover:bg-gray-50"
                  >
                    <td className="p-4">
                      <div className="font-medium">
                        {video.title}
                      </div>

                      <div className="text-xs text-gray-400 mt-1">
                        ID #{video.id}
                      </div>

                      {video.youtube_url && (
                        <a
                          href={video.youtube_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 mt-2"
                        >
                          Open YouTube
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </td>

                    <td className="p-4 text-gray-600">
                      {linkedIdeaTitle || "-"}
                    </td>

                    <td className="p-4">
                      {video.channel || "-"}
                    </td>

                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full border text-xs font-medium ${statusClass}`}
                      >
                        {statusName}
                      </span>
                    </td>

                    <td className="p-4 text-gray-600">
                      {formatDate(video.publish_date)}
                    </td>

                    <td className="p-4">
                      {formatNumber(video.views)}
                    </td>

                    <td className="p-4">
                      {formatPercent(video.ctr)}
                    </td>

                    <td className="p-4">
                      {formatMoney(video.revenue)}
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setEditingVideo(video)}
                          className="inline-flex items-center gap-2 text-gray-600 hover:text-black"
                        >
                          <Pencil size={16} />
                          Edit
                        </button>

                        <button
                          onClick={() => handleDelete(video)}
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

              {sortedVideos.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="p-8 text-center text-gray-500"
                  >
                    No videos found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {openAdd && (
        <VideoFormModal
          mode="add"
          ideas={ideas}
          onClose={() => setOpenAdd(false)}
        />
      )}

      {editingVideo && (
        <VideoFormModal
          mode="edit"
          ideas={ideas}
          video={editingVideo}
          onClose={() => setEditingVideo(null)}
        />
      )}
    </div>
  );
}