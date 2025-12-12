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
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 md:gap-10 md:px-6">
      <section className="overflow-hidden rounded-2xl border border-cod-blue/50 bg-cod-navy/90 shadow-panel backdrop-blur">
        <div className="grid gap-8 px-6 py-7 md:grid-cols-[1.2fr_0.8fr] md:px-8 md:py-9">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-md border border-cod-orange/50 bg-cod-orange px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cod-charcoal">
              COD CAMO TRACKER
            </div>
            <h1 className="text-3xl font-bold leading-tight text-white md:text-4xl">
              Track your camo grind with manual, trusted inputs.
            </h1>
            <p className="max-w-3xl text-base text-white/85 md:text-lg">
              Log account level, prestige, and camo unlocks in one place. Milestones are generated
              from your updates—never from Activision or COD servers.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <a
                className="inline-flex items-center justify-center rounded-md border border-cod-orange/70 bg-cod-orange px-4 py-2.5 text-sm font-semibold text-cod-charcoal shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                href="#"
              >
                Get started
              </a>
              <a
                className="inline-flex items-center justify-center rounded-md border border-cod-blue/70 bg-cod-blue px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                href="#"
              >
                View milestones
              </a>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-md border border-cod-blue/40 bg-cod-blue/25 px-3 py-1 text-xs font-semibold text-white">
                Manual entry
              </span>
              <span className="inline-flex items-center rounded-md border border-cod-blue/40 bg-cod-blue/25 px-3 py-1 text-xs font-semibold text-white">
                No official API
              </span>
              <span className="inline-flex items-center rounded-md border border-cod-blue/40 bg-cod-blue/25 px-3 py-1 text-xs font-semibold text-white">
                Patch-agnostic
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-cod-blue/40 bg-cod-charcoal-light/40 p-4 shadow-inner">
            <div className="flex justify-between text-xs font-semibold uppercase text-white/70">
              <span>Progress snapshot</span>
              <span>Manual</span>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-cod-blue/40 bg-cod-blue/10 px-3 py-2">
                <div>
                  <p className="text-xs text-white/70">Account level</p>
                  <p className="text-lg font-semibold text-white">120</p>
                </div>
                <span className="rounded-md bg-cod-blue px-2 py-1 text-xs font-semibold text-white">
                  Prestige 5
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-cod-orange/40 bg-cod-orange/10 px-3 py-2">
                <div>
                  <p className="text-xs text-white/70">AR gold completion</p>
                  <p className="text-lg font-semibold text-white">12 / 18</p>
                </div>
                <span className="rounded-md bg-cod-orange px-2 py-1 text-xs font-semibold text-cod-charcoal">
                  67%
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-cod-bronze/40 bg-cod-bronze/15 px-3 py-2">
                <div>
                  <p className="text-xs text-white/70">Recent milestone</p>
                  <p className="text-sm font-semibold text-white">Gold unlocked for M4</p>
                </div>
                <span className="text-xs text-white/70">2d ago</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {highlights.map((item) => (
          <article
            key={item.title}
            className="rounded-xl border border-cod-blue/35 bg-cod-charcoal-dark/85 p-5 text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            <span className="inline-flex items-center rounded-md border border-cod-blue/50 bg-cod-blue/25 px-3 py-1 text-xs font-semibold text-white">
              {item.label}
            </span>
            <h3 className="mt-3 text-lg font-semibold leading-snug">{item.title}</h3>
            <p className="mt-2 text-sm text-white/80">{item.copy}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
