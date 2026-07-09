"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import type {
  CompetitorChannel,
  CompetitorGroup,
} from "@/types/competitor";

type Props = {
  groups: CompetitorGroup[];
  channels: CompetitorChannel[];
};

type ScanResult = {
  totalChannels: number;
  nextOffset: number;
  done: boolean;
  batchRows: number;
  scannedChannels: number;
  skippedChannels: number;
  failedChannels: number;
  syncedVideos: number;
  snapshotRows: number;
  errors?: {
    channelId: number;
    channelName: string;
    message: string;
  }[];
};

export default function CompetitorMarketScanButton({
  groups,
  channels,
}: Props) {
  const router = useRouter();

  const cancelRef = useRef(false);

  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);

  const [days, setDays] = useState(30);
  const [limit, setLimit] = useState(5);
  const [maxVideosPerChannel, setMaxVideosPerChannel] = useState(25);
  const [staleOnly, setStaleOnly] = useState(true);

  const [progress, setProgress] = useState(0);
  const [totalChannels, setTotalChannels] = useState(channels.length);
  const [processedRows, setProcessedRows] = useState(0);
  const [scannedChannels, setScannedChannels] = useState(0);
  const [skippedChannels, setSkippedChannels] = useState(0);
  const [failedChannels, setFailedChannels] = useState(0);
  const [syncedVideos, setSyncedVideos] = useState(0);
  const [snapshotRows, setSnapshotRows] = useState(0);
  const [errors, setErrors] = useState<ScanResult["errors"]>([]);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function resetStats() {
    setProgress(0);
    setTotalChannels(channels.length);
    setProcessedRows(0);
    setScannedChannels(0);
    setSkippedChannels(0);
    setFailedChannels(0);
    setSyncedVideos(0);
    setSnapshotRows(0);
    setErrors([]);
    setMessage("");
    setErrorMessage("");
  }

  async function startScan() {
    cancelRef.current = false;

    resetStats();
    setRunning(true);

    let offset = 0;
    let localScanned = 0;
    let localSkipped = 0;
    let localFailed = 0;
    let localVideos = 0;
    let localSnapshots = 0;
    let localTotal = channels.length;
    let localErrors: ScanResult["errors"] = [];

    try {
      for (let round = 0; round < 10000; round += 1) {
        if (cancelRef.current) {
          setMessage("Scan stopped by user.");
          break;
        }

        const response = await fetch("/api/competitors/scan-all-market", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            offset,
            limit,
            days,
            maxVideosPerChannel,
            staleOnly,
          }),
        });

        const data = (await response.json()) as ScanResult & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error || "Scan failed.");
        }

        localTotal = data.totalChannels || localTotal;
        localScanned += data.scannedChannels || 0;
        localSkipped += data.skippedChannels || 0;
        localFailed += data.failedChannels || 0;
        localVideos += data.syncedVideos || 0;
        localSnapshots += data.snapshotRows || 0;
        localErrors = [
          ...(localErrors || []),
          ...(data.errors || []),
        ].slice(-30);

        offset = data.nextOffset || offset + limit;

        setTotalChannels(localTotal);
        setProcessedRows(Math.min(offset, localTotal));
        setScannedChannels(localScanned);
        setSkippedChannels(localSkipped);
        setFailedChannels(localFailed);
        setSyncedVideos(localVideos);
        setSnapshotRows(localSnapshots);
        setErrors(localErrors);
        setProgress(
          localTotal > 0
            ? Math.min(100, Math.round((offset / localTotal) * 100))
            : 100
        );

        if (data.done) {
          setMessage("Market scan completed. Competitor data refreshed.");
          break;
        }
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unknown scan error."
      );
    }

    setRunning(false);
    router.refresh();
  }

  function stopScan() {
    cancelRef.current = true;
    setRunning(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-purple-600 text-white px-5 py-3 rounded-xl hover:bg-purple-700"
      >
        <RefreshCw size={18} />
        Scan All Market
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-auto studioos-readable">
            <div className="sticky top-0 bg-white border-b p-6 flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-purple-50 text-purple-700 px-3 py-1 text-xs font-bold">
                  <Activity size={14} />
                  Competitor Market Scanner
                </div>

                <h2 className="text-2xl font-bold mt-3">
                  Scan all competitor channels
                </h2>

                <p className="text-sm text-slate-600 mt-1">
                  Quét toàn bộ kênh theo batch để cập nhật video metadata, thumbnail, views và snapshots cho market share, keyword radar, remix lab.
                </p>
              </div>

              <button
                onClick={() => setOpen(false)}
                disabled={running}
                className="w-10 h-10 rounded-2xl border flex items-center justify-center hover:bg-slate-50 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="rounded-3xl border bg-purple-50 border-purple-200 p-5">
                  <p className="text-sm font-bold text-purple-700">
                    Groups
                  </p>

                  <p className="text-3xl font-bold mt-2">
                    {groups.length.toLocaleString("en-US")}
                  </p>
                </div>

                <div className="rounded-3xl border bg-blue-50 border-blue-200 p-5">
                  <p className="text-sm font-bold text-blue-700">
                    Channels
                  </p>

                  <p className="text-3xl font-bold mt-2">
                    {channels.length.toLocaleString("en-US")}
                  </p>
                </div>

                <div className="rounded-3xl border bg-emerald-50 border-emerald-200 p-5">
                  <p className="text-sm font-bold text-emerald-700">
                    Videos Synced
                  </p>

                  <p className="text-3xl font-bold mt-2">
                    {syncedVideos.toLocaleString("en-US")}
                  </p>
                </div>

                <div className="rounded-3xl border bg-amber-50 border-amber-200 p-5">
                  <p className="text-sm font-bold text-amber-700">
                    Snapshots
                  </p>

                  <p className="text-3xl font-bold mt-2">
                    {snapshotRows.toLocaleString("en-US")}
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border p-5">
                <h3 className="text-xl font-bold">
                  Scan Settings
                </h3>

                <div className="grid grid-cols-4 gap-4 mt-5">
                  <div>
                    <label className="block text-sm font-bold mb-2">
                      Video Window
                    </label>

                    <select
                      value={days}
                      onChange={(event) => setDays(Number(event.target.value))}
                      disabled={running}
                      className="w-full border rounded-2xl px-4 py-3"
                    >
                      <option value={7}>Last 7 days</option>
                      <option value={30}>Last 30 days</option>
                      <option value={90}>Last 90 days</option>
                      <option value={365}>Last 365 days</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2">
                      Batch Size
                    </label>

                    <select
                      value={limit}
                      onChange={(event) => setLimit(Number(event.target.value))}
                      disabled={running}
                      className="w-full border rounded-2xl px-4 py-3"
                    >
                      <option value={3}>3 channels / batch</option>
                      <option value={5}>5 channels / batch</option>
                      <option value={10}>10 channels / batch</option>
                      <option value={15}>15 channels / batch</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2">
                      Max Videos / Channel
                    </label>

                    <select
                      value={maxVideosPerChannel}
                      onChange={(event) =>
                        setMaxVideosPerChannel(Number(event.target.value))
                      }
                      disabled={running}
                      className="w-full border rounded-2xl px-4 py-3"
                    >
                      <option value={10}>10 videos</option>
                      <option value={25}>25 videos</option>
                      <option value={50}>50 videos</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2">
                      Scope
                    </label>

                    <select
                      value={staleOnly ? "stale" : "all"}
                      onChange={(event) =>
                        setStaleOnly(event.target.value === "stale")
                      }
                      disabled={running}
                      className="w-full border rounded-2xl px-4 py-3"
                    >
                      <option value="stale">
                        Stale only
                      </option>
                      <option value="all">
                        Force all channels
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold">
                      Scan Progress
                    </h3>

                    <p className="text-sm text-slate-600 mt-1">
                      {processedRows.toLocaleString("en-US")} / {totalChannels.toLocaleString("en-US")} channel rows checked
                    </p>
                  </div>

                  <p className="text-3xl font-bold">
                    {progress}%
                  </p>
                </div>

                <div className="h-4 rounded-full bg-slate-100 overflow-hidden mt-5">
                  <div
                    className="h-full bg-zinc-950 rounded-full transition-all"
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>

                <div className="grid grid-cols-4 gap-4 mt-5">
                  <div className="rounded-2xl bg-slate-50 border p-4">
                    <p className="text-xs text-slate-500">Scanned</p>
                    <p className="text-2xl font-bold mt-1">{scannedChannels}</p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 border p-4">
                    <p className="text-xs text-slate-500">Skipped</p>
                    <p className="text-2xl font-bold mt-1">{skippedChannels}</p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 border p-4">
                    <p className="text-xs text-slate-500">Failed</p>
                    <p className="text-2xl font-bold mt-1">{failedChannels}</p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 border p-4">
                    <p className="text-xs text-slate-500">Videos</p>
                    <p className="text-2xl font-bold mt-1">{syncedVideos}</p>
                  </div>
                </div>
              </div>

              {message && (
                <p className="rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-3 text-sm font-semibold flex items-center gap-2">
                  <CheckCircle2 size={18} />
                  {message}
                </p>
              )}

              {errorMessage && (
                <p className="rounded-2xl bg-red-50 text-red-700 border border-red-200 px-4 py-3 text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle size={18} />
                  {errorMessage}
                </p>
              )}

              {errors && errors.length > 0 && (
                <div className="rounded-3xl border border-red-200 bg-red-50 p-5">
                  <h3 className="font-bold text-red-700">
                    Recent channel errors
                  </h3>

                  <div className="space-y-3 mt-4 max-h-64 overflow-auto">
                    {errors.map((error) => (
                      <div
                        key={`${error.channelId}-${error.message}`}
                        className="rounded-2xl bg-white border p-4"
                      >
                        <p className="font-bold">
                          #{error.channelId} · {error.channelName}
                        </p>

                        <p className="text-sm text-red-700 mt-1">
                          {error.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-3xl border bg-slate-50 p-5">
                <div className="flex items-center gap-2">
                  <Database size={18} />

                  <h3 className="font-bold">
                    What this updates
                  </h3>
                </div>

                <p className="text-sm text-slate-600 mt-3 leading-6">
                  Sau khi scan xong, các mục Group Market Share, Keyword Radar, Competitor Remix Lab và Video Metadata sẽ dùng data mới nhất từ bảng competitor_videos và competitor_video_snapshots.
                </p>
              </div>

              <div className="sticky bottom-0 bg-white border-t pt-4 flex justify-end gap-3">
                <button
                  onClick={() => setOpen(false)}
                  disabled={running}
                  className="rounded-2xl border px-5 py-3 font-bold disabled:opacity-50"
                >
                  Close
                </button>

                {running ? (
                  <button
                    onClick={stopScan}
                    className="rounded-2xl bg-red-600 text-white px-5 py-3 font-bold"
                  >
                    Stop Scan
                  </button>
                ) : (
                  <button
                    onClick={startScan}
                    className="rounded-2xl bg-zinc-950 text-white px-5 py-3 font-bold inline-flex items-center gap-2"
                  >
                    <RefreshCw size={17} />
                    Start Market Scan
                  </button>
                )}

                {running && (
                  <div className="rounded-2xl border px-5 py-3 font-bold inline-flex items-center gap-2">
                    <Loader2 size={17} className="animate-spin" />
                    Scanning...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
