"use client";

import { FormEvent, useState } from "react";
import { Lock, Sparkles } from "lucide-react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password,
        }),
      });

      const result = await response.json().catch(() => null);

      setLoading(false);

      if (!response.ok) {
        setErrorMessage(result?.error || "Login failed.");
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const nextPath = params.get("next") || "/";

      window.location.href = nextPath;
    } catch {
      setLoading(false);
      setErrorMessage("Cannot connect to login server.");
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
        <div className="w-14 h-14 rounded-2xl bg-zinc-900 text-white flex items-center justify-center mb-6">
          <Lock size={24} />
        </div>

        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={20} className="text-purple-600" />

          <p className="text-sm font-semibold text-purple-600">
            Private Workspace
          </p>
        </div>

        <h1 className="text-3xl font-bold">
          Login to StudioOS
        </h1>

        <p className="text-gray-500 mt-2">
          Enter your workspace password to access your YouTube studio system.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter StudioOS password"
              autoFocus
              className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-100 bg-red-50 text-red-700 p-4 text-sm">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-zinc-900 text-white rounded-xl px-5 py-3 font-medium hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-xs text-gray-400 mt-6">
          StudioOS is protected by a private password gate.
        </p>
      </div>
    </main>
  );
}