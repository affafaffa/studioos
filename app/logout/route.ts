import { NextResponse } from "next/server";

const AUTH_COOKIE_NAME = "studioos_auth";

export async function GET(request: Request) {
  const loginUrl = new URL("/login", request.url);

  const response = NextResponse.redirect(loginUrl);

  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    path: "/",
    maxAge: 0,
  });

  return response;
}