"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/utils/supabase/client";

export default function AccountsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [level, setLevel] = useState<number | "">("");
  const [prestige, setPrestige] = useState<number | "">("");
  const [isMaster, setIsMaster] = useState(false);
  const [activisionName, setActivisionName] = useState("");
  const [activisionTag, setActivisionTag] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
        .select("account_level, prestige, activision_id")
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
      const { error: upsertError } = await supabase.from("profiles").upsert({
        id: userId,
        account_level: level === "" ? null : level,
        prestige: prestigeValue,
        activision_id: activisionId,
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
          context: { account_level: level, prestige: prestigeValue, isMaster, activision_id: activisionId },
        }),
      });

      setMessage("Saved account progress.");
    } catch (err: any) {
      setError(err?.message || "Failed to save account progress.");
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
            <p className="text-sm text-white/70">Enter your current level and prestige.</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSave}>
          <div>
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
              className="mt-2 w-full rounded-lg border border-cod-blue/40 bg-cod-charcoal-light/70 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-cod-orange focus:outline-none focus:ring-2 focus:ring-cod-orange/60"
              disabled={loading || saving}
            />
          </div>
          <div className="space-y-2">
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
              className="mt-1 w-full rounded-lg border border-cod-blue/40 bg-cod-charcoal-light/70 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-cod-orange focus:outline-none focus:ring-2 focus:ring-cod-orange/60"
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

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/80">Activision ID</label>
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
