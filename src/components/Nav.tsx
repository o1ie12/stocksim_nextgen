"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const PLAYER_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/market", label: "Market" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/news", label: "News" },
];

const TEACHER_LINKS = [
  { href: "/teacher", label: "Teacher Panel" },
  { href: "/market", label: "Market" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/news", label: "News" },
];

export function Nav({ role, name }: { role: "player" | "teacher"; name: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const links = role === "teacher" ? TEACHER_LINKS : PLAYER_LINKS;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="nb-border border-x-0 border-t-0 bg-paper sticky top-0 z-10">
      <div className="max-w-6xl mx-auto flex items-center gap-1 px-4 py-3 flex-wrap">
        <span className="font-display uppercase text-lg tracking-tight mr-4">Founder&apos;s Track</span>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`nb-border nb-shadow-sm nb-press px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
              pathname === l.href ? "bg-ink text-paper" : "bg-paper text-ink"
            }`}
          >
            {l.label}
          </Link>
        ))}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs uppercase tracking-wide font-bold hidden sm:inline">{name}</span>
          <button
            onClick={logout}
            className="nb-border nb-shadow-sm nb-press px-3 py-1.5 text-xs font-bold uppercase tracking-wide bg-ink text-paper"
          >
            Log out
          </button>
        </div>
      </div>
    </nav>
  );
}
