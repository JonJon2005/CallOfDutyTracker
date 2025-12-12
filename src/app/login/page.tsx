"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/utils/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await fetch("/api/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            level: "info",
            message: "User logged in",
            context: { email },
          }),
        });
      }
      router.push("/home");
    } catch (err: any) {
      setError(err?.message || "Failed to log in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex max-w-5xl flex-col items-center px-4 py-12 md:px-6">
      <div className="w-full max-w-xl rounded-2xl border border-cod-blue/50 bg-cod-charcoal-dark/90 p-8 text-white shadow-panel backdrop-blur">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-md border border-cod-orange/50 bg-cod-orange px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cod-charcoal">
            Log In
          </div>
          <h1 className="mt-3 text-3xl font-bold leading-tight">Welcome back.</h1>
          <p className="mt-1 text-sm text-white/75">
            Access your manual COD camo tracker account.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-white/80" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-2 w-full rounded-lg border border-cod-blue/40 bg-cod-charcoal-light/70 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-cod-orange focus:outline-none focus:ring-2 focus:ring-cod-orange/60"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-2 w-full rounded-lg border border-cod-blue/40 bg-cod-charcoal-light/70 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-cod-orange focus:outline-none focus:ring-2 focus:ring-cod-orange/60"
            />
          </div>

          {error && <p className="text-sm font-semibold text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg border border-cod-orange/70 bg-cod-orange px-4 py-2.5 text-sm font-semibold text-cod-charcoal shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-white/70">
          Don&apos;t have an account?{" "}
          <a className="font-semibold text-cod-orange hover:underline" href="/signup">
            Sign up
          </a>
        </div>
      </div>
    </main>
  );
}
