"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/app/utils/supabase/client";

type WeaponClass = {
  id: string;
  slug: string;
  label: string;
  sort_order: number | null;
};

type Weapon = {
  id: string;
  class_id: string;
  display_name: string;
  slug: string;
  release_season: string | null;
};

type PrestigeTemplate = {
  id: string;
  slug: string;
  name: string;
  tier: string;
  unlock_requirement: string | null;
  is_global: boolean;
  sort_order: number | null;
};

type WeaponPrestigeCamo = {
  id: string;
  weapon_id: string;
  name_override: string | null;
  unlock_requirement_override: string | null;
  sort_order: number | null;
  prestige_camo_templates: PrestigeTemplate | null;
};

const TIER_LABELS: Record<string, string> = {
  prestige1: "Prestige 1",
  prestige2: "Prestige 2",
  master100: "Prestige Master Levels",
  master150: "Prestige Master Levels",
  master200: "Prestige Master Levels",
  legend250: "Prestige Legend",
};

export default function PrestigeCamosPage() {
  const supabase = createClient();
  const [classes, setClasses] = useState<WeaponClass[]>([]);
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [camos, setCamos] = useState<WeaponPrestigeCamo[]>([]);
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [expandedWeaponId, setExpandedWeaponId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const uid = sessionData.session?.user?.id ?? null;
        setUserId(uid);
        setShowAuthPrompt(!uid);

        const [{ data: classData, error: classError }, { data: weaponData, error: weaponError }] =
          await Promise.all([
            supabase
              .from("weapon_classes")
              .select("id, slug, label, sort_order")
              .order("sort_order", { ascending: true })
              .order("label", { ascending: true }),
            supabase
              .from("weapons")
              .select("id, class_id, display_name, slug, release_season")
              .order("display_name", { ascending: true }),
          ]);
        if (classError) throw classError;
        if (weaponError) throw weaponError;

        const { data: camoData, error: camoError } = await supabase
          .from("weapon_prestige_camos")
          .select(
            `
            id,
            weapon_id,
            name_override,
            unlock_requirement_override,
            sort_order,
            prestige_camo_templates!inner (
              id,
              slug,
              name,
              tier,
              unlock_requirement,
              is_global,
              sort_order
            )
          `,
          )
          .order("sort_order", { ascending: true });
        if (camoError) throw camoError;

        const normalizedCamos = (camoData ?? []).map((c) => ({
          ...c,
          prestige_camo_templates: Array.isArray(c.prestige_camo_templates)
            ? c.prestige_camo_templates[0] ?? null
            : c.prestige_camo_templates ?? null,
        }));

        setClasses(classData ?? []);
        setWeapons(weaponData ?? []);
        setCamos(normalizedCamos);

        let progressMap: Record<string, boolean> = {};
        if (uid) {
          const { data: progData, error: progError } = await supabase
            .from("user_weapon_prestige_progress")
            .select("weapon_prestige_camo_id, status")
            .eq("user_id", uid);
          if (progError) throw progError;
          (progData ?? []).forEach((row) => {
            progressMap[row.weapon_prestige_camo_id] = Boolean(row.status);
          });
        }
        setProgress(progressMap);
      } catch (err: any) {
        setError(err?.message || "Failed to load prestige camos.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [supabase]);

  useEffect(() => {
    // Reset selected class if it no longer exists, without triggering a refetch
    const classIds = new Set(classes.map((c) => c.id));
    if (selectedClassId && !classIds.has(selectedClassId)) {
      setSelectedClassId(null);
    }
  }, [classes, selectedClassId]);

  const weaponsByClass = useMemo(() => {
    const map: Record<string, Weapon[]> = {};
    weapons.forEach((weapon) => {
      if (!map[weapon.class_id]) map[weapon.class_id] = [];
      map[weapon.class_id].push(weapon);
    });
    return map;
  }, [weapons]);

  const camosByWeapon = useMemo(() => {
    const map: Record<string, WeaponPrestigeCamo[]> = {};
    camos.forEach((camo) => {
      if (!map[camo.weapon_id]) map[camo.weapon_id] = [];
      map[camo.weapon_id].push(camo);
    });
    return map;
  }, [camos]);

  const toggleWeapon = (weaponId: string) => {
    setExpandedWeaponId((prev) => (prev === weaponId ? null : weaponId));
  };

  const handleToggleCamo = async (camoId: string, checked: boolean) => {
    const camo = camos.find((c) => c.id === camoId);
    if (!camo) {
      setError("Camo not found.");
      return;
    }
    if (!userId) {
      setShowAuthPrompt(true);
      setError("Log in to track prestige camo progress.");
      return;
    }

    const nextStatus = checked;
    const prevStatus = progress[camoId];
    let toUpdateIds = [camoId];

    if (checked) {
      const tier = (camo.prestige_camo_templates?.tier || "").toLowerCase();
      const weaponCamos = sortCamoList(camosByWeapon[camo.weapon_id] ?? []);
      const findIndex = weaponCamos.findIndex((c) => c.id === camoId);
      if (tier.includes("legend")) {
        // Legend camo requires the entire chain.
        toUpdateIds = [...new Set(weaponCamos.map((c) => c.id))];
      } else if (findIndex >= 0) {
        // Any tier Prestige 2 and above should auto-complete prerequisites.
        toUpdateIds = [...new Set(weaponCamos.slice(0, findIndex + 1).map((c) => c.id))];
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
        weapon_prestige_camo_id: id,
        status: nextStatus,
        unlocked_at: checked ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }));

      const { error: upsertError } = await supabase
        .from("user_weapon_prestige_progress")
        .upsert(payload);
      if (upsertError) throw upsertError;

      fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          level: "info",
          message: "Prestige camo status updated",
          context: { weapon_prestige_camo_ids: toUpdateIds, status: nextStatus },
        }),
      }).catch(() => {
        /* ignore logging failures */
      });
    } catch (err: any) {
      setProgress((prev) => {
        const next = { ...prev };
        toUpdateIds.forEach((id) => {
          next[id] = id === camoId ? prevStatus ?? false : prev[id] ?? false;
        });
        return next;
      });
      setError(err?.message || "Failed to update prestige camo status.");
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

  const sortCamoList = (list: WeaponPrestigeCamo[]) =>
    [...list].sort((a, b) => {
      const sa = a.sort_order ?? a.prestige_camo_templates?.sort_order ?? 9999;
      const sb = b.sort_order ?? b.prestige_camo_templates?.sort_order ?? 9999;
      if (sa !== sb) return sa - sb;
      const na = a.name_override ?? a.prestige_camo_templates?.name ?? a.prestige_camo_templates?.slug ?? a.id;
      const nb = b.name_override ?? b.prestige_camo_templates?.name ?? b.prestige_camo_templates?.slug ?? b.id;
      return na.localeCompare(nb);
    });

  const renderClassSection = (classId: string) => {
    const cls = classes.find((c) => c.id === classId);
    const weaponsForClass = weaponsByClass[classId] ?? [];

    const seasonOrderValue = (season: string | null) => {
      if (!season) return 9999;
      const lower = season.toLowerCase().trim();
      if (lower === "launch") return 0;
      const match = lower.match(/season\s*(\d+)/);
      if (match) return parseInt(match[1], 10) || 9999;
      return 9999;
    };

    const sortedWeapons = [...weaponsForClass].sort((a, b) => {
      const sa = seasonOrderValue(a.release_season);
      const sb = seasonOrderValue(b.release_season);
      if (sa !== sb) return sa - sb;
      const la = (a.release_season ?? "").localeCompare(b.release_season ?? "");
      if (la !== 0) return la;
      return a.display_name.localeCompare(b.display_name);
    });

    const seasonGroups: { season: string | null; items: Weapon[] }[] = [];
    sortedWeapons.forEach((weapon) => {
      const key = weapon.release_season ?? "Unreleased";
      const existing = seasonGroups.find((g) => g.season === key);
      if (existing) existing.items.push(weapon);
      else seasonGroups.push({ season: key, items: [weapon] });
    });

    return (
      <div key={classId} className="rounded-lg border border-soft bg-cod-charcoal-dark/70 p-3 shadow-inner sm:p-4">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/60">{cls?.slug ?? "class"}</p>
            <h3 className="text-lg font-semibold text-white">{cls?.label ?? "Weapons"}</h3>
          </div>
          <span className="rounded-md bg-cod-blue/20 px-2 py-1 text-xs text-white/70">
            {weaponsForClass.length} weapon{weaponsForClass.length === 1 ? "" : "s"}
          </span>
        </div>

        {weaponsForClass.length === 0 ? (
          <p className="mt-2 text-xs text-white/60 sm:mt-3">No weapons added yet.</p>
        ) : (
          <div className="mt-2 space-y-3 sm:mt-3 sm:space-y-4">
            {seasonGroups.map((group, idx) => (
              <div
                key={group.season ?? "unreleased"}
                className={idx > 0 ? "border-t border-white/5 pt-3 sm:pt-4" : ""}
              >
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-white/60">
                  {group.season ?? "Unreleased"}
                </p>
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(300px,1fr))] sm:gap-3">
                  {group.items.map((weapon) => (
                    <li key={weapon.id} className="rounded-md border border-soft bg-cod-charcoal-light/60">
                      <button
                        type="button"
                        onClick={() => toggleWeapon(weapon.id)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-cod-charcoal-light/80 sm:px-4 sm:py-3"
                      >
                        <div>
                          <p className="font-medium text-white">{weapon.display_name}</p>
                          <p className="text-xs text-white/60">{weapon.slug}</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white/70 sm:gap-3">
                          {(() => {
                            const weaponCamos = camosByWeapon[weapon.id] ?? [];
                            const total = weaponCamos.length;
                            const unlocked = weaponCamos.reduce(
                              (count, camo) => count + (progress[camo.id] ? 1 : 0),
                              0,
                            );
                            return (
                              <span className="rounded bg-cod-blue/40 px-2 py-0.5 font-semibold text-white/90">
                                {unlocked} / {total} unlocked
                              </span>
                            );
                          })()}
                        </div>
                      </button>
                      {expandedWeaponId === weapon.id && (
                        <div className="panel-open border-t border-soft bg-cod-charcoal-dark/70 px-3 py-2 sm:px-4 sm:py-3">
                          {camosByWeapon[weapon.id]?.length ? (
                            (() => {
                              const camoList = sortCamoList(camosByWeapon[weapon.id] ?? []);
                              const grouped: Record<string, WeaponPrestigeCamo[]> = {};
                              camoList.forEach((camo) => {
                                const rawTier = (camo.prestige_camo_templates?.tier || "other").toLowerCase();
                                const tier =
                                  rawTier === "master100" || rawTier === "master150" || rawTier === "master200"
                                    ? "master-all"
                                    : rawTier;
                                if (!grouped[tier]) grouped[tier] = [];
                                grouped[tier].push(camo);
                              });
                              const sections = Object.entries(grouped)
                                .map(([tier, items]) => {
                                  const sortValue =
                                    items[0]?.prestige_camo_templates?.sort_order ??
                                    items[0]?.sort_order ??
                                    9999;
                                  const label =
                                    tier === "master-all"
                                      ? "Prestige Master Levels"
                                      : TIER_LABELS[tier] ?? tier.replace(/-/g, " ");
                                  return { key: tier, label, items, sortValue };
                                })
                                .sort((a, b) => a.sortValue - b.sortValue);

                              return (
                                <div className="space-y-2 sm:space-y-3">
                                  {sections.map((section) => (
                                    <div key={section.key} className="space-y-1.5 sm:space-y-2">
                                      <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60">
                                          {section.label}
                                        </p>
                                      </div>
                                      <ul className="space-y-1 sm:space-y-2">
                                        {section.items.map((camo) => {
                                          const template = camo.prestige_camo_templates;
                                          const checked = progress[camo.id] ?? false;
                                          const isSaving = saving[camo.id] ?? false;
                                          const challengeText =
                                            camo.unlock_requirement_override ??
                                            template?.unlock_requirement ??
                                            "Requirement not set.";
                                          return (
                                                <li
                                                  key={camo.id}
                                                  className="flex items-start gap-2 rounded border border-soft bg-cod-charcoal-light/50 px-3 py-2 text-sm sm:gap-3 sm:px-4 sm:py-3"
                                                >
                                              <input
                                                type="checkbox"
                                                checked={checked}
                                                disabled={isSaving || !userId}
                                                onChange={(e) => handleToggleCamo(camo.id, e.target.checked)}
                                                className="mt-1 h-4 w-4 rounded border-soft bg-cod-charcoal-light/70 text-cod-orange focus:ring-cod-orange"
                                              />
                                              <div className="flex-1">
                                                <div className="flex items-center justify-between gap-2">
                                                  <p className="text-sm font-semibold text-white">
                                                    {camo.name_override ??
                                                      template?.name ??
                                                      template?.slug ??
                                                      "Camo"}
                                                  </p>
                                                </div>
                                                <p className="text-xs text-white/70">{challengeText}</p>
                                              </div>
                                            </li>
                                          );
                                        })}
                                      </ul>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()
                          ) : (
                            <p className="text-xs text-white/60">No prestige camos linked yet.</p>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="page-shell max-w-7xl flex w-full flex-col gap-3 py-6 sm:gap-4 sm:py-8">
      <div className="glass-panel glass-soft border border-soft p-4 text-white shadow-panel backdrop-blur sm:p-5">
        <div className="mb-2 flex items-center justify-between sm:mb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Prestige</p>
            <h1 className="text-2xl font-bold leading-tight">Prestige Camo Tracker</h1>
            <p className="text-sm text-white/70">Select a class, pick a weapon, and check off prestige camos.</p>
          </div>
        </div>

        <div className="glass-soft space-y-2 rounded-lg border border-soft p-3 text-sm text-white/80 sm:space-y-3 sm:p-4">
          {showAuthPrompt && (
            <div className="glass-soft rounded-xl border border-cod-orange/60 bg-cod-orange/10 px-4 py-3 text-sm text-white shadow-lg">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-cod-orange">Sign in required</p>
                  <p className="text-white/80">You must be signed in to track prestige camo progress.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="/login"
                    className="btn btn-secondary text-xs"
                  >
                    Log in
                  </a>
                  <a
                    href="/signup"
                    className="btn btn-primary text-xs"
                  >
                    Sign up
                  </a>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <p>Loading weapon classes…</p>
          ) : error ? (
            <p className="text-red-300">{error}</p>
          ) : classes.length === 0 ? (
            <p>No weapon classes found yet. Add classes in the database to get started.</p>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
                {classes.map((cls) => {
                  const isActive = selectedClassId === cls.id;
                  return (
                    <button
                      key={cls.id}
                      onClick={() => setSelectedClassId(isActive ? null : cls.id)}
                      className={`rounded-md border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                        isActive
                          ? "border-cod-orange bg-cod-orange text-cod-charcoal shadow-sm"
                          : "border-soft bg-white/5 text-white hover:border-cod-orange/60"
                      }`}
                    >
                      {cls.label}
                    </button>
                  );
                })}
              </div>

              <div className="rounded-lg border border-soft bg-cod-charcoal-dark/70 p-3 shadow-inner space-y-3 sm:space-y-4 sm:p-4">
                {selectedClassId
                  ? renderClassSection(selectedClassId)
                  : classes.map((cls) => renderClassSection(cls.id))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
