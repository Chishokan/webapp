"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type StaffUser = {
  id: string;
  name: string;
  email: string | null;
  role: string;
};

export function UsersManager({
  users,
  isSuperAdmin,
  selfId,
}: {
  users: StaffUser[];
  isSuperAdmin: boolean;
  selfId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function addUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDone(null);
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      (e.target as HTMLFormElement).reset();
      setDone("職員を追加しました");
      router.refresh();
    } else {
      setError(data.error ?? "追加に失敗しました");
    }
    setLoading(false);
  }

  async function remove(email: string, name: string) {
    if (!confirm(`${name}（${email}）を削除しますか？`)) return;
    const res = await fetch(`/api/admin/users/${encodeURIComponent(email)}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      router.refresh();
    } else {
      alert(data.error ?? "削除に失敗しました");
    }
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h3 className="mb-3 font-semibold text-gray-800">許可された職員</h3>
        <ul className="divide-y divide-gray-100">
          {users.map((u) => (
            <li key={u.id} className="flex items-center justify-between py-2">
              <div>
                <span className="text-sm font-medium text-gray-800">{u.name}</span>
                <span className="ml-2 text-xs text-gray-400">{u.email}</span>
                {u.role === "SUPER_ADMIN" && (
                  <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
                    最上級管理者
                  </span>
                )}
              </div>
              {isSuperAdmin &&
                u.role !== "SUPER_ADMIN" &&
                u.id !== selfId && (
                  <button
                    onClick={() => remove(u.email ?? "", u.name)}
                    className="text-sm text-red-500 hover:underline"
                  >
                    削除
                  </button>
                )}
            </li>
          ))}
        </ul>
      </div>

      {isSuperAdmin && (
        <form onSubmit={addUser} className="card space-y-3">
          <h3 className="font-semibold text-gray-800">職員を追加</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label">メールアドレス</label>
              <input name="email" type="email" className="input" required />
            </div>
            <div>
              <label className="label">表示名</label>
              <input name="name" className="input" required />
            </div>
            <div>
              <label className="label">初期パスワード</label>
              <input name="password" className="input" required placeholder="8文字以上" />
            </div>
          </div>
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
          {done && (
            <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
              {done}
            </p>
          )}
          <div className="flex justify-end">
            <button className="btn-primary" disabled={loading}>
              {loading ? "追加中..." : "追加する"}
            </button>
          </div>
        </form>
      )}

      {!isSuperAdmin && (
        <p className="text-sm text-gray-400">
          職員の追加・削除は最上級管理者のみ可能です。
        </p>
      )}
    </div>
  );
}
