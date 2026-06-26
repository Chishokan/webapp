"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ManageLoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const payload = {
      id: String(form.get("id") ?? ""),
      password: String(form.get("password") ?? ""),
    };

    const res = await fetch("/api/manage/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      router.push("/manage");
      router.refresh();
    } else {
      setError(data.error ?? "エラーが発生しました");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="card">
        <h1 className="mb-1 text-2xl font-bold text-brand-700">管理ログイン</h1>
        <p className="mb-6 text-sm text-gray-500">
          おはよう勉強会の運営管理用です。管理ID（または職員ID／メール）と
          パスワードを入力してください。
        </p>

        {!configured && (
          <p className="mb-4 rounded-md bg-yellow-50 px-3 py-2 text-sm text-yellow-700">
            admin（ohayou-admin）でのログインは未設定です。環境変数{" "}
            <code className="rounded bg-yellow-100 px-1">OHAYOU_ADMIN_PASSWORD</code>{" "}
            を設定してください。職員アカウントでのログインは利用できます。
          </p>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="id">
              管理ID / 職員ID・メール
            </label>
            <input
              id="id"
              name="id"
              className="input"
              required
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              パスワード
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="input"
              required
            />
          </div>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "処理中..." : "ログイン"}
          </button>
        </form>
      </div>
    </div>
  );
}
