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
    <main>
      <section className="hero">
        <span className="pill pill-orange">COD CAMO TRACKER</span>
        <h1>Track your camo grind with manual, trusted inputs.</h1>
        <p className="lede">
          Log account level, prestige, and camo unlocks in one place. Milestones
          are generated from your updates—never from Activision or COD servers.
        </p>

        <div className="cta-group">
          <a className="btn btn-primary" href="#">
            Get started
          </a>
          <a className="btn btn-secondary" href="#">
            View milestones
          </a>
        </div>

        <div className="meta-row">
          <span className="pill pill-blue">Manual entry</span>
          <span className="pill pill-outline">No official API</span>
          <span className="pill pill-outline">Patch-agnostic</span>
        </div>
      </section>

      <section className="cards">
        {highlights.map((item) => (
          <article key={item.title} className="card">
            <span className="pill pill-blue">{item.label}</span>
            <h3>{item.title}</h3>
            <p className="muted">{item.copy}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
