"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type SiteHeaderProps = {
  userName: string;
  darkMode: boolean;
};

const links = [
  { href: "/", label: "Arena" },
  { href: "/records", label: "Records" },
  { href: "/settings", label: "Settings" },
];

export function SiteHeader({ userName, darkMode }: SiteHeaderProps) {
  const pathname = usePathname();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }

  async function toggleTheme() {
    const nextDarkMode = document.documentElement.dataset.theme !== "dark";
    document.documentElement.dataset.theme = nextDarkMode ? "dark" : "light";
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ darkMode: nextDarkMode }),
    });
  }

  return (
    <>
      <nav className="nav-bar" aria-label="Main navigation">
        <Link className="nav-logo" href="/">XO.am</Link>
        <div className="nav-links">
          {links.map((link) => (
            <Link
              className={`nav-link${pathname === link.href ? " active" : ""}`}
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
          <span className="nav-link nav-player-name">{userName}</span>
          <button
            className="nav-link nav-logout"
            onClick={logout}
            type="button"
          >
            Logout
          </button>
        </div>
      </nav>
      <button
        className="theme-toggle-button"
        data-theme={darkMode ? "dark" : "light"}
        type="button"
        aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        onClick={toggleTheme}
      >
        <span className="theme-toggle-thumb" aria-hidden="true" />
        <span className="theme-toggle-icon" aria-hidden="true" />
      </button>
    </>
  );
}