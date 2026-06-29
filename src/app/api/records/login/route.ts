import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession, isStaffRole } from "@/lib/auth";
import { logToSheet } from "@/lib/sheet-log";

const schema = z.object({
  id: z.string().min(1, "ログインID／メールを入力してください"),
  password: z.string().min(1, "パスワードを入力してください"),
});

// 学習記録・面談管理（/admin）専用ログイン。職員(TEACHER/SUPER_ADMIN)のみ。
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "入力が不正です" },
      { status: 400 }
    );
  }

  const { id, password } = parsed.data;
  const user = await prisma.user.findFirst({
    where: { OR: [{ loginId: id }, { email: id }] },
  });

  if (
    !user ||
    !isStaffRole(user.role) ||
    !(await bcrypt.compare(password, user.passwordHash))
  ) {
    return NextResponse.json(
      { error: "ログイン情報が正しくないか、職員権限がありません" },
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
    detail: "records",
  });
  return NextResponse.json({ ok: true });
}
