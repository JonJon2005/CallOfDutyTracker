import Link from "next/link";

export function Header() {
  return (
    <div className="nav-bar" role="navigation" aria-label="Main navigation">
      <header className="site-header">
        <nav className="nav nav-left">
          <Link href="/home" className="nav-link active">
            Home
          </Link>
        </nav>
        <div className="auth-actions">
          <a className="btn btn-secondary" href="#">
            Log In
          </a>
          <a className="btn btn-primary" href="#">
            Sign Up
          </a>
        </div>
      </header>
    </div>
  );
}
