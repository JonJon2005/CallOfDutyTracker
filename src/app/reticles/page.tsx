"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/app/utils/supabase/client";

type Gamemode = "mp" | "zm" | "wz" | "eg";

type Optic = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  range_category: "short" | "medium" | "long" | null;
};

type ReticleTemplate = {
  id: string;
  name: string | null;
  slug: string | null;
  gamemode: Gamemode | null;
  flag: string | null;
  base_challenge: string | null;
  unlock_type: string | null;
  unlock_count: number | null;
  sort_order: number | null;
};

type OpticReticle = {
  id: string;
  optic_id: string;
  gamemode: Gamemode;
  unlock_order: number | null;
  challenge_override: string | null;
  unlock_type_override: string | null;
  unlock_count_override: number | null;
  reticle_templates: ReticleTemplate | null;
};

type ReticleProgress = {
  optic_reticle_id: string;
  status: boolean;
};

const GAMEMODES: { value: Gamemode; label: string }[] = [
  { value: "mp", label: "Multiplayer" },
  { value: "zm", label: "Zombies" },
  { value: "wz", label: "Warzone" },
  { value: "eg", label: "Endgame" },
];

export default function ReticlesPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [optics, setOptics] = useState<Optic[]>([]);
  const [reticles, setReticles] = useState<OpticReticle[]>([]);
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOpticId, setExpandedOpticId] = useState<string | null>(null);
  const [selectedGamemode, setSelectedGamemode] = useState<Gamemode>("mp");
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const uid = sessionData.session?.user?.id ?? null;
        setUserId(uid);
        setShowAuthPrompt(!uid);

        const [{ data: opticData, error: opticError }, { data: reticleData, error: reticleError }] =
          await Promise.all([
            supabase
              .from("optics")
              .select("id, name, slug, description, range_category")
              .order("name", { ascending: true }),
            supabase
              .from("optic_reticles")
              .select(
                `
                id,
                optic_id,
                gamemode,
                unlock_order,
                challenge_override,
                unlock_type_override,
                unlock_count_override,
                reticle_templates (
                  id,
                  name,
                  slug,
                  gamemode,
                  flag,
                  base_challenge,
                  unlock_type,
                  unlock_count,
                  sort_order
                )
              `,
              )
              .eq("gamemode", selectedGamemode)
              .order("unlock_order", { ascending: true })
              .order("created_at", { ascending: true }),
          ]);

        if (opticError) throw opticError;
        if (reticleError) throw reticleError;

        let progressMap: Record<string, boolean> = {};
        if (uid) {
          const { data: progData, error: progError } = await supabase
            .from("user_optic_reticle_progress")
            .select("optic_reticle_id, status")
            .eq("user_id", uid);
          if (progError) throw progError;
          (progData ?? []).forEach((row: ReticleProgress) => {
            progressMap[row.optic_reticle_id] = Boolean(row.status);
          });
        }

        setOptics(opticData ?? []);
        setReticles(reticleData ?? []);
        setProgress(progressMap);

        // Expand the first optic when switching modes for quick entry.
        const firstOptic = (reticleData ?? []).find(() => true)?.optic_id ?? null;
        setExpandedOpticId(firstOptic);
      } catch (err: any) {
        setError(err?.message || "Failed to load reticles.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [supabase, selectedGamemode]);

  const reticlesByOptic = useMemo(() => {
    const map: Record<string, OpticReticle[]> = {};
    reticles.forEach((r) => {
      if (!map[r.optic_id]) map[r.optic_id] = [];
      map[r.optic_id].push(r);
    });
    return map;
  }, [reticles]);

  const opticsWithReticles = useMemo(() => {
    const ids = new Set(reticles.map((r) => r.optic_id));
    return optics.filter((optic) => ids.has(optic.id));
  }, [optics, reticles]);

  const sortReticles = (list: OpticReticle[]) =>
    [...list].sort((a, b) => {
      const sa = a.reticle_templates?.sort_order ?? 9999;
      const sb = b.reticle_templates?.sort_order ?? 9999;
      if (sa !== sb) return sa - sb;
      const ua = a.unlock_order ?? 9999;
      const ub = b.unlock_order ?? 9999;
      if (ua !== ub) return ua - ub;
      const na = a.reticle_templates?.name ?? a.reticle_templates?.slug ?? a.id;
      const nb = b.reticle_templates?.name ?? b.reticle_templates?.slug ?? b.id;
      return na.localeCompare(nb);
    });

  const opticCompletion = useMemo(() => {
    const map: Record<string, { total: number; checked: number; complete: boolean }> = {};
    Object.entries(reticlesByOptic).forEach(([opticId, list]) => {
      const total = list.length;
      const checked = list.reduce((count, r) => count + (progress[r.id] ? 1 : 0), 0);
      map[opticId] = { total, checked, complete: total > 0 && checked === total };
    });
    return map;
  }, [reticlesByOptic, progress]);

  const opticsByRange = useMemo(() => {
    const sections: { key: "short" | "medium" | "long"; label: string; items: Optic[] }[] = [
      { key: "short", label: "Short Range", items: [] },
      { key: "medium", label: "Medium Range", items: [] },
      { key: "long", label: "Long Range", items: [] },
    ];
    const bucket = sections.reduce<Record<string, Optic[]>>((acc, section) => {
      acc[section.key] = section.items;
      return acc;
    }, {});
    opticsWithReticles.forEach((optic) => {
      const key = (optic.range_category as "short" | "medium" | "long" | null) ?? "medium";
      (bucket[key] ?? bucket.medium).push(optic);
    });
    // Sort optics alphabetically within each range bucket
    sections.forEach((section) => {
      section.items.sort((a, b) => b.slug.localeCompare(a.slug));
    });
    return sections;
  }, [opticsWithReticles]);

  const handleToggleReticle = async (opticReticleId: string, checked: boolean) => {
    if (!userId) {
      setError("Log in to track reticle progress.");
      return;
    }
    const target = reticles.find((r) => r.id === opticReticleId);
    if (!target) {
      setError("Reticle not found.");
      return;
    }
    const nextStatus = checked;
    const prevStatus = progress[opticReticleId];

    let toUpdateIds: string[] = [opticReticleId];
    if (checked) {
      const list = sortReticles(reticlesByOptic[target.optic_id] ?? []);
      const idx = list.findIndex((r) => r.id === opticReticleId);
      if (idx >= 0) {
        toUpdateIds = list.slice(0, idx + 1).map((r) => r.id);
      }
    }

    setSaving((prev) => {
      const next = { ...prev };
      toUpdateIds.forEach((id) => {
        next[id] = true;
      });
      return next;
    });
    setProgress((prev) => {
      const next = { ...prev };
      toUpdateIds.forEach((id) => {
        next[id] = nextStatus;
      });
      return next;
    });
    try {
      const payload = toUpdateIds.map((id) => ({
        user_id: userId,
        optic_reticle_id: id,
        status: nextStatus,
        unlocked_at: checked ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }));
      const { error: upsertError } = await supabase
        .from("user_optic_reticle_progress")
        .upsert(payload);
      if (upsertError) throw upsertError;

      fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          level: "info",
          message: "Reticle status updated",
          context: { optic_reticle_ids: toUpdateIds, status: nextStatus },
        }),
      }).catch(() => {
        /* ignore logging failures */
      });
    } catch (err: any) {
      setProgress((prev) => {
        const next = { ...prev };
        toUpdateIds.forEach((id) => {
          next[id] = prevStatus ?? false;
        });
        return next;
      });
      setError(err?.message || "Failed to update reticle status.");
    } finally {
      setSaving((prev) => {
        const next = { ...prev };
        toUpdateIds.forEach((id) => {
          next[id] = false;
        });
        return next;
      });
    }
  };

  const handleCheckAll = async (reticleList: OpticReticle[]) => {
    if (!userId) {
      setError("You must sign in to track reticle progress.");
      return;
    }
    await Promise.all(
      reticleList.map((reticle) => {
        const alreadyChecked = progress[reticle.id] ?? false;
        if (alreadyChecked) return Promise.resolve();
        return handleToggleReticle(reticle.id, true);
      }),
    );
  };

  const toggleOptic = (opticId: string) => {
    setExpandedOpticId((prev) => (prev === opticId ? null : opticId));
  };

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 md:px-6">
      {showAuthPrompt && (
        <div className="rounded-xl border border-cod-orange/60 bg-cod-orange/10 px-4 py-3 text-sm text-white shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-cod-orange">Sign in required</p>
              <p className="text-white/80">You must be signed in to track reticle unlocks.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href="/login"
                className="rounded-md border border-cod-orange/70 bg-cod-orange px-3 py-1.5 text-xs font-semibold text-cod-charcoal shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                Log in
              </a>
              <a
                href="/signup"
                className="rounded-md border border-cod-blue/60 bg-cod-blue/20 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                Sign up
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-cod-blue/50 bg-cod-charcoal-dark/90 p-5 text-white shadow-panel backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Reticles</p>
            <h1 className="text-2xl font-bold leading-tight">Reticle Tracker</h1>
            <p className="text-sm text-white/70">
              Pick a mode, select an optic, and check off reticles in order.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-cod-blue/40 bg-cod-charcoal-light/60 p-3 text-sm text-white/80">
          {loading ? (
            <p>Loading optics…</p>
          ) : error ? (
            <p className="text-red-300">{error}</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
                {GAMEMODES.map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => setSelectedGamemode(mode.value)}
                    className={`rounded-md border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                      selectedGamemode === mode.value
                        ? "border-cod-orange bg-cod-orange text-cod-charcoal shadow-sm"
                        : "border-cod-blue/40 bg-cod-charcoal-dark/70 text-white hover:border-cod-orange/60"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              <div className="rounded-lg border border-cod-blue/35 bg-cod-charcoal-dark/70 p-4 shadow-inner space-y-4">
                {opticsWithReticles.length === 0 ? (
                  <p className="text-xs text-white/60">No optics found for this mode yet.</p>
                ) : (
                  opticsByRange.map((section) => (
                    <div key={section.key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60">
                          {section.label}
                        </p>
                        <span className="text-[11px] text-white/50">
                          {section.items.length} optic{section.items.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      {section.items.length === 0 ? (
                        <p className="text-xs text-white/60">No optics in this range.</p>
                      ) : (
                        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {section.items.map((optic) => (
                            <li
                              key={optic.id}
                              className="rounded-md border border-cod-blue/20 bg-cod-charcoal-light/60"
                            >
                              <button
                                type="button"
                                onClick={() => toggleOptic(optic.id)}
                                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-cod-charcoal-light/80"
                              >
                                <div>
                                  <p className="font-medium text-white">{optic.name}</p>
                                  <p className="text-xs text-white/60">{optic.slug}</p>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-white/70">
                                  {opticCompletion[optic.id]?.complete ? (
                                    <span className="rounded bg-green-500/30 px-2 py-0.5 font-semibold text-green-200">
                                      Complete
                                    </span>
                                  ) : (
                                    <span className="rounded bg-cod-blue/30 px-2 py-0.5">
                                      {reticlesByOptic[optic.id]?.length ?? 0} reticles
                                    </span>
                                  )}
                                </div>
                              </button>
                              {expandedOpticId === optic.id && (
                                <div className="border-t border-cod-blue/20 bg-cod-charcoal-dark/70 px-3 py-2">
                                  {reticlesByOptic[optic.id]?.length ? (
                                    (() => {
                                      const reticleList = [...(reticlesByOptic[optic.id] ?? [])].sort(
                                        (a, b) => {
                                          const sa = a.reticle_templates?.sort_order ?? 9999;
                                          const sb = b.reticle_templates?.sort_order ?? 9999;
                                          if (sa !== sb) return sb - sa; // reverse: higher sort_order first
                                          const ua = a.unlock_order ?? 9999;
                                          const ub = b.unlock_order ?? 9999;
                                          if (ua !== ub) return ub - ua; // reverse unlock order as fallback
                                          const na =
                                            a.reticle_templates?.name ??
                                            a.reticle_templates?.slug ??
                                            a.id;
                                          const nb =
                                            b.reticle_templates?.name ??
                                            b.reticle_templates?.slug ??
                                            b.id;
                                          return nb.localeCompare(na);
                                        },
                                      );
                                      return (
                                        <div className="space-y-3">
                                          <div className="flex items-center justify-between gap-2">
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60">
                                              Reticles ({GAMEMODES.find((m) => m.value === selectedGamemode)?.label})
                                            </p>
                                            <button
                                              type="button"
                                              onClick={() => handleCheckAll(reticleList)}
                                              disabled={
                                                !userId ||
                                                reticleList.every((r) => progress[r.id]) ||
                                                reticleList.some((r) => saving[r.id])
                                              }
                                              className="rounded border border-cod-blue/40 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white transition hover:border-cod-orange/60 disabled:opacity-50"
                                            >
                                              Check all
                                            </button>
                                          </div>
                                          <ul className="space-y-1">
                                            {reticleList.map((reticle) => {
                                              const template = reticle.reticle_templates;
                                              const unlockCount =
                                                reticle.unlock_count_override ??
                                                template?.unlock_count;
                                              const unlockType =
                                                reticle.unlock_type_override ??
                                                template?.unlock_type;
                                              const checked = progress[reticle.id] ?? false;
                                              const isSaving = saving[reticle.id] ?? false;
                                              const challengeText =
                                                reticle.challenge_override ??
                                                template?.base_challenge ??
                                                (unlockCount && unlockType
                                                  ? `Requirement: ${unlockCount} × ${unlockType}`
                                                  : null);
                                              const displayOrder =
                                                reticle.reticle_templates?.sort_order ??
                                                reticle.unlock_order ??
                                                null;
                                              return (
                                                <li
                                                  key={reticle.id}
                                                  className="flex items-start gap-3 rounded border border-cod-blue/15 bg-cod-charcoal-light/50 px-3 py-2 text-sm"
                                                >
                                                  <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    disabled={isSaving || !userId}
                                                    onChange={(e) =>
                                                      handleToggleReticle(reticle.id, e.target.checked)
                                                    }
                                                    className="mt-1 h-4 w-4 rounded border-cod-blue/50 bg-cod-charcoal-light/70 text-cod-orange focus:ring-cod-orange"
                                                  />
                                                  <div className="flex-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                      <p className="text-sm font-semibold text-white">
                                                        {template?.name ?? template?.slug ?? "Reticle"}
                                                      </p>
                                                      <span className="rounded bg-cod-orange/20 px-2 py-0.5 text-[11px] uppercase tracking-wide text-cod-orange">
                                                        #{displayOrder ?? "?"}
                                                      </span>
                                                    </div>
                                                    <p className="text-xs text-white/70">
                                                      {challengeText ?? "Requirement not set."}
                                                    </p>
                                                  </div>
                                                </li>
                                              );
                                            })}
                                          </ul>
                                        </div>
                                      );
                                    })()
                                  ) : (
                                    <p className="text-xs text-white/60">No reticles linked yet.</p>
                                  )}
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
