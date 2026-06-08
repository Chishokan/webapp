"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReflectionForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [mood, setMood] = useState(3);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const payload = {
      learned: form.get("learned"),
      good: form.get("good"),
      next: form.get("next"),
      mood,
    };

    const res = await fetch("/api/reflection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setDone(true);
      (e.target as HTMLFormElement).reset();
      setMood(3);
      router.refresh();
      setTimeout(() => setDone(false), 4000);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "保存に失敗しました");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      <div>
        <label className="label" htmlFor="learned">
          今日学んだこと <span className="text-red-500">*</span>
        </label>
        <textarea
          id="learned"
          name="learned"
          className="input min-h-[100px]"
          required
          placeholder="例: Reactのカスタムフックの使い方を理解した"
        />
      </div>

      <div>
        <label className="label" htmlFor="good">
          よかった点・気づき
        </label>
        <textarea
          id="good"
          name="good"
          className="input min-h-[70px]"
          placeholder="例: 集中して取り組めた"
        />
      </div>

      <div>
        <label className="label" htmlFor="next">
          次に向けて
        </label>
        <textarea
          id="next"
          name="next"
          className="input min-h-[70px]"
          placeholder="例: 明日は実際に手を動かして実装してみる"
        />
      </div>

      <div>
        <label className="label">今日の集中度・充実度</label>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setMood(n)}
              className={`h-10 w-10 rounded-full text-lg transition-colors ${
                mood >= n ? "bg-morning-400 text-white" : "bg-gray-100 text-gray-400"
              }`}
              aria-label={`${n}点`}
            >
              ★
            </button>
          ))}
          <span className="ml-2 text-sm text-gray-500">{mood} / 5</span>
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
      {done && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          リフレクションを保存しました！お疲れさまでした 🎉
        </p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? "保存中..." : "保存する"}
      </button>
    </form>
  );
}
