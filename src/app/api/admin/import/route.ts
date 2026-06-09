import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireSuperAdmin,
  UnauthorizedError,
  ForbiddenError,
} from "@/lib/auth";
import { importStudentsFromCsv } from "@/lib/gas-import";

// インポートは件数が多く時間がかかるため上限を引き上げる
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    await requireSuperAdmin();

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "CSVファイルを選択してください" },
        { status: 400 }
      );
    }
    const text = await file.text();
    const result = await importStudentsFromCsv(prisma, text);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof UnauthorizedError)
      return NextResponse.json({ error: e.message }, { status: 401 });
    if (e instanceof ForbiddenError)
      return NextResponse.json({ error: e.message }, { status: 403 });
    console.error(e);
    return NextResponse.json(
      { error: "インポートに失敗しました" },
      { status: 500 }
    );
  }
}
