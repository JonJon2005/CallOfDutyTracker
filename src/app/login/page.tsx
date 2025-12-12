export default function LoginPage() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col items-center px-4 py-12 md:px-6">
      <div className="w-full max-w-xl rounded-2xl border border-cod-blue/50 bg-cod-charcoal-dark/90 p-8 text-white shadow-panel backdrop-blur">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-md border border-cod-orange/50 bg-cod-orange px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cod-charcoal">
            Log In
          </div>
          <h1 className="mt-3 text-3xl font-bold leading-tight">Welcome back.</h1>
          <p className="mt-1 text-sm text-white/75">
            Access your manual COD camo tracker account.
          </p>
        </div>

        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              className="mt-2 w-full rounded-lg border border-cod-blue/40 bg-cod-charcoal-light/70 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-cod-orange focus:outline-none focus:ring-2 focus:ring-cod-orange/60"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              className="mt-2 w-full rounded-lg border border-cod-blue/40 bg-cod-charcoal-light/70 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-cod-orange focus:outline-none focus:ring-2 focus:ring-cod-orange/60"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg border border-cod-orange/70 bg-cod-orange px-4 py-2.5 text-sm font-semibold text-cod-charcoal shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            Log In
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-white/70">
          Don&apos;t have an account?{" "}
          <a className="font-semibold text-cod-orange hover:underline" href="/signup">
            Sign up
          </a>
        </div>
      </div>
    </main>
  );
}
