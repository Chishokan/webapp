"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CAMPUSES, GRADES } from "@/lib/options";

type Variant = "student" | "staff";

export function AuthForm({
  mode,
  variant = "student",
}: {
  mode: "login" | "register";
  variant?: Variant;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isStaff = mode === "login" && variant === "staff";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      // 役割で遷移先を振り分け（職員は管理画面へ）
      const dest =
        data.role === "TEACHER" || data.role === "SUPER_ADMIN" ? "/admin" : "/";
      router.push(dest);
      router.refresh();
    } else {
      setError(data.error ?? "エラーが発生しました");
      setLoading(false);
    }
  }

  const heading =
    mode === "register" ? "新規登録" : isStaff ? "職員ログイン" : "ログイン";
  const subtitle =
    mode === "register"
      ? "はじめにプロフィールを登録してください。"
      : isStaff
        ? "職員用です。メールアドレスとパスワードを入力してください。"
        : "ログインIDとパスワードを入力してください。";

  return (
    <div className="mx-auto max-w-md">
      <div className="card">
        <h1 className="mb-1 text-2xl font-bold text-brand-700">{heading}</h1>
        <p className="mb-6 text-sm text-gray-500">{subtitle}</p>

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="label" htmlFor="name">
                名前
              </label>
              <input
                id="name"
                name="name"
                className="input"
                required
                placeholder="智翔 太郎"
              />
            </div>
          )}

          <div>
            <label className="label" htmlFor="loginId">
              {mode === "register"
                ? "ログインID"
                : isStaff
                  ? "メールアドレス"
                  : "ログインID"}
            </label>
            <input
              id="loginId"
              name={mode === "login" ? "identifier" : "loginId"}
              type={isStaff ? "email" : "text"}
              className="input"
              required
              autoCapitalize="none"
              autoCorrect="off"
              placeholder={
                mode === "register"
                  ? "半角英数字（3文字以上）"
                  : isStaff
                    ? "you@example.com"
                    : ""
              }
            />
          </div>

          {mode === "register" && (
            <>
              <div>
                <label className="label" htmlFor="grade">
                  学年
                </label>
                <select id="grade" name="grade" className="input" required defaultValue="">
                  <option value="" disabled>
                    選択してください
                  </option>
                  {GRADES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label" htmlFor="campus">
                  所属校舎
                </label>
                <select
                  id="campus"
                  name="campus"
                  className="input"
                  required
                  defaultValue=""
                >
                  <option value="" disabled>
                    選択してください
                  </option>
                  {CAMPUSES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

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
              placeholder={mode === "register" ? "8文字以上" : ""}
            />
          </div>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "処理中..." : mode === "login" ? "ログイン" : "登録する"}
          </button>
        </form>

        <div className="mt-4 space-y-1 text-center text-sm text-gray-500">
          {mode === "register" && (
            <p>
              既にアカウントをお持ちの方は{" "}
              <Link href="/login" className="text-brand-600 underline">
                ログイン
              </Link>
            </p>
          )}
          {mode === "login" && !isStaff && (
            <>
              <p>
                アカウントをお持ちでない方は{" "}
                <Link href="/register" className="text-brand-600 underline">
                  新規登録
                </Link>
              </p>
            </>
          )}
          {isStaff && (
            <p>
              生徒の方は{" "}
              <Link href="/login" className="text-brand-600 underline">
                生徒ログイン
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
