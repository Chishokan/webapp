"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Interview = {
  id: string;
  date: string;
  byTeacher: string;
  memo: string;
  createdAt: string;
};

export function InterviewSection({
  studentId,
  initial,
  teacherName,
}: {
  studentId: string;
  initial: Interview[];
  teacherName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [byTeacher, setByTeacher] = useState(teacherName);
  const [memo, setMemo] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!memo.trim()) {
      setError("面談内容を入力してください");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/students/${studentId}/interviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: date || "—", byTeacher, memo }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setMemo("");
      setDate("");
      router.refresh();
    } else {
      setError(data.error ?? "保存に失敗しました");
    }
    setLoading(false);
  }

  return (
    <div className="card">
      <h3 className="mb-3 font-semibold text-gray-800">面談記録</h3>

      <form onSubmit={add} className="mb-4 space-y-2 rounded-lg bg-gray-50 p-3">
        <div className="flex flex-wrap gap-2">
          <input
            className="input sm:w-40"
            placeholder="日付 (例 2026/06/08)"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <input
            className="input sm:w-40"
            placeholder="担当者"
            value={byTeacher}
            onChange={(e) => setByTeacher(e.target.value)}
          />
        </div>
        <textarea
          className="input min-h-[70px]"
          placeholder="面談内容"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end">
          <button className="btn-primary" disabled={loading}>
            {loading ? "記録中..." : "面談を記録"}
          </button>
        </div>
      </form>

      {initial.length === 0 ? (
        <p className="text-sm text-gray-400">まだ面談記録がありません。</p>
      ) : (
        <ul className="space-y-3">
          {initial.map((iv) => (
            <li key={iv.id} className="border-b border-gray-100 pb-3 last:border-0">
              <div className="mb-1 flex items-center justify-between text-xs text-gray-400">
                <span>{iv.date}</span>
                <span>{iv.byTeacher}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-gray-700">{iv.memo}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
