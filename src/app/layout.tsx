import type { Metadata } from "next";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
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
  const user = await getCurrentUser();

  return (
    <html lang="ja">
      <body className="min-h-screen">
        <NavBar user={user ? { name: user.name } : null} />
        <main className="mx-auto w-full max-w-4xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
