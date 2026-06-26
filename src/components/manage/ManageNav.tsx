"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const baseTabs = [
  { href: "/manage", label: "ダッシュボード" },
  { href: "/manage/participants", label: "参加者" },
  { href: "/manage/reflections", label: "リフレクション一覧" },
];

export function ManageNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const tabs = isAdmin
    ? [...baseTabs, { href: "/manage/register", label: "ユーザー登録" }]
    : baseTabs;
  return (
    <nav className="flex flex-wrap gap-1 border-b border-gray-200 pb-2">
      {tabs.map((t) => {
        const active =
          t.href === "/manage"
            ? pathname === "/manage"
            : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              active
                ? "bg-brand-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
