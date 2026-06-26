"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CAMPUSES, GRADES } from "@/lib/options";

type Result = { ok: boolean; message: string } | null;

function useRegister() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result>(null);

  async function submit(payload: Record<string, unknown>, okMessage: string) {
    setLoading(true);
    setResult(null);
    const res = await fetch("/api/manage/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setResult({ ok: true, message: okMessage });
      router.refresh();
    } else {
      setResult({ ok: false, message: data.error ?? "登録に失敗しました" });
    }
    setLoading(false);
  }

  return { loading, result, submit };
}

function Feedback({ result }: { result: Result }) {
  if (!result) return null;
  return (
    <p
      className={`rounded-md px-3 py-2 text-sm ${
        result.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
      }`}
    >
      {result.ok ? "✓ " : ""}
      {result.message}
    </p>
  );
}

export function UserRegister() {
  const student = useRegister();
  const staff = useRegister();

  async function onStudent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const form = e.currentTarget;
    await student.submit(
      {
        type: "student",
        name: String(f.get("name") ?? ""),
        loginId: String(f.get("loginId") ?? ""),
        password: String(f.get("password") ?? ""),
        grade: String(f.get("grade") ?? ""),
        campus: String(f.get("campus") ?? ""),
        enroll: f.get("enroll") === "on",
      },
      "生徒を登録しました"
    );
    form.reset();
  }

  async function onStaff(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const form = e.currentTarget;
    await staff.submit(
      {
        type: "staff",
        name: String(f.get("name") ?? ""),
        loginId: String(f.get("loginId") ?? ""),
        email: String(f.get("email") ?? ""),
        password: String(f.get("password") ?? ""),
      },
      "管理者(職員)を登録しました"
    );
    form.reset();
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* 生徒登録 */}
      <form onSubmit={onStudent} className="card space-y-3">
        <h2 className="font-semibold text-gray-800">生徒登録</h2>
        <div>
          <label className="label">名前</label>
          <input name="name" className="input" required placeholder="智翔 太郎" />
        </div>
        <div>
          <label className="label">ログインID</label>
          <input
            name="loginId"
            className="input"
            required
            autoCapitalize="none"
            placeholder="半角英数字（3文字以上）"
          />
        </div>
        <div>
          <label className="label">パスワード</label>
          <input
            name="password"
            type="password"
            className="input"
            required
            placeholder="8文字以上"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">学年</label>
            <select name="grade" className="input" defaultValue="">
              <option value="">未設定</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">所属校舎</label>
            <select name="campus" className="input" defaultValue="">
              <option value="">未設定</option>
              {CAMPUSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" name="enroll" />
          おはよう勉強会に参加登録もする
        </label>
        <Feedback result={student.result} />
        <button className="btn-primary w-full" disabled={student.loading}>
          {student.loading ? "登録中..." : "生徒を登録"}
        </button>
      </form>

      {/* 管理者(職員)登録 */}
      <form onSubmit={onStaff} className="card space-y-3">
        <h2 className="font-semibold text-gray-800">管理者(職員)登録</h2>
        <p className="text-xs text-gray-400">
          staffロールで作成され、管理画面にログインできます（生徒・職員の登録は不可）。
        </p>
        <div>
          <label className="label">名前</label>
          <input name="name" className="input" required placeholder="智翔 花子" />
        </div>
        <div>
          <label className="label">ログインID</label>
          <input
            name="loginId"
            className="input"
            required
            autoCapitalize="none"
            placeholder="半角英数字（3文字以上）"
          />
        </div>
        <div>
          <label className="label">メールアドレス（任意）</label>
          <input
            name="email"
            type="email"
            className="input"
            autoCapitalize="none"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="label">パスワード</label>
          <input
            name="password"
            type="password"
            className="input"
            required
            placeholder="8文字以上"
          />
        </div>
        <Feedback result={staff.result} />
        <button className="btn-primary w-full" disabled={staff.loading}>
          {staff.loading ? "登録中..." : "管理者を登録"}
        </button>
      </form>
    </div>
  );
}
