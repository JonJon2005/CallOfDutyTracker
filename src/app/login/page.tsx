"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/utils/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const identifierTrim = identifier.trim();
      if (!identifierTrim) {
        throw new Error("Enter your email or username.");
      }

      let emailToUse = identifierTrim;

      // If the identifier is not an email, resolve via serverless endpoint (service role)
      if (!identifierTrim.includes("@")) {
        const res = await fetch("/api/auth/resolve-username", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: identifierTrim }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || "No email found for that username. Try your email instead.");
        }
        const body = await res.json();
        emailToUse = body.email as string;
      }
      if (!emailToUse.includes("@")) {
        throw new Error("No email found for that username. Try your email instead.");
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      });
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
            context: { identifier, resolved_email: emailToUse },
          }),
        });
      }
      router.push("/home");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Failed to log in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-shell flex flex-col items-center py-12">
      <div className="glass-panel glass-soft w-full max-w-xl border border-white/10 p-8 text-white shadow-panel backdrop-blur">
        <div className="mb-6">
          <div className="chip chip-amber">Log In</div>
          <h1 className="mt-3 text-3xl font-bold leading-tight">Welcome back.</h1>
          <p className="mt-1 text-sm text-white/75">
            Access your manual COD camo tracker account.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-white/80" htmlFor="identifier">
              Email or Username
            </label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              placeholder="you@example.com or yourusername"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              className="mt-2 w-full rounded-lg border border-cod-orange/40 bg-cod-charcoal-light/70 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-cod-orange focus:outline-none focus:ring-2 focus:ring-cod-orange/60"
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
              className="mt-2 w-full rounded-lg border border-cod-orange/40 bg-cod-charcoal-light/70 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-cod-orange focus:outline-none focus:ring-2 focus:ring-cod-orange/60"
            />
          </div>

          {error && <p className="text-sm font-semibold text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
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
