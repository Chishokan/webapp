"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/", label: "ホーム" },
  { href: "/attendance", label: "出席" },
  { href: "/reflection", label: "リフレクション" },
  { href: "/history", label: "学習履歴" },
  { href: "/chat", label: "AIチャット" },
];

export function NavBar({ user }: { user: { name: string } | null }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 border-b border-orange-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-morning-600">
          ☀️ おはよう勉強会
        </Link>

        {user ? (
          <nav className="flex items-center gap-1 text-sm">
            {links.map((l) => {
              const active =
                l.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`hidden rounded-md px-3 py-1.5 sm:inline-block ${
                    active
                      ? "bg-morning-100 text-morning-700"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="ml-2 rounded-md px-3 py-1.5 text-gray-500 hover:bg-gray-100"
            >
              ログアウト
            </button>
          </nav>
        ) : (
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/login" className="text-gray-600 hover:text-morning-600">
              ログイン
            </Link>
            <Link href="/register" className="btn-primary text-sm">
              新規登録
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
