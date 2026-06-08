"use client";

import { useState } from "react";
import { Markdown } from "@/components/Markdown";

type Advice = { advice: string; createdAt: string; createdBy: string | null };

export function StudentAdvicePanel({
  studentId,
  initial,
  aiEnabled,
}: {
  studentId: string;
  initial: Advice | null;
  aiEnabled: boolean;
}) {
  const [advice, setAdvice] = useState<Advice | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/students/${studentId}/advice`, {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setAdvice(data.advice);
    } else {
      setError(data.error ?? "生成に失敗しました");
    }
    setLoading(false);
  }

  return (
    <div className="card border-purple-100 bg-gradient-to-br from-purple-50 to-white">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-800">✨ AI面談アドバイス</h3>
          <p className="text-xs text-gray-500">
            成績・面談記録から次回面談の参考案を生成します（氏名等は送信しません）。
          </p>
        </div>
        {aiEnabled ? (
          <button
            onClick={generate}
            className="btn bg-purple-600 text-white hover:bg-purple-700"
            disabled={loading}
          >
            {loading ? "生成中..." : advice ? "✨ 再生成" : "✨ 生成"}
          </button>
        ) : (
          <span className="text-xs text-gray-400">AI未設定</span>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {advice && (
        <div className="mt-4 rounded-xl bg-white p-4">
          <Markdown content={advice.advice} />
          <p className="mt-3 text-xs text-gray-400">
            {new Date(advice.createdAt).toLocaleString("ja-JP")} 生成 ／
            最終判断は先生が行ってください。
          </p>
        </div>
      )}
    </div>
  );
}
