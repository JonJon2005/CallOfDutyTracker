"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/utils/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

      if (signUpError) throw signUpError;

      // If confirmation is disabled, Supabase should give us a session; otherwise attempt sign-in directly.
      if (!data.session && data.user) {
        const { data: loginData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        data.session = loginData.session;
      }

      if (data.user && data.session) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          username: username || null,
          display_name: username || null,
          email,
        });

        // Server-side logging to Supabase and server console
        await fetch("/api/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: data.user.id,
            level: "info",
            message: "User signed up",
            context: { email, username: username || null },
          }),
        });

        router.push("/home");
        router.refresh();
        return;
      }

      setMessage("Account created. Please log in.");
    } catch (err: any) {
      setError(err?.message || "Failed to sign up.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex max-w-5xl flex-col items-center px-4 py-12 md:px-6">
      <div className="w-full max-w-xl rounded-2xl border border-cod-blue/50 bg-cod-charcoal-dark/90 p-8 text-white shadow-panel backdrop-blur">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-md border border-cod-orange/50 bg-cod-orange px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cod-charcoal">
            Sign Up
          </div>
          <h1 className="mt-3 text-3xl font-bold leading-tight">Create your account.</h1>
          <p className="mt-1 text-sm text-white/75">
            Start tracking COD levels, prestige, and camo milestones manually.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-white/80" htmlFor="name">
              Username
            </label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Your handle"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-2 w-full rounded-lg border border-cod-blue/40 bg-cod-charcoal-light/70 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-cod-orange focus:outline-none focus:ring-2 focus:ring-cod-orange/60"
            />
          </div>
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
          <div className="grid gap-3 md:grid-cols-2">
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
            <div>
              <label
                className="block text-sm font-medium text-white/80"
                htmlFor="confirmPassword"
              >
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="mt-2 w-full rounded-lg border border-cod-blue/40 bg-cod-charcoal-light/70 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-cod-orange focus:outline-none focus:ring-2 focus:ring-cod-orange/60"
              />
            </div>
          </div>

          {error && <p className="text-sm font-semibold text-red-400">{error}</p>}
          {message && <p className="text-sm font-semibold text-cod-orange">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg border border-cod-orange/70 bg-cod-orange px-4 py-2.5 text-sm font-semibold text-cod-charcoal shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-white/70">
          Already have an account?{" "}
          <a className="font-semibold text-cod-orange hover:underline" href="/login">
            Log in
          </a>
        </div>
      </div>
    </main>
  );
}
