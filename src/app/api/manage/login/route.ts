import { NextResponse } from "next/server";
import { z } from "zod";
import {
  verifyManageCredentials,
  createManageSession,
  isManageConfigured,
} from "@/lib/manage-auth";

const schema = z.object({
  id: z.string().min(1, "管理IDを入力してください"),
  password: z.string().min(1, "パスワードを入力してください"),
});

export async function POST(req: Request) {
  if (!isManageConfigured()) {
    return NextResponse.json(
      {
        error:
          "管理ログインが未設定です。環境変数 OHAYOU_ADMIN_PASSWORD を設定してください。",
      },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "入力が不正です" },
      { status: 400 }
    );
  }

  const { id, password } = parsed.data;
  if (!verifyManageCredentials(id, password)) {
    return NextResponse.json(
      { error: "ログイン情報が正しくありません" },
      { status: 401 }
    );
  }

  await createManageSession();
  return NextResponse.json({ ok: true });
}
