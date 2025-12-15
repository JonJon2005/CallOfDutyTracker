"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/utils/supabase/client";
import { PrestigeBadge } from "@/app/components/PrestigeBadge";

type UserInfo = {
  id: string;
  email: string | null;
  username: string | null;
  isMaster: boolean;
  prestige: number | null;
  level: number | null;
};

export function Header() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const supabaseProjectRef =
    typeof window !== "undefined"
      ? (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
          .replace(/^https?:\/\//, "")
          .split(".")[0]
      : null;

  const hydrateUser = useCallback(
    async (userArg?: { id: string; email?: string | null }) => {
      const activeUser =
        userArg ??
        (await supabase.auth.getSession()).data.session?.user ??
        (await supabase.auth.getUser()).data.user ??
        null;

      if (activeUser) {
        try {
          const profileRes = await supabase
            .from("profiles")
            .select("username, prestige, account_level")
            .eq("id", activeUser.id)
            .single();
          const profile = profileRes.data;
          setUser({
            id: activeUser.id,
            email: activeUser.email ?? null,
            username: (profile?.username as string | null) ?? activeUser.email ?? null,
            prestige: (profile?.prestige as number | null) ?? null,
            isMaster:
              (profile?.prestige as number | null) !== null &&
              (profile?.prestige as number) >= 11,
            level:
              typeof profile?.account_level === "number" && !Number.isNaN(profile.account_level)
                ? profile.account_level
                : null,
          });
        } catch {
          setUser({
            id: activeUser.id,
            email: activeUser.email ?? null,
            username: activeUser.email ?? null,
            prestige: null,
            isMaster: false,
            level: null,
          });
        }
      } else {
        setUser(null);
      }
    },
    [supabase],
  );

  const clearSupabaseCookies = () => {
    if (typeof document === "undefined" || !supabaseProjectRef) return;
    const prefix = `sb-${supabaseProjectRef}`;
    document.cookie.split(";").forEach((raw) => {
      const name = raw.split("=")[0]?.trim();
      if (name && name.startsWith(prefix)) {
        document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax;`;
      }
    });
  };

  const clearSupabaseStorage = () => {
    if (typeof window === "undefined" || !supabaseProjectRef) return;
    const prefix = `sb-${supabaseProjectRef}`;
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(prefix)) {
        localStorage.removeItem(key);
      }
    });
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith(prefix)) {
        sessionStorage.removeItem(key);
      }
    });
  };

  useEffect(() => {
    hydrateUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
      } else {
        hydrateUser(session?.user ?? undefined);
      }
    });

    // Listen for profile updates from other components to refresh header state
    const channel = supabase
      .channel("profiles-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        (payload) => {
          const newRow = (payload as { new?: { id?: string } }).new;
          const newId = newRow?.id;
          if (newId && user?.id && newId === user.id) {
            hydrateUser({ id: newId, email: user?.email ?? null });
          }
        },
      )
      .subscribe();

    return () => {
      authListener?.subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [supabase, hydrateUser, user?.id, user?.email]);

  useEffect(() => {
    const onProfileUpdated = () => {
      hydrateUser();
    };
    window.addEventListener("profile-updated", onProfileUpdated);
    return () => window.removeEventListener("profile-updated", onProfileUpdated);
  }, [hydrateUser]);

  const handleSignOut = async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) {
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    }
    clearSupabaseCookies();
    clearSupabaseStorage();
    setMenuOpen(false);
    setUser(null);
    router.push("/home");
    router.refresh();
  };

  return (
    <div
      className="relative z-[10] w-full border-b border-white/10 bg-gradient-to-r from-[#1c2029] via-[rgb(var(--cod-blue)/0.25)] to-[#161922]"
      role="navigation"
      aria-label="Main navigation"
    >
      <header className="relative mx-0 flex items-center justify-between gap-4 px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          {user ? (
            <div className="relative md:hidden">
              <button
                onClick={() => {
                  setMenuOpen((open) => !open);
                  setNavOpen(false);
                }}
                className="flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <PrestigeBadge
                  prestige={user.prestige}
                  isMaster={user.isMaster}
                  size="sm"
                  showLabel={false}
                  className="gap-0"
                />
              </button>
              {menuOpen && (
                <div className="absolute left-0 top-full mt-3 w-44 rounded-md border border-white/15 bg-cod-charcoal-dark/95 p-2 shadow-lg z-[80]">
                  <Link
                    href="/accounts"
                    className="block w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-white transition hover:bg-cod-charcoal-light/70"
                    onClick={() => setMenuOpen(false)}
                  >
                    Manage account
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-white transition hover:bg-cod-charcoal-light/70"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/home" className="btn btn-secondary hidden sm:inline-flex md:hidden">
              Home
            </Link>
          )}
        </div>

        <nav className="hidden flex-1 items-center gap-4 text-sm font-semibold text-white/85 md:flex">
          <Link href="/home" className="transition hover:text-white">
            Home
          </Link>
          <Link href="/camos" className="transition hover:text-white">
            Camos
          </Link>
          <Link href="/reticles" className="transition hover:text-white">
            Reticles
          </Link>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <div className="relative">
              <button
                onClick={() => {
                  setMenuOpen((open) => !open);
                  setNavOpen(false);
                }}
                className="flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <PrestigeBadge
                  prestige={user.prestige}
                  isMaster={user.isMaster}
                  size="sm"
                  showLabel={false}
                  className="gap-0"
                />
                <div className="min-w-0 flex-col leading-tight hidden sm:flex">
                  <span className={`truncate ${user.isMaster ? "text-cod-orange" : "text-white"}`}>
                    {user.username ?? user.email}
                  </span>
                  {user.level !== null && (
                    <span
                      className={`text-[11px] uppercase tracking-wide ${user.isMaster ? "text-cod-orange" : "text-white/70"}`}
                    >
                      Lvl {user.level}
                    </span>
                  )}
                </div>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-3 w-44 rounded-md border border-white/15 bg-cod-charcoal-dark/95 p-2 shadow-lg z-[80]">
                  <Link
                    href="/accounts"
                    className="block w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-white transition hover:bg-cod-charcoal-light/70"
                    onClick={() => setMenuOpen(false)}
                  >
                    Manage account
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-white transition hover:bg-cod-charcoal-light/70"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link className="btn btn-secondary" href="/login">
                Log In
              </Link>
              <Link className="btn btn-primary" href="/signup">
                Sign Up
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 md:hidden">
          {!user && (
            <Link href="/home" className="btn btn-secondary px-3 py-2 text-xs font-semibold">
              Home
            </Link>
          )}
          <button
            onClick={() => {
              setNavOpen((open) => !open);
              setMenuOpen(false);
            }}
            aria-label="Toggle navigation"
            className="flex h-10 w-10 flex-col items-center justify-center rounded-md border border-white/20 bg-white/5 shadow-sm"
          >
            <span className="block h-0.5 w-6 bg-white mb-1"></span>
            <span className="block h-0.5 w-6 bg-white mb-1"></span>
            <span className="block h-0.5 w-6 bg-white"></span>
          </button>
          {navOpen && (
            <div className="absolute right-4 top-full mt-2 w-48 rounded-lg border border-white/15 bg-cod-charcoal-dark/95 p-3 shadow-lg z-[80]">
              <div className="flex flex-col gap-2 text-sm font-semibold text-white">
                <Link href="/home" onClick={() => setNavOpen(false)} className="rounded px-2 py-1 hover:bg-white/5">
                  Home
                </Link>
                <Link href="/camos" onClick={() => setNavOpen(false)} className="rounded px-2 py-1 hover:bg-white/5">
                  Camos
                </Link>
                <Link href="/reticles" onClick={() => setNavOpen(false)} className="rounded px-2 py-1 hover:bg-white/5">
                  Reticles
                </Link>
                <div className="h-px bg-white/10 my-1" />
                {user ? (
                  <>
                    <Link
                      href="/accounts"
                      onClick={() => setNavOpen(false)}
                      className="rounded px-2 py-1 hover:bg-white/5"
                    >
                      Manage account
                    </Link>
                    <button
                      onClick={() => {
                        setNavOpen(false);
                        handleSignOut();
                      }}
                      className="rounded px-2 py-1 text-left hover:bg-white/5"
                    >
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setNavOpen(false)} className="btn btn-secondary w-full justify-center">
                      Log In
                    </Link>
                    <Link href="/signup" onClick={() => setNavOpen(false)} className="btn btn-primary w-full justify-center">
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </header>
    </div>
  );
}
