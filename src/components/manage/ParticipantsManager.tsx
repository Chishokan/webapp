"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Person = { id: string; name: string; grade: string; campus: string };
type Enrolled = Person & { source: "ADMIN_SELECT" | "FORM_IMPORT" };

export function ParticipantsManager({
  enrolled,
  candidates,
}: {
  enrolled: Enrolled[];
  candidates: Person[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    total: number;
    created: number;
    enrolled: number;
    skipped: number;
  } | null>(null);

  async function enroll(userId: string) {
    setBusy(userId);
    await fetch("/api/manage/participants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setBusy(null);
    router.refresh();
  }

  async function unenroll(userId: string) {
    setBusy(userId);
    await fetch("/api/manage/participants", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setBusy(null);
    router.refresh();
  }

  async function onImport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setImportError("CSVファイルを選択してください");
      return;
    }
    setImporting(true);
    setImportError(null);
    setImportResult(null);
    const res = await fetch("/api/manage/participants/import", {
      method: "POST",
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setImportResult(data);
      router.refresh();
    } else {
      setImportError(data.error ?? "インポートに失敗しました");
    }
    setImporting(false);
  }

  const filtered = candidates.filter(
    (c) =>
      !search ||
      c.name.includes(search) ||
      c.grade.includes(search) ||
      c.campus.includes(search)
  );

  return (
    <div className="space-y-6">
      {/* 参加者一覧 */}
      <div className="card">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-semibold text-gray-800">
            参加者一覧（{enrolled.length}名）
          </h2>
          {enrolled.length > 0 && (
            <a
              href="/api/manage/participants/export"
              className="rounded-md border border-brand-200 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50"
            >
              CSV出力
            </a>
          )}
        </div>
        {enrolled.length === 0 ? (
          <p className="text-sm text-gray-400">
            まだ参加者がいません。下から塾生を追加するか、CSVを取り込んでください。
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {enrolled.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between py-2 text-sm"
              >
                <div>
                  <span className="font-medium text-gray-800">{p.name}</span>
                  <span className="ml-2 text-xs text-gray-400">
                    {p.grade}・{p.campus}
                  </span>
                  <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                    {p.source === "FORM_IMPORT" ? "フォーム" : "塾生"}
                  </span>
                </div>
                <button
                  onClick={() => unenroll(p.id)}
                  disabled={busy === p.id}
                  className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  取消
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 塾生から追加 */}
      <div className="card">
        <h2 className="mb-3 font-semibold text-gray-800">塾生から追加</h2>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input mb-3"
          placeholder="名前・学年・校舎で検索"
        />
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400">
            該当する未登録の塾生がいません。
          </p>
        ) : (
          <ul className="max-h-80 divide-y divide-gray-100 overflow-y-auto">
            {filtered.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between py-2 text-sm"
              >
                <div>
                  <span className="font-medium text-gray-800">{c.name}</span>
                  <span className="ml-2 text-xs text-gray-400">
                    {c.grade}・{c.campus}
                  </span>
                </div>
                <button
                  onClick={() => enroll(c.id)}
                  disabled={busy === c.id}
                  className="rounded-md bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  追加
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* CSV取込（申込フォーム） */}
      <div className="card space-y-3">
        <div>
          <h2 className="font-semibold text-gray-800">
            申込フォームCSVの取込（塾生以外）
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            ヘッダー例: <code className="rounded bg-gray-100 px-1">name</code>,{" "}
            <code className="rounded bg-gray-100 px-1">loginId</code>,{" "}
            <code className="rounded bg-gray-100 px-1">password</code>,{" "}
            <code className="rounded bg-gray-100 px-1">grade</code>,{" "}
            <code className="rounded bg-gray-100 px-1">campus</code>
            （名前・ID は必須）。同じIDは上書きされ、自動的に参加登録されます。
          </p>
        </div>
        <form onSubmit={onImport} className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            name="file"
            accept=".csv,text/csv"
            className="text-sm"
            required
          />
          <button className="btn-primary" disabled={importing}>
            {importing ? "取り込み中..." : "インポート"}
          </button>
        </form>
        {importError && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {importError}
          </p>
        )}
        {importResult && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            ✓ 取込完了：{importResult.total}行（新規ユーザー{" "}
            {importResult.created} ／ 参加登録 {importResult.enrolled} ／ スキップ{" "}
            {importResult.skipped}）
          </p>
        )}
      </div>
    </div>
  );
}
