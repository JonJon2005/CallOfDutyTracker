"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/utils/supabase/client";

type UserInfo = {
  email: string | null;
  username: string | null;
};

export function Header() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const hydrateUser = async (userArg?: { id: string; email?: string | null }) => {
      const activeUser =
        userArg ??
        (await supabase.auth.getSession()).data.session?.user ??
        (await supabase.auth.getUser()).data.user ??
        null;

      if (activeUser) {
        try {
          const profileRes = await supabase
            .from("profiles")
            .select("username, display_name")
            .eq("id", activeUser.id)
            .single();
          const profile = profileRes.data;
          setUser({
            email: activeUser.email ?? null,
            username:
              (profile?.display_name as string | null) ??
              (profile?.username as string | null) ??
              activeUser.email ??
              null,
          });
        } catch {
          setUser({
            email: activeUser.email ?? null,
            username: activeUser.email ?? null,
          });
        }
      } else {
        setUser(null);
      }
    };

    hydrateUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
      } else {
        hydrateUser(session?.user ?? undefined);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMenuOpen(false);
    setUser(null);
    router.push("/home");
    router.refresh();
  };

  return (
    <div
      className="relative z-[60] w-full border-b border-cod-blue/50 bg-cod-charcoal-dark/95 backdrop-blur"
      role="navigation"
      aria-label="Main navigation"
    >
      <header className="relative mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6">
        <nav className="flex items-center gap-2">
          <Link
            href="/home"
            className="rounded-md border border-cod-orange/50 bg-cod-orange px-3 py-2 text-sm font-semibold text-cod-charcoal shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            Home
          </Link>
        </nav>
        {user ? (
          <div className="relative z-[70]">
            <button
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-md border border-cod-blue/50 bg-cod-charcoal-light/80 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-cod-blue text-xs font-bold uppercase text-white">
                {user.username?.slice(0, 2) ?? "ME"}
              </span>
              <span className="hidden sm:inline">{user.username ?? user.email}</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-md border border-cod-blue/60 bg-cod-charcoal-dark/95 p-2 shadow-lg z-[80]">
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
          <div className="flex items-center gap-2">
            <Link
              className="rounded-md border border-cod-blue/70 bg-cod-blue px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              href="/login"
            >
              Log In
            </Link>
            <Link
              className="rounded-md border border-cod-orange/60 bg-cod-orange px-3 py-2 text-sm font-semibold text-cod-charcoal shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              href="/signup"
            >
              Sign Up
            </Link>
          </div>
        )}
      </header>
    </div>
  );
}
