"use client";

export default function CamosPage() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10 md:px-6">
      <div className="rounded-2xl border border-cod-blue/50 bg-cod-charcoal-dark/90 p-6 text-white shadow-panel backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Camos</p>
            <h1 className="text-2xl font-bold leading-tight">Camo Tracker</h1>
            <p className="text-sm text-white/70">
              This page will show per-weapon camo progress and milestones. Coming soon.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-cod-blue/40 bg-cod-charcoal-light/60 p-4 text-sm text-white/80">
          Placeholder: camo tracker UI will be built here.
        </div>
      </div>
    </main>
  );
}
