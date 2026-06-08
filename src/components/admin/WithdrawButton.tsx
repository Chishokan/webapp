"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function WithdrawButton({
  studentId,
  withdrawn,
}: {
  studentId: string;
  withdrawn: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function run(action: "withdraw" | "revive") {
    if (
      action === "withdraw" &&
      !confirm("この生徒を退塾にしますか？（記録は残ります）")
    )
      return;
    setLoading(true);
    const res = await fetch(`/api/admin/students/${studentId}/${action}`, {
      method: "POST",
    });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "処理に失敗しました");
    }
    setLoading(false);
  }

  return withdrawn ? (
    <button
      onClick={() => run("revive")}
      className="btn-secondary text-sm"
      disabled={loading}
    >
      在籍に戻す
    </button>
  ) : (
    <button
      onClick={() => run("withdraw")}
      className="btn border border-red-200 bg-white text-sm text-red-600 hover:bg-red-50"
      disabled={loading}
    >
      退塾にする
    </button>
  );
}
