"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function AttendanceButton({
  zoomUrl,
  alreadyJoined,
  joinedAt,
}: {
  zoomUrl: string;
  alreadyJoined: boolean;
  joinedAt: string | null;
}) {
  const router = useRouter();
  const [joined, setJoined] = useState(alreadyJoined);
  const [time, setTime] = useState<string | null>(joinedAt);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function recordAttendance() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/attendance", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setJoined(true);
      setTime(data.attendance.joinedAt);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "出席の記録に失敗しました");
    }
    setLoading(false);
  }

  function handleJoinZoom() {
    if (zoomUrl) {
      window.open(zoomUrl, "_blank", "noopener,noreferrer");
    }
    // Zoomを開くと同時に出席を記録
    if (!joined) recordAttendance();
  }

  return (
    <div className="card space-y-4">
      {joined ? (
        <div className="rounded-lg bg-green-50 p-4 text-center">
          <p className="text-lg font-semibold text-green-700">
            ✅ 出席を記録しました
          </p>
          {time && (
            <p className="mt-1 text-sm text-green-600">
              {new Date(time).toLocaleString("ja-JP")}
            </p>
          )}
        </div>
      ) : (
        <p className="text-gray-600">
          下のボタンからZoomに参加すると、自動で出席が記録されます。
        </p>
      )}

      {zoomUrl ? (
        <button onClick={handleJoinZoom} className="btn-primary w-full text-lg">
          {joined ? "Zoomに再参加する" : "Zoomに参加して出席する"}
        </button>
      ) : (
        <p className="rounded-md bg-yellow-50 px-3 py-2 text-sm text-yellow-700">
          Zoom URL が未設定です。.env の NEXT_PUBLIC_ZOOM_URL を設定してください。
        </p>
      )}

      {!joined && (
        <button
          onClick={recordAttendance}
          className="btn-secondary w-full"
          disabled={loading}
        >
          {loading ? "記録中..." : "出席のみ記録する"}
        </button>
      )}

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {joined && (
        <Link href="/reflection" className="btn-secondary w-full">
          リフレクションを書く →
        </Link>
      )}
    </div>
  );
}
