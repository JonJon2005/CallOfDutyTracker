"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/utils/supabase/client";
import { PrestigeBadge } from "@/app/components/PrestigeBadge";

export default function AccountsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [userNumber, setUserNumber] = useState<number | null>(null);
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
  const getLevelBounds = (master: boolean) => ({ min: master ? 56 : 1, max: master ? 1000 : 55 });
  const levelBounds = getLevelBounds(isMaster);
  const formatOrdinal = (value: number) => {
    const mod100 = value % 100;
    if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
    const mod10 = value % 10;
    if (mod10 === 1) return `${value}st`;
    if (mod10 === 2) return `${value}nd`;
    if (mod10 === 3) return `${value}rd`;
    return `${value}th`;
  };

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
      setEmail(user.email ?? "");

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("account_level, prestige, activision_id, username, created_at, user_number")
        .eq("id", user.id)
        .single();

      if (!profileError && data) {
        const prestigeVal = (data.prestige as number | null) ?? 0;
        const prestigeIsMaster = prestigeVal >= 11;
        setPrestige(prestigeIsMaster ? 10 : prestigeVal);
        setIsMaster(prestigeIsMaster);

        const { min, max } = getLevelBounds(prestigeIsMaster);
        const rawLevel = data.account_level as number | null;
        if (rawLevel === null || rawLevel === undefined) {
          setLevel("");
        } else {
          const clampedLevel = Math.min(Math.max(rawLevel, min), max);
          setLevel(clampedLevel);
        }

        const activisionId = (data.activision_id as string | null) ?? "";
        const [namePart, tagPart] = activisionId.split("#");
        if (namePart) setActivisionName(namePart);
        if (tagPart && /^\d{7}$/.test(tagPart)) setActivisionTag(tagPart);

        setUsername((data.username as string | null) ?? "");
        setUserNumber(typeof data.user_number === "number" ? data.user_number : null);
        const createdDate = data.created_at ? new Date(data.created_at) : null;
        setCreatedAt(
          createdDate && !Number.isNaN(createdDate.getTime())
            ? createdDate.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })
            : null,
        );
      }
      setLoading(false);
    };

    load();
  }, [supabase]);

  const handleMasterChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextIsMaster = event.target.checked;
    setIsMaster(nextIsMaster);
    setLevel((prev) => {
      if (prev === "") return "";
      const { min, max } = getLevelBounds(nextIsMaster);
      return Math.min(Math.max(prev, min), max);
    });
  };

  const handleLevelChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    if (value === "") {
      setLevel("");
      return;
    }
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) return;
    const { min, max } = getLevelBounds(isMaster);
    const clampedValue = Math.min(Math.max(numericValue, min), max);
    setLevel(clampedValue);
  };

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

    if (level !== "") {
      const { min, max } = getLevelBounds(isMaster);
      if (level < min || level > max) {
        setError(
          `Account level must be between ${min} and ${max}${isMaster ? " for Master Prestige" : ""}.`
        );
        return;
      }
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
    <main className="page-shell flex flex-col gap-6 py-10">
      <div className="glass-panel glass-soft border border-white/10 p-6 text-white shadow-panel backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Accounts</p>
            <h1 className="text-2xl font-bold leading-tight">Update Account Progress</h1>
            <p className="text-sm text-white/70">
              Manage your account stats: set level, prestige, and Activision ID. Email is shown
              read-only for reference.
            </p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSave}>
          <div className="glass-soft space-y-3 rounded-lg border border-white/10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60">
                  Basic Information
                </p>
                <p className="text-sm text-white/70">
                  Set your display username; your email is shown for reference and cannot be edited
                  here.
                </p>
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
                  className="w-full rounded-lg border border-cod-orange/40 bg-cod-charcoal-light/70 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-cod-orange focus:outline-none focus:ring-2 focus:ring-cod-orange/60"
                  disabled={loading || saving}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-white/80">Email</label>
                <input
                  type="text"
                  value={email}
                  placeholder="Email shown for reference"
                  disabled
                  className="w-full rounded-lg border border-cod-orange/30 bg-cod-charcoal-light/50 px-3 py-2 text-sm text-white/60"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <p className="text-sm font-semibold text-white/70">Member Since</p>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="text-lg font-semibold text-white">{createdAt ?? "Not available"}</p>
                  {userNumber !== null && (
                    <p className="text-sm font-semibold text-white/80">
                      {formatOrdinal(userNumber)} member
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="glass-soft space-y-4 rounded-lg border border-white/10 p-4">
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
                  min={levelBounds.min}
                  max={levelBounds.max}
                  value={level}
                  onChange={handleLevelChange}
                  placeholder={isMaster ? "56-1000 (Master Prestige)" : "1-55"}
                  className="w-full rounded-lg border border-cod-orange/40 bg-cod-charcoal-light/70 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-cod-orange focus:outline-none focus:ring-2 focus:ring-cod-orange/60"
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
                  className="w-full rounded-lg border border-cod-orange/40 bg-cod-charcoal-light/70 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-cod-orange focus:outline-none focus:ring-2 focus:ring-cod-orange/60"
                  disabled={loading || saving || isMaster}
                />
                <label className="inline-flex items-center gap-2 text-sm text-white/80">
                  <input
                    type="checkbox"
                    checked={isMaster}
                    onChange={handleMasterChange}
                    disabled={loading || saving}
                    className="h-4 w-4 rounded border-cod-orange/60 bg-cod-charcoal-light/70 text-cod-orange focus:ring-cod-orange"
                  />
                  Master Prestige
                </label>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-cod-orange/35 bg-cod-charcoal-light/70 px-3 py-2">
              <PrestigeBadge prestige={prestigePreviewValue} isMaster={isMaster} size="sm" />
              <p className="text-xs text-white/70">Preview of how your prestige will display.</p>
            </div>
          </div>

          <div className="glass-soft space-y-2 rounded-lg border border-white/10 p-4">
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
                className="rounded-lg border border-cod-orange/40 bg-cod-charcoal-light/70 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-cod-orange focus:outline-none focus:ring-2 focus:ring-cod-orange/60"
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
                className="rounded-lg border border-cod-orange/40 bg-cod-charcoal-light/70 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-cod-orange focus:outline-none focus:ring-2 focus:ring-cod-orange/60"
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
