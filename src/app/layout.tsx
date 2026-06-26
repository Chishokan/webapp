import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { getCurrentUser, isStaffRole } from "@/lib/auth";
import { NavBar } from "@/components/NavBar";

export const metadata: Metadata = {
  title: "おはよう勉強会",
  description: "朝の学習習慣をサポートするWebアプリ",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 管理エリア(/manage・/manage-login)では生徒用ナビを出さない
  const pathname = (await headers()).get("x-pathname") ?? "";
  const isManageArea = pathname.startsWith("/manage");

  const user = isManageArea ? null : await getCurrentUser();

  return (
    <html lang="ja">
      <body className="min-h-screen">
        {!isManageArea && (
          <NavBar
            user={
              user ? { name: user.name, isStaff: isStaffRole(user.role) } : null
            }
          />
        )}
        <main className="mx-auto w-full max-w-4xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
