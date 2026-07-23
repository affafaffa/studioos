"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";

const GOOGLE_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1yi2XMXzrdhfB_zHZVwYeMcU3Q18Fqx5BFDOY6G7-LSY/edit#gid=617504802";

type UpdateResult = {
  success?: boolean;
  message?: string;
  error?: string;
  counts?: {
    studioVideos?: number;
    marketVideos?: number;
    trendGroups?: number;
    thumbnailRows?: number;
  };
  marketExpansion?: {
    enabled?: boolean;
  };
};

export default function UpdateTrendsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UpdateResult | null>(null);

  async function updateTrends() {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(
        "/api/google-sheets/keyword-trends",
        {
          method: "POST",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      const text = await response.text();
      let parsed: UpdateResult;

      try {
        parsed = JSON.parse(text) as UpdateResult;
      } catch {
        throw new Error(
          `API không trả JSON hợp lệ. HTTP ${response.status}: ${text.slice(0, 250)}`
        );
      }

      if (!response.ok || parsed.success !== true) {
        throw new Error(parsed.error || "Cập nhật xu hướng thất bại.");
      }

      setResult(parsed);
    } catch (error) {
      setResult({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Cập nhật xu hướng thất bại.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <section className="rounded-3xl bg-zinc-950 p-6 text-white shadow-xl sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">
            StudioOS Market Update
          </p>

          <h1 className="mt-3 text-3xl font-black sm:text-4xl">
            Cập nhật 10 xu hướng từ khóa
          </h1>

          <p className="mt-4 max-w-2xl leading-7 text-zinc-300">
            Quét dữ liệu 90 ngày, loại Shorts và livestream, nhóm thumbnail theo
            từ khóa, bố cục, màu sắc và nhân vật. Kết quả được xếp theo volume và
            traffic ước tính từ cao xuống thấp.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={updateTrends}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-6 py-3.5 font-black text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={19}
                className={loading ? "animate-spin" : ""}
              />
              {loading ? "Đang quét thị trường..." : "Cập nhật 10 xu hướng"}
            </button>

            <a
              href={GOOGLE_SHEET_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-6 py-3.5 font-bold text-white transition hover:bg-white/15"
            >
              <ExternalLink size={18} />
              Mở Google Sheet
            </a>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-xl font-black text-zinc-950">Quy tắc cập nhật</h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              "Top 10 nhóm xu hướng",
              "Từ khóa được phép lặp nếu nhóm hình khác nhau",
              "Không trùng video hoặc link YouTube",
              "Ưu tiên thumbnail từ nhiều kênh khác nhau",
              "Thumbnail cùng bố cục, màu và nhân vật nằm cạnh nhau",
              "Xếp từ traffic + volume cao xuống thấp",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700"
              >
                {item}
              </div>
            ))}
          </div>

          {result && (
            <div
              className={`mt-6 rounded-2xl border p-4 ${
                result.success
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-red-200 bg-red-50 text-red-900"
              }`}
            >
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle2 className="mt-0.5 shrink-0" size={21} />
                ) : (
                  <TriangleAlert className="mt-0.5 shrink-0" size={21} />
                )}

                <div>
                  <p className="font-black">
                    {result.success
                      ? result.message || "Cập nhật thành công."
                      : "Cập nhật thất bại"}
                  </p>

                  {result.success ? (
                    <p className="mt-2 text-sm leading-6">
                      Xu hướng: {result.counts?.trendGroups || 0} · Dòng thumbnail:{" "}
                      {result.counts?.thumbnailRows || 0} · Nguồn StudioOS:{" "}
                      {result.counts?.studioVideos || 0} · Nguồn thị trường mở rộng:{" "}
                      {result.counts?.marketVideos || 0}
                      <br />
                      Quét YouTube thị trường:{" "}
                      {result.marketExpansion?.enabled ? "Đã bật" : "Chưa bật API key"}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm leading-6">{result.error}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
