import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { logToSheet } from "@/lib/sheet-log";

const schema = z.object({
  identifier: z.string().min(1, "ログインIDまたはメールアドレスを入力してください"),
  password: z.string().min(1, "パスワードを入力してください"),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "入力が不正です" },
      { status: 400 }
    );
  }

  const { identifier, password } = parsed.data;

  // ログインID または メールアドレスで照合（生徒=ID / 先生=メール）
  const user = await prisma.user.findFirst({
    where: { OR: [{ loginId: identifier }, { email: identifier }] },
  });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json(
      { error: "ログイン情報が正しくありません" },
      { status: 401 }
    );
  }

  await createSession({
    userId: user.id,
    loginId: user.loginId,
    name: user.name,
    role: user.role,
  });
  await logToSheet("account", {
    action: "login",
    loginId: user.loginId,
    name: user.name,
    role: user.role,
    detail: "app",
  });
  return NextResponse.json({ ok: true, role: user.role });
}
