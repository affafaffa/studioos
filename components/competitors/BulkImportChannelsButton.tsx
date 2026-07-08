"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Upload, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type {
  CompetitorChannel,
  CompetitorGroup,
} from "@/types/competitor";

type Props = {
  groups: CompetitorGroup[];
  existingChannels: CompetitorChannel[];
};

type ParsedChannel = {
  lineNumber: number;
  channelName: string;
  channelUrl: string;
  youtubeChannelId: string;
  niche: string;
  language: string;
  country: string;
  notes: string;
  isDuplicate: boolean;
  duplicateReason: string;
};

const statusOptions = [
  "Active",
  "Watchlist",
  "Paused",
  "Archived",
];

function cleanText(value: string) {
  return value.replace(/^"|"$/g, "").trim();
}

function isUrlLike(value: string) {
  const text = value.trim().toLowerCase();

  return (
    text.startsWith("http") ||
    text.startsWith("www.") ||
    text.includes("youtube.com") ||
    text.startsWith("@")
  );
}

function normalizeChannelUrl(value: string) {
  const text = value.trim();

  if (!text) return "";

  if (text.startsWith("@")) {
    return `https://www.youtube.com/${text}`;
  }

  if (text.startsWith("www.")) {
    return `https://${text}`;
  }

  if (text.includes("youtube.com") && !text.startsWith("http")) {
    return `https://${text}`;
  }

  return text;
}

function extractUrlFromText(line: string) {
  const match = line.match(
    /(https?:\/\/[^\s,|]+|www\.[^\s,|]+|youtube\.com\/[^\s,|]+|@[a-zA-Z0-9._-]+)/i
  );

  return match ? match[0] : "";
}

function extractYoutubeChannelId(url: string) {
  const match = url.match(/\/channel\/(UC[a-zA-Z0-9_-]+)/);

  return match ? match[1] : "";
}

function deriveNameFromUrl(url: string) {
  const handleMatch = url.match(/youtube\.com\/@([^/?&]+)/i);

  if (handleMatch) {
    return `@${handleMatch[1]}`;
  }

  const channelMatch = url.match(/\/channel\/(UC[a-zA-Z0-9_-]+)/);

  if (channelMatch) {
    return channelMatch[1];
  }

  const customMatch = url.match(/youtube\.com\/(c|user)\/([^/?&]+)/i);

  if (customMatch) {
    return customMatch[2];
  }

  return "Competitor Channel";
}

function splitStructuredLine(line: string) {
  if (line.includes("\t")) {
    return line.split("\t").map(cleanText);
  }

  if (line.includes("|")) {
    return line.split("|").map(cleanText);
  }

  const commaParts = line.split(",").map(cleanText);

  if (commaParts.length >= 2) {
    return commaParts;
  }

  return [];
}

function normalizeKey(value: string) {
  return value
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "")
    .trim();
}

function getChannelKey(input: {
  channelName: string;
  channelUrl: string;
  youtubeChannelId: string;
}) {
  if (input.youtubeChannelId) {
    return `id:${normalizeKey(input.youtubeChannelId)}`;
  }

  if (input.channelUrl) {
    return `url:${normalizeKey(input.channelUrl)}`;
  }

  return `name:${normalizeKey(input.channelName)}`;
}

function parseOneLine({
  line,
  lineNumber,
  defaultNiche,
  defaultLanguage,
  defaultCountry,
}: {
  line: string;
  lineNumber: number;
  defaultNiche: string;
  defaultLanguage: string;
  defaultCountry: string;
}) {
  const trimmed = line.trim();

  let channelName = "";
  let channelUrl = "";
  let niche = defaultNiche;
  let language = defaultLanguage;
  let country = defaultCountry;
  let notes = "";

  const parts = splitStructuredLine(trimmed);

  if (parts.length >= 2) {
    if (isUrlLike(parts[0])) {
      channelUrl = normalizeChannelUrl(parts[0]);
      channelName = deriveNameFromUrl(channelUrl);
      niche = parts[1] || defaultNiche;
      language = parts[2] || defaultLanguage;
      country = parts[3] || defaultCountry;
      notes = parts.slice(4).join(" ");
    } else {
      channelName = parts[0];
      channelUrl = normalizeChannelUrl(parts[1] || "");
      niche = parts[2] || defaultNiche;
      language = parts[3] || defaultLanguage;
      country = parts[4] || defaultCountry;
      notes = parts.slice(5).join(" ");
    }
  } else {
    const foundUrl = extractUrlFromText(trimmed);

    if (foundUrl) {
      channelUrl = normalizeChannelUrl(foundUrl);
      channelName = trimmed.replace(foundUrl, "").trim();

      if (!channelName) {
        channelName = deriveNameFromUrl(channelUrl);
      }
    } else {
      channelName = trimmed;
    }
  }

  const youtubeChannelId = extractYoutubeChannelId(channelUrl);

  return {
    lineNumber,
    channelName: channelName || deriveNameFromUrl(channelUrl),
    channelUrl,
    youtubeChannelId,
    niche,
    language,
    country,
    notes,
  };
}

