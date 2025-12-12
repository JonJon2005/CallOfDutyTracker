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
    unlock_count: number | null;
    unlock_type: string | null;
    gamemode: string | null;
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
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const uid = sessionData.session?.user?.id ?? null;
        setUserId(uid);

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
            camo_templates (
              id,
              name,
              slug,
              camo_kind,
              unlock_count,
              unlock_type,
              gamemode
            )
          `,
          )
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
        setProgress(progressMap);
      } catch (err: any) {
        setError(err?.message || "Failed to load weapons.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [supabase]);

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

  const handleToggleCamo = async (weaponCamoId: string, checked: boolean) => {
    if (!userId) {
      setError("Log in to track camo progress.");
      return;
    }
    const nextStatus: WeaponCamoProgress["status"] = checked;
    const prevStatus = progress[weaponCamoId];

    setSaving((prev) => ({ ...prev, [weaponCamoId]: true }));
    setProgress((prev) => ({ ...prev, [weaponCamoId]: nextStatus }));
    try {
      const { error: upsertError } = await supabase.from("user_weapon_camo_progress").upsert({
        user_id: userId,
        weapon_camo_id: weaponCamoId,
        status: nextStatus,
        unlocked_at: checked ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      });
      if (upsertError) throw upsertError;
    } catch (err: any) {
      setProgress((prev) => ({ ...prev, [weaponCamoId]: prevStatus ?? false }));
      setError(err?.message || "Failed to update camo status.");
    } finally {
      setSaving((prev) => ({ ...prev, [weaponCamoId]: false }));
    }
  };

  const toggleWeapon = (weaponId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(weaponId)) {
        next.delete(weaponId);
      } else {
        next.add(weaponId);
      }
      return next;
    });
  };

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 md:px-6">
      <div className="rounded-2xl border border-cod-blue/50 bg-cod-charcoal-dark/90 p-6 text-white shadow-panel backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Camos</p>
            <h1 className="text-2xl font-bold leading-tight">Camo Tracker</h1>
            <p className="text-sm text-white/70">
              Browse your weapon classes and see which weapons are available before we add per-camo
              tracking UI.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-cod-blue/40 bg-cod-charcoal-light/60 p-4 text-sm text-white/80">
          {loading ? (
            <p>Loading weapon classes…</p>
          ) : error ? (
            <p className="text-red-300">{error}</p>
          ) : classes.length === 0 ? (
            <p>No weapon classes found yet. Add classes in the database to get started.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {classes.map((cls) => {
                const classWeapons = weaponsByClass[cls.id] ?? [];
                return (
                  <div
                    key={cls.id}
                    className="rounded-lg border border-cod-blue/35 bg-cod-charcoal-dark/70 p-4 shadow-inner"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-white/60">
                          {cls.slug || "class"}
                        </p>
                        <h3 className="text-lg font-semibold text-white">{cls.label}</h3>
                      </div>
                      <span className="rounded-md bg-cod-blue/20 px-2 py-1 text-xs text-white/70">
                        {classWeapons.length} weapon{classWeapons.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    {classWeapons.length === 0 ? (
                      <p className="mt-3 text-xs text-white/60">No weapons added yet.</p>
                    ) : (
                      <ul className="mt-3 space-y-2">
                        {classWeapons.map((weapon) => (
                          <li key={weapon.id} className="rounded-md border border-cod-blue/25 bg-cod-charcoal-light/60">
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
                            {expanded.has(weapon.id) && (
                              <div className="border-t border-cod-blue/25 bg-cod-charcoal-dark/60 px-3 py-2">
                                {camosByWeapon[weapon.id]?.length ? (
                                  <ul className="space-y-2">
                                    {camosByWeapon[weapon.id].map((camo) => {
                                      const template = camo.camo_templates;
                                      const unlockCount = camo.unlock_count ?? template?.unlock_count;
                                      const unlockType = camo.unlock_type ?? template?.unlock_type;
                                      const checked = progress[camo.id] ?? false;
                                      const isSaving = saving[camo.id] ?? false;
                                      return (
                                        <li
                                          key={camo.id}
                                          className="rounded border border-cod-blue/20 bg-cod-charcoal-light/50 px-3 py-2 text-sm"
                                        >
                                          <div className="flex items-center justify-between">
                                            <div>
                                              <p className="font-semibold text-white">
                                                {template?.name ?? template?.slug ?? "Camo"}
                                              </p>
                                              <p className="text-xs text-white/60">
                                                {template?.camo_kind ?? "—"} • {template?.gamemode ?? "mp"}
                                              </p>
                                            </div>
                                            <span className="rounded bg-cod-orange/20 px-2 py-0.5 text-[11px] uppercase tracking-wide text-cod-orange">
                                              {template?.slug ?? "camo"}
                                            </span>
                                            <label className="ml-3 inline-flex items-center gap-2 text-xs text-white/80">
                                              <input
                                                type="checkbox"
                                                checked={checked}
                                                disabled={isSaving || !userId}
                                                onChange={(e) =>
                                                  handleToggleCamo(camo.id, e.target.checked)
                                                }
                                                className="h-4 w-4 rounded border-cod-blue/50 bg-cod-charcoal-light/70 text-cod-orange focus:ring-cod-orange"
                                              />
                                              {checked ? "Unlocked" : "Locked"}
                                            </label>
                                          </div>
                                          <p className="mt-2 text-xs text-white/70">
                                            {camo.challenge ||
                                              (unlockCount && unlockType
                                                ? `Requirement: ${unlockCount} × ${unlockType}`
                                                : "Requirement not set.")}
                                          </p>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                ) : (
                                  <p className="text-xs text-white/60">No camos linked yet.</p>
                                )}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
