import { NextResponse } from "next/server";

const AUTH_COOKIE_NAME = "studioos_auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const password = String(body.password || "");

    const expectedPassword = process.env.STUDIOOS_PASSWORD;
    const authToken = process.env.STUDIOOS_AUTH_TOKEN;

    if (!expectedPassword || !authToken) {
      return NextResponse.json(
        {
          error:
            "Missing STUDIOOS_PASSWORD or STUDIOOS_AUTH_TOKEN in environment variables.",
        },
        {
          status: 500,
        }
      );
    }

    if (password !== expectedPassword) {
      return NextResponse.json(
        {
          error: "Wrong password.",
        },
        {
          status: 401,
        }
      );
    }

    const response = NextResponse.json({
      ok: true,
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: authToken,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });

    return response;
  } catch {
    return NextResponse.json(
      {
        error: "Invalid login request.",
      },
      {
        status: 400,
      }
    );
  }
}