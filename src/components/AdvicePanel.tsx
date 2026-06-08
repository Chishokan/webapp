"use client";

import { useState } from "react";
import { Markdown } from "./Markdown";

export function AdvicePanel() {
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function getAdvice() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/advice", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setAdvice(data.advice);
    } else {
      setError(data.error ?? "アドバイスの生成に失敗しました");
    }
    setLoading(false);
  }

  return (
    <div className="card bg-gradient-to-br from-morning-50 to-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-800">🤖 AI学習アドバイス</h2>
          <p className="text-sm text-gray-500">
            これまでの記録をAIが分析してアドバイスします。
          </p>
        </div>
        <button onClick={getAdvice} className="btn-primary" disabled={loading}>
          {loading ? "分析中..." : advice ? "もう一度分析" : "アドバイスをもらう"}
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {advice && (
        <div className="mt-4 rounded-xl bg-white p-4">
          <Markdown content={advice} />
        </div>
      )}
    </div>
  );
}
