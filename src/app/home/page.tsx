"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { PrestigeBadge } from "@/app/components/PrestigeBadge";

const highlights = [
  {
    label: "Manual tracking",
    title: "You control the data",
    copy: "Enter level, prestige, and camo states yourself—no COD API or scraping.",
  },
  {
    label: "Milestones",
    title: "Automatic achievements",
    copy: "When you update progress, the app stamps milestones with timestamps.",
  },
  {
    label: "Patch-agnostic",
    title: "Ready for new titles",
    copy: "Weapon classes, camos, and challenges stay data-driven for future games.",
  },
];

export default function Home() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accountLevel, setAccountLevel] = useState<number | null>(null);
  const [prestige, setPrestige] = useState<number | null>(null);
  const [isMaster, setIsMaster] = useState(false);
  const [activisionId, setActivisionId] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;
        if (!user) {
          setAccountLevel(null);
          setPrestige(null);
          setIsMaster(false);
          setActivisionId(null);
          setLoading(false);
          return;
        }

        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("account_level, prestige, activision_id")
          .eq("id", user.id)
          .single();

        if (profileError) throw profileError;

        const levelVal = (data?.account_level as number | null) ?? null;
        const prestigeVal = (data?.prestige as number | null) ?? null;
        const isMasterPrestige = prestigeVal !== null && prestigeVal >= 11;

        setAccountLevel(levelVal);
        setPrestige(prestigeVal);
        setIsMaster(isMasterPrestige);
        setActivisionId((data?.activision_id as string | null) ?? null);
      } catch (err: any) {
        setError(err?.message || "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [supabase]);

  const prestigeValue = isMaster ? 11 : prestige;
  const levelLabel = accountLevel ?? "—";

  return (
    <main className="page-shell flex flex-col gap-8 py-10 md:gap-12">
      <section className="glass-panel glass-contrast overflow-hidden shadow-panel">
        <div className="grid gap-8 px-6 py-7 md:grid-cols-[1.2fr_0.8fr] md:px-8 md:py-9">
          <div className="space-y-4">
            <div className="chip chip-amber">COD CAMO TRACKER</div>
            <h1 className="text-3xl font-bold leading-tight text-white md:text-4xl">
              Track your camo grind with manual, trusted inputs.
            </h1>
            <p className="max-w-3xl text-base text-white/85 md:text-lg">
              Log account level, prestige, and camo unlocks in one place. Milestones are generated
              from your updates—never from Activision or COD servers.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <a
                className="btn btn-primary"
                href="/accounts"
              >
                Manage account
              </a>
              <a
                className="btn btn-secondary"
                href="#"
              >
                View milestones
              </a>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="chip chip-ghost">Manual entry</span>
              <span className="chip chip-ghost">No official API</span>
              <span className="chip chip-ghost">Patch-agnostic</span>
            </div>
          </div>
          <div className="glass-panel glass-soft border border-cod-blue/40 p-4 shadow-inner">
            <div className="flex justify-between text-xs font-semibold uppercase text-white/70">
              <span>Progress snapshot</span>
              <span>Manual</span>
            </div>
            <div className="mt-3 space-y-3">
              {loading ? (
                <p className="text-sm text-white/70">Loading profile…</p>
              ) : error ? (
                <p className="text-sm text-red-400">{error}</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-cod-blue/40 bg-cod-blue/15 px-3 py-2">
                    <div>
                      <p className="text-xs text-white/70">Account level</p>
                      <p className={`text-lg font-semibold ${isMaster ? "text-cod-orange" : "text-white"}`}>
                        {levelLabel}
                      </p>
                    </div>
                    <PrestigeBadge prestige={prestigeValue} isMaster={isMaster} size="sm" />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-cod-orange/40 bg-cod-orange/10 px-3 py-2">
                    <div>
                      <p className="text-xs text-white/70">Activision ID</p>
                      <p className="text-sm font-semibold text-white">
                        {activisionId ?? "Not set"}
                      </p>
                    </div>
                    <span className="rounded-md bg-cod-orange px-2 py-1 text-xs font-semibold text-cod-charcoal">
                      Profile
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-cod-bronze/40 bg-cod-bronze/15 px-3 py-2">
                    <div>
                      <p className="text-xs text-white/70">Recent milestone</p>
                      <p className="text-sm font-semibold text-white">—</p>
                    </div>
                    <span className="text-xs text-white/70">—</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {highlights.map((item) => (
          <article
            key={item.title}
            className="glass-panel glass-soft rounded-xl border border-cod-blue/35 p-5 text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            <span className="chip">{item.label}</span>
            <h3 className="mt-3 text-lg font-semibold leading-snug">{item.title}</h3>
            <p className="mt-2 text-sm text-white/80">{item.copy}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
