import Link from "next/link";

export function Header() {
  return (
    <div
      className="w-full border-b border-cod-blue/50 bg-cod-charcoal-dark/95 backdrop-blur"
      role="navigation"
      aria-label="Main navigation"
    >
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6">
        <nav className="flex items-center gap-2">
          <Link
            href="/home"
            className="rounded-md border border-cod-orange/50 bg-cod-orange px-3 py-2 text-sm font-semibold text-cod-charcoal shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            Home
          </Link>
        </nav>
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
      </header>
    </div>
  );
}