export default function BulkImportChannelsButton({
  groups,
  existingChannels,
}: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [rawText, setRawText] = useState("");
  const [groupId, setGroupId] = useState("");
  const [defaultNiche, setDefaultNiche] = useState("Baby Doll");
  const [defaultLanguage, setDefaultLanguage] = useState("EN");
  const [defaultCountry, setDefaultCountry] = useState("US");
  const [defaultStatus, setDefaultStatus] = useState("Active");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const parsedChannels = useMemo(() => {
    const existingKeys = new Set(
      existingChannels.map((channel) =>
        getChannelKey({
          channelName: channel.channel_name,
          channelUrl: channel.channel_url || "",
          youtubeChannelId: channel.youtube_channel_id || "",
        })
      )
    );

    const seenKeys = new Set<string>();

    return rawText
      .split("\n")
      .map((line, index) => ({
        line,
        lineNumber: index + 1,
      }))
      .filter((item) => item.line.trim())
      .map((item): ParsedChannel => {
        const parsed = parseOneLine({
          line: item.line,
          lineNumber: item.lineNumber,
          defaultNiche,
          defaultLanguage,
          defaultCountry,
        });

        const key = getChannelKey(parsed);

        let isDuplicate = false;
        let duplicateReason = "";

        if (existingKeys.has(key)) {
          isDuplicate = true;
          duplicateReason = "Already exists";
        } else if (seenKeys.has(key)) {
          isDuplicate = true;
          duplicateReason = "Duplicate in pasted list";
        }

        seenKeys.add(key);

        return {
          ...parsed,
          isDuplicate,
          duplicateReason,
        };
      });
  }, [
    rawText,
    defaultNiche,
    defaultLanguage,
    defaultCountry,
    existingChannels,
  ]);

  const channelsToImport = parsedChannels.filter(
    (channel) => !channel.isDuplicate
  );

  const duplicateChannels = parsedChannels.filter(
    (channel) => channel.isDuplicate
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (channelsToImport.length === 0) {
      setErrorMessage("No new channels to import.");
      return;
    }

    const confirmed = window.confirm(
      `Import ${channelsToImport.length} channels?\n\n${duplicateChannels.length} duplicate lines will be skipped.`
    );

    if (!confirmed) return;

    setLoading(true);
    setErrorMessage("");

    const payload = channelsToImport.map((channel) => ({
      group_id: groupId ? Number(groupId) : null,
      channel_name: channel.channelName,
      channel_url: channel.channelUrl || null,
      youtube_channel_id: channel.youtubeChannelId || null,
      niche: channel.niche || defaultNiche,
      language: channel.language || defaultLanguage,
      country: channel.country || defaultCountry,
      status: defaultStatus,
      notes: channel.notes || "",
    }));

    for (let index = 0; index < payload.length; index += 500) {
      const chunk = payload.slice(index, index + 500);

      const { error } = await supabase
        .from("competitor_channels")
        .insert(chunk);

      if (error) {
        setLoading(false);
        setErrorMessage(error.message);
        return;
      }
    }

    setLoading(false);
    setRawText("");
    setOpen(false);

    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-zinc-900 text-white px-5 py-3 rounded-xl hover:bg-zinc-800"
      >
        <Upload size={18} />
        Bulk Import
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-6xl max-h-[90vh] overflow-auto rounded-2xl shadow-xl">
            <div className="sticky top-0 bg-white border-b p-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">
                  Bulk Import Competitor Channels
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Paste many YouTube channels at once from Excel, Google Sheets or a plain list.
                </p>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-xl border flex items-center justify-center hover:bg-gray-50"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Group
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
                    Default Niche
                  </label>

                  <input
                    value={defaultNiche}
                    onChange={(event) =>
                      setDefaultNiche(event.target.value)
                    }
                    className="w-full border rounded-xl px-4 py-3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Default Language
                  </label>

                  <select
                    value={defaultLanguage}
                    onChange={(event) =>
                      setDefaultLanguage(event.target.value)
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
                    Default Country
                  </label>

                  <input
                    value={defaultCountry}
                    onChange={(event) =>
                      setDefaultCountry(event.target.value)
                    }
                    className="w-full border rounded-xl px-4 py-3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Status
                  </label>

                  <select
                    value={defaultStatus}
                    onChange={(event) =>
                      setDefaultStatus(event.target.value)
                    }
                    className="w-full border rounded-xl px-4 py-3"
                  >
                    {statusOptions.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-2xl border bg-gray-50 p-4 text-sm text-gray-600">
                <div className="font-semibold text-gray-900 mb-2">
                  Supported paste formats:
                </div>

                <pre className="whitespace-pre-wrap leading-6">
{`https://www.youtube.com/@BabyDollStories
Baby Doll Stories, https://www.youtube.com/@BabyDollStories
Baby Doll Stories | https://www.youtube.com/@BabyDollStories | Baby Doll | EN | US
Baby Doll Stories    https://www.youtube.com/@BabyDollStories    Baby Doll    EN    US`}
                </pre>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Paste Channel List
                </label>

                <textarea
                  value={rawText}
                  onChange={(event) => setRawText(event.target.value)}
                  rows={12}
                  placeholder="Paste 10, 100, or 2000 channel lines here..."
                  className="w-full border rounded-xl px-4 py-3 font-mono text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-2xl border p-4">
                  <p className="text-sm text-gray-500">Parsed Lines</p>
                  <p className="text-2xl font-bold mt-1">
                    {parsedChannels.length.toLocaleString("en-US")}
                  </p>
                </div>

                <div className="rounded-2xl border p-4">
                  <p className="text-sm text-gray-500">New Channels</p>
                  <p className="text-2xl font-bold mt-1">
                    {channelsToImport.length.toLocaleString("en-US")}
                  </p>
                </div>

                <div className="rounded-2xl border p-4">
                  <p className="text-sm text-gray-500">Skipped Duplicates</p>
                  <p className="text-2xl font-bold mt-1">
                    {duplicateChannels.length.toLocaleString("en-US")}
                  </p>
                </div>
              </div>

              {parsedChannels.length > 0 && (
                <div className="border rounded-2xl overflow-hidden">
                  <div className="p-4 border-b flex items-center gap-2">
                    <ClipboardList size={18} />
                    <h3 className="font-bold">
                      Import Preview
                    </h3>
                  </div>

                  <div className="overflow-auto max-h-80">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-500">
                        <tr>
                          <th className="text-left p-3">Line</th>
                          <th className="text-left p-3">Channel</th>
                          <th className="text-left p-3">URL</th>
                          <th className="text-left p-3">Niche</th>
                          <th className="text-left p-3">Lang</th>
                          <th className="text-left p-3">Country</th>
                          <th className="text-left p-3">Status</th>
                        </tr>
                      </thead>

                      <tbody>
                        {parsedChannels.slice(0, 100).map((channel) => (
                          <tr
                            key={`${channel.lineNumber}-${channel.channelName}`}
                            className={`border-t ${
                              channel.isDuplicate
                                ? "bg-red-50"
                                : "hover:bg-gray-50"
                            }`}
                          >
                            <td className="p-3">
                              {channel.lineNumber}
                            </td>

                            <td className="p-3 font-medium">
                              {channel.channelName}
                            </td>

                            <td className="p-3 text-gray-600">
                              {channel.channelUrl || "-"}
                            </td>

                            <td className="p-3">
                              {channel.niche || "-"}
                            </td>

                            <td className="p-3">
                              {channel.language || "-"}
                            </td>

                            <td className="p-3">
                              {channel.country || "-"}
                            </td>

                            <td className="p-3">
                              {channel.isDuplicate
                                ? channel.duplicateReason
                                : "Ready"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {parsedChannels.length > 100 && (
                    <div className="p-3 text-sm text-gray-500 border-t">
                      Showing first 100 rows only.
                    </div>
                  )}
                </div>
              )}

              {errorMessage && (
                <p className="text-sm text-red-600">
                  {errorMessage}
                </p>
              )}

              <div className="sticky bottom-0 bg-white border-t pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-5 py-3 rounded-xl border"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading || channelsToImport.length === 0}
                  className="px-5 py-3 rounded-xl bg-zinc-900 text-white disabled:opacity-50"
                >
                  {loading
                    ? "Importing..."
                    : `Import ${channelsToImport.length.toLocaleString("en-US")} Channels`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}