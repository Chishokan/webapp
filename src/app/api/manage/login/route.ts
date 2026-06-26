import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession, isStaffRole } from "@/lib/auth";
import {
  verifyManageCredentials,
  createManageSession,
  isManageConfigured,
} from "@/lib/manage-auth";
import { logToSheet } from "@/lib/sheet-log";

const schema = z.object({
  id: z.string().min(1, "IDを入力してください"),
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

  const { id, password } = parsed.data;

  // 1) admin（ohayou-admin = 環境変数の管理ID）
  if (isManageConfigured() && verifyManageCredentials(id, password)) {
    await createManageSession();
    await logToSheet("account", {
      action: "login",
      loginId: id,
      name: "管理者",
      role: "ADMIN",
      detail: "manage",
    });
    return NextResponse.json({ ok: true, role: "ADMIN" });
  }

  // 2) staff（TEACHER / SUPER_ADMIN ロールのユーザー）
  const user = await prisma.user.findFirst({
    where: { OR: [{ loginId: id }, { email: id }] },
  });
  if (
    user &&
    isStaffRole(user.role) &&
    (await bcrypt.compare(password, user.passwordHash))
  ) {
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
      detail: "manage",
    });
    return NextResponse.json({ ok: true, role: user.role });
  }

  return NextResponse.json(
    { error: "ログイン情報が正しくありません" },
    { status: 401 }
  );
}
