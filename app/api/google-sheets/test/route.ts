import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AppsScriptResult = {
  success?: boolean;
  message?: string;
  error?: string;
  logSheet?: string;
};

export async function POST() {
  try {
    const webAppUrl =
      process.env.GOOGLE_SHEETS_WEBAPP_URL;

    const secret =
      process.env.GOOGLE_SHEETS_WEBAPP_SECRET;

    if (!webAppUrl) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Thiếu GOOGLE_SHEETS_WEBAPP_URL trong Vercel Environment Variables.",
        },
        {
          status: 500,
        }
      );
    }

    if (!secret) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Thiếu GOOGLE_SHEETS_WEBAPP_SECRET trong Vercel Environment Variables.",
        },
        {
          status: 500,
        }
      );
    }

    const appsScriptResponse = await fetch(
      webAppUrl,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "text/plain;charset=utf-8",
          Accept: "application/json",
        },
        body: JSON.stringify({
          action: "testConnection",
          secret,
        }),
        redirect: "follow",
        cache: "no-store",
      }
    );

    const rawText =
      await appsScriptResponse.text();

    let result: AppsScriptResult;

    try {
      result = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Apps Script không trả về JSON hợp lệ: " +
            rawText.slice(0, 300),
        },
        {
          status: 502,
        }
      );
    }

    if (
      !appsScriptResponse.ok ||
      result.success !== true
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            result.error ||
            "Apps Script từ chối kết nối.",
        },
        {
          status: 502,
        }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        result.message ||
        "StudioOS đã kết nối thành công với Google Sheet.",
      logSheet:
        result.logSheet ||
        "STUDIOOS_SYNC_LOG",
    });
  } catch (error) {
    console.error(
      "Google Sheets test error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Lỗi kết nối Google Sheets không xác định.",
      },
      {
        status: 500,
      }
    );
  }
}