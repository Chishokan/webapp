"use client";

import { useRouter } from "next/navigation";

export function ManageLogout() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/manage/logout", { method: "POST" });
    router.push("/manage-login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-md px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
    >
      ログアウト
    </button>
  );
}
