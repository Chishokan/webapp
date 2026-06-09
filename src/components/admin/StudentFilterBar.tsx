"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Campus = { id: string; name: string };

const GRADES = [1, 2, 3];
const STORAGE_KEY = "adminStudentFilters";

export function StudentFilterBar({
  campuses,
  current,
}: {
  campuses: Campus[];
  current: { campus: string; grade: string; name: string; includeQuit: boolean };
}) {
  const router = useRouter();
  const [campus, setCampus] = useState(current.campus);
  const [grade, setGrade] = useState(current.grade);
  const [name, setName] = useState(current.name);
  const [includeQuit, setIncludeQuit] = useState(current.includeQuit);
  const [showNew, setShowNew] = useState(false);

  // URLに条件が無い状態で開いたら、前回の絞り込みを復元する
  useEffect(() => {
    const hasParams =
      current.campus || current.grade || current.name || current.includeQuit;
    if (hasParams) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const f = JSON.parse(saved) as typeof current;
      if (f.campus || f.grade || f.name || f.includeQuit) {
        setCampus(f.campus || "");
        setGrade(f.grade || "");
        setName(f.name || "");
        setIncludeQuit(!!f.includeQuit);
        applyFilters(f);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyFilters(next?: Partial<{ campus: string; grade: string; name: string; includeQuit: boolean }>) {
    const c = next?.campus ?? campus;
    const g = next?.grade ?? grade;
    const n = next?.name ?? name;
    const q = next?.includeQuit ?? includeQuit;
    // 次回のために絞り込み条件を保存
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ campus: c, grade: g, name: n, includeQuit: q })
      );
    } catch {
      /* ignore */
    }
    const params = new URLSearchParams();
    if (c) params.set("campus", c);
    if (g) params.set("grade", g);
    if (n) params.set("name", n);
    if (q) params.set("includeQuit", "true");
    router.push(`/admin/students?${params.toString()}`);
  }

  return (
    <div className="card space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label">校舎</label>
          <select
            className="input"
            value={campus}
            onChange={(e) => {
              setCampus(e.target.value);
              applyFilters({ campus: e.target.value });
            }}
          >
            <option value="">すべて</option>
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">学年</label>
          <select
            className="input"
            value={grade}
            onChange={(e) => {
              setGrade(e.target.value);
              applyFilters({ grade: e.target.value });
            }}
          >
            <option value="">すべて</option>
            {GRADES.map((g) => (
              <option key={g} value={String(g)}>
                中{g}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label className="label">名前検索</label>
          <input
            className="input"
            value={name}
            placeholder="名前・フリガナ"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
          />
        </div>

        <button onClick={() => applyFilters()} className="btn-secondary">
          検索
        </button>
        <button onClick={() => setShowNew(true)} className="btn-primary">
          ＋新規追加
        </button>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={includeQuit}
          onChange={(e) => {
            setIncludeQuit(e.target.checked);
            applyFilters({ includeQuit: e.target.checked });
          }}
        />
        退塾生を含める
      </label>

      {showNew && (
        <NewStudentModal campuses={campuses} onClose={() => setShowNew(false)} />
      )}
    </div>
  );
}

function NewStudentModal({
  campuses,
  onClose,
}: {
  campuses: Campus[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const res = await fetch("/api/admin/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      onClose();
      router.push(`/admin/students/${data.id}`);
      router.refresh();
    } else {
      setError(data.error ?? "登録に失敗しました");
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <h3 className="font-bold text-gray-800">生徒の新規追加</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col overflow-hidden">
          <div className="space-y-3 overflow-y-auto p-4">
            <div>
              <label className="label">
                名前 <span className="text-red-500">*</span>
              </label>
              <input name="name" className="input" required />
            </div>
            <div>
              <label className="label">フリガナ</label>
              <input name="kana" className="input" />
            </div>
            <div>
              <label className="label">
                校舎 <span className="text-red-500">*</span>
              </label>
              <select name="campusId" className="input" required defaultValue="">
                <option value="" disabled>
                  選択してください
                </option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">学年</label>
              <select name="grade" className="input" defaultValue="">
                <option value="">未設定</option>
                {GRADES.map((g) => (
                  <option key={g} value={String(g)}>
                    中{g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">学校名</label>
              <input name="school" className="input" />
            </div>
            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-100 p-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              キャンセル
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "登録中..." : "登録する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
