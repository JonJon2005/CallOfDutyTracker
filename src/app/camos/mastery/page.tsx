"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/app/utils/supabase/client";

type Gamemode = "mp" | "zm" | "wz" | "eg";

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

type WeaponCamoProgress = {
  weapon_camo_id: string;
  status: boolean;
};

type WeaponCamo = {
  id: string;
  weapon_id: string;
  challenge: string | null;
  unlock_count: number | null;
  unlock_type: string | null;
  camo_templates?: {
    id: string;
    name: string;
    slug: string;
    camo_kind: string | null;
    sort_order: number | null;
    unlock_count: number | null;
    unlock_type: string | null;
    gamemode: Gamemode | null;
    challenge?: string | null;
  } | null;
};

const masteryKeywords: Record<"gold" | "bloodstone" | "doomsteel", string[]> = {
  gold: ["gold", "golden", "dragon", "shattered"],
  bloodstone: ["bloodstone", "arclight"],
  doomsteel: ["doomsteel", "tempest"],
};

export default function CamosPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [classes, setClasses] = useState<WeaponClass[]>([]);
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [camos, setCamos] = useState<WeaponCamo[]>([]);
  const [progress, setProgress] = useState<Record<string, WeaponCamoProgress["status"]>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedWeaponId, setExpandedWeaponId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [selectedGamemode, setSelectedGamemode] = useState<Gamemode>("mp");
  const [camoMap, setCamoMap] = useState<Record<string, WeaponCamo>>({});

  const MASTERY_BADGES: Record<
    Gamemode | "default",
    Record<
      "gold" | "bloodstone" | "doomsteel",
      { label: string; color: string }
    >
  > = {
    mp: {
      gold: { label: "Shattered Gold", color: "#D3AF42" },
      bloodstone: { label: "Arclight", color: "#C2C2C2" },
      doomsteel: { label: "Tempest", color: "#3271B5" },
    },
    zm: {
      gold: { label: "Golden Dragon", color: "#C7922F" },
      bloodstone: { label: "Bloodstone", color: "#C20047" },
      doomsteel: { label: "Doomsteel", color: "#32CB9D" },
    },
    wz: {
      gold: { label: "Shattered Gold", color: "#D3AF42" },
      bloodstone: { label: "Arclight", color: "#C2C2C2" },
      doomsteel: { label: "Tempest", color: "#3271B5" },
    },
    eg: {
      gold: { label: "Shattered Gold", color: "#D3AF42" },
      bloodstone: { label: "Arclight", color: "#C2C2C2" },
      doomsteel: { label: "Tempest", color: "#3271B5" },
    },
    default: {
      gold: { label: "Gold", color: "#D3AF42" },
      bloodstone: { label: "Bloodstone", color: "#C20047" },
      doomsteel: { label: "Doomsteel", color: "#3271B5" },
    },
  };

  const GAMEMODES: { value: Gamemode; label: string }[] = [
    { value: "mp", label: "Multiplayer" },
    { value: "zm", label: "Zombies" },
    { value: "wz", label: "Warzone" },
    { value: "eg", label: "Endgame" },
  ];

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const uid = sessionData.session?.user?.id ?? null;
        setUserId(uid);
        setShowAuthPrompt(!uid);

        const { data: classData, error: classError } = await supabase
          .from("weapon_classes")
          .select("id, slug, label, sort_order")
          .order("sort_order", { ascending: true })
          .order("label", { ascending: true });
        if (classError) throw classError;

        const { data: weaponData, error: weaponError } = await supabase
          .from("weapons")
          .select("id, class_id, display_name, slug, release_season")
          .order("display_name", { ascending: true });
        if (weaponError) throw weaponError;

        const { data: camoData, error: camoError } = await supabase
          .from("weapon_camos")
          .select(
            `
            id,
            weapon_id,
            challenge,
            unlock_count,
            unlock_type,
            camo_templates!inner (
              id,
              name,
              slug,
              camo_kind,
              sort_order,
              unlock_count,
              unlock_type,
              gamemode
            )
          `,
          )
          .eq("camo_templates.gamemode", selectedGamemode)
          .order("created_at", { ascending: true });
        if (camoError) throw camoError;

        let progressMap: Record<string, WeaponCamoProgress["status"]> = {};
        if (uid) {
          const { data: progData, error: progError } = await supabase
            .from("user_weapon_camo_progress")
            .select("weapon_camo_id, status")
            .eq("user_id", uid);
          if (progError) throw progError;
          (progData ?? []).forEach((row) => {
            progressMap[row.weapon_camo_id] = Boolean(row.status);
          });
        }

        setClasses(classData ?? []);
        setWeapons(weaponData ?? []);
        const normalizedCamos = (camoData ?? []).map((c) => ({
          ...c,
          camo_templates: Array.isArray(c.camo_templates)
            ? c.camo_templates[0] ?? null
            : c.camo_templates ?? null,
        }));
        setCamos(normalizedCamos);
        const map: Record<string, WeaponCamo> = {};
        normalizedCamos.forEach((c) => {
          map[c.id] = c;
        });
        setCamoMap(map);
        setProgress(progressMap);
        const classIds = new Set((classData ?? []).map((c) => c.id));
        if (selectedClassId && !classIds.has(selectedClassId)) {
          setSelectedClassId(null);
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load weapons.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [supabase, selectedGamemode]);

  useEffect(() => {
    const ids = new Set(classes.map((c) => c.id));
    if (selectedClassId && !ids.has(selectedClassId)) {
      setSelectedClassId(null);
    }
  }, [classes, selectedClassId]);

  const weaponsByClass = useMemo(() => {
    const map: Record<string, Weapon[]> = {};
    weapons.forEach((weapon) => {
      if (!map[weapon.class_id]) {
        map[weapon.class_id] = [];
      }
      map[weapon.class_id].push(weapon);
    });
    return map;
  }, [weapons]);

  const camosByWeapon = useMemo(() => {
    const map: Record<string, WeaponCamo[]> = {};
    camos.forEach((camo) => {
      if (!map[camo.weapon_id]) {
        map[camo.weapon_id] = [];
      }
      map[camo.weapon_id].push(camo);
    });
    return map;
  }, [camos]);

  const getMasteryTier = (camo: WeaponCamo): "gold" | "bloodstone" | "doomsteel" | null => {
    const kind = (camo.camo_templates?.camo_kind || "").toLowerCase();
    if (kind !== "mastery") return null;
    const text = `${camo.camo_templates?.slug || ""} ${camo.camo_templates?.name || ""}`.toLowerCase();
    if (masteryKeywords.doomsteel.some((k) => text.includes(k))) return "doomsteel";
    if (masteryKeywords.bloodstone.some((k) => text.includes(k))) return "bloodstone";
    if (masteryKeywords.gold.some((k) => text.includes(k))) return "gold";
    return null;
  };

  const masteryStatusByWeapon = useMemo(() => {
    const priority = ["doomsteel", "bloodstone", "gold"];
    const result: Record<string, string | null> = {};
    Object.entries(camosByWeapon).forEach(([weaponId, list]) => {
      let best: string | null = null;
      list.forEach((camo) => {
        const kind = (camo.camo_templates?.camo_kind || "").toLowerCase();
        if (kind !== "mastery") return;
        if (!progress[camo.id]) return;
        const key = getMasteryTier(camo);
        if (!key) return;
        if (best === null || priority.indexOf(key) < priority.indexOf(best)) {
          best = key;
        }
      });
      result[weaponId] = best;
    });
    return result;
  }, [camosByWeapon, progress]);

  const masteryProgress = useMemo(() => {
    const totalWeapons = weapons.length || 1;
    const tierOrder: ("gold" | "bloodstone" | "doomsteel")[] = ["gold", "bloodstone", "doomsteel"];
    const counts = {
      gold: 0,
      bloodstone: 0,
      doomsteel: 0,
      totalWeapons,
    };
    weapons.forEach((weapon) => {
      const tier = masteryStatusByWeapon[weapon.id] as "gold" | "bloodstone" | "doomsteel" | null;
      if (!tier) return;
      const idx = tierOrder.indexOf(tier);
      if (idx >= 0) {
        tierOrder.forEach((t, i) => {
          if (i <= idx) counts[t] += 1;
        });
      }
    });
    return counts;
  }, [weapons, masteryStatusByWeapon]);

  const sortCamoList = (list: WeaponCamo[]) =>
    [...list].sort((a, b) => {
      const sa = a.camo_templates?.sort_order ?? 9999;
      const sb = b.camo_templates?.sort_order ?? 9999;
      if (sa !== sb) return sa - sb;
      const na = a.camo_templates?.name ?? a.camo_templates?.slug ?? a.id;
      const nb = b.camo_templates?.name ?? b.camo_templates?.slug ?? b.id;
      return na.localeCompare(nb);
    });

  const sortBaseCamos = (list: WeaponCamo[]) =>
    [...list].sort((a, b) => {
      const aCount = a.camo_templates?.unlock_count ?? a.unlock_count ?? 0;
      const bCount = b.camo_templates?.unlock_count ?? b.unlock_count ?? 0;
      if (aCount !== bCount) return aCount - bCount;
      const sa = a.camo_templates?.sort_order ?? 9999;
      const sb = b.camo_templates?.sort_order ?? 9999;
      if (sa !== sb) return sa - sb;
      const na = a.camo_templates?.name ?? a.camo_templates?.slug ?? a.id;
      const nb = b.camo_templates?.name ?? b.camo_templates?.slug ?? b.id;
      return na.localeCompare(nb);
    });

  const handleToggleCamo = async (weaponCamoId: string, checked: boolean) => {
    const camo = camoMap[weaponCamoId];
    if (!camo) {
      setError("Camo not found.");
      return;
    }
    if (!userId) {
      setError("Log in to track camo progress.");
      return;
    }
    const nextStatus: WeaponCamoProgress["status"] = checked;
    const prevStatus = progress[weaponCamoId];

    let toUpdateIds: string[] = [weaponCamoId];
    if (checked) {
      const weaponCamos = sortCamoList(camosByWeapon[camo.weapon_id] ?? []);
      const kind = (camo.camo_templates?.camo_kind || "").toLowerCase();
      if (kind === "base") {
        const baseList = sortBaseCamos(
          weaponCamos.filter((c) => (c.camo_templates?.camo_kind || "").toLowerCase() === "base"),
        );
        const idx = baseList.findIndex((c) => c.id === weaponCamoId);
        if (idx >= 0) {
          toUpdateIds = baseList.slice(0, idx + 1).map((c) => c.id);
        }
      } else if (kind === "special") {
        // Checking a special camo requires all base camos to be complete
        const baseList = sortBaseCamos(
          weaponCamos.filter((c) => (c.camo_templates?.camo_kind || "").toLowerCase() === "base"),
        );
        const baseIds = baseList.map((c) => c.id);
        toUpdateIds = [...new Set([...baseIds, weaponCamoId])];
      } else if (kind === "mastery") {
        const baseList = sortBaseCamos(
          weaponCamos.filter((c) => (c.camo_templates?.camo_kind || "").toLowerCase() === "base"),
        );
        const specialList = weaponCamos.filter(
          (c) => (c.camo_templates?.camo_kind || "").toLowerCase() === "special",
        );
        const tier = getMasteryTier(camo);
        let lowerMastery: string[] = [];
        if (tier) {
          const tierOrder: ("gold" | "bloodstone" | "doomsteel")[] = ["gold", "bloodstone", "doomsteel"];
          const tierIndex = tierOrder.indexOf(tier);
          lowerMastery = weaponCamos
            .filter((c) => (c.camo_templates?.camo_kind || "").toLowerCase() === "mastery")
            .filter((c) => {
              const t = getMasteryTier(c);
              return t !== null && tierOrder.indexOf(t) <= tierIndex;
            })
            .map((c) => c.id);
        }
        toUpdateIds = [
          ...new Set([
            ...baseList.map((c) => c.id),
            ...specialList.map((c) => c.id),
            ...lowerMastery,
            weaponCamoId,
          ]),
        ];
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
      console.log("[camo] updating", { weaponCamoIds: toUpdateIds, userId, status: nextStatus });
      const payload = toUpdateIds.map((id) => ({
        user_id: userId,
        weapon_camo_id: id,
        status: nextStatus,
        unlocked_at: checked ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }));
      const { error: upsertError } = await supabase
        .from("user_weapon_camo_progress")
        .upsert(payload);
      if (upsertError) throw upsertError;

      // Server-side log (stored via /api/logs for Vercel/Supabase visibility)
      fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          level: "info",
          message: "Camo status updated",
          context: { weapon_camo_ids: toUpdateIds, status: nextStatus },
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
      setError(err?.message || "Failed to update camo status.");
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

  const toggleWeapon = (weaponId: string) => {
    setExpandedWeaponId((prev) => (prev === weaponId ? null : weaponId));
  };

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
      if (existing) {
        existing.items.push(weapon);
      } else {
        seasonGroups.push({ season: key, items: [weapon] });
      }
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
                          {masteryStatusByWeapon[weapon.id] && (() => {
                            const key = masteryStatusByWeapon[weapon.id] as "gold" | "bloodstone" | "doomsteel";
                            const badge =
                              MASTERY_BADGES[selectedGamemode]?.[key] || MASTERY_BADGES.default[key];
                            return (
                              <div className="flex items-center gap-2">
                                <span
                                  className="inline-flex h-2.5 w-2.5 rounded-full sm:hidden"
                                  style={{ backgroundColor: badge.color }}
                                  aria-label={badge.label}
                                />
                                <span
                                  className="hidden rounded px-2 py-0.5 font-semibold uppercase sm:inline-flex"
                                  style={{
                                    backgroundColor: badge.color,
                                    color: "#0b0b0b",
                                  }}
                                >
                                  {badge.label}
                                </span>
                              </div>
                            );
                          })()}
                          {(() => {
                            const weaponCamos = camosByWeapon[weapon.id] ?? [];
                            const total = weaponCamos.length;
                            const unlocked = weaponCamos.reduce(
                              (count, camo) => count + (progress[camo.id] ? 1 : 0),
                              0,
                            );
                            return (
                              <span className="rounded bg-cod-blue/40 px-2 py-0.5 font-semibold text-white/90">
                                {unlocked} / {total}
                              </span>
                            );
                          })()}
                        </div>
                      </button>
                      {expandedWeaponId === weapon.id && (
                        <div className="panel-open border-t border-soft bg-cod-charcoal-dark/70 px-3 py-2 sm:px-4 sm:py-3">
                          {camosByWeapon[weapon.id]?.length ? (
                            (() => {
                              const camoList = [...(camosByWeapon[weapon.id] ?? [])].sort((a, b) => {
                                const sa = a.camo_templates?.sort_order ?? 9999;
                                const sb = b.camo_templates?.sort_order ?? 9999;
                                if (sa !== sb) return sa - sb;
                                const na = a.camo_templates?.name ?? a.camo_templates?.slug ?? a.id;
                                const nb = b.camo_templates?.name ?? b.camo_templates?.slug ?? b.id;
                                return na.localeCompare(nb);
                              });
                              const grouped: Record<string, WeaponCamo[]> = {
                                mastery: [],
                                base: [],
                                special: [],
                                other: [],
                              };
                              camoList.forEach((camo) => {
                                const kind = (camo.camo_templates?.camo_kind || "other").toLowerCase();
                                if (kind === "mastery") grouped.mastery.push(camo);
                                else if (kind === "base") grouped.base.push(camo);
                                else if (kind === "special") grouped.special.push(camo);
                                else grouped.other.push(camo);
                              });
                              const sections = [
                                { key: "mastery", label: "Mastery Camos", items: grouped.mastery },
                                { key: "special", label: "Special Camos", items: grouped.special },
                                { key: "base", label: "Base Camos", items: grouped.base },
                                { key: "other", label: "Other Camos", items: grouped.other },
                              ].filter((s) => s.items.length > 0);

                              return (
                                <div className="space-y-2 sm:space-y-3">
                                  {sections.map((section) => (
                                    <div key={section.key} className="space-y-1.5 sm:space-y-2">
                                      <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60">
                                          {section.label}
                                        </p>
                                        <button
                                          type="button"
                                          onClick={() => handleCheckAll(section.items)}
                                          disabled={
                                            !userId ||
                                            section.items.every((c) => progress[c.id]) ||
                                            section.items.some((c) => saving[c.id])
                                          }
                                          className="rounded border border-soft px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white transition hover:border-cod-orange/60 disabled:opacity-50"
                                        >
                                          Check all
                                        </button>
                                      </div>
                                      <ul className="space-y-1 sm:space-y-2">
                                        {section.items.map((camo) => {
                                          const template = camo.camo_templates;
                                          const unlockCount = camo.unlock_count ?? template?.unlock_count;
                                          const unlockType = camo.unlock_type ?? template?.unlock_type;
                                          const checked = progress[camo.id] ?? false;
                                          const isSaving = saving[camo.id] ?? false;
                                          const challengeText =
                                            camo.challenge ??
                                            template?.challenge ??
                                            (unlockCount && unlockType
                                              ? `Requirement: ${unlockCount} × ${unlockType}`
                                              : null);
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
                                                {template?.name ?? template?.slug ?? "Camo"}
                                              </p>
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
                                  ))}
                                </div>
                              );
                            })()
                          ) : (
                            <p className="text-xs text-white/60">No camos linked yet.</p>
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
  const handleCheckAll = async (camoList: WeaponCamo[]) => {
    if (!userId) {
      setError("You must sign in to track camo progress.");
      return;
    }
    await Promise.all(
      camoList.map((camo) => {
        const alreadyChecked = progress[camo.id] ?? false;
        if (alreadyChecked) return Promise.resolve();
        return handleToggleCamo(camo.id, true);
      }),
    );
  };

  return (
    <main className="page-shell max-w-7xl flex w-full flex-col gap-3 py-6 sm:gap-4 sm:py-8">
      {showAuthPrompt && (
        <div className="glass-soft rounded-xl border border-cod-orange/60 bg-cod-orange/10 px-4 py-3 text-sm text-white shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-cod-orange">Sign in required</p>
              <p className="text-white/80">You must be signed in to use the camo tracker.</p>
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

      <div className="glass-panel glass-soft border border-soft p-4 text-white shadow-panel backdrop-blur sm:p-5">
        <div className="mb-2 flex items-center justify-between sm:mb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Camos</p>
            <h1 className="text-2xl font-bold leading-tight">Camo Tracker</h1>
            <p className="text-sm text-white/70">
              Pick a mode, select a class, then a weapon, and check off camos quickly.
            </p>
          </div>
        </div>

        <div className="glass-soft space-y-2 rounded-lg border border-soft p-3 text-sm text-white/80 sm:space-y-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
            {GAMEMODES.map((mode) => (
              <button
                key={mode.value}
                onClick={() => setSelectedGamemode(mode.value)}
                    className={`rounded-md border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                      selectedGamemode === mode.value
                        ? "border-cod-orange bg-cod-orange text-cod-charcoal shadow-sm"
                        : "border-soft bg-white/5 text-white hover:border-cod-orange/60"
                    }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {(["gold", "bloodstone", "doomsteel"] as const).map((tier) => {
              const badge =
                MASTERY_BADGES[selectedGamemode]?.[tier] || MASTERY_BADGES.default[tier];
              const count = masteryProgress[tier];
              const pct = Math.min(
                100,
                Math.round((count / (masteryProgress.totalWeapons || 1)) * 100),
              );
              return (
                <div key={tier} className="glass-soft rounded-md border border-soft p-3 shadow-inner">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-white/70">
                    <span>{badge.label}</span>
                    <span>
                      {count} / {masteryProgress.totalWeapons}
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-white/10">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: badge.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
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
