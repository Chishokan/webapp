import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManage, ManageUnauthorizedError } from "@/lib/manage-auth";

function csvCell(v: string | null | undefined): string {
  const s = v ?? "";
  // ダブルクォート・カンマ・改行を含む場合はクォートで囲む
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function ymd(d: Date): string {
  const x = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}-${String(
    x.getUTCDate()
  ).padStart(2, "0")}`;
}

// 参加登録済み生徒の一覧をCSVで出力
export async function GET() {
  try {
    await requireManage();

    const enrollments = await prisma.enrollment.findMany({
      include: {
        user: { select: { name: true, loginId: true, grade: true, campus: true } },
      },
      orderBy: [{ createdAt: "asc" }],
    });

    const headers = ["氏名", "ログインID", "学年", "校舎", "種別", "参加登録日"];
    const rows = enrollments.map((e) =>
      [
        e.user.name,
        e.user.loginId,
        e.user.grade,
        e.user.campus,
        e.source === "FORM_IMPORT" ? "フォーム" : "塾生",
        ymd(e.createdAt),
      ]
        .map(csvCell)
        .join(",")
    );

    // UTF-8 BOM を付与（Excel での文字化け防止）
    const csv = "﻿" + [headers.join(","), ...rows].join("\r\n") + "\r\n";
    const filename = `participants_${ymd(new Date())}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    if (e instanceof ManageUnauthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "出力に失敗しました" }, { status: 500 });
  }
}
