"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/utils/supabase/client";
import { PrestigeBadge } from "@/app/components/PrestigeBadge";

export default function AccountsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [level, setLevel] = useState<number | "">("");
  const [prestige, setPrestige] = useState<number | "">("");
  const [isMaster, setIsMaster] = useState(false);
  const [activisionName, setActivisionName] = useState("");
  const [activisionTag, setActivisionTag] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const prestigePreviewValue = isMaster ? 11 : prestige === "" ? null : prestige;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      setMessage(null);
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        setError("Please log in to manage your account.");
        setLoading(false);
        return;
      }
      setUserId(user.id);

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("account_level, prestige, activision_id, username")
        .eq("id", user.id)
        .single();

      if (!profileError && data) {
        setLevel((data.account_level as number | null) ?? "");
        const prestigeVal = (data.prestige as number | null) ?? 0;
        setPrestige(prestigeVal >= 11 ? 10 : prestigeVal);
        setIsMaster(prestigeVal >= 11);

        const activisionId = (data.activision_id as string | null) ?? "";
        const [namePart, tagPart] = activisionId.split("#");
        if (namePart) setActivisionName(namePart);
        if (tagPart && /^\d{7}$/.test(tagPart)) setActivisionTag(tagPart);

        setUsername((data.username as string | null) ?? "");
      }
      setLoading(false);
    };

    load();
  }, [supabase]);

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) {
      setError("Please log in to manage your account.");
      return;
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername && (trimmedUsername.length < 3 || trimmedUsername.length > 20)) {
      setError("Username must be 3-20 characters.");
      return;
    }
    if (trimmedUsername && !/^[a-zA-Z0-9._-]+$/.test(trimmedUsername)) {
      setError("Username can only include letters, numbers, dots, underscores, or dashes.");
      return;
    }

    const trimmedName = activisionName.trim();
    const trimmedTag = activisionTag.trim();
    const tagValid = trimmedTag === "" || /^\d{7}$/.test(trimmedTag);
    const nameValid = trimmedName === "" || trimmedName.length >= 3;

    if (!nameValid) {
      setError("Activision ID name must be at least 3 characters.");
      return;
    }
    if (!tagValid) {
      setError("Activision ID tag must be exactly 7 digits.");
      return;
    }
    if ((trimmedName && !trimmedTag) || (!trimmedName && trimmedTag)) {
      setError("Provide both Activision ID name and 7-digit tag, or leave both blank.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const prestigeValue = isMaster ? 11 : prestige === "" ? null : prestige;
      const activisionId =
        trimmedName && trimmedTag ? `${trimmedName}#${trimmedTag}` : null;
      const usernameToStore = trimmedUsername || null;
      const { error: upsertError } = await supabase.from("profiles").upsert({
        id: userId,
        account_level: level === "" ? null : level,
        prestige: prestigeValue,
        activision_id: activisionId,
        username: usernameToStore,
      });
      if (upsertError) throw upsertError;

      // Log to server (stored in Supabase logs + server console)
      await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          level: "info",
          message: "Account profile updated",
          context: {
            account_level: level,
            prestige: prestigeValue,
            isMaster,
            activision_id: activisionId,
            username: usernameToStore,
          },
        }),
      });

      setMessage("Saved account progress.");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("profile-updated"));
      }
    } catch (err: any) {
      if (err?.code === "23505") {
        setError("That username is already taken. Try another.");
      } else {
        setError(err?.message || "Failed to save account progress.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10 md:px-6">
      <div className="rounded-2xl border border-cod-blue/50 bg-cod-charcoal-dark/90 p-6 text-white shadow-panel backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Accounts</p>
            <h1 className="text-2xl font-bold leading-tight">Update Account Progress</h1>
            <p className="text-sm text-white/70">
              Enter your current level and prestige. Basic info below is a placeholder for future
              profile details.
            </p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSave}>
          <div className="space-y-3 rounded-lg border border-cod-blue/35 bg-cod-charcoal-dark/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60">
                  Basic Information
                </p>
                <p className="text-sm text-white/70">Update your public-facing username and email.</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-white/80" htmlFor="username">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="3-20 chars (letters, numbers, . _ -)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={30}
                  className="w-full rounded-lg border border-cod-blue/40 bg-cod-charcoal-light/70 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-cod-orange focus:outline-none focus:ring-2 focus:ring-cod-orange/60"
                  disabled={loading || saving}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-white/80">Email</label>
                <input
                  type="text"
                  placeholder="Email shown for reference"
                  disabled
                  className="w-full rounded-lg border border-cod-blue/30 bg-cod-charcoal-light/50 px-3 py-2 text-sm text-white/60"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-cod-blue/35 bg-cod-charcoal-dark/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60">
                Account Progress
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-white/80" htmlFor="level">
                  Account level
                </label>
                <input
                  id="level"
                  name="level"
                  type="number"
                  min={1}
                  value={level}
                  onChange={(e) => setLevel(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="e.g., 120"
                  className="w-full rounded-lg border border-cod-blue/40 bg-cod-charcoal-light/70 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-cod-orange focus:outline-none focus:ring-2 focus:ring-cod-orange/60"
                  disabled={loading || saving}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-white/80" htmlFor="prestige">
                  Prestige
                </label>
                <input
                  id="prestige"
                  name="prestige"
                  type="number"
                  min={0}
                  max={10}
                  value={prestige}
                  onChange={(e) => setPrestige(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0-10"
                  className="w-full rounded-lg border border-cod-blue/40 bg-cod-charcoal-light/70 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-cod-orange focus:outline-none focus:ring-2 focus:ring-cod-orange/60"
                  disabled={loading || saving || isMaster}
                />
                <label className="inline-flex items-center gap-2 text-sm text-white/80">
                  <input
                    type="checkbox"
                    checked={isMaster}
                    onChange={(e) => setIsMaster(e.target.checked)}
                    disabled={loading || saving}
                    className="h-4 w-4 rounded border-cod-blue/50 bg-cod-charcoal-light/70 text-cod-orange focus:ring-cod-orange"
                  />
                  Master Prestige
                </label>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-cod-blue/40 bg-cod-charcoal-light/70 px-3 py-2">
              <PrestigeBadge prestige={prestigePreviewValue} isMaster={isMaster} size="sm" />
              <p className="text-xs text-white/70">Preview of how your prestige will display.</p>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-cod-blue/35 bg-cod-charcoal-dark/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60">
                Activision ID
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
              <input
                type="text"
                inputMode="text"
                placeholder="Name (min 3 chars)"
                value={activisionName}
                onChange={(e) => setActivisionName(e.target.value)}
                maxLength={30}
                className="rounded-lg border border-cod-blue/40 bg-cod-charcoal-light/70 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-cod-orange focus:outline-none focus:ring-2 focus:ring-cod-orange/60"
                disabled={loading || saving}
              />
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{7}"
                placeholder="7-digit tag"
                value={activisionTag}
                onChange={(e) => setActivisionTag(e.target.value.replace(/\D/g, "").slice(0, 7))}
                maxLength={7}
                className="rounded-lg border border-cod-blue/40 bg-cod-charcoal-light/70 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-cod-orange focus:outline-none focus:ring-2 focus:ring-cod-orange/60"
                disabled={loading || saving}
              />
            </div>
            <p className="text-xs text-white/60">Format: Name#1234567 (store as two fields).</p>
          </div>

          {error && <p className="text-sm font-semibold text-red-400">{error}</p>}
          {message && <p className="text-sm font-semibold text-cod-orange">{message}</p>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading || saving}
              className="rounded-lg border border-cod-orange/70 bg-cod-orange px-4 py-2.5 text-sm font-semibold text-cod-charcoal shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? "Saving..." : "Save progress"}
            </button>
            {loading && <span className="text-sm text-white/60">Loading your profile…</span>}
          </div>
        </form>
      </div>
    </main>
  );
}
