import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManage, ManageUnauthorizedError } from "@/lib/manage-auth";
import { importParticipantsFromCsv } from "@/lib/enrollment";
import { logToSheet } from "@/lib/sheet-log";

// 申込フォーム回収後のCSVを取り込み、ユーザー作成＋参加登録を行う
export async function POST(req: Request) {
  try {
    await requireManage();
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "CSVファイルを選択してください" },
        { status: 400 }
      );
    }
    const text = await file.text();
    const result = await importParticipantsFromCsv(prisma, text);
    await logToSheet("account", {
      action: "csv_import",
      loginId: "",
      name: "",
      role: "",
      detail: `total=${result.total} created=${result.created} enrolled=${result.enrolled} skipped=${result.skipped}`,
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof ManageUnauthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json(
      { error: "インポートに失敗しました" },
      { status: 500 }
    );
  }
}
