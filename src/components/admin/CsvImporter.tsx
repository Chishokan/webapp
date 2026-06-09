"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CsvImporter() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    total: number;
    created: number;
    updated: number;
  } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("CSVファイルを選択してください");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    const res = await fetch("/api/admin/import", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setResult({ total: data.total, created: data.created, updated: data.updated });
      router.refresh();
    } else {
      setError(data.error ?? "インポートに失敗しました");
    }
    setLoading(false);
  }

  return (
    <div className="card space-y-3">
      <div>
        <h3 className="font-semibold text-gray-800">生徒データCSVインポート</h3>
        <p className="mt-1 text-sm text-gray-500">
          GAS版の Students シートをCSVで取り込みます。
          <br />
          同じ生徒（元id）は上書き更新されるため、再アップロードしても重複しません。
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          className="text-sm"
          required
        />
        <button className="btn-primary" disabled={loading}>
          {loading ? "取り込み中..." : "インポート"}
        </button>
      </form>

      {loading && (
        <p className="text-sm text-gray-400">
          件数が多い場合、数十秒かかることがあります。ページを閉じずにお待ちください。
        </p>
      )}
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
      {result && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          ✓ 取り込み完了：合計 {result.total} 名（新規 {result.created} ／ 更新{" "}
          {result.updated}）
        </p>
      )}
    </div>
  );
}
