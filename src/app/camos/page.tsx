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
        setCamos(camoData ?? []);
        const map: Record<string, WeaponCamo> = {};
        (camoData ?? []).forEach((c) => {
          map[c.id] = c;
        });
        setCamoMap(map);
        setProgress(progressMap);
        if (!selectedClassId && classData?.length) {
          setSelectedClassId(classData[0].id);
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
    if (!selectedClassId && classes.length) {
      setSelectedClassId(classes[0].id);
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

  const sortCamoList = (list: WeaponCamo[]) =>
    [...list].sort((a, b) => {
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
        const baseList = weaponCamos.filter(
          (c) => (c.camo_templates?.camo_kind || "").toLowerCase() === "base",
        );
        const idx = baseList.findIndex((c) => c.id === weaponCamoId);
        if (idx >= 0) {
          toUpdateIds = baseList.slice(0, idx + 1).map((c) => c.id);
        }
      } else if (kind === "mastery") {
        const baseList = weaponCamos.filter(
          (c) => (c.camo_templates?.camo_kind || "").toLowerCase() === "base",
        );
        toUpdateIds = [...new Set([...baseList.map((c) => c.id), weaponCamoId])];
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
    <main className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 md:px-6">
      {showAuthPrompt && (
        <div className="rounded-xl border border-cod-orange/60 bg-cod-orange/10 px-4 py-3 text-sm text-white shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-cod-orange">Sign in required</p>
              <p className="text-white/80">You must be signed in to use the camo tracker.</p>
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
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Camos</p>
            <h1 className="text-2xl font-bold leading-tight">Camo Tracker</h1>
            <p className="text-sm text-white/70">
              Pick a mode, select a class, then a weapon, and check off camos quickly.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-cod-blue/40 bg-cod-charcoal-light/60 p-3 text-sm text-white/80 space-y-3">
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
          {loading ? (
            <p>Loading weapon classes…</p>
          ) : error ? (
            <p className="text-red-300">{error}</p>
          ) : classes.length === 0 ? (
            <p>No weapon classes found yet. Add classes in the database to get started.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
                {classes.map((cls) => (
                  <button
                    key={cls.id}
                    onClick={() => setSelectedClassId(cls.id)}
                    className={`rounded-md border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                      selectedClassId === cls.id
                        ? "border-cod-orange bg-cod-orange text-cod-charcoal shadow-sm"
                        : "border-cod-blue/40 bg-cod-charcoal-dark/70 text-white hover:border-cod-orange/60"
                    }`}
                  >
                    {cls.label}
                  </button>
                ))}
              </div>

              <div className="rounded-lg border border-cod-blue/35 bg-cod-charcoal-dark/70 p-4 shadow-inner">
                {selectedClassId ? (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-white/60">
                          {classes.find((c) => c.id === selectedClassId)?.slug ?? "class"}
                        </p>
                        <h3 className="text-lg font-semibold text-white">
                          {classes.find((c) => c.id === selectedClassId)?.label ?? "Weapons"}
                        </h3>
                      </div>
                      <span className="rounded-md bg-cod-blue/20 px-2 py-1 text-xs text-white/70">
                        {(weaponsByClass[selectedClassId] ?? []).length} weapon
                        {(weaponsByClass[selectedClassId] ?? []).length === 1 ? "" : "s"}
                      </span>
                    </div>

                    {(weaponsByClass[selectedClassId] ?? []).length === 0 ? (
                      <p className="mt-3 text-xs text-white/60">No weapons added yet.</p>
                    ) : (
                      <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {(weaponsByClass[selectedClassId] ?? []).map((weapon) => (
                          <li
                            key={weapon.id}
                            className="rounded-md border border-cod-blue/20 bg-cod-charcoal-light/60"
                          >
                            <button
                              type="button"
                              onClick={() => toggleWeapon(weapon.id)}
                              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-cod-charcoal-light/80"
                            >
                              <div>
                                <p className="font-medium text-white">{weapon.display_name}</p>
                                <p className="text-xs text-white/60">{weapon.slug}</p>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-white/70">
                                <span>{weapon.release_season ?? "—"}</span>
                                <span className="rounded bg-cod-blue/30 px-2 py-0.5">
                                  {camosByWeapon[weapon.id]?.length ?? 0} camos
                                </span>
                              </div>
                            </button>
                            {expandedWeaponId === weapon.id && (
                              <div className="border-t border-cod-blue/20 bg-cod-charcoal-dark/70 px-3 py-2">
                                {camosByWeapon[weapon.id]?.length ? (
                                  (() => {
                                    const camoList = [...(camosByWeapon[weapon.id] ?? [])].sort(
                                      (a, b) => {
                                        const sa = a.camo_templates?.sort_order ?? 9999;
                                        const sb = b.camo_templates?.sort_order ?? 9999;
                                        if (sa !== sb) return sa - sb;
                                        const na =
                                          a.camo_templates?.name ??
                                          a.camo_templates?.slug ??
                                          a.id;
                                        const nb =
                                          b.camo_templates?.name ??
                                          b.camo_templates?.slug ??
                                          b.id;
                                        return na.localeCompare(nb);
                                      },
                                    );
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
                                      { key: "base", label: "Base Camos", items: grouped.base },
                                      { key: "special", label: "Special Camos", items: grouped.special },
                                      { key: "other", label: "Other Camos", items: grouped.other },
                                    ].filter((s) => s.items.length > 0);

                                    return (
                                      <div className="space-y-3">
                                        {sections.map((section) => (
                                          <div key={section.key} className="space-y-2">
                                            <div className="flex items-center justify-between gap-2">
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
                                                className="rounded border border-cod-blue/40 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white transition hover:border-cod-orange/60 disabled:opacity-50"
                                              >
                                                Check all
                                              </button>
                                            </div>
                                            <ul className="space-y-1">
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
                                                    className="flex items-start gap-3 rounded border border-cod-blue/15 bg-cod-charcoal-light/50 px-3 py-2 text-sm"
                                                  >
                                                    <input
                                                      type="checkbox"
                                                      checked={checked}
                                                      disabled={isSaving || !userId}
                                                      onChange={(e) => handleToggleCamo(camo.id, e.target.checked)}
                                                      className="mt-1 h-4 w-4 rounded border-cod-blue/50 bg-cod-charcoal-light/70 text-cod-orange focus:ring-cod-orange"
                                                    />
                                                    <div className="flex-1">
                                                      <div className="flex items-center justify-between gap-2">
                                                        <p className="text-sm font-semibold text-white">
                                                          {template?.name ?? template?.slug ?? "Camo"}
                                                        </p>
                                                        <span className="rounded bg-cod-orange/20 px-2 py-0.5 text-[11px] uppercase tracking-wide text-cod-orange">
                                                          {template?.slug ?? "camo"}
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
                    )}
                  </>
                ) : (
                  <p className="text-xs text-white/60">Select a class to view weapons.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
